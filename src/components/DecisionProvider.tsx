/**
 * React hook + context for managing Decision OS state.
 *
 * Provides:
 * - Current decision state
 * - CRUD operations
 * - Computed results (memoized)
 * - Persistence to localStorage
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Criterion, Decision, Option, ScoreMatrix } from "@/lib/types";
import { computeResults, sensitivityAnalysis } from "@/lib/scoring";
import { computeTopsisResults, type TopsisResults } from "@/lib/topsis";
import {
  getDecisions,
  getDecision,
  saveDecision,
  deleteDecision,
  resetToDemo,
} from "@/lib/storage";
import { cloudSaveDecision } from "@/lib/cloud-storage";
import { isCloudEnabled } from "@/lib/supabase";
import { DEMO_DECISION } from "@/lib/demo-data";
import { generateId, decodeDecisionFromUrl } from "@/lib/utils";
import { decodeShareUrl } from "@/lib/share";
import { isDecision } from "@/lib/validation";
import { useAnnounce } from "@/components/Announcer";

interface DecisionContextValue {
  // State
  decision: Decision;
  decisions: Decision[];
  results: ReturnType<typeof computeResults>;
  topsisResults: TopsisResults;
  sensitivity: ReturnType<typeof sensitivityAnalysis>;
  isDirty: boolean;
  isLoading: boolean;

  // Decision CRUD
  setDecision: (d: Decision) => void;
  loadDecision: (id: string) => void;
  createNewDecision: () => void;
  removeDecision: (id: string) => void;
  resetDemo: () => void;

  // Field updates
  updateTitle: (title: string) => void;
  updateDescription: (desc: string) => void;

  // Options
  addOption: () => void;
  updateOption: (id: string, updates: Partial<Option>) => void;
  removeOption: (id: string) => void;

  // Criteria
  addCriterion: () => void;
  updateCriterion: (id: string, updates: Partial<Criterion>) => void;
  removeCriterion: (id: string) => void;

  // Scores
  updateScore: (optionId: string, criterionId: string, value: number) => void;

  // Sensitivity
  swingPercent: number;
  setSwingPercent: (v: number) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const DecisionContext = createContext<DecisionContextValue | null>(null);

export function useDecision() {
  const ctx = useContext(DecisionContext);
  if (!ctx) throw new Error("useDecision must be used within DecisionProvider");
  return ctx;
}

export function DecisionProvider({ children }: { children: ReactNode }) {
  // Check URL hash for shared decision data (compact or legacy format)
  const sharedDecision = (() => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash;

    // Compact share format: /share#d=...
    if (hash.startsWith("#d=")) {
      const encoded = hash.slice("#d=".length);
      if (!encoded) return null;
      const decoded = decodeShareUrl(encoded);
      if (decoded && isDecision(decoded)) {
        saveDecision(decoded);
        window.history.replaceState(null, "", window.location.pathname);
        return decoded;
      }
      return null;
    }

    // Legacy format: /#data=...
    if (hash.startsWith("#data=")) {
      const encoded = hash.slice("#data=".length);
      if (!encoded) return null;
      const decoded = decodeDecisionFromUrl<unknown>(encoded, null);
      if (isDecision(decoded)) {
        saveDecision(decoded);
        window.history.replaceState(null, "", window.location.pathname);
        return decoded;
      }
    }

    return null;
  })();

  // Initialize state from shared link or localStorage via lazy initializer
  const [decision, setDecisionState] = useState<Decision>(() => {
    if (sharedDecision) return sharedDecision;
    if (typeof window === "undefined") return DEMO_DECISION;
    const saved = getDecisions();
    return saved.length > 0 ? saved[0] : DEMO_DECISION;
  });
  const [decisions, setDecisions] = useState<Decision[]>(() => {
    if (typeof window === "undefined") return [DEMO_DECISION];
    return getDecisions();
  });
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swingPercent, setSwingPercent] = useState(20);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useAnnounce();

  // ── Undo/Redo history stacks ──────────────────────────────
  const MAX_UNDO = 50;
  const COALESCE_MS = 500;
  const undoStackRef = useRef<Decision[]>([]);
  const redoStackRef = useRef<Decision[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  /** Metadata for the most recent undo push (used for coalescing text edits). */
  const lastUndoMeta = useRef<{
    type: "text" | "structural";
    field?: string;
    timestamp: number;
  } | null>(null);

  /** Push current state onto the undo stack before a mutation */
  const pushUndo = useCallback((current: Decision) => {
    undoStackRef.current = [...undoStackRef.current.slice(-(MAX_UNDO - 1)), current];
    redoStackRef.current = []; // New mutation clears redo
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  /**
   * Push with coalescing: text edits to the same field within COALESCE_MS
   * reuse the existing top-of-stack entry instead of pushing a new one.
   */
  const pushUndoCoalesced = useCallback(
    (current: Decision, type: "text" | "structural", field?: string) => {
      const now = Date.now();
      const last = lastUndoMeta.current;

      if (
        type === "text" &&
        last?.type === "text" &&
        last.field === field &&
        now - last.timestamp < COALESCE_MS
      ) {
        // Coalesce: don't push — the top of the stack already holds the "before" snapshot
        lastUndoMeta.current = { type, field, timestamp: now };
        // Still clear redo since it's a new mutation
        redoStackRef.current = [];
        setCanRedo(false);
        return;
      }

      // New undo group — push the snapshot
      pushUndo(current);
      lastUndoMeta.current = { type, field, timestamp: now };
    },
    [pushUndo]
  );

  /** Clear history (on navigation actions) */
  const clearHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    lastUndoMeta.current = null;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  // Auto-save on decision change (debounced) — local + cloud
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDecision(decision);
      setDecisions(getDecisions());
      setIsDirty(false);
      announce("Changes saved");

      // Best-effort cloud sync (fire-and-forget)
      if (isCloudEnabled()) {
        cloudSaveDecision(decision).catch(() => {
          // Offline or error — data is safe in localStorage
        });
      }
    }, 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [decision, isDirty, announce]);

  // Memoized results
  const results = useMemo(() => computeResults(decision), [decision]);
  const topsisResults = useMemo(() => computeTopsisResults(decision), [decision]);
  const sensitivity = useMemo(
    () => sensitivityAnalysis(decision, swingPercent),
    [decision, swingPercent]
  );

  const setDecision = useCallback(
    (d: Decision) => {
      setDecisionState((prev) => {
        pushUndoCoalesced(prev, "structural");
        return { ...d, updatedAt: new Date().toISOString() };
      });
      setIsDirty(true);
    },
    [pushUndoCoalesced]
  );

  /** Internal: set decision with text-edit coalescing for a given field. */
  const setDecisionText = useCallback(
    (d: Decision, field: string) => {
      setDecisionState((prev) => {
        pushUndoCoalesced(prev, "text", field);
        return { ...d, updatedAt: new Date().toISOString() };
      });
      setIsDirty(true);
    },
    [pushUndoCoalesced]
  );

  /** Undo: restore previous state from undo stack */
  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    lastUndoMeta.current = null; // Reset coalescing after undo
    setDecisionState((current) => {
      redoStackRef.current = [...redoStackRef.current, current];
      setCanRedo(true);
      return previous;
    });
    setCanUndo(undoStackRef.current.length > 0);
    setIsDirty(true);
    announce("Undone");
  }, [announce]);

  /** Redo: restore state from redo stack */
  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    lastUndoMeta.current = null; // Reset coalescing after redo
    setDecisionState((current) => {
      undoStackRef.current = [...undoStackRef.current, current];
      setCanUndo(true);
      return next;
    });
    setCanRedo(redoStackRef.current.length > 0);
    setIsDirty(true);
    announce("Redone");
  }, [announce]);

  const loadDecision = useCallback(
    (id: string) => {
      const d = getDecision(id);
      if (d) {
        setIsLoading(true);
        setDecisionState(d);
        setIsDirty(false);
        clearHistory();
        announce(`Loaded decision: ${d.title}`);
        // Brief loading skeleton for visual feedback
        requestAnimationFrame(() => setIsLoading(false));
      }
    },
    [announce, clearHistory]
  );

  const createNewDecision = useCallback(() => {
    const now = new Date().toISOString();
    const newDecision: Decision = {
      id: generateId(),
      title: "Untitled Decision",
      description: "",
      options: [
        { id: generateId(), name: "Option A" },
        { id: generateId(), name: "Option B" },
      ],
      criteria: [{ id: generateId(), name: "Criterion 1", weight: 50, type: "benefit" }],
      scores: {},
      createdAt: now,
      updatedAt: now,
    };
    saveDecision(newDecision);
    setDecisionState(newDecision);
    setDecisions(getDecisions());
    setIsDirty(false);
    clearHistory();
    announce("New decision created");
  }, [announce, clearHistory]);

  const removeDecision = useCallback(
    (id: string) => {
      if (deleteDecision(id)) {
        const remaining = getDecisions();
        setDecisions(remaining);
        if (decision.id === id && remaining.length > 0) {
          setDecisionState(remaining[0]);
        }
        clearHistory();
        announce("Decision deleted");
      }
    },
    [decision.id, announce, clearHistory]
  );

  const resetDemoFn = useCallback(() => {
    resetToDemo();
    const saved = getDecisions();
    setDecisions(saved);
    setDecisionState(saved[0]);
    setIsDirty(false);
    clearHistory();
    announce("Demo data restored");
  }, [announce, clearHistory]);

  // Field updates (text-coalesced undo)
  const updateTitle = useCallback(
    (title: string) => setDecisionText({ ...decision, title }, "title"),
    [decision, setDecisionText]
  );

  const updateDescription = useCallback(
    (desc: string) => setDecisionText({ ...decision, description: desc }, "description"),
    [decision, setDecisionText]
  );

  // Options
  const addOption = useCallback(() => {
    const newOpt: Option = {
      id: generateId(),
      name: `Option ${decision.options.length + 1}`,
    };
    setDecision({ ...decision, options: [...decision.options, newOpt] });
    announce(`Option ${decision.options.length + 1} added`);
  }, [decision, setDecision, announce]);

  const updateOption = useCallback(
    (id: string, updates: Partial<Option>) => {
      const updated = {
        ...decision,
        options: decision.options.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      };
      // Name-only edits coalesce as text; all other updates are structural
      if ("name" in updates && Object.keys(updates).length === 1) {
        setDecisionText(updated, `option:${id}:name`);
      } else {
        setDecision(updated);
      }
    },
    [decision, setDecision, setDecisionText]
  );

  const removeOption = useCallback(
    (id: string) => {
      const removed = decision.options.find((o) => o.id === id);
      const newScores = { ...decision.scores };
      delete newScores[id];
      setDecision({
        ...decision,
        options: decision.options.filter((o) => o.id !== id),
        scores: newScores,
      });
      announce(`${removed?.name ?? "Option"} removed`);
    },
    [decision, setDecision, announce]
  );

  // Criteria
  const addCriterion = useCallback(() => {
    const newCrit: Criterion = {
      id: generateId(),
      name: `Criterion ${decision.criteria.length + 1}`,
      weight: 50,
      type: "benefit",
    };
    setDecision({ ...decision, criteria: [...decision.criteria, newCrit] });
    announce(`Criterion ${decision.criteria.length + 1} added`);
  }, [decision, setDecision, announce]);

  const updateCriterion = useCallback(
    (id: string, updates: Partial<Criterion>) => {
      const updated = {
        ...decision,
        criteria: decision.criteria.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      };
      // Name-only edits coalesce as text; weight/type changes are structural
      if ("name" in updates && Object.keys(updates).length === 1) {
        setDecisionText(updated, `criterion:${id}:name`);
      } else {
        setDecision(updated);
      }
    },
    [decision, setDecision, setDecisionText]
  );

  const removeCriterion = useCallback(
    (id: string) => {
      const removed = decision.criteria.find((c) => c.id === id);
      const newScores: ScoreMatrix = {};
      for (const optId of Object.keys(decision.scores)) {
        const optScores = { ...decision.scores[optId] };
        delete optScores[id];
        newScores[optId] = optScores;
      }
      setDecision({
        ...decision,
        criteria: decision.criteria.filter((c) => c.id !== id),
        scores: newScores,
      });
      announce(`${removed?.name ?? "Criterion"} removed`);
    },
    [decision, setDecision, announce]
  );

  // Scores
  const updateScore = useCallback(
    (optionId: string, criterionId: string, value: number) => {
      const clamped = Math.max(0, Math.min(10, Math.round(value)));
      const newScores = { ...decision.scores };
      if (!newScores[optionId]) newScores[optionId] = {};
      newScores[optionId] = {
        ...newScores[optionId],
        [criterionId]: clamped,
      };
      setDecision({ ...decision, scores: newScores });
    },
    [decision, setDecision]
  );

  const value: DecisionContextValue = {
    decision,
    decisions,
    results,
    topsisResults,
    sensitivity,
    isDirty,
    isLoading,
    setDecision,
    loadDecision,
    createNewDecision,
    removeDecision,
    resetDemo: resetDemoFn,
    updateTitle,
    updateDescription,
    addOption,
    updateOption,
    removeOption,
    addCriterion,
    updateCriterion,
    removeCriterion,
    updateScore,
    swingPercent,
    setSwingPercent,
    undo,
    redo,
    canUndo,
    canRedo,
  };

  return <DecisionContext.Provider value={value}>{children}</DecisionContext.Provider>;
}
