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
/** Match options between two result sets by normalized name. */
function matchOptions(
  optMapA: Map<string, { optionName: string; rank: number; totalScore: number }>,
  optMapB: Map<string, { optionName: string; rank: number; totalScore: number }>
): { shared: SharedOption[]; onlyInA: string[]; onlyInB: string[] } {
  const shared: SharedOption[] = [];
  const onlyInA: string[] = [];
  const onlyInB: string[] = [];

  for (const [key, rA] of optMapA) {
    const rB = optMapB.get(key);
    if (rB) {
      shared.push({
        optionName: rA.optionName,
        rankA: rA.rank,
        rankB: rB.rank,
        scoreA: rA.totalScore,
        scoreB: rB.totalScore,
        rankDelta: rB.rank - rA.rank,
        scoreDelta: Number.parseFloat((rB.totalScore - rA.totalScore).toFixed(2)),
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

  shared.sort((a, b) => a.rankA - b.rankA);
  return { shared, onlyInA, onlyInB };
}

/** Build normalized-weight criteria map. */
function buildCriteriaMap(
  criteria: Decision["criteria"]
): Map<string, { name: string; normalizedWeight: number; criterion: Decision["criteria"][0] }> {
  const total = criteria.reduce((s, c) => s + Math.max(0, c.weight), 0);
  return new Map(
    criteria.map((c) => [
      normalizeName(c.name),
      { name: c.name, normalizedWeight: total > 0 ? c.weight / total : 0, criterion: c },
    ])
  );
}

/** Match criteria between two decisions. */
function matchCriteria(
  critMapA: ReturnType<typeof buildCriteriaMap>,
  critMapB: ReturnType<typeof buildCriteriaMap>
): { shared: SharedCriterion[]; onlyInA: string[]; onlyInB: string[] } {
  const shared: SharedCriterion[] = [];
  const onlyInA: string[] = [];
  const onlyInB: string[] = [];

  for (const [key, cA] of critMapA) {
    const cB = critMapB.get(key);
    if (cB) {
      shared.push({
        criterionName: cA.name,
        weightA: Number.parseFloat((cA.normalizedWeight * 100).toFixed(1)),
        weightB: Number.parseFloat((cB.normalizedWeight * 100).toFixed(1)),
        weightDelta: Number.parseFloat(
          ((cB.normalizedWeight - cA.normalizedWeight) * 100).toFixed(1)
        ),
      });
    } else {
      onlyInA.push(cA.name);
    }
  }

  for (const [key, cB] of critMapB) {
    if (!critMapA.has(key)) {
      onlyInB.push(cB.name);
    }
  }

  return { shared, onlyInA, onlyInB };
}

/** Build score divergence matrix for shared options × shared criteria. */
function buildScoreDivergenceMatrix(
  sharedOptions: SharedOption[],
  sharedCriteria: SharedCriterion[],
  decA: Decision,
  decB: Decision
): ScoreMatrixEntry[] {
  const matrix: ScoreMatrixEntry[] = [];

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
      matrix.push({
        optionName: opt.optionName,
        criterionName: crit.criterionName,
        scoreA: sA,
        scoreB: sB,
        delta: sB - sA,
      });
    }
  }

  return matrix;
}

export function compareDecisions(decA: Decision, decB: Decision): ComparisonResult {
  // Compute results for both decisions
  const resultsA = computeResults(decA);
  const resultsB = computeResults(decB);

  // Match options by normalized name
  const optMapA = new Map(resultsA.optionResults.map((r) => [normalizeName(r.optionName), r]));
  const optMapB = new Map(resultsB.optionResults.map((r) => [normalizeName(r.optionName), r]));
  const options = matchOptions(optMapA, optMapB);

  // Match criteria by normalized name
  const critMapA = buildCriteriaMap(decA.criteria);
  const critMapB = buildCriteriaMap(decB.criteria);
  const criteria = matchCriteria(critMapA, critMapB);

  // Score divergence matrix
  const scoreMatrix = buildScoreDivergenceMatrix(options.shared, criteria.shared, decA, decB);

  // Agreement score
  let agreementScore: number;
  if (options.shared.length > 1) {
    agreementScore = spearmanRankCorrelation(
      options.shared.map((o) => o.rankA),
      options.shared.map((o) => o.rankB)
    );
  } else {
    agreementScore = options.shared.length === 1 ? 1 : 0;
  }

  // Summary
  const rankedDifferently = options.shared.filter((o) => o.rankDelta !== 0).length;
  const maxRankChange =
    options.shared.length > 0
      ? Math.max(...options.shared.map((o) => Math.abs(o.rankDelta)))
      : 0;

  let summary: string;
  if (options.shared.length === 0) {
    summary = "No shared options found between the two decisions.";
  } else if (rankedDifferently === 0) {
    summary = `All ${options.shared.length} shared options are ranked identically.`;
  } else {
    summary = `${rankedDifferently} of ${options.shared.length} options are ranked differently. Maximum rank change: ±${maxRankChange}.`;
  }

  return {
    sharedOptions: options.shared,
    onlyInA: options.onlyInA,
    onlyInB: options.onlyInB,
    sharedCriteria: criteria.shared,
    onlyCriteriaInA: criteria.onlyInA,
    onlyCriteriaInB: criteria.onlyInB,
    scoreMatrix,
    agreementScore,
    agreementLabel: getAgreementLabel(agreementScore),
    summary,
  };
}
