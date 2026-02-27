/**
 * Score Chart — horizontal bar chart of option scores using Recharts.
 *
 * Shows total weighted score per option with stacked criterion contributions.
 * Renders client-side only (recharts requires browser DOM).
 *
 * Wrapped in React.memo for performance — only re-renders when optionResults change.
 */

"use client";

import { memo, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { OptionResult } from "@/lib/types";

const COLORS = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#dc2626", // red-600
  "#9333ea", // purple-600
  "#ea580c", // orange-600
  "#0891b2", // cyan-600
  "#c026d3", // fuchsia-600
  "#854d0e", // yellow-800
];

const OPTION_COLORS = [
  "#2563eb", // 1st — blue
  "#6b7280", // 2nd — gray
  "#9ca3af", // 3rd — lighter gray
  "#d1d5db", // 4th+
  "#e5e7eb",
  "#f3f4f6",
];

interface ScoreChartProps {
  optionResults: OptionResult[];
}

function ScoreChartInner({ optionResults }: ScoreChartProps) {
  // Simple total score bar chart
  const totalData = useMemo(
    () =>
      optionResults.map((r, i) => ({
        name: r.optionName,
        score: r.totalScore,
        rank: r.rank,
        fill: OPTION_COLORS[Math.min(i, OPTION_COLORS.length - 1)],
      })),
    [optionResults]
  );

  // Stacked breakdown data
  const stackedData = useMemo(() => {
    if (optionResults.length === 0) return [];
    return optionResults.map((r) => {
      const entry: Record<string, string | number> = { name: r.optionName };
      for (const cs of r.criterionScores) {
        entry[cs.criterionName] = cs.effectiveScore;
      }
      return entry;
    });
  }, [optionResults]);

  const criteriaNames = useMemo(() => {
    if (optionResults.length === 0) return [];
    return optionResults[0].criterionScores.map((cs) => cs.criterionName);
  }, [optionResults]);

  // Build accessible summary for screen readers (must be before early return to satisfy Rules of Hooks)
  const chartSummary = useMemo(() => {
    if (optionResults.length === 0) return "";
    const sorted = [...optionResults].sort((a, b) => a.rank - b.rank);
    const topOption = sorted[0];
    return `Ranked scores: ${sorted.map((r) => `${r.optionName} (${r.totalScore.toFixed(1)})`).join(", ")}. Top choice: ${topOption.optionName} with score ${topOption.totalScore.toFixed(2)}.`;
  }, [optionResults]);

  if (optionResults.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Total Score Chart */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Total Weighted Scores
        </h3>
        <div className="h-[200px] w-full" role="img" aria-label={chartSummary}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={totalData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" domain={[0, 10]} fontSize={12} />
              <YAxis dataKey="name" type="category" fontSize={12} width={75} />
              <Tooltip
                formatter={(value: number | undefined) => [Number(value ?? 0).toFixed(2), "Score"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={32}>
                {totalData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stacked Criterion Breakdown */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Criterion Contribution Breakdown
        </h3>
        <div className="h-[200px] w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stackedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" domain={[0, 10]} fontSize={12} />
              <YAxis dataKey="name" type="category" fontSize={12} width={75} />
              <Tooltip
                formatter={(value: number | undefined, name?: string) => [
                  Number(value ?? 0).toFixed(2),
                  name ?? "",
                ]}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {criteriaNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  stackId="criteria"
                  fill={COLORS[i % COLORS.length]}
                  maxBarSize={32}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Screen-reader-only data table as text alternative for charts */}
      <table className="sr-only" aria-label="Score breakdown by option and criterion">
        <thead>
          <tr>
            <th scope="col">Option</th>
            <th scope="col">Total Score</th>
            <th scope="col">Rank</th>
            {criteriaNames.map((name) => (
              <th key={name} scope="col">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {optionResults.map((r) => (
            <tr key={r.optionName}>
              <th scope="row">{r.optionName}</th>
              <td>{r.totalScore.toFixed(2)}</td>
              <td>{r.rank}</td>
              {r.criterionScores.map((cs) => (
                <td key={cs.criterionName}>{cs.effectiveScore.toFixed(2)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const ScoreChart = memo(ScoreChartInner);
