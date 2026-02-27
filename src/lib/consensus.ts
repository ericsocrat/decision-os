/**
 * Multi-Algorithm Consensus Engine
 *
 * Runs multiple MCDA algorithms (WSM, TOPSIS, Minimax Regret) on a Decision
 * and produces a unified consensus ranking using Borda count with formal
 * agreement measurement via Kendall's W coefficient of concordance.
 *
 * Key concepts:
 *   - **Borda Count**: Each algorithm awards (n − rank) points per option.
 *     Summed across algorithms to produce a consensus ranking.
 *   - **Kendall's W** (coefficient of concordance): Measures agreement among
 *     multiple rankers (0 = no agreement, 1 = perfect agreement).
 *   - **Divergent Options**: Options where the rank spread across algorithms
 *     exceeds a threshold (default: 2), indicating algorithmic disagreement.
 *
 * @see Kendall, M.G. & Smith, B.B. (1939). The Problem of m Rankings.
 * @see Borda, J.-C. de (1781). Mémoire sur les élections au scrutin.
 */

import type { Decision, DecisionResults, OptionResult } from "./types";
import { computeResults } from "./scoring";
import { computeTopsisResults, type TopsisResults, type TopsisOptionResult } from "./topsis";
import { computeRegretResults, type RegretResults, type RegretOptionResult } from "./regret";

// ---------------------------------------------------------------------------
//  Algorithm identifiers
// ---------------------------------------------------------------------------

/** Supported algorithms for consensus computation. */
export type AlgorithmId = "wsm" | "topsis" | "minimax-regret";

/** All available algorithms. */
export const ALL_ALGORITHMS: readonly AlgorithmId[] = ["wsm", "topsis", "minimax-regret"] as const;

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

/** Ranking produced by an individual algorithm. */
export interface AlgorithmResult {
  algorithmId: AlgorithmId;
  /** Per-option ranking data, sorted by rank ascending. */
  rankings: AlgorithmRanking[];
}

/** Single option's position within an algorithm's result. */
export interface AlgorithmRanking {
  optionId: string;
  /** 1-based rank produced by this algorithm. */
  rank: number;
  /** Algorithm-specific score (WSM total, TOPSIS closeness, regret maxRegret). */
  score: number;
}

/** A single option's consensus ranking entry. */
export interface ConsensusRanking {
  optionId: string;
  optionName: string;
  /** 1-based consensus rank derived from Borda count. */
  consensusRank: number;
  /** Borda score: sum of (n − rank) across all algorithms. 0-based, higher = better. */
  bordaScore: number;
  /** Per-algorithm agreement: 0 (high disagreement) to 1 (perfect agreement).
   *  Defined as 1 − (rankSpread / (n − 1)) where n = number of options. */
  agreementScore: number;
  /** Individual ranks from each algorithm, keyed by AlgorithmId. */
  algorithmRanks: Record<AlgorithmId, number>;
}

/** Full result of the consensus engine. */
export interface ConsensusResult {
  /** Options ranked by consensus (Borda count), ascending by consensusRank. */
  rankings: ConsensusRanking[];
  /** Per-algorithm detailed results. */
  algorithmResults: AlgorithmResult[];
  /** Kendall's W coefficient of concordance: 0 (no agreement) to 1 (perfect). */
  overallAgreement: number;
  /** Option IDs where algorithms disagree significantly (rank spread >= divergenceThreshold). */
  divergentOptions: string[];
  /** Pairwise Spearman rank correlations between algorithms (mapped to [0,1]). */
  pairwiseCorrelations: PairwiseCorrelation[];
  /** How many algorithms participated. */
  algorithmCount: number;
}

/** Pairwise correlation between two algorithms. */
export interface PairwiseCorrelation {
  algorithmA: AlgorithmId;
  algorithmB: AlgorithmId;
  /** Spearman ρ mapped to [0,1]: 0 = perfect disagreement, 1 = perfect agreement. */
  correlation: number;
}

// ---------------------------------------------------------------------------
//  Kendall's W
// ---------------------------------------------------------------------------

/**
 * Compute Kendall's W coefficient of concordance.
 *
 * Given m rankers (algorithms) each producing a ranking of n objects (options),
 * W measures the degree of agreement among the rankers.
 *
 *   W = 12 S / (m² (n³ − n))
 *
 * where S = Σᵢ(Rᵢ − R̄)² and Rᵢ is the sum of ranks for option i across
 * all algorithms.
 *
 * @param rankMatrix - m×n matrix: rankMatrix[rankerIdx][objectIdx] = rank (1-based).
 * @returns W ∈ [0, 1]. Returns 1 for trivial cases (n ≤ 1 or m ≤ 1).
 */
export function kendallW(rankMatrix: number[][]): number {
  const m = rankMatrix.length; // number of rankers (algorithms)
  if (m <= 1) return 1;

  const n = rankMatrix[0]?.length ?? 0; // number of objects (options)
  if (n <= 1) return 1;

  // Compute rank sums per object
  const rankSums: number[] = new Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < m; i++) {
      rankSums[j] += rankMatrix[i][j];
    }
  }

  // Mean rank sum
  const meanRankSum = rankSums.reduce((a, b) => a + b, 0) / n;

  // S = sum of squared deviations from the mean
  const S = rankSums.reduce((acc, rs) => acc + (rs - meanRankSum) ** 2, 0);

  // W = 12S / (m²(n³ − n))
  const denominator = m * m * (n * n * n - n);
  if (denominator === 0) return 1;

  const W = (12 * S) / denominator;

  // Clamp to [0, 1] to handle floating point
  return Math.min(1, Math.max(0, W));
}

// ---------------------------------------------------------------------------
//  Spearman Rank Correlation
// ---------------------------------------------------------------------------

/**
 * Compute Spearman's ρ between two rank vectors and map to [0, 1].
 *
 * ρ = 1 − (6 Σ dᵢ²) / (n(n²−1))
 * Mapped: (ρ + 1) / 2  →  0 = perfect disagreement, 1 = perfect agreement
 *
 * @param ranksA - 1-based ranks for ranker A, indexed by object.
 * @param ranksB - 1-based ranks for ranker B, indexed by object.
 * @returns Mapped correlation ∈ [0, 1]. Returns 1 for trivial cases.
 */
export function spearmanCorrelation(ranksA: number[], ranksB: number[]): number {
  const n = ranksA.length;
  if (n <= 1) return 1;
  if (ranksA.length !== ranksB.length) {
    throw new Error("Rank vectors must have equal length");
  }

  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const d = ranksA[i] - ranksB[i];
    sumD2 += d * d;
  }

  const rho = 1 - (6 * sumD2) / (n * (n * n - 1));

  // Map [-1, 1] → [0, 1]
  return Math.min(1, Math.max(0, (rho + 1) / 2));
}

// ---------------------------------------------------------------------------
//  Borda Count
// ---------------------------------------------------------------------------

/**
 * Compute Borda scores from multiple rank vectors.
 *
 * Each ranker awards (n − rank) points per object. Summed across rankers.
 *
 * @param rankMatrix - m×n matrix of 1-based ranks.
 * @param n - number of objects.
 * @returns Array of Borda scores indexed by object.
 */
function bordaScores(rankMatrix: number[][], n: number): number[] {
  const scores = new Array(n).fill(0);
  for (const rankerRanks of rankMatrix) {
    for (let j = 0; j < n; j++) {
      scores[j] += n - rankerRanks[j]; // (n − rank), higher = better
    }
  }
  return scores;
}

// ---------------------------------------------------------------------------
//  Algorithm Runners
// ---------------------------------------------------------------------------

function runWSM(decision: Decision): AlgorithmResult {
  const results: DecisionResults = computeResults(decision);
  return {
    algorithmId: "wsm",
    rankings: results.optionResults.map((r: OptionResult) => ({
      optionId: r.optionId,
      rank: r.rank,
      score: r.totalScore,
    })),
  };
}

function runTopsis(decision: Decision): AlgorithmResult {
  const results: TopsisResults = computeTopsisResults(decision);
  return {
    algorithmId: "topsis",
    rankings: results.rankings.map((r: TopsisOptionResult) => ({
      optionId: r.optionId,
      rank: r.rank,
      score: r.closenessCoefficient,
    })),
  };
}

function runRegret(decision: Decision): AlgorithmResult {
  const results: RegretResults = computeRegretResults(decision);
  return {
    algorithmId: "minimax-regret",
    rankings: results.rankings.map((r: RegretOptionResult) => ({
      optionId: r.optionId,
      rank: r.rank,
      // Negate maxRegret so higher = better (consistent with other algos)
      score: -r.maxRegret,
    })),
  };
}

const RUNNERS: Record<AlgorithmId, (d: Decision) => AlgorithmResult> = {
  wsm: runWSM,
  topsis: runTopsis,
  "minimax-regret": runRegret,
};

// ---------------------------------------------------------------------------
//  Core: computeConsensus
// ---------------------------------------------------------------------------

/** Threshold: rank spread >= this marks an option as divergent. */
const DEFAULT_DIVERGENCE_THRESHOLD = 2;

/**
 * Run multiple algorithms on a decision and produce a unified consensus ranking.
 *
 * @param decision - The decision to analyze.
 * @param algorithms - Which algorithms to run. Defaults to all three.
 * @param divergenceThreshold - Rank spread threshold for divergent options (default: 2).
 * @returns Full consensus result with Borda count, Kendall's W, and pairwise correlations.
 */
export function computeConsensus(
  decision: Decision,
  algorithms: AlgorithmId[] = [...ALL_ALGORITHMS],
  divergenceThreshold: number = DEFAULT_DIVERGENCE_THRESHOLD
): ConsensusResult {
  const n = decision.options.length;

  // Graceful degradation: no options
  if (n === 0) {
    return {
      rankings: [],
      algorithmResults: [],
      overallAgreement: 1,
      divergentOptions: [],
      pairwiseCorrelations: [],
      algorithmCount: algorithms.length,
    };
  }

  // Graceful degradation: single algorithm
  const effectiveAlgorithms = algorithms.length === 0 ? [...ALL_ALGORITHMS] : algorithms;

  // Run each algorithm
  const algorithmResults: AlgorithmResult[] = effectiveAlgorithms.map((algoId) => {
    const runner = RUNNERS[algoId];
    if (!runner) {
      throw new Error(`Unknown algorithm: ${algoId}`);
    }
    return runner(decision);
  });

  // Build stable option ordering based on decision.options
  const optionIds = decision.options.map((o) => o.id);
  const optionNames = new Map(decision.options.map((o) => [o.id, o.name]));
  const optionIndex = new Map(optionIds.map((id, i) => [id, i]));

  // Build rank matrix: algorithmResults[m][n] → rank for option n by algorithm m
  const m = algorithmResults.length;
  const rankMatrix: number[][] = algorithmResults.map((ar) => {
    const ranks = new Array(n).fill(n); // default to last rank
    for (const r of ar.rankings) {
      const idx = optionIndex.get(r.optionId);
      if (idx !== undefined) {
        ranks[idx] = r.rank;
      }
    }
    return ranks;
  });

  // Compute Borda scores
  const borda = bordaScores(rankMatrix, n);

  // Build per-option algorithm rank map
  const perOptionRanks: Record<string, Record<AlgorithmId, number>> = {};
  for (const optId of optionIds) {
    const idx = optionIndex.get(optId)!;
    const ranks: Record<string, number> = {};
    for (let a = 0; a < m; a++) {
      ranks[effectiveAlgorithms[a]] = rankMatrix[a][idx];
    }
    perOptionRanks[optId] = ranks as Record<AlgorithmId, number>;
  }

  // Rank by Borda score (descending), break ties by original order
  const bordaRanked = optionIds
    .map((id, i) => ({ id, bordaScore: borda[i] }))
    .sort((a, b) => b.bordaScore - a.bordaScore);

  // Assign 1-based consensus ranks (handle ties: same Borda score → same rank)
  const consensusRankMap = new Map<string, number>();
  let currentRank = 1;
  for (let i = 0; i < bordaRanked.length; i++) {
    if (i > 0 && bordaRanked[i].bordaScore < bordaRanked[i - 1].bordaScore) {
      currentRank = i + 1;
    }
    consensusRankMap.set(bordaRanked[i].id, currentRank);
  }

  // Compute per-option agreement score: 1 − (rankSpread / (n − 1))
  const divergentOptions: string[] = [];
  const rankings: ConsensusRanking[] = bordaRanked.map(({ id, bordaScore }) => {
    const ranks = perOptionRanks[id];
    const rankValues = Object.values(ranks);
    const rankSpread =
      rankValues.length > 0 ? Math.max(...rankValues) - Math.min(...rankValues) : 0;

    const agreementScore = n > 1 ? Math.max(0, 1 - rankSpread / (n - 1)) : 1;

    if (rankSpread >= divergenceThreshold) {
      divergentOptions.push(id);
    }

    return {
      optionId: id,
      optionName: optionNames.get(id) ?? id,
      consensusRank: consensusRankMap.get(id)!,
      bordaScore,
      agreementScore,
      algorithmRanks: ranks,
    };
  });

  // Kendall's W
  const overallAgreement = kendallW(rankMatrix);

  // Pairwise Spearman correlations
  const pairwiseCorrelations: PairwiseCorrelation[] = [];
  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      pairwiseCorrelations.push({
        algorithmA: effectiveAlgorithms[a],
        algorithmB: effectiveAlgorithms[b],
        correlation: spearmanCorrelation(rankMatrix[a], rankMatrix[b]),
      });
    }
  }

  return {
    rankings,
    algorithmResults,
    overallAgreement,
    divergentOptions,
    pairwiseCorrelations,
    algorithmCount: m,
  };
}
