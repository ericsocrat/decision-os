/**
 * Confidence Strategy Selector
 *
 * Lets users choose how per-score confidence levels affect the final rankings.
 * Three strategies:
 *   - "none"     — confidence is displayed only, no effect on scoring
 *   - "penalize" — low/medium confidence scores receive a multiplier penalty
 *   - "widen"    — confidence is stored for downstream Monte Carlo / sensitivity
 *
 * @see https://github.com/ericsocrat/decision-os/issues/94
 */

"use client";

import { ShieldCheck, ShieldAlert, Activity } from "lucide-react";
import type { ConfidenceStrategy } from "@/lib/types";

interface ConfidenceStrategySelectorProps {
  /** Current strategy */
  value: ConfidenceStrategy;
  /** Called when the user selects a strategy */
  onChange: (strategy: ConfidenceStrategy) => void;
}

const STRATEGIES: {
  key: ConfidenceStrategy;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
}[] = [
  {
    key: "none",
    label: "Display Only",
    description: "Confidence is shown but does not affect scores",
    icon: ShieldCheck,
  },
  {
    key: "penalize",
    label: "Penalize",
    description: "Low-confidence scores are reduced (×0.5 low, ×0.8 med)",
    icon: ShieldAlert,
  },
  {
    key: "widen",
    label: "Widen Range",
    description: "Confidence widens the range for sensitivity analysis",
    icon: Activity,
  },
];

export function ConfidenceStrategySelector({
  value,
  onChange,
}: ConfidenceStrategySelectorProps) {
  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
      data-testid="confidence-strategy-selector"
    >
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Confidence Adjustment
      </h3>
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        role="radiogroup"
        aria-label="Confidence adjustment strategy"
      >
        {STRATEGIES.map(({ key, label, description, icon: Icon }) => {
          const selected = value === key;
          return (
            <button
              key={key}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(key)}
              className={`flex items-start gap-2 rounded-md border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                selected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400"
                  : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <Icon
                className={`h-4 w-4 mt-0.5 shrink-0 ${
                  selected
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
                aria-hidden
              />
              <div>
                <span
                  className={`block text-sm font-medium ${
                    selected
                      ? "text-blue-800 dark:text-blue-200"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {label}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
