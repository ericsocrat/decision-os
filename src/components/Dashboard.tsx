/**
 * Dashboard — multi-decision listing with search, sort, and management.
 *
 * State-based routing: page.tsx toggles between Dashboard and decision view.
 * Dashboard shows when `showDashboard` is true; clicking Open/New navigates away.
 */

"use client";

import { useCallback, useRef } from "react";
import { useDecisionData, useActions } from "./DecisionProvider";
import { useDecisionList, type SortField } from "@/hooks/useDecisionList";
import { DecisionCard } from "./DecisionCard";
import { CrossDecisionInsights } from "./CrossDecisionInsights";
import { duplicateDecision, exportAllDecisions } from "@/lib/storage";
import { showToast } from "./Toast";
import {
  Plus,
  Search,
  Download,
  Upload,
  ArrowUpDown,
} from "lucide-react";
import { ImportModal } from "./ImportModal";
import { useState } from "react";

interface DashboardProps {
  onOpenDecision: (id: string) => void;
  onNewDecision: () => void;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "alphabetical", label: "A–Z" },
  { value: "quality", label: "Quality" },
  { value: "status", label: "Status" },
];

export function Dashboard({ onOpenDecision, onNewDecision }: DashboardProps) {
  const { decisions } = useDecisionData();
  const { loadDecision, removeDecision } = useActions();
  const { cards, query, setQuery, sortField, setSortField, totalCount } =
    useDecisionList(decisions);
  const searchRef = useRef<HTMLInputElement>(null);
  const [showImport, setShowImport] = useState(false);

  const handleOpen = useCallback(
    (id: string) => {
      loadDecision(id);
      onOpenDecision(id);
    },
    [loadDecision, onOpenDecision]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      const dup = duplicateDecision(id);
      if (dup) {
        loadDecision(dup.id);
        showToast({ text: `Duplicated as "${dup.title}"` });
      }
    },
    [loadDecision]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const card = cards.find((c) => c.id === id);
      const name = card?.title ?? "this decision";
      if (globalThis.confirm(`Delete "${name}"? This cannot be undone.`)) {
        removeDecision(id);
        showToast({ text: `"${name}" deleted` });
      }
    },
    [cards, removeDecision]
  );

  const handleExportAll = useCallback(() => {
    const json = exportAllDecisions();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decisionos-all-decisions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({ text: `Exported ${totalCount} decision${totalCount !== 1 ? "s" : ""}` });
  }, [totalCount]);

  return (
    <div data-testid="dashboard" className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Decisions</h2>
        <button
          onClick={onNewDecision}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          data-testid="dashboard-new-decision"
        >
          <Plus className="h-4 w-4" />
          New Decision
        </button>
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decisions..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-testid="dashboard-search"
            aria-label="Search decisions"
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-testid="dashboard-sort"
            aria-label="Sort decisions"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Decision cards */}
      {cards.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {query ? (
            <p>No decisions match &ldquo;{query}&rdquo;</p>
          ) : (
            <p>No decisions yet. Create your first one!</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4" data-testid="dashboard-cards">
          {cards.map((card) => (
            <DecisionCard
              key={card.id}
              card={card}
              onOpen={handleOpen}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              canDelete={totalCount > 1}
            />
          ))}
        </div>
      )}

      {/* Cross-Decision Insights */}
      <CrossDecisionInsights cards={cards} />

      {/* Import / Export actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => setShowImport(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          data-testid="dashboard-import"
        >
          <Upload className="h-4 w-4" />
          Import Decision
        </button>
        <button
          onClick={handleExportAll}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          data-testid="dashboard-export"
        >
          <Download className="h-4 w-4" />
          Export All
        </button>
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
