/**
 * CrossDecisionInsights — aggregated statistics across all decisions.
 * Shows total count, common criteria, average quality, etc.
 */

"use client";

import { memo, useMemo } from "react";
import type { DecisionCardData } from "@/hooks/useDecisionList";
import { BarChart3, Target, TrendingUp } from "lucide-react";

interface CrossDecisionInsightsProps {
  cards: DecisionCardData[];
}

export const CrossDecisionInsights = memo(function CrossDecisionInsights({
  cards,
}: CrossDecisionInsightsProps) {
  const insights = useMemo(() => {
    const total = cards.length;
    const scored = cards.filter((c) => c.status === "scored" || c.status === "winner").length;

    // Average quality
    const withQuality = cards.filter((c) => c.completeness.total > 0);
    const avgQuality =
      withQuality.length > 0
        ? Math.round(
            withQuality.reduce((sum, c) => sum + c.completeness.percent, 0) / withQuality.length
          )
        : 0;

    // Most common top criterion
    const critCounts = new Map<string, number>();
    for (const card of cards) {
      for (const crit of card.decision.criteria) {
        const count = critCounts.get(crit.name) ?? 0;
        critCounts.set(crit.name, count + 1);
      }
    }
    let topCriterion = "";
    let topCount = 0;
    for (const [name, count] of critCounts) {
      if (count > topCount) {
        topCriterion = name;
        topCount = count;
      }
    }

    return { total, scored, avgQuality, topCriterion, topCount };
  }, [cards]);

  if (cards.length < 2) return null;

  return (
    <section
      data-testid="cross-decision-insights"
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-5"
    >
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        Cross-Decision Insights
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
          <span>
            <strong className="text-gray-900 dark:text-gray-100">{insights.total}</strong>{" "}
            decision{insights.total !== 1 ? "s" : ""} made ·{" "}
            <strong className="text-gray-900 dark:text-gray-100">{insights.scored}</strong> scored
          </span>
        </div>

        {insights.topCriterion && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Target className="h-4 w-4 text-purple-500 shrink-0" />
            <span>
              Most common criterion:{" "}
              <strong className="text-gray-900 dark:text-gray-100">
                &ldquo;{insights.topCriterion}&rdquo;
              </strong>
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <BarChart3 className="h-4 w-4 text-amber-500 shrink-0" />
          <span>
            Average quality:{" "}
            <strong className="text-gray-900 dark:text-gray-100">{insights.avgQuality}%</strong>
          </span>
        </div>
      </div>
    </section>
  );
});
