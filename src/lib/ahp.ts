/**
 * AHP (Analytic Hierarchy Process) — Pairwise Comparison Engine
 *
 * Implements the Saaty AHP method for deriving criterion weights from
 * pairwise comparisons. Uses the power method to approximate the principal
 * eigenvector and computes the Consistency Ratio (CR) to validate judgment
 * coherence.
 *
 * Reference: Saaty, T. L. (1980). The Analytic Hierarchy Process.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single pairwise comparison on the Saaty 1–9 scale. */
export interface PairwiseComparison {
  readonly criterionA: string;
  readonly criterionB: string;
  /** 1–9 means A is `value`× more important than B. Reciprocal stored for B vs A. */
  readonly value: number;
}

/** Full n×n reciprocal matrix. */
export type PairwiseMatrix = readonly (readonly number[])[];

/** Result of the AHP computation. */
export interface AHPResult {
  /** Derived priority weights (sum ≈ 1). Order matches input criterionIds. */
  readonly weights: readonly number[];
  /** Weights scaled to 0–100 integers (sum = 100). */
  readonly weights100: readonly number[];
  /** Principal eigenvalue. */
  readonly lambdaMax: number;
  /** Consistency Index: (λmax − n) / (n − 1). */
  readonly consistencyIndex: number;
  /** Consistency Ratio: CI / RI(n). */
  readonly consistencyRatio: number;
  /** True when CR < 0.1 (acceptable). */
  readonly isConsistent: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Random Index (RI) for matrices of size 1–15 (Saaty, 1980).
 * Index 0 is unused; RI[n] gives the value for an n×n matrix.
 */
const RANDOM_INDEX: readonly number[] = [
  0,     // 0 (unused)
  0,     // 1
  0,     // 2
  0.58,  // 3
  0.9,   // 4
  1.12,  // 5
  1.24,  // 6
  1.32,  // 7
  1.41,  // 8
  1.45,  // 9
  1.49,  // 10
  1.51,  // 11
  1.48,  // 12
  1.56,  // 13
  1.57,  // 14
  1.59,  // 15
];

/** Maximum number of power-method iterations. */
const MAX_ITERATIONS = 100;

/** Convergence threshold for the power method. */
const CONVERGENCE_EPSILON = 1e-8;

// ---------------------------------------------------------------------------
// Matrix Construction
// ---------------------------------------------------------------------------

/**
 * Build the n×n reciprocal pairwise matrix from a list of comparisons.
 *
 * Any missing pair defaults to 1 (equal importance).
 * The matrix is always reciprocal: M[i][j] = 1 / M[j][i].
 */
export function buildPairwiseMatrix(
  criterionIds: readonly string[],
  comparisons: readonly PairwiseComparison[],
): PairwiseMatrix {
  const n = criterionIds.length;
  const indexMap = new Map(criterionIds.map((id, i) => [id, i]));

  // Initialize identity matrix
  const matrix: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(1));

  for (const comp of comparisons) {
    const i = indexMap.get(comp.criterionA);
    const j = indexMap.get(comp.criterionB);
    if (i === undefined || j === undefined || i === j) continue;

    const v = Math.max(1 / 9, Math.min(9, comp.value));
    matrix[i][j] = v;
    matrix[j][i] = 1 / v;
  }

  return matrix;
}

// ---------------------------------------------------------------------------
// Weight Derivation — Power Method
// ---------------------------------------------------------------------------

/**
 * Derive priority weights from a pairwise matrix using the power method
 * (iterative eigenvector approximation).
 *
 * Returns a normalized weight vector that sums to 1.
 */
export function deriveWeights(matrix: PairwiseMatrix): number[] {
  const n = matrix.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  let vector = new Array<number>(n).fill(1 / n);

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Multiply matrix × vector
    const next: number[] = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        next[i] += matrix[i][j] * vector[j];
      }
    }

    // Normalize
    const sum = next.reduce((s, v) => s + v, 0);
    for (let i = 0; i < n; i++) {
      next[i] /= sum;
    }

    // Check convergence
    let maxDiff = 0;
    for (let i = 0; i < n; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(next[i] - vector[i]));
    }
    vector = next;

    if (maxDiff < CONVERGENCE_EPSILON) break;
  }

  return vector;
}

// ---------------------------------------------------------------------------
// Consistency Check
// ---------------------------------------------------------------------------

/**
 * Compute the principal eigenvalue (λmax) from a matrix and its eigenvector.
 */
export function lambdaMax(matrix: PairwiseMatrix, weights: readonly number[]): number {
  const n = matrix.length;
  if (n <= 1) return n;

  let lambda = 0;
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += matrix[i][j] * weights[j];
    }
    lambda += rowSum / weights[i];
  }
  return lambda / n;
}

/**
 * Compute the Consistency Index: CI = (λmax − n) / (n − 1).
 */
export function consistencyIndex(matrix: PairwiseMatrix, weights: readonly number[]): number {
  const n = matrix.length;
  if (n <= 2) return 0;
  const lm = lambdaMax(matrix, weights);
  return (lm - n) / (n - 1);
}

/**
 * Compute the Consistency Ratio: CR = CI / RI(n).
 * Returns 0 for n ≤ 2 (always consistent).
 */
export function consistencyRatio(matrix: PairwiseMatrix, weights: readonly number[]): number {
  const n = matrix.length;
  if (n <= 2) return 0;
  const ri = n < RANDOM_INDEX.length ? RANDOM_INDEX[n] : RANDOM_INDEX.at(-1) ?? 1.59;
  if (ri === 0) return 0;
  return consistencyIndex(matrix, weights) / ri;
}

/**
 * Returns true when the consistency ratio is acceptable (CR < 0.1).
 */
export function isConsistent(cr: number): boolean {
  return cr < 0.1;
}

// ---------------------------------------------------------------------------
// Weights → 0–100 Integer Scale
// ---------------------------------------------------------------------------

/**
 * Convert normalized weights (sum ≈ 1) to integer weights summing to 100.
 * Uses largest-remainder method to avoid rounding drift.
 */
export function weightsTo100(weights: readonly number[]): number[] {
  if (weights.length === 0) return [];

  const scaled = weights.map((w) => w * 100);
  const floored = scaled.map(Math.floor);
  let remainder = 100 - floored.reduce((s, v) => s + v, 0);

  // Distribute remainder to entries with largest fractional parts
  const fractionals = scaled.map((v, i) => ({ i, frac: v - floored[i] }));
  fractionals.sort((a, b) => b.frac - a.frac);

  for (const { i } of fractionals) {
    if (remainder <= 0) break;
    floored[i] += 1;
    remainder -= 1;
  }

  return floored;
}

// ---------------------------------------------------------------------------
// High-Level API
// ---------------------------------------------------------------------------

/**
 * Run the full AHP computation: build matrix → derive weights → check consistency.
 */
export function computeAHP(
  criterionIds: readonly string[],
  comparisons: readonly PairwiseComparison[],
): AHPResult {
  const matrix = buildPairwiseMatrix(criterionIds, comparisons);
  const weights = deriveWeights(matrix);
  const lm = lambdaMax(matrix, weights);
  const ci = consistencyIndex(matrix, weights);
  const cr = consistencyRatio(matrix, weights);

  return {
    weights,
    weights100: weightsTo100(weights),
    lambdaMax: lm,
    consistencyIndex: ci,
    consistencyRatio: cr,
    isConsistent: isConsistent(cr),
  };
}

/**
 * Return the total number of pairwise comparisons needed for n criteria.
 */
export function pairCount(n: number): number {
  if (n < 2) return 0;
  return (n * (n - 1)) / 2;
}

/**
 * Generate all unique pairs of criterion ids in stable order.
 */
export function generatePairs(
  criterionIds: readonly string[],
): readonly { a: string; b: string }[] {
  const pairs: { a: string; b: string }[] = [];
  for (let i = 0; i < criterionIds.length; i++) {
    for (let j = i + 1; j < criterionIds.length; j++) {
      pairs.push({ a: criterionIds[i], b: criterionIds[j] });
    }
  }
  return pairs;
}

/**
 * Saaty scale label for a numeric value.
 */
export function saatyLabel(value: number): string {
  const abs = Math.abs(value);
  if (abs <= 1) return "Equal";
  const rounded = Math.round(abs);
  switch (rounded) {
    case 2: return "Slightly more";
    case 3: return "Moderately more";
    case 4: return "Moderate-to-strong";
    case 5: return "Strongly more";
    case 6: return "Strong-to-very-strong";
    case 7: return "Very strongly more";
    case 8: return "Very-to-extremely strong";
    case 9: return "Extremely more";
    default: return "Equal";
  }
}
