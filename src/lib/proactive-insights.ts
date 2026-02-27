/**
 * Proactive insights engine — surfaces key decision intelligence directly
 * in the Results tab so users don't have to visit Sensitivity or Monte Carlo tabs.
 *
 * Generates up to 4 actionable, plain-language insights:
 *   1. Robustness summary (is the winner stable under weight swings?)
 *   2. Closest tipping point (smallest weight change that flips the winner)
 *   3. Margin analysis + strongest differentiator
 *   4. Monte Carlo preview (quick 1K-iteration win probability)
 */

import type {
  Decision,
  DecisionResults,
  SensitivityAnalysis,
  SensitivityPoint,
  MonteCarloResults,
} from "./types";
import { runMonteCarloSimulation } from "./monte-carlo";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type InsightSeverity = "positive" | "warning" | "info";

export type InsightType =
  | "robustness"
  | "tipping-point"
  | "margin"
  | "monte-carlo-preview"
  | "differentiator";

export interface ProactiveInsight {
  type: InsightType;
  severity: InsightSeverity;
  icon: string;
  headline: string;
  detail: string;
  action?: {
    label: string;
    target: "sensitivity-tab" | "monte-carlo-tab" | "builder-tab";
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of insights returned */
const MAX_INSIGHTS = 4;

/** Margin threshold below which Monte Carlo preview runs */
const CLOSE_MARGIN_THRESHOLD = 1.5;

/** Quick Monte Carlo iterations for preview */
const PREVIEW_ITERATIONS = 1000;

// ---------------------------------------------------------------------------
// Tipping point finder
// ---------------------------------------------------------------------------

export interface TippingPoint {
  criterionName: string;
  /** Absolute percentage change needed to flip the winner */
  weightDelta: number;
  /** Direction of the change (positive = increase, negative = decrease) */
  direction: "increase" | "decrease";
  newWinner: string;
}

/**
 * Find the closest tipping point — the smallest weight change in the
 * sensitivity analysis that causes the winner to change.
 */
export function findClosestTippingPoint(sensitivity: SensitivityAnalysis): TippingPoint | null {
  const changed = sensitivity.points.filter((p) => p.winnerChanged);
  if (changed.length === 0) return null;

  let closest: SensitivityPoint = changed[0];
  let minDelta = Math.abs(changed[0].adjustedWeight - changed[0].originalWeight);

  for (let i = 1; i < changed.length; i++) {
    const delta = Math.abs(changed[i].adjustedWeight - changed[i].originalWeight);
    if (delta < minDelta) {
      minDelta = delta;
      closest = changed[i];
    }
  }

  const rawDelta = closest.adjustedWeight - closest.originalWeight;
  return {
    criterionName: closest.criterionName,
    weightDelta: Math.abs(rawDelta),
    direction: rawDelta > 0 ? "increase" : "decrease",
    newWinner: closest.newWinner,
  };
}

// ---------------------------------------------------------------------------
// Insight generators
// ---------------------------------------------------------------------------

function robustnessInsight(
  sensitivity: SensitivityAnalysis,
  winnerName: string,
  swingPercent: number
): ProactiveInsight {
  const changedCount = sensitivity.points.filter((p) => p.winnerChanged).length;
  const totalCriteria = new Set(sensitivity.points.map((p) => p.criterionId)).size;
  const stableCriteria =
    totalCriteria -
    new Set(sensitivity.points.filter((p) => p.winnerChanged).map((p) => p.criterionId)).size;

  if (changedCount === 0) {
    return {
      type: "robustness",
      severity: "positive",
      icon: "✅",
      headline: `${winnerName} remains #1 even with ±${swingPercent}% weight swings on all ${totalCriteria} criteria`,
      detail: "Your decision is robust — no single weight change reverses the outcome.",
    };
  }

  return {
    type: "robustness",
    severity: "warning",
    icon: "⚠️",
    headline: `${winnerName} stays #1 on ${stableCriteria} of ${totalCriteria} criteria but is sensitive on others`,
    detail: `${changedCount} weight swing(s) across the ±${swingPercent}% range would change the winner.`,
    action: { label: "View in Sensitivity tab", target: "sensitivity-tab" },
  };
}

function tippingPointInsight(tipping: TippingPoint, currentWinner: string): ProactiveInsight {
  const pct = tipping.weightDelta.toFixed(0);
  return {
    type: "tipping-point",
    severity: "warning",
    icon: "⚠️",
    headline: `Tipping point: ${tipping.direction === "increase" ? "increasing" : "decreasing"} "${tipping.criterionName}" weight by just ${pct}% flips the winner`,
    detail: `${tipping.newWinner} would overtake ${currentWinner}. Consider whether your weight for this criterion truly reflects your priorities.`,
    action: { label: "Adjust in Sensitivity tab", target: "sensitivity-tab" },
  };
}

function marginInsight(results: DecisionResults): ProactiveInsight | null {
  if (results.optionResults.length < 2) return null;

  const first = results.optionResults[0];
  const second = results.optionResults[1];
  const margin = first.totalScore - second.totalScore;
  const marginStr = margin.toFixed(2);

  // Find strongest differentiator: criterion with largest effective score gap
  let bestCrit = "";
  let bestGap = 0;
  for (const cs1 of first.criterionScores) {
    const cs2 = second.criterionScores.find((c) => c.criterionId === cs1.criterionId);
    if (!cs2) continue;
    const gap = cs1.effectiveScore - cs2.effectiveScore;
    if (gap > bestGap) {
      bestGap = gap;
      bestCrit = cs1.criterionName;
    }
  }

  const detail = bestCrit
    ? `Your strongest differentiator is "${bestCrit}" — it contributes ${bestGap.toFixed(2)} points to ${first.optionName}'s lead.`
    : `The scores are ${margin < CLOSE_MARGIN_THRESHOLD ? "very close" : "well-separated"}.`;

  return {
    type: "margin",
    severity: margin < CLOSE_MARGIN_THRESHOLD ? "warning" : "info",
    icon: "📊",
    headline: `The margin between #1 and #2 is ${marginStr} points (${first.optionName} ${first.totalScore.toFixed(2)} vs ${second.optionName} ${second.totalScore.toFixed(2)})`,
    detail,
  };
}

function monteCarloPreviewInsight(decision: Decision, winnerName: string): ProactiveInsight | null {
  try {
    const mc: MonteCarloResults = runMonteCarloSimulation(decision, {
      numSimulations: PREVIEW_ITERATIONS,
    });

    const winnerResult = mc.options.find((o) => o.optionName === winnerName);
    if (!winnerResult) return null;

    const pct = (winnerResult.winProbability * 100).toFixed(0);

    return {
      type: "monte-carlo-preview",
      severity: winnerResult.winProbability >= 0.7 ? "positive" : "warning",
      icon: "🎯",
      headline: `With random ±score variations, ${winnerName} still wins ${pct}% of the time`,
      detail: `Based on a quick ${PREVIEW_ITERATIONS.toLocaleString()}-iteration Monte Carlo simulation with your current confidence levels.`,
      action: { label: "Run full Monte Carlo simulation", target: "monte-carlo-tab" },
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate proactive insights for the Results tab.
 *
 * @returns Up to 4 insights, sorted by severity (warnings first).
 */
export function generateProactiveInsights(
  decision: Decision,
  results: DecisionResults,
  sensitivity: SensitivityAnalysis,
  swingPercent: number
): ProactiveInsight[] {
  if (results.optionResults.length < 2) return [];

  const winnerName = results.optionResults[0].optionName;
  const insights: ProactiveInsight[] = [];

  // 1. Robustness
  insights.push(robustnessInsight(sensitivity, winnerName, swingPercent));

  // 2. Tipping point (only if one exists)
  const tipping = findClosestTippingPoint(sensitivity);
  if (tipping) {
    insights.push(tippingPointInsight(tipping, winnerName));
  }

  // 3. Margin + differentiator
  const margin = marginInsight(results);
  if (margin) {
    insights.push(margin);
  }

  // 4. Monte Carlo preview (only for close margins)
  if (results.optionResults.length >= 2) {
    const first = results.optionResults[0];
    const second = results.optionResults[1];
    const scoreGap = first.totalScore - second.totalScore;

    if (scoreGap < CLOSE_MARGIN_THRESHOLD) {
      const mcInsight = monteCarloPreviewInsight(decision, winnerName);
      if (mcInsight) insights.push(mcInsight);
    }
  }

  // Sort: warnings first, then positive, then info
  const severityOrder: Record<InsightSeverity, number> = {
    warning: 0,
    positive: 1,
    info: 2,
  };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights.slice(0, MAX_INSIGHTS);
}
