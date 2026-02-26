/**
 * Per-Score Confidence & Null-Score Handling — Unit Tests
 *
 * Covers:
 *  - ScoreValue helpers: resolveScoreValue, resolveConfidence, isScoredCell,
 *    readScore, readScoreOrZero
 *  - scoreOption with null scores (excluded, re-normalized)
 *  - Backward compat (plain numbers behave identically)
 *  - TOPSIS / regret with null scores
 *  - Completeness with null cells
 *  - Share encoding / decoding with null + confidence
 *  - Import with null scores
 *  - Monte Carlo: hasNonHighConfidence, perturbScores, simulation with confidence
 *
 * @see https://github.com/ericsocrat/decision-os/issues/76
 */

import { describe, it, expect } from "vitest";
import {
  resolveScoreValue,
  resolveConfidence,
  isScoredCell,
  readScore,
  readScoreOrZero,
  scoreOption,
  normalizeWeights,
  computeResults,
} from "@/lib/scoring";
import {
  createPRNG,
  perturbScores,
  hasNonHighConfidence,
  CONFIDENCE_PERTURBATION,
  runMonteCarloSimulation,
} from "@/lib/monte-carlo";
import { decisionToSharePayload, sharePayloadToDecision } from "@/lib/share";
import { computeCompleteness } from "@/lib/completeness";
import type { Decision, Criterion, ScoreMatrix, ScoreValue, ScoredCell } from "@/lib/types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "test-1",
    title: "Test Decision",
    description: "",
    options: [
      { id: "opt-a", name: "Option A" },
      { id: "opt-b", name: "Option B" },
    ],
    criteria: [
      { id: "c1", name: "Speed", weight: 50, type: "benefit" },
      { id: "c2", name: "Cost", weight: 50, type: "cost" },
    ],
    scores: {
      "opt-a": { c1: 8, c2: 3 },
      "opt-b": { c1: 6, c2: 7 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const scoredCell = (value: number, confidence: "high" | "medium" | "low"): ScoredCell => ({
  value,
  confidence,
});

// ===========================================================================
// resolveScoreValue
// ===========================================================================

describe("resolveScoreValue", () => {
  it("returns null for null", () => {
    expect(resolveScoreValue(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(resolveScoreValue(undefined)).toBeNull();
  });

  it("returns the number for a plain number", () => {
    expect(resolveScoreValue(7)).toBe(7);
  });

  it("returns .value for a ScoredCell", () => {
    expect(resolveScoreValue(scoredCell(5, "medium"))).toBe(5);
  });

  it("handles zero as a valid number", () => {
    expect(resolveScoreValue(0)).toBe(0);
  });
});

// ===========================================================================
// resolveConfidence
// ===========================================================================

describe("resolveConfidence", () => {
  it("returns null for null", () => {
    expect(resolveConfidence(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(resolveConfidence(undefined)).toBeNull();
  });

  it('returns "high" for a plain number', () => {
    expect(resolveConfidence(7)).toBe("high");
  });

  it("returns the confidence from a ScoredCell", () => {
    expect(resolveConfidence(scoredCell(5, "low"))).toBe("low");
    expect(resolveConfidence(scoredCell(5, "medium"))).toBe("medium");
    expect(resolveConfidence(scoredCell(5, "high"))).toBe("high");
  });
});

// ===========================================================================
// isScoredCell
// ===========================================================================

describe("isScoredCell", () => {
  it("returns true for a ScoredCell object", () => {
    expect(isScoredCell(scoredCell(3, "low"))).toBe(true);
  });

  it("returns false for a plain number", () => {
    expect(isScoredCell(7)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isScoredCell(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isScoredCell(undefined)).toBe(false);
  });
});

// ===========================================================================
// readScore / readScoreOrZero
// ===========================================================================

describe("readScore", () => {
  const scores: ScoreMatrix = {
    opt1: { c1: 8, c2: null, c3: scoredCell(5, "low") },
  };

  it("reads a plain number", () => {
    expect(readScore(scores, "opt1", "c1")).toBe(8);
  });

  it("returns null for a null cell", () => {
    expect(readScore(scores, "opt1", "c2")).toBeNull();
  });

  it("unwraps a ScoredCell value", () => {
    expect(readScore(scores, "opt1", "c3")).toBe(5);
  });

  it("returns null for a missing option", () => {
    expect(readScore(scores, "missing", "c1")).toBeNull();
  });

  it("returns null for a missing criterion", () => {
    expect(readScore(scores, "opt1", "missing")).toBeNull();
  });
});

describe("readScoreOrZero", () => {
  const scores: ScoreMatrix = {
    opt1: { c1: 8, c2: null },
  };

  it("reads a plain number", () => {
    expect(readScoreOrZero(scores, "opt1", "c1")).toBe(8);
  });

  it("returns 0 for a null cell", () => {
    expect(readScoreOrZero(scores, "opt1", "c2")).toBe(0);
  });

  it("returns 0 for a missing option", () => {
    expect(readScoreOrZero(scores, "missing", "c1")).toBe(0);
  });
});

// ===========================================================================
// scoreOption — null score handling
// ===========================================================================

describe("scoreOption with null scores", () => {
  const criteria: Criterion[] = [
    { id: "c1", name: "Speed", weight: 60, type: "benefit" },
    { id: "c2", name: "Cost", weight: 40, type: "cost" },
  ];
  const nw = normalizeWeights(criteria.map((c) => c.weight));

  it("excludes null cells and re-normalizes by scored weight sum", () => {
    // opt-a has only c1 scored (8/10 benefit), c2 is null
    const scores: ScoreMatrix = { "opt-a": { c1: 8, c2: null } };
    const result = scoreOption("opt-a", "Option A", criteria, scores, nw);

    // With only c1 scored: effectiveScore = 8, weight = 0.6
    // totalScore = (8 * 0.6) / 0.6 = 8.0
    expect(result.totalScore).toBe(8);
  });

  it("marks null cells as isNull in criterionScores", () => {
    const scores: ScoreMatrix = { "opt-a": { c1: 8, c2: null } };
    const result = scoreOption("opt-a", "Option A", criteria, scores, nw);
    const c2Score = result.criterionScores.find((cs) => cs.criterionId === "c2");
    expect(c2Score?.isNull).toBe(true);
  });

  it("uses rawScore=0 for null cells in criterionScores breakdown", () => {
    const scores: ScoreMatrix = { "opt-a": { c1: 8, c2: null } };
    const result = scoreOption("opt-a", "Option A", criteria, scores, nw);
    const c2Score = result.criterionScores.find((cs) => cs.criterionId === "c2");
    expect(c2Score?.rawScore).toBe(0);
  });

  it("returns 0 when all cells are null", () => {
    const scores: ScoreMatrix = { "opt-a": { c1: null, c2: null } };
    const result = scoreOption("opt-a", "Option A", criteria, scores, nw);
    expect(result.totalScore).toBe(0);
  });

  it("backward compat: plain numbers produce same result as before", () => {
    const scores: ScoreMatrix = { "opt-a": { c1: 8, c2: 3 } };
    const result = scoreOption("opt-a", "Option A", criteria, scores, nw);

    // benefit c1: eff = 8, cost c2: eff = 10 - 3 = 7
    // total = 8 * 0.6 + 7 * 0.4 = 4.8 + 2.8 = 7.6
    expect(result.totalScore).toBe(7.6);
  });
});

// ===========================================================================
// computeResults with mixed null/scored cells
// ===========================================================================

describe("computeResults with null scores", () => {
  it("ranks options correctly when some cells are null", () => {
    const decision = makeDecision({
      scores: {
        "opt-a": { c1: 8, c2: null },
        "opt-b": { c1: 6, c2: 7 },
      },
    });
    const results = computeResults(decision);

    // opt-a: only c1 scored → total = 8.0
    // opt-b: both scored → 6*0.5 + (10-7)*0.5 = 3 + 1.5 = 4.5
    expect(results.optionResults[0].optionId).toBe("opt-a");
    expect(results.optionResults[0].totalScore).toBe(8);
    expect(results.optionResults[1].optionId).toBe("opt-b");
    expect(results.optionResults[1].totalScore).toBe(4.5);
  });

  it("handles ScoredCell values correctly in computation", () => {
    const decision = makeDecision({
      scores: {
        "opt-a": { c1: scoredCell(8, "low"), c2: scoredCell(3, "medium") },
        "opt-b": { c1: 6, c2: 7 },
      },
    });
    const results = computeResults(decision);

    // ScoredCell extracts .value — same result as plain numbers
    // makeDecision uses [50,50] weights: 8*0.5 + (10-3)*0.5 = 4 + 3.5 = 7.5
    const optA = results.optionResults.find((r) => r.optionId === "opt-a");
    expect(optA?.totalScore).toBe(7.5);
  });
});

// ===========================================================================
// Completeness with null cells
// ===========================================================================

describe("computeCompleteness with null cells", () => {
  it("counts null cells as unfilled", () => {
    const decision = makeDecision({
      scores: {
        "opt-a": { c1: 8, c2: null },
        "opt-b": { c1: null, c2: null },
      },
    });
    const result = computeCompleteness(decision);

    // Total cells: 2 options × 2 criteria = 4
    // Filled: 1 (opt-a/c1)
    expect(result.filled).toBe(1);
    expect(result.total).toBe(4);
  });

  it("ScoredCell counts as filled", () => {
    const decision = makeDecision({
      scores: {
        "opt-a": { c1: scoredCell(8, "low"), c2: scoredCell(3, "medium") },
        "opt-b": { c1: 6, c2: 7 },
      },
    });
    const result = computeCompleteness(decision);
    expect(result.filled).toBe(4);
    expect(result.total).toBe(4);
  });
});

// ===========================================================================
// Share encoding / decoding — null + confidence
// ===========================================================================

describe("share encoding/decoding with null + confidence", () => {
  it("round-trips null scores", () => {
    const decision = makeDecision({
      scores: {
        "opt-a": { c1: 8, c2: null },
        "opt-b": { c1: null, c2: 5 },
      },
    });
    const payload = decisionToSharePayload(decision);

    expect(payload.s[0][1]).toBeNull(); // opt-a/c2 = null
    expect(payload.s[1][0]).toBeNull(); // opt-b/c1 = null

    const decoded = sharePayloadToDecision(payload);
    expect(readScore(decoded.scores, decoded.options[0].id, decoded.criteria[1].id)).toBeNull();
    expect(readScore(decoded.scores, decoded.options[1].id, decoded.criteria[0].id)).toBeNull();
    // Non-null scores preserved
    expect(readScore(decoded.scores, decoded.options[0].id, decoded.criteria[0].id)).toBe(8);
    expect(readScore(decoded.scores, decoded.options[1].id, decoded.criteria[1].id)).toBe(5);
  });

  it("includes cf grid when non-high confidence exists", () => {
    const decision = makeDecision({
      scores: {
        "opt-a": { c1: scoredCell(8, "low"), c2: 3 },
        "opt-b": { c1: 6, c2: scoredCell(7, "medium") },
      },
    });
    const payload = decisionToSharePayload(decision);

    // cf grid should exist
    expect(payload.cf).toBeDefined();
    // opt-a/c1 = low → 2, opt-a/c2 = high → 0
    expect(payload.cf![0][0]).toBe(2);
    expect(payload.cf![0][1]).toBe(0);
    // opt-b/c1 = high → 0, opt-b/c2 = medium → 1
    expect(payload.cf![1][0]).toBe(0);
    expect(payload.cf![1][1]).toBe(1);
  });

  it("omits cf grid when all cells are high confidence", () => {
    const decision = makeDecision({
      scores: {
        "opt-a": { c1: 8, c2: 3 },
        "opt-b": { c1: 6, c2: 7 },
      },
    });
    const payload = decisionToSharePayload(decision);
    expect(payload.cf).toBeUndefined();
  });

  it("round-trips confidence levels", () => {
    const decision = makeDecision({
      scores: {
        "opt-a": { c1: scoredCell(8, "low"), c2: scoredCell(3, "medium") },
        "opt-b": { c1: 6, c2: scoredCell(7, "low") },
      },
    });
    const payload = decisionToSharePayload(decision);
    const decoded = sharePayloadToDecision(payload);

    // opt-a/c1 should be low confidence
    const optA = decoded.options[0].id;
    const c1 = decoded.criteria[0].id;
    const c2 = decoded.criteria[1].id;

    expect(resolveConfidence(decoded.scores[optA]?.[c1])).toBe("low");
    expect(resolveConfidence(decoded.scores[optA]?.[c2])).toBe("medium");

    // opt-b/c1 was plain number → decoded as plain (high)
    const optB = decoded.options[1].id;
    expect(resolveScoreValue(decoded.scores[optB]?.[c1])).toBe(6);
    expect(resolveConfidence(decoded.scores[optB]?.[c2])).toBe("low");
  });
});

// ===========================================================================
// Monte Carlo — hasNonHighConfidence
// ===========================================================================

describe("hasNonHighConfidence", () => {
  it("returns false for all-plain-number matrix", () => {
    const scores: ScoreMatrix = {
      o1: { c1: 8, c2: 5 },
    };
    expect(hasNonHighConfidence(scores)).toBe(false);
  });

  it("returns false for all-high ScoredCell matrix", () => {
    const scores: ScoreMatrix = {
      o1: { c1: scoredCell(8, "high"), c2: scoredCell(5, "high") },
    };
    expect(hasNonHighConfidence(scores)).toBe(false);
  });

  it("returns true when any cell has medium confidence", () => {
    const scores: ScoreMatrix = {
      o1: { c1: 8, c2: scoredCell(5, "medium") },
    };
    expect(hasNonHighConfidence(scores)).toBe(true);
  });

  it("returns true when any cell has low confidence", () => {
    const scores: ScoreMatrix = {
      o1: { c1: scoredCell(8, "low"), c2: 5 },
    };
    expect(hasNonHighConfidence(scores)).toBe(true);
  });

  it("returns false for empty matrix", () => {
    expect(hasNonHighConfidence({})).toBe(false);
  });

  it("handles null cells gracefully", () => {
    const scores: ScoreMatrix = {
      o1: { c1: null, c2: 5 },
    };
    expect(hasNonHighConfidence(scores)).toBe(false);
  });
});

// ===========================================================================
// Monte Carlo — CONFIDENCE_PERTURBATION multipliers
// ===========================================================================

describe("CONFIDENCE_PERTURBATION", () => {
  it("has correct multipliers", () => {
    expect(CONFIDENCE_PERTURBATION.high).toBe(1.0);
    expect(CONFIDENCE_PERTURBATION.medium).toBe(1.5);
    expect(CONFIDENCE_PERTURBATION.low).toBe(2.5);
  });
});

// ===========================================================================
// Monte Carlo — perturbScores
// ===========================================================================

describe("perturbScores", () => {
  const options = [{ id: "o1" }, { id: "o2" }];
  const criteria = [{ id: "c1" }, { id: "c2" }];

  it("preserves null cells as null", () => {
    const scores: ScoreMatrix = {
      o1: { c1: 8, c2: null },
      o2: { c1: null, c2: 5 },
    };
    const rand = createPRNG(42);
    const result = perturbScores(scores, options, criteria, rand, 0.15, "uniform");

    expect(result.o1.c2).toBeNull();
    expect(result.o2.c1).toBeNull();
  });

  it("perturbs plain number cells", () => {
    const scores: ScoreMatrix = {
      o1: { c1: 5, c2: 5 },
      o2: { c1: 5, c2: 5 },
    };
    const rand = createPRNG(42);
    const result = perturbScores(scores, options, criteria, rand, 0.15, "uniform");

    // Scores should be perturbed — at least some should differ from 5
    const vals = [result.o1.c1, result.o1.c2, result.o2.c1, result.o2.c2];
    const numericVals = vals.map((v) => resolveScoreValue(v as ScoreValue));
    const anyDifferent = numericVals.some((v) => v !== 5);
    expect(anyDifferent).toBe(true);
  });

  it("clamps results to [0, 10]", () => {
    const scores: ScoreMatrix = {
      o1: { c1: 0.1, c2: 9.9 },
      o2: { c1: 10, c2: 0 },
    };
    // Run many times with different seeds
    for (let seed = 1; seed <= 50; seed++) {
      const rand = createPRNG(seed);
      const result = perturbScores(scores, options, criteria, rand, 0.5, "uniform");
      for (const optId of Object.keys(result)) {
        for (const critId of Object.keys(result[optId])) {
          const v = resolveScoreValue(result[optId][critId]);
          if (v !== null) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(10);
          }
        }
      }
    }
  });

  it("is deterministic with the same seed", () => {
    const scores: ScoreMatrix = {
      o1: { c1: 8, c2: 3 },
      o2: { c1: 6, c2: 7 },
    };
    const r1 = perturbScores(scores, options, criteria, createPRNG(99), 0.15, "uniform");
    const r2 = perturbScores(scores, options, criteria, createPRNG(99), 0.15, "uniform");

    expect(resolveScoreValue(r1.o1.c1 as ScoreValue)).toBe(
      resolveScoreValue(r2.o1.c1 as ScoreValue)
    );
    expect(resolveScoreValue(r1.o2.c2 as ScoreValue)).toBe(
      resolveScoreValue(r2.o2.c2 as ScoreValue)
    );
  });

  it("low-confidence cells have wider perturbation than high", () => {
    // Statistical test: over many seeds, low-confidence cells should have
    // higher variance than high-confidence cells with the same base value.
    const scoresHigh: ScoreMatrix = {
      o1: { c1: scoredCell(5, "high"), c2: scoredCell(5, "high") },
      o2: { c1: scoredCell(5, "high"), c2: scoredCell(5, "high") },
    };
    const scoresLow: ScoreMatrix = {
      o1: { c1: scoredCell(5, "low"), c2: scoredCell(5, "low") },
      o2: { c1: scoredCell(5, "low"), c2: scoredCell(5, "low") },
    };

    let varianceHigh = 0;
    let varianceLow = 0;
    const N = 200;

    for (let i = 1; i <= N; i++) {
      const rH = perturbScores(scoresHigh, options, criteria, createPRNG(i), 0.15, "uniform");
      const rL = perturbScores(scoresLow, options, criteria, createPRNG(i), 0.15, "uniform");
      const vH = resolveScoreValue(rH.o1.c1 as ScoreValue)!;
      const vL = resolveScoreValue(rL.o1.c1 as ScoreValue)!;
      varianceHigh += (vH - 5) ** 2;
      varianceLow += (vL - 5) ** 2;
    }

    varianceHigh /= N;
    varianceLow /= N;

    // Low-confidence should have higher variance
    expect(varianceLow).toBeGreaterThan(varianceHigh);
  });
});

// ===========================================================================
// Monte Carlo — full simulation with confidence
// ===========================================================================

describe("runMonteCarloSimulation with confidence", () => {
  it("runs successfully with ScoredCell scores", () => {
    const decision = makeDecision({
      options: [
        { id: "o1", name: "A" },
        { id: "o2", name: "B" },
      ],
      criteria: [
        { id: "c1", name: "Speed", weight: 50, type: "benefit" },
        { id: "c2", name: "Cost", weight: 50, type: "cost" },
      ],
      scores: {
        o1: { c1: scoredCell(8, "low"), c2: scoredCell(3, "medium") },
        o2: { c1: 6, c2: 7 },
      },
    });

    const result = runMonteCarloSimulation(decision, {
      numSimulations: 100,
      seed: 42,
    });

    expect(result.options).toHaveLength(2);
    expect(result.options[0].winProbability + result.options[1].winProbability).toBeCloseTo(1.0, 5);
  });

  it("runs successfully with null scores", () => {
    const decision = makeDecision({
      scores: {
        "opt-a": { c1: 8, c2: null },
        "opt-b": { c1: null, c2: 7 },
      },
    });

    const result = runMonteCarloSimulation(decision, {
      numSimulations: 100,
      seed: 42,
    });

    expect(result.options).toHaveLength(2);
    // Should complete without errors
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("produces different distributions for low vs high confidence", () => {
    const highConfDecision = makeDecision({
      options: [
        { id: "o1", name: "A" },
        { id: "o2", name: "B" },
      ],
      criteria: [
        { id: "c1", name: "Speed", weight: 50, type: "benefit" },
        { id: "c2", name: "Cost", weight: 50, type: "cost" },
      ],
      scores: {
        o1: { c1: scoredCell(8, "high"), c2: scoredCell(3, "high") },
        o2: { c1: scoredCell(6, "high"), c2: scoredCell(7, "high") },
      },
    });

    const lowConfDecision = makeDecision({
      options: [
        { id: "o1", name: "A" },
        { id: "o2", name: "B" },
      ],
      criteria: [
        { id: "c1", name: "Speed", weight: 50, type: "benefit" },
        { id: "c2", name: "Cost", weight: 50, type: "cost" },
      ],
      scores: {
        o1: { c1: scoredCell(8, "low"), c2: scoredCell(3, "low") },
        o2: { c1: scoredCell(6, "low"), c2: scoredCell(7, "low") },
      },
    });

    const resultHigh = runMonteCarloSimulation(highConfDecision, {
      numSimulations: 500,
      seed: 42,
    });
    const resultLow = runMonteCarloSimulation(lowConfDecision, {
      numSimulations: 500,
      seed: 42,
    });

    // Low-confidence should have wider std deviations
    const highStd = resultHigh.options[0].stdDev;
    const lowStd = resultLow.options[0].stdDev;
    expect(lowStd).toBeGreaterThan(highStd);
  });
});
