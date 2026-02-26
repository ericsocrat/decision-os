/**
 * WeightDistributionBar — stacked horizontal bar showing normalized weight percentages.
 *
 * Each segment is sized proportionally to its normalized weight and colour-coded
 * to match the criterion's WeightSlider colour.
 */

"use client";

import type { Criterion } from "@/lib/types";

/** Same colour palette as ScoreChart.tsx / WeightSlider. */
const COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#c026d3",
  "#854d0e",
];

interface WeightDistributionBarProps {
  criteria: Criterion[];
}

export function WeightDistributionBar({ criteria }: WeightDistributionBarProps) {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  if (totalWeight === 0 || criteria.length === 0) {
    return (
      <div className="mt-3 rounded-lg bg-gray-100 dark:bg-gray-700 p-3 text-center text-xs text-gray-500 dark:text-gray-400">
        No weights assigned
      </div>
    );
  }

  return (
    <div className="mt-3" role="img" aria-label="Weight distribution bar">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
        Weight Distribution
      </p>
      <div className="flex h-7 rounded-lg overflow-hidden" aria-hidden="true">
        {criteria.map((crit, i) => {
          const pct = (crit.weight / totalWeight) * 100;
          if (pct < 0.5) return null; // Skip tiny segments
          const color = COLORS[i % COLORS.length];
          return (
            <div
              key={crit.id}
              className="flex items-center justify-center text-[10px] font-medium text-white overflow-hidden transition-all duration-200 ease-out"
              style={{
                width: `${pct}%`,
                backgroundColor: color,
                minWidth: pct >= 8 ? undefined : "0px",
              }}
              title={`${crit.name}: ${Math.round(pct)}%`}
            >
              {pct >= 12 && (
                <span className="truncate px-1">
                  {crit.name.length > 8 ? crit.name.slice(0, 7) + "…" : crit.name} {Math.round(pct)}
                  %
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Screen reader text */}
      <div className="sr-only">
        {criteria.map((crit, i) => {
          const pct = Math.round((crit.weight / totalWeight) * 100);
          return (
            <span key={crit.id}>
              {crit.name}: {pct}%{i < criteria.length - 1 ? ", " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
