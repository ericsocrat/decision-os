/**
 * QualityBar — Decision quality dashboard showing overall score and
 * expandable list of quality indicators with actionable suggestions.
 */

"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { Decision } from "@/lib/types";
import {
  assessDecisionQuality,
  type QualityIndicator,
  type Severity,
} from "@/lib/decision-quality";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function scoreTextColor(score: number): string {
  if (score >= 80) return "text-green-700 dark:text-green-400";
  if (score >= 50) return "text-yellow-700 dark:text-yellow-400";
  return "text-red-700 dark:text-red-400";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 50) return "Fair";
  return "Needs Work";
}

const severityIcon: Record<Severity, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityColor: Record<Severity, string> = {
  critical: "text-red-500 dark:text-red-400",
  warning: "text-yellow-500 dark:text-yellow-400",
  info: "text-blue-500 dark:text-blue-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface QualityBarProps {
  decision: Decision;
}

export function QualityBar({ decision }: QualityBarProps) {
  const [expanded, setExpanded] = useState(false);
  const assessment = useMemo(() => assessDecisionQuality(decision), [decision]);
  const { overallScore, indicators } = assessment;

  // Sort: critical first, then warning, then info
  const sortedIndicators = useMemo(() => {
    const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
    return [...indicators].sort((a, b) => order[a.severity] - order[b.severity]);
  }, [indicators]);

  const hasCritical = indicators.some((i) => i.severity === "critical");
  const hasWarning = indicators.some((i) => i.severity === "warning");

  return (
    <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Summary bar */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        {/* Score badge */}
        <span
          className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-white text-sm font-bold ${scoreColor(overallScore)}`}
          aria-label={`Quality score: ${overallScore}`}
        >
          {overallScore}
        </span>

        {/* Label */}
        <div className="flex-1 text-left">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Decision Quality:{" "}
            <span className={scoreTextColor(overallScore)}>{scoreLabel(overallScore)}</span>
          </span>
          <div className="mt-1 h-1.5 w-full max-w-xs rounded-full bg-gray-200 dark:bg-gray-600">
            <div
              className={`h-1.5 rounded-full transition-all ${scoreColor(overallScore)}`}
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>

        {/* Status icons */}
        <div className="flex items-center gap-1.5">
          {hasCritical && (
            <AlertCircle className="h-4 w-4 text-red-500" aria-label="Has critical issues" />
          )}
          {hasWarning && (
            <AlertTriangle className="h-4 w-4 text-yellow-500" aria-label="Has warnings" />
          )}
        </div>

        {/* Expand/collapse chevron */}
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Expanded indicator list */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {sortedIndicators.map((indicator: QualityIndicator) => {
            const Icon = severityIcon[indicator.severity];
            return (
              <div key={indicator.id} className="flex items-start gap-3 px-4 py-3">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${severityColor[indicator.severity]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {indicator.label}
                    </span>
                    <span className={`text-xs font-medium ${scoreTextColor(indicator.score)}`}>
                      {indicator.score}/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {indicator.suggestion}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
