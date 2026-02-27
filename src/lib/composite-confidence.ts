/**
 * Composite Confidence Model
 *
 * Unifies four confidence signals into a single actionable metric:
 *   1. **Score confidence** — Average per-score confidence from user annotations
 *   2. **Algorithm agreement** — Kendall's W from the consensus engine
 *   3. **Structural quality** — Overall score from decision quality indicators
 *   4. **Data confidence** — Average data tier confidence (placeholder for future enrichment)
 *
 * Default weights: algorithm agreement (40%) + score confidence (25%)
 *   + data confidence (20%) + structural quality (15%).
 *
 * @see https://github.com/ericsocrat/decision-os/issues/118
 */

import type { Confidence, Decision } from "./types";
import { resolveConfidence } from "./scoring";
import { computeConsensus, type ConsensusResult } from "./consensus";
import { assessDecisionQuality, type QualityAssessment } from "./decision-quality";

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

/** Breakdown of each confidence signal contributing to the composite. */
export interface ConfidenceBreakdown {
  /** Average per-score confidence mapped to 0–1 (high=1, medium=0.7, low=0.4). */
  scoreConfidence: number;
  /** Kendall's W from multi-algorithm consensus (0–1). */
  algorithmAgreement: number;
  /** Decision quality overall score mapped to 0–1. */
  structuralQuality: number;
  /** Average data tier confidence (0–1). Defaults to 0 when no enrichment data is present. */
  dataConfidence: number;
  /** Weighted composite of all signals (0–1). */
  composite: number;
}

/** Weights for each confidence signal component. Must sum to 1. */
export interface ConfidenceWeights {
  algorithmAgreement: number;
  scoreConfidence: number;
  dataConfidence: number;
  structuralQuality: number;
}

/** Traffic-light confidence level derived from composite score. */
export type ConfidenceLevel = "high" | "moderate" | "low";

/** Full composite confidence result. */
export interface CompositeConfidenceResult {
  breakdown: ConfidenceBreakdown;
  level: ConfidenceLevel;
  label: string;
  suggestion: string;
  weights: ConfidenceWeights;
}

// ---------------------------------------------------------------------------
//  Defaults
// ---------------------------------------------------------------------------

/** Default weights per the issue spec. */
export const DEFAULT_WEIGHTS: ConfidenceWeights = {
  algorithmAgreement: 0.4,
  scoreConfidence: 0.25,
  dataConfidence: 0.2,
  structuralQuality: 0.15,
};

// ---------------------------------------------------------------------------
//  Confidence mapping
// ---------------------------------------------------------------------------

const CONFIDENCE_TO_NUMERIC: Record<Confidence, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
};

// ---------------------------------------------------------------------------
//  Signal computation
// ---------------------------------------------------------------------------

/**
 * Compute average score confidence from all score cells in a decision.
 * Cells without explicit confidence default to "high" (1.0).
 * Returns 1.0 if no scores exist.
 */
export function computeScoreConfidence(decision: Decision): number {
  const scores = decision.scores;
  if (!scores) return 1.0;

  let total = 0;
  let count = 0;

  for (const optionId of Object.keys(scores)) {
    const optionScores = scores[optionId];
    if (!optionScores) continue;
    for (const criterionId of Object.keys(optionScores)) {
      const sv = optionScores[criterionId];
      const confidence = resolveConfidence(sv);
      total += confidence ? CONFIDENCE_TO_NUMERIC[confidence] : 1.0;
      count++;
    }
  }

  return count > 0 ? total / count : 1.0;
}

/**
 * Derive structural quality signal from the quality assessment's overall score.
 * Maps 0–100 to 0–1.
 */
export function computeStructuralQuality(quality: QualityAssessment): number {
  return Math.min(1, Math.max(0, quality.overallScore / 100));
}

// ---------------------------------------------------------------------------
//  Core: computeCompositeConfidence
// ---------------------------------------------------------------------------

/**
 * Compute the composite confidence score unifying all available signals.
 *
 * @param decision — The decision to analyze.
 * @param consensus — Pre-computed consensus result (optional; computed if omitted).
 * @param quality — Pre-computed quality assessment (optional; computed if omitted).
 * @param dataConfidence — External data confidence (0–1). Defaults to 0 when no enrichment.
 * @param weights — Custom signal weights. Defaults to DEFAULT_WEIGHTS.
 * @returns Full composite confidence result with breakdown and suggestions.
 */
export function computeCompositeConfidence(
  decision: Decision,
  consensus?: ConsensusResult | null,
  quality?: QualityAssessment | null,
  dataConfidence: number = 0,
  weights: ConfidenceWeights = DEFAULT_WEIGHTS
): CompositeConfidenceResult {
  // Compute signals
  const scoreConf = computeScoreConfidence(decision);

  const effectiveConsensus =
    consensus ?? (decision.options.length >= 2 ? computeConsensus(decision) : null);
  const algoAgreement = effectiveConsensus?.overallAgreement ?? 1.0;

  const effectiveQuality = quality ?? assessDecisionQuality(decision);
  const structQuality = computeStructuralQuality(effectiveQuality);

  const dataConf = Math.min(1, Math.max(0, dataConfidence));

  // Weighted composite
  const composite =
    weights.algorithmAgreement * algoAgreement +
    weights.scoreConfidence * scoreConf +
    weights.dataConfidence * dataConf +
    weights.structuralQuality * structQuality;

  // Clamp to [0, 1]
  const clampedComposite = Math.min(1, Math.max(0, composite));

  const breakdown: ConfidenceBreakdown = {
    scoreConfidence: scoreConf,
    algorithmAgreement: algoAgreement,
    structuralQuality: structQuality,
    dataConfidence: dataConf,
    composite: clampedComposite,
  };

  // Traffic light level
  const level = classifyLevel(clampedComposite);
  const label = levelLabel(level);
  const suggestion = levelSuggestion(level, breakdown);

  return { breakdown, level, label, suggestion, weights };
}

// ---------------------------------------------------------------------------
//  Level classification
// ---------------------------------------------------------------------------

/** Classify composite score into a traffic-light level. */
export function classifyLevel(composite: number): ConfidenceLevel {
  if (composite >= 0.7) return "high";
  if (composite >= 0.4) return "moderate";
  return "low";
}

function levelLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "High confidence recommendation";
    case "moderate":
      return "Moderate confidence — consider reviewing low-confidence scores";
    case "low":
      return "Low confidence — significant uncertainty in this decision";
  }
}

function levelSuggestion(level: ConfidenceLevel, breakdown: ConfidenceBreakdown): string {
  if (level === "high") {
    return "This decision has strong supporting evidence across multiple signals.";
  }

  // Identify weakest signal
  const signals: { name: string; value: number; advice: string }[] = [
    {
      name: "Score confidence",
      value: breakdown.scoreConfidence,
      advice: "annotate scores with confidence levels",
    },
    {
      name: "Algorithm agreement",
      value: breakdown.algorithmAgreement,
      advice: "review criteria weights to reduce algorithmic divergence",
    },
    {
      name: "Data confidence",
      value: breakdown.dataConfidence,
      advice: "add data-backed evidence where possible",
    },
    {
      name: "Structural quality",
      value: breakdown.structuralQuality,
      advice: "add more options/criteria and fill all score cells",
    },
  ];

  const weakest = signals.sort((a, b) => a.value - b.value)[0];
  return `To improve confidence, ${weakest.advice}. (${weakest.name}: ${(weakest.value * 100).toFixed(0)}%)`;
}
