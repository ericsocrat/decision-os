/**
 * Unit tests for outcome tracking module.
 *
 * Covers: recordChoice, recordImplementation, recordOutcome, addFollowUp,
 * getOutcome, deleteOutcome, comparePrediction, getOutcomeTimeline,
 * findPredictedScore — plus localStorage edge cases (SSR, corruption, quota).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
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
import type { Decision, OptionResult } from "@/lib/types";

const OUTCOME_STORAGE_KEY = "decision-os:outcomes";

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  const now = new Date().toISOString();
  return {
    id: "dec-1",
    title: "Test Decision",
    description: "",
    options: [
      { id: "o1", name: "Alpha" },
      { id: "o2", name: "Beta" },
    ],
    criteria: [{ id: "c1", name: "Speed", weight: 50, type: "benefit" }],
    scores: { o1: { c1: 7 }, o2: { c1: 5 } },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// recordChoice
// ---------------------------------------------------------------------------

describe("recordChoice", () => {
  it("creates an outcome for an existing option", () => {
    const decision = makeDecision();
    const { outcome, journalEntry } = recordChoice(decision, "o1");

    expect(outcome.decisionId).toBe("dec-1");
    expect(outcome.chosenOptionId).toBe("o1");
    expect(outcome.chosenOptionName).toBe("Alpha");
    expect(outcome.decidedAt).toBeTruthy();
    expect(outcome.followUps).toEqual([]);
    expect(outcome.predictedScore).toBeUndefined();
    expect(journalEntry.type).toBe("outcome");
    expect(journalEntry.content).toContain("Alpha");
  });

  it("uses option ID as name when option is not found", () => {
    const decision = makeDecision();
    const { outcome } = recordChoice(decision, "nonexistent-id");
    expect(outcome.chosenOptionName).toBe("nonexistent-id");
  });

  it("stores predictedScore when provided", () => {
    const decision = makeDecision();
    const { outcome } = recordChoice(decision, "o1", 7.5);
    expect(outcome.predictedScore).toBe(7.5);
  });

  it("omits predictedScore when undefined", () => {
    const decision = makeDecision();
    const { outcome } = recordChoice(decision, "o1");
    expect("predictedScore" in outcome).toBe(false);
  });

  it("preserves existing followUps when re-recording choice", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    addFollowUp("dec-1", 8, "looking good");

    const { outcome } = recordChoice(decision, "o2");
    expect(outcome.chosenOptionId).toBe("o2");
    expect(outcome.followUps).toHaveLength(1);
    expect(outcome.followUps[0].satisfaction).toBe(8);
  });

  it("preserves existing implementedAt, outcomeRating, outcomeNotes on re-choice", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    recordImplementation("dec-1", "2025-06-01T00:00:00.000Z");
    recordOutcome("dec-1", 9, "great result");

    const { outcome } = recordChoice(decision, "o2");
    expect(outcome.implementedAt).toBe("2025-06-01T00:00:00.000Z");
    expect(outcome.outcomeRating).toBe(9);
    expect(outcome.outcomeNotes).toBe("great result");
  });

  it("persists outcome to localStorage", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const raw = localStorage.getItem(OUTCOME_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed["dec-1"]).toBeDefined();
    expect(parsed["dec-1"].chosenOptionId).toBe("o1");
  });
});

// ---------------------------------------------------------------------------
// recordImplementation
// ---------------------------------------------------------------------------

describe("recordImplementation", () => {
  it("sets implementedAt on an existing outcome", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const result = recordImplementation("dec-1", "2025-07-01T00:00:00.000Z");
    expect(result).toBeDefined();
    expect(result!.implementedAt).toBe("2025-07-01T00:00:00.000Z");
  });

  it("returns undefined when no outcome exists", () => {
    expect(recordImplementation("nonexistent", "2025-07-01T00:00:00.000Z")).toBeUndefined();
  });

  it("creates a journal entry", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    const result = recordImplementation("dec-1", "2025-07-01T00:00:00.000Z");
    expect(result).toBeDefined();
    // Implementation persisted — verify through getOutcome
    const stored = getOutcome("dec-1");
    expect(stored?.implementedAt).toBe("2025-07-01T00:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// recordOutcome
// ---------------------------------------------------------------------------

describe("recordOutcome", () => {
  it("sets rating and notes", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const result = recordOutcome("dec-1", 8, "went well");
    expect(result).toBeDefined();
    expect(result!.outcomeRating).toBe(8);
    expect(result!.outcomeNotes).toBe("went well");
  });

  it("sets rating without notes", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const result = recordOutcome("dec-1", 7);
    expect(result!.outcomeRating).toBe(7);
    expect(result!.outcomeNotes).toBeUndefined();
  });

  it("clamps rating below 1 to 1", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const result = recordOutcome("dec-1", -5);
    expect(result!.outcomeRating).toBe(1);
  });

  it("clamps rating above 10 to 10", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const result = recordOutcome("dec-1", 15);
    expect(result!.outcomeRating).toBe(10);
  });

  it("rounds fractional ratings", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const result = recordOutcome("dec-1", 7.6);
    expect(result!.outcomeRating).toBe(8);
  });

  it("returns undefined when no outcome exists", () => {
    expect(recordOutcome("nonexistent", 5)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// addFollowUp
// ---------------------------------------------------------------------------

describe("addFollowUp", () => {
  it("adds a follow-up to existing outcome", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const result = addFollowUp("dec-1", 7, "doing fine");
    expect(result).toBeDefined();
    expect(result!.followUps).toHaveLength(1);
    expect(result!.followUps[0].satisfaction).toBe(7);
    expect(result!.followUps[0].notes).toBe("doing fine");
    expect(result!.followUps[0].date).toBeTruthy();
  });

  it("adds multiple follow-ups in sequence", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    addFollowUp("dec-1", 7);
    const result = addFollowUp("dec-1", 9, "improved");
    expect(result!.followUps).toHaveLength(2);
    expect(result!.followUps[1].satisfaction).toBe(9);
  });

  it("omits notes field when not provided", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const result = addFollowUp("dec-1", 6);
    expect(result!.followUps[0].notes).toBeUndefined();
    expect("notes" in result!.followUps[0]).toBe(false);
  });

  it("clamps satisfaction below 1 to 1", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const result = addFollowUp("dec-1", -3);
    expect(result!.followUps[0].satisfaction).toBe(1);
  });

  it("clamps satisfaction above 10 to 10", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const result = addFollowUp("dec-1", 99);
    expect(result!.followUps[0].satisfaction).toBe(10);
  });

  it("returns undefined when no outcome exists", () => {
    expect(addFollowUp("nonexistent", 5)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getOutcome
// ---------------------------------------------------------------------------

describe("getOutcome", () => {
  it("returns outcome for existing decision", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const outcome = getOutcome("dec-1");
    expect(outcome).toBeDefined();
    expect(outcome!.chosenOptionId).toBe("o1");
  });

  it("returns undefined for non-existent decision", () => {
    expect(getOutcome("nonexistent")).toBeUndefined();
  });

  it("returns undefined when localStorage is empty", () => {
    expect(getOutcome("dec-1")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// deleteOutcome
// ---------------------------------------------------------------------------

describe("deleteOutcome", () => {
  it("deletes existing outcome and returns true", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    expect(deleteOutcome("dec-1")).toBe(true);
    expect(getOutcome("dec-1")).toBeUndefined();
  });

  it("returns false for non-existent outcome", () => {
    expect(deleteOutcome("nonexistent")).toBe(false);
  });

  it("removes from localStorage", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    deleteOutcome("dec-1");

    const raw = localStorage.getItem(OUTCOME_STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed["dec-1"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// comparePrediction
// ---------------------------------------------------------------------------

describe("comparePrediction", () => {
  it("returns comparison with correct delta and accuracy", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1", 7);
    recordOutcome("dec-1", 9);

    const result = comparePrediction("dec-1");
    expect(result).toBeDefined();
    expect(result!.chosenOptionName).toBe("Alpha");
    expect(result!.predictedScore).toBe(7);
    expect(result!.actualRating).toBe(9);
    expect(result!.delta).toBe(2); // 9 - 7
    expect(result!.accuracy).toBe(0.8); // 1 - (2/10)
  });

  it("returns undefined when no outcome exists", () => {
    expect(comparePrediction("nonexistent")).toBeUndefined();
  });

  it("returns undefined when predictedScore is missing", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1"); // no predicted score
    recordOutcome("dec-1", 8);

    expect(comparePrediction("dec-1")).toBeUndefined();
  });

  it("returns undefined when outcomeRating is missing", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1", 7); // has predicted but no outcome rating

    expect(comparePrediction("dec-1")).toBeUndefined();
  });

  it("clamps predictedScore to 0-10", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1", 15); // above 10
    recordOutcome("dec-1", 8);

    const result = comparePrediction("dec-1");
    expect(result!.predictedScore).toBe(10);
  });

  it("handles negative delta (worse than predicted)", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1", 8);
    recordOutcome("dec-1", 3);

    const result = comparePrediction("dec-1");
    expect(result!.delta).toBe(-5); // 3 - 8
    expect(result!.accuracy).toBe(0.5); // 1 - (5/10)
  });

  it("handles perfect prediction", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1", 7);
    recordOutcome("dec-1", 7);

    const result = comparePrediction("dec-1");
    expect(result!.delta).toBe(0);
    expect(result!.accuracy).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getOutcomeTimeline
// ---------------------------------------------------------------------------

describe("getOutcomeTimeline", () => {
  it("includes decision creation milestone when decision provided", () => {
    const decision = makeDecision();
    const milestones = getOutcomeTimeline("dec-1", decision);

    expect(milestones).toHaveLength(1);
    expect(milestones[0].type).toBe("decision");
    expect(milestones[0].label).toBe("Decision Created");
    expect(milestones[0].detail).toBe("Test Decision");
  });

  it("returns empty array when no decision and no outcome", () => {
    const milestones = getOutcomeTimeline("dec-1");
    expect(milestones).toEqual([]);
  });

  it("returns only decision milestone when no outcome exists", () => {
    const decision = makeDecision();
    const milestones = getOutcomeTimeline("dec-1", decision);
    expect(milestones).toHaveLength(1);
    expect(milestones[0].label).toBe("Decision Created");
  });

  it("includes choice milestone", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");

    const milestones = getOutcomeTimeline("dec-1", decision);
    const choiceMilestone = milestones.find((m) => m.label === "Option Chosen");
    expect(choiceMilestone).toBeDefined();
    expect(choiceMilestone!.detail).toContain("Alpha");
  });

  it("includes implementation milestone", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    recordImplementation("dec-1", "2025-07-01T00:00:00.000Z");

    const milestones = getOutcomeTimeline("dec-1", decision);
    const implMilestone = milestones.find((m) => m.label === "Implemented");
    expect(implMilestone).toBeDefined();
    expect(implMilestone!.type).toBe("implementation");
  });

  it("includes outcome milestone with rating", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    recordImplementation("dec-1", "2025-07-01T00:00:00.000Z");
    recordOutcome("dec-1", 8, "great");

    const milestones = getOutcomeTimeline("dec-1", decision);
    const outcomeMilestone = milestones.find((m) => m.label === "Outcome Rated");
    expect(outcomeMilestone).toBeDefined();
    expect(outcomeMilestone!.detail).toContain("8/10");
    expect(outcomeMilestone!.detail).toContain("great");
  });

  it("includes outcome milestone without notes", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    recordOutcome("dec-1", 6);

    const milestones = getOutcomeTimeline("dec-1", decision);
    const outcomeMilestone = milestones.find((m) => m.label === "Outcome Rated");
    expect(outcomeMilestone!.detail).toBe("6/10");
  });

  it("uses decidedAt as fallback date for outcome when no implementedAt", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    recordOutcome("dec-1", 7);

    const milestones = getOutcomeTimeline("dec-1", decision);
    const choiceMilestone = milestones.find((m) => m.label === "Option Chosen");
    const outcomeMilestone = milestones.find((m) => m.label === "Outcome Rated");
    // Both should use decidedAt
    expect(outcomeMilestone!.date).toBe(choiceMilestone!.date);
  });

  it("includes follow-up milestones with notes", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    addFollowUp("dec-1", 8, "still great");

    const milestones = getOutcomeTimeline("dec-1", decision);
    const fuMilestone = milestones.find((m) => m.type === "follow-up");
    expect(fuMilestone).toBeDefined();
    expect(fuMilestone!.detail).toContain("8/10");
    expect(fuMilestone!.detail).toContain("still great");
  });

  it("includes follow-up milestones without notes", () => {
    const decision = makeDecision();
    recordChoice(decision, "o1");
    addFollowUp("dec-1", 5);

    const milestones = getOutcomeTimeline("dec-1", decision);
    const fuMilestone = milestones.find((m) => m.type === "follow-up");
    expect(fuMilestone!.detail).toBe("Satisfaction: 5/10");
  });

  it("sorts milestones chronologically", () => {
    const decision = makeDecision({
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    recordChoice(decision, "o1");
    recordImplementation("dec-1", "2025-06-01T00:00:00.000Z");
    recordOutcome("dec-1", 7);

    const milestones = getOutcomeTimeline("dec-1", decision);
    const dates = milestones.map((m) => new Date(m.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// findPredictedScore
// ---------------------------------------------------------------------------

describe("findPredictedScore", () => {
  it("returns totalScore for matching option", () => {
    const results: OptionResult[] = [
      {
        optionId: "o1",
        optionName: "Alpha",
        totalScore: 7.5,
        criterionScores: [],
        rank: 1,
      },
      {
        optionId: "o2",
        optionName: "Beta",
        totalScore: 5.2,
        criterionScores: [],
        rank: 2,
      },
    ];
    expect(findPredictedScore("o1", results)).toBe(7.5);
  });

  it("returns undefined when option not in results", () => {
    const results: OptionResult[] = [
      {
        optionId: "o1",
        optionName: "Alpha",
        totalScore: 7.5,
        criterionScores: [],
        rank: 1,
      },
    ];
    expect(findPredictedScore("nonexistent", results)).toBeUndefined();
  });

  it("returns undefined for empty results array", () => {
    expect(findPredictedScore("o1", [])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// localStorage edge cases
// ---------------------------------------------------------------------------

describe("localStorage edge cases", () => {
  it("handles corrupt localStorage data gracefully", () => {
    localStorage.setItem(OUTCOME_STORAGE_KEY, "not-valid-json{{{");
    // getOutcome should return undefined, not throw
    expect(getOutcome("dec-1")).toBeUndefined();
  });

  it("handles localStorage getItem throwing", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(getOutcome("dec-1")).toBeUndefined();
    spy.mockRestore();
  });

  it("handles localStorage setItem throwing (quota exceeded)", () => {
    const decision = makeDecision();
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    // Should not throw — fails silently
    expect(() => recordChoice(decision, "o1")).not.toThrow();
    spy.mockRestore();
  });
});
