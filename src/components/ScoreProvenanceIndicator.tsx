/**
 * Score provenance indicator — visual badge showing whether a score
 * was manually entered, auto-enriched, or user-overridden.
 *
 * Rendered alongside score input cells in the decision matrix.
 *
 * @module components/ScoreProvenanceIndicator
 */

"use client";

import { Database, User, RotateCcw } from "lucide-react";
import type { ScoreMetadata } from "@/lib/types";
import { provenanceLabel } from "@/lib/provenance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function restoreLabel(meta: ScoreMetadata): string {
  if (meta.enrichedValue === undefined) return "Restore enriched value";
  return `Restore enriched value (${meta.enrichedValue})`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScoreProvenanceIndicatorProps {
  /** Metadata for this score cell (undefined = manual) */
  readonly metadata: ScoreMetadata | undefined;
  /** Callback to restore the original enriched value */
  readonly onRestore?: () => void;
  /** Whether the restore action is available */
  readonly canRestore?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact visual indicator for score provenance.
 *
 * - **Manual** (default): no indicator rendered
 * - **Enriched**: blue database icon with source tooltip
 * - **Overridden**: amber user icon with original value tooltip + restore button
 */
export function ScoreProvenanceIndicator({
  metadata,
  onRestore,
  canRestore = false,
}: ScoreProvenanceIndicatorProps) {
  // Manual scores show no indicator
  if (!metadata || metadata.provenance === "manual") return null;

  const label = provenanceLabel(metadata);

  if (metadata.provenance === "enriched") {
    return (
      <span
        className="inline-flex items-center text-blue-500 dark:text-blue-400"
        title={label}
        aria-label={label}
      >
        <Database className="h-3 w-3" aria-hidden="true" />
      </span>
    );
  }

  // Overridden
  return (
    <span className="inline-flex items-center gap-0.5">
      <span
        className="inline-flex items-center text-amber-500 dark:text-amber-400"
        title={label}
        aria-label={label}
      >
        <User className="h-3 w-3" aria-hidden="true" />
      </span>
      {canRestore && onRestore && (
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex items-center rounded p-0.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          title="Restore enriched value"
          aria-label={restoreLabel(metadata)}
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
