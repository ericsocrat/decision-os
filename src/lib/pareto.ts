/**
 * Pareto Frontier Computation
 *
 * Determines which options are Pareto-optimal (non-dominated) and which are
 * dominated when projected onto any two chosen criteria.
 *
 * An option A dominates option B if A scores ≥ B on BOTH criteria and
 * strictly > on at least one. Options on the Pareto frontier represent
 * genuine trade-offs — no other option beats them on both axes simultaneously.
 *
 * Complexity: O(n²) for n options — fine for typical decisions (< 30 options).
 *
 * Future extension: N-dimensional Pareto using non-dominated sorting (NSGA-II).
 *
 * @see https://github.com/ericsocrat/decision-os/issues/78
 */

import type { Decision } from "./types";
import { readScoreOrZero } from "./scoring";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParetoPoint {
  /** Option ID */
  optionId: string;
  /** Option display name */
  optionName: string;
  /** Score on the X-axis criterion (effective score: benefit = raw, cost = 10 − raw) */
  x: number;
  /** Score on the Y-axis criterion (effective score) */
  y: number;
  /** Whether this option is on the Pareto frontier */
  isPareto: boolean;
  /** IDs of options that dominate this one (empty if Pareto-optimal) */
  dominatedBy: string[];
}

export interface ParetoResult {
  /** All option points with Pareto status */
  points: ParetoPoint[];
  /** Option IDs on the Pareto frontier */
  frontier: string[];
  /** Option IDs that are dominated */
  dominated: string[];
  /** Map from dominated option ID → IDs of options that dominate it */
  dominanceMap: Record<string, string[]>;
  /** X-axis criterion name */
  xLabel: string;
  /** Y-axis criterion name */
  yLabel: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the effective score for Pareto comparison.
 * For benefit criteria: higher is better (use raw score).
 * For cost criteria: lower is better, so we invert (10 − raw) so "higher = better" holds.
 */
function effectiveScore(rawScore: number, criterionType: "benefit" | "cost"): number {
  return criterionType === "cost" ? 10 - rawScore : rawScore;
}

/**
 * Select the two default axes — the two highest-weighted criteria.
 * Returns [xCriterionId, yCriterionId] or null if < 2 criteria.
 */
export function defaultAxes(decision: Decision): [string, string] | null {
  if (decision.criteria.length < 2) return null;
  const sorted = [...decision.criteria].sort((a, b) => b.weight - a.weight);
  return [sorted[0].id, sorted[1].id];
}

// ---------------------------------------------------------------------------
// Core Computation
// ---------------------------------------------------------------------------

/**
 * Compute the 2D Pareto frontier for the given decision and two criteria.
 *
 * @param decision - The full decision object
 * @param criterionXId - Criterion ID for the X axis
 * @param criterionYId - Criterion ID for the Y axis
 * @returns ParetoResult with frontier points, dominated points, and dominance map
 */
export function computeParetoFrontier(
  decision: Decision,
  criterionXId: string,
  criterionYId: string
): ParetoResult {
  const critX = decision.criteria.find((c) => c.id === criterionXId);
  const critY = decision.criteria.find((c) => c.id === criterionYId);

  if (!critX || !critY) {
    return {
      points: [],
      frontier: [],
      dominated: [],
      dominanceMap: {},
      xLabel: critX?.name ?? criterionXId,
      yLabel: critY?.name ?? criterionYId,
    };
  }

  // Build points with effective scores
  const points: ParetoPoint[] = decision.options.map((opt) => {
    const rawX = readScoreOrZero(decision.scores, opt.id, criterionXId);
    const rawY = readScoreOrZero(decision.scores, opt.id, criterionYId);

    return {
      optionId: opt.id,
      optionName: opt.name,
      x: effectiveScore(rawX, critX.type),
      y: effectiveScore(rawY, critY.type),
      isPareto: true, // assume true, will be marked false if dominated
      dominatedBy: [],
    };
  });

  // Determine domination: O(n²)
  for (let i = 0; i < points.length; i++) {
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const a = points[j]; // potential dominator
      const b = points[i]; // potential dominated

      // A dominates B if A ≥ B on both and A > B on at least one
      if (a.x >= b.x && a.y >= b.y && (a.x > b.x || a.y > b.y)) {
        b.isPareto = false;
        b.dominatedBy.push(a.optionId);
      }
    }
  }

  const frontier = points.filter((p) => p.isPareto).map((p) => p.optionId);
  const dominated = points.filter((p) => !p.isPareto).map((p) => p.optionId);

  const dominanceMap: Record<string, string[]> = {};
  for (const p of points) {
    if (p.dominatedBy.length > 0) {
      dominanceMap[p.optionId] = p.dominatedBy;
    }
  }

  return {
    points,
    frontier,
    dominated,
    dominanceMap,
    xLabel: critX.name,
    yLabel: critY.name,
  };
}
