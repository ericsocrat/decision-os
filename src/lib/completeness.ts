/**
 * Completeness calculation — pure functions to determine how "complete"
 * a decision's score matrix is.
 *
 * A cell is considered "filled" when its value is > 0.
 * (Future: when per-score confidence / null-score (#76) is implemented,
 * the definition can change to "explicitly set".)
 */

import type { Decision } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CompletenessResult {
  /** Number of score cells that have been filled (> 0). */
  filled: number;
  /** Total number of score cells (options × criteria). */
  total: number;
  /** Fraction 0–1 representing  filled / total. 1 when total is 0. */
  ratio: number;
  /** Integer percentage 0–100. */
  percent: number;
  /** Colour tier based on completion ratio. */
  tier: "red" | "yellow" | "green" | "blue";
}

/* ------------------------------------------------------------------ */
/*  Tier thresholds                                                    */
/* ------------------------------------------------------------------ */

function tierFromRatio(ratio: number): CompletenessResult["tier"] {
  if (ratio >= 1) return "blue";
  if (ratio > 0.7) return "green";
  if (ratio >= 0.3) return "yellow";
  return "red";
}

/* ------------------------------------------------------------------ */
/*  Core computation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Compute the score-matrix completeness for a decision.
 *
 * Edge cases:
 * - 0 options or 0 criteria → total = 0, ratio = 1, tier = blue (nothing to fill)
 * - All scores 0 → ratio = 0, tier = red
 */
export function computeCompleteness(decision: Decision): CompletenessResult {
  const { options, criteria, scores } = decision;
  const total = options.length * criteria.length;

  if (total === 0) {
    return { filled: 0, total: 0, ratio: 1, percent: 100, tier: "blue" };
  }

  let filled = 0;
  for (const opt of options) {
    const row = scores[opt.id];
    if (!row) continue;
    for (const crit of criteria) {
      if ((row[crit.id] ?? 0) > 0) filled++;
    }
  }

  const ratio = filled / total;
  const percent = Math.round(ratio * 100);
  const tier = tierFromRatio(ratio);

  return { filled, total, ratio, percent, tier };
}

/* ------------------------------------------------------------------ */
/*  Tier → Tailwind colour maps (used by UI components)                */
/* ------------------------------------------------------------------ */

/** Stroke colour for the SVG progress ring. */
export const tierStrokeColour: Record<CompletenessResult["tier"], string> = {
  red: "stroke-red-500",
  yellow: "stroke-amber-400",
  green: "stroke-green-500",
  blue: "stroke-blue-500",
};

/** Text colour matching the tier. */
export const tierTextColour: Record<CompletenessResult["tier"], string> = {
  red: "text-red-600 dark:text-red-400",
  yellow: "text-amber-600 dark:text-amber-400",
  green: "text-green-600 dark:text-green-400",
  blue: "text-blue-600 dark:text-blue-400",
};

/** Background colour for badges. */
export const tierBadgeBg: Record<CompletenessResult["tier"], string> = {
  red: "bg-red-500",
  yellow: "bg-amber-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
};
