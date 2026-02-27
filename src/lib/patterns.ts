/**
 * Cross-decision pattern recognition — analyzes decision history for
 * recurring scoring biases, weight preferences, and prediction accuracy.
 *
 * Requires >= 3 decisions for meaningful analysis. All functions are pure
 * and operate on arrays of decisions + optional outcomes.
 *
 * @module patterns
 */

import type { Decision } from "./types";
import type { DecisionOutcome } from "./outcome-tracking";
import { resolveScoreValue } from "./scoring";
import { generateId } from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Categories of detectable patterns */
export type PatternType =
  | "scoring-bias"
  | "weight-preference"
  | "prediction-accuracy"
  | "criterion-reuse";

/** A single detected pattern */
export interface DecisionPattern {
  id: string;
  type: PatternType;
  title: string;
  description: string;
  confidence: number; // 0–1
  evidence: string[];
}

/** Minimum decisions required for meaningful analysis */
export const MIN_DECISIONS = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect all resolved scores from a decision's score matrix.
 * Returns a flat array of numeric scores.
 */
function collectScores(decision: Decision): number[] {
  const scores: number[] = [];
  for (const optionId of decision.options.map((o) => o.id)) {
    for (const criterionId of decision.criteria.map((c) => c.id)) {
      const sv = decision.scores[optionId]?.[criterionId];
      const val = resolveScoreValue(sv);
      if (val !== null) scores.push(val);
    }
  }
  return scores;
}

/**
 * Calculate the standard deviation of a numeric array.
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Pattern detection algorithms
// ---------------------------------------------------------------------------

/**
 * Compute the average score for an option across all criteria.
 * Returns null if no scored cells exist.
 */
function optionAverage(decision: Decision, optionId: string): number | null {
  let sum = 0;
  let count = 0;
  for (const criterion of decision.criteria) {
    const sv = decision.scores[optionId]?.[criterion.id];
    const val = resolveScoreValue(sv);
    if (val !== null) {
      sum += val;
      count++;
    }
  }
  return count > 0 ? sum / count : null;
}

/**
 * Check whether the first option has the highest average in a decision.
 */
function isFirstOptionHighest(decision: Decision): boolean {
  if (decision.options.length < 2) return false;

  const firstAvg = optionAverage(decision, decision.options[0].id);
  if (firstAvg === null) return false;

  for (const option of decision.options.slice(1)) {
    const avg = optionAverage(decision, option.id);
    if (avg !== null && avg > firstAvg) return false;
  }
  return true;
}

/**
 * Detect central tendency bias (most scores cluster in 4–6 range).
 */
function detectCentralTendency(decisions: Decision[]): DecisionPattern | undefined {
  const allScores = decisions.flatMap(collectScores);
  if (allScores.length === 0) return undefined;

  const midRange = allScores.filter((s) => s >= 4 && s <= 6);
  const midRatio = midRange.length / allScores.length;

  if (midRatio <= 0.6) return undefined;

  return {
    id: generateId(),
    type: "scoring-bias",
    title: "Central Tendency Bias",
    description:
      `${(midRatio * 100).toFixed(0)}% of your scores fall between 4 and 6. ` +
      "Consider using the full 1–10 range to better differentiate between options.",
    confidence: Math.min(1, midRatio),
    evidence: [
      `${midRange.length}/${allScores.length} scores in the 4–6 range`,
      `Standard deviation: ${standardDeviation(allScores).toFixed(2)}`,
    ],
  };
}

/**
 * Detect first-option anchoring (first option consistently scores highest).
 */
function detectAnchoring(decisions: Decision[]): DecisionPattern | undefined {
  const eligible = decisions.filter((d) => d.options.length >= 2);
  if (eligible.length < MIN_DECISIONS) return undefined;

  const firstHighest = eligible.filter(isFirstOptionHighest).length;
  const ratio = firstHighest / eligible.length;

  if (ratio <= 0.7) return undefined;

  return {
    id: generateId(),
    type: "scoring-bias",
    title: "First-Option Anchoring",
    description:
      `In ${(ratio * 100).toFixed(0)}% of your decisions, the first option scores highest. ` +
      "Try reordering options to check for anchoring bias.",
    confidence: Math.min(1, ratio),
    evidence: [
      `First option highest in ${firstHighest}/${eligible.length} decisions`,
    ],
  };
}

/**
 * 1. Scoring bias: detects central tendency (most scores 4–6) or anchoring
 *    (first option consistently gets highest scores).
 */
function detectScoringBias(decisions: Decision[]): DecisionPattern[] {
  const patterns: DecisionPattern[] = [];

  const tendency = detectCentralTendency(decisions);
  if (tendency) patterns.push(tendency);

  const anchoring = detectAnchoring(decisions);
  if (anchoring) patterns.push(anchoring);

  return patterns;
}

/**
 * 2. Weight preference: same criteria consistently get the highest weight.
 */
function detectWeightPreference(decisions: Decision[]): DecisionPattern[] {
  const patterns: DecisionPattern[] = [];
  const weightLeaders = new Map<string, number>();

  for (const decision of decisions) {
    if (decision.criteria.length < 2) continue;
    // Find the criterion with the highest weight
    let maxWeight = -1;
    let maxName = "";
    for (const c of decision.criteria) {
      if (c.weight > maxWeight) {
        maxWeight = c.weight;
        maxName = c.name.toLowerCase().trim();
      }
    }
    if (maxName) {
      weightLeaders.set(maxName, (weightLeaders.get(maxName) ?? 0) + 1);
    }
  }

  for (const [name, count] of weightLeaders) {
    if (count >= 2 && count / decisions.length >= 0.5) {
      patterns.push({
        id: generateId(),
        type: "weight-preference",
        title: "Recurring Weight Priority",
        description:
          `"${name}" has been your highest-weighted criterion in ${count}/${decisions.length} decisions. ` +
          "This may reflect a genuine priority or an unconscious preference.",
        confidence: Math.min(1, count / decisions.length),
        evidence: [
          `"${name}" weighted highest ${count} times`,
          `Across ${decisions.length} total decisions`,
        ],
      });
    }
  }

  return patterns;
}

/** Comparison between a prediction and actual outcome */
interface PredComparison {
  predicted: number;
  actual: number;
  title: string;
}

/**
 * Build prediction–outcome comparisons from decision + outcome data.
 */
function buildComparisons(
  decisions: Decision[],
  outcomes: DecisionOutcome[],
): PredComparison[] {
  const comparisons: PredComparison[] = [];

  for (const outcome of outcomes) {
    if (outcome.predictedScore === undefined || outcome.outcomeRating === undefined) continue;
    const decision = decisions.find((d) => d.id === outcome.decisionId);
    if (!decision) continue;

    comparisons.push({
      predicted: outcome.predictedScore,
      actual: outcome.outcomeRating,
      title: decision.title,
    });
  }
  return comparisons;
}

/**
 * Detect average delta bias (optimism / pessimism).
 */
function detectDeltaBias(comparisons: PredComparison[]): DecisionPattern | undefined {
  const totalDelta = comparisons.reduce((sum, c) => sum + (c.actual - c.predicted), 0);
  const avgDelta = totalDelta / comparisons.length;

  if (Math.abs(avgDelta) <= 1) return undefined;

  const direction = avgDelta < 0 ? "over-predicting" : "under-predicting";
  const suffix = avgDelta < 0
    ? "Your predictions are more optimistic than actual results."
    : "Actual outcomes tend to exceed your predictions.";

  return {
    id: generateId(),
    type: "prediction-accuracy",
    title: avgDelta < 0 ? "Optimism Bias" : "Pessimism Bias",
    description:
      `You tend to be ${direction} outcomes by an average of ${Math.abs(avgDelta).toFixed(1)} points. ${suffix}`,
    confidence: Math.min(1, Math.abs(avgDelta) / 5),
    evidence: comparisons.map(
      (c) => `"${c.title}": predicted ${c.predicted.toFixed(1)}, actual ${c.actual}`,
    ),
  };
}

/**
 * Detect consistent over/under prediction pattern.
 */
function detectConsistentDirection(comparisons: PredComparison[]): DecisionPattern | undefined {
  let overCount = 0;
  let underCount = 0;

  for (const c of comparisons) {
    const delta = c.actual - c.predicted;
    if (delta < -1) overCount++;
    if (delta > 1) underCount++;
  }

  const dominant = Math.max(overCount, underCount);
  if (dominant < 2) return undefined;

  const ratio = dominant / comparisons.length;
  if (ratio < 0.6) return undefined;

  const direction = overCount > underCount ? "optimistic" : "conservative";
  const label = direction.charAt(0).toUpperCase() + direction.slice(1);

  return {
    id: generateId(),
    type: "prediction-accuracy",
    title: `Consistently ${label} Predictions`,
    description:
      `${dominant}/${comparisons.length} predictions were ${direction}. ` +
      "Consider adjusting your expectations when scoring options.",
    confidence: Math.min(1, ratio),
    evidence: [`${overCount} over-predictions, ${underCount} under-predictions`],
  };
}

/**
 * 3. Prediction accuracy: compares outcome ratings with predicted scores.
 */
function detectPredictionAccuracy(
  decisions: Decision[],
  outcomes: DecisionOutcome[],
): DecisionPattern[] {
  const comparisons = buildComparisons(decisions, outcomes);
  if (comparisons.length < 2) return [];

  const patterns: DecisionPattern[] = [];

  const deltaBias = detectDeltaBias(comparisons);
  if (deltaBias) patterns.push(deltaBias);

  const directionBias = detectConsistentDirection(comparisons);
  if (directionBias) patterns.push(directionBias);

  return patterns;
}

/**
 * 4. Criterion reuse: frequency analysis of criterion names across decisions.
 */
function detectCriterionReuse(decisions: Decision[]): DecisionPattern[] {
  const patterns: DecisionPattern[] = [];
  const nameCounts = new Map<string, number>();

  for (const decision of decisions) {
    for (const criterion of decision.criteria) {
      const name = criterion.name.toLowerCase().trim();
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }
  }

  // Find criteria used in >= 50% of decisions
  const reused: Array<{ name: string; count: number }> = [];
  for (const [name, count] of nameCounts) {
    if (count >= 2 && count / decisions.length >= 0.5) {
      reused.push({ name, count });
    }
  }

  if (reused.length > 0) {
    reused.sort((a, b) => b.count - a.count);
    patterns.push({
      id: generateId(),
      type: "criterion-reuse",
      title: "Recurring Decision Criteria",
      description:
        `You frequently use the same criteria across decisions: ` +
        reused.map((r) => `"${r.name}" (${r.count}x)`).join(", ") +
        ". These seem to be core values driving your decisions.",
      confidence: Math.min(1, reused[0].count / decisions.length),
      evidence: reused.map(
        (r) => `"${r.name}" used in ${r.count}/${decisions.length} decisions`,
      ),
    });
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Detect patterns across a user's decision history.
 * Returns an empty array if fewer than MIN_DECISIONS are provided.
 */
export function detectPatterns(
  decisions: Decision[],
  outcomes: DecisionOutcome[] = [],
): DecisionPattern[] {
  if (decisions.length < MIN_DECISIONS) return [];

  return [
    ...detectScoringBias(decisions),
    ...detectWeightPreference(decisions),
    ...detectPredictionAccuracy(decisions, outcomes),
    ...detectCriterionReuse(decisions),
  ];
}
