/**
 * PatternInsights — displays detected cross-decision patterns as cards.
 *
 * Shows pattern cards with confidence indicators, evidence lists,
 * and a "Not enough data" placeholder when fewer than 3 decisions exist.
 */

"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  Scale,
  Target,
  Repeat,
  Brain,
  Info,
} from "lucide-react";
import type { Decision } from "@/lib/types";
import { getDecisions } from "@/lib/storage";
import { detectPatterns, MIN_DECISIONS } from "@/lib/patterns";
import type { DecisionPattern, PatternType } from "@/lib/patterns";

// ---------------------------------------------------------------------------
// Style map
// ---------------------------------------------------------------------------

const PATTERN_STYLES: Record<
  PatternType,
  { icon: typeof TrendingUp; color: string; bg: string; border: string }
> = {
  "scoring-bias": {
    icon: TrendingUp,
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    border: "border-orange-300 dark:border-orange-700",
  },
  "weight-preference": {
    icon: Scale,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    border: "border-blue-300 dark:border-blue-700",
  },
  "prediction-accuracy": {
    icon: Target,
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-300 dark:border-purple-700",
  },
  "criterion-reuse": {
    icon: Repeat,
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    border: "border-emerald-300 dark:border-emerald-700",
  },
};

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

interface PatternCardProps {
  pattern: DecisionPattern;
}

function PatternCard({ pattern }: Readonly<PatternCardProps>) {
  const style = PATTERN_STYLES[pattern.type];
  const Icon = style.icon;
  const confidencePct = Math.round(pattern.confidence * 100);

  return (
    <div
      className={`rounded-lg border ${style.border} ${style.bg} p-4 space-y-2`}
      data-testid="pattern-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 shrink-0 ${style.color}`} />
          <h4 className={`font-semibold text-sm ${style.color}`}>
            {pattern.title}
          </h4>
        </div>
        <span
          className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums"
          title="Confidence level"
        >
          {confidencePct}%
        </span>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300">
        {pattern.description}
      </p>

      {pattern.evidence.length > 0 && (
        <ul className="space-y-0.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
          {pattern.evidence.map((e) => (
            <li key={e} className="flex items-start gap-1.5">
              <span className="mt-1 block h-1 w-1 rounded-full bg-gray-400 shrink-0" />
              {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PatternInsightsProps {
  decision: Decision;
}

export function PatternInsights({ decision }: Readonly<PatternInsightsProps>) {
  const patterns = useMemo(() => {
    const allDecisions = getDecisions();
    return detectPatterns(allDecisions);
  // We include decision.id so patterns refresh when switching decisions
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.id]);

  // ── Not enough data ─────────────────────────────────────────────────
  if (patterns.length === 0) {
    return (
      <section
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center"
        aria-label="Pattern Insights"
        data-testid="patterns-empty"
      >
        <Brain className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
          No Patterns Detected
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {`Make at least ${MIN_DECISIONS} decisions with scores to discover your decision-making patterns.`}
        </p>
      </section>
    );
  }

  // ── Pattern cards ───────────────────────────────────────────────────
  return (
    <section
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4"
      aria-label="Pattern Insights"
    >
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Decision Patterns
        </h3>
        <span className="rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
          {patterns.length}
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-md bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-500 dark:text-gray-400">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-gray-400" />
        <span>
          These patterns are detected from your decision history. Higher confidence means stronger evidence.
        </span>
      </div>

      <div className="space-y-3" data-testid="pattern-list">
        {patterns.map((p) => (
          <PatternCard key={p.id} pattern={p} />
        ))}
      </div>
    </section>
  );
}
