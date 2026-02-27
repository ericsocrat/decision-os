/**
 * CompositeConfidenceIndicator — traffic-light indicator with expandable breakdown.
 *
 * Shows the composite confidence level (high/moderate/low) with a colored badge
 * and an expandable section showing individual signal contributions.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/118
 */

"use client";

import { useMemo, useState } from "react";
import type { Decision } from "@/lib/types";
import {
  computeCompositeConfidence,
  type CompositeConfidenceResult,
} from "@/lib/composite-confidence";
import type { ConsensusResult } from "@/lib/consensus";
import type { QualityAssessment } from "@/lib/decision-quality";

// ---------------------------------------------------------------------------
//  Styling
// ---------------------------------------------------------------------------

const LEVEL_STYLES = {
  high: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-700 dark:text-green-300",
    badge: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200",
    dot: "bg-green-500",
  },
  moderate: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-700 dark:text-yellow-300",
    badge: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200",
    dot: "bg-yellow-500",
  },
  low: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200",
    dot: "bg-red-500",
  },
};

// ---------------------------------------------------------------------------
//  Signal display config
// ---------------------------------------------------------------------------

interface SignalConfig {
  key: keyof Omit<import("@/lib/composite-confidence").ConfidenceBreakdown, "composite">;
  label: string;
  weightKey: keyof import("@/lib/composite-confidence").ConfidenceWeights;
}

const SIGNAL_CONFIGS: SignalConfig[] = [
  { key: "algorithmAgreement", label: "Algorithm agreement", weightKey: "algorithmAgreement" },
  { key: "scoreConfidence", label: "Score confidence", weightKey: "scoreConfidence" },
  { key: "dataConfidence", label: "Data confidence", weightKey: "dataConfidence" },
  { key: "structuralQuality", label: "Structural quality", weightKey: "structuralQuality" },
];

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

interface CompositeConfidenceIndicatorProps {
  decision: Decision;
  consensus?: ConsensusResult | null;
  quality?: QualityAssessment | null;
}

export function CompositeConfidenceIndicator({
  decision,
  consensus,
  quality,
}: CompositeConfidenceIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  const result = useMemo(
    (): CompositeConfidenceResult => computeCompositeConfidence(decision, consensus, quality),
    [decision, consensus, quality]
  );

  const style = LEVEL_STYLES[result.level];

  return (
    <div
      className={`rounded-lg border ${style.border} ${style.bg} px-4 py-3`}
      data-testid="composite-confidence"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Traffic light dot */}
        <span className={`inline-block w-3 h-3 rounded-full ${style.dot}`} aria-hidden="true" />

        {/* Label */}
        <span className={`text-sm font-semibold ${style.text}`} data-testid="confidence-label">
          {result.label}
        </span>

        {/* Score badge */}
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}
          data-testid="confidence-score"
        >
          {(result.breakdown.composite * 100).toFixed(0)}%
        </span>

        {/* Toggle breakdown */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`text-xs ${style.text} hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ml-auto`}
          aria-expanded={expanded}
          data-testid="toggle-breakdown"
        >
          {expanded ? "Hide details" : "Show details"}
        </button>
      </div>

      {/* Suggestion */}
      <p className={`text-xs mt-1 ${style.text} opacity-80`} data-testid="confidence-suggestion">
        {result.suggestion}
      </p>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-3 space-y-2" data-testid="confidence-breakdown">
          {SIGNAL_CONFIGS.map((signal) => {
            const value = result.breakdown[signal.key];
            const weight = result.weights[signal.weightKey];
            const barPct = Math.round(value * 100);
            const barColor =
              value >= 0.7
                ? "bg-green-400 dark:bg-green-600"
                : value >= 0.4
                  ? "bg-yellow-400 dark:bg-yellow-600"
                  : "bg-red-400 dark:bg-red-600";

            return (
              <div key={signal.key}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-gray-600 dark:text-gray-400">
                    {signal.label}{" "}
                    <span className="text-gray-400 dark:text-gray-500">
                      ({(weight * 100).toFixed(0)}%)
                    </span>
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{barPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all`}
                    style={{ width: `${barPct}%` }}
                    role="progressbar"
                    aria-valuenow={barPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${signal.label}: ${barPct}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
