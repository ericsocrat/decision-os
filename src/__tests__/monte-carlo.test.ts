/**
 * Monte Carlo Sensitivity Engine — Unit Tests
 *
 * Covers:
 *  - PRNG (createPRNG) reproducibility and range
 *  - Perturbation samplers (uniform / normal / triangular)
 *  - Weight perturbation
 *  - Histogram builder
 *  - Percentile helper
 *  - Full simulation (runMonteCarloSimulation)
 *  - Edge cases: empty decision, single option, identical weights
 */

import { describe, it, expect, vi } from "vitest";
import {
  createPRNG,
  samplePerturbation,
  perturbWeights,
  buildHistogram,
  percentile,
  runMonteCarloSimulation,
  DEFAULT_CONFIG,
} from "@/lib/monte-carlo";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Decision for testing */
function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "test-1",
    title: "Test Decision",
    description: "",
    options: [
      { id: "opt-a", name: "Option A" },
      { id: "opt-b", name: "Option B" },
      { id: "opt-c", name: "Option C" },
    ],
    criteria: [
      { id: "c1", name: "Cost", weight: 40, type: "cost" },
      { id: "c2", name: "Quality", weight: 60, type: "benefit" },
    ],
    scores: {
      "opt-a": { c1: 3, c2: 8 },
      "opt-b": { c1: 7, c2: 5 },
      "opt-c": { c1: 5, c2: 6 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createPRNG
// ---------------------------------------------------------------------------

describe("createPRNG", () => {
  it("produces values in [0, 1)", () => {
    const rand = createPRNG(42);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is deterministic with the same seed", () => {
    const a = createPRNG(12345);
    const b = createPRNG(12345);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it("produces different sequences for different seeds", () => {
    const a = createPRNG(1);
    const b = createPRNG(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("handles seed=0 (auto-seed from Date.now)", () => {
    vi.spyOn(Date, "now").mockReturnValue(99999);
    const rand = createPRNG(0);
    const val = rand();
    expect(typeof val).toBe("number");
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// samplePerturbation
// ---------------------------------------------------------------------------

describe("samplePerturbation", () => {
  const deterministicRand = () => {
    let i = 0;
    return () => {
      i = (i + 1) % 100;
      return i / 100;
    };
  };

  it("uniform: output falls within [1-range, 1+range]", () => {
    const rand = createPRNG(7);
    const range = 0.3;
    for (let i = 0; i < 500; i++) {
      const m = samplePerturbation(rand, range, "uniform");
      expect(m).toBeGreaterThanOrEqual(0); // clamped to 0+
      expect(m).toBeLessThanOrEqual(1 + range + 0.001);
    }
  });

  it("normal: most values cluster around 1.0", () => {
    const rand = createPRNG(42);
    const vals = Array.from({ length: 5000 }, () => samplePerturbation(rand, 0.2, "normal"));
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    expect(mean).toBeCloseTo(1.0, 1);
  });

  it("triangular: values range within [1-range, 1+range]", () => {
    const rand = createPRNG(11);
    const range = 0.25;
    for (let i = 0; i < 500; i++) {
      const m = samplePerturbation(rand, range, "triangular");
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1 + range + 0.001);
    }
  });

  it("returns 1.0 for unknown distribution", () => {
    const rand = deterministicRand();
    // Cast to bypass TS for edge-case test
    const m = samplePerturbation(rand, 0.2, "unknown" as "uniform");
    expect(m).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// perturbWeights
// ---------------------------------------------------------------------------

describe("perturbWeights", () => {
  it("returns same length as input", () => {
    const rand = createPRNG(5);
    const result = perturbWeights([10, 20, 30], rand, 0.2, "uniform");
    expect(result).toHaveLength(3);
  });

  it("all weights are non-negative", () => {
    const rand = createPRNG(99);
    for (let i = 0; i < 100; i++) {
      const result = perturbWeights([5, 10, 15, 20], rand, 0.5, "normal");
      result.forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
    }
  });

  it("perturbed weights differ from base (with high range)", () => {
    const rand = createPRNG(42);
    const base = [50, 50];
    const perturbed = perturbWeights(base, rand, 0.4, "uniform");
    // Extremely unlikely both land on exactly 1.0 multiplier
    const allSame = perturbed.every((w, i) => w === base[i]);
    expect(allSame).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildHistogram
// ---------------------------------------------------------------------------

describe("buildHistogram", () => {
  it("returns a single bucket for empty input", () => {
    const h = buildHistogram([]);
    expect(h).toHaveLength(1);
    expect(h[0].count).toBe(0);
  });

  it("returns 20 buckets for non-empty input", () => {
    const scores = Array.from({ length: 100 }, (_, i) => i / 10);
    const h = buildHistogram(scores);
    expect(h).toHaveLength(20);
  });

  it("total count in buckets equals input length", () => {
    const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const h = buildHistogram(scores);
    const totalCount = h.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(scores.length);
  });

  it("handles all identical values", () => {
    const h = buildHistogram([5, 5, 5, 5]);
    const totalCount = h.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// percentile
// ---------------------------------------------------------------------------

describe("percentile", () => {
  it("returns 0 for empty array", () => {
    expect(percentile([], 50)).toBe(0);
  });

  it("returns only value for single-element array", () => {
    expect(percentile([7], 50)).toBe(7);
    expect(percentile([7], 0)).toBe(7);
    expect(percentile([7], 100)).toBe(7);
  });

  it("returns correct p50 (median) for sorted array", () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(percentile(sorted, 50)).toBe(3);
  });

  it("interpolates between values", () => {
    const sorted = [10, 20];
    expect(percentile(sorted, 50)).toBe(15);
  });

  it("p0 = first element, p100 = last element", () => {
    const sorted = [2, 4, 6, 8, 10];
    expect(percentile(sorted, 0)).toBe(2);
    expect(percentile(sorted, 100)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// runMonteCarloSimulation
// ---------------------------------------------------------------------------

describe("runMonteCarloSimulation", () => {
  it("returns empty results for decision with no options", () => {
    const d = makeDecision({ options: [] });
    const result = runMonteCarloSimulation(d, { numSimulations: 100, seed: 1 });
    expect(result.options).toHaveLength(0);
    expect(result.summary).toContain("No criteria or options");
  });

  it("returns empty results for decision with no criteria", () => {
    const d = makeDecision({ criteria: [] });
    const result = runMonteCarloSimulation(d, { numSimulations: 100, seed: 1 });
    expect(result.options).toHaveLength(0);
  });

  it("produces results for every option", () => {
    const d = makeDecision();
    const result = runMonteCarloSimulation(d, { numSimulations: 500, seed: 42 });
    expect(result.options).toHaveLength(3);
    result.options.forEach((o) => {
      expect(o.optionId).toBeTruthy();
      expect(o.optionName).toBeTruthy();
    });
  });

  it("win probabilities sum to 1.0 (within rounding)", () => {
    const d = makeDecision();
    const result = runMonteCarloSimulation(d, { numSimulations: 1000, seed: 7 });
    const totalWin = result.options.reduce((s, o) => s + o.winProbability, 0);
    expect(totalWin).toBeCloseTo(1.0, 1);
  });

  it("win counts sum to numSimulations", () => {
    const n = 500;
    const d = makeDecision();
    const result = runMonteCarloSimulation(d, { numSimulations: n, seed: 3 });
    const totalWins = result.options.reduce((s, o) => s + o.winCount, 0);
    expect(totalWins).toBe(n);
  });

  it("is deterministic with the same seed", () => {
    const d = makeDecision();
    const cfg = { numSimulations: 500, seed: 12345 };
    const a = runMonteCarloSimulation(d, cfg);
    const b = runMonteCarloSimulation(d, cfg);
    expect(a.options.map((o) => o.winProbability)).toEqual(b.options.map((o) => o.winProbability));
    expect(a.options.map((o) => o.meanScore)).toEqual(b.options.map((o) => o.meanScore));
  });

  it("produces different results with different seeds", () => {
    const d = makeDecision();
    const a = runMonteCarloSimulation(d, { numSimulations: 500, seed: 1 });
    const b = runMonteCarloSimulation(d, { numSimulations: 500, seed: 2 });
    // Mean scores will differ due to different random perturbations
    const meansA = a.options.map((o) => o.meanScore);
    const meansB = b.options.map((o) => o.meanScore);
    expect(meansA).not.toEqual(meansB);
  });

  it("records config in results", () => {
    const d = makeDecision();
    const cfg = {
      numSimulations: 200,
      perturbationRange: 0.3,
      distribution: "normal" as const,
      seed: 9,
    };
    const result = runMonteCarloSimulation(d, cfg);
    expect(result.config.numSimulations).toBe(200);
    expect(result.config.perturbationRange).toBe(0.3);
    expect(result.config.distribution).toBe("normal");
    expect(result.config.seed).toBe(9);
  });

  it("elapsed time is a positive number", () => {
    const d = makeDecision();
    const result = runMonteCarloSimulation(d, { numSimulations: 100, seed: 1 });
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("produces a summary string", () => {
    const d = makeDecision();
    const result = runMonteCarloSimulation(d, { numSimulations: 100, seed: 1 });
    expect(result.summary).toBeTruthy();
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it("options are sorted by win probability descending", () => {
    const d = makeDecision();
    const result = runMonteCarloSimulation(d, { numSimulations: 2000, seed: 42 });
    for (let i = 1; i < result.options.length; i++) {
      expect(result.options[i - 1].winProbability).toBeGreaterThanOrEqual(
        result.options[i].winProbability
      );
    }
  });

  it("each option has valid histogram with 20 buckets", () => {
    const d = makeDecision();
    const result = runMonteCarloSimulation(d, { numSimulations: 500, seed: 42 });
    result.options.forEach((o) => {
      expect(o.histogram).toHaveLength(20);
      const total = o.histogram.reduce((s, b) => s + b.count, 0);
      expect(total).toBe(500);
    });
  });

  it("percentiles are monotonically non-decreasing", () => {
    const d = makeDecision();
    const result = runMonteCarloSimulation(d, { numSimulations: 1000, seed: 42 });
    result.options.forEach((o) => {
      expect(o.p5).toBeLessThanOrEqual(o.p25);
      expect(o.p25).toBeLessThanOrEqual(o.p50);
      expect(o.p50).toBeLessThanOrEqual(o.p75);
      expect(o.p75).toBeLessThanOrEqual(o.p95);
    });
  });

  it("handles single option (always wins)", () => {
    const d = makeDecision({
      options: [{ id: "solo", name: "Solo" }],
      scores: { solo: { c1: 5, c2: 7 } },
    });
    const result = runMonteCarloSimulation(d, { numSimulations: 100, seed: 1 });
    expect(result.options).toHaveLength(1);
    expect(result.options[0].winProbability).toBe(1);
    expect(result.options[0].winCount).toBe(100);
  });

  it("uses default config when none provided", () => {
    const d = makeDecision();
    const result = runMonteCarloSimulation(d);
    expect(result.config.numSimulations).toBe(DEFAULT_CONFIG.numSimulations);
    expect(result.config.distribution).toBe(DEFAULT_CONFIG.distribution);
  });

  it("works with triangular distribution", () => {
    const d = makeDecision();
    const result = runMonteCarloSimulation(d, {
      numSimulations: 500,
      seed: 55,
      distribution: "triangular",
    });
    expect(result.options).toHaveLength(3);
    const totalWins = result.options.reduce((s, o) => s + o.winCount, 0);
    expect(totalWins).toBe(500);
  });

  it("works with normal distribution", () => {
    const d = makeDecision();
    const result = runMonteCarloSimulation(d, {
      numSimulations: 500,
      seed: 77,
      distribution: "normal",
    });
    expect(result.options).toHaveLength(3);
    const totalWins = result.options.reduce((s, o) => s + o.winCount, 0);
    expect(totalWins).toBe(500);
  });

  it("completes 10000 simulations (performance sanity)", () => {
    const d = makeDecision();
    const t0 = performance.now();
    const result = runMonteCarloSimulation(d, { numSimulations: 10_000, seed: 1 });
    const elapsed = performance.now() - t0;
    expect(result.options).toHaveLength(3);
    // Should complete well under 5 seconds even on CI
    expect(elapsed).toBeLessThan(5000);
  });
});
