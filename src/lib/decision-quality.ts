/**
 * Decision Quality Assessment — pure functions that evaluate the structural
 * quality of a decision setup and produce actionable indicators.
 *
 * All functions are side-effect-free and operate on the Decision type.
 */

import type { Decision } from "./types";
import { readScore, normalizeWeights } from "./scoring";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = "info" | "warning" | "critical";

export interface QualityIndicator {
  id: string;
  label: string;
  score: number; // 0–100 (per-check quality)
  severity: Severity;
  suggestion: string;
}

export interface QualityAssessment {
  /** Individual quality checks */
  indicators: QualityIndicator[];
  /** Overall quality score (0–100, weighted average of individual scores) */
  overallScore: number;
}

// ---------------------------------------------------------------------------
// Individual quality checks
// ---------------------------------------------------------------------------

function checkOptionCount(decision: Decision): QualityIndicator {
  const count = decision.options.length;
  if (count >= 3) {
    return {
      id: "option-count",
      label: "Option count",
      score: 100,
      severity: "info",
      suggestion: `${count} options — good diversity of choices.`,
    };
  }
  if (count === 2) {
    return {
      id: "option-count",
      label: "Option count",
      score: 60,
      severity: "warning",
      suggestion: "Only 2 options. Consider adding a third to avoid binary thinking.",
    };
  }
  return {
    id: "option-count",
    label: "Option count",
    score: 0,
    severity: "critical",
    suggestion:
      count === 0
        ? "No options defined. Add at least 2 options to compare."
        : "Only 1 option. Add at least one more to enable comparison.",
  };
}

function checkCriteriaCount(decision: Decision): QualityIndicator {
  const count = decision.criteria.length;
  if (count >= 4) {
    return {
      id: "criteria-count",
      label: "Criteria count",
      score: 100,
      severity: "info",
      suggestion: `${count} criteria — thorough evaluation framework.`,
    };
  }
  if (count >= 2) {
    return {
      id: "criteria-count",
      label: "Criteria count",
      score: 60,
      severity: "warning",
      suggestion: `Only ${count} criteria. Consider adding more dimensions to reduce bias.`,
    };
  }
  return {
    id: "criteria-count",
    label: "Criteria count",
    score: 0,
    severity: "critical",
    suggestion:
      count === 0
        ? "No criteria defined. Add at least 2 criteria for meaningful evaluation."
        : "Only 1 criterion. Add more to avoid single-factor decision making.",
  };
}

function checkWeightBalance(decision: Decision): QualityIndicator {
  const criteria = decision.criteria;
  if (criteria.length < 2) {
    return {
      id: "weight-balance",
      label: "Weight balance",
      score: 100,
      severity: "info",
      suggestion: "Add more criteria to evaluate weight balance.",
    };
  }

  const normalized = normalizeWeights(criteria.map((c) => c.weight));
  const maxWeight = Math.max(...normalized);
  const maxCrit = criteria[normalized.indexOf(maxWeight)];

  if (maxWeight > 0.8) {
    return {
      id: "weight-balance",
      label: "Weight balance",
      score: 20,
      severity: "critical",
      suggestion: `"${maxCrit.name}" has ${(maxWeight * 100).toFixed(0)}% of total weight. Consider redistributing for a more balanced evaluation.`,
    };
  }
  if (maxWeight > 0.6) {
    return {
      id: "weight-balance",
      label: "Weight balance",
      score: 50,
      severity: "warning",
      suggestion: `"${maxCrit.name}" dominates at ${(maxWeight * 100).toFixed(0)}%. Other criteria may have little impact on the result.`,
    };
  }
  return {
    id: "weight-balance",
    label: "Weight balance",
    score: 100,
    severity: "info",
    suggestion: "Weights are well distributed across criteria.",
  };
}

function checkScoreVariance(decision: Decision): QualityIndicator {
  const allScores: number[] = [];
  for (const opt of decision.options) {
    for (const crit of decision.criteria) {
      const s = readScore(decision.scores, opt.id, crit.id);
      if (s !== null) allScores.push(s);
    }
  }

  if (allScores.length < 2) {
    return {
      id: "score-variance",
      label: "Score variance",
      score: 100,
      severity: "info",
      suggestion: "Not enough scores to assess variance.",
    };
  }

  const min = Math.min(...allScores);
  const max = Math.max(...allScores);
  const range = max - min;

  if (range <= 2) {
    return {
      id: "score-variance",
      label: "Score variance",
      score: 30,
      severity: "warning",
      suggestion: `All scores fall within a ${range}-point range (${min}–${max}). Spread your scores to better differentiate options.`,
    };
  }
  if (range <= 4) {
    return {
      id: "score-variance",
      label: "Score variance",
      score: 70,
      severity: "info",
      suggestion: `Scores span ${range} points. Consider whether your differentiation is strong enough.`,
    };
  }
  return {
    id: "score-variance",
    label: "Score variance",
    score: 100,
    severity: "info",
    suggestion: `Good score spread (${range} points). Options are well differentiated.`,
  };
}

function checkCompleteness(decision: Decision): QualityIndicator {
  const total = decision.options.length * decision.criteria.length;
  if (total === 0) {
    return {
      id: "completeness",
      label: "Score completeness",
      score: 0,
      severity: "critical",
      suggestion: "Add options and criteria, then score them.",
    };
  }

  let filled = 0;
  for (const opt of decision.options) {
    for (const crit of decision.criteria) {
      if (readScore(decision.scores, opt.id, crit.id) !== null) filled++;
    }
  }

  const ratio = filled / total;
  if (ratio >= 1) {
    return {
      id: "completeness",
      label: "Score completeness",
      score: 100,
      severity: "info",
      suggestion: "All scores filled — complete evaluation.",
    };
  }
  return {
    id: "completeness",
    label: "Score completeness",
    score: Math.round(ratio * 100),
    severity: "critical",
    suggestion: `${total - filled} of ${total} scores missing. Fill all scores for reliable results.`,
  };
}

function checkCostBenefitBalance(decision: Decision): QualityIndicator {
  const criteria = decision.criteria;
  if (criteria.length < 2) {
    return {
      id: "cost-benefit-balance",
      label: "Cost/benefit balance",
      score: 100,
      severity: "info",
      suggestion: "Add more criteria to assess cost/benefit balance.",
    };
  }

  const costCount = criteria.filter((c) => c.type === "cost").length;
  const benefitCount = criteria.filter((c) => c.type === "benefit").length;

  if (costCount === 0) {
    return {
      id: "cost-benefit-balance",
      label: "Cost/benefit balance",
      score: 60,
      severity: "info",
      suggestion:
        "All criteria are benefits. Consider adding cost criteria for a more balanced evaluation.",
    };
  }
  if (benefitCount === 0) {
    return {
      id: "cost-benefit-balance",
      label: "Cost/benefit balance",
      score: 60,
      severity: "info",
      suggestion:
        "All criteria are costs. Consider adding benefit criteria to capture upside potential.",
    };
  }
  return {
    id: "cost-benefit-balance",
    label: "Cost/benefit balance",
    score: 100,
    severity: "info",
    suggestion: `Good mix: ${costCount} cost and ${benefitCount} benefit criteria.`,
  };
}

// ---------------------------------------------------------------------------
// Main assessment function
// ---------------------------------------------------------------------------

/**
 * Assess the structural quality of a decision setup.
 * Returns individual quality indicators and an overall score.
 */
export function assessDecisionQuality(decision: Decision): QualityAssessment {
  const indicators: QualityIndicator[] = [
    checkOptionCount(decision),
    checkCriteriaCount(decision),
    checkWeightBalance(decision),
    checkScoreVariance(decision),
    checkCompleteness(decision),
    checkCostBenefitBalance(decision),
  ];

  const totalScore = indicators.reduce((sum, i) => sum + i.score, 0);
  const overallScore = indicators.length > 0 ? Math.round(totalScore / indicators.length) : 0;

  return { indicators, overallScore };
}
