"use client";

/**
 * ProactiveInsights — Surfaces key decision intelligence directly in
 * the Results tab as actionable, plain-language insight cards.
 */

import { useMemo } from "react";
import { useDecisionData, useResultsContext } from "./DecisionProvider";
import {
  generateProactiveInsights,
  type ProactiveInsight,
  type InsightSeverity,
} from "@/lib/proactive-insights";

interface ProactiveInsightsProps {
  /** Callback to switch to another tab (e.g. "sensitivity", "monte-carlo") */
  readonly onTabChange?: (tab: string) => void;
}

const SEVERITY_STYLES: Record<InsightSeverity, string> = {
  positive: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30",
  warning: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30",
  info: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30",
};

const SEVERITY_TEXT: Record<InsightSeverity, string> = {
  positive: "text-green-800 dark:text-green-200",
  warning: "text-amber-800 dark:text-amber-200",
  info: "text-blue-800 dark:text-blue-200",
};

function InsightCard({
  insight,
  onNavigate,
}: {
  readonly insight: ProactiveInsight;
  readonly onNavigate?: (target: string) => void;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${SEVERITY_STYLES[insight.severity]}`}
      data-testid={`insight-${insight.type}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none flex-shrink-0" aria-hidden="true">
          {insight.icon}
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-snug ${SEVERITY_TEXT[insight.severity]}`}>
            {insight.headline}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
            {insight.detail}
          </p>
          {insight.action && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate(insight.action!.target)}
              className="mt-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-dotted underline-offset-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              data-testid={`insight-action-${insight.type}`}
            >
              {insight.action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const ACTION_TARGET_TO_TAB: Record<string, string> = {
  "sensitivity-tab": "sensitivity",
  "monte-carlo-tab": "montecarlo",
  "builder-tab": "builder",
};

export function ProactiveInsights({ onTabChange }: ProactiveInsightsProps) {
  const { decision } = useDecisionData();
  const { results, sensitivity, swingPercent } = useResultsContext();

  const insights = useMemo(
    () => generateProactiveInsights(decision, results, sensitivity, swingPercent),
    [decision, results, sensitivity, swingPercent]
  );

  const handleNavigate = onTabChange
    ? (target: string) => onTabChange(ACTION_TARGET_TO_TAB[target] ?? target)
    : undefined;

  if (insights.length === 0) return null;

  return (
    <section aria-labelledby="insights-heading" data-testid="proactive-insights">
      <h2
        id="insights-heading"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3"
      >
        <span aria-hidden="true">💡</span>
        Key Insights
      </h2>
      <div className="space-y-2">
        {insights.map((insight) => (
          <InsightCard key={insight.type} insight={insight} onNavigate={handleNavigate} />
        ))}
      </div>
    </section>
  );
}
