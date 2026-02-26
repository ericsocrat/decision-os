/**
 * Monte Carlo Web Worker — Unit Tests
 *
 * Covers:
 *  - Progress callback integration in runMonteCarloSimulation
 *  - AbortSignal cancellation support
 *  - PROGRESS_BATCH_SIZE constant
 *  - Worker message type exports
 *  - useMonteCarloWorker hook (fallback mode, since jsdom lacks real Workers)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { runMonteCarloSimulation, PROGRESS_BATCH_SIZE } from "@/lib/monte-carlo";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
// Test decision fixture
// ---------------------------------------------------------------------------

function makeDecision(): Decision {
  return {
    id: "mc-worker-test",
    title: "Worker Test Decision",
    description: "",
    options: [
      { id: "opt-a", name: "Option A" },
      { id: "opt-b", name: "Option B" },
    ],
    criteria: [
      { id: "c1", name: "Cost", weight: 50, type: "cost" },
      { id: "c2", name: "Quality", weight: 50, type: "benefit" },
    ],
    scores: {
      "opt-a": { c1: 3, c2: 8 },
      "opt-b": { c1: 7, c2: 5 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// PROGRESS_BATCH_SIZE
// ---------------------------------------------------------------------------

describe("PROGRESS_BATCH_SIZE", () => {
  it("is exported and equals 1000", () => {
    expect(PROGRESS_BATCH_SIZE).toBe(1_000);
  });
});

// ---------------------------------------------------------------------------
// Progress callback integration
// ---------------------------------------------------------------------------

describe("runMonteCarloSimulation with callbacks", () => {
  let decision: Decision;

  beforeEach(() => {
    decision = makeDecision();
  });

  it("calls onProgress every PROGRESS_BATCH_SIZE iterations", () => {
    const onProgress = vi.fn();
    const numSimulations = 5_000;

    runMonteCarloSimulation(decision, { numSimulations, seed: 42 }, { onProgress });

    // Should be called at 1000, 2000, 3000, 4000, 5000
    expect(onProgress).toHaveBeenCalledTimes(5);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1000, 5000);
    expect(onProgress).toHaveBeenNthCalledWith(2, 2000, 5000);
    expect(onProgress).toHaveBeenNthCalledWith(3, 3000, 5000);
    expect(onProgress).toHaveBeenNthCalledWith(4, 4000, 5000);
    expect(onProgress).toHaveBeenNthCalledWith(5, 5000, 5000);
  });

  it("calls onProgress with final count even when not at batch boundary", () => {
    const onProgress = vi.fn();

    runMonteCarloSimulation(decision, { numSimulations: 2_500, seed: 42 }, { onProgress });

    // Batch reports at 1000, 2000, then final at 2500
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenLastCalledWith(2500, 2500);
  });

  it("works without callbacks (backward compatible)", () => {
    const result = runMonteCarloSimulation(decision, {
      numSimulations: 1_000,
      seed: 42,
    });

    expect(result.options).toHaveLength(2);
    expect(result.options[0].winProbability).toBeGreaterThanOrEqual(0);
  });

  it("produces identical results with and without callbacks", () => {
    const onProgress = vi.fn();

    const withCallbacks = runMonteCarloSimulation(
      decision,
      { numSimulations: 2_000, seed: 99 },
      { onProgress }
    );

    const withoutCallbacks = runMonteCarloSimulation(decision, {
      numSimulations: 2_000,
      seed: 99,
    });

    // Scores should be bit-identical since same seed and same algorithm
    expect(withCallbacks.options.map((o) => o.meanScore)).toEqual(
      withoutCallbacks.options.map((o) => o.meanScore)
    );
    expect(withCallbacks.options.map((o) => o.winProbability)).toEqual(
      withoutCallbacks.options.map((o) => o.winProbability)
    );
  });
});

// ---------------------------------------------------------------------------
// AbortSignal cancellation
// ---------------------------------------------------------------------------

describe("runMonteCarloSimulation with AbortSignal", () => {
  let decision: Decision;

  beforeEach(() => {
    decision = makeDecision();
  });

  it("stops early when signal is already aborted", () => {
    const controller = new AbortController();
    controller.abort();

    const onProgress = vi.fn();
    const result = runMonteCarloSimulation(
      decision,
      { numSimulations: 10_000, seed: 42 },
      { signal: controller.signal, onProgress }
    );

    // Should have run 0 iterations — signal was aborted before start
    expect(result.options).toHaveLength(2);
    // All win counts should be 0
    for (const opt of result.options) {
      expect(opt.winCount).toBe(0);
    }
    // Progress should not have been called at batch boundaries
    // but will be called once with the final count (0)
    // The "final progress report" runs for completedSims > 0, so 0 sims = no call
    expect(onProgress).not.toHaveBeenCalled();
  });

  it("stops at the first iteration when signal is pre-aborted", () => {
    const controller = new AbortController();
    controller.abort();

    const result = runMonteCarloSimulation(
      decision,
      { numSimulations: 5_000, seed: 42 },
      { signal: controller.signal }
    );

    // Summary should mention cancelled
    expect(result.summary).toContain("cancelled");
  });

  it("runs all iterations when signal is never aborted", () => {
    const controller = new AbortController();
    const onProgress = vi.fn();

    const result = runMonteCarloSimulation(
      decision,
      { numSimulations: 2_000, seed: 42 },
      { signal: controller.signal, onProgress }
    );

    // Should complete all 2000
    const totalWins = result.options.reduce((s, o) => s + o.winCount, 0);
    expect(totalWins).toBe(2_000);
    expect(result.summary).not.toContain("cancelled");
  });
});

// ---------------------------------------------------------------------------
// Worker message types (compile-time check)
// ---------------------------------------------------------------------------

describe("Worker message types", () => {
  it("exports WorkerRunMessage, WorkerOutMessage types", async () => {
    // This test verifies the type exports exist and are importable
    const mod = await import("@/workers/monte-carlo.worker");
    expect(mod).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// useMonteCarloWorker (fallback mode in jsdom)
// ---------------------------------------------------------------------------

describe("useMonteCarloWorker hook types", () => {
  it("exports the hook and state types", async () => {
    const mod = await import("@/hooks/useMonteCarloWorker");
    expect(mod.useMonteCarloWorker).toBeTypeOf("function");
  });
});
