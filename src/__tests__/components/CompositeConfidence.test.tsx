import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  computeCompositeConfidence,
  computeScoreConfidence,
  computeStructuralQuality,
  classifyLevel,
  DEFAULT_WEIGHTS,
  type ConfidenceWeights,
} from "@/lib/composite-confidence";
import { assessDecisionQuality } from "@/lib/decision-quality";
import { computeConsensus } from "@/lib/consensus";
import { CompositeConfidenceIndicator } from "@/components/CompositeConfidenceIndicator";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function makeDecision(
  options: { id: string; name: string }[],
  criteria: {
    id: string;
    name: string;
    weight: number;
    type: "benefit" | "cost";
  }[],
  scores: Record<
    string,
    Record<string, number | { value: number; confidence: "high" | "medium" | "low" }>
  >
): Decision {
  return {
    id: "test",
    title: "Test",
    options,
    criteria,
    scores,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function simpleDecision(): Decision {
  return makeDecision(
    [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
      { id: "c", name: "Gamma" },
    ],
    [
      { id: "c1", name: "Quality", weight: 60, type: "benefit" },
      { id: "c2", name: "Speed", weight: 40, type: "benefit" },
    ],
    {
      a: { c1: 9, c2: 5 },
      b: { c1: 6, c2: 8 },
      c: { c1: 4, c2: 3 },
    }
  );
}

function lowConfidenceDecision(): Decision {
  return makeDecision(
    [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ],
    [{ id: "c1", name: "Q", weight: 100, type: "benefit" }],
    {
      a: { c1: { value: 7, confidence: "low" } },
      b: { c1: { value: 5, confidence: "low" } },
    }
  );
}

function mixedConfidenceDecision(): Decision {
  return makeDecision(
    [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ],
    [
      { id: "c1", name: "Q", weight: 50, type: "benefit" },
      { id: "c2", name: "S", weight: 50, type: "benefit" },
    ],
    {
      a: { c1: { value: 9, confidence: "high" }, c2: { value: 5, confidence: "low" } },
      b: { c1: { value: 6, confidence: "medium" }, c2: { value: 8, confidence: "high" } },
    }
  );
}

function dominantDecision(): Decision {
  return makeDecision(
    [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
      { id: "c", name: "Gamma" },
    ],
    [
      { id: "c1", name: "Quality", weight: 50, type: "benefit" },
      { id: "c2", name: "Speed", weight: 50, type: "benefit" },
    ],
    {
      a: { c1: 10, c2: 10 },
      b: { c1: 5, c2: 5 },
      c: { c1: 2, c2: 2 },
    }
  );
}

// ---------------------------------------------------------------------------
//  Unit tests — computeScoreConfidence
// ---------------------------------------------------------------------------

describe("computeScoreConfidence", () => {
  it("returns 1.0 for all plain numeric scores (implicit high)", () => {
    expect(computeScoreConfidence(simpleDecision())).toBe(1.0);
  });

  it("returns 0.4 for all low-confidence scores", () => {
    expect(computeScoreConfidence(lowConfidenceDecision())).toBeCloseTo(0.4, 5);
  });

  it("returns a value between 0.4 and 1.0 for mixed confidence", () => {
    const conf = computeScoreConfidence(mixedConfidenceDecision());
    expect(conf).toBeGreaterThan(0.4);
    expect(conf).toBeLessThan(1.0);
  });

  it("returns 1.0 for decision with no scores", () => {
    const d = makeDecision(
      [{ id: "a", name: "A" }],
      [{ id: "c1", name: "Q", weight: 100, type: "benefit" }],
      {}
    );
    expect(computeScoreConfidence(d)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
//  Unit tests — computeStructuralQuality
// ---------------------------------------------------------------------------

describe("computeStructuralQuality", () => {
  it("maps quality overall score to 0–1", () => {
    const quality = assessDecisionQuality(simpleDecision());
    const result = computeStructuralQuality(quality);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("returns 1 for a perfect quality score", () => {
    expect(computeStructuralQuality({ indicators: [], overallScore: 100 })).toBe(1);
  });

  it("returns 0 for zero quality score", () => {
    expect(computeStructuralQuality({ indicators: [], overallScore: 0 })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
//  Unit tests — classifyLevel
// ---------------------------------------------------------------------------

describe("classifyLevel", () => {
  it("classifies >= 0.7 as high", () => {
    expect(classifyLevel(0.7)).toBe("high");
    expect(classifyLevel(1.0)).toBe("high");
  });

  it("classifies 0.4–0.69 as moderate", () => {
    expect(classifyLevel(0.4)).toBe("moderate");
    expect(classifyLevel(0.69)).toBe("moderate");
  });

  it("classifies < 0.4 as low", () => {
    expect(classifyLevel(0.39)).toBe("low");
    expect(classifyLevel(0)).toBe("low");
  });
});

// ---------------------------------------------------------------------------
//  Unit tests — computeCompositeConfidence
// ---------------------------------------------------------------------------

describe("computeCompositeConfidence", () => {
  it("returns a result with composite between 0 and 1", () => {
    const result = computeCompositeConfidence(simpleDecision());
    expect(result.breakdown.composite).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.composite).toBeLessThanOrEqual(1);
  });

  it("uses DEFAULT_WEIGHTS when none provided", () => {
    const result = computeCompositeConfidence(simpleDecision());
    expect(result.weights).toEqual(DEFAULT_WEIGHTS);
  });

  it("accepts custom weights", () => {
    const custom: ConfidenceWeights = {
      algorithmAgreement: 0.25,
      scoreConfidence: 0.25,
      dataConfidence: 0.25,
      structuralQuality: 0.25,
    };
    const result = computeCompositeConfidence(simpleDecision(), null, null, 0, custom);
    expect(result.weights).toEqual(custom);
  });

  it("uses provided consensus result instead of recomputing", () => {
    const consensus = computeConsensus(simpleDecision());
    const result = computeCompositeConfidence(simpleDecision(), consensus);
    expect(result.breakdown.algorithmAgreement).toBe(consensus.overallAgreement);
  });

  it("produces high level for dominant decision", () => {
    const result = computeCompositeConfidence(dominantDecision());
    // Dominant: agreement = 1.0, scores all numeric (1.0 confidence)
    expect(result.level).toBe("high");
  });

  it("includes a label and suggestion", () => {
    const result = computeCompositeConfidence(simpleDecision());
    expect(result.label.length).toBeGreaterThan(5);
    expect(result.suggestion.length).toBeGreaterThan(5);
  });

  it("data confidence defaults to 0 when not provided", () => {
    const result = computeCompositeConfidence(simpleDecision());
    expect(result.breakdown.dataConfidence).toBe(0);
  });

  it("includes data confidence when provided", () => {
    const result = computeCompositeConfidence(simpleDecision(), null, null, 0.8);
    expect(result.breakdown.dataConfidence).toBe(0.8);
    // Composite should be higher with data confidence
    const resultNoData = computeCompositeConfidence(simpleDecision(), null, null, 0);
    expect(result.breakdown.composite).toBeGreaterThan(resultNoData.breakdown.composite);
  });

  it("lower score confidence reduces composite", () => {
    const highConf = computeCompositeConfidence(simpleDecision());
    const lowConf = computeCompositeConfidence(lowConfidenceDecision());
    expect(lowConf.breakdown.scoreConfidence).toBeLessThan(highConf.breakdown.scoreConfidence);
  });

  it("handles single-option decision gracefully", () => {
    const d = makeDecision(
      [{ id: "a", name: "Solo" }],
      [{ id: "c1", name: "Q", weight: 100, type: "benefit" }],
      { a: { c1: 8 } }
    );
    const result = computeCompositeConfidence(d);
    expect(result.breakdown.composite).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.composite).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
//  Component tests — CompositeConfidenceIndicator
// ---------------------------------------------------------------------------

describe("CompositeConfidenceIndicator — component", () => {
  it("renders the confidence indicator", () => {
    render(<CompositeConfidenceIndicator decision={simpleDecision()} />);
    expect(screen.getByTestId("composite-confidence")).toBeDefined();
  });

  it("shows confidence label", () => {
    render(<CompositeConfidenceIndicator decision={simpleDecision()} />);
    const label = screen.getByTestId("confidence-label");
    expect(label).toBeDefined();
    expect(label.textContent!.length).toBeGreaterThan(5);
  });

  it("shows confidence score as percentage", () => {
    render(<CompositeConfidenceIndicator decision={simpleDecision()} />);
    const score = screen.getByTestId("confidence-score");
    expect(score).toBeDefined();
    expect(score.textContent).toMatch(/\d+%/);
  });

  it("shows suggestion text", () => {
    render(<CompositeConfidenceIndicator decision={simpleDecision()} />);
    const suggestion = screen.getByTestId("confidence-suggestion");
    expect(suggestion).toBeDefined();
    expect(suggestion.textContent!.length).toBeGreaterThan(10);
  });

  it("toggles breakdown details", async () => {
    const user = userEvent.setup();
    render(<CompositeConfidenceIndicator decision={simpleDecision()} />);

    // Initially hidden
    expect(screen.queryByTestId("confidence-breakdown")).toBeNull();

    // Show
    await user.click(screen.getByTestId("toggle-breakdown"));
    const breakdown = screen.getByTestId("confidence-breakdown");
    expect(breakdown).toBeDefined();

    // Should show all 4 signals
    expect(breakdown.textContent).toContain("Algorithm agreement");
    expect(breakdown.textContent).toContain("Score confidence");
    expect(breakdown.textContent).toContain("Data confidence");
    expect(breakdown.textContent).toContain("Structural quality");

    // Has progress bars
    const progressBars = within(breakdown).getAllByRole("progressbar");
    expect(progressBars.length).toBe(4);

    // Hide
    await user.click(screen.getByTestId("toggle-breakdown"));
    expect(screen.queryByTestId("confidence-breakdown")).toBeNull();
  });

  it("uses pre-computed consensus when provided", () => {
    const d = simpleDecision();
    const consensus = computeConsensus(d);
    render(<CompositeConfidenceIndicator decision={d} consensus={consensus} />);
    expect(screen.getByTestId("composite-confidence")).toBeDefined();
  });

  it("renders different styles for high vs low confidence", () => {
    const { unmount } = render(<CompositeConfidenceIndicator decision={dominantDecision()} />);
    const highContainer = screen.getByTestId("composite-confidence");
    const highClasses = highContainer.className;
    unmount();

    render(<CompositeConfidenceIndicator decision={lowConfidenceDecision()} />);
    const lowContainer = screen.getByTestId("composite-confidence");
    const lowClasses = lowContainer.className;

    // Classes should differ (different border/bg colors)
    expect(highClasses).not.toBe(lowClasses);
  });
});
