/**
 * Decision Comparison Engine
 *
 * Pure functions to compare two decisions side-by-side.
 * Matches options and criteria by name (case-insensitive, trimmed),
 * computes rank/score deltas, divergence heatmap, and agreement score.
 */

import type { Decision } from "./types";
import { computeResults, readScoreOrZero } from "./scoring";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SharedOption {
  optionName: string;
  rankA: number;
  rankB: number;
  scoreA: number;
  scoreB: number;
  rankDelta: number; // B.rank - A.rank (negative = improved in B)
  scoreDelta: number; // B.score - A.score
}

export interface SharedCriterion {
  criterionName: string;
  weightA: number; // normalized 0–1
  weightB: number;
  weightDelta: number; // B - A
}

export interface ScoreMatrixEntry {
  optionName: string;
  criterionName: string;
  scoreA: number;
  scoreB: number;
  delta: number; // B - A
}

export type AgreementLabel = "strong" | "moderate" | "weak";

export interface ComparisonResult {
  sharedOptions: SharedOption[];
  onlyInA: string[];
  onlyInB: string[];
  sharedCriteria: SharedCriterion[];
  onlyCriteriaInA: string[];
  onlyCriteriaInB: string[];
  scoreMatrix: ScoreMatrixEntry[];
  agreementScore: number; // 0.0–1.0
  agreementLabel: AgreementLabel;
  summary: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a name for matching: lowercase + trimmed */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Get agreement label from score */
export function getAgreementLabel(score: number): AgreementLabel {
  if (score >= 0.8) return "strong";
  if (score >= 0.5) return "moderate";
  return "weak";
}

/**
 * Compute Spearman's rank correlation coefficient.
 * Returns a value between -1 and 1, where 1 = perfect agreement.
 * For comparison purposes, we map this to 0–1 range: (ρ + 1) / 2.
 */
export function spearmanRankCorrelation(ranksA: number[], ranksB: number[]): number {
  const n = ranksA.length;
  if (n <= 1) return 1; // Perfect agreement for 0 or 1 item

  const sumD2 = ranksA.reduce((sum, rA, i) => {
    const d = rA - ranksB[i];
    return sum + d * d;
  }, 0);

  // Spearman's ρ = 1 - (6 * Σd²) / (n * (n² - 1))
  const rho = 1 - (6 * sumD2) / (n * (n * n - 1));

  // Map from [-1, 1] to [0, 1] for display as agreement percentage
  return Math.max(0, Math.min(1, (rho + 1) / 2));
}

/**
 * Get the divergence color category for a score delta.
 * - green: |Δ| ≤ 1 (agreement)
 * - yellow: |Δ| = 2–3 (moderate divergence)
 * - red: |Δ| ≥ 4 (disagreement)
 */
export function getDivergenceColor(delta: number): "green" | "yellow" | "red" {
  const abs = Math.abs(delta);
  if (abs <= 1) return "green";
  if (abs <= 3) return "yellow";
  return "red";
}

// ---------------------------------------------------------------------------
// Core comparison
// ---------------------------------------------------------------------------

/**
 * Compare two decisions and produce a full comparison result.
 * Both decisions are scored independently using computeResults().
 * Options and criteria are matched by name (case-insensitive, trimmed).
 */
export function compareDecisions(decA: Decision, decB: Decision): ComparisonResult {
  // Compute results for both decisions
  const resultsA = computeResults(decA);
  const resultsB = computeResults(decB);

  // Build name → result maps for options
  const optMapA = new Map(resultsA.optionResults.map((r) => [normalizeName(r.optionName), r]));
  const optMapB = new Map(resultsB.optionResults.map((r) => [normalizeName(r.optionName), r]));

  // Shared options (matched by normalized name)
  const sharedOptions: SharedOption[] = [];
  const onlyInA: string[] = [];
  const onlyInB: string[] = [];

  for (const [key, rA] of optMapA) {
    const rB = optMapB.get(key);
    if (rB) {
      sharedOptions.push({
        optionName: rA.optionName, // preserve original casing from A
        rankA: rA.rank,
        rankB: rB.rank,
        scoreA: rA.totalScore,
        scoreB: rB.totalScore,
        rankDelta: rB.rank - rA.rank,
        scoreDelta: parseFloat((rB.totalScore - rA.totalScore).toFixed(2)),
      });
    } else {
      onlyInA.push(rA.optionName);
    }
  }

  for (const [key, rB] of optMapB) {
    if (!optMapA.has(key)) {
      onlyInB.push(rB.optionName);
    }
  }

  // Sort shared options by rank A for consistent display
  sharedOptions.sort((a, b) => a.rankA - b.rankA);

  // Build criteria maps — normalize weights for comparison
  const totalWeightA = decA.criteria.reduce((s, c) => s + Math.max(0, c.weight), 0);
  const totalWeightB = decB.criteria.reduce((s, c) => s + Math.max(0, c.weight), 0);

  const critMapA = new Map(
    decA.criteria.map((c) => [
      normalizeName(c.name),
      {
        name: c.name,
        normalizedWeight: totalWeightA > 0 ? c.weight / totalWeightA : 0,
        criterion: c,
      },
    ])
  );
  const critMapB = new Map(
    decB.criteria.map((c) => [
      normalizeName(c.name),
      {
        name: c.name,
        normalizedWeight: totalWeightB > 0 ? c.weight / totalWeightB : 0,
        criterion: c,
      },
    ])
  );

  const sharedCriteria: SharedCriterion[] = [];
  const onlyCriteriaInA: string[] = [];
  const onlyCriteriaInB: string[] = [];

  for (const [key, cA] of critMapA) {
    const cB = critMapB.get(key);
    if (cB) {
      sharedCriteria.push({
        criterionName: cA.name,
        weightA: parseFloat((cA.normalizedWeight * 100).toFixed(1)),
        weightB: parseFloat((cB.normalizedWeight * 100).toFixed(1)),
        weightDelta: parseFloat(((cB.normalizedWeight - cA.normalizedWeight) * 100).toFixed(1)),
      });
    } else {
      onlyCriteriaInA.push(cA.name);
    }
  }

  for (const [key, cB] of critMapB) {
    if (!critMapA.has(key)) {
      onlyCriteriaInB.push(cB.name);
    }
  }

  // Score divergence matrix (only for shared options × shared criteria)
  const scoreMatrix: ScoreMatrixEntry[] = [];
  for (const opt of sharedOptions) {
    const optKey = normalizeName(opt.optionName);
    const optionA = decA.options.find((o) => normalizeName(o.name) === optKey);
    const optionB = decB.options.find((o) => normalizeName(o.name) === optKey);
    if (!optionA || !optionB) continue;

    for (const crit of sharedCriteria) {
      const critKey = normalizeName(crit.criterionName);
      const criterionA = decA.criteria.find((c) => normalizeName(c.name) === critKey);
      const criterionB = decB.criteria.find((c) => normalizeName(c.name) === critKey);
      if (!criterionA || !criterionB) continue;

      const sA = readScoreOrZero(decA.scores, optionA.id, criterionA.id);
      const sB = readScoreOrZero(decB.scores, optionB.id, criterionB.id);

      scoreMatrix.push({
        optionName: opt.optionName,
        criterionName: crit.criterionName,
        scoreA: sA,
        scoreB: sB,
        delta: sB - sA,
      });
    }
  }

  // Agreement score based on shared options' rank correlation
  const agreementScore =
    sharedOptions.length > 1
      ? spearmanRankCorrelation(
          sharedOptions.map((o) => o.rankA),
          sharedOptions.map((o) => o.rankB)
        )
      : sharedOptions.length === 1
        ? 1
        : 0;

  const agreementLabel = getAgreementLabel(agreementScore);

  // Summary text
  const rankedDifferently = sharedOptions.filter((o) => o.rankDelta !== 0).length;
  const maxRankChange =
    sharedOptions.length > 0 ? Math.max(...sharedOptions.map((o) => Math.abs(o.rankDelta))) : 0;

  const summary =
    sharedOptions.length === 0
      ? "No shared options found between the two decisions."
      : rankedDifferently === 0
        ? `All ${sharedOptions.length} shared options are ranked identically.`
        : `${rankedDifferently} of ${sharedOptions.length} options are ranked differently. Maximum rank change: ±${maxRankChange}.`;

  return {
    sharedOptions,
    onlyInA,
    onlyInB,
    sharedCriteria,
    onlyCriteriaInA,
    onlyCriteriaInB,
    scoreMatrix,
    agreementScore,
    agreementLabel,
    summary,
  };
}
