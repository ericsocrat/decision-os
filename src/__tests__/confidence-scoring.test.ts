/**
 * Tests for confidence-adjusted scoring engine.
 *
 * Covers:
 *   - confidenceMultiplier() pure function
 *   - confidenceAdjustedScore() pure function
 *   - scoreOption() integration with strategies
 *   - computeResults() with decision-level strategy
 *   - Reducer SET_CONFIDENCE_STRATEGY action
 *
 * @see https://github.com/ericsocrat/decision-os/issues/94
 */

import { describe, it, expect } from "vitest";
import {
  confidenceMultiplier,
  confidenceAdjustedScore,
  scoreOption,
  computeResults,
  normalizeWeights,
  CONFIDENCE_MULTIPLIERS,
} from "@/lib/scoring";
import type { Confidence, ConfidenceStrategy, Decision, Criterion, ScoreMatrix } from "@/lib/types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeCriteria(count: number): Criterion[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i + 1}`,
    name: `Criterion ${i + 1}`,
    weight: 50,
    type: "benefit" as const,
  }));
}

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "test-decision",
    title: "Test",
    description: "",
    options: [
      { id: "o1", name: "Option 1" },
      { id: "o2", name: "Option 2" },
    ],
    criteria: makeCriteria(2),
    scores: {
      o1: {
        c1: { value: 8, confidence: "high" },
        c2: { value: 6, confidence: "low" },
      },
      o2: {
        c1: { value: 7, confidence: "medium" },
        c2: { value: 9, confidence: "high" },
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// CONFIDENCE_MULTIPLIERS
// ---------------------------------------------------------------------------

describe("CONFIDENCE_MULTIPLIERS", () => {
  it("has multiplier 1.0 for high confidence", () => {
    expect(CONFIDENCE_MULTIPLIERS.high).toBe(1.0);
  });

  it("has multiplier 0.8 for medium confidence", () => {
    expect(CONFIDENCE_MULTIPLIERS.medium).toBe(0.8);
  });

  it("has multiplier 0.5 for low confidence", () => {
    expect(CONFIDENCE_MULTIPLIERS.low).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// confidenceMultiplier()
// ---------------------------------------------------------------------------

describe("confidenceMultiplier", () => {
  it("returns 1.0 for 'none' strategy regardless of confidence", () => {
    expect(confidenceMultiplier("high", "none")).toBe(1.0);
    expect(confidenceMultiplier("medium", "none")).toBe(1.0);
    expect(confidenceMultiplier("low", "none")).toBe(1.0);
  });

  it("returns 1.0 for 'widen' strategy regardless of confidence", () => {
    expect(confidenceMultiplier("high", "widen")).toBe(1.0);
    expect(confidenceMultiplier("medium", "widen")).toBe(1.0);
    expect(confidenceMultiplier("low", "widen")).toBe(1.0);
  });

  it("returns correct multipliers for 'penalize' strategy", () => {
    expect(confidenceMultiplier("high", "penalize")).toBe(1.0);
    expect(confidenceMultiplier("medium", "penalize")).toBe(0.8);
    expect(confidenceMultiplier("low", "penalize")).toBe(0.5);
  });

  it("returns 1.0 when confidence is null", () => {
    expect(confidenceMultiplier(null, "none")).toBe(1.0);
    expect(confidenceMultiplier(null, "penalize")).toBe(1.0);
    expect(confidenceMultiplier(null, "widen")).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// confidenceAdjustedScore()
// ---------------------------------------------------------------------------

describe("confidenceAdjustedScore", () => {
  it("returns unchanged score for 'none' strategy", () => {
    expect(confidenceAdjustedScore(8, "low", "none")).toBe(8);
  });

  it("returns penalized score for 'penalize' + low", () => {
    expect(confidenceAdjustedScore(8, "low", "penalize")).toBe(4); // 8 * 0.5
  });

  it("returns penalized score for 'penalize' + medium", () => {
    expect(confidenceAdjustedScore(10, "medium", "penalize")).toBe(8); // 10 * 0.8
  });

  it("returns unchanged score for 'penalize' + high", () => {
    expect(confidenceAdjustedScore(10, "high", "penalize")).toBe(10); // 10 * 1.0
  });

  it("returns unchanged score for 'widen' strategy", () => {
    expect(confidenceAdjustedScore(8, "low", "widen")).toBe(8);
  });

  it("handles null confidence (defaults to 1.0 multiplier)", () => {
    expect(confidenceAdjustedScore(7, null, "penalize")).toBe(7);
  });

  it("handles zero score", () => {
    expect(confidenceAdjustedScore(0, "low", "penalize")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scoreOption() with confidence strategies
// ---------------------------------------------------------------------------

describe("scoreOption with confidence strategies", () => {
  const criteria = makeCriteria(1);
  const normalizedW = normalizeWeights([50]);

  it("returns unmodified scores with 'none' strategy", () => {
    const scores: ScoreMatrix = {
      o1: { c1: { value: 8, confidence: "low" } },
    };
    const result = scoreOption("o1", "Option 1", criteria, scores, normalizedW, "none");
    // effectiveScore(8, benefit) = 8, mult = 1.0
    expect(result.criterionScores[0].confidenceMultiplier).toBe(1.0);
    expect(result.totalScore).toBeCloseTo(8, 1);
  });

  it("penalizes low-confidence scores with 'penalize' strategy", () => {
    const scores: ScoreMatrix = {
      o1: { c1: { value: 8, confidence: "low" } },
    };
    const result = scoreOption("o1", "Option 1", criteria, scores, normalizedW, "penalize");
    // effectiveScore(8, benefit) = 8, mult = 0.5, adjusted = 4
    expect(result.criterionScores[0].confidenceMultiplier).toBe(0.5);
    expect(result.totalScore).toBeCloseTo(4, 1);
  });

  it("penalizes medium-confidence scores with 'penalize' strategy", () => {
    const scores: ScoreMatrix = {
      o1: { c1: { value: 10, confidence: "medium" } },
    };
    const result = scoreOption("o1", "Option 1", criteria, scores, normalizedW, "penalize");
    // effectiveScore(10, benefit) = 10, mult = 0.8, adjusted = 8
    expect(result.criterionScores[0].confidenceMultiplier).toBe(0.8);
    expect(result.totalScore).toBeCloseTo(8, 1);
  });

  it("does not penalize high-confidence scores", () => {
    const scores: ScoreMatrix = {
      o1: { c1: { value: 10, confidence: "high" } },
    };
    const result = scoreOption("o1", "Option 1", criteria, scores, normalizedW, "penalize");
    expect(result.criterionScores[0].confidenceMultiplier).toBe(1.0);
    expect(result.totalScore).toBeCloseTo(10, 1);
  });

  it("treats plain numeric scores as high confidence", () => {
    const scores: ScoreMatrix = {
      o1: { c1: 7 },
    };
    const result = scoreOption("o1", "Option 1", criteria, scores, normalizedW, "penalize");
    // plain number → resolveConfidence → "high" → mult 1.0
    expect(result.criterionScores[0].confidence).toBe("high");
    expect(result.criterionScores[0].confidenceMultiplier).toBe(1.0);
    expect(result.totalScore).toBeCloseTo(7, 1);
  });

  it("includes confidence in criterion score output", () => {
    const scores: ScoreMatrix = {
      o1: { c1: { value: 5, confidence: "medium" } },
    };
    const result = scoreOption("o1", "Option 1", criteria, scores, normalizedW, "penalize");
    expect(result.criterionScores[0].confidence).toBe("medium");
  });

  it("'widen' strategy does not alter scores", () => {
    const scores: ScoreMatrix = {
      o1: { c1: { value: 8, confidence: "low" } },
    };
    const result = scoreOption("o1", "Option 1", criteria, scores, normalizedW, "widen");
    expect(result.criterionScores[0].confidenceMultiplier).toBe(1.0);
    expect(result.totalScore).toBeCloseTo(8, 1);
  });
});

// ---------------------------------------------------------------------------
// computeResults() with confidence strategy
// ---------------------------------------------------------------------------

describe("computeResults with confidence strategy", () => {
  it("uses 'none' strategy by default", () => {
    const decision = makeDecision();
    // No confidenceStrategy set → defaults to "none"
    const results = computeResults(decision);
    // All multipliers should be 1.0
    results.optionResults.forEach((or) => {
      or.criterionScores.forEach((cs) => {
        expect(cs.confidenceMultiplier).toBe(1.0);
      });
    });
  });

  it("applies penalize strategy when set on decision", () => {
    const decision = makeDecision({ confidenceStrategy: "penalize" });
    const results = computeResults(decision);

    // o1.c2 has low confidence → mult = 0.5
    const o1c2 = results.optionResults
      .find((r) => r.optionId === "o1")
      ?.criterionScores.find((cs) => cs.criterionId === "c2");
    expect(o1c2?.confidenceMultiplier).toBe(0.5);
    expect(o1c2?.confidence).toBe("low");

    // o2.c1 has medium confidence → mult = 0.8
    const o2c1 = results.optionResults
      .find((r) => r.optionId === "o2")
      ?.criterionScores.find((cs) => cs.criterionId === "c1");
    expect(o2c1?.confidenceMultiplier).toBe(0.8);
    expect(o2c1?.confidence).toBe("medium");
  });

  it("penalize strategy changes ranking vs none strategy", () => {
    // Construct a decision where low-confidence high scores lose to
    // high-confidence moderate scores under penalize
    const decision = makeDecision({
      criteria: [{ id: "c1", name: "C1", weight: 100, type: "benefit" }],
      scores: {
        o1: { c1: { value: 10, confidence: "low" } },  // penalized: 10*0.5=5
        o2: { c1: { value: 7, confidence: "high" } },   // penalized: 7*1.0=7
      },
      confidenceStrategy: "penalize",
    });
    const results = computeResults(decision);
    // o2 should rank higher under penalize
    expect(results.optionResults[0].optionId).toBe("o2");
    expect(results.optionResults[1].optionId).toBe("o1");
  });

  it("widen strategy does not change scores", () => {
    const noneDecision = makeDecision({ confidenceStrategy: undefined });
    const widenDecision = makeDecision({ confidenceStrategy: "widen" });
    const noneResults = computeResults(noneDecision);
    const widenResults = computeResults(widenDecision);

    expect(noneResults.optionResults.map((r) => r.totalScore)).toEqual(
      widenResults.optionResults.map((r) => r.totalScore)
    );
  });
});
