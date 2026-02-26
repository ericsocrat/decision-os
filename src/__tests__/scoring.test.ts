/**
 * Unit tests for the Decision OS scoring engine.
 *
 * These tests verify the deterministic behavior of:
 * - Weight normalization
 * - Effective score calculation (benefit vs cost)
 * - Full decision scoring and ranking
 * - Top drivers computation
 * - Sensitivity analysis
 * - Edge cases (empty inputs, zero weights, etc.)
 */

import { describe, it, expect } from "vitest";
import {
  normalizeWeights,
  effectiveScore,
  scoreOption,
  computeResults,
  sensitivityAnalysis,
  roundDisplay,
  applyWeightOverride,
  MAX_SCORE,
} from "@/lib/scoring";
import type { Decision, Criterion } from "@/lib/types";

// ---------------------------------------------------------------------------
// normalizeWeights
// ---------------------------------------------------------------------------

describe("normalizeWeights", () => {
  it("normalizes weights to sum to 1.0", () => {
    const result = normalizeWeights([30, 35, 20, 10, 5]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("handles equal weights", () => {
    const result = normalizeWeights([50, 50]);
    expect(result).toEqual([0.5, 0.5]);
  });

  it("returns equal weights when all are zero", () => {
    const result = normalizeWeights([0, 0, 0]);
    expect(result).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeWeights([])).toEqual([]);
  });

  it("treats negative weights as zero", () => {
    const result = normalizeWeights([-10, 50, 50]);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0.5);
    expect(result[2]).toBe(0.5);
  });

  it("handles single weight", () => {
    const result = normalizeWeights([75]);
    expect(result).toEqual([1]);
  });
});

// ---------------------------------------------------------------------------
// effectiveScore
// ---------------------------------------------------------------------------

describe("effectiveScore", () => {
  it("returns raw score for benefit criterion", () => {
    expect(effectiveScore(7, "benefit")).toBe(7);
  });

  it("inverts score for cost criterion (10 - value)", () => {
    expect(effectiveScore(3, "cost")).toBe(7);
    expect(effectiveScore(0, "cost")).toBe(10);
    expect(effectiveScore(10, "cost")).toBe(0);
  });

  it("clamps scores below 0", () => {
    expect(effectiveScore(-5, "benefit")).toBe(0);
    expect(effectiveScore(-5, "cost")).toBe(10);
  });

  it("clamps scores above MAX_SCORE", () => {
    expect(effectiveScore(15, "benefit")).toBe(MAX_SCORE);
    expect(effectiveScore(15, "cost")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// roundDisplay
// ---------------------------------------------------------------------------

describe("roundDisplay", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundDisplay(3.14159)).toBe(3.14);
    expect(roundDisplay(2.006)).toBe(2.01);
    expect(roundDisplay(1.0)).toBe(1.0);
    expect(roundDisplay(7.999)).toBe(8.0);
  });

  it("returns 0 for non-finite values", () => {
    expect(roundDisplay(NaN)).toBe(0);
    expect(roundDisplay(Infinity)).toBe(0);
    expect(roundDisplay(-Infinity)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scoreOption
// ---------------------------------------------------------------------------

describe("scoreOption", () => {
  const criteria: Criterion[] = [
    { id: "c1", name: "Cost", weight: 50, type: "cost" },
    { id: "c2", name: "Quality", weight: 50, type: "benefit" },
  ];
  const nw = [0.5, 0.5]; // normalized

  it("computes correct total score", () => {
    const scores = { opt1: { c1: 3, c2: 8 } };
    const result = scoreOption("opt1", "Option 1", criteria, scores, nw);

    // c1 (cost): effective = 10-3 = 7, weighted = 7*0.5 = 3.5
    // c2 (benefit): effective = 8, weighted = 8*0.5 = 4.0
    // total = 3.5 + 4.0 = 7.5
    expect(result.totalScore).toBe(7.5);
    expect(result.criterionScores).toHaveLength(2);
    expect(result.criterionScores[0].effectiveScore).toBe(3.5);
    expect(result.criterionScores[1].effectiveScore).toBe(4.0);
  });

  it("treats missing scores as null (not scored)", () => {
    const result = scoreOption("opt_missing", "Missing", criteria, {}, nw);
    // All cells are null (missing) → excluded from computation → 0
    expect(result.totalScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeResults (integration)
// ---------------------------------------------------------------------------

describe("computeResults", () => {
  const decision: Decision = {
    id: "test-1",
    title: "Test Decision",
    options: [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
      { id: "c", name: "Gamma" },
    ],
    criteria: [
      { id: "c1", name: "Price", weight: 60, type: "cost" },
      { id: "c2", name: "Performance", weight: 40, type: "benefit" },
    ],
    scores: {
      a: { c1: 8, c2: 9 },
      b: { c1: 3, c2: 7 },
      c: { c1: 5, c2: 5 },
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("ranks options correctly", () => {
    const results = computeResults(decision);
    expect(results.optionResults).toHaveLength(3);

    // Alpha: cost=10-8=2 * 0.6 = 1.2, perf=9 * 0.4 = 3.6 => 4.8
    // Beta:  cost=10-3=7 * 0.6 = 4.2, perf=7 * 0.4 = 2.8 => 7.0
    // Gamma: cost=10-5=5 * 0.6 = 3.0, perf=5 * 0.4 = 2.0 => 5.0
    expect(results.optionResults[0].optionName).toBe("Beta");
    expect(results.optionResults[0].totalScore).toBe(7.0);
    expect(results.optionResults[0].rank).toBe(1);

    expect(results.optionResults[1].optionName).toBe("Gamma");
    expect(results.optionResults[1].totalScore).toBe(5.0);
    expect(results.optionResults[1].rank).toBe(2);

    expect(results.optionResults[2].optionName).toBe("Alpha");
    expect(results.optionResults[2].totalScore).toBe(4.8);
    expect(results.optionResults[2].rank).toBe(3);
  });

  it("identifies top drivers sorted by weight", () => {
    const results = computeResults(decision);
    expect(results.topDrivers[0].criterionName).toBe("Price");
    expect(results.topDrivers[0].normalizedWeight).toBe(0.6);
    expect(results.topDrivers[1].criterionName).toBe("Performance");
    expect(results.topDrivers[1].normalizedWeight).toBe(0.4);
  });

  it("returns empty results for no options", () => {
    const empty = { ...decision, options: [] };
    const results = computeResults(empty);
    expect(results.optionResults).toHaveLength(0);
  });

  it("returns empty results for no criteria", () => {
    const empty = { ...decision, criteria: [] };
    const results = computeResults(empty);
    expect(results.optionResults).toHaveLength(0);
  });

  it("is deterministic across multiple calls", () => {
    const r1 = computeResults(decision);
    const r2 = computeResults(decision);
    expect(r1).toEqual(r2);
  });
});

// ---------------------------------------------------------------------------
// sensitivityAnalysis
// ---------------------------------------------------------------------------

describe("sensitivityAnalysis", () => {
  const decision: Decision = {
    id: "sens-1",
    title: "Sensitivity Test",
    options: [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ],
    criteria: [
      { id: "c1", name: "Speed", weight: 51, type: "benefit" },
      { id: "c2", name: "Cost", weight: 49, type: "cost" },
    ],
    scores: {
      a: { c1: 9, c2: 2 },
      b: { c1: 7, c2: 8 },
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("returns correct number of sensitivity points (2 per criterion)", () => {
    const result = sensitivityAnalysis(decision, 20);
    // 2 criteria x 2 directions = 4 points
    expect(result.points).toHaveLength(4);
  });

  it("includes original and new winner info", () => {
    const result = sensitivityAnalysis(decision, 20);
    for (const point of result.points) {
      expect(point.originalWinner).toBeTruthy();
      expect(point.newWinner).toBeTruthy();
      expect(typeof point.winnerChanged).toBe("boolean");
    }
  });

  it("provides a summary", () => {
    const result = sensitivityAnalysis(decision, 20);
    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe("string");
  });

  it("returns empty analysis for empty decision", () => {
    const empty: Decision = {
      ...decision,
      options: [],
    };
    const result = sensitivityAnalysis(empty, 20);
    expect(result.points).toHaveLength(0);
    expect(result.summary).toBe("No options to analyze.");
  });

  it("is deterministic", () => {
    const r1 = sensitivityAnalysis(decision, 20);
    const r2 = sensitivityAnalysis(decision, 20);
    expect(r1).toEqual(r2);
  });
});

// ---------------------------------------------------------------------------
// applyWeightOverride
// ---------------------------------------------------------------------------

describe("applyWeightOverride", () => {
  const decision: Decision = {
    id: "override-1",
    title: "Override Test",
    options: [],
    criteria: [
      { id: "c1", name: "A", weight: 50, type: "benefit" },
      { id: "c2", name: "B", weight: 50, type: "benefit" },
    ],
    scores: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("overrides the specified criterion weight", () => {
    const modified = applyWeightOverride(decision, "c1", 80);
    expect(modified.criteria[0].weight).toBe(80);
    expect(modified.criteria[1].weight).toBe(50); // unchanged
  });

  it("does not mutate the original decision", () => {
    applyWeightOverride(decision, "c1", 99);
    expect(decision.criteria[0].weight).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Full worked example (matches docs/SCORING_MODEL.md)
// ---------------------------------------------------------------------------

describe("Worked example from SCORING_MODEL.md", () => {
  it("matches the documented example", () => {
    const decision: Decision = {
      id: "doc-example",
      title: "Laptop Choice",
      options: [
        { id: "macbook", name: "MacBook Pro" },
        { id: "thinkpad", name: "ThinkPad X1" },
      ],
      criteria: [
        { id: "price", name: "Price", weight: 40, type: "cost" },
        { id: "perf", name: "Performance", weight: 35, type: "benefit" },
        { id: "portable", name: "Portability", weight: 25, type: "benefit" },
      ],
      scores: {
        macbook: { price: 8, perf: 9, portable: 7 },
        thinkpad: { price: 5, perf: 7, portable: 8 },
      },
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const results = computeResults(decision);

    // Weights: 40/100=0.4, 35/100=0.35, 25/100=0.25
    // MacBook: price=10-8=2*0.4=0.8, perf=9*0.35=3.15, port=7*0.25=1.75 => 5.7
    // ThinkPad: price=10-5=5*0.4=2.0, perf=7*0.35=2.45, port=8*0.25=2.0 => 6.45

    expect(results.optionResults[0].optionName).toBe("ThinkPad X1");
    expect(results.optionResults[0].totalScore).toBe(6.45);

    expect(results.optionResults[1].optionName).toBe("MacBook Pro");
    expect(results.optionResults[1].totalScore).toBe(5.7);
  });
});
