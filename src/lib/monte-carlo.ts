/**
 * Decision OS — Monte Carlo Sensitivity Engine
 *
 * Performs N stochastic simulations by perturbing criterion weights according
 * to a configurable distribution (uniform / normal / triangular), then
 * re-scoring every option via the deterministic scoring engine.
 *
 * Outputs:
 *   • Win probability per option  (fraction of sims where option ranked #1)
 *   • Score distribution stats    (mean, stddev, percentiles p5/p25/p50/p75/p95)
 *   • Histogram buckets           (for sparkline / bar-chart visualisation)
 *
 * Design goals:
 *   • Pure functions — no DOM, no React, no side effects
 *   • Deterministic when seeded  (xoshiro128** PRNG)
 *   • Zero external dependencies
 *   • 10 000 simulations < 2 s on mid-range hardware
 *
 * @module monte-carlo
 */

import type {
  Decision,
  HistogramBucket,
  MonteCarloConfig,
  MonteCarloOptionResult,
  MonteCarloResults,
  PerturbationDistribution,
} from "./types";
import { computeResults, roundDisplay } from "./scoring";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: MonteCarloConfig = {
  numSimulations: 10_000,
  perturbationRange: 0.2,
  distribution: "uniform",
  seed: 0,
};

// ---------------------------------------------------------------------------
// xoshiro128** — fast, high-quality 32-bit PRNG (public domain)
// ---------------------------------------------------------------------------

/**
 * Seeded PRNG based on xoshiro128**.
 * Returns a function that yields values in [0, 1) on every call.
 *
 * When `seed === 0` the initial state is derived from `Date.now()`.
 */
export function createPRNG(seed: number): () => number {
  // Simple splash / hash to fill the 4×32-bit state from a single number.
  let s = seed === 0 ? Date.now() : seed;
  const state = new Uint32Array(4);
  for (let i = 0; i < 4; i++) {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    state[i] = (t ^ (t >>> 14)) >>> 0;
  }

  // xoshiro128** core
  return (): number => {
    const result = (Math.imul(rotl(Math.imul(state[1], 5), 7), 9) >>> 0) / 4294967296;

    const t = state[1] << 9;
    state[2] ^= state[0];
    state[3] ^= state[1];
    state[1] ^= state[2];
    state[0] ^= state[3];
    state[2] ^= t;
    state[3] = rotl(state[3], 11);

    return result;
  };
}

/** 32-bit left rotation */
function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

// ---------------------------------------------------------------------------
// Perturbation samplers
// ---------------------------------------------------------------------------

/**
 * Return a multiplier drawn from the chosen distribution.
 * The returned value is in the range [1 − range, 1 + range] (clamped ≥ 0).
 */
export function samplePerturbation(
  rand: () => number,
  range: number,
  distribution: PerturbationDistribution
): number {
  let delta: number;

  switch (distribution) {
    case "uniform":
      // Uniform on [-range, +range]
      delta = (rand() * 2 - 1) * range;
      break;

    case "normal": {
      // Box-Muller transform → N(0,1), then scale so ≈99.7% falls within ±range
      const u1 = rand() || 1e-10; // avoid log(0)
      const u2 = rand();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      delta = (z * range) / 3; // 3σ = range
      break;
    }

    case "triangular":
      // Symmetric triangular on [-range, +range] (mode = 0)
      delta = (rand() - rand()) * range;
      break;

    default:
      delta = 0;
  }

  return Math.max(0, 1 + delta);
}

// ---------------------------------------------------------------------------
// Weight perturbation
// ---------------------------------------------------------------------------

/**
 * Perturb an array of criterion weights by sampling per-weight multipliers.
 * Weights are guaranteed non-negative; the caller should normalise them.
 */
export function perturbWeights(
  baseWeights: number[],
  rand: () => number,
  range: number,
  distribution: PerturbationDistribution
): number[] {
  return baseWeights.map((w) => Math.max(0, w * samplePerturbation(rand, range, distribution)));
}

// ---------------------------------------------------------------------------
// Histogram helpers
// ---------------------------------------------------------------------------

const HISTOGRAM_BUCKETS = 20;

/**
 * Build a histogram from an array of scores.
 * Returns `HISTOGRAM_BUCKETS` evenly spaced buckets spanning [min, max].
 */
export function buildHistogram(scores: number[]): HistogramBucket[] {
  if (scores.length === 0) {
    return [{ min: 0, max: 1, count: 0 }];
  }

  let lo = scores[0];
  let hi = scores[0];
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] < lo) lo = scores[i];
    if (scores[i] > hi) hi = scores[i];
  }

  // Avoid zero-width range
  if (hi === lo) {
    hi = lo + 1;
  }

  const step = (hi - lo) / HISTOGRAM_BUCKETS;
  const buckets: HistogramBucket[] = Array.from({ length: HISTOGRAM_BUCKETS }, (_, i) => ({
    min: roundDisplay(lo + i * step),
    max: roundDisplay(lo + (i + 1) * step),
    count: 0,
  }));

  for (const s of scores) {
    let idx = Math.floor((s - lo) / step);
    if (idx >= HISTOGRAM_BUCKETS) idx = HISTOGRAM_BUCKETS - 1;
    buckets[idx].count++;
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// Percentile helper
// ---------------------------------------------------------------------------

/**
 * Return the p-th percentile (0–100) from a **sorted** array.
 * Uses linear interpolation between closest ranks.
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const k = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(k);
  const hi = Math.ceil(k);
  const frac = k - lo;
  return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
}

// ---------------------------------------------------------------------------
// Main simulation
// ---------------------------------------------------------------------------

/**
 * Run a full Monte Carlo simulation on a decision.
 *
 * @param decision  — the decision to analyse
 * @param config    — simulation configuration (merged with defaults)
 * @returns MonteCarloResults
 */
export function runMonteCarloSimulation(
  decision: Decision,
  config: Partial<MonteCarloConfig> = {}
): MonteCarloResults {
  const cfg: MonteCarloConfig = { ...DEFAULT_CONFIG, ...config };
  const { numSimulations, perturbationRange, distribution, seed } = cfg;

  const t0 = performance.now();

  const { criteria, options } = decision;

  // Edge case — nothing to simulate
  if (criteria.length === 0 || options.length === 0) {
    return {
      decisionId: decision.id,
      config: cfg,
      options: [],
      elapsedMs: roundDisplay(performance.now() - t0),
      summary: "No criteria or options to simulate.",
    };
  }

  const rand = createPRNG(seed);
  const baseWeights = criteria.map((c) => c.weight);
  const numOptions = options.length;

  // Accumulators ----------------------------------------------------------

  /** winCounts[optionIndex] = number of sims where this option ranked #1 */
  const winCounts = new Uint32Array(numOptions);

  /** scoreAccumulator[optionIndex][simIndex] = total score for that sim */
  const allScores: Float64Array[] = options.map(() => new Float64Array(numSimulations));

  /** O(1) lookup from optionId → array index (built once, used numSimulations times) */
  const optionIndexMap = new Map(options.map((o, i) => [o.id, i]));

  // Run simulations -------------------------------------------------------

  for (let sim = 0; sim < numSimulations; sim++) {
    // Perturb weights
    const perturbedWeights = perturbWeights(baseWeights, rand, perturbationRange, distribution);

    // Build a shallow-copy decision with the perturbed weights
    const simDecision: Decision = {
      ...decision,
      criteria: criteria.map((c, i) => ({ ...c, weight: perturbedWeights[i] })),
    };

    const results = computeResults(simDecision);

    // Record scores
    for (const optResult of results.optionResults) {
      const idx = optionIndexMap.get(optResult.optionId);
      if (idx !== undefined) {
        allScores[idx][sim] = optResult.totalScore;
      }
    }

    // Record winner (rank 1)
    if (results.optionResults.length > 0) {
      const winnerId = results.optionResults[0].optionId;
      const winnerIdx = optionIndexMap.get(winnerId);
      if (winnerIdx !== undefined) {
        winCounts[winnerIdx]++;
      }
    }
  }

  // Build option results --------------------------------------------------

  const mcOptions: MonteCarloOptionResult[] = options.map((opt, idx) => {
    const scores = Array.from(allScores[idx]);
    scores.sort((a, b) => a - b);

    const mean = scores.reduce((s, v) => s + v, 0) / numSimulations;
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / numSimulations;
    const stdDev = Math.sqrt(variance);

    return {
      optionId: opt.id,
      optionName: opt.name,
      winProbability: roundDisplay(winCounts[idx] / numSimulations),
      winCount: winCounts[idx],
      meanScore: roundDisplay(mean),
      stdDev: roundDisplay(stdDev),
      p5: roundDisplay(percentile(scores, 5)),
      p25: roundDisplay(percentile(scores, 25)),
      p50: roundDisplay(percentile(scores, 50)),
      p75: roundDisplay(percentile(scores, 75)),
      p95: roundDisplay(percentile(scores, 95)),
      histogram: buildHistogram(scores),
    };
  });

  // Sort by win probability descending
  mcOptions.sort((a, b) => b.winProbability - a.winProbability || b.meanScore - a.meanScore);

  const elapsedMs = roundDisplay(performance.now() - t0);

  // Summary text
  const topOption = mcOptions[0];
  const summary = topOption
    ? `"${topOption.optionName}" wins ${roundDisplay(topOption.winProbability * 100)}% of simulations ` +
      `(mean score ${topOption.meanScore}, 90% CI [${topOption.p5}–${topOption.p95}]). ` +
      `${numSimulations.toLocaleString()} simulations completed in ${elapsedMs} ms.`
    : "No results.";

  return {
    decisionId: decision.id,
    config: cfg,
    options: mcOptions,
    elapsedMs,
    summary,
  };
}
