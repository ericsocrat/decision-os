/**
 * Sensitivity Analysis view — weight swing analysis.
 *
 * Shows how the winner changes (or doesn't) when each criterion's
 * weight is adjusted by ±N%.
 */

"use client";

import { useResultsContext, useActions } from "./DecisionProvider";
import { Activity, Shield, AlertTriangle } from "lucide-react";

export function SensitivityView() {
  const { sensitivity, swingPercent, results } = useResultsContext();
  const { setSwingPercent } = useActions();

  if (results.optionResults.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-gray-500 dark:text-gray-400">
        <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>Add options and criteria to see sensitivity analysis.</p>
      </div>
    );
  }

  const changedPoints = sensitivity.points.filter((p) => p.winnerChanged);
  const isRobust = changedPoints.length === 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <section aria-labelledby="sensitivity-heading">
        <h2
          id="sensitivity-heading"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3"
        >
          <Activity className="h-5 w-5 text-purple-600" />
          Sensitivity Analysis
        </h2>

        <div className="flex items-center gap-3 mb-4">
          <label
            htmlFor="swing-percent"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Weight swing:
          </label>
          <span id="swing-range-desc" className="sr-only">
            Adjust weight swing from 5% to 50%
          </span>
          <input
            id="swing-percent"
            type="range"
            min={5}
            max={50}
            step={5}
            value={swingPercent}
            onChange={(e) => setSwingPercent(Number(e.target.value))}
            className="w-32 accent-purple-600"
            aria-label="Swing percentage"
            aria-describedby="swing-range-desc"
          />
          <span className="text-sm font-medium text-purple-700 dark:text-purple-400 min-w-[3rem]">
            ±{swingPercent}%
          </span>
        </div>

        {/* Summary */}
        <output
          className={`block rounded-lg border p-4 mb-4 ${
            isRobust
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30"
              : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/30"
          }`}
        >
          <div className="flex items-start gap-2">
            {isRobust ? (
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`text-sm font-medium ${isRobust ? "text-green-800 dark:text-green-300" : "text-yellow-800 dark:text-yellow-300"}`}
              >
                {isRobust ? "Robust Result" : "Sensitive Result"}
              </p>
              <p
                className={`text-sm ${isRobust ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-400"}`}
              >
                {sensitivity.summary}
              </p>
            </div>
          </div>
        </output>

        {/* Detailed Points */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <table
            className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
            aria-label="Sensitivity analysis details"
          >
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Criterion
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Weight Change
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Winner
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sensitivity.points.map((point, i) => {
                const direction = point.adjustedWeight > point.originalWeight ? "↑ Up" : "↓ Down";
                return (
                  <tr
                    key={`${point.criterionId}-${i}`}
                    className={point.winnerChanged ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}
                  >
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                      {point.criterionName}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-gray-600 dark:text-gray-400">
                      {direction}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-gray-600 dark:text-gray-400">
                      {point.originalWeight} → {point.adjustedWeight}
                    </td>
                    <td className="px-4 py-2 text-sm text-center font-medium">
                      {point.winnerChanged ? (
                        <span className="text-yellow-700 dark:text-yellow-400">
                          {point.originalWinner} → {point.newWinner}
                        </span>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">{point.newWinner}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {point.winnerChanged ? (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-200">
                          Changed
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-200">
                          Stable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Explanation */}
      <section aria-labelledby="sensitivity-explain">
        <h2
          id="sensitivity-explain"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3"
        >
          How It Works
        </h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p>
            <strong>Weight Swing Analysis</strong> tests the robustness of your decision. For each
            criterion, we increase and decrease its weight by ±{swingPercent}% and recompute the
            rankings.
          </p>
          <p>
            If the winner changes, that criterion is a &quot;sensitive&quot; driver — small shifts
            in how you value it could flip the outcome. A{" "}
            <span className="text-green-700 font-medium">robust</span> result means the winner holds
            even as priorities shift.
          </p>
          <p>
            Try adjusting the swing slider to see how different levels of uncertainty affect
            confidence in your choice.
          </p>
        </div>
      </section>
    </div>
  );
}
