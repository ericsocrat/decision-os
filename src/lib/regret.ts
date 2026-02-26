/**
 * Minimax Regret — Non-compensatory decision method (Savage, 1951)
 *
 * Unlike WSM and TOPSIS (compensatory methods where strength on one criterion
 * can offset weakness on another), Minimax Regret penalizes options with
 * extreme weaknesses, regardless of how strong they are elsewhere.
 *
 * Algorithm:
 *   1. Compute effective scores  e_{ij}  for each option i on criterion j
 *      (benefit: raw score; cost: 10 − raw score)
 *   2. Compute regret matrix  R:
 *        R_{ij} = max_k(e_{kj}) − e_{ij}
 *      Each cell = "how much worse is this option vs. the best on this criterion?"
 *   3. Compute weighted maximum regret per option:
 *        MaxRegret_i = max_j(w_j × R_{ij})
 *   4. Minimax regret winner:
 *        Winner = argmin_i(MaxRegret_i)
 *
 * @see docs/DECISION_FRAMEWORKS.md (lines 200-225)
 * @see Savage, L.J. (1951). The Theory of Statistical Decision.
 */

import type { Decision } from "./types";
import { effectiveScore, normalizeWeights, DISPLAY_PRECISION } from "./scoring";

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

/** Result for a single option in the minimax regret analysis */
export interface RegretOptionResult {
  optionId: string;
  optionName: string;
  /** The option's worst weighted regret (lower = better) */
  maxRegret: number;
  /** Which criterion causes the most regret */
  maxRegretCriterion: string;
  /** Average weighted regret across all criteria */
  avgRegret: number;
  /** 1-based rank */
  rank: number;
}

/** Full results of the minimax regret analysis */
export interface RegretResults {
  rankings: RegretOptionResult[];
  /** optionId → criterionId → weighted regret value */
  regretMatrix: Record<string, Record<string, number>>;
  /** criterionId → best effective score on that criterion */
  bestPerCriterion: Record<string, number>;
  method: "minimax-regret";
}

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function round(v: number): number {
  return Number(v.toFixed(DISPLAY_PRECISION));
}

// ---------------------------------------------------------------------------
//  Core algorithm
// ---------------------------------------------------------------------------

/**
 * Compute minimax regret results for a decision.
 *
 * @param decision - A fully populated Decision object
 * @returns RegretResults with ranked options, regret matrix, and best-per-criterion
 */
export function computeRegretResults(decision: Decision): RegretResults {
  const { options, criteria, scores } = decision;

  // Guard: need at least 1 option and 1 criterion
  if (options.length === 0 || criteria.length === 0) {
    return { rankings: [], regretMatrix: {}, bestPerCriterion: {}, method: "minimax-regret" };
  }

  // --- Step 1: Compute effective score matrix --------------------------------
  // effectiveScores[i][j] = effective score of option i on criterion j
  const effectiveScores: number[][] = options.map((opt) =>
    criteria.map((crit) => {
      const raw = scores[opt.id]?.[crit.id] ?? 0;
      return effectiveScore(raw, crit.type);
    })
  );

  // --- Step 2: Best score per criterion --------------------------------------
  const bestPerCriterion: Record<string, number> = {};
  const bestScores: number[] = new Array(criteria.length);

  for (let j = 0; j < criteria.length; j++) {
    let best = -Infinity;
    for (let i = 0; i < options.length; i++) {
      if (effectiveScores[i][j] > best) best = effectiveScores[i][j];
    }
    bestScores[j] = best;
    bestPerCriterion[criteria[j].id] = round(best);
  }

  // --- Step 3: Normalize weights ---------------------------------------------
  const rawWeights = criteria.map((c) => c.weight);
  const nw = normalizeWeights(rawWeights);

  // --- Step 4: Compute weighted regret matrix --------------------------------
  // R_{ij} = w_j × (best_j − e_{ij})
  const regretMatrix: Record<string, Record<string, number>> = {};

  for (let i = 0; i < options.length; i++) {
    const optId = options[i].id;
    regretMatrix[optId] = {};
    for (let j = 0; j < criteria.length; j++) {
      const rawRegret = bestScores[j] - effectiveScores[i][j];
      regretMatrix[optId][criteria[j].id] = round(nw[j] * rawRegret);
    }
  }

  // --- Step 5: Compute max regret and avg regret per option ------------------
  const rankings: RegretOptionResult[] = options.map((opt) => {
    const regretRow = regretMatrix[opt.id];
    let maxRegret = -Infinity;
    let maxRegretCriterionId = criteria[0].id;
    let sumRegret = 0;

    for (const crit of criteria) {
      const r = regretRow[crit.id];
      sumRegret += r;
      if (r > maxRegret) {
        maxRegret = r;
        maxRegretCriterionId = crit.id;
      }
    }

    return {
      optionId: opt.id,
      optionName: opt.name,
      maxRegret: round(maxRegret),
      maxRegretCriterion: maxRegretCriterionId,
      avgRegret: round(sumRegret / criteria.length),
      rank: 0, // assigned after sorting
    };
  });

  // --- Step 6: Rank by max regret ascending (lower = better) -----------------
  rankings.sort((a, b) => a.maxRegret - b.maxRegret);
  rankings.forEach((r, i) => {
    r.rank = i + 1;
  });

  return { rankings, regretMatrix, bestPerCriterion, method: "minimax-regret" };
}
