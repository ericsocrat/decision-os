/**
 * useDecisionList — search, sort, and metadata for the multi-decision dashboard.
 *
 * Operates on the `decisions` array from DecisionProvider and returns
 * filtered/sorted cards with computed status and quality info.
 */

import { useState, useMemo, useCallback } from "react";
import type { Decision } from "@/lib/types";
import { computeCompleteness, type CompletenessResult } from "@/lib/completeness";
import { computeResults } from "@/lib/scoring";
import { isEmptyDecision } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DecisionStatus = "empty" | "in-progress" | "scored" | "winner";

export type SortField = "recent" | "alphabetical" | "quality" | "status";

export interface DecisionCardData {
  id: string;
  title: string;
  decision: Decision;
  status: DecisionStatus;
  statusLabel: string;
  statusIcon: string;
  optionCount: number;
  criterionCount: number;
  completeness: CompletenessResult;
  winnerName: string | null;
  winnerScore: number | null;
  updatedAt: string;
}

export interface UseDecisionListReturn {
  cards: DecisionCardData[];
  query: string;
  setQuery: (q: string) => void;
  sortField: SortField;
  setSortField: (f: SortField) => void;
  totalCount: number;
}

// ---------------------------------------------------------------------------
// Status computation
// ---------------------------------------------------------------------------

function computeStatus(decision: Decision, completeness: CompletenessResult): DecisionStatus {
  if (isEmptyDecision(decision)) return "empty";
  if (completeness.percent < 100) return "in-progress";

  // Check for clear winner (margin > 1.0)
  const results = computeResults(decision);
  if (results.optionResults.length >= 2) {
    const sorted = [...results.optionResults].sort((a, b) => b.totalScore - a.totalScore);
    if (sorted[0].totalScore - sorted[1].totalScore > 1.0) return "winner";
  }

  return "scored";
}

const STATUS_LABELS: Record<DecisionStatus, string> = {
  empty: "Empty",
  "in-progress": "In Progress",
  scored: "Scored",
  winner: "Winner",
};

const STATUS_ICONS: Record<DecisionStatus, string> = {
  empty: "📝",
  "in-progress": "⏳",
  scored: "✓",
  winner: "★",
};

const STATUS_SORT_ORDER: Record<DecisionStatus, number> = {
  "in-progress": 0,
  empty: 1,
  scored: 2,
  winner: 3,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDecisionList(decisions: Decision[]): UseDecisionListReturn {
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("recent");

  // Compute card data for each decision
  const allCards = useMemo<DecisionCardData[]>(() => {
    return decisions.map((d) => {
      const completeness = computeCompleteness(d);
      const status = computeStatus(d, completeness);

      let winnerName: string | null = null;
      let winnerScore: number | null = null;

      if (status === "scored" || status === "winner") {
        const results = computeResults(d);
        if (results.optionResults.length > 0) {
          const top = [...results.optionResults].sort((a, b) => b.totalScore - a.totalScore)[0];
          winnerName = top.optionName;
          winnerScore = Math.round(top.totalScore * 100) / 100;
        }
      }

      return {
        id: d.id,
        title: d.title || "Untitled Decision",
        decision: d,
        status,
        statusLabel: STATUS_LABELS[status],
        statusIcon: STATUS_ICONS[status],
        optionCount: d.options.length,
        criterionCount: d.criteria.length,
        completeness,
        winnerName,
        winnerScore,
        updatedAt: d.updatedAt,
      };
    });
  }, [decisions]);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!query.trim()) return allCards;
    const q = query.toLowerCase().trim();
    return allCards.filter((c) => {
      // Search in title
      if (c.title.toLowerCase().includes(q)) return true;
      // Search in option names
      if (c.decision.options.some((opt) => opt.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [allCards, query]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sortField) {
      case "recent":
        copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case "alphabetical":
        copy.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "quality":
        copy.sort((a, b) => b.completeness.percent - a.completeness.percent);
        break;
      case "status":
        copy.sort(
          (a, b) => STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]
        );
        break;
    }
    return copy;
  }, [filtered, sortField]);

  const handleSetQuery = useCallback((q: string) => setQuery(q), []);
  const handleSetSort = useCallback((f: SortField) => setSortField(f), []);

  return {
    cards: sorted,
    query,
    setQuery: handleSetQuery,
    sortField,
    setSortField: handleSetSort,
    totalCount: allCards.length,
  };
}
