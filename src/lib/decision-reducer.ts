/**
 * Decision OS — Pure Reducer & Typed Actions
 *
 * Implements the state management core as a pure, testable function.
 * No side effects, no async, no external calls.
 *
 * Architecture:
 *   DecisionAction → undoableReducer → ReducerState
 *
 * The outer undoable wrapper handles undo/redo/coalescing around
 * the inner `coreReducer` which handles decision mutations.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/77
 */

import type {
  Confidence,
  ConfidenceStrategy,
  Criterion,
  Decision,
  Option,
  ScoreMatrix,
  ScoreMetadataMatrix,
  ScoreValue,
} from "./types";
import { generateId } from "./utils";
import { resolveScoreValue } from "./scoring";
import {
  createEnrichedMetadata,
  createOverrideMetadata,
  setMetadataCell,
  removeOptionMetadata,
  removeCriterionMetadata,
} from "./provenance";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface ReducerState {
  /** Current active decision */
  decision: Decision;
  /** All saved decisions (sidebar list) */
  decisions: Decision[];
  /** Whether unsaved changes exist */
  isDirty: boolean;
  /** Loading skeleton flag */
  isLoading: boolean;
  /** Sensitivity swing percent slider */
  swingPercent: number;
  /** Undo stack (decision snapshots) */
  past: Decision[];
  /** Redo stack */
  future: Decision[];
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

/** Maximum undo history depth */
const MAX_UNDO = 50;

/** Milliseconds within which text edits to the same field coalesce */
const COALESCE_MS = 500;

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Discriminated union of all state actions.
 * Exhaustive switch + `never` in the default case ensures type safety.
 */
export type DecisionAction =
  // Decision-level CRUD
  | { type: "SET_DECISION"; decision: Decision }
  | { type: "LOAD_DECISION"; decision: Decision; decisions: Decision[] }
  | { type: "CREATE_DECISION"; decision: Decision; decisions: Decision[] }
  | { type: "DELETE_DECISION"; remaining: Decision[]; fallback: Decision | null }
  | { type: "RESET_DEMO"; decisions: Decision[]; decision: Decision }

  // Field updates (text-coalesced undo)
  | { type: "UPDATE_TITLE"; title: string; timestamp: number }
  | { type: "UPDATE_DESCRIPTION"; description: string; timestamp: number }

  // Options
  | { type: "ADD_OPTION" }
  | { type: "UPDATE_OPTION"; optionId: string; updates: Partial<Option>; timestamp: number }
  | { type: "REMOVE_OPTION"; optionId: string }
  | { type: "REORDER_OPTIONS"; fromIndex: number; toIndex: number }

  // Criteria
  | { type: "ADD_CRITERION" }
  | {
      type: "UPDATE_CRITERION";
      criterionId: string;
      updates: Partial<Criterion>;
      timestamp: number;
    }
  | { type: "REMOVE_CRITERION"; criterionId: string }
  | { type: "REORDER_CRITERIA"; fromIndex: number; toIndex: number }

  // Scores
  | { type: "UPDATE_SCORE"; optionId: string; criterionId: string; value: number | null }
  | { type: "UPDATE_CONFIDENCE"; optionId: string; criterionId: string; confidence: Confidence }

  // Score provenance
  | {
      type: "SET_ENRICHED_SCORE";
      optionId: string;
      criterionId: string;
      value: number;
      source: string;
      tier: 1 | 2 | 3;
    }
  | { type: "RESTORE_ENRICHED_VALUE"; optionId: string; criterionId: string }

  // Reasoning
  | {
      type: "UPDATE_REASONING";
      optionId: string;
      criterionId: string;
      text: string;
      timestamp: number;
    }

  // Undo / Redo
  | { type: "UNDO" }
  | { type: "REDO" }

  // UI state
  | { type: "SET_SWING_PERCENT"; value: number }
  | { type: "SET_CONFIDENCE_STRATEGY"; strategy: ConfidenceStrategy }
  | { type: "MARK_CLEAN" }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "REFRESH_DECISIONS"; decisions: Decision[] };

// ---------------------------------------------------------------------------
// Coalesce metadata (used by undo middleware)
// ---------------------------------------------------------------------------

interface CoalesceMeta {
  type: "text" | "structural";
  field?: string;
  timestamp: number;
}

/** State augmented with coalesce tracking (internal — not exposed to consumers) */
export interface InternalReducerState extends ReducerState {
  _coalesce: CoalesceMeta | null;
}

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

export function createInitialState(
  decision: Decision,
  decisions: Decision[]
): InternalReducerState {
  return {
    decision,
    decisions,
    isDirty: false,
    isLoading: false,
    swingPercent: 20,
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,
    _coalesce: null,
  };
}

// ---------------------------------------------------------------------------
// Core decision reducer (pure — no undo logic)
// ---------------------------------------------------------------------------

function stampNow(d: Decision): Decision {
  return { ...d, updatedAt: new Date().toISOString() };
}

/**
 * Apply a decision mutation, returning the new Decision.
 * Returns `null` if the action isn't a decision-mutating action.
 */
function applyDecisionMutation(decision: Decision, action: DecisionAction): Decision | null {
  switch (action.type) {
    case "SET_DECISION":
      return stampNow(action.decision);

    case "UPDATE_TITLE":
      return stampNow({ ...decision, title: action.title });

    case "UPDATE_DESCRIPTION":
      return stampNow({ ...decision, description: action.description });

    case "ADD_OPTION": {
      const newOpt: Option = {
        id: generateId(),
        name: `Option ${decision.options.length + 1}`,
      };
      return stampNow({ ...decision, options: [...decision.options, newOpt] });
    }

    case "UPDATE_OPTION":
      return stampNow({
        ...decision,
        options: decision.options.map((o) =>
          o.id === action.optionId ? { ...o, ...action.updates } : o
        ),
      });

    case "REMOVE_OPTION": {
      const newScores = { ...decision.scores };
      delete newScores[action.optionId];
      const newReasoning = { ...(decision.reasoning ?? {}) };
      delete newReasoning[action.optionId];
      return stampNow({
        ...decision,
        options: decision.options.filter((o) => o.id !== action.optionId),
        scores: newScores,
        reasoning: newReasoning,
        scoreMetadata: removeOptionMetadata(decision.scoreMetadata, action.optionId),
      });
    }

    case "REORDER_OPTIONS": {
      if (
        action.fromIndex === action.toIndex ||
        action.fromIndex < 0 ||
        action.toIndex < 0 ||
        action.fromIndex >= decision.options.length ||
        action.toIndex >= decision.options.length
      ) {
        return null;
      }
      const newOptions = [...decision.options];
      const [moved] = newOptions.splice(action.fromIndex, 1);
      newOptions.splice(action.toIndex, 0, moved);
      return stampNow({ ...decision, options: newOptions });
    }

    case "ADD_CRITERION": {
      const newCrit: Criterion = {
        id: generateId(),
        name: `Criterion ${decision.criteria.length + 1}`,
        weight: 50,
        type: "benefit",
      };
      return stampNow({ ...decision, criteria: [...decision.criteria, newCrit] });
    }

    case "UPDATE_CRITERION":
      return stampNow({
        ...decision,
        criteria: decision.criteria.map((c) =>
          c.id === action.criterionId ? { ...c, ...action.updates } : c
        ),
      });

    case "REMOVE_CRITERION": {
      const newScores: ScoreMatrix = {};
      for (const optId of Object.keys(decision.scores)) {
        const optScores = { ...decision.scores[optId] };
        delete optScores[action.criterionId];
        newScores[optId] = optScores;
      }
      const newReasoning: Record<string, Record<string, string>> = {};
      for (const optId of Object.keys(decision.reasoning ?? {})) {
        const optReasoning = { ...(decision.reasoning![optId] ?? {}) };
        delete optReasoning[action.criterionId];
        newReasoning[optId] = optReasoning;
      }
      return stampNow({
        ...decision,
        criteria: decision.criteria.filter((c) => c.id !== action.criterionId),
        scores: newScores,
        reasoning: newReasoning,
        scoreMetadata: removeCriterionMetadata(decision.scoreMetadata, action.criterionId),
      });
    }

    case "REORDER_CRITERIA": {
      if (
        action.fromIndex === action.toIndex ||
        action.fromIndex < 0 ||
        action.toIndex < 0 ||
        action.fromIndex >= decision.criteria.length ||
        action.toIndex >= decision.criteria.length
      ) {
        return null;
      }
      const newCriteria = [...decision.criteria];
      const [moved] = newCriteria.splice(action.fromIndex, 1);
      newCriteria.splice(action.toIndex, 0, moved);
      return stampNow({ ...decision, criteria: newCriteria });
    }

    case "UPDATE_SCORE": {
      const newScores = { ...decision.scores };
      if (!newScores[action.optionId]) newScores[action.optionId] = {};
      if (action.value === null) {
        newScores[action.optionId] = {
          ...newScores[action.optionId],
          [action.criterionId]: null,
        };
      } else {
        const clamped = Math.max(0, Math.min(10, Math.round(action.value)));
        const existing = newScores[action.optionId]?.[action.criterionId];
        const existingConf =
          typeof existing === "object" && existing !== null && "confidence" in existing
            ? (existing as { value: number; confidence: Confidence }).confidence
            : undefined;
        newScores[action.optionId] = {
          ...newScores[action.optionId],
          [action.criterionId]: existingConf
            ? { value: clamped, confidence: existingConf }
            : clamped,
        };
      }
      // Track provenance: if previous was enriched, mark as overridden
      let newMetadata: ScoreMetadataMatrix | undefined = decision.scoreMetadata;
      const existingMeta = decision.scoreMetadata?.[action.optionId]?.[action.criterionId];
      if (existingMeta?.provenance === "enriched") {
        newMetadata = setMetadataCell(
          newMetadata,
          action.optionId,
          action.criterionId,
          createOverrideMetadata(existingMeta)
        );
      }
      return stampNow({ ...decision, scores: newScores, scoreMetadata: newMetadata });
    }

    case "SET_ENRICHED_SCORE": {
      const newScores = { ...decision.scores };
      if (!newScores[action.optionId]) newScores[action.optionId] = {};
      const clamped = Math.max(0, Math.min(10, Math.round(action.value)));
      const existing = newScores[action.optionId]?.[action.criterionId];
      const existingConf =
        typeof existing === "object" && existing !== null && "confidence" in existing
          ? (existing as { value: number; confidence: Confidence }).confidence
          : undefined;
      newScores[action.optionId] = {
        ...newScores[action.optionId],
        [action.criterionId]: existingConf ? { value: clamped, confidence: existingConf } : clamped,
      };
      const newMetadata = setMetadataCell(
        decision.scoreMetadata,
        action.optionId,
        action.criterionId,
        createEnrichedMetadata(clamped, action.source, action.tier)
      );
      return stampNow({ ...decision, scores: newScores, scoreMetadata: newMetadata });
    }

    case "RESTORE_ENRICHED_VALUE": {
      const meta = decision.scoreMetadata?.[action.optionId]?.[action.criterionId];
      if (meta?.provenance !== "overridden" || meta.enrichedValue === undefined) {
        return null; // Nothing to restore
      }
      const value = Math.max(0, Math.min(10, Math.round(meta.enrichedValue)));
      const newScores = { ...decision.scores };
      if (!newScores[action.optionId]) newScores[action.optionId] = {};
      const existing = newScores[action.optionId]?.[action.criterionId];
      const existingConf =
        typeof existing === "object" && existing !== null && "confidence" in existing
          ? (existing as { value: number; confidence: Confidence }).confidence
          : undefined;
      newScores[action.optionId] = {
        ...newScores[action.optionId],
        [action.criterionId]: existingConf ? { value, confidence: existingConf } : value,
      };
      // Restore to enriched provenance
      const newMetadata = setMetadataCell(
        decision.scoreMetadata,
        action.optionId,
        action.criterionId,
        createEnrichedMetadata(value, meta.enrichedSource ?? "", meta.enrichedTier ?? 2)
      );
      return stampNow({ ...decision, scores: newScores, scoreMetadata: newMetadata });
    }

    case "UPDATE_CONFIDENCE": {
      const newScores = { ...decision.scores };
      if (!newScores[action.optionId]) newScores[action.optionId] = {};
      const existing = newScores[action.optionId]?.[action.criterionId];
      const numValue = resolveScoreValue(existing as ScoreValue | undefined);
      if (numValue === null) return null; // Can't set confidence on unscored cell
      newScores[action.optionId] = {
        ...newScores[action.optionId],
        [action.criterionId]: { value: numValue, confidence: action.confidence },
      };
      return stampNow({ ...decision, scores: newScores });
    }

    case "UPDATE_REASONING": {
      const newReasoning = { ...(decision.reasoning ?? {}) };
      if (!newReasoning[action.optionId]) newReasoning[action.optionId] = {};
      newReasoning[action.optionId] = {
        ...newReasoning[action.optionId],
        [action.criterionId]: action.text,
      };
      return stampNow({ ...decision, reasoning: newReasoning });
    }

    case "SET_CONFIDENCE_STRATEGY":
      return stampNow({ ...decision, confidenceStrategy: action.strategy });

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Undo helpers
// ---------------------------------------------------------------------------

function pushHistory(past: Decision[], entry: Decision): Decision[] {
  return [...past.slice(-(MAX_UNDO - 1)), entry];
}

/**
 * Classify an action for undo coalescing:
 * - "text" coalescing for title/description/option-name/criterion-name edits
 * - "structural" for everything else
 * - null for non-mutating actions
 */
function classifyAction(
  action: DecisionAction
): { type: "text" | "structural"; field?: string; timestamp: number } | null {
  switch (action.type) {
    case "UPDATE_TITLE":
      return { type: "text", field: "title", timestamp: action.timestamp };
    case "UPDATE_DESCRIPTION":
      return { type: "text", field: "description", timestamp: action.timestamp };
    case "UPDATE_OPTION":
      if ("name" in action.updates && Object.keys(action.updates).length === 1) {
        return {
          type: "text",
          field: `option:${action.optionId}:name`,
          timestamp: action.timestamp,
        };
      }
      return { type: "structural", timestamp: action.timestamp };
    case "UPDATE_CRITERION":
      if ("name" in action.updates && Object.keys(action.updates).length === 1) {
        return {
          type: "text",
          field: `criterion:${action.criterionId}:name`,
          timestamp: action.timestamp,
        };
      }
      return { type: "structural", timestamp: action.timestamp };
    case "SET_DECISION":
    case "ADD_OPTION":
    case "REMOVE_OPTION":
    case "REORDER_OPTIONS":
    case "ADD_CRITERION":
    case "REMOVE_CRITERION":
    case "REORDER_CRITERIA":
    case "UPDATE_SCORE":
    case "UPDATE_CONFIDENCE":
    case "SET_CONFIDENCE_STRATEGY":
    case "SET_ENRICHED_SCORE":
    case "RESTORE_ENRICHED_VALUE":
      return { type: "structural", timestamp: Date.now() };
    case "UPDATE_REASONING":
      return {
        type: "text",
        field: `reasoning:${action.optionId}:${action.criterionId}`,
        timestamp: action.timestamp,
      };
    default:
      return null;
  }
}

/**
 * Determine whether the current action should coalesce with the previous
 * undo entry (i.e., not push a new snapshot).
 */
function shouldCoalesce(
  last: CoalesceMeta | null,
  current: { type: "text" | "structural"; field?: string; timestamp: number }
): boolean {
  if (!last) return false;
  if (current.type !== "text") return false;
  if (last.type !== "text") return false;
  if (last.field !== current.field) return false;
  return current.timestamp - last.timestamp < COALESCE_MS;
}

// ---------------------------------------------------------------------------
// Main reducer (with undo/redo middleware)
// ---------------------------------------------------------------------------

/**
 * The full decision reducer — pure function, no side effects.
 *
 * Handles:
 * - Decision mutations via `applyDecisionMutation`
 * - Undo/redo with coalescing for text edits
 * - Navigation actions (load, create, delete, reset) that replace state
 * - UI-only actions (swing percent, loading, dirty flag)
 */
export function decisionReducer(
  state: InternalReducerState,
  action: DecisionAction
): InternalReducerState {
  // ── UNDO ──────────────────────────────────────────────────
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      ...state,
      decision: previous,
      past: state.past.slice(0, -1),
      future: [...state.future, state.decision],
      canUndo: state.past.length > 1,
      canRedo: true,
      isDirty: true,
      _coalesce: null,
    };
  }

  // ── REDO ──────────────────────────────────────────────────
  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const next = state.future[state.future.length - 1];
    return {
      ...state,
      decision: next,
      past: [...state.past, state.decision],
      future: state.future.slice(0, -1),
      canUndo: true,
      canRedo: state.future.length > 1,
      isDirty: true,
      _coalesce: null,
    };
  }

  // ── Navigation actions (replace state, clear history) ─────
  if (action.type === "LOAD_DECISION") {
    return {
      ...state,
      decision: action.decision,
      decisions: action.decisions,
      isDirty: false,
      isLoading: false,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      _coalesce: null,
    };
  }

  if (action.type === "CREATE_DECISION") {
    return {
      ...state,
      decision: action.decision,
      decisions: action.decisions,
      isDirty: false,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      _coalesce: null,
    };
  }

  if (action.type === "DELETE_DECISION") {
    return {
      ...state,
      decisions: action.remaining,
      decision: action.fallback ?? state.decision,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      _coalesce: null,
    };
  }

  if (action.type === "RESET_DEMO") {
    return {
      ...state,
      decision: action.decision,
      decisions: action.decisions,
      isDirty: false,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      _coalesce: null,
    };
  }

  // ── UI-only actions ──────────────────────────────────────
  if (action.type === "SET_SWING_PERCENT") {
    return { ...state, swingPercent: action.value };
  }

  if (action.type === "MARK_CLEAN") {
    return { ...state, isDirty: false };
  }

  if (action.type === "SET_LOADING") {
    return { ...state, isLoading: action.loading };
  }

  if (action.type === "REFRESH_DECISIONS") {
    return { ...state, decisions: action.decisions };
  }

  // ── Decision mutations (with undo management) ────────────
  const newDecision = applyDecisionMutation(state.decision, action);
  if (newDecision === null) {
    return state;
  }

  const classification = classifyAction(action);
  if (!classification) {
    return { ...state, decision: newDecision, isDirty: true };
  }

  const coalesce = shouldCoalesce(state._coalesce, classification);

  if (coalesce) {
    // Coalesce: don't push to undo — top of stack already has the "before" snapshot
    return {
      ...state,
      decision: newDecision,
      isDirty: true,
      future: [], // New mutation clears redo
      canRedo: false,
      _coalesce: { ...classification },
    };
  }

  // New undo group: push current decision to undo stack
  return {
    ...state,
    decision: newDecision,
    isDirty: true,
    past: pushHistory(state.past, state.decision),
    future: [], // New mutation clears redo
    canUndo: true,
    canRedo: false,
    _coalesce: classification,
  };
}
