/**
 * Unit tests for the pure decision reducer.
 *
 * Tests every action type, undo/redo mechanics, and coalescing logic
 * against the pure `decisionReducer` function directly — no React rendering.
 */

import { describe, it, expect } from "vitest";
import {
  decisionReducer,
  createInitialState,
  type InternalReducerState,
  type DecisionAction,
} from "@/lib/decision-reducer";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDecision(overrides?: Partial<Decision>): Decision {
  return {
    id: "test-1",
    title: "Test Decision",
    description: "",
    options: [
      { id: "o1", name: "Option 1" },
      { id: "o2", name: "Option 2" },
    ],
    criteria: [
      { id: "c1", name: "Criterion 1", weight: 50, type: "benefit" },
      { id: "c2", name: "Criterion 2", weight: 50, type: "cost" },
    ],
    scores: {
      o1: { c1: 7, c2: 4 },
      o2: { c1: 5, c2: 8 },
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function init(decision?: Decision): InternalReducerState {
  const d = decision ?? makeDecision();
  return createInitialState(d, [d]);
}

function dispatch(state: InternalReducerState, action: DecisionAction): InternalReducerState {
  return decisionReducer(state, action);
}

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

describe("createInitialState", () => {
  it("sets provided decision and decisions", () => {
    const d = makeDecision();
    const state = createInitialState(d, [d]);
    expect(state.decision).toBe(d);
    expect(state.decisions).toEqual([d]);
  });

  it("starts with clean, empty undo/redo, not loading", () => {
    const state = init();
    expect(state.isDirty).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.swingPercent).toBe(20);
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state._coalesce).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Decision mutations
// ---------------------------------------------------------------------------

describe("Decision mutations", () => {
  it("SET_DECISION replaces the decision", () => {
    const state = init();
    const replacement = makeDecision({ id: "new-id", title: "Replaced" });
    const next = dispatch(state, { type: "SET_DECISION", decision: replacement });
    expect(next.decision.id).toBe("new-id");
    expect(next.decision.title).toBe("Replaced");
    expect(next.isDirty).toBe(true);
  });

  it("UPDATE_TITLE changes the title", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_TITLE",
      title: "New Title",
      timestamp: Date.now(),
    });
    expect(next.decision.title).toBe("New Title");
    expect(next.isDirty).toBe(true);
  });

  it("UPDATE_DESCRIPTION changes the description", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_DESCRIPTION",
      description: "New Desc",
      timestamp: Date.now(),
    });
    expect(next.decision.description).toBe("New Desc");
  });

  it("ADD_OPTION appends a new option", () => {
    const state = init();
    const next = dispatch(state, { type: "ADD_OPTION" });
    expect(next.decision.options).toHaveLength(3);
    expect(next.decision.options[2].name).toBe("Option 3");
    expect(next.decision.options[2].id).toBeTruthy();
  });

  it("UPDATE_OPTION modifies an existing option", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_OPTION",
      optionId: "o1",
      updates: { name: "Renamed" },
      timestamp: Date.now(),
    });
    expect(next.decision.options[0].name).toBe("Renamed");
    expect(next.decision.options[1].name).toBe("Option 2"); // untouched
  });

  it("REMOVE_OPTION removes option and its scores", () => {
    const state = init();
    const next = dispatch(state, { type: "REMOVE_OPTION", optionId: "o1" });
    expect(next.decision.options).toHaveLength(1);
    expect(next.decision.options[0].id).toBe("o2");
    expect(next.decision.scores["o1"]).toBeUndefined();
    expect(next.decision.scores["o2"]).toBeDefined();
  });

  it("ADD_CRITERION appends a new criterion", () => {
    const state = init();
    const next = dispatch(state, { type: "ADD_CRITERION" });
    expect(next.decision.criteria).toHaveLength(3);
    expect(next.decision.criteria[2].name).toBe("Criterion 3");
    expect(next.decision.criteria[2].weight).toBe(50);
    expect(next.decision.criteria[2].type).toBe("benefit");
  });

  it("UPDATE_CRITERION modifies an existing criterion", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_CRITERION",
      criterionId: "c1",
      updates: { name: "Updated", weight: 80 },
      timestamp: Date.now(),
    });
    expect(next.decision.criteria[0].name).toBe("Updated");
    expect(next.decision.criteria[0].weight).toBe(80);
  });

  it("REMOVE_CRITERION removes criterion and cleans scores", () => {
    const state = init();
    const next = dispatch(state, { type: "REMOVE_CRITERION", criterionId: "c1" });
    expect(next.decision.criteria).toHaveLength(1);
    expect(next.decision.criteria[0].id).toBe("c2");
    // Scores for c1 should be gone from all options
    expect(next.decision.scores["o1"]["c1"]).toBeUndefined();
    expect(next.decision.scores["o1"]["c2"]).toBe(4);
  });

  it("UPDATE_SCORE sets a numeric score (clamped 0-10)", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 9,
    });
    expect(next.decision.scores["o1"]["c1"]).toBe(9);

    // Clamping
    const clamped = dispatch(state, {
      type: "UPDATE_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 15,
    });
    expect(clamped.decision.scores["o1"]["c1"]).toBe(10);

    const clampedLow = dispatch(state, {
      type: "UPDATE_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: -5,
    });
    expect(clampedLow.decision.scores["o1"]["c1"]).toBe(0);
  });

  it("UPDATE_SCORE null clears the score", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: null,
    });
    expect(next.decision.scores["o1"]["c1"]).toBeNull();
  });

  it("UPDATE_SCORE creates option row if missing", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_SCORE",
      optionId: "o-new",
      criterionId: "c1",
      value: 5,
    });
    expect(next.decision.scores["o-new"]["c1"]).toBe(5);
  });

  it("UPDATE_CONFIDENCE sets confidence on a scored cell", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_CONFIDENCE",
      optionId: "o1",
      criterionId: "c1",
      confidence: "low",
    });
    const cell = next.decision.scores["o1"]["c1"];
    expect(cell).toEqual({ value: 7, confidence: "low" });
  });

  it("UPDATE_CONFIDENCE on unscored cell is a no-op", () => {
    const d = makeDecision({ scores: {} });
    const state = init(d);
    const next = dispatch(state, {
      type: "UPDATE_CONFIDENCE",
      optionId: "o1",
      criterionId: "c1",
      confidence: "medium",
    });
    expect(next.decision.scores).toEqual({});
  });

  it("UPDATE_SCORE preserves existing confidence", () => {
    const state = init();
    // Set confidence first
    let next = dispatch(state, {
      type: "UPDATE_CONFIDENCE",
      optionId: "o1",
      criterionId: "c1",
      confidence: "low",
    });
    // Then update score
    next = dispatch(next, { type: "UPDATE_SCORE", optionId: "o1", criterionId: "c1", value: 9 });
    expect(next.decision.scores["o1"]["c1"]).toEqual({ value: 9, confidence: "low" });
  });
});

// ---------------------------------------------------------------------------
// Navigation actions
// ---------------------------------------------------------------------------

describe("Navigation actions", () => {
  it("LOAD_DECISION replaces decision and clears history", () => {
    const state = init();
    // Build up some history
    let s = dispatch(state, { type: "ADD_OPTION" });
    expect(s.canUndo).toBe(true);

    const other = makeDecision({ id: "other", title: "Other" });
    s = dispatch(s, { type: "LOAD_DECISION", decision: other, decisions: [other] });
    expect(s.decision.id).toBe("other");
    expect(s.decisions).toEqual([other]);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
    expect(s.isDirty).toBe(false);
  });

  it("CREATE_DECISION sets new decision and clears history", () => {
    const state = init();
    let s = dispatch(state, { type: "ADD_OPTION" });
    const blank = makeDecision({ id: "blank", title: "Untitled" });
    s = dispatch(s, {
      type: "CREATE_DECISION",
      decision: blank,
      decisions: [state.decision, blank],
    });
    expect(s.decision.id).toBe("blank");
    expect(s.decisions).toHaveLength(2);
    expect(s.canUndo).toBe(false);
    expect(s.isDirty).toBe(false);
  });

  it("DELETE_DECISION updates decisions and falls back", () => {
    const d1 = makeDecision({ id: "d1" });
    const d2 = makeDecision({ id: "d2" });
    const state = createInitialState(d1, [d1, d2]);
    const next = dispatch(state, { type: "DELETE_DECISION", remaining: [d2], fallback: d2 });
    expect(next.decision.id).toBe("d2");
    expect(next.decisions).toEqual([d2]);
    expect(next.canUndo).toBe(false);
  });

  it("DELETE_DECISION with null fallback keeps current decision", () => {
    const d1 = makeDecision({ id: "d1" });
    const d2 = makeDecision({ id: "d2" });
    const state = createInitialState(d1, [d1, d2]);
    // Deleting d2 (not active) so fallback is null
    const next = dispatch(state, { type: "DELETE_DECISION", remaining: [d1], fallback: null });
    expect(next.decision.id).toBe("d1");
  });

  it("RESET_DEMO replaces everything and clears history", () => {
    const state = init();
    let s = dispatch(state, { type: "ADD_OPTION" });
    const demo = makeDecision({ id: "demo", title: "Demo" });
    s = dispatch(s, { type: "RESET_DEMO", decisions: [demo], decision: demo });
    expect(s.decision.id).toBe("demo");
    expect(s.decisions).toEqual([demo]);
    expect(s.canUndo).toBe(false);
    expect(s.isDirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UI-only actions
// ---------------------------------------------------------------------------

describe("UI-only actions", () => {
  it("SET_SWING_PERCENT updates swing value", () => {
    const state = init();
    const next = dispatch(state, { type: "SET_SWING_PERCENT", value: 35 });
    expect(next.swingPercent).toBe(35);
    expect(next.isDirty).toBe(false); // UI-only, no dirty
  });

  it("MARK_CLEAN clears dirty flag", () => {
    const state = init();
    let s = dispatch(state, { type: "ADD_OPTION" });
    expect(s.isDirty).toBe(true);
    s = dispatch(s, { type: "MARK_CLEAN" });
    expect(s.isDirty).toBe(false);
  });

  it("SET_LOADING toggles loading flag", () => {
    const state = init();
    let s = dispatch(state, { type: "SET_LOADING", loading: true });
    expect(s.isLoading).toBe(true);
    s = dispatch(s, { type: "SET_LOADING", loading: false });
    expect(s.isLoading).toBe(false);
  });

  it("REFRESH_DECISIONS replaces the decisions list", () => {
    const state = init();
    const d2 = makeDecision({ id: "d2" });
    const next = dispatch(state, { type: "REFRESH_DECISIONS", decisions: [state.decision, d2] });
    expect(next.decisions).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Undo / Redo
// ---------------------------------------------------------------------------

describe("Undo / Redo", () => {
  it("structural action pushes to undo stack", () => {
    const state = init();
    const next = dispatch(state, { type: "ADD_OPTION" });
    expect(next.canUndo).toBe(true);
    expect(next.past).toHaveLength(1);
    expect(next.past[0]).toBe(state.decision); // snapshot before mutation
  });

  it("UNDO restores previous decision", () => {
    const state = init();
    const afterAdd = dispatch(state, { type: "ADD_OPTION" });
    expect(afterAdd.decision.options).toHaveLength(3);
    const afterUndo = dispatch(afterAdd, { type: "UNDO" });
    expect(afterUndo.decision.options).toHaveLength(2);
    expect(afterUndo.canUndo).toBe(false);
    expect(afterUndo.canRedo).toBe(true);
  });

  it("REDO restores undone decision", () => {
    const state = init();
    let s = dispatch(state, { type: "ADD_OPTION" });
    s = dispatch(s, { type: "UNDO" });
    s = dispatch(s, { type: "REDO" });
    expect(s.decision.options).toHaveLength(3);
    expect(s.canRedo).toBe(false);
  });

  it("new mutation after undo clears redo stack", () => {
    const state = init();
    let s = dispatch(state, { type: "ADD_OPTION" });
    s = dispatch(s, { type: "ADD_OPTION" });
    s = dispatch(s, { type: "UNDO" });
    expect(s.canRedo).toBe(true);
    s = dispatch(s, { type: "ADD_CRITERION" });
    expect(s.canRedo).toBe(false);
    expect(s.future).toEqual([]);
  });

  it("UNDO with empty stack is a no-op", () => {
    const state = init();
    const next = dispatch(state, { type: "UNDO" });
    expect(next).toBe(state); // same reference
  });

  it("REDO with empty stack is a no-op", () => {
    const state = init();
    const next = dispatch(state, { type: "REDO" });
    expect(next).toBe(state);
  });

  it("multiple undo/redo cycles work correctly", () => {
    const state = init();
    let s = dispatch(state, { type: "ADD_OPTION" }); // 3 options
    s = dispatch(s, { type: "ADD_OPTION" }); // 4 options
    s = dispatch(s, { type: "ADD_OPTION" }); // 5 options
    expect(s.decision.options).toHaveLength(5);

    s = dispatch(s, { type: "UNDO" }); // 4
    s = dispatch(s, { type: "UNDO" }); // 3
    expect(s.decision.options).toHaveLength(3);

    s = dispatch(s, { type: "REDO" }); // 4
    expect(s.decision.options).toHaveLength(4);
  });

  it("undo stack respects MAX_UNDO (50)", () => {
    let state = init();
    for (let i = 0; i < 60; i++) {
      state = dispatch(state, { type: "ADD_OPTION" });
    }
    // Should cap at 50 entries
    expect(state.past.length).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// Undo coalescing
// ---------------------------------------------------------------------------

describe("Undo coalescing", () => {
  it("rapid title edits coalesce into one undo entry", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, { type: "UPDATE_TITLE", title: "H", timestamp: now });
    s = dispatch(s, { type: "UPDATE_TITLE", title: "He", timestamp: now + 100 });
    s = dispatch(s, { type: "UPDATE_TITLE", title: "Hel", timestamp: now + 200 });
    s = dispatch(s, { type: "UPDATE_TITLE", title: "Hello", timestamp: now + 300 });

    expect(s.decision.title).toBe("Hello");
    expect(s.past).toHaveLength(1); // Only one undo entry (the original)

    // Single undo restores original
    const undone = dispatch(s, { type: "UNDO" });
    expect(undone.decision.title).toBe("Test Decision");
    expect(undone.canUndo).toBe(false);
  });

  it("title edits after 500ms create a new undo group", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, { type: "UPDATE_TITLE", title: "First", timestamp: now });
    // 600ms later — past coalesce window
    s = dispatch(s, { type: "UPDATE_TITLE", title: "Second", timestamp: now + 600 });

    expect(s.past).toHaveLength(2); // Two undo entries
    const afterUndo1 = dispatch(s, { type: "UNDO" });
    expect(afterUndo1.decision.title).toBe("First");
    const afterUndo2 = dispatch(afterUndo1, { type: "UNDO" });
    expect(afterUndo2.decision.title).toBe("Test Decision");
  });

  it("switching from title to description starts new group", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, { type: "UPDATE_TITLE", title: "T", timestamp: now });
    s = dispatch(s, { type: "UPDATE_DESCRIPTION", description: "D", timestamp: now + 50 });

    expect(s.past).toHaveLength(2); // Different fields don't coalesce
  });

  it("structural changes never coalesce", () => {
    const state = init();
    let s = dispatch(state, { type: "ADD_OPTION" });
    s = dispatch(s, { type: "ADD_OPTION" });
    expect(s.past).toHaveLength(2);
  });

  it("option name edits to the same option coalesce", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, {
      type: "UPDATE_OPTION",
      optionId: "o1",
      updates: { name: "A" },
      timestamp: now,
    });
    s = dispatch(s, {
      type: "UPDATE_OPTION",
      optionId: "o1",
      updates: { name: "AB" },
      timestamp: now + 100,
    });
    expect(s.past).toHaveLength(1); // Coalesced
  });

  it("option name edits to different options don't coalesce", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, {
      type: "UPDATE_OPTION",
      optionId: "o1",
      updates: { name: "A" },
      timestamp: now,
    });
    s = dispatch(s, {
      type: "UPDATE_OPTION",
      optionId: "o2",
      updates: { name: "B" },
      timestamp: now + 100,
    });
    expect(s.past).toHaveLength(2); // Different targets
  });

  it("coalesced edits clear redo stack", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, { type: "UPDATE_TITLE", title: "A", timestamp: now });
    s = dispatch(s, { type: "UNDO" });
    expect(s.canRedo).toBe(true);
    // New coalescing edit should still clear redo
    s = dispatch(s, { type: "UPDATE_TITLE", title: "B", timestamp: now + 100 });
    expect(s.canRedo).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updatedAt timestamp
// ---------------------------------------------------------------------------

describe("updatedAt", () => {
  it("mutations update the updatedAt timestamp", () => {
    const state = init();
    const before = state.decision.updatedAt;
    const next = dispatch(state, { type: "ADD_OPTION" });
    expect(next.decision.updatedAt).not.toBe(before);
  });
});
