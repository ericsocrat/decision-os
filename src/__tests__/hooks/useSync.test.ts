/**
 * useSync hook tests.
 *
 * Verifies sync orchestration: auto-sync, trigger sync, guard
 * against concurrent syncs, and behavior when unauthenticated.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/89
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSync } from "@/hooks/useSync";

// ─── Mocks ─────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  isCloudEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/sync", () => ({
  fullSync: vi.fn(async () => ({ status: "done" as const, uploaded: 0, downloaded: 0, merged: 0 })),
}));

import { isCloudEnabled } from "@/lib/supabase";
import { fullSync } from "@/lib/sync";

// ─── Tests ─────────────────────────────────────────────────────────

describe("useSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(isCloudEnabled).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns idle status when not authenticated", () => {
    const { result } = renderHook(() => useSync(false));

    expect(result.current.status).toBe("idle");
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.lastResult).toBeNull();
  });

  it("returns idle status when cloud is disabled", () => {
    const { result } = renderHook(() => useSync(true));

    expect(result.current.status).toBe("idle");
    expect(result.current.isSyncing).toBe(false);
  });

  it("triggerSync is a no-op when not authenticated", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    const { result } = renderHook(() => useSync(false));

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(fullSync).not.toHaveBeenCalled();
  });

  it("triggerSync is a no-op when cloud is disabled", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(false);
    const { result } = renderHook(() => useSync(true));

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(fullSync).not.toHaveBeenCalled();
  });

  it("triggerSync calls fullSync when authenticated and cloud enabled", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    const { result } = renderHook(() => useSync(true));

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(fullSync).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("done");
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.lastResult).toEqual({
      status: "done",
      uploaded: 0,
      downloaded: 0,
      merged: 0,
    });
  });

  it("auto-syncs on mount after 500ms delay when authenticated", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    renderHook(() => useSync(true));

    expect(fullSync).not.toHaveBeenCalled();

    // Advance past the 500ms auto-sync delay
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // fullSync is called via the auto-sync timer
    expect(fullSync).toHaveBeenCalled();
  });

  it("does not auto-sync when not authenticated", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    renderHook(() => useSync(false));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(fullSync).not.toHaveBeenCalled();
  });

  it("stores lastResult from the most recent sync", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    vi.mocked(fullSync).mockResolvedValue({
      status: "error",
      uploaded: 0,
      downloaded: 0,
      merged: 0,
    });

    const { result } = renderHook(() => useSync(true));

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(result.current.lastResult).toEqual({
      status: "error",
      uploaded: 0,
      downloaded: 0,
      merged: 0,
    });
    expect(result.current.status).toBe("error");
  });
});
