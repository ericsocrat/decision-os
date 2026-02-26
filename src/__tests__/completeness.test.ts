/**
 * Tests for the completeness calculation utility.
 */

import { describe, it, expect } from "vitest";
import { computeCompleteness } from "@/lib/completeness";
import type { Decision } from "@/lib/types";

function makeDecision(
  optionCount: number,
  criterionCount: number,
  filledScores: Record<string, Record<string, number>> = {}
): Decision {
  const options = Array.from({ length: optionCount }, (_, i) => ({
    id: `opt-${i}`,
    name: `Option ${i}`,
  }));
  const criteria = Array.from({ length: criterionCount }, (_, i) => ({
    id: `crit-${i}`,
    name: `Criterion ${i}`,
    weight: Math.round(100 / Math.max(criterionCount, 1)),
    type: "benefit" as const,
  }));
  return {
    id: "test",
    title: "Test Decision",
    options,
    criteria,
    scores: filledScores,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("computeCompleteness", () => {
  it("returns 100% blue when no options or criteria", () => {
    const result = computeCompleteness(makeDecision(0, 0));
    expect(result).toEqual({
      filled: 0,
      total: 0,
      ratio: 1,
      percent: 100,
      tier: "blue",
    });
  });

  it("returns 0% red when all scores are 0", () => {
    const result = computeCompleteness(makeDecision(2, 3));
    expect(result.filled).toBe(0);
    expect(result.total).toBe(6);
    expect(result.ratio).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.tier).toBe("red");
  });

  it("returns 100% blue when all scores are > 0", () => {
    const scores: Record<string, Record<string, number>> = {
      "opt-0": { "crit-0": 5, "crit-1": 3 },
      "opt-1": { "crit-0": 7, "crit-1": 2 },
    };
    const result = computeCompleteness(makeDecision(2, 2, scores));
    expect(result.filled).toBe(4);
    expect(result.total).toBe(4);
    expect(result.ratio).toBe(1);
    expect(result.percent).toBe(100);
    expect(result.tier).toBe("blue");
  });

  it("returns correct ratio for partial completion", () => {
    const scores: Record<string, Record<string, number>> = {
      "opt-0": { "crit-0": 5 },
      // opt-1 scores all missing → 0
    };
    const result = computeCompleteness(makeDecision(2, 2, scores));
    expect(result.filled).toBe(1);
    expect(result.total).toBe(4);
    expect(result.ratio).toBe(0.25);
    expect(result.percent).toBe(25);
    expect(result.tier).toBe("red");
  });

  it("assigns tier 'red' when ratio < 0.3", () => {
    // 1/4 = 0.25
    const scores = { "opt-0": { "crit-0": 1 } };
    const result = computeCompleteness(makeDecision(2, 2, scores));
    expect(result.tier).toBe("red");
  });

  it("assigns tier 'yellow' when ratio >= 0.3 and <= 0.7", () => {
    // 2/4 = 0.5
    const scores = { "opt-0": { "crit-0": 1, "crit-1": 2 } };
    const result = computeCompleteness(makeDecision(2, 2, scores));
    expect(result.tier).toBe("yellow");
  });

  it("assigns tier 'green' when ratio > 0.7 and < 1", () => {
    // 3/4 = 0.75
    const scores = {
      "opt-0": { "crit-0": 1, "crit-1": 2 },
      "opt-1": { "crit-0": 3 },
    };
    const result = computeCompleteness(makeDecision(2, 2, scores));
    expect(result.tier).toBe("green");
  });

  it("assigns tier 'blue' when ratio = 1", () => {
    const scores = {
      "opt-0": { "crit-0": 1, "crit-1": 2 },
      "opt-1": { "crit-0": 3, "crit-1": 4 },
    };
    const result = computeCompleteness(makeDecision(2, 2, scores));
    expect(result.tier).toBe("blue");
  });

  it("handles missing option rows in scores gracefully", () => {
    // scores object has no entries at all
    const result = computeCompleteness(makeDecision(3, 3));
    expect(result.filled).toBe(0);
    expect(result.total).toBe(9);
  });

  it("rounds percent to nearest integer", () => {
    // 1/3 = 0.333... → 33%
    const scores = { "opt-0": { "crit-0": 5 } };
    const result = computeCompleteness(makeDecision(1, 3, scores));
    expect(result.percent).toBe(33);
  });

  it("treats score of exactly 0 as unfilled", () => {
    const scores = { "opt-0": { "crit-0": 0 } };
    const result = computeCompleteness(makeDecision(1, 1, scores));
    expect(result.filled).toBe(0);
  });

  it("treats score > 0 as filled", () => {
    const scores = { "opt-0": { "crit-0": 1 } };
    const result = computeCompleteness(makeDecision(1, 1, scores));
    expect(result.filled).toBe(1);
  });
});
