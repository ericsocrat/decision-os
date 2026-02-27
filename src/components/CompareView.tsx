/**
 * CompareView — Side-by-side decision comparison with divergence analysis.
 *
 * Provides:
 * - Comparison selector (two dropdowns)
 * - Agreement badge
 * - Side-by-side rankings with rank deltas
 * - Score divergence heatmap
 * - Weight comparison table
 */

"use client";

import { useState, useMemo } from "react";
import { GitCompareArrows, AlertCircle, ArrowUp, ArrowDown, Minus, BarChart3 } from "lucide-react";
import { getDecisions } from "@/lib/storage";
import { useDecisionData } from "./DecisionProvider";
import type { Decision } from "@/lib/types";
import {
  compareDecisions,
  getDivergenceColor,
  type ComparisonResult,
  type SharedOption,
} from "@/lib/comparison";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Agreement badge with color coding */
function AgreementBadge({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const colorClass =
    label === "strong"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : label === "moderate"
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${colorClass}`}
    >
      {pct}% — {label.charAt(0).toUpperCase() + label.slice(1)} alignment
    </span>
  );
}

/** Rank delta indicator */
function RankDelta({ delta }: { delta: number }) {
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
        <ArrowUp className="h-3 w-3" />↑{Math.abs(delta)}
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
        <ArrowDown className="h-3 w-3" />↓{delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs text-gray-400 dark:text-gray-500">
      <Minus className="h-3 w-3" />
    </span>
  );
}

/** Side-by-side rankings */
function SideBySideRankings({
  comparison,
  titleA,
  titleB,
}: {
  comparison: ComparisonResult;
  titleA: string;
  titleB: string;
}) {
  if (
    comparison.sharedOptions.length === 0 &&
    comparison.onlyInA.length === 0 &&
    comparison.onlyInB.length === 0
  ) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {titleA}
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {titleB}
        </div>
      </div>

      {/* Shared options */}
      {comparison.sharedOptions.map((opt: SharedOption) => (
        <div
          key={opt.optionName}
          className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-800"
        >
          <RankingCard rank={opt.rankA} name={opt.optionName} score={opt.scoreA} />
          <div className="flex items-center">
            <RankingCard rank={opt.rankB} name={opt.optionName} score={opt.scoreB} />
            <div className="pr-3">
              <RankDelta delta={opt.rankDelta} />
            </div>
          </div>
        </div>
      ))}

      {/* Only in A */}
      {comparison.onlyInA.map((name) => (
        <div
          key={`a-${name}`}
          className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-800"
        >
          <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{name}</div>
          <div className="px-4 py-2 text-sm text-gray-400 dark:text-gray-600 italic">N/A</div>
        </div>
      ))}

      {/* Only in B */}
      {comparison.onlyInB.map((name) => (
        <div
          key={`b-${name}`}
          className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-800"
        >
          <div className="px-4 py-2 text-sm text-gray-400 dark:text-gray-600 italic">N/A</div>
          <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{name}</div>
        </div>
      ))}
    </div>
  );
}

function RankingCard({ rank, name, score }: { rank: number; name: string; score: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 flex-1 min-w-0">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        {rank}
      </span>
      <span className="truncate text-sm text-gray-800 dark:text-gray-200">{name}</span>
      <span className="ml-auto text-sm font-medium text-gray-600 dark:text-gray-400 tabular-nums">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

/** Delta analysis summary */
function DeltaAnalysis({ comparison }: { comparison: ComparisonResult }) {
  if (comparison.sharedOptions.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
        Delta Analysis
      </h3>
      <div className="space-y-2">
        {comparison.sharedOptions.map((opt) => (
          <div key={opt.optionName} className="flex items-center justify-between text-sm">
            <span className="text-gray-700 dark:text-gray-300 truncate mr-4">{opt.optionName}</span>
            <div className="flex items-center gap-4 shrink-0">
              <RankDelta delta={opt.rankDelta} />
              <span
                className={`tabular-nums font-medium ${
                  opt.scoreDelta > 0
                    ? "text-green-600 dark:text-green-400"
                    : opt.scoreDelta < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-500"
                }`}
              >
                {opt.scoreDelta > 0 ? "+" : ""}
                {opt.scoreDelta.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Score divergence heatmap */
function DivergenceHeatmap({ comparison }: { comparison: ComparisonResult }) {
  if (comparison.scoreMatrix.length === 0) return null;

  const colorClasses = {
    green: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
    yellow: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
    red: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        Score Divergence
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">
                Option / Criterion
              </th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                Dec A
              </th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                Dec B
              </th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.scoreMatrix.map((entry) => {
              const color = getDivergenceColor(entry.delta);
              return (
                <tr
                  key={`${entry.optionName}-${entry.criterionName}`}
                  className="border-t border-gray-100 dark:border-gray-800"
                >
                  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                    {entry.optionName} / {entry.criterionName}
                  </td>
                  <td className="text-center px-3 py-2 tabular-nums text-gray-600 dark:text-gray-400">
                    {entry.scoreA}
                  </td>
                  <td className="text-center px-3 py-2 tabular-nums text-gray-600 dark:text-gray-400">
                    {entry.scoreB}
                  </td>
                  <td className="text-center px-3 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium tabular-nums ${colorClasses[color]}`}
                    >
                      {entry.delta > 0 ? "+" : ""}
                      {entry.delta}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Weight comparison table */
function WeightComparison({ comparison }: { comparison: ComparisonResult }) {
  if (comparison.sharedCriteria.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        Weight Comparison
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">
                Criterion
              </th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                Dec A
              </th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                Dec B
              </th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                Delta
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.sharedCriteria.map((crit) => (
              <tr
                key={crit.criterionName}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{crit.criterionName}</td>
                <td className="text-center px-3 py-2 tabular-nums text-gray-600 dark:text-gray-400">
                  {crit.weightA.toFixed(1)}%
                </td>
                <td className="text-center px-3 py-2 tabular-nums text-gray-600 dark:text-gray-400">
                  {crit.weightB.toFixed(1)}%
                </td>
                <td className="text-center px-3 py-2">
                  <span
                    className={`tabular-nums font-medium ${
                      crit.weightDelta > 0
                        ? "text-green-600 dark:text-green-400"
                        : crit.weightDelta < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-500"
                    }`}
                  >
                    {crit.weightDelta > 0 ? "+" : ""}
                    {crit.weightDelta.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Show non-shared criteria if any */}
          {(comparison.onlyCriteriaInA.length > 0 || comparison.onlyCriteriaInB.length > 0) && (
            <tfoot>
              {comparison.onlyCriteriaInA.map((name) => (
                <tr key={`ca-${name}`} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-500 italic">{name}</td>
                  <td className="text-center px-3 py-2 text-gray-400">✓</td>
                  <td className="text-center px-3 py-2 text-gray-400">—</td>
                  <td />
                </tr>
              ))}
              {comparison.onlyCriteriaInB.map((name) => (
                <tr key={`cb-${name}`} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-500 italic">{name}</td>
                  <td className="text-center px-3 py-2 text-gray-400">—</td>
                  <td className="text-center px-3 py-2 text-gray-400">✓</td>
                  <td />
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CompareView() {
  const { decision } = useDecisionData();
  const [decisionIdA, setDecisionIdA] = useState<string>("");
  const [decisionIdB, setDecisionIdB] = useState<string>("");

  // Reload decisions list when active decision changes (proxy for storage changes).
  // We use `decision` as a dep to trigger re-reads of localStorage — this is intentional.
  const decisionRef = decision; // reference used as cache-buster
  const allDecisions = useMemo(() => {
    void decisionRef; // intentional: re-read localStorage when active decision changes
    try {
      return getDecisions();
    } catch {
      return [];
    }
  }, [decisionRef]);

  const decisionA = useMemo(
    () => allDecisions.find((d: Decision) => d.id === decisionIdA),
    [allDecisions, decisionIdA]
  );
  const decisionB = useMemo(
    () => allDecisions.find((d: Decision) => d.id === decisionIdB),
    [allDecisions, decisionIdB]
  );

  const comparison = useMemo<ComparisonResult | null>(() => {
    if (!decisionA || !decisionB) return null;
    return compareDecisions(decisionA, decisionB);
  }, [decisionA, decisionB]);

  if (allDecisions.length < 2) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-gray-500 dark:text-gray-400">
        <GitCompareArrows className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>Create at least 2 decisions to use comparison mode.</p>
        <p className="text-xs mt-1">
          Use templates or import files to create additional decisions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparison selector */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label
            htmlFor="compare-decision-a"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0"
          >
            Compare:
          </label>
          <select
            id="compare-decision-a"
            value={decisionIdA}
            onChange={(e) => setDecisionIdA(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-0"
            aria-label="Decision A"
          >
            <option value="">Select decision A…</option>
            {allDecisions.map((d: Decision) => (
              <option key={d.id} value={d.id} disabled={d.id === decisionIdB}>
                {d.title}
              </option>
            ))}
          </select>

          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">vs</span>

          <select
            value={decisionIdB}
            onChange={(e) => setDecisionIdB(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-0"
            aria-label="Decision B"
          >
            <option value="">Select decision B…</option>
            {allDecisions.map((d: Decision) => (
              <option key={d.id} value={d.id} disabled={d.id === decisionIdA}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state when selections incomplete */}
      {!comparison && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>Select two decisions above to compare them side-by-side.</p>
        </div>
      )}

      {/* Comparison results */}
      {comparison && decisionA && decisionB && (
        <>
          {/* Agreement + Summary */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Agreement:
                </span>
                <AgreementBadge
                  score={comparison.agreementScore}
                  label={comparison.agreementLabel}
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{comparison.summary}</p>

            {/* Non-shared items warnings */}
            {(comparison.onlyInA.length > 0 || comparison.onlyInB.length > 0) && (
              <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {comparison.onlyInA.length > 0 && (
                    <>Only in A: {comparison.onlyInA.join(", ")}. </>
                  )}
                  {comparison.onlyInB.length > 0 && (
                    <>Only in B: {comparison.onlyInB.join(", ")}.</>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Side-by-side rankings */}
          <SideBySideRankings
            comparison={comparison}
            titleA={decisionA.title}
            titleB={decisionB.title}
          />

          {/* Delta analysis */}
          <DeltaAnalysis comparison={comparison} />

          {/* Divergence heatmap */}
          <DivergenceHeatmap comparison={comparison} />

          {/* Weight comparison */}
          <WeightComparison comparison={comparison} />
        </>
      )}
    </div>
  );
}
