/**
 * Score provenance tracking — pure functions for creating, querying,
 * and updating per-cell provenance metadata.
 *
 * Every score cell can be:
 * - `manual`     — entered directly by the user (default)
 * - `enriched`   — auto-filled by the enrichment engine
 * - `overridden` — user changed an enriched value (original preserved)
 *
 * @module lib/provenance
 */

import type {
  Decision,
  ScoreMetadata,
  ScoreMetadataMatrix,
  ScoreProvenance,
} from "./types";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Create metadata for a manually entered score. */
export function createManualMetadata(): ScoreMetadata {
  return { provenance: "manual" };
}

/** Create metadata for an enrichment-sourced score. */
export function createEnrichedMetadata(
  value: number,
  source: string,
  tier: 1 | 2 | 3,
): ScoreMetadata {
  return {
    provenance: "enriched",
    enrichedValue: value,
    enrichedSource: source,
    enrichedTier: tier,
  };
}

/**
 * Create metadata for a user override of an enriched score.
 * Preserves the original enrichment information so the value can be restored.
 */
export function createOverrideMetadata(
  existing: ScoreMetadata,
  reason?: string,
): ScoreMetadata {
  return {
    provenance: "overridden",
    enrichedValue: existing.enrichedValue,
    enrichedSource: existing.enrichedSource,
    enrichedTier: existing.enrichedTier,
    overriddenAt: new Date().toISOString(),
    overrideReason: reason,
  };
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Get the provenance for a specific cell, defaulting to `"manual"`. */
export function getProvenance(
  decision: Readonly<Decision>,
  optionId: string,
  criterionId: string,
): ScoreProvenance {
  return decision.scoreMetadata?.[optionId]?.[criterionId]?.provenance ?? "manual";
}

/** Get the full metadata for a specific cell (if any). */
export function getMetadata(
  decision: Readonly<Decision>,
  optionId: string,
  criterionId: string,
): ScoreMetadata | undefined {
  return decision.scoreMetadata?.[optionId]?.[criterionId];
}

/**
 * Check whether a cell has an enriched value that can be restored.
 * Only `"overridden"` cells with a saved `enrichedValue` qualify.
 */
export function canRestoreEnriched(
  decision: Readonly<Decision>,
  optionId: string,
  criterionId: string,
): boolean {
  const meta = getMetadata(decision, optionId, criterionId);
  return meta?.provenance === "overridden" && meta.enrichedValue !== undefined;
}

// ---------------------------------------------------------------------------
// Immutable matrix update helpers
// ---------------------------------------------------------------------------

/** Set metadata for a single cell, returning a new matrix. */
export function setMetadataCell(
  matrix: ScoreMetadataMatrix | undefined,
  optionId: string,
  criterionId: string,
  metadata: ScoreMetadata,
): ScoreMetadataMatrix {
  const current = matrix ?? {};
  const optionRow = current[optionId];
  return {
    ...current,
    [optionId]: {
      ...optionRow,
      [criterionId]: metadata,
    },
  };
}

/** Remove metadata for a deleted option. */
export function removeOptionMetadata(
  matrix: ScoreMetadataMatrix | undefined,
  optionId: string,
): ScoreMetadataMatrix | undefined {
  if (!matrix?.[optionId]) return matrix;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [optionId]: _removed, ...rest } = matrix;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

/** Remove metadata for a deleted criterion across all options. */
export function removeCriterionMetadata(
  matrix: ScoreMetadataMatrix | undefined,
  criterionId: string,
): ScoreMetadataMatrix | undefined {
  if (!matrix) return undefined;
  let changed = false;
  const result: ScoreMetadataMatrix = {};
  for (const [optId, cells] of Object.entries(matrix)) {
    if (cells[criterionId]) {
      changed = true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [criterionId]: _removed, ...rest } = cells;
      if (Object.keys(rest).length > 0) {
        result[optId] = rest;
      }
    } else {
      result[optId] = cells;
    }
  }
  if (!changed) return matrix;
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Build a display label for a score cell's provenance.
 * Used in tooltips and screen-reader announcements.
 */
export function provenanceLabel(meta: ScoreMetadata | undefined): string {
  if (!meta || meta.provenance === "manual") return "Manually entered";
  if (meta.provenance === "enriched") {
    const parts = ["Enriched"];
    if (meta.enrichedSource) parts.push(`from ${meta.enrichedSource}`);
    if (meta.enrichedTier) parts.push(`(Tier ${meta.enrichedTier})`);
    return parts.join(" ");
  }
  // overridden
  const parts = ["Overridden"];
  if (meta.enrichedValue !== undefined) {
    parts.push(`from ${meta.enrichedValue}`);
  }
  if (meta.enrichedSource) parts.push(`· source: ${meta.enrichedSource}`);
  return parts.join(" ");
}
