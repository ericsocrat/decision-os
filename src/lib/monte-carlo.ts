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
  ScoreMatrix,
  Confidence,
} from "./types";
import { computeResults, roundDisplay, resolveScoreValue, resolveConfidence } from "./scoring";

// ---------------------------------------------------------------------------
// Callback interface for progress reporting & cancellation
// ---------------------------------------------------------------------------

export interface SimulationCallbacks {
  /** Called periodically with (completed, total) iteration counts. */
  onProgress?: (completed: number, total: number) => void;
  /** When aborted, the simulation stops at the next batch boundary. */
  signal?: AbortSignal;
}

/** Batch size for progress reporting (every N iterations). */
export const PROGRESS_BATCH_SIZE = 1_000;

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
    s = (s + 0x6d2b79f5) | 0; // intentional 32-bit integer wrap
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
      delta = (rand() - rand()) * range; // rand() is stateful PRNG, each call returns a different value
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
// Confidence-based score perturbation
// ---------------------------------------------------------------------------

/** Multiplier for per-cell score perturbation based on confidence */
export const CONFIDENCE_PERTURBATION: Record<Confidence, number> = {
  high: 1, // standard perturbation
  medium: 1.5, // 50% wider
  low: 2.5, // 150% wider
};

/**
 * Check if any cell in the ScoreMatrix has a non-high confidence level.
 * Used to skip score perturbation entirely when all are plain numbers.
 */
export function hasNonHighConfidence(scores: ScoreMatrix): boolean {
  for (const optId of Object.keys(scores)) {
    const row = scores[optId];
    for (const critId of Object.keys(row)) {
      const conf = resolveConfidence(row[critId]);
      if (conf && conf !== "high") return true;
    }
  }
  return false;
}

/**
 * Create a perturbed copy of the score matrix.
 * Each cell is perturbed independently:
 *   perturbed = clamp(base ± delta, 0, 10)
 * where delta scales with the cell's confidence level.
 *
 * High-confidence cells: standard range
 * Medium-confidence: 1.5× wider
 * Low-confidence: 2.5× wider
 * Null cells: preserved as-is
 */
export function perturbScores(
  scores: ScoreMatrix,
  options: { id: string }[],
  criteria: { id: string }[],
  rand: () => number,
  range: number,
  distribution: PerturbationDistribution
): ScoreMatrix {
  const result: ScoreMatrix = {};
  for (const opt of options) {
    result[opt.id] = {};
    for (const crit of criteria) {
      const sv = scores[opt.id]?.[crit.id];
      const numVal = resolveScoreValue(sv);
      if (numVal === null) {
        result[opt.id][crit.id] = null;
        continue;
      }
      const conf = resolveConfidence(sv) ?? "high";
      const multiplier = CONFIDENCE_PERTURBATION[conf];
      const effectiveRange = range * multiplier;
      const perturbation = samplePerturbation(rand, effectiveRange, distribution);
      const perturbed = numVal * perturbation;
      result[opt.id][crit.id] = Math.max(0, Math.min(10, perturbed));
    }
  }
  return result;
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

// ---------------------------------------------------------------------------
// Simulation helpers (extracted to keep runMonteCarloSimulation simple)
// ---------------------------------------------------------------------------

interface SimulationAccumulators {
  winCounts: Uint32Array;
  allScores: Float64Array[];
  optionIndexMap: Map<string, number>;
}

/** Record computed results into accumulators for a single simulation. */
function recordSimResults(
  results: ReturnType<typeof computeResults>,
  accum: SimulationAccumulators,
  simIndex: number
): void {
  for (const optResult of results.optionResults) {
    const idx = accum.optionIndexMap.get(optResult.optionId);
    if (idx !== undefined) {
      accum.allScores[idx][simIndex] = optResult.totalScore;
    }
  }

  if (results.optionResults.length > 0) {
    const winnerIdx = accum.optionIndexMap.get(results.optionResults[0].optionId);
    if (winnerIdx !== undefined) {
      accum.winCounts[winnerIdx]++;
    }
  }
}

/** Build per-option statistics from accumulated simulation data. */
function buildOptionResults(
  options: Decision["options"],
  accum: SimulationAccumulators,
  effectiveSims: number
): MonteCarloOptionResult[] {
  const divisor = effectiveSims || 1;
  const results: MonteCarloOptionResult[] = options.map((opt, idx) => {
    const scores = Array.from(accum.allScores[idx].subarray(0, effectiveSims));
    scores.sort((a, b) => a - b);

    const mean = scores.reduce((s, v) => s + v, 0) / divisor;
    const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / divisor;

    return {
      optionId: opt.id,
      optionName: opt.name,
      winProbability: roundDisplay(accum.winCounts[idx] / divisor),
      winCount: accum.winCounts[idx],
      meanScore: roundDisplay(mean),
      stdDev: roundDisplay(Math.sqrt(variance)),
      p5: roundDisplay(percentile(scores, 5)),
      p25: roundDisplay(percentile(scores, 25)),
      p50: roundDisplay(percentile(scores, 50)),
      p75: roundDisplay(percentile(scores, 75)),
      p95: roundDisplay(percentile(scores, 95)),
      histogram: buildHistogram(scores),
    };
  });

  results.sort((a, b) => b.winProbability - a.winProbability || b.meanScore - a.meanScore);
  return results;
}

/** Generate a human-readable summary of the simulation. */
function buildSimulationSummary(
  mcOptions: MonteCarloOptionResult[],
  effectiveSims: number,
  elapsedMs: number,
  cancelled: boolean
): string {
  const topOption = mcOptions[0];
  if (!topOption) return "No results.";

  const cancelNote = cancelled ? ` (cancelled after ${effectiveSims.toLocaleString()})` : "";
  return (
    `"${topOption.optionName}" wins ${roundDisplay(topOption.winProbability * 100)}% of simulations ` +
    `(mean score ${topOption.meanScore}, 90% CI [${topOption.p5}–${topOption.p95}]). ` +
    `${effectiveSims.toLocaleString()} simulations completed in ${elapsedMs} ms${cancelNote}.`
  );
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
  config: Partial<MonteCarloConfig> = {},
  callbacks?: SimulationCallbacks
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
  const shouldPerturbScores = hasNonHighConfidence(decision.scores);

  const accum: SimulationAccumulators = {
    winCounts: new Uint32Array(options.length),
    allScores: options.map(() => new Float64Array(numSimulations)),
    optionIndexMap: new Map(options.map((o, i) => [o.id, i])),
  };

  // Run simulations -------------------------------------------------------

  let completedSims = 0;

  for (let sim = 0; sim < numSimulations; sim++) {
    if (callbacks?.signal?.aborted) break;

    const perturbedWeights = perturbWeights(baseWeights, rand, perturbationRange, distribution);
    const perturbedScores = shouldPerturbScores
      ? perturbScores(decision.scores, options, criteria, rand, perturbationRange, distribution)
      : decision.scores;

    const simDecision: Decision = {
      ...decision,
      scores: perturbedScores,
      criteria: criteria.map((c, i) => ({ ...c, weight: perturbedWeights[i] })),
    };

    recordSimResults(computeResults(simDecision), accum, sim);
    completedSims = sim + 1;

    if (callbacks?.onProgress && completedSims % PROGRESS_BATCH_SIZE === 0) {
      callbacks.onProgress(completedSims, numSimulations);
    }
  }

  // Final progress report
  if (callbacks?.onProgress && completedSims > 0 && completedSims % PROGRESS_BATCH_SIZE !== 0) {
    callbacks.onProgress(completedSims, numSimulations);
  }

  // Build results ---------------------------------------------------------

  const mcOptions = buildOptionResults(options, accum, completedSims);
  const elapsedMs = roundDisplay(performance.now() - t0);
  const cancelled = callbacks?.signal?.aborted ?? false;

  return {
    decisionId: decision.id,
    config: cfg,
    options: mcOptions,
    elapsedMs,
    summary: buildSimulationSummary(mcOptions, completedSims, elapsedMs, cancelled),
  };
}
