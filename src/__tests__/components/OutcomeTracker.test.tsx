/**
 * Tests for outcome tracking logic and OutcomeTracker component.
 *
 * Logic tests: CRUD operations, prediction comparison, timeline generation.
 * Component tests: rendering, interactions, journal integration.
 */

import { describe, it, expect, beforeEach } from "vitest";

// ── Logic imports ──────────────────────────────────────────────────────

import {
  recordChoice,
  recordImplementation,
  recordOutcome,
  addFollowUp,
  getOutcome,
  deleteOutcome,
  comparePrediction,
  getOutcomeTimeline,
  findPredictedScore,
} from "@/lib/outcome-tracking";
import { getEntries } from "@/lib/journal";
import type { Decision, DecisionResults } from "@/lib/types";

// ── Component imports ──────────────────────────────────────────────────

import { render, screen, fireEvent } from "@testing-library/react";
import { OutcomeTracker } from "@/components/OutcomeTracker";

// ── Test helpers ───────────────────────────────────────────────────────

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  const now = new Date().toISOString();
  return {
    id: "dec-1",
    title: "Test Decision",
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
      { id: "o3", name: "Option C" },
    ],
    criteria: [{ id: "c1", name: "Speed", weight: 50, type: "benefit" }],
    scores: { o1: { c1: 8 }, o2: { c1: 5 }, o3: { c1: 3 } },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeResults(): DecisionResults {
  return {
    decisionId: "dec-1",
    optionResults: [
      { optionId: "o1", optionName: "Option A", totalScore: 8, rank: 1, criterionScores: [] },
      { optionId: "o2", optionName: "Option B", totalScore: 5, rank: 2, criterionScores: [] },
      { optionId: "o3", optionName: "Option C", totalScore: 3, rank: 3, criterionScores: [] },
    ],
    topDrivers: [],
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ═══════════════════════════════════════════════════════════════════════
// UNIT TESTS — outcome-tracking.ts logic
// ═══════════════════════════════════════════════════════════════════════

describe("recordChoice", () => {
  it("creates an outcome record with chosen option", () => {
    const decision = makeDecision();
    const { outcome } = recordChoice(decision, "o1", 8);

    expect(outcome.decisionId).toBe("dec-1");
    expect(outcome.chosenOptionId).toBe("o1");
    expect(outcome.chosenOptionName).toBe("Option A");
    expect(outcome.decidedAt).toBeTruthy();
    expect(outcome.predictedScore).toBe(8);
  });

  it("auto-creates a journal entry of type outcome", () => {
    const decision = makeDecision();
    const { journalEntry } = recordChoice(decision, "o2");

    expect(journalEntry.type).toBe("outcome");
    expect(journalEntry.content).toContain("Option B");
    expect(journalEntry.decisionId).toBe("dec-1");
  });

  it("persists to localStorage", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const loaded = getOutcome("dec-1");
    expect(loaded).toBeDefined();
    expect(loaded!.chosenOptionId).toBe("o1");
  });
});

describe("recordImplementation", () => {
  it("sets implementation date on existing outcome", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const implDate = "2025-06-15T00:00:00.000Z";
    const updated = recordImplementation("dec-1", implDate);

    expect(updated).toBeDefined();
    expect(updated!.implementedAt).toBe(implDate);
  });

  it("returns undefined for unknown decision", () => {
    expect(recordImplementation("nonexistent", "2025-01-01")).toBeUndefined();
  });

  it("creates a journal entry", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    recordImplementation("dec-1", "2025-06-15T00:00:00.000Z");

    const entries = getEntries("dec-1", { type: "outcome" });
    // 2 entries: recordChoice + recordImplementation
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });
});

describe("recordOutcome", () => {
  it("records rating clamped to 1-10", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    recordOutcome("dec-1", 15);
    expect(getOutcome("dec-1")!.outcomeRating).toBe(10);

    recordOutcome("dec-1", -3);
    expect(getOutcome("dec-1")!.outcomeRating).toBe(1);

    recordOutcome("dec-1", 7, "Working well");
    const outcome = getOutcome("dec-1")!;
    expect(outcome.outcomeRating).toBe(7);
    expect(outcome.outcomeNotes).toBe("Working well");
  });
});

describe("addFollowUp", () => {
  it("appends follow-up check-in", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    addFollowUp("dec-1", 8, "Still happy");
    addFollowUp("dec-1", 6);

    const outcome = getOutcome("dec-1")!;
    expect(outcome.followUps).toHaveLength(2);
    expect(outcome.followUps[0].satisfaction).toBe(8);
    expect(outcome.followUps[0].notes).toBe("Still happy");
    expect(outcome.followUps[1].satisfaction).toBe(6);
  });

  it("creates a retrospective journal entry", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    addFollowUp("dec-1", 7);

    const entries = getEntries("dec-1", { type: "retrospective" });
    expect(entries).toHaveLength(1);
    expect(entries[0].content).toContain("satisfaction 7/10");
  });
});

describe("deleteOutcome", () => {
  it("removes an outcome", () => {
    recordChoice(makeDecision(), "o1");
    expect(deleteOutcome("dec-1")).toBe(true);
    expect(getOutcome("dec-1")).toBeUndefined();
  });

  it("returns false for nonexistent", () => {
    expect(deleteOutcome("nonexistent")).toBe(false);
  });
});

describe("comparePrediction", () => {
  it("computes delta and accuracy", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1", 8);
    recordOutcome("dec-1", 7);

    const comparison = comparePrediction("dec-1");
    expect(comparison).toBeDefined();
    expect(comparison!.predictedScore).toBe(8);
    expect(comparison!.actualRating).toBe(7);
    expect(comparison!.delta).toBe(-1);
    expect(comparison!.accuracy).toBe(0.9);
  });

  it("returns undefined when no outcome rating", () => {
    recordChoice(makeDecision(), "o1", 8);
    expect(comparePrediction("dec-1")).toBeUndefined();
  });

  it("returns undefined for unknown decision", () => {
    expect(comparePrediction("nonexistent")).toBeUndefined();
  });
});

describe("getOutcomeTimeline", () => {
  it("builds milestones in chronological order", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1", 8);
    recordImplementation("dec-1", new Date(Date.now() + 1000).toISOString());
    recordOutcome("dec-1", 7);
    addFollowUp("dec-1", 8);

    const timeline = getOutcomeTimeline("dec-1", decision);
    expect(timeline.length).toBeGreaterThanOrEqual(4);
    expect(timeline[0].type).toBe("decision"); // decision creation
    expect(timeline.some((m) => m.type === "implementation")).toBe(true);
    expect(timeline.some((m) => m.type === "outcome")).toBe(true);
    expect(timeline.some((m) => m.type === "follow-up")).toBe(true);
  });

  it("returns only decision creation when no outcome exists", () => {
    const decision = makeDecision();
    const timeline = getOutcomeTimeline("dec-1", decision);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].label).toBe("Decision Created");
  });
});

describe("findPredictedScore", () => {
  it("extracts total score for an option", () => {
    const results = makeResults().optionResults;
    expect(findPredictedScore("o1", results)).toBe(8);
    expect(findPredictedScore("o2", results)).toBe(5);
  });

  it("returns undefined for unknown option", () => {
    expect(findPredictedScore("nonexistent", makeResults().optionResults)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT TESTS — OutcomeTracker.tsx
// ═══════════════════════════════════════════════════════════════════════

describe("OutcomeTracker component", () => {
  it("renders option chooser when no outcome exists", () => {
    render(<OutcomeTracker decision={makeDecision()} results={makeResults()} />);

    expect(screen.getByText("Which option did you decide on?")).toBeInTheDocument();
    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByText("Option C")).toBeInTheDocument();
  });

  it("records choice when option button is clicked", () => {
    render(<OutcomeTracker decision={makeDecision()} results={makeResults()} />);

    fireEvent.click(screen.getByText("Option A"));

    // After clicking, the option chooser is replaced by the chosen badge
    expect(screen.queryByText("Which option did you decide on?")).not.toBeInTheDocument();
    expect(screen.getByText("Option A")).toBeInTheDocument(); // shown in chosen badge
  });

  it("shows implementation date input after choosing", () => {
    render(<OutcomeTracker decision={makeDecision()} results={makeResults()} />);
    fireEvent.click(screen.getByText("Option B"));

    expect(screen.getByLabelText("Implementation date")).toBeInTheDocument();
  });

  it("shows outcome rating slider after choosing", () => {
    render(<OutcomeTracker decision={makeDecision()} results={makeResults()} />);
    fireEvent.click(screen.getByText("Option A"));

    expect(screen.getByLabelText("Outcome rating")).toBeInTheDocument();
    expect(screen.getByText("Save Outcome")).toBeInTheDocument();
  });

  it("shows outcome tracker heading", () => {
    render(<OutcomeTracker decision={makeDecision()} results={makeResults()} />);
    expect(screen.getByText("Outcome Tracker")).toBeInTheDocument();
  });

  it("displays timeline after recording outcome", () => {
    const decision = makeDecision();
    // Pre-record a choice via the lib
    recordChoice(decision, "o1", 8);

    render(<OutcomeTracker decision={decision} results={makeResults()} />);

    // Timeline should be visible
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
    expect(screen.getByText("Decision Timeline")).toBeInTheDocument();
  });

  it("renders the component with aria-label", () => {
    render(<OutcomeTracker decision={makeDecision()} results={makeResults()} />);
    expect(screen.getByLabelText("Outcome Tracker")).toBeInTheDocument();
  });

  it("shows follow-up section after outcome is rated", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1", 8);
    recordOutcome("dec-1", 7);

    render(<OutcomeTracker decision={decision} results={makeResults()} />);

    expect(screen.getByTestId("follow-up")).toBeInTheDocument();
    expect(screen.getByText("Add Follow-up")).toBeInTheDocument();
  });
});
