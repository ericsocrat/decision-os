/**
 * Tests for decision quality assessment (issue #95).
 *
 * Covers the assessDecisionQuality pure function and the QualityBar UI.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { assessDecisionQuality, type QualityAssessment } from "@/lib/decision-quality";
import { QualityBar } from "@/components/QualityBar";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
// Test factory
// ---------------------------------------------------------------------------

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "d1",
    title: "Test Decision",
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
      { id: "o3", name: "Option C" },
    ],
    criteria: [
      { id: "c1", name: "Cost", weight: 30, type: "cost" },
      { id: "c2", name: "Quality", weight: 30, type: "benefit" },
      { id: "c3", name: "Speed", weight: 20, type: "benefit" },
      { id: "c4", name: "Risk", weight: 20, type: "cost" },
    ],
    scores: {
      o1: { c1: 3, c2: 8, c3: 6, c4: 5 },
      o2: { c1: 7, c2: 5, c3: 9, c4: 3 },
      o3: { c1: 6, c2: 7, c3: 4, c4: 8 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// assessDecisionQuality — pure logic tests (>= 10)
// ---------------------------------------------------------------------------

describe("assessDecisionQuality", () => {
  it("returns 6 indicators", () => {
    const result = assessDecisionQuality(makeDecision());
    expect(result.indicators).toHaveLength(6);
  });

  it("returns high overall score for well-formed decision", () => {
    const result = assessDecisionQuality(makeDecision());
    expect(result.overallScore).toBeGreaterThanOrEqual(80);
  });

  // --- Option count ---
  it("marks < 2 options as critical", () => {
    const result = assessDecisionQuality(
      makeDecision({ options: [{ id: "o1", name: "Only One" }] })
    );
    const ind = result.indicators.find((i) => i.id === "option-count")!;
    expect(ind.severity).toBe("critical");
    expect(ind.score).toBe(0);
  });

  it("marks 2 options as warning", () => {
    const result = assessDecisionQuality(
      makeDecision({
        options: [
          { id: "o1", name: "A" },
          { id: "o2", name: "B" },
        ],
      })
    );
    const ind = result.indicators.find((i) => i.id === "option-count")!;
    expect(ind.severity).toBe("warning");
    expect(ind.score).toBe(60);
  });

  it("marks 3+ options as good", () => {
    const result = assessDecisionQuality(makeDecision());
    const ind = result.indicators.find((i) => i.id === "option-count")!;
    expect(ind.severity).toBe("info");
    expect(ind.score).toBe(100);
  });

  // --- Criteria count ---
  it("marks < 2 criteria as critical", () => {
    const result = assessDecisionQuality(
      makeDecision({ criteria: [{ id: "c1", name: "Only", weight: 100, type: "benefit" }] })
    );
    const ind = result.indicators.find((i) => i.id === "criteria-count")!;
    expect(ind.severity).toBe("critical");
    expect(ind.score).toBe(0);
  });

  it("marks 2-3 criteria as warning", () => {
    const result = assessDecisionQuality(
      makeDecision({
        criteria: [
          { id: "c1", name: "A", weight: 50, type: "benefit" },
          { id: "c2", name: "B", weight: 50, type: "cost" },
        ],
      })
    );
    const ind = result.indicators.find((i) => i.id === "criteria-count")!;
    expect(ind.severity).toBe("warning");
  });

  // --- Weight balance ---
  it("marks > 80% single weight as critical", () => {
    const result = assessDecisionQuality(
      makeDecision({
        criteria: [
          { id: "c1", name: "Dominant", weight: 90, type: "benefit" },
          { id: "c2", name: "Minor", weight: 10, type: "cost" },
        ],
      })
    );
    const ind = result.indicators.find((i) => i.id === "weight-balance")!;
    expect(ind.severity).toBe("critical");
    expect(ind.suggestion).toContain("Dominant");
  });

  it("marks > 60% single weight as warning", () => {
    const result = assessDecisionQuality(
      makeDecision({
        criteria: [
          { id: "c1", name: "Big", weight: 70, type: "benefit" },
          { id: "c2", name: "Small", weight: 30, type: "cost" },
        ],
      })
    );
    const ind = result.indicators.find((i) => i.id === "weight-balance")!;
    expect(ind.severity).toBe("warning");
  });

  // --- Score variance ---
  it("warns when all scores within 2 points", () => {
    const result = assessDecisionQuality(
      makeDecision({
        scores: {
          o1: { c1: 5, c2: 6, c3: 5, c4: 6 },
          o2: { c1: 5, c2: 5, c3: 6, c4: 5 },
          o3: { c1: 6, c2: 5, c3: 5, c4: 6 },
        },
      })
    );
    const ind = result.indicators.find((i) => i.id === "score-variance")!;
    expect(ind.severity).toBe("warning");
    expect(ind.score).toBeLessThanOrEqual(30);
  });

  // --- Completeness ---
  it("marks missing scores as critical", () => {
    const result = assessDecisionQuality(
      makeDecision({
        scores: {
          o1: { c1: 5, c2: 6 },
          o2: { c1: 7 },
          o3: {},
        },
      })
    );
    const ind = result.indicators.find((i) => i.id === "completeness")!;
    expect(ind.severity).toBe("critical");
    expect(ind.score).toBeLessThan(100);
    expect(ind.suggestion).toContain("missing");
  });

  it("marks all scores filled as good", () => {
    const result = assessDecisionQuality(makeDecision());
    const ind = result.indicators.find((i) => i.id === "completeness")!;
    expect(ind.severity).toBe("info");
    expect(ind.score).toBe(100);
  });

  // --- Cost/benefit balance ---
  it("suggests adding cost criteria when all are benefits", () => {
    const result = assessDecisionQuality(
      makeDecision({
        criteria: [
          { id: "c1", name: "A", weight: 25, type: "benefit" },
          { id: "c2", name: "B", weight: 25, type: "benefit" },
          { id: "c3", name: "C", weight: 25, type: "benefit" },
          { id: "c4", name: "D", weight: 25, type: "benefit" },
        ],
      })
    );
    const ind = result.indicators.find((i) => i.id === "cost-benefit-balance")!;
    expect(ind.suggestion).toContain("cost criteria");
  });

  // --- Overall score ---
  it("computes overall score as average of indicator scores", () => {
    const assessment = assessDecisionQuality(makeDecision());
    const expected = Math.round(
      assessment.indicators.reduce((sum, i) => sum + i.score, 0) / assessment.indicators.length
    );
    expect(assessment.overallScore).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// QualityBar component tests (>= 4)
// ---------------------------------------------------------------------------

describe("QualityBar", () => {
  it("renders overall score badge", () => {
    const decision = makeDecision();
    render(<QualityBar decision={decision} />);
    // The score should appear as a number in the badge
    const assessment = assessDecisionQuality(decision);
    expect(screen.getByText(String(assessment.overallScore))).toBeInTheDocument();
  });

  it("renders 'Decision Quality' label", () => {
    render(<QualityBar decision={makeDecision()} />);
    expect(screen.getByText(/Decision Quality/)).toBeInTheDocument();
  });

  it("shows quality level text (Good/Fair/Needs Work)", () => {
    render(<QualityBar decision={makeDecision()} />);
    // Well-formed decision should show "Good"
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("does not show expanded indicators by default", () => {
    render(<QualityBar decision={makeDecision()} />);
    expect(screen.queryByText("Option count")).not.toBeInTheDocument();
  });

  it("expands to show indicators when clicked", async () => {
    const user = userEvent.setup();
    render(<QualityBar decision={makeDecision()} />);
    await user.click(screen.getByText(/Decision Quality/));
    expect(screen.getByText("Option count")).toBeInTheDocument();
    expect(screen.getByText("Criteria count")).toBeInTheDocument();
    expect(screen.getByText("Weight balance")).toBeInTheDocument();
    expect(screen.getByText("Score completeness")).toBeInTheDocument();
  });

  it("shows critical icon when decision has critical issues", () => {
    const poorDecision = makeDecision({
      options: [{ id: "o1", name: "Only One" }],
    });
    render(<QualityBar decision={poorDecision} />);
    expect(screen.getByLabelText("Has critical issues")).toBeInTheDocument();
  });
});
