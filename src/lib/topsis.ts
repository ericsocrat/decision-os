/**
 * TOPSIS — Technique for Order of Preference by Similarity to Ideal Solution
 *
 * An alternative to the Weighted Sum Model (WSM) for multi-criteria decision analysis.
 * TOPSIS considers both the best and worst possible outcomes, making it partially
 * non-compensatory: an option cannot fully compensate for being close to the worst
 * solution on one criterion by excelling on another.
 *
 * Algorithm (Hwang & Yoon, 1981):
 *   1. Construct decision matrix  X  where  x_{ij}  = raw score of option i on criterion j
 *   2. Vector-normalize:  r_{ij} = x_{ij} / √(Σ_i x_{ij}²)
 *   3. Weight:  v_{ij} = w_j × r_{ij}  (w_j = normalized weight of criterion j)
 *   4. Identify ideal solution  A⁺  and anti-ideal  A⁻:
 *        - benefit: A⁺_j = max(v_{ij}), A⁻_j = min(v_{ij})
 *        - cost:    A⁺_j = min(v_{ij}), A⁻_j = max(v_{ij})
 *   5. Euclidean distances:
 *        D⁺_i = √(Σ_j (v_{ij} − A⁺_j)²)
 *        D⁻_i = √(Σ_j (v_{ij} − A⁻_j)²)
 *   6. Closeness coefficient:  C_i = D⁻_i / (D⁺_i + D⁻_i),   C ∈ [0, 1]
 *   7. Rank by C descending (higher is better).
 *
 * @see docs/DECISION_FRAMEWORKS.md
 * @see Hwang, C.L.; Yoon, K. (1981). Multiple Attribute Decision Making: Methods and Applications.
 */

import type { Decision } from "./types";
import { normalizeWeights, DISPLAY_PRECISION, readScoreOrZero } from "./scoring";

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface TopsisOptionResult {
  optionId: string;
  optionName: string;
  /** Closeness coefficient C ∈ [0, 1]; higher = better */
  closenessCoefficient: number;
  /** Euclidean distance to the ideal solution (lower = better) */
  distanceToIdeal: number;
  /** Euclidean distance to the anti-ideal solution (higher = better) */
  distanceToAntiIdeal: number;
  /** 1-based rank */
  rank: number;
}

export interface TopsisResults {
  rankings: TopsisOptionResult[];
  /** Best weighted-normalized score per criterion */
  idealSolution: Record<string, number>;
  /** Worst weighted-normalized score per criterion */
  antiIdealSolution: Record<string, number>;
  method: "topsis";
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
 * Compute TOPSIS results for a decision.
 *
 * @param decision - A fully populated Decision object
 * @returns TopsisResults with ranked options and ideal/anti-ideal solutions
 */
export function computeTopsisResults(decision: Decision): TopsisResults {
  const { options, criteria, scores } = decision;

  // Guard: need at least 1 option and 1 criterion
  if (options.length === 0 || criteria.length === 0) {
    return { rankings: [], idealSolution: {}, antiIdealSolution: {}, method: "topsis" };
  }

  const numOptions = options.length;
  const numCriteria = criteria.length;

  // --- Step 1: Build raw decision matrix (options × criteria) ----------------
  // Null scores are treated as 0 in TOPSIS (included in vector normalization)
  const rawMatrix: number[][] = options.map((opt) =>
    criteria.map((crit) => readScoreOrZero(scores, opt.id, crit.id))
  );

  // --- Step 2: Vector normalization ------------------------------------------
  // For each criterion j, compute √(Σ_i x_{ij}²)
  const normalizedMatrix: number[][] = Array.from({ length: numOptions }, () =>
    new Array(numCriteria).fill(0)
  );

  for (let j = 0; j < numCriteria; j++) {
    let sumSq = 0;
    for (let i = 0; i < numOptions; i++) {
      sumSq += rawMatrix[i][j] ** 2;
    }
    const norm = Math.sqrt(sumSq);

    for (let i = 0; i < numOptions; i++) {
      // If all scores in column are 0, normalized value is 0 (avoid ÷0)
      normalizedMatrix[i][j] = norm === 0 ? 0 : rawMatrix[i][j] / norm;
    }
  }

  // --- Step 3: Weighted normalized matrix ------------------------------------
  const rawWeights = criteria.map((c) => c.weight);
  const nw = normalizeWeights(rawWeights);

  const weightedMatrix: number[][] = normalizedMatrix.map((row) =>
    row.map((val, j) => val * nw[j])
  );

  // --- Step 4: Ideal (A⁺) and Anti-ideal (A⁻) solutions ---------------------
  const idealSolution: Record<string, number> = {};
  const antiIdealSolution: Record<string, number> = {};

  for (let j = 0; j < numCriteria; j++) {
    const crit = criteria[j];
    const colValues = weightedMatrix.map((row) => row[j]);
    const colMax = Math.max(...colValues);
    const colMin = Math.min(...colValues);

    if (crit.type === "benefit") {
      idealSolution[crit.id] = colMax;
      antiIdealSolution[crit.id] = colMin;
    } else {
      // cost: ideal is minimum, anti-ideal is maximum
      idealSolution[crit.id] = colMin;
      antiIdealSolution[crit.id] = colMax;
    }
  }

  // --- Step 5: Euclidean distances -------------------------------------------
  const rankings: TopsisOptionResult[] = options.map((opt, i) => {
    let dPlusSq = 0;
    let dMinusSq = 0;

    for (let j = 0; j < numCriteria; j++) {
      const crit = criteria[j];
      const v = weightedMatrix[i][j];
      const idealVal = idealSolution[crit.id];
      const antiIdealVal = antiIdealSolution[crit.id];

      // Skip criteria where ideal === anti-ideal (no differentiation)
      if (idealVal === antiIdealVal) continue;

      dPlusSq += (v - idealVal) ** 2;
      dMinusSq += (v - antiIdealVal) ** 2;
    }

    const dPlus = Math.sqrt(dPlusSq);
    const dMinus = Math.sqrt(dMinusSq);

    // --- Step 6: Closeness coefficient ---
    // If both distances are 0 (single option or all identical), C = 0.5
    const denom = dPlus + dMinus;
    const closeness = denom === 0 ? 0.5 : dMinus / denom;

    return {
      optionId: opt.id,
      optionName: opt.name,
      closenessCoefficient: round(closeness),
      distanceToIdeal: round(dPlus),
      distanceToAntiIdeal: round(dMinus),
      rank: 0, // assigned after sorting
    };
  });

  // --- Step 7: Rank ----------------------------------------------------------
  rankings.sort((a, b) => b.closenessCoefficient - a.closenessCoefficient);
  rankings.forEach((r, i) => {
    r.rank = i + 1;
  });

  return { rankings, idealSolution, antiIdealSolution, method: "topsis" };
}
