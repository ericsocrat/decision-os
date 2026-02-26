/**
 * Tests for the rate limiter with exponential backoff.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  withRetry,
  enqueueWrite,
  computeBackoff,
  getRetryState,
  subscribeRetryState,
  resetRetryState,
  _resetForTests,
} from "@/lib/rate-limiter";

beforeEach(() => {
  _resetForTests();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("computeBackoff", () => {
  it("returns 1s for first failure", () => {
    expect(computeBackoff(0)).toBe(1_000);
  });

  it("returns 2s for second failure", () => {
    expect(computeBackoff(1)).toBe(2_000);
  });

  it("returns 4s for third failure", () => {
    expect(computeBackoff(2)).toBe(4_000);
  });

  it("caps at 30s", () => {
    expect(computeBackoff(10)).toBe(30_000);
  });
});

describe("withRetry", () => {
  it("resolves immediately on success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("retries on failure and resolves on eventual success", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail1"))
      .mockRejectedValueOnce(new Error("fail2"))
      .mockResolvedValue("ok");

    const promise = withRetry(fn);
    // Advance past both backoff delays
    await vi.advanceTimersByTimeAsync(1_000); // 1st backoff
    await vi.advanceTimersByTimeAsync(2_000); // 2nd backoff
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("rejects after MAX_RETRIES (3) failures", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    const promise = withRetry(fn).catch((e: Error) => e);
    // Advance through all backoff delays
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(4_000);

    const result = await promise;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe("always fails");
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it("sets state to failed after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));

    const promise = withRetry(fn).catch(() => {});
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(4_000);
    await promise;

    expect(getRetryState().status).toBe("failed");
    expect(getRetryState().failures).toBe(4);
  });

  it("resets state to idle on success after prior failures", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValue("ok");

    const promise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(1_000);
    await promise;

    expect(getRetryState().status).toBe("idle");
    expect(getRetryState().failures).toBe(0);
  });
});

describe("enqueueWrite", () => {
  it("serializes concurrent writes", async () => {
    const order: number[] = [];
    const fn1 = vi.fn(async () => {
      order.push(1);
      return "a";
    });
    const fn2 = vi.fn(async () => {
      order.push(2);
      return "b";
    });

    const p1 = enqueueWrite(fn1);
    const p2 = enqueueWrite(fn2);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe("a");
    expect(r2).toBe("b");
    expect(order).toEqual([1, 2]); // sequential, not concurrent
  });

  it("continues queue after a failed write", async () => {
    const fn1 = vi.fn().mockRejectedValue(new Error("fail"));
    const fn2 = vi.fn().mockResolvedValue("ok");

    const p1 = enqueueWrite(fn1).catch(() => "caught");
    // Advance timers past all retry attempts for fn1
    await vi.advanceTimersByTimeAsync(10_000);
    await p1;

    _resetForTests(); // reset backoff state for fn2
    const r2 = await enqueueWrite(fn2);
    expect(r2).toBe("ok");
  });
});

describe("subscribeRetryState", () => {
  it("notifies listeners on state change", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRetryState(listener);

    const fn = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValue("ok");

    const promise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(1_000);
    await promise;

    // Should have been called with backoff state, retrying state, then idle
    expect(listener).toHaveBeenCalled();
    const statuses = listener.mock.calls.map((c: Array<{ status: string }>) => c[0].status);
    expect(statuses).toContain("backoff");
    expect(statuses).toContain("idle");

    unsubscribe();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRetryState(listener);
    unsubscribe();

    resetRetryState();
    expect(listener).not.toHaveBeenCalled();
  });
});
