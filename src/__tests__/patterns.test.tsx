import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Decision } from "@/lib/types";
import type { DecisionOutcome } from "@/lib/outcome-tracking";
import { detectPatterns } from "@/lib/patterns";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDecision(overrides: Partial<Decision> & { id: string }): Decision {
  return {
    title: "Decision " + overrides.id,
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
    ],
    criteria: [
      { id: "c1", name: "Quality", weight: 80, type: "benefit" },
      { id: "c2", name: "Cost", weight: 50, type: "cost" },
    ],
    scores: {},
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeOutcome(overrides: Partial<DecisionOutcome> & { decisionId: string }): DecisionOutcome {
  return {
    chosenOptionId: "o1",
    chosenOptionName: "Option A",
    decidedAt: "2024-01-01T00:00:00Z",
    followUps: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe("detectPatterns", () => {
  it("returns empty array when fewer than MIN_DECISIONS", () => {
    const decisions = [makeDecision({ id: "d1" }), makeDecision({ id: "d2" })];
    expect(detectPatterns(decisions)).toEqual([]);
  });

  it("returns empty array for empty decisions array", () => {
    expect(detectPatterns([])).toEqual([]);
  });

  it("detects central tendency bias when most scores are 4-6", () => {
    const midScores = {
      o1: { c1: { value: 5, confidence: "high" as const }, c2: { value: 5, confidence: "high" as const } },
      o2: { c1: { value: 5, confidence: "high" as const }, c2: { value: 5, confidence: "high" as const } },
    };

    const decisions = [
      makeDecision({ id: "d1", scores: midScores }),
      makeDecision({ id: "d2", scores: midScores }),
      makeDecision({ id: "d3", scores: midScores }),
    ];

    const patterns = detectPatterns(decisions);
    const bias = patterns.find((p) => p.title === "Central Tendency Bias");
    expect(bias).toBeDefined();
    expect(bias?.type).toBe("scoring-bias");
    expect(bias?.confidence).toBeGreaterThan(0.5);
  });

  it("does not detect central tendency when scores are spread", () => {
    const spreadScores = {
      o1: { c1: { value: 1, confidence: "high" as const }, c2: { value: 10, confidence: "high" as const } },
      o2: { c1: { value: 2, confidence: "high" as const }, c2: { value: 9, confidence: "high" as const } },
    };

    const decisions = [
      makeDecision({ id: "d1", scores: spreadScores }),
      makeDecision({ id: "d2", scores: spreadScores }),
      makeDecision({ id: "d3", scores: spreadScores }),
    ];

    const patterns = detectPatterns(decisions);
    const bias = patterns.find((p) => p.title === "Central Tendency Bias");
    expect(bias).toBeUndefined();
  });

  it("detects first-option anchoring", () => {
    const anchoredScores = {
      o1: { c1: { value: 9, confidence: "high" as const }, c2: { value: 9, confidence: "high" as const } },
      o2: { c1: { value: 3, confidence: "high" as const }, c2: { value: 3, confidence: "high" as const } },
    };

    const decisions = [
      makeDecision({ id: "d1", scores: anchoredScores }),
      makeDecision({ id: "d2", scores: anchoredScores }),
      makeDecision({ id: "d3", scores: anchoredScores }),
    ];

    const patterns = detectPatterns(decisions);
    const anchoring = patterns.find((p) => p.title === "First-Option Anchoring");
    expect(anchoring).toBeDefined();
    expect(anchoring?.type).toBe("scoring-bias");
  });

  it("detects weight preference when same criterion is always heaviest", () => {
    const decisions = [
      makeDecision({ id: "d1", criteria: [{ id: "c1", name: "Safety", weight: 100, type: "benefit" }, { id: "c2", name: "Cost", weight: 30, type: "cost" }] }),
      makeDecision({ id: "d2", criteria: [{ id: "c1", name: "Safety", weight: 90, type: "benefit" }, { id: "c2", name: "Fun", weight: 40, type: "benefit" }] }),
      makeDecision({ id: "d3", criteria: [{ id: "c1", name: "Safety", weight: 80, type: "benefit" }, { id: "c2", name: "Innovation", weight: 50, type: "benefit" }] }),
    ];

    const patterns = detectPatterns(decisions);
    const pref = patterns.find((p) => p.type === "weight-preference");
    expect(pref).toBeDefined();
    expect(pref?.description).toContain("safety");
  });

  it("detects prediction accuracy (optimism bias)", () => {
    const decisions = [
      makeDecision({ id: "d1" }),
      makeDecision({ id: "d2" }),
      makeDecision({ id: "d3" }),
    ];

    const outcomes = [
      makeOutcome({ decisionId: "d1", predictedScore: 8, outcomeRating: 4 }),
      makeOutcome({ decisionId: "d2", predictedScore: 9, outcomeRating: 5 }),
    ];

    const patterns = detectPatterns(decisions, outcomes);
    const pred = patterns.find((p) => p.type === "prediction-accuracy");
    expect(pred).toBeDefined();
    expect(pred?.title).toBe("Optimism Bias");
  });

  it("detects criterion reuse across decisions", () => {
    const decisions = [
      makeDecision({ id: "d1", criteria: [{ id: "c1", name: "Quality", weight: 50, type: "benefit" }, { id: "c2", name: "Cost", weight: 50, type: "cost" }] }),
      makeDecision({ id: "d2", criteria: [{ id: "c1", name: "Quality", weight: 60, type: "benefit" }, { id: "c2", name: "Speed", weight: 40, type: "benefit" }] }),
      makeDecision({ id: "d3", criteria: [{ id: "c1", name: "Quality", weight: 70, type: "benefit" }, { id: "c2", name: "Risk", weight: 30, type: "benefit" }] }),
    ];

    const patterns = detectPatterns(decisions);
    const reuse = patterns.find((p) => p.type === "criterion-reuse");
    expect(reuse).toBeDefined();
    expect(reuse?.description).toContain("quality");
  });

  it("includes evidence strings in patterns", () => {
    const midScores = {
      o1: { c1: { value: 5, confidence: "high" as const }, c2: { value: 5, confidence: "high" as const } },
      o2: { c1: { value: 5, confidence: "high" as const }, c2: { value: 5, confidence: "high" as const } },
    };
    const decisions = [
      makeDecision({ id: "d1", scores: midScores }),
      makeDecision({ id: "d2", scores: midScores }),
      makeDecision({ id: "d3", scores: midScores }),
    ];

    const patterns = detectPatterns(decisions);
    const bias = patterns.find((p) => p.title === "Central Tendency Bias");
    expect(bias?.evidence).toBeDefined();
    expect(bias!.evidence.length).toBeGreaterThan(0);
  });

  it("returns patterns with valid confidence between 0 and 1", () => {
    const midScores = {
      o1: { c1: { value: 5, confidence: "high" as const }, c2: { value: 5, confidence: "high" as const } },
      o2: { c1: { value: 5, confidence: "high" as const }, c2: { value: 5, confidence: "high" as const } },
    };
    const decisions = [
      makeDecision({ id: "d1", scores: midScores }),
      makeDecision({ id: "d2", scores: midScores }),
      makeDecision({ id: "d3", scores: midScores }),
    ];

    const patterns = detectPatterns(decisions);
    for (const p of patterns) {
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------

// Mock dependencies for component tests
const mockGetDecisions = vi.fn<() => Decision[]>(() => []);

vi.mock("@/lib/storage", () => ({
  getDecisions: (...args: unknown[]) => mockGetDecisions(...(args as [])),
}));

import { PatternInsights } from "@/components/PatternInsights";

describe("PatternInsights component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDecisions.mockReturnValue([]);
  });

  it("renders empty state when no patterns detected", () => {
    mockGetDecisions.mockReturnValue([makeDecision({ id: "d1" })]);
    render(<PatternInsights decision={makeDecision({ id: "d1" })} />);

    expect(screen.getByTestId("patterns-empty")).toBeInTheDocument();
    expect(screen.getByText("No Patterns Detected")).toBeInTheDocument();
  });

  it("has aria-label for accessibility", () => {
    mockGetDecisions.mockReturnValue([makeDecision({ id: "d1" })]);
    render(<PatternInsights decision={makeDecision({ id: "d1" })} />);

    expect(screen.getByRole("region", { name: "Pattern Insights" })).toBeInTheDocument();
  });

  it("renders pattern cards when patterns are detected", () => {
    const midScores = {
      o1: { c1: { value: 5, confidence: "high" as const }, c2: { value: 5, confidence: "high" as const } },
      o2: { c1: { value: 5, confidence: "high" as const }, c2: { value: 5, confidence: "high" as const } },
    };
    const decisions = [
      makeDecision({ id: "d1", scores: midScores }),
      makeDecision({ id: "d2", scores: midScores }),
      makeDecision({ id: "d3", scores: midScores }),
    ];
    mockGetDecisions.mockReturnValue(decisions);

    render(<PatternInsights decision={decisions[0]} />);

    expect(screen.getByText("Decision Patterns")).toBeInTheDocument();
    expect(screen.getAllByTestId("pattern-card").length).toBeGreaterThan(0);
  });

  it("renders the heading with pattern count badge", () => {
    const midScores = {
      o1: { c1: { value: 5, confidence: "high" as const }, c2: { value: 5, confidence: "high" as const } },
      o2: { c1: { value: 5, confidence: "high" as const }, c2: { value: 5, confidence: "high" as const } },
    };
    const decisions = [
      makeDecision({ id: "d1", scores: midScores }),
      makeDecision({ id: "d2", scores: midScores }),
      makeDecision({ id: "d3", scores: midScores }),
    ];
    mockGetDecisions.mockReturnValue(decisions);

    render(<PatternInsights decision={decisions[0]} />);

    // Should show count badge
    const patterns = detectPatterns(decisions);
    expect(screen.getByText(String(patterns.length))).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Edge-case branch coverage
// ---------------------------------------------------------------------------

describe("detectPatterns — edge cases", () => {
  it("returns empty array for exactly MIN_DECISIONS - 1 decisions", () => {
    const decisions = [makeDecision({ id: "d1" }), makeDecision({ id: "d2" })];
    expect(detectPatterns(decisions)).toEqual([]);
  });

  it("handles decisions with completely empty score matrices", () => {
    const decisions = [
      makeDecision({ id: "d1", scores: {} }),
      makeDecision({ id: "d2", scores: {} }),
      makeDecision({ id: "d3", scores: {} }),
    ];
    // Should not throw; central tendency skipped (no scores)
    const patterns = detectPatterns(decisions);
    expect(patterns).toBeInstanceOf(Array);
    expect(patterns.find((p) => p.title === "Central Tendency Bias")).toBeUndefined();
  });

  it("does not detect anchoring when fewer than MIN_DECISIONS options have 2+ options", () => {
    // Give 2 of 3 decisions only 1 option → eligible < 3
    const decisions = [
      makeDecision({ id: "d1", options: [{ id: "o1", name: "Solo" }] }),
      makeDecision({ id: "d2", options: [{ id: "o1", name: "Solo" }] }),
      makeDecision({ id: "d3" }), // has 2 options
    ];
    const patterns = detectPatterns(decisions);
    expect(patterns.find((p) => p.title === "First-Option Anchoring")).toBeUndefined();
  });

  it("does not detect anchoring when ratio is below threshold", () => {
    // First option NOT highest in 2 of 3 decisions (ratio < 0.7)
    const lowFirstScores = {
      o1: { c1: { value: 2, confidence: "high" as const }, c2: { value: 2, confidence: "high" as const } },
      o2: { c1: { value: 9, confidence: "high" as const }, c2: { value: 9, confidence: "high" as const } },
    };
    const highFirstScores = {
      o1: { c1: { value: 9, confidence: "high" as const }, c2: { value: 9, confidence: "high" as const } },
      o2: { c1: { value: 2, confidence: "high" as const }, c2: { value: 2, confidence: "high" as const } },
    };
    const decisions = [
      makeDecision({ id: "d1", scores: lowFirstScores }),
      makeDecision({ id: "d2", scores: lowFirstScores }),
      makeDecision({ id: "d3", scores: highFirstScores }),
    ];
    const patterns = detectPatterns(decisions);
    expect(patterns.find((p) => p.title === "First-Option Anchoring")).toBeUndefined();
  });

  it("skips weight preference for decisions with fewer than 2 criteria", () => {
    const decisions = [
      makeDecision({
        id: "d1",
        criteria: [{ id: "c1", name: "Solo", weight: 100, type: "benefit" }],
      }),
      makeDecision({
        id: "d2",
        criteria: [{ id: "c1", name: "Solo", weight: 100, type: "benefit" }],
      }),
      makeDecision({
        id: "d3",
        criteria: [{ id: "c1", name: "Solo", weight: 100, type: "benefit" }],
      }),
    ];
    const patterns = detectPatterns(decisions);
    expect(patterns.find((p) => p.type === "weight-preference")).toBeUndefined();
  });

  it("does not detect weight preference when leaders below threshold", () => {
    // Each decision has a DIFFERENT criterion as heaviest
    const decisions = [
      makeDecision({
        id: "d1",
        criteria: [
          { id: "c1", name: "Alpha", weight: 100, type: "benefit" },
          { id: "c2", name: "Beta", weight: 50, type: "benefit" },
        ],
      }),
      makeDecision({
        id: "d2",
        criteria: [
          { id: "c1", name: "Gamma", weight: 100, type: "benefit" },
          { id: "c2", name: "Delta", weight: 50, type: "benefit" },
        ],
      }),
      makeDecision({
        id: "d3",
        criteria: [
          { id: "c1", name: "Epsilon", weight: 100, type: "benefit" },
          { id: "c2", name: "Zeta", weight: 50, type: "benefit" },
        ],
      }),
    ];
    const patterns = detectPatterns(decisions);
    expect(patterns.find((p) => p.type === "weight-preference")).toBeUndefined();
  });

  it("detects pessimism bias when actual > predicted", () => {
    const decisions = [
      makeDecision({ id: "d1" }),
      makeDecision({ id: "d2" }),
      makeDecision({ id: "d3" }),
    ];
    const outcomes: DecisionOutcome[] = [
      makeOutcome({ decisionId: "d1", predictedScore: 3, outcomeRating: 8 }),
      makeOutcome({ decisionId: "d2", predictedScore: 4, outcomeRating: 9 }),
    ];
    const patterns = detectPatterns(decisions, outcomes);
    const pessimism = patterns.find((p) => p.title === "Pessimism Bias");
    expect(pessimism).toBeDefined();
    expect(pessimism?.description).toContain("under-predicting");
  });

  it("does not detect delta bias when average delta is within tolerance", () => {
    const decisions = [
      makeDecision({ id: "d1" }),
      makeDecision({ id: "d2" }),
      makeDecision({ id: "d3" }),
    ];
    const outcomes: DecisionOutcome[] = [
      makeOutcome({ decisionId: "d1", predictedScore: 5, outcomeRating: 5 }),
      makeOutcome({ decisionId: "d2", predictedScore: 6, outcomeRating: 6 }),
    ];
    const patterns = detectPatterns(decisions, outcomes);
    expect(patterns.find((p) => p.title === "Optimism Bias")).toBeUndefined();
    expect(patterns.find((p) => p.title === "Pessimism Bias")).toBeUndefined();
  });

  it("returns empty prediction patterns when fewer than 2 comparisons", () => {
    const decisions = [
      makeDecision({ id: "d1" }),
      makeDecision({ id: "d2" }),
      makeDecision({ id: "d3" }),
    ];
    const outcomes: DecisionOutcome[] = [
      makeOutcome({ decisionId: "d1", predictedScore: 8, outcomeRating: 4 }),
    ];
    const patterns = detectPatterns(decisions, outcomes);
    expect(patterns.find((p) => p.type === "prediction-accuracy")).toBeUndefined();
  });

  it("skips comparisons when outcome lacks predictedScore or outcomeRating", () => {
    const decisions = [
      makeDecision({ id: "d1" }),
      makeDecision({ id: "d2" }),
      makeDecision({ id: "d3" }),
    ];
    const outcomes: DecisionOutcome[] = [
      makeOutcome({ decisionId: "d1" }), // no predictedScore or outcomeRating
      makeOutcome({ decisionId: "d2", predictedScore: 5 }), // no outcomeRating
    ];
    const patterns = detectPatterns(decisions, outcomes);
    expect(patterns.find((p) => p.type === "prediction-accuracy")).toBeUndefined();
  });

  it("does not detect criterion reuse when no criterion meets threshold", () => {
    const decisions = [
      makeDecision({
        id: "d1",
        criteria: [
          { id: "c1", name: "Alpha", weight: 50, type: "benefit" },
          { id: "c2", name: "Beta", weight: 50, type: "benefit" },
        ],
      }),
      makeDecision({
        id: "d2",
        criteria: [
          { id: "c1", name: "Gamma", weight: 50, type: "benefit" },
          { id: "c2", name: "Delta", weight: 50, type: "benefit" },
        ],
      }),
      makeDecision({
        id: "d3",
        criteria: [
          { id: "c1", name: "Epsilon", weight: 50, type: "benefit" },
          { id: "c2", name: "Zeta", weight: 50, type: "benefit" },
        ],
      }),
    ];
    const patterns = detectPatterns(decisions);
    expect(patterns.find((p) => p.type === "criterion-reuse")).toBeUndefined();
  });

  it("handles isFirstOptionHighest with null optionAverage for first option", () => {
    // First option has no scored cells → firstAvg === null → isFirstOptionHighest false
    const decisions = [
      makeDecision({
        id: "d1",
        scores: {
          // o1 has no scores, o2 has scores
          o2: { c1: { value: 8, confidence: "high" as const }, c2: { value: 8, confidence: "high" as const } },
        },
      }),
      makeDecision({
        id: "d2",
        scores: {
          o2: { c1: { value: 8, confidence: "high" as const }, c2: { value: 8, confidence: "high" as const } },
        },
      }),
      makeDecision({
        id: "d3",
        scores: {
          o2: { c1: { value: 8, confidence: "high" as const }, c2: { value: 8, confidence: "high" as const } },
        },
      }),
    ];
    const patterns = detectPatterns(decisions);
    expect(patterns.find((p) => p.title === "First-Option Anchoring")).toBeUndefined();
  });

  it("detects consistent direction — conservative predictions", () => {
    const decisions = [
      makeDecision({ id: "d1" }),
      makeDecision({ id: "d2" }),
      makeDecision({ id: "d3" }),
    ];
    // Actual consistently exceeds predicted by > 1
    const outcomes: DecisionOutcome[] = [
      makeOutcome({ decisionId: "d1", predictedScore: 3, outcomeRating: 7 }),
      makeOutcome({ decisionId: "d2", predictedScore: 2, outcomeRating: 8 }),
      makeOutcome({ decisionId: "d3", predictedScore: 4, outcomeRating: 9 }),
    ];
    const patterns = detectPatterns(decisions, outcomes);
    const conservative = patterns.find(
      (p) => p.title === "Consistently Conservative Predictions",
    );
    expect(conservative).toBeDefined();
  });

  it("does not detect consistent direction when dominant < 2", () => {
    const decisions = [
      makeDecision({ id: "d1" }),
      makeDecision({ id: "d2" }),
      makeDecision({ id: "d3" }),
    ];
    // Only 1 over-prediction, 1 under-prediction — dominant < 2
    const outcomes: DecisionOutcome[] = [
      makeOutcome({ decisionId: "d1", predictedScore: 8, outcomeRating: 5 }),
      makeOutcome({ decisionId: "d2", predictedScore: 5, outcomeRating: 8 }),
    ];
    const patterns = detectPatterns(decisions, outcomes);
    const consistently = patterns.filter((p) =>
      p.title.startsWith("Consistently"),
    );
    expect(consistently).toHaveLength(0);
  });
});
