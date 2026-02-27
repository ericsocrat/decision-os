/**
 * Winner explanation engine — generates plain-language explanations
 * for why the top-ranked option won.
 *
 * Pure function, no React dependencies. Used by WizardStepResults.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/229
 */

import type { DecisionResults, OptionResult } from "./types";

// ---------------------------------------------------------------------------
// Score label (mirrors WizardStepCriteria but avoids importing a component)
// ---------------------------------------------------------------------------

/** Map a raw score (0-10) to a human-readable adjective. */
function label(score: number): string {
  if (score <= 0) return "not scored";
  if (score <= 2) return "poor";
  if (score <= 4) return "below average";
  if (score <= 6) return "average";
  if (score === 7) return "good";
  if (score === 8) return "very good";
  if (score === 9) return "excellent";
  return "outstanding";
}

// ---------------------------------------------------------------------------
// Explanation generator
// ---------------------------------------------------------------------------

/**
 * Generate a plain-language explanation of why the winner won.
 *
 * References the top 2 criteria by name and adjusts tone based on the
 * margin to the runner-up:
 *   - Tie      (< 0.5 pts) → "edges out …"
 *   - Close    (0.5–1.5)   → "leads … trails by …"
 *   - Clear    (> 1.5)     → "leads clearly …"
 *
 * Edge cases: single option, no scored criteria, equal scores.
 */
export function generateWinnerExplanation(
  winner: OptionResult,
  _decision: unknown,
  results: DecisionResults,
): string {
  const { optionName, totalScore, criterionScores } = winner;

  // Sort scored criteria by weighted contribution (effectiveScore) descending
  const sorted = [...criterionScores]
    .filter((cs) => !cs.isNull)
    .sort((a, b) => b.effectiveScore - a.effectiveScore);

  // ── Single option ────────────────────────────────
  if (results.optionResults.length === 1) {
    if (sorted.length === 0) return `${optionName} is your only option.`;
    const top = sorted[0];
    return `${optionName} scores ${totalScore.toFixed(1)}/10, with its strongest area being ${top.criterionName} (${top.rawScore}/10).`;
  }

  // ── Build top-criteria description ───────────────
  const topCriteria = sorted.slice(0, 2);
  if (topCriteria.length === 0) {
    return `${optionName} is ranked #1 with a score of ${totalScore.toFixed(1)}/10.`;
  }
  const criteriaDesc = topCriteria
    .map((cs) => `${label(cs.rawScore)} ${cs.criterionName} (${cs.rawScore}/10)`)
    .join(" and ");

  // ── Margin to runner-up ──────────────────────────
  const runnerUp = results.optionResults.find((r) => r.rank === 2);
  const margin = runnerUp ? winner.totalScore - runnerUp.totalScore : 0;

  if (margin < 0.5 && runnerUp) {
    return `${optionName} edges out ${runnerUp.optionName} by just ${margin.toFixed(2)} points. Key strengths: ${criteriaDesc}.`;
  }

  if (margin < 1.5 && runnerUp) {
    return `${optionName} leads at ${totalScore.toFixed(1)}/10, driven by its ${criteriaDesc}. ${runnerUp.optionName} trails by ${margin.toFixed(2)} points.`;
  }

  // Clear winner
  return `${optionName} leads clearly at ${totalScore.toFixed(1)}/10, driven by its ${criteriaDesc}.`;
}
