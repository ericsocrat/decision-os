/**
 * Cognitive Bias Detection Engine
 *
 * Analyzes a Decision for 7 documented cognitive biases and returns
 * actionable warnings. Based on research from Kahneman & Tversky (1974),
 * Hammond, Keeney & Raiffa (1999), and decision-analysis literature.
 */

import type { Decision } from "./types";
import { normalizeWeights, effectiveScore, computeResults } from "./scoring";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type BiasType =
  | "halo-effect"
  | "uniformity-bias"
  | "score-anchoring"
  | "weight-uniformity"
  | "missing-differentiation"
  | "extreme-scores"
  | "single-criterion-dominance";

export type BiasSeverity = "info" | "warning" | "critical";

export interface BiasWarning {
  type: BiasType;
  severity: BiasSeverity;
  title: string;
  description: string;
  affectedOptions?: string[];
  affectedCriteria?: string[];
  suggestion: string;
}

/* ------------------------------------------------------------------ */
/*  Thresholds (tunable)                                               */
/* ------------------------------------------------------------------ */

const HALO_THRESHOLD = 0.8; // option scores highest on ≥80% of criteria
const UNIFORMITY_RANGE = 2; // all scores within a range of ≤2
const ANCHOR_FRACTION = 0.6; // >60% of scores equal the same value
const WEIGHT_UNIFORMITY_RANGE = 10; // all weights within 10 of each other
const DIFFERENTIATION_THRESHOLD = 0.02; // total scores within 2%
const EXTREME_FRACTION = 0.5; // >50% of scores are 0 or 10

/* ------------------------------------------------------------------ */
/*  Detection Functions                                                */
/* ------------------------------------------------------------------ */

function detectHaloEffect(decision: Decision): BiasWarning[] {
  const warnings: BiasWarning[] = [];
  const { options, criteria, scores } = decision;
  if (options.length < 2 || criteria.length < 2) return warnings;

  for (const opt of options) {
    let highestCount = 0;
    for (const crit of criteria) {
      const optScore = scores[opt.id]?.[crit.id] ?? 0;
      const isHighest = options.every((other) => {
        if (other.id === opt.id) return true;
        return (scores[other.id]?.[crit.id] ?? 0) <= optScore;
      });
      if (isHighest) highestCount++;
    }
    const ratio = highestCount / criteria.length;
    if (ratio >= HALO_THRESHOLD) {
      warnings.push({
        type: "halo-effect",
        severity: "warning",
        title: `Possible halo effect on "${opt.name}"`,
        description: `"${opt.name}" scores highest on ${highestCount} of ${criteria.length} criteria. This may indicate the halo effect — where a positive impression on one dimension colors all evaluations.`,
        affectedOptions: [opt.id],
        suggestion: `Consider: Would an impartial observer rate "${opt.name}" highest on every criterion?`,
      });
    }
  }
  return warnings;
}

function detectUniformityBias(decision: Decision): BiasWarning[] {
  const warnings: BiasWarning[] = [];
  const { options, criteria, scores } = decision;
  if (criteria.length < 2) return warnings;

  for (const opt of options) {
    const optScores = criteria.map((c) => scores[opt.id]?.[c.id] ?? 0);
    const min = Math.min(...optScores);
    const max = Math.max(...optScores);
    if (max - min <= UNIFORMITY_RANGE && optScores.length >= 2) {
      warnings.push({
        type: "uniformity-bias",
        severity: "info",
        title: `Narrow score range for "${opt.name}"`,
        description: `All scores for "${opt.name}" fall between ${min} and ${max}. This narrow clustering suggests no real differentiation across criteria.`,
        affectedOptions: [opt.id],
        suggestion: `Consider whether there are criteria where "${opt.name}" truly excels or underperforms. Wider score ranges produce more meaningful rankings.`,
      });
    }
  }
  return warnings;
}

function detectScoreAnchoring(decision: Decision): BiasWarning[] {
  const { options, criteria, scores } = decision;
  if (options.length < 2 || criteria.length < 2) return [];

  const allScores: number[] = [];
  for (const opt of options) {
    for (const crit of criteria) {
      allScores.push(scores[opt.id]?.[crit.id] ?? 0);
    }
  }
  if (allScores.length < 4) return [];

  // Find the mode (most common value)
  const freq = new Map<number, number>();
  for (const s of allScores) {
    freq.set(s, (freq.get(s) ?? 0) + 1);
  }
  let modeValue = 0;
  let modeCount = 0;
  for (const [val, count] of freq) {
    if (count > modeCount) {
      modeValue = val;
      modeCount = count;
    }
  }

  if (modeCount / allScores.length > ANCHOR_FRACTION) {
    return [
      {
        type: "score-anchoring",
        severity: "warning",
        title: "Score anchoring detected",
        description: `${modeCount} of ${allScores.length} scores are ${modeValue}. This clustering pattern suggests the first score entered may have anchored subsequent evaluations.`,
        suggestion: `Try scoring each criterion independently. Cover the other scores and evaluate each option-criterion pair on its own.`,
      },
    ];
  }
  return [];
}

function detectWeightUniformity(decision: Decision): BiasWarning[] {
  const { criteria } = decision;
  if (criteria.length < 2) return [];

  const weights = criteria.map((c) => c.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);

  if (max - min <= WEIGHT_UNIFORMITY_RANGE) {
    return [
      {
        type: "weight-uniformity",
        severity: "info",
        title: "All criteria weighted equally",
        description: `All ${criteria.length} criteria have weights within ${WEIGHT_UNIFORMITY_RANGE} points of each other. Are all factors truly equally important?`,
        affectedCriteria: criteria.map((c) => c.id),
        suggestion: `If one criterion matters twice as much as another, the weights should reflect that. Consider ranking your criteria by importance.`,
      },
    ];
  }
  return [];
}

function detectMissingDifferentiation(decision: Decision): BiasWarning[] {
  const warnings: BiasWarning[] = [];
  const results = computeResults(decision);
  const { optionResults } = results;
  if (optionResults.length < 2) return warnings;

  const maxScore = optionResults[0]?.totalScore ?? 0;
  if (maxScore === 0) return warnings;

  for (let i = 0; i < optionResults.length - 1; i++) {
    const a = optionResults[i];
    const b = optionResults[i + 1];
    const diff = Math.abs(a.totalScore - b.totalScore);
    if (diff / maxScore < DIFFERENTIATION_THRESHOLD && a.totalScore > 0) {
      warnings.push({
        type: "missing-differentiation",
        severity: "warning",
        title: `"${a.optionName}" and "${b.optionName}" are nearly tied`,
        description: `These options score within ${((diff / maxScore) * 100).toFixed(1)}% of each other (${a.totalScore.toFixed(2)} vs ${b.totalScore.toFixed(2)}). The difference may not be meaningful.`,
        affectedOptions: [a.optionId, b.optionId],
        suggestion: `Consider: Is there a "tiebreaker" criterion you haven't included? Or are these options genuinely interchangeable?`,
      });
    }
  }
  return warnings;
}

function detectExtremeScores(decision: Decision): BiasWarning[] {
  const warnings: BiasWarning[] = [];
  const { options, criteria, scores } = decision;
  if (criteria.length < 2) return warnings;

  for (const opt of options) {
    const optScores = criteria.map((c) => scores[opt.id]?.[c.id] ?? 0);
    const extremeCount = optScores.filter((s) => s === 0 || s === 10).length;
    if (extremeCount / optScores.length > EXTREME_FRACTION && optScores.length >= 2) {
      warnings.push({
        type: "extreme-scores",
        severity: "info",
        title: `Many extreme scores for "${opt.name}"`,
        description: `"${opt.name}" has ${extremeCount} of ${optScores.length} scores at 0 or 10. Real-world options rarely are perfect or terrible on most dimensions.`,
        affectedOptions: [opt.id],
        suggestion: `Consider more nuanced scoring. A 2 is meaningfully different from a 0, and an 8 is different from a 10.`,
      });
    }
  }
  return warnings;
}

function detectSingleCriterionDominance(decision: Decision): BiasWarning[] {
  const { options, criteria, scores } = decision;
  if (options.length < 2 || criteria.length < 2) return [];

  const weights = criteria.map((c) => c.weight);
  const nw = normalizeWeights(weights);
  const results = computeResults(decision);
  const { optionResults } = results;
  if (optionResults.length < 2) return [];

  const winnerId = optionResults[0].optionId;

  // For each criterion, check if removing it changes the winner
  for (let ci = 0; ci < criteria.length; ci++) {
    const crit = criteria[ci];
    if (nw[ci] < 0.25) continue; // Only check high-weight criteria (≥25%)

    // Recompute without this criterion
    const remainingCriteria = criteria.filter((c) => c.id !== crit.id);
    if (remainingCriteria.length === 0) continue;

    const remainingWeights = remainingCriteria.map((c) => c.weight);
    const remainingNw = normalizeWeights(remainingWeights);

    let newWinnerId = "";
    let newWinnerScore = -1;

    for (const opt of options) {
      let total = 0;
      for (let ri = 0; ri < remainingCriteria.length; ri++) {
        const rc = remainingCriteria[ri];
        const raw = scores[opt.id]?.[rc.id] ?? 0;
        total += effectiveScore(raw, rc.type) * remainingNw[ri];
      }
      if (total > newWinnerScore) {
        newWinnerScore = total;
        newWinnerId = opt.id;
      }
    }

    if (newWinnerId !== winnerId) {
      return [
        {
          type: "single-criterion-dominance",
          severity: "critical",
          title: `Rankings depend on "${crit.name}"`,
          description: `Removing the "${crit.name}" criterion (weight: ${crit.weight}) would change the winner. The entire decision hinges on this one factor.`,
          affectedCriteria: [crit.id],
          suggestion: `How confident are you in your "${crit.name}" scores? Consider double-checking those evaluations and using sensitivity analysis.`,
        },
      ];
    }
  }
  return [];
}

/* ------------------------------------------------------------------ */
/*  Main Detection Function                                            */
/* ------------------------------------------------------------------ */

export function detectBiases(decision: Decision): BiasWarning[] {
  // Guard: need minimum data to detect anything
  if (decision.options.length < 2 || decision.criteria.length < 1) {
    return [];
  }

  return [
    ...detectHaloEffect(decision),
    ...detectUniformityBias(decision),
    ...detectScoreAnchoring(decision),
    ...detectWeightUniformity(decision),
    ...detectMissingDifferentiation(decision),
    ...detectExtremeScores(decision),
    ...detectSingleCriterionDominance(decision),
  ];
}
