/**
 * Decision OS — Deterministic Scoring Engine
 *
 * Implements the weighted-sum scoring model:
 *   1. Normalize criterion weights so they sum to 1.0
 *   2. For each option, compute: Σ(normalizedWeight_i × effectiveScore_i)
 *      - benefit criterion: effectiveScore = rawScore
 *      - cost criterion:    effectiveScore = 10 - rawScore
 *   3. Rank options by totalScore descending; ties broken by insertion order.
 *   4. Display scores rounded to 2 decimal places.
 *
 * See docs/SCORING_MODEL.md for full specification and examples.
 */

import type {
  Confidence,
  ConfidenceStrategy,
  Criterion,
  CriterionScore,
  Decision,
  DecisionResults,
  OptionResult,
  ScoreMatrix,
  ScoreValue,
  ScoredCell,
  SensitivityAnalysis,
  SensitivityPoint,
  TopDriver,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum raw score a user can assign */
export const MAX_SCORE = 10;

/** Decimal places for displayed scores */
export const DISPLAY_PRECISION = 2;

// ---------------------------------------------------------------------------
// ScoreValue helpers
// ---------------------------------------------------------------------------

/**
 * Extract the raw numeric value from a ScoreValue.
 * - `null` → `null` (not scored)
 * - `number` → the number
 * - `ScoredCell` → its `.value`
 */
export function resolveScoreValue(sv: ScoreValue | undefined): number | null {
  if (sv === null || sv === undefined) return null;
  if (typeof sv === "number") return sv;
  return sv.value;
}

/**
 * Extract the confidence level from a ScoreValue.
 * - `null` / `undefined` → `null`
 * - plain `number` → "high" (default)
 * - `ScoredCell` → its `.confidence`
 */
export function resolveConfidence(sv: ScoreValue | undefined): Confidence | null {
  if (sv === null || sv === undefined) return null;
  if (typeof sv === "number") return "high";
  return sv.confidence;
}

/**
 * Check whether a ScoreValue is a ScoredCell (object with value + confidence).
 */
export function isScoredCell(sv: ScoreValue | undefined): sv is ScoredCell {
  return typeof sv === "object" && sv !== null && "value" in sv && "confidence" in sv;
}

/**
 * Read a score cell from the matrix, returning `null` if not scored.
 */
export function readScore(
  scores: ScoreMatrix,
  optionId: string,
  criterionId: string
): number | null {
  return resolveScoreValue(scores[optionId]?.[criterionId]);
}

/**
 * Read a score cell, defaulting `null` to 0 for backward compatibility
 * in contexts that cannot handle nulls (e.g. comparison, bias detection).
 */
export function readScoreOrZero(
  scores: ScoreMatrix,
  optionId: string,
  criterionId: string
): number {
  return resolveScoreValue(scores[optionId]?.[criterionId]) ?? 0;
}

// ---------------------------------------------------------------------------
// Weight normalization
// ---------------------------------------------------------------------------

/**
 * Confidence-level multiplier map.
 * Used by the "penalize" strategy to scale effective scores.
 */
export const CONFIDENCE_MULTIPLIERS: Record<Confidence, number> = {
  high: 1.0,
  medium: 0.8,
  low: 0.5,
};

/**
 * Return the multiplier for a given confidence and strategy.
 * - `none` → always 1.0 (no adjustment)
 * - `penalize` → CONFIDENCE_MULTIPLIERS lookup
 * - `widen` → 1.0 (handled elsewhere in MC distribution)
 */
export function confidenceMultiplier(
  confidence: Confidence | null,
  strategy: ConfidenceStrategy
): number {
  if (strategy !== "penalize" || !confidence) return 1.0;
  return CONFIDENCE_MULTIPLIERS[confidence];
}

/**
 * Compute a confidence-adjusted effective score.
 * Applies the multiplier to an already-computed effective score.
 */
export function confidenceAdjustedScore(
  effectiveScoreValue: number,
  confidence: Confidence | null,
  strategy: ConfidenceStrategy
): number {
  return effectiveScoreValue * confidenceMultiplier(confidence, strategy);
}

/**
 * Normalize an array of raw weights so they sum to 1.0.
 * If all weights are 0, returns equal weights (1/n each).
 * Guarantees: no NaN, no Infinity, all values ≥ 0.
 */
export function normalizeWeights(weights: number[]): number[] {
  if (weights.length === 0) return [];

  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);

  if (total === 0) {
    const equal = 1 / weights.length;
    return weights.map(() => equal);
  }

  return weights.map((w) => Math.max(0, w) / total);
}

// ---------------------------------------------------------------------------
// Effective score
// ---------------------------------------------------------------------------

/**
 * Compute the effective score for a criterion.
 * - benefit: score as-is (clamped 0–10)
 * - cost:    10 - score (inverted so lower cost = higher effective score)
 */
export function effectiveScore(rawScore: number, criterionType: "benefit" | "cost"): number {
  const clamped = Math.max(0, Math.min(MAX_SCORE, rawScore));
  return criterionType === "cost" ? MAX_SCORE - clamped : clamped;
}

// ---------------------------------------------------------------------------
// Core scoring
// ---------------------------------------------------------------------------

/**
 * Score a single option across all criteria.
 * Returns the total weighted score and per-criterion breakdown.
 *
 * Null scores are excluded: the option's total is normalized by
 * the sum of weights for scored criteria only, so unscored cells
 * don't silently bias the result.
 *
 * Formula: score_i = Σ(w_j · e_ij) / Σ(w_j)  for j ∈ scored criteria
 * When all criteria are scored, Σ(w_j) = 1.0, so results are identical
 * to the original behavior (backward compatible).
 */
export function scoreOption(
  optionId: string,
  optionName: string,
  criteria: Criterion[],
  scores: ScoreMatrix,
  normalizedWeights: number[],
  strategy: ConfidenceStrategy = "none"
): OptionResult {
  const criterionScores: CriterionScore[] = criteria.map((criterion, i) => {
    const raw = readScore(scores, optionId, criterion.id);
    const numericRaw = raw ?? 0;
    const eff = effectiveScore(numericRaw, criterion.type);
    const nw = normalizedWeights[i];
    const conf = resolveConfidence(scores[optionId]?.[criterion.id]);
    const mult = confidenceMultiplier(conf, strategy);
    const adjusted = eff * mult;

    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      rawScore: numericRaw,
      normalizedWeight: nw,
      effectiveScore: roundDisplay(adjusted * nw),
      criterionType: criterion.type,
      isNull: raw === null,
      confidence: conf ?? undefined,
      confidenceMultiplier: mult,
    };
  });

  // Accumulate only scored criteria; normalize by their weight sum
  let scoredWeightSum = 0;
  let weightedSum = 0;

  criteria.forEach((criterion, i) => {
    const raw = readScore(scores, optionId, criterion.id);
    if (raw !== null) {
      const eff = effectiveScore(raw, criterion.type);
      const conf = resolveConfidence(scores[optionId]?.[criterion.id]);
      const mult = confidenceMultiplier(conf, strategy);
      weightedSum += eff * mult * normalizedWeights[i];
      scoredWeightSum += normalizedWeights[i];
    }
  });

  const totalScore = roundDisplay(scoredWeightSum > 0 ? weightedSum / scoredWeightSum : 0);

  return {
    optionId,
    optionName,
    totalScore,
    rank: 0,
    criterionScores,
  };
}

/**
 * Compute full results for a decision.
 * Returns ranked options and top drivers.
 */
export function computeResults(decision: Decision): DecisionResults {
  const { criteria, options, scores } = decision;
  const strategy = decision.confidenceStrategy ?? "none";

  if (criteria.length === 0 || options.length === 0) {
    return {
      decisionId: decision.id,
      optionResults: [],
      topDrivers: [],
    };
  }

  const rawWeights = criteria.map((c) => c.weight);
  const nw = normalizeWeights(rawWeights);

  // Score each option
  const results: OptionResult[] = options.map((opt) =>
    scoreOption(opt.id, opt.name, criteria, scores, nw, strategy)
  );

  // Sort descending by totalScore; stable sort preserves insertion order for ties
  results.sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks (1-based)
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  // Compute top drivers (criteria sorted by normalized weight descending)
  const topDrivers = computeTopDrivers(criteria, nw);

  return {
    decisionId: decision.id,
    optionResults: results,
    topDrivers,
  };
}

// ---------------------------------------------------------------------------
// Top drivers
// ---------------------------------------------------------------------------

/**
 * Identify the top criteria that most influence the outcome.
 * Returns criteria sorted by weight, with impact descriptions.
 */
export function computeTopDrivers(criteria: Criterion[], normalizedWeights: number[]): TopDriver[] {
  const indexed = criteria.map((c, i) => ({
    criterion: c,
    nw: normalizedWeights[i],
  }));

  indexed.sort((a, b) => b.nw - a.nw);

  return indexed.map(({ criterion, nw }) => ({
    criterionId: criterion.id,
    criterionName: criterion.name,
    normalizedWeight: roundDisplay(nw),
    impactDescription: `${criterion.name} accounts for ${roundDisplay(nw * 100)}% of the total weight (${criterion.type}).`,
  }));
}

// ---------------------------------------------------------------------------
// Sensitivity analysis — weight swing
// ---------------------------------------------------------------------------

/**
 * Perform weight-swing sensitivity analysis.
 *
 * For each criterion, adjust its weight by ±swingPercent (of its current value)
 * and recompute the winner. Reports whether the winner changes.
 *
 * @param decision - The decision to analyze
 * @param swingPercent - Percentage to swing each weight (default: 20 = ±20%)
 * @returns SensitivityAnalysis with points and summary
 */
export function sensitivityAnalysis(
  decision: Decision,
  swingPercent: number = 20
): SensitivityAnalysis {
  const baseResults = computeResults(decision);
  if (baseResults.optionResults.length === 0) {
    return { decisionId: decision.id, points: [], summary: "No options to analyze." };
  }

  const originalWinner = baseResults.optionResults[0].optionName;
  const points: SensitivityPoint[] = [];

  const swingFactor = swingPercent / 100;

  for (const criterion of decision.criteria) {
    // Swing UP
    const upWeight = criterion.weight * (1 + swingFactor);
    const upDecision = applyWeightOverride(decision, criterion.id, upWeight);
    const upResults = computeResults(upDecision);
    const upWinner =
      upResults.optionResults.length > 0 ? upResults.optionResults[0].optionName : originalWinner;

    points.push({
      criterionId: criterion.id,
      criterionName: criterion.name,
      originalWeight: criterion.weight,
      adjustedWeight: roundDisplay(upWeight),
      originalWinner,
      newWinner: upWinner,
      winnerChanged: upWinner !== originalWinner,
    });

    // Swing DOWN
    const downWeight = Math.max(0, criterion.weight * (1 - swingFactor));
    const downDecision = applyWeightOverride(decision, criterion.id, downWeight);
    const downResults = computeResults(downDecision);
    const downWinner =
      downResults.optionResults.length > 0
        ? downResults.optionResults[0].optionName
        : originalWinner;

    points.push({
      criterionId: criterion.id,
      criterionName: criterion.name,
      originalWeight: criterion.weight,
      adjustedWeight: roundDisplay(downWeight),
      originalWinner,
      newWinner: downWinner,
      winnerChanged: downWinner !== originalWinner,
    });
  }

  const changedCount = points.filter((p) => p.winnerChanged).length;
  const summary =
    changedCount === 0
      ? `The current winner "${originalWinner}" is robust — no single weight swing of ±${swingPercent}% changes the outcome.`
      : `${changedCount} weight swing(s) out of ${points.length} would change the winner from "${originalWinner}".`;

  return { decisionId: decision.id, points, summary };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a modified copy of a decision with one criterion's weight overridden.
 * Pure function — does not mutate the original.
 */
export function applyWeightOverride(
  decision: Decision,
  criterionId: string,
  newWeight: number
): Decision {
  return {
    ...decision,
    criteria: decision.criteria.map((c) =>
      c.id === criterionId ? { ...c, weight: newWeight } : c
    ),
  };
}

/**
 * Round a number to DISPLAY_PRECISION decimal places.
 * Uses banker's rounding (round half to even) via toFixed.
 */
export function roundDisplay(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(DISPLAY_PRECISION));
}
