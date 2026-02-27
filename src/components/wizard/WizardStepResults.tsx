/**
 * Wizard Step 4 — Simplified Results and Advanced Mode Bridge.
 *
 * Shows:
 *   1. Winner card — hero display with rank, name, score, bar, plain-language explanation
 *   2. Runner-ups — compact ranked list
 *   3. Confidence checklist — Robustness / Agreement / Margin indicators
 *   4. Explore Further — 4 cards bridging to Advanced mode
 *
 * Uses the same DecisionProvider contexts as ResultsView but presents
 * a dramatically simplified interface for first-time users.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/229
 */

"use client";

import { memo, useMemo } from "react";
import {
  Trophy,
  Shield,
  FlaskConical,
  Scale,
  TrendingUp,
  Dices,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useDecisionData, useResultsContext } from "@/components/DecisionProvider";
import { generateWinnerExplanation } from "@/lib/explain-results";
import { scoreColor } from "@/components/wizard/WizardStepCriteria";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WizardStepResultsProps {
  /** Callback to switch to advanced mode (from GuidedWizard). */
  onSwitchToAdvanced?: () => void;
}

type ConfidenceLevel = "strong" | "moderate" | "weak";

interface ConfidenceIndicator {
  label: string;
  level: ConfidenceLevel;
  description: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SCORE = 10;

const EXPLORE_CARDS = [
  {
    icon: FlaskConical,
    title: "What-If Analysis",
    description: "Test how changing a score would affect the outcome",
  },
  {
    icon: Scale,
    title: "Compare Methods",
    description: "See how WSM, TOPSIS, and Regret compare",
  },
  {
    icon: TrendingUp,
    title: "Sensitivity",
    description: "Find which criteria could flip your decision",
  },
  {
    icon: Dices,
    title: "Monte Carlo",
    description: "Run 10,000 simulations with random score variations",
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const WizardStepResults = memo(function WizardStepResults({
  onSwitchToAdvanced,
}: WizardStepResultsProps) {
  const { decision } = useDecisionData();
  const { results, topsisResults, regretResults, sensitivity } = useResultsContext();

  const winner = results.optionResults.length > 0 ? results.optionResults[0] : null;
  const runnerUps = results.optionResults.slice(1);

  // ── Winner explanation ─────────────────────────────
  const explanation = useMemo(
    () => (winner ? generateWinnerExplanation(winner, decision, results) : ""),
    [winner, decision, results],
  );

  // ── Confidence indicators ──────────────────────────
  const confidence = useMemo((): ConfidenceIndicator[] => {
    if (!winner) return [];

    const indicators: ConfidenceIndicator[] = [];

    // 1. Robustness — sensitivity flips at ±20%
    const flips = sensitivity.points.filter((p) => p.winnerChanged).length;
    if (flips === 0) {
      indicators.push({
        label: "Robustness",
        level: "strong",
        description:
          "The winner holds even with ±20% weight changes on all criteria.",
      });
    } else if (flips <= 2) {
      indicators.push({
        label: "Robustness",
        level: "moderate",
        description: `${flips} weight swing(s) would change the winner. Consider reviewing those criteria.`,
      });
    } else {
      indicators.push({
        label: "Robustness",
        level: "weak",
        description: `${flips} weight swings would change the winner. The result is sensitive to your weights.`,
      });
    }

    // 2. Method Agreement — WSM / TOPSIS / Regret
    if (results.optionResults.length >= 2 && topsisResults.rankings.length >= 2) {
      const wsmWinner = results.optionResults[0].optionId;
      const topsisWinner = topsisResults.rankings[0].optionId;
      const regretWinner =
        regretResults.rankings.length > 0
          ? regretResults.rankings[0].optionId
          : null;

      const methods = [
        wsmWinner,
        topsisWinner,
        ...(regretWinner ? [regretWinner] : []),
      ];
      const agreeing = methods.filter((m) => m === wsmWinner).length;
      const total = methods.length;

      if (agreeing === total) {
        indicators.push({
          label: "Agreement",
          level: "strong",
          description: `All ${total} scoring methods agree on the winner.`,
        });
      } else if (agreeing >= Math.ceil(total / 2)) {
        indicators.push({
          label: "Agreement",
          level: "moderate",
          description: `${agreeing} of ${total} methods agree. Different methods weight trade-offs differently.`,
        });
      } else {
        indicators.push({
          label: "Agreement",
          level: "weak",
          description:
            "Methods disagree on the winner. Explore Compare Methods for details.",
        });
      }
    }

    // 3. Close Call — score margin
    if (results.optionResults.length >= 2) {
      const margin =
        results.optionResults[0].totalScore - results.optionResults[1].totalScore;
      if (margin > 1.5) {
        indicators.push({
          label: "Margin",
          level: "strong",
          description: `Clear lead of ${margin.toFixed(2)} points over the runner-up.`,
        });
      } else if (margin >= 0.5) {
        indicators.push({
          label: "Margin",
          level: "moderate",
          description: `${margin.toFixed(2)} point margin — a close race. Review your most impactful scores.`,
        });
      } else {
        indicators.push({
          label: "Margin",
          level: "weak",
          description: `Only ${margin.toFixed(2)} points apart — essentially a tie. Consider scoring more carefully.`,
        });
      }
    }

    return indicators;
  }, [winner, results, topsisResults, regretResults, sensitivity]);

  // ── Empty state ────────────────────────────────────
  if (!winner) {
    return (
      <div className="text-center py-12" data-testid="wizard-step-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No results yet — go back and score your options.
        </p>
      </div>
    );
  }

  // ── Level badge helpers ────────────────────────────
  function levelLabel(level: ConfidenceLevel): string {
    switch (level) {
      case "strong":
        return "Strong";
      case "moderate":
        return "Moderate";
      case "weak":
        return "Sensitive";
    }
  }

  function levelColor(level: ConfidenceLevel): string {
    switch (level) {
      case "strong":
        return "text-green-600 dark:text-green-400";
      case "moderate":
        return "text-amber-600 dark:text-amber-400";
      case "weak":
        return "text-red-600 dark:text-red-400";
    }
  }

  return (
    <div className="space-y-6" data-testid="wizard-step-4">
      {/* ── Winner Card ─────────────────────────────── */}
      <div data-testid="winner-card">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Your top choice
        </p>
        <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 p-5">
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                #1
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {winner.optionName}
              </h3>
            </div>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {winner.totalScore.toFixed(2)}/10
            </span>
          </div>

          {/* Score bar */}
          <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 mb-4">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scoreColor(Math.round(winner.totalScore))}`}
              style={{ width: `${(winner.totalScore / MAX_SCORE) * 100}%` }}
              data-testid="winner-score-bar"
            />
          </div>

          {/* Explanation */}
          <p
            className="text-sm text-gray-600 dark:text-gray-300 italic"
            data-testid="winner-explanation"
          >
            &ldquo;{explanation}&rdquo;
          </p>
        </div>
      </div>

      {/* ── Runner-ups ──────────────────────────────── */}
      {runnerUps.length > 0 && (
        <div data-testid="runner-ups">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Runner-ups
          </h4>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {runnerUps.map((option) => (
              <div
                key={option.optionId}
                className="flex items-center gap-3 px-4 py-3"
                data-testid={`runner-up-${option.rank}`}
              >
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">
                  #{option.rank}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                  {option.optionName}
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16 text-right">
                  {option.totalScore.toFixed(2)}/10
                </span>
                <div className="w-24 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full ${scoreColor(Math.round(option.totalScore))}`}
                    style={{
                      width: `${(option.totalScore / MAX_SCORE) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Decision Confidence ─────────────────────── */}
      {confidence.length > 0 && (
        <div data-testid="confidence-checklist">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            Decision Confidence
          </h4>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            {confidence.map((ind) => (
              <div
                key={ind.label}
                className="flex items-start gap-2.5"
                data-testid={`confidence-${ind.label.toLowerCase()}`}
              >
                {ind.level === "strong" && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                )}
                {ind.level === "moderate" && (
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                )}
                {ind.level === "weak" && (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {ind.label}:{" "}
                    <span className={levelColor(ind.level)}>
                      {levelLabel(ind.level)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {ind.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Explore Further ──────────────────────────── */}
      <div data-testid="explore-further">
        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Explore Further
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {EXPLORE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                type="button"
                onClick={onSwitchToAdvanced}
                className="flex flex-col items-start gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid={`explore-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {card.title}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {card.description}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
          These tools are available in Advanced mode for deeper analysis.
        </p>
      </div>
    </div>
  );
});
