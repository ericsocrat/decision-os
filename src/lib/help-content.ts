/**
 * Contextual help content registry.
 *
 * Each entry maps a concept key to a short plain-language explanation
 * suitable for a tooltip (≤ 120 chars) plus an optional extended description.
 */

export interface HelpEntry {
  /** Display name of the concept */
  term: string;
  /** Short tooltip text (≤ 120 chars) */
  short: string;
  /** Optional longer explanation */
  long?: string;
  /** Optional external reference URL */
  learnMoreUrl?: string;
}

export const HELP_REGISTRY: Record<string, HelpEntry> = {
  wsm: {
    term: "Weighted Sum Model (WSM)",
    short:
      "Multiplies each score by its criterion weight and sums the results. The option with the highest total wins.",
  },
  topsis: {
    term: "TOPSIS",
    short:
      "Finds the option closest to the ideal best and farthest from the ideal worst across all criteria.",
  },
  "minimax-regret": {
    term: "Minimax Regret",
    short:
      'Picks the option where the worst-case "regret" (missed opportunity) is smallest. Best for risk-averse decisions.',
  },
  consensus: {
    term: "Consensus Scoring",
    short:
      "Combines rankings from WSM, TOPSIS, and Minimax Regret to find the option that performs well across all methods.",
  },
  pareto: {
    term: "Pareto Frontier",
    short:
      'Shows options where you can\'t improve one criterion without worsening another. Points on the frontier are "efficient."',
  },
  "monte-carlo": {
    term: "Monte Carlo Simulation",
    short:
      "Runs thousands of simulations with random score variations to test if your winner holds up under uncertainty.",
  },
  sensitivity: {
    term: "Sensitivity Analysis",
    short:
      "Tests what happens when you change criterion weights by ±N%. Shows if your decision is robust or fragile.",
  },
  ahp: {
    term: "AHP (Analytic Hierarchy Process)",
    short:
      'Derives precise weights by asking you to compare criteria in pairs: "Is Salary more important than Location?"',
  },
  confidence: {
    term: "Score Confidence",
    short:
      "How certain you are about a score. High confidence = well-researched. Low = gut feeling. Affects result reliability.",
  },
  "bias-detection": {
    term: "Bias Detection",
    short:
      "Checks for common decision-making biases like anchoring (similar scores), halo effect, or ignoring criteria.",
  },
  "composite-confidence": {
    term: "Composite Confidence",
    short:
      "An overall measure of how reliable your decision is, combining score confidence, weight coverage, and completeness.",
  },
  "quality-bar": {
    term: "Decision Quality",
    short:
      "A 0–100% score measuring completeness (all cells scored), weight coverage, and confidence levels.",
  },
  provenance: {
    term: "Score Provenance",
    short:
      "Tracks where a score came from: manual entry, data enrichment, or template default. Helps audit your inputs.",
  },
  "what-if": {
    term: "What-If Analysis",
    short:
      "Experiment with different weights and scores to see how rankings would change — without modifying your actual decision.",
  },
  "weight-normalization": {
    term: "Weight Normalization",
    short:
      "Raw weights are converted to percentages that sum to 100%. A weight of 30 out of total 150 becomes 20%.",
  },
} as const;

/** All valid help topic keys */
export type HelpTopic = keyof typeof HELP_REGISTRY;
