/**
 * DecisionCard — displays a single decision as a card in the dashboard.
 * Shows status badge, option/criterion counts, quality bar, winner info, and actions.
 */

"use client";

import { memo, type MouseEvent } from "react";
import type { DecisionCardData } from "@/hooks/useDecisionList";
import { formatRelativeTime } from "@/lib/utils";
import { Copy, Trash2, ExternalLink } from "lucide-react";

interface DecisionCardProps {
  card: DecisionCardData;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  empty: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  "in-progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  scored: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  winner: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const QUALITY_BAR_COLORS: Record<string, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
};

export const DecisionCard = memo(function DecisionCard({
  card,
  onOpen,
  onDuplicate,
  onDelete,
  canDelete,
}: DecisionCardProps) {
  const handleOpen = () => onOpen(card.id);

  const handleDuplicate = (e: MouseEvent) => {
    e.stopPropagation();
    onDuplicate(card.id);
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    onDelete(card.id);
  };

  return (
    <article
      data-testid={`decision-card-${card.id}`}
      className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      aria-label={`Open decision: ${card.title}`}
    >
      {/* Top row: title + status badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
          {card.title}
        </h3>
        <span
          className={`inline-flex items-center gap-1 shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE_COLORS[card.status]}`}
          data-testid="card-status-badge"
        >
          <span aria-hidden="true">{card.statusIcon}</span>
          {card.statusLabel}
        </span>
      </div>

      {/* Stats row */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {card.optionCount} option{card.optionCount !== 1 ? "s" : ""} ·{" "}
        {card.criterionCount} criteri{card.criterionCount !== 1 ? "a" : "on"} ·{" "}
        Updated {formatRelativeTime(card.updatedAt)}
      </p>

      {/* Winner info (when scored/winner) */}
      {card.winnerName && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Winner: {card.winnerName} ({card.winnerScore}/10)
        </p>
      )}

      {/* Quality bar */}
      {card.completeness.total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Quality</span>
            <span>{card.completeness.percent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${QUALITY_BAR_COLORS[card.completeness.tier]}`}
              style={{ width: `${card.completeness.percent}%` }}
              role="progressbar"
              aria-valuenow={card.completeness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Quality: ${card.completeness.percent}%`}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/50">
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
          data-testid="card-open"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </button>
        <button
          onClick={handleDuplicate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          data-testid="card-duplicate"
          aria-label={`Duplicate ${card.title}`}
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </button>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors ml-auto"
            data-testid="card-delete"
            aria-label={`Delete ${card.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>
    </article>
  );
});
