/**
 * What-If Analysis Panel
 *
 * A sandboxed overlay that lets users explore hypothetical changes to
 * weights and scores without modifying the actual decision. Shows
 * original vs what-if rankings side-by-side with rank change indicators.
 *
 * Architecture:
 *   - Maintains local cloned state (weights + scores)
 *   - Uses `computeResults()` for real-time recomputation
 *   - Only writes to DecisionProvider on "Apply Changes"
 *
 * @see https://github.com/ericsocrat/decision-os/issues/93
 */

"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { X, RotateCcw, Check, ArrowUp, ArrowDown, Minus, FlaskConical } from "lucide-react";
import type { Decision, DecisionResults } from "@/lib/types";
import { computeResults } from "@/lib/scoring";
import { resolveScoreValue } from "@/lib/scoring";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhatIfPanelProps {
  /** The current decision (read-only — cloned internally) */
  decision: Decision;
  /** Original results (for comparison) */
  originalResults: DecisionResults;
  /** Called when the user clicks "Apply Changes" */
  onApply: (weights: number[], scores: Record<string, Record<string, number | null>>) => void;
  /** Called when the panel is closed */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cloneWeights(decision: Decision): number[] {
  return decision.criteria.map((c) => c.weight);
}

function cloneScores(decision: Decision): Record<string, Record<string, number | null>> {
  const out: Record<string, Record<string, number | null>> = {};
  for (const opt of decision.options) {
    out[opt.id] = {};
    for (const crit of decision.criteria) {
      const sv = decision.scores[opt.id]?.[crit.id];
      out[opt.id][crit.id] = resolveScoreValue(sv);
    }
  }
  return out;
}

/** Build a synthetic Decision from cloned weights and scores */
function buildWhatIfDecision(
  decision: Decision,
  weights: number[],
  scores: Record<string, Record<string, number | null>>
): Decision {
  return {
    ...decision,
    criteria: decision.criteria.map((c, i) => ({
      ...c,
      weight: weights[i],
    })),
    scores: Object.fromEntries(
      Object.entries(scores).map(([optId, critScores]) => [
        optId,
        Object.fromEntries(Object.entries(critScores).map(([critId, val]) => [critId, val])),
      ])
    ),
  };
}

/** Rank delta badge */
function RankDelta({ original, current }: { original: number; current: number }) {
  const delta = original - current; // positive = moved up
  if (delta === 0) {
    return (
      <span className="inline-flex items-center text-xs text-gray-400" aria-label="No change">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400"
        aria-label={`Up ${delta}`}
      >
        <ArrowUp className="h-3 w-3" />
        {delta}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400"
      aria-label={`Down ${Math.abs(delta)}`}
    >
      <ArrowDown className="h-3 w-3" />
      {Math.abs(delta)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WhatIfPanel({ decision, originalResults, onApply, onClose }: WhatIfPanelProps) {
  // ── Local sandbox state ─────────────────────────────────
  const [weights, setWeights] = useState(() => cloneWeights(decision));
  const [scores, setScores] = useState(() => cloneScores(decision));
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // ── Recompute what-if results on each change ────────────
  const whatIfDecision = useMemo(
    () => buildWhatIfDecision(decision, weights, scores),
    [decision, weights, scores]
  );
  const whatIfResults = useMemo(() => computeResults(whatIfDecision), [whatIfDecision]);

  // ── Track whether changes were made ─────────────────────
  const hasChanges = useMemo(() => {
    const origWeights = cloneWeights(decision);
    const origScores = cloneScores(decision);
    if (weights.some((w, i) => w !== origWeights[i])) return true;
    for (const optId of Object.keys(origScores)) {
      for (const critId of Object.keys(origScores[optId])) {
        if (scores[optId]?.[critId] !== origScores[optId][critId]) return true;
      }
    }
    return false;
  }, [decision, weights, scores]);

  // ── Build rank lookup for comparison ────────────────────
  const originalRankMap = useMemo(() => {
    const map = new Map<string, number>();
    originalResults.optionResults.forEach((r) => map.set(r.optionId, r.rank));
    return map;
  }, [originalResults]);

  // ── Keyboard: Escape closes + focus trap ─────────────
  useEffect(() => {
    triggerRef.current = document.activeElement;
    const panel = panelRef.current;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panel) {
        const focusable = panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    // Focus the panel on mount
    panel?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      // Restore focus to the element that opened the panel
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [onClose]);

  // ── Handlers ────────────────────────────────────────────
  const handleWeightChange = useCallback((index: number, value: number) => {
    setWeights((prev) => prev.map((w, i) => (i === index ? value : w)));
  }, []);

  const handleScoreChange = useCallback(
    (optionId: string, criterionId: string, value: number | null) => {
      setScores((prev) => ({
        ...prev,
        [optionId]: {
          ...prev[optionId],
          [criterionId]: value,
        },
      }));
    },
    []
  );

  const handleReset = useCallback(() => {
    setWeights(cloneWeights(decision));
    setScores(cloneScores(decision));
  }, [decision]);

  const handleApply = useCallback(() => {
    onApply(weights, scores);
  }, [onApply, weights, scores]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="What-if analysis"
      data-testid="whatif-panel"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-4xl w-full mx-4 max-h-[85vh] flex flex-col outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              What-If Analysis
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Reset to original values"
              data-testid="whatif-reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              onClick={handleApply}
              disabled={!hasChanges}
              className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Apply changes to decision"
              data-testid="whatif-apply"
            >
              <Check className="h-3.5 w-3.5" />
              Apply Changes
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close what-if panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
          {/* ── Weight Sliders ───────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Criterion Weights
            </h3>
            <div className="space-y-3">
              {decision.criteria.map((criterion, i) => (
                <div key={criterion.id} className="flex items-center gap-3">
                  <label
                    className="text-sm text-gray-600 dark:text-gray-400 w-32 truncate shrink-0"
                    htmlFor={`wi-weight-${criterion.id}`}
                    title={criterion.name}
                  >
                    {criterion.name}
                  </label>
                  <input
                    id={`wi-weight-${criterion.id}`}
                    type="range"
                    min={0}
                    max={100}
                    value={weights[i]}
                    onChange={(e) => handleWeightChange(i, Number(e.target.value))}
                    className="flex-1 accent-purple-600"
                    aria-label={`${criterion.name} weight`}
                  />
                  <span className="text-sm font-mono text-gray-500 dark:text-gray-400 w-8 text-right">
                    {weights[i]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Score Matrix ─────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Scores</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="whatif-score-matrix">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-3 text-gray-500 dark:text-gray-400 font-medium">
                      Option
                    </th>
                    {decision.criteria.map((c) => (
                      <th
                        key={c.id}
                        className="text-center py-2 px-2 text-gray-500 dark:text-gray-400 font-medium"
                      >
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decision.options.map((opt) => (
                    <tr key={opt.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 font-medium truncate max-w-[120px]">
                        {opt.name}
                      </td>
                      {decision.criteria.map((crit) => {
                        const val = scores[opt.id]?.[crit.id];
                        return (
                          <td key={crit.id} className="text-center py-2 px-2">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={val ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") {
                                  handleScoreChange(opt.id, crit.id, null);
                                } else {
                                  const n = Math.max(0, Math.min(10, Math.round(Number(raw))));
                                  handleScoreChange(opt.id, crit.id, n);
                                }
                              }}
                              className="w-14 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-center text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              aria-label={`${opt.name} ${crit.name} score`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Side-by-Side Rankings ────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Rankings Comparison
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="whatif-rankings">
              {/* Original */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  Original
                </h4>
                <ol className="space-y-1">
                  {originalResults.optionResults.map((r) => (
                    <li
                      key={r.optionId}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="font-mono text-xs text-gray-400 w-5">#{r.rank}</span>
                      <span className="flex-1 truncate">{r.optionName}</span>
                      <span className="font-mono text-xs text-gray-500">
                        {r.totalScore.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* What-If */}
              <div className="rounded-lg border border-purple-200 dark:border-purple-700/50 bg-purple-50/50 dark:bg-purple-900/10 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400 mb-2">
                  What-If
                </h4>
                <ol className="space-y-1">
                  {whatIfResults.optionResults.map((r) => {
                    const origRank = originalRankMap.get(r.optionId) ?? r.rank;
                    return (
                      <li
                        key={r.optionId}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="font-mono text-xs text-gray-400 w-5">#{r.rank}</span>
                        <span className="flex-1 truncate">{r.optionName}</span>
                        <RankDelta original={origRank} current={r.rank} />
                        <span className="font-mono text-xs text-gray-500">
                          {r.totalScore.toFixed(2)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
