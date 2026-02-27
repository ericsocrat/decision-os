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

  // -------------------------------------------------------------------------
  // REORDER_OPTIONS
  // -------------------------------------------------------------------------

  it("REORDER_OPTIONS moves an option to a new position", () => {
    const d = makeDecision({
      options: [
        { id: "o1", name: "A" },
        { id: "o2", name: "B" },
        { id: "o3", name: "C" },
      ],
    });
    const state = init(d);
    const next = dispatch(state, { type: "REORDER_OPTIONS", fromIndex: 0, toIndex: 2 });
    expect(next.decision.options.map((o) => o.id)).toEqual(["o2", "o3", "o1"]);
    expect(next.isDirty).toBe(true);
  });

  it("REORDER_OPTIONS with same fromIndex and toIndex returns unchanged state", () => {
    const state = init();
    const next = dispatch(state, { type: "REORDER_OPTIONS", fromIndex: 1, toIndex: 1 });
    // No-op: state reference should be identical
    expect(next).toBe(state);
  });

  it("REORDER_OPTIONS with out-of-bounds index returns unchanged state", () => {
    const state = init();
    const next = dispatch(state, { type: "REORDER_OPTIONS", fromIndex: 0, toIndex: 5 });
    expect(next).toBe(state);
    const next2 = dispatch(state, { type: "REORDER_OPTIONS", fromIndex: -1, toIndex: 0 });
    expect(next2).toBe(state);
  });

  it("REORDER_OPTIONS preserves score matrix data", () => {
    const state = init();
    const next = dispatch(state, { type: "REORDER_OPTIONS", fromIndex: 0, toIndex: 1 });
    // Options reversed: [o2, o1] but score keys are by ID, unchanged
    expect(next.decision.options[0].id).toBe("o2");
    expect(next.decision.options[1].id).toBe("o1");
    expect(next.decision.scores["o1"]).toEqual({ c1: 7, c2: 4 });
    expect(next.decision.scores["o2"]).toEqual({ c1: 5, c2: 8 });
  });

  // -------------------------------------------------------------------------
  // REORDER_CRITERIA
  // -------------------------------------------------------------------------

  it("REORDER_CRITERIA moves a criterion to a new position", () => {
    const d = makeDecision({
      criteria: [
        { id: "c1", name: "X", weight: 30, type: "benefit" },
        { id: "c2", name: "Y", weight: 40, type: "cost" },
        { id: "c3", name: "Z", weight: 30, type: "benefit" },
      ],
    });
    const state = init(d);
    const next = dispatch(state, { type: "REORDER_CRITERIA", fromIndex: 2, toIndex: 0 });
    expect(next.decision.criteria.map((c) => c.id)).toEqual(["c3", "c1", "c2"]);
    expect(next.isDirty).toBe(true);
  });

  it("REORDER_CRITERIA with same index is no-op", () => {
    const state = init();
    const next = dispatch(state, { type: "REORDER_CRITERIA", fromIndex: 0, toIndex: 0 });
    expect(next).toBe(state);
  });

  it("REORDER_CRITERIA with out-of-bounds index is no-op", () => {
    const state = init();
    const next = dispatch(state, { type: "REORDER_CRITERIA", fromIndex: 0, toIndex: 10 });
    expect(next).toBe(state);
  });

  it("REORDER_CRITERIA preserves score matrix data", () => {
    const state = init();
    const next = dispatch(state, { type: "REORDER_CRITERIA", fromIndex: 1, toIndex: 0 });
    // Criteria reversed: [c2, c1]
    expect(next.decision.criteria[0].id).toBe("c2");
    expect(next.decision.criteria[1].id).toBe("c1");
    // Score matrix keyed by ID — unchanged
    expect(next.decision.scores["o1"]["c1"]).toBe(7);
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
// Version history restore action
// ---------------------------------------------------------------------------

describe("RESTORE_VERSION", () => {
  it("replaces decision with snapshot, clears history, marks dirty", () => {
    const state = init();
    // Build up some undo history
    let s = dispatch(state, { type: "ADD_OPTION" });
    expect(s.canUndo).toBe(true);

    const snapshot = makeDecision({ id: state.decision.id, title: "Restored Version" });
    s = dispatch(s, { type: "RESTORE_VERSION", decision: snapshot });

    expect(s.decision.title).toBe("Restored Version");
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
    expect(s.isDirty).toBe(true); // Marked dirty for auto-save
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
// SET_CONFIDENCE_STRATEGY (decision mutation with undo)
// ---------------------------------------------------------------------------

describe("SET_CONFIDENCE_STRATEGY", () => {
  it("sets confidenceStrategy on the decision", () => {
    const state = init();
    const next = dispatch(state, { type: "SET_CONFIDENCE_STRATEGY", strategy: "penalize" });
    expect(next.decision.confidenceStrategy).toBe("penalize");
  });

  it("marks state as dirty", () => {
    const state = init();
    const next = dispatch(state, { type: "SET_CONFIDENCE_STRATEGY", strategy: "penalize" });
    expect(next.isDirty).toBe(true);
  });

  it("creates an undo snapshot", () => {
    const state = init();
    const next = dispatch(state, { type: "SET_CONFIDENCE_STRATEGY", strategy: "penalize" });
    expect(next.canUndo).toBe(true);
  });

  it("can be undone", () => {
    const state = init();
    const s1 = dispatch(state, { type: "SET_CONFIDENCE_STRATEGY", strategy: "penalize" });
    expect(s1.decision.confidenceStrategy).toBe("penalize");
    const s2 = dispatch(s1, { type: "UNDO" });
    expect(s2.decision.confidenceStrategy).toBeUndefined();
  });

  it("switches between strategies", () => {
    const state = init();
    let s = dispatch(state, { type: "SET_CONFIDENCE_STRATEGY", strategy: "penalize" });
    s = dispatch(s, { type: "SET_CONFIDENCE_STRATEGY", strategy: "widen" });
    expect(s.decision.confidenceStrategy).toBe("widen");
    s = dispatch(s, { type: "SET_CONFIDENCE_STRATEGY", strategy: "none" });
    expect(s.decision.confidenceStrategy).toBe("none");
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

  it("UNDO restores original order after REORDER_OPTIONS", () => {
    const state = init();
    const reordered = dispatch(state, { type: "REORDER_OPTIONS", fromIndex: 0, toIndex: 1 });
    expect(reordered.decision.options[0].id).toBe("o2");
    expect(reordered.decision.options[1].id).toBe("o1");
    const undone = dispatch(reordered, { type: "UNDO" });
    expect(undone.decision.options[0].id).toBe("o1");
    expect(undone.decision.options[1].id).toBe("o2");
  });

  it("UNDO restores original order after REORDER_CRITERIA", () => {
    const state = init();
    const reordered = dispatch(state, { type: "REORDER_CRITERIA", fromIndex: 0, toIndex: 1 });
    expect(reordered.decision.criteria[0].id).toBe("c2");
    const undone = dispatch(reordered, { type: "UNDO" });
    expect(undone.decision.criteria[0].id).toBe("c1");
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

// ---------------------------------------------------------------------------
// SET_ENRICHED_SCORE
// ---------------------------------------------------------------------------

describe("SET_ENRICHED_SCORE", () => {
  it("sets score and enriched metadata", () => {
    const state = init();
    const next = dispatch(state, {
      type: "SET_ENRICHED_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 8,
      source: "market-data",
      tier: 1,
    });
    expect(next.decision.scores.o1.c1).toBe(8);
    expect(next.decision.scoreMetadata?.o1?.c1).toBeDefined();
    expect(next.decision.scoreMetadata?.o1?.c1?.provenance).toBe("enriched");
    expect(next.decision.scoreMetadata?.o1?.c1?.enrichedValue).toBe(8);
    expect(next.decision.scoreMetadata?.o1?.c1?.enrichedSource).toBe("market-data");
    expect(next.decision.scoreMetadata?.o1?.c1?.enrichedTier).toBe(1);
  });

  it("clamps value to 0-10", () => {
    const state = init();
    const next = dispatch(state, {
      type: "SET_ENRICHED_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 15,
      source: "test",
      tier: 2,
    });
    expect(next.decision.scores.o1.c1).toBe(10);
  });

  it("preserves existing confidence on the cell", () => {
    const state = init();
    // First set confidence
    let s = dispatch(state, {
      type: "UPDATE_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 5,
    });
    s = dispatch(s, {
      type: "UPDATE_CONFIDENCE",
      optionId: "o1",
      criterionId: "c1",
      confidence: "low",
    });
    // Now set enriched score — should preserve low confidence
    s = dispatch(s, {
      type: "SET_ENRICHED_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 9,
      source: "api",
      tier: 1,
    });
    const cell = s.decision.scores.o1.c1 as { value: number; confidence: string };
    expect(cell.value).toBe(9);
    expect(cell.confidence).toBe("low");
  });

  it("creates score row if option row doesn't exist", () => {
    const decision = makeDecision({ scores: {} });
    const state = init(decision);
    const next = dispatch(state, {
      type: "SET_ENRICHED_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 6,
      source: "test",
      tier: 3,
    });
    expect(next.decision.scores.o1.c1).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// RESTORE_ENRICHED_VALUE
// ---------------------------------------------------------------------------

describe("RESTORE_ENRICHED_VALUE", () => {
  it("restores enriched value from overridden metadata", () => {
    const state = init();
    // Set enriched score
    let s = dispatch(state, {
      type: "SET_ENRICHED_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 8,
      source: "api",
      tier: 1,
    });
    // Override with manual edit
    s = dispatch(s, {
      type: "UPDATE_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 3,
    });
    expect(s.decision.scores.o1.c1).toBe(3);
    expect(s.decision.scoreMetadata?.o1?.c1?.provenance).toBe("overridden");

    // Restore enriched value
    s = dispatch(s, {
      type: "RESTORE_ENRICHED_VALUE",
      optionId: "o1",
      criterionId: "c1",
    });
    expect(s.decision.scores.o1.c1).toBe(8);
    expect(s.decision.scoreMetadata?.o1?.c1?.provenance).toBe("enriched");
  });

  it("is no-op when provenance is not overridden", () => {
    const state = init();
    // Set enriched score (still enriched, not overridden)
    let s = dispatch(state, {
      type: "SET_ENRICHED_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 8,
      source: "api",
      tier: 1,
    });
    const beforeRestore = s.decision;
    s = dispatch(s, {
      type: "RESTORE_ENRICHED_VALUE",
      optionId: "o1",
      criterionId: "c1",
    });
    // Should not have changed (returns null from mutation → same state)
    expect(s.decision).toBe(beforeRestore);
    expect(s.decision.scores.o1.c1).toBe(8);
  });

  it("is no-op when no metadata exists", () => {
    const state = init();
    const next = dispatch(state, {
      type: "RESTORE_ENRICHED_VALUE",
      optionId: "o1",
      criterionId: "c1",
    });
    expect(next.decision.scores.o1.c1).toBe(7); // unchanged
  });

  it("preserves existing confidence on cell during restore", () => {
    const state = init();
    let s = dispatch(state, {
      type: "SET_ENRICHED_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 8,
      source: "api",
      tier: 1,
    });
    s = dispatch(s, {
      type: "UPDATE_CONFIDENCE",
      optionId: "o1",
      criterionId: "c1",
      confidence: "medium",
    });
    s = dispatch(s, {
      type: "UPDATE_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 2,
    });
    s = dispatch(s, {
      type: "RESTORE_ENRICHED_VALUE",
      optionId: "o1",
      criterionId: "c1",
    });
    const cell = s.decision.scores.o1.c1 as { value: number; confidence: string };
    expect(cell.value).toBe(8);
    expect(cell.confidence).toBe("medium");
  });
});

// ---------------------------------------------------------------------------
// UPDATE_REASONING
// ---------------------------------------------------------------------------

describe("UPDATE_REASONING", () => {
  it("sets reasoning text for option+criterion", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_REASONING",
      optionId: "o1",
      criterionId: "c1",
      text: "This option is fast",
      timestamp: Date.now(),
    });
    expect(next.decision.reasoning?.o1?.c1).toBe("This option is fast");
  });

  it("creates reasoning map for new option", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_REASONING",
      optionId: "o2",
      criterionId: "c2",
      text: "Expensive",
      timestamp: Date.now(),
    });
    expect(next.decision.reasoning?.o2?.c2).toBe("Expensive");
  });

  it("overwrites existing reasoning", () => {
    const decision = makeDecision({
      reasoning: { o1: { c1: "old text" } },
    });
    const state = init(decision);
    const next = dispatch(state, {
      type: "UPDATE_REASONING",
      optionId: "o1",
      criterionId: "c1",
      text: "new text",
      timestamp: Date.now(),
    });
    expect(next.decision.reasoning?.o1?.c1).toBe("new text");
  });

  it("handles decision with no existing reasoning", () => {
    const decision = makeDecision();
    delete (decision as unknown as Record<string, unknown>).reasoning;
    const state = init(decision);
    const next = dispatch(state, {
      type: "UPDATE_REASONING",
      optionId: "o1",
      criterionId: "c1",
      text: "first note",
      timestamp: Date.now(),
    });
    expect(next.decision.reasoning?.o1?.c1).toBe("first note");
  });
});

// ---------------------------------------------------------------------------
// REMOVE_OPTION — extended
// ---------------------------------------------------------------------------

describe("REMOVE_OPTION — extended cleanup", () => {
  it("removes reasoning for the option", () => {
    const decision = makeDecision({
      reasoning: { o1: { c1: "note 1" }, o2: { c2: "note 2" } },
    });
    const state = init(decision);
    const next = dispatch(state, { type: "REMOVE_OPTION", optionId: "o1" });
    expect(next.decision.reasoning?.o1).toBeUndefined();
    expect(next.decision.reasoning?.o2).toBeDefined();
  });

  it("removes scoreMetadata for the option", () => {
    const state = init();
    let s = dispatch(state, {
      type: "SET_ENRICHED_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 8,
      source: "api",
      tier: 1,
    });
    s = dispatch(s, { type: "REMOVE_OPTION", optionId: "o1" });
    expect(s.decision.scoreMetadata?.o1).toBeUndefined();
  });

  it("handles undefined reasoning gracefully", () => {
    const decision = makeDecision();
    delete (decision as unknown as Record<string, unknown>).reasoning;
    const state = init(decision);
    const next = dispatch(state, { type: "REMOVE_OPTION", optionId: "o1" });
    expect(next.decision.options).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// REMOVE_CRITERION — extended
// ---------------------------------------------------------------------------

describe("REMOVE_CRITERION — extended cleanup", () => {
  it("removes reasoning for the criterion across all options", () => {
    const decision = makeDecision({
      reasoning: {
        o1: { c1: "note 1", c2: "note 2" },
        o2: { c1: "note 3", c2: "note 4" },
      },
    });
    const state = init(decision);
    const next = dispatch(state, { type: "REMOVE_CRITERION", criterionId: "c1" });
    expect(next.decision.reasoning?.o1?.c1).toBeUndefined();
    expect(next.decision.reasoning?.o1?.c2).toBe("note 2");
    expect(next.decision.reasoning?.o2?.c1).toBeUndefined();
    expect(next.decision.reasoning?.o2?.c2).toBe("note 4");
  });

  it("removes scoreMetadata for the criterion", () => {
    const state = init();
    let s = dispatch(state, {
      type: "SET_ENRICHED_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 8,
      source: "api",
      tier: 1,
    });
    s = dispatch(s, { type: "REMOVE_CRITERION", criterionId: "c1" });
    expect(s.decision.scoreMetadata?.o1?.c1).toBeUndefined();
  });

  it("handles undefined reasoning gracefully", () => {
    const decision = makeDecision();
    delete (decision as unknown as Record<string, unknown>).reasoning;
    const state = init(decision);
    const next = dispatch(state, { type: "REMOVE_CRITERION", criterionId: "c1" });
    expect(next.decision.criteria).toHaveLength(1);
    expect(next.decision.criteria[0].id).toBe("c2");
  });
});

// ---------------------------------------------------------------------------
// UPDATE_SCORE — provenance override
// ---------------------------------------------------------------------------

describe("UPDATE_SCORE — provenance tracking", () => {
  it("marks enriched metadata as overridden on manual edit", () => {
    const state = init();
    let s = dispatch(state, {
      type: "SET_ENRICHED_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 8,
      source: "api",
      tier: 1,
    });
    expect(s.decision.scoreMetadata?.o1?.c1?.provenance).toBe("enriched");

    s = dispatch(s, {
      type: "UPDATE_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 3,
    });
    expect(s.decision.scoreMetadata?.o1?.c1?.provenance).toBe("overridden");
    expect(s.decision.scoreMetadata?.o1?.c1?.enrichedValue).toBe(8);
  });

  it("does not modify metadata when no enriched provenance exists", () => {
    const state = init();
    const next = dispatch(state, {
      type: "UPDATE_SCORE",
      optionId: "o1",
      criterionId: "c1",
      value: 5,
    });
    // No metadata should be created
    expect(next.decision.scoreMetadata?.o1?.c1).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Coalescing — additional branches
// ---------------------------------------------------------------------------

describe("Undo coalescing — additional branches", () => {
  it("criterion name-only edits coalesce", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, {
      type: "UPDATE_CRITERION",
      criterionId: "c1",
      updates: { name: "Speed" },
      timestamp: now,
    });
    s = dispatch(s, {
      type: "UPDATE_CRITERION",
      criterionId: "c1",
      updates: { name: "Speed v2" },
      timestamp: now + 100,
    });
    expect(s.past).toHaveLength(1); // coalesced
  });

  it("criterion non-name update is structural (no coalesce)", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, {
      type: "UPDATE_CRITERION",
      criterionId: "c1",
      updates: { name: "Speed" },
      timestamp: now,
    });
    s = dispatch(s, {
      type: "UPDATE_CRITERION",
      criterionId: "c1",
      updates: { weight: 80 },
      timestamp: now + 100,
    });
    expect(s.past).toHaveLength(2); // not coalesced — structural
  });

  it("UPDATE_OPTION with non-name updates is structural", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, {
      type: "UPDATE_OPTION",
      optionId: "o1",
      updates: { name: "Alpha" },
      timestamp: now,
    });
    s = dispatch(s, {
      type: "UPDATE_OPTION",
      optionId: "o1",
      updates: { description: "desc" },
      timestamp: now + 100,
    });
    expect(s.past).toHaveLength(2); // structural, not coalesced
  });

  it("rapid reasoning edits to the same cell coalesce", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, {
      type: "UPDATE_REASONING",
      optionId: "o1",
      criterionId: "c1",
      text: "first",
      timestamp: now,
    });
    s = dispatch(s, {
      type: "UPDATE_REASONING",
      optionId: "o1",
      criterionId: "c1",
      text: "first draft",
      timestamp: now + 100,
    });
    expect(s.past).toHaveLength(1); // coalesced
    expect(s.decision.reasoning?.o1?.c1).toBe("first draft");
  });

  it("reasoning edits to different cells don't coalesce", () => {
    const state = init();
    const now = Date.now();
    let s = dispatch(state, {
      type: "UPDATE_REASONING",
      optionId: "o1",
      criterionId: "c1",
      text: "note 1",
      timestamp: now,
    });
    s = dispatch(s, {
      type: "UPDATE_REASONING",
      optionId: "o1",
      criterionId: "c2",
      text: "note 2",
      timestamp: now + 100,
    });
    expect(s.past).toHaveLength(2); // different cells
  });
});
