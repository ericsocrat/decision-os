/**
 * HybridResults — side-by-side multi-algorithm consensus ranking table.
 *
 * Shows each option's rank across WSM, TOPSIS, and Minimax Regret
 * with color-coded consensus indicators and a summary sentence.
 */

"use client";

import type { DecisionResults, Decision } from "@/lib/types";
import type { TopsisResults } from "@/lib/topsis";
import type { RegretResults } from "@/lib/regret";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsensusRow {
  optionId: string;
  optionName: string;
  wsmRank: number;
  topsisRank: number;
  regretRank: number;
  /** Maximum absolute rank difference across any pair of algorithms */
  maxRankSpread: number;
  /** "unanimous" | "near" | "divergent" */
  consensus: "unanimous" | "near" | "divergent";
}

export interface HybridSummary {
  rows: ConsensusRow[];
  agreementCount: number; // how many algorithms agree on the winner
  totalMethods: number;
  winnerName: string | null;
  summaryText: string;
}

// ---------------------------------------------------------------------------
// Pure logic
// ---------------------------------------------------------------------------

export function buildHybridSummary(
  results: DecisionResults,
  topsisResults: TopsisResults,
  regretResults: RegretResults,
  decision: Decision
): HybridSummary {
  const wsm = results.optionResults;
  const topsis = topsisResults.rankings;
  const regret = regretResults.rankings;

  // Build rank maps: optionId → rank
  const wsmRankMap = new Map(wsm.map((r) => [r.optionId, r.rank]));
  const topsisRankMap = new Map(topsis.map((r) => [r.optionId, r.rank]));
  const regretRankMap = new Map(regret.map((r) => [r.optionId, r.rank]));

  const rows: ConsensusRow[] = decision.options.map((opt) => {
    const wsmRank = wsmRankMap.get(opt.id) ?? 0;
    const topsisRank = topsisRankMap.get(opt.id) ?? 0;
    const regretRank = regretRankMap.get(opt.id) ?? 0;

    const ranks = [wsmRank, topsisRank, regretRank];
    const maxRankSpread = Math.max(...ranks) - Math.min(...ranks);
    const consensus: ConsensusRow["consensus"] =
      maxRankSpread === 0 ? "unanimous" : maxRankSpread === 1 ? "near" : "divergent";

    return {
      optionId: opt.id,
      optionName: opt.name,
      wsmRank,
      topsisRank,
      regretRank,
      maxRankSpread,
      consensus,
    };
  });

  // Sort rows by average rank (best consensus ranking first)
  rows.sort((a, b) => {
    const avgA = (a.wsmRank + a.topsisRank + a.regretRank) / 3;
    const avgB = (b.wsmRank + b.topsisRank + b.regretRank) / 3;
    return avgA - avgB;
  });

  // Count how many methods agree on the winner (rank 1)
  const winners = [
    wsm.find((r) => r.rank === 1)?.optionId ?? null,
    topsis.find((r) => r.rank === 1)?.optionId ?? null,
    regret.find((r) => r.rank === 1)?.optionId ?? null,
  ].filter(Boolean);

  const winnerCounts = new Map<string, number>();
  for (const w of winners) {
    if (w) winnerCounts.set(w, (winnerCounts.get(w) ?? 0) + 1);
  }

  let topWinner: string | null = null;
  let maxCount = 0;
  for (const [id, count] of winnerCounts) {
    if (count > maxCount) {
      maxCount = count;
      topWinner = id;
    }
  }

  const totalMethods = 3;
  const winnerName = topWinner
    ? (decision.options.find((o) => o.id === topWinner)?.name ?? null)
    : null;

  let summaryText: string;
  if (maxCount === totalMethods) {
    summaryText = `All ${totalMethods} algorithms agree: ${winnerName} is the best choice.`;
  } else if (maxCount >= 2) {
    summaryText = `${maxCount} of ${totalMethods} algorithms agree: ${winnerName} is the best choice.`;
  } else {
    summaryText = `All ${totalMethods} algorithms pick different winners. This decision involves genuine trade-offs.`;
  }

  return {
    rows,
    agreementCount: maxCount,
    totalMethods,
    winnerName,
    summaryText,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface HybridResultsProps {
  results: DecisionResults;
  topsisResults: TopsisResults;
  regretResults: RegretResults;
  decision: Decision;
}

const consensusStyles = {
  unanimous: {
    cell: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200",
    label: "✓ Unanimous",
    icon: "text-green-600 dark:text-green-400",
  },
  near: {
    cell: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200",
    label: "~ Close",
    icon: "text-yellow-600 dark:text-yellow-400",
  },
  divergent: {
    cell: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200",
    label: "✗ Divergent",
    icon: "text-red-600 dark:text-red-400",
  },
};

export function HybridResults({
  results,
  topsisResults,
  regretResults,
  decision,
}: HybridResultsProps) {
  const summary = buildHybridSummary(results, topsisResults, regretResults, decision);

  if (summary.rows.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        Add at least 2 options to see consensus rankings.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary sentence */}
      <p
        className={`text-sm font-medium px-3 py-2 rounded-md ${
          summary.agreementCount === summary.totalMethods
            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
            : summary.agreementCount >= 2
              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
        }`}
        data-testid="consensus-summary"
      >
        {summary.summaryText}
      </p>

      {/* Consensus table */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm border-collapse" data-testid="consensus-table">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                Option
              </th>
              <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                WSM
              </th>
              <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                TOPSIS
              </th>
              <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                Regret
              </th>
              <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                Consensus
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => {
              const style = consensusStyles[row.consensus];
              return (
                <tr
                  key={row.optionId}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">
                    {row.optionName}
                  </td>
                  <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                    #{row.wsmRank}
                  </td>
                  <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                    #{row.topsisRank}
                  </td>
                  <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                    #{row.regretRank}
                  </td>
                  <td
                    className={`py-2 px-3 text-center text-xs font-semibold rounded ${style.cell}`}
                  >
                    {style.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-200 dark:bg-green-800" />
          Unanimous — all methods agree
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-800" />
          Close — 1 rank difference
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-200 dark:bg-red-800" />
          Divergent — 2+ rank difference
        </span>
      </div>
    </div>
  );
}
