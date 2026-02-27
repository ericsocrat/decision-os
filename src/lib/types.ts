/**
 * Core types for Decision OS.
 *
 * These types define the data model for decisions, options, criteria, and scores.
 * All IDs use nanoid-style strings for uniqueness without external dependencies.
 */

/** Criterion type: benefit means higher is better, cost means lower is better */
export type CriterionType = "benefit" | "cost";

/** A single criterion used to evaluate options */
export interface Criterion {
  id: string;
  name: string;
  weight: number; // 0–100 (raw weight; normalized internally)
  type: CriterionType;
  description?: string;
}

/** A single option being evaluated */
export interface Option {
  id: string;
  name: string;
  description?: string;
}

/** Confidence level for a per-cell score */
export type Confidence = "high" | "medium" | "low";

/**
 * Strategy for how confidence affects scoring:
 * - `none`    — display only, no effect on results (default)
 * - `penalize` — multiply effective score by confidence multiplier
 * - `widen`   — affects Monte Carlo distribution spread
 */
export type ConfidenceStrategy = "none" | "penalize" | "widen";

/** A score cell with an explicit confidence annotation */
export interface ScoredCell {
  value: number;
  confidence: Confidence;
}

/**
 * A single cell in the score matrix:
 * - `number`     — plain numeric score (backward-compatible; implicitly high confidence)
 * - `ScoredCell` — annotated score with explicit confidence
 * - `null`       — not yet scored (distinct from "scored 0")
 */
export type ScoreValue = number | ScoredCell | null;

/**
 * Score matrix: maps `optionId -> criterionId -> ScoreValue`.
 *
 * `null` means "not yet scored" (the user hasn't evaluated this cell).
 * `0` means "deliberately scored zero".
 */
export type ScoreMatrix = Record<string, Record<string, ScoreValue>>;

// ---------------------------------------------------------------------------
// Score provenance
// ---------------------------------------------------------------------------

/** Tracks where a score value originated */
export type ScoreProvenance = "manual" | "enriched" | "overridden";

/** Per-cell metadata tracking the origin and history of a score */
export interface ScoreMetadata {
  provenance: ScoreProvenance;
  /** Original enriched value (preserved when user overrides) */
  enrichedValue?: number;
  /** Data provider that supplied the enriched value */
  enrichedSource?: string;
  /** Tier of the enriched data (1=live, 2=bundled, 3=estimated) */
  enrichedTier?: 1 | 2 | 3;
  /** ISO timestamp when the user overrode an enriched score */
  overriddenAt?: string;
  /** Optional explanation for why the user overrode the score */
  overrideReason?: string;
}

/** Matrix of per-cell provenance metadata: optionId → criterionId → ScoreMetadata */
export type ScoreMetadataMatrix = Record<string, Record<string, ScoreMetadata>>;

/** A complete decision with all its data */
export interface Decision {
  id: string;
  title: string;
  description?: string;
  options: Option[];
  criteria: Criterion[];
  scores: ScoreMatrix;
  /** Optional per-score reasoning notes: optionId → criterionId → text */
  reasoning?: Record<string, Record<string, string>>;
  /** Optional per-score provenance metadata: optionId → criterionId → ScoreMetadata */
  scoreMetadata?: ScoreMetadataMatrix;
  /** Strategy for how per-score confidence affects results (default: "none") */
  confidenceStrategy?: ConfidenceStrategy;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Result for a single option after scoring */
export interface OptionResult {
  optionId: string;
  optionName: string;
  totalScore: number;
  rank: number;
  criterionScores: CriterionScore[];
}

/** Score breakdown for one criterion on one option */
export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  rawScore: number;
  normalizedWeight: number;
  effectiveScore: number; // rawScore (or inverted) * normalizedWeight
  criterionType: CriterionType;
  /** True when the score cell was null (not yet scored) */
  isNull?: boolean;
  /** Confidence level for this score (if available) */
  confidence?: Confidence;
  /** Multiplier applied based on confidence strategy (1.0 when strategy is "none") */
  confidenceMultiplier?: number;
}

/** Full results for a decision */
export interface DecisionResults {
  decisionId: string;
  optionResults: OptionResult[];
  topDrivers: TopDriver[];
}

/** A criterion that significantly influenced the outcome */
export interface TopDriver {
  criterionId: string;
  criterionName: string;
  normalizedWeight: number;
  impactDescription: string;
}

/** Sensitivity analysis result for a single criterion weight change */
export interface SensitivityPoint {
  criterionId: string;
  criterionName: string;
  originalWeight: number;
  adjustedWeight: number;
  originalWinner: string;
  newWinner: string;
  winnerChanged: boolean;
}

/** Full sensitivity analysis results */
export interface SensitivityAnalysis {
  decisionId: string;
  points: SensitivityPoint[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Monte Carlo simulation types
// ---------------------------------------------------------------------------

/** Distribution type for weight perturbation */
export type PerturbationDistribution = "uniform" | "normal" | "triangular";

/** Configuration for a Monte Carlo simulation run */
export interface MonteCarloConfig {
  /** Number of simulation iterations (default: 10000) */
  numSimulations: number;
  /** Perturbation range as fraction 0–1 (e.g. 0.2 = ±20% of each weight) */
  perturbationRange: number;
  /** Statistical distribution for perturbation sampling */
  distribution: PerturbationDistribution;
  /** Optional seed for reproducible results (0 = random) */
  seed: number;
}

/** Win probability + score distribution for a single option */
export interface MonteCarloOptionResult {
  optionId: string;
  optionName: string;
  /** Fraction of simulations this option ranked #1 (0–1) */
  winProbability: number;
  /** Number of simulations this option won */
  winCount: number;
  /** Mean score across all simulations */
  meanScore: number;
  /** Standard deviation of score */
  stdDev: number;
  /** Score at the 5th percentile (lower bound of 90% CI) */
  p5: number;
  /** Score at the 25th percentile */
  p25: number;
  /** Score at the 50th percentile (median) */
  p50: number;
  /** Score at the 75th percentile */
  p75: number;
  /** Score at the 95th percentile (upper bound of 90% CI) */
  p95: number;
  /** Histogram buckets for score distribution visualization */
  histogram: HistogramBucket[];
}

/** A bucket in a score histogram */
export interface HistogramBucket {
  /** Lower bound of the bucket (inclusive) */
  min: number;
  /** Upper bound of the bucket (exclusive, except last) */
  max: number;
  /** Number of simulations falling in this bucket */
  count: number;
}

/** Full Monte Carlo simulation results */
export interface MonteCarloResults {
  decisionId: string;
  config: MonteCarloConfig;
  options: MonteCarloOptionResult[];
  /** Total wall-clock time in milliseconds */
  elapsedMs: number;
  /** Summary text */
  summary: string;
}
