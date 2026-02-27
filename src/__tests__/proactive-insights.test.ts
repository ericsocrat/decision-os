/**
 * Tests for proactive-insights engine.
 */

import { describe, it, expect } from "vitest";
import {
  generateProactiveInsights,
  findClosestTippingPoint,
} from "@/lib/proactive-insights";
import type {
  Decision,
  DecisionResults,
  SensitivityAnalysis,
  SensitivityPoint,
  OptionResult,
} from "@/lib/types";
import { DEMO_DECISION } from "@/lib/demo-data";
import { computeResults, sensitivityAnalysis } from "@/lib/scoring";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePoint(overrides: Partial<SensitivityPoint> = {}): SensitivityPoint {
  return {
    criterionId: "crit-1",
    criterionName: "Criterion 1",
    originalWeight: 30,
    adjustedWeight: 36,
    originalWinner: "Option A",
    newWinner: "Option A",
    winnerChanged: false,
    ...overrides,
  };
}

function makeSensitivity(points: SensitivityPoint[]): SensitivityAnalysis {
  return {
    decisionId: "test",
    points,
    summary: "Test summary",
  };
}

function makeResults(options: Partial<OptionResult>[]): DecisionResults {
  return {
    decisionId: "test",
    optionResults: options.map((o, i) => ({
      optionId: o.optionId ?? `opt-${i}`,
      optionName: o.optionName ?? `Option ${i + 1}`,
      totalScore: o.totalScore ?? 10 - i,
      rank: o.rank ?? i + 1,
      criterionScores: o.criterionScores ?? [],
    })),
    topDrivers: [],
  };
}

// A minimal decision with 2 options and 2 criteria for Monte Carlo tests
const MINIMAL_DECISION: Decision = {
  id: "test-decision",
  title: "Test",
  options: [
    { id: "opt-a", name: "Option A" },
    { id: "opt-b", name: "Option B" },
  ],
  criteria: [
    { id: "crit-1", name: "Criterion 1", weight: 50, type: "benefit" },
    { id: "crit-2", name: "Criterion 2", weight: 50, type: "benefit" },
  ],
  scores: {
    "opt-a": { "crit-1": 8, "crit-2": 7 },
    "opt-b": { "crit-1": 7, "crit-2": 8 },
  },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// findClosestTippingPoint
// ---------------------------------------------------------------------------

describe("findClosestTippingPoint", () => {
  it("returns null when no points have winnerChanged", () => {
    const sa = makeSensitivity([
      makePoint({ winnerChanged: false }),
      makePoint({ criterionId: "crit-2", winnerChanged: false }),
    ]);
    expect(findClosestTippingPoint(sa)).toBeNull();
  });

  it("returns the single tipping point when only one exists", () => {
    const sa = makeSensitivity([
      makePoint({ winnerChanged: false }),
      makePoint({
        criterionId: "crit-2",
        criterionName: "Salary",
        originalWeight: 30,
        adjustedWeight: 42,
        winnerChanged: true,
        newWinner: "Option B",
      }),
    ]);
    const tp = findClosestTippingPoint(sa);
    expect(tp).not.toBeNull();
    expect(tp!.criterionName).toBe("Salary");
    expect(tp!.weightDelta).toBe(12);
    expect(tp!.direction).toBe("increase");
    expect(tp!.newWinner).toBe("Option B");
  });

  it("returns the closest tipping point when multiple exist", () => {
    const sa = makeSensitivity([
      makePoint({
        criterionId: "crit-1",
        criterionName: "Location",
        originalWeight: 30,
        adjustedWeight: 45,
        winnerChanged: true,
        newWinner: "Option C",
      }),
      makePoint({
        criterionId: "crit-2",
        criterionName: "Salary",
        originalWeight: 30,
        adjustedWeight: 35,
        winnerChanged: true,
        newWinner: "Option B",
      }),
    ]);
    const tp = findClosestTippingPoint(sa);
    expect(tp!.criterionName).toBe("Salary");
    expect(tp!.weightDelta).toBe(5);
  });

  it("handles decrease direction correctly", () => {
    const sa = makeSensitivity([
      makePoint({
        criterionId: "crit-1",
        criterionName: "Cost",
        originalWeight: 40,
        adjustedWeight: 28,
        winnerChanged: true,
        newWinner: "Option X",
      }),
    ]);
    const tp = findClosestTippingPoint(sa);
    expect(tp!.direction).toBe("decrease");
    expect(tp!.weightDelta).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// generateProactiveInsights
// ---------------------------------------------------------------------------

describe("generateProactiveInsights", () => {
  it("returns empty array when fewer than 2 options", () => {
    const results = makeResults([{ optionName: "Only One" }]);
    const sa = makeSensitivity([]);
    expect(generateProactiveInsights(MINIMAL_DECISION, results, sa, 20)).toEqual([]);
  });

  it("generates robustness insight (positive) when all points are stable", () => {
    const results = makeResults([
      { optionName: "Option A", totalScore: 9 },
      { optionName: "Option B", totalScore: 7 },
    ]);
    const sa = makeSensitivity([
      makePoint({ winnerChanged: false }),
      makePoint({ criterionId: "crit-2", winnerChanged: false }),
    ]);

    const insights = generateProactiveInsights(MINIMAL_DECISION, results, sa, 20);
    const robustness = insights.find((i) => i.type === "robustness");

    expect(robustness).toBeDefined();
    expect(robustness!.severity).toBe("positive");
    expect(robustness!.headline).toContain("Option A");
    expect(robustness!.headline).toContain("remains #1");
    expect(robustness!.headline).toContain("±20%");
  });

  it("generates warning robustness when some points change winner", () => {
    const results = makeResults([
      { optionName: "A", totalScore: 9 },
      { optionName: "B", totalScore: 7 },
    ]);
    const sa = makeSensitivity([
      makePoint({ winnerChanged: false }),
      makePoint({
        criterionId: "crit-2",
        winnerChanged: true,
        newWinner: "B",
      }),
    ]);

    const insights = generateProactiveInsights(MINIMAL_DECISION, results, sa, 20);
    const robustness = insights.find((i) => i.type === "robustness");

    expect(robustness!.severity).toBe("warning");
    expect(robustness!.headline).toContain("sensitive");
  });

  it("generates tipping-point insight when one exists", () => {
    const results = makeResults([
      { optionName: "A", totalScore: 9 },
      { optionName: "B", totalScore: 7 },
    ]);
    const sa = makeSensitivity([
      makePoint({
        criterionName: "Salary",
        originalWeight: 30,
        adjustedWeight: 38,
        winnerChanged: true,
        newWinner: "B",
      }),
    ]);

    const insights = generateProactiveInsights(MINIMAL_DECISION, results, sa, 20);
    const tipping = insights.find((i) => i.type === "tipping-point");

    expect(tipping).toBeDefined();
    expect(tipping!.severity).toBe("warning");
    expect(tipping!.headline).toContain("Salary");
    expect(tipping!.headline).toContain("8%");
    expect(tipping!.action?.target).toBe("sensitivity-tab");
  });

  it("generates margin insight with differentiator", () => {
    const results = makeResults([
      {
        optionName: "A",
        totalScore: 9,
        criterionScores: [
          {
            criterionId: "crit-1",
            criterionName: "Speed",
            rawScore: 8,
            normalizedWeight: 0.5,
            effectiveScore: 4,
            criterionType: "benefit",
          },
          {
            criterionId: "crit-2",
            criterionName: "Cost",
            rawScore: 6,
            normalizedWeight: 0.5,
            effectiveScore: 3,
            criterionType: "benefit",
          },
        ],
      },
      {
        optionName: "B",
        totalScore: 7,
        criterionScores: [
          {
            criterionId: "crit-1",
            criterionName: "Speed",
            rawScore: 5,
            normalizedWeight: 0.5,
            effectiveScore: 2.5,
            criterionType: "benefit",
          },
          {
            criterionId: "crit-2",
            criterionName: "Cost",
            rawScore: 7,
            normalizedWeight: 0.5,
            effectiveScore: 3.5,
            criterionType: "benefit",
          },
        ],
      },
    ]);
    const sa = makeSensitivity([]);

    const insights = generateProactiveInsights(MINIMAL_DECISION, results, sa, 20);
    const margin = insights.find((i) => i.type === "margin");

    expect(margin).toBeDefined();
    expect(margin!.headline).toContain("2.00");
    expect(margin!.detail).toContain("Speed");
    expect(margin!.detail).toContain("1.50");
  });

  it("generates monte-carlo-preview for close margins", () => {
    const results = makeResults([
      { optionName: "Option A", totalScore: 8.0 },
      { optionName: "Option B", totalScore: 7.5 },
    ]);
    const sa = makeSensitivity([]);

    const insights = generateProactiveInsights(MINIMAL_DECISION, results, sa, 20);
    const mc = insights.find((i) => i.type === "monte-carlo-preview");

    expect(mc).toBeDefined();
    expect(mc!.headline).toContain("Option A");
    expect(mc!.headline).toContain("wins");
    expect(mc!.headline).toContain("%");
    expect(mc!.action?.target).toBe("monte-carlo-tab");
  });

  it("does NOT generate monte-carlo-preview for wide margins", () => {
    const results = makeResults([
      { optionName: "A", totalScore: 10 },
      { optionName: "B", totalScore: 5 },
    ]);
    const sa = makeSensitivity([]);

    const insights = generateProactiveInsights(MINIMAL_DECISION, results, sa, 20);
    expect(insights.find((i) => i.type === "monte-carlo-preview")).toBeUndefined();
  });

  it("caps at 4 insights maximum", () => {
    // Create scenario with many potential insights
    const results = makeResults([
      {
        optionName: "A",
        totalScore: 8.0,
        criterionScores: [
          {
            criterionId: "crit-1",
            criterionName: "X",
            rawScore: 8,
            normalizedWeight: 0.5,
            effectiveScore: 4,
            criterionType: "benefit",
          },
        ],
      },
      {
        optionName: "B",
        totalScore: 7.5,
        criterionScores: [
          {
            criterionId: "crit-1",
            criterionName: "X",
            rawScore: 7,
            normalizedWeight: 0.5,
            effectiveScore: 3.5,
            criterionType: "benefit",
          },
        ],
      },
    ]);
    const sa = makeSensitivity([makePoint({ winnerChanged: true, newWinner: "B" })]);

    const insights = generateProactiveInsights(MINIMAL_DECISION, results, sa, 20);
    expect(insights.length).toBeLessThanOrEqual(4);
  });

  it("sorts warnings before positive and info", () => {
    const results = makeResults([
      { optionName: "A", totalScore: 10 },
      { optionName: "B", totalScore: 5 },
    ]);
    const sa = makeSensitivity([makePoint({ winnerChanged: true, newWinner: "B" })]);

    const insights = generateProactiveInsights(MINIMAL_DECISION, results, sa, 20);
    const severities = insights.map((i) => i.severity);
    const warnIdx = severities.indexOf("warning");
    const posIdx = severities.indexOf("positive");
    const infoIdx = severities.indexOf("info");

    if (warnIdx >= 0 && posIdx >= 0) expect(warnIdx).toBeLessThan(posIdx);
    if (warnIdx >= 0 && infoIdx >= 0) expect(warnIdx).toBeLessThan(infoIdx);
    if (posIdx >= 0 && infoIdx >= 0) expect(posIdx).toBeLessThan(infoIdx);
  });

  it("works with DEMO_DECISION end-to-end", () => {
    const results = computeResults(DEMO_DECISION);
    const sa = sensitivityAnalysis(DEMO_DECISION, 20, results);
    const insights = generateProactiveInsights(DEMO_DECISION, results, sa, 20);

    expect(insights.length).toBeGreaterThanOrEqual(1);
    expect(insights.length).toBeLessThanOrEqual(4);

    for (const insight of insights) {
      expect(insight.headline.length).toBeGreaterThan(0);
      expect(insight.detail.length).toBeGreaterThan(0);
      expect(["positive", "warning", "info"]).toContain(insight.severity);
    }
  });
});
