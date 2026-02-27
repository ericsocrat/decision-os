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
