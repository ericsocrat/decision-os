/**
 * Decision OS — State Management Provider (useReducer + Multi-Context Split)
 *
 * Architecture (4 focused contexts + 1 backward-compatible):
 *   DecisionDataContext    — decision data & navigation state (re-renders on decision changes)
 *   ResultsContext         — derived computations (results, TOPSIS, regret, sensitivity)
 *   ActionsContext         — stable action wrappers (never causes re-renders)
 *   DecisionDispatchContext — stable raw dispatch (never causes re-renders)
 *   DecisionContext         — backward-compatible context (all state + all methods)
 *
 * Focused hooks (`useDecisionData`, `useResultsContext`, `useActions`) let
 * components subscribe only to the slice they need, eliminating unnecessary
 * re-renders. E.g. Header uses only data/actions; SensitivityView uses only results.
 *
 * The pure `decisionReducer` lives in `@/lib/decision-reducer.ts` and is tested
 * independently. This component handles:
 *   - Bootstrapping from localStorage
 *   - Auto-save side effect
 *   - Screen-reader announcements
 *   - Derived state memoization (results, TOPSIS, regret, sensitivity)
 *   - Convenience action wrappers for backward-compatible API
 *
 * @see https://github.com/ericsocrat/decision-os/issues/77
 * @see https://github.com/ericsocrat/decision-os/issues/121
 */

"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  Confidence,
  ConfidenceStrategy,
  Criterion,
  Decision,
  DecisionResults,
  Option,
  SensitivityAnalysis,
} from "@/lib/types";
import type { TopsisResults } from "@/lib/topsis";
import type { RegretResults } from "@/lib/regret";
import {
  type DecisionAction,
  type InternalReducerState,
  type ReducerState,
  createInitialState,
  decisionReducer,
} from "@/lib/decision-reducer";
import { computeResults, sensitivityAnalysis } from "@/lib/scoring";
import { computeTopsisResults } from "@/lib/topsis";
import { computeRegretResults } from "@/lib/regret";
import {
  getDecisions,
  getDecision,
  saveDecision,
  deleteDecision,
  resetToDemo,
} from "@/lib/storage";
import { DEMO_DECISION } from "@/lib/demo-data";
import { generateId } from "@/lib/utils";
import { useAnnounce } from "./Announcer";

// ---------------------------------------------------------------------------
// Derived state (computed from decision via useMemo)
// ---------------------------------------------------------------------------

/** Data enrichment confidence tier. */
type EnrichmentTier = 1 | 2 | 3;

interface DerivedState {
  results: DecisionResults;
  topsisResults: TopsisResults;
  regretResults: RegretResults;
  sensitivity: SensitivityAnalysis;
}

// ---------------------------------------------------------------------------
// Context value types
// ---------------------------------------------------------------------------

/** Decision data: the decision object, navigation, and undo/redo state. */
export interface DecisionDataValue {
  decision: Decision;
  decisions: Decision[];
  isDirty: boolean;
  isLoading: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

/** Derived computation results (isolated so score-only consumers don't re-render). */
export interface ResultsValue {
  results: DecisionResults;
  topsisResults: TopsisResults;
  regretResults: RegretResults;
  sensitivity: SensitivityAnalysis;
  swingPercent: number;
}

/** Stable action wrappers (dispatch-only — never triggers re-renders). */
export interface ActionsValue {
  dispatch: Dispatch<DecisionAction>;
  updateTitle: (title: string) => void;
  updateDescription: (description: string) => void;
  addOption: () => void;
  updateOption: (optionId: string, updates: Partial<Option>) => void;
  removeOption: (optionId: string) => void;
  reorderOptions: (fromIndex: number, toIndex: number) => void;
  addCriterion: () => void;
  updateCriterion: (criterionId: string, updates: Partial<Criterion>) => void;
  removeCriterion: (criterionId: string) => void;
  reorderCriteria: (fromIndex: number, toIndex: number) => void;
  updateScore: (optionId: string, criterionId: string, value: number | null) => void;
  updateConfidence: (optionId: string, criterionId: string, confidence: Confidence) => void;
  updateReasoning: (optionId: string, criterionId: string, text: string) => void;
  setEnrichedScore: (
    optionId: string,
    criterionId: string,
    value: number,
    source: string,
    tier: EnrichmentTier
  ) => void;
  restoreEnrichedValue: (optionId: string, criterionId: string) => void;
  undo: () => void;
  redo: () => void;
  setSwingPercent: (value: number) => void;
  setConfidenceStrategy: (strategy: ConfidenceStrategy) => void;
  loadDecision: (id: string) => void;
  createNewDecision: () => void;
  removeDecision: (id: string) => void;
  resetDemo: () => void;
}

/** Read-only state: reducer state + derived computations */
export type DecisionStateValue = ReducerState & DerivedState;

/** Stable dispatch function */
export type DecisionDispatchValue = Dispatch<DecisionAction>;

/** Full backward-compatible context (state + convenience methods + dispatch) */
export interface DecisionContextValue extends DecisionStateValue {
  dispatch: DecisionDispatchValue;
  // Convenience action wrappers (same API as before the refactor)
  updateTitle: (title: string) => void;
  updateDescription: (description: string) => void;
  addOption: () => void;
  updateOption: (optionId: string, updates: Partial<Option>) => void;
  removeOption: (optionId: string) => void;
  reorderOptions: (fromIndex: number, toIndex: number) => void;
  addCriterion: () => void;
  updateCriterion: (criterionId: string, updates: Partial<Criterion>) => void;
  removeCriterion: (criterionId: string) => void;
  reorderCriteria: (fromIndex: number, toIndex: number) => void;
  updateScore: (optionId: string, criterionId: string, value: number | null) => void;
  updateConfidence: (optionId: string, criterionId: string, confidence: Confidence) => void;
  updateReasoning: (optionId: string, criterionId: string, text: string) => void;
  setEnrichedScore: (
    optionId: string,
    criterionId: string,
    value: number,
    source: string,
    tier: EnrichmentTier
  ) => void;
  restoreEnrichedValue: (optionId: string, criterionId: string) => void;
  undo: () => void;
  redo: () => void;
  setSwingPercent: (value: number) => void;
  setConfidenceStrategy: (strategy: ConfidenceStrategy) => void;
  loadDecision: (id: string) => void;
  createNewDecision: () => void;
  removeDecision: (id: string) => void;
  resetDemo: () => void;
}

// ---------------------------------------------------------------------------
// Contexts (4 focused + 1 backward-compatible)
// ---------------------------------------------------------------------------

const DecisionDataCtx = createContext<DecisionDataValue | null>(null);
const ResultsCtx = createContext<ResultsValue | null>(null);
const ActionsCtx = createContext<ActionsValue | null>(null);
const DecisionStateContext = createContext<DecisionStateValue | null>(null);
const DecisionDispatchContext = createContext<DecisionDispatchValue | null>(null);
const DecisionContext = createContext<DecisionContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Decision data only — does NOT re-render on result changes. */
export function useDecisionData(): DecisionDataValue {
  const ctx = useContext(DecisionDataCtx);
  if (!ctx) throw new Error("useDecisionData must be used within DecisionProvider");
  return ctx;
}

/** Derived results only — does NOT re-render on metadata changes. */
export function useResultsContext(): ResultsValue {
  const ctx = useContext(ResultsCtx);
  if (!ctx) throw new Error("useResultsContext must be used within DecisionProvider");
  return ctx;
}

/** Stable action wrappers — NEVER triggers re-renders. */
export function useActions(): ActionsValue {
  const ctx = useContext(ActionsCtx);
  if (!ctx) throw new Error("useActions must be used within DecisionProvider");
  return ctx;
}

/** Read-only state (re-renders on state changes) */
export function useDecisionState(): DecisionStateValue {
  const ctx = useContext(DecisionStateContext);
  if (!ctx) throw new Error("useDecisionState must be used within DecisionProvider");
  return ctx;
}

/** Stable dispatch (never re-renders) */
export function useDecisionDispatch(): DecisionDispatchValue {
  const ctx = useContext(DecisionDispatchContext);
  if (!ctx) throw new Error("useDecisionDispatch must be used within DecisionProvider");
  return ctx;
}

/** Backward-compatible hook — convenience methods + full state */
export function useDecision(): DecisionContextValue {
  const ctx = useContext(DecisionContext);
  if (!ctx) throw new Error("useDecision must be used within DecisionProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function DecisionProvider({ children }: Readonly<{ children: ReactNode }>) {
  // ── Bootstrap from localStorage ──────────────────────────
  const [state, dispatch] = useReducer(decisionReducer, undefined, (): InternalReducerState => {
    const decisions = getDecisions();
    return createInitialState(decisions[0], decisions);
  });

  const announce = useAnnounce();

  // Keep announce ref stable for use in callbacks
  const announceRef = useRef(announce);
  useEffect(() => {
    announceRef.current = announce;
  }, [announce]);

  // ── Auto-save side effect ────────────────────────────────
  useEffect(() => {
    if (state.isDirty) {
      saveDecision(state.decision);
      dispatch({ type: "MARK_CLEAN" });
      dispatch({ type: "REFRESH_DECISIONS", decisions: getDecisions() });
      announceRef.current("Changes saved");
    }
  }, [state.isDirty, state.decision]);

  // ── Derived state (memoized) ─────────────────────────────
  const results = useMemo(() => computeResults(state.decision), [state.decision]);
  const topsisResults = useMemo(() => computeTopsisResults(state.decision), [state.decision]);
  const regretResults = useMemo(() => computeRegretResults(state.decision), [state.decision]);
  const sensitivity = useMemo(
    () => sensitivityAnalysis(state.decision, state.swingPercent),
    [state.decision, state.swingPercent]
  );

  // ── Convenience action wrappers ──────────────────────────
  // These depend only on `dispatch` (stable) so they never change identity.

  const updateTitle = useCallback(
    (title: string) => dispatch({ type: "UPDATE_TITLE", title, timestamp: Date.now() }),
    [dispatch]
  );

  const updateDescription = useCallback(
    (description: string) =>
      dispatch({ type: "UPDATE_DESCRIPTION", description, timestamp: Date.now() }),
    [dispatch]
  );

  const addOption = useCallback(() => {
    dispatch({ type: "ADD_OPTION" });
  }, [dispatch]);

  const updateOption = useCallback(
    (optionId: string, updates: Partial<Option>) =>
      dispatch({ type: "UPDATE_OPTION", optionId, updates, timestamp: Date.now() }),
    [dispatch]
  );

  const removeOption = useCallback(
    (optionId: string) => dispatch({ type: "REMOVE_OPTION", optionId }),
    [dispatch]
  );

  const reorderOptions = useCallback(
    (fromIndex: number, toIndex: number) =>
      dispatch({ type: "REORDER_OPTIONS", fromIndex, toIndex }),
    [dispatch]
  );

  const addCriterion = useCallback(() => {
    dispatch({ type: "ADD_CRITERION" });
  }, [dispatch]);

  const updateCriterion = useCallback(
    (criterionId: string, updates: Partial<Criterion>) =>
      dispatch({ type: "UPDATE_CRITERION", criterionId, updates, timestamp: Date.now() }),
    [dispatch]
  );

  const removeCriterion = useCallback(
    (criterionId: string) => dispatch({ type: "REMOVE_CRITERION", criterionId }),
    [dispatch]
  );

  const reorderCriteria = useCallback(
    (fromIndex: number, toIndex: number) =>
      dispatch({ type: "REORDER_CRITERIA", fromIndex, toIndex }),
    [dispatch]
  );

  const updateScore = useCallback(
    (optionId: string, criterionId: string, value: number | null) =>
      dispatch({ type: "UPDATE_SCORE", optionId, criterionId, value }),
    [dispatch]
  );

  const updateConfidence = useCallback(
    (optionId: string, criterionId: string, confidence: Confidence) =>
      dispatch({ type: "UPDATE_CONFIDENCE", optionId, criterionId, confidence }),
    [dispatch]
  );

  const updateReasoning = useCallback(
    (optionId: string, criterionId: string, text: string) =>
      dispatch({ type: "UPDATE_REASONING", optionId, criterionId, text, timestamp: Date.now() }),
    [dispatch]
  );

  const setEnrichedScore = useCallback(
    (optionId: string, criterionId: string, value: number, source: string, tier: EnrichmentTier) =>
      dispatch({ type: "SET_ENRICHED_SCORE", optionId, criterionId, value, source, tier }),
    [dispatch]
  );

  const restoreEnrichedValue = useCallback(
    (optionId: string, criterionId: string) =>
      dispatch({ type: "RESTORE_ENRICHED_VALUE", optionId, criterionId }),
    [dispatch]
  );

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
    announceRef.current("Undone");
  }, [dispatch]);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
    announceRef.current("Redone");
  }, [dispatch]);

  const setSwingPercent = useCallback(
    (value: number) => dispatch({ type: "SET_SWING_PERCENT", value }),
    [dispatch]
  );

  const setConfidenceStrategy = useCallback(
    (strategy: ConfidenceStrategy) => dispatch({ type: "SET_CONFIDENCE_STRATEGY", strategy }),
    [dispatch]
  );

  // ── Navigation actions (side effects + dispatch) ─────────

  const loadDecision = useCallback(
    (id: string) => {
      const found = getDecision(id);
      if (!found) return;
      const decisions = getDecisions();
      dispatch({ type: "LOAD_DECISION", decision: found, decisions });
      announceRef.current(`Loaded decision: ${found.title}`);
    },
    [dispatch]
  );

  const createNewDecision = useCallback(() => {
    const blank: Decision = {
      id: generateId(),
      title: "Untitled Decision",
      description: "",
      options: [
        { id: generateId(), name: "Option 1" },
        { id: generateId(), name: "Option 2" },
      ],
      criteria: [{ id: generateId(), name: "Criterion 1", weight: 50, type: "benefit" }],
      scores: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDecision(blank);
    const decisions = getDecisions();
    dispatch({ type: "CREATE_DECISION", decision: blank, decisions });
    announceRef.current("New decision created");
  }, [dispatch]);

  const removeDecision = useCallback(
    (id: string) => {
      const ok = deleteDecision(id);
      if (!ok) return;
      const remaining = getDecisions();
      // If we deleted the active decision, fall back to first
      const fallback = state.decision.id === id ? (remaining[0] ?? null) : null;
      dispatch({ type: "DELETE_DECISION", remaining, fallback });
      announceRef.current("Decision deleted");
    },
    [dispatch, state.decision.id]
  );

  const resetDemo = useCallback(() => {
    resetToDemo();
    const decisions = getDecisions();
    dispatch({ type: "RESET_DEMO", decisions, decision: DEMO_DECISION });
    announceRef.current("Demo data restored");
  }, [dispatch]);

  // ── Assemble context values ──────────────────────────────

  // Focused context: decision data (re-renders only on decision/list changes)
  const dataValue = useMemo<DecisionDataValue>(
    () => ({
      decision: state.decision,
      decisions: state.decisions,
      isDirty: state.isDirty,
      isLoading: state.isLoading,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
    }),
    [state.decision, state.decisions, state.isDirty, state.isLoading, state.canUndo, state.canRedo]
  );

  // Focused context: derived results (re-renders only when results change)
  const resultsValue = useMemo<ResultsValue>(
    () => ({
      results,
      topsisResults,
      regretResults,
      sensitivity,
      swingPercent: state.swingPercent,
    }),
    [results, topsisResults, regretResults, sensitivity, state.swingPercent]
  );

  // Focused context: stable actions (reference-stable — never re-renders)
  const actionsValue = useMemo<ActionsValue>(
    () => ({
      dispatch,
      updateTitle,
      updateDescription,
      addOption,
      updateOption,
      removeOption,
      reorderOptions,
      addCriterion,
      updateCriterion,
      removeCriterion,
      reorderCriteria,
      updateScore,
      updateConfidence,
      updateReasoning,
      setEnrichedScore,
      restoreEnrichedValue,
      undo,
      redo,
      setSwingPercent,
      setConfidenceStrategy,
      loadDecision,
      createNewDecision,
      removeDecision,
      resetDemo,
    }),
    [
      dispatch,
      updateTitle,
      updateDescription,
      addOption,
      updateOption,
      removeOption,
      reorderOptions,
      addCriterion,
      updateCriterion,
      removeCriterion,
      reorderCriteria,
      updateScore,
      updateConfidence,
      updateReasoning,
      setEnrichedScore,
      restoreEnrichedValue,
      undo,
      redo,
      setSwingPercent,
      setConfidenceStrategy,
      loadDecision,
      createNewDecision,
      removeDecision,
      resetDemo,
    ]
  );

  // Legacy: full state value (for DecisionStateContext backward-compat)
  const stateValue = useMemo<DecisionStateValue>(
    () => ({
      decision: state.decision,
      decisions: state.decisions,
      isDirty: state.isDirty,
      isLoading: state.isLoading,
      swingPercent: state.swingPercent,
      past: state.past,
      future: state.future,
      canUndo: state.canUndo,
      canRedo: state.canRedo,
      results,
      topsisResults,
      regretResults,
      sensitivity,
    }),
    [state, results, topsisResults, regretResults, sensitivity]
  );

  // Legacy: backward-compatible combined context
  const contextValue = useMemo<DecisionContextValue>(
    () => ({
      ...stateValue,
      ...actionsValue,
    }),
    [stateValue, actionsValue]
  );

  return (
    <DecisionDataCtx value={dataValue}>
      <ResultsCtx value={resultsValue}>
        <ActionsCtx value={actionsValue}>
          <DecisionStateContext value={stateValue}>
            <DecisionDispatchContext value={dispatch}>
              <DecisionContext value={contextValue}>{children}</DecisionContext>
            </DecisionDispatchContext>
          </DecisionStateContext>
        </ActionsCtx>
      </ResultsCtx>
    </DecisionDataCtx>
  );
}
