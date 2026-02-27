/**
 * FrameworkComparison — multi-algorithm comparison view with algorithm education.
 *
 * Displays side-by-side rankings from WSM, TOPSIS, and Minimax Regret with
 * formal consensus analysis (Kendall's W, Borda count), algorithm info cards,
 * divergence explanations, and a confidence-based recommendation.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/117
 */

"use client";

import { useMemo, useState } from "react";
import type { Decision } from "@/lib/types";
import {
  computeConsensus,
  type AlgorithmId,
  type ConsensusResult,
  ALL_ALGORITHMS,
} from "@/lib/consensus";

// ---------------------------------------------------------------------------
//  Algorithm metadata
// ---------------------------------------------------------------------------

interface AlgorithmInfo {
  id: AlgorithmId;
  label: string;
  shortLabel: string;
  description: string;
  bestFor: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

const ALGORITHM_INFO: Record<AlgorithmId, AlgorithmInfo> = {
  wsm: {
    id: "wsm",
    label: "Weighted Sum Model (WSM)",
    shortLabel: "WSM",
    description:
      "Calculates a total weighted score for each option. Simple and intuitive — the option with the highest sum wins.",
    bestFor: "General-purpose decisions with independent criteria.",
    color: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-300 dark:border-blue-700",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  topsis: {
    id: "topsis",
    label: "TOPSIS",
    shortLabel: "TOPSIS",
    description:
      "Finds the option closest to the ideal solution and farthest from the worst. Balances best-case proximity with worst-case distance.",
    bestFor: "Balanced decisions where trade-offs matter.",
    color: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-300 dark:border-emerald-700",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  "minimax-regret": {
    id: "minimax-regret",
    label: "Minimax Regret",
    shortLabel: "Regret",
    description:
      "Minimizes the maximum regret — the worst-case missed opportunity. Picks the safest option rather than the flashiest.",
    bestFor: "Risk-averse decisions where avoiding bad outcomes matters most.",
    color: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-300 dark:border-amber-700",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
  },
};

// ---------------------------------------------------------------------------
//  Agreement level helpers
// ---------------------------------------------------------------------------

function agreementLevel(w: number): "high" | "moderate" | "low" {
  if (w >= 0.7) return "high";
  if (w >= 0.4) return "moderate";
  return "low";
}

function agreementLabel(level: "high" | "moderate" | "low"): string {
  switch (level) {
    case "high":
      return "Strong agreement";
    case "moderate":
      return "Moderate agreement";
    case "low":
      return "Weak agreement";
  }
}

function agreementStyle(level: "high" | "moderate" | "low") {
  switch (level) {
    case "high":
      return {
        bg: "bg-green-50 dark:bg-green-900/20",
        text: "text-green-700 dark:text-green-300",
        border: "border-green-200 dark:border-green-800",
        badge: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200",
      };
    case "moderate":
      return {
        bg: "bg-yellow-50 dark:bg-yellow-900/20",
        text: "text-yellow-700 dark:text-yellow-300",
        border: "border-yellow-200 dark:border-yellow-800",
        badge: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200",
      };
    case "low":
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        text: "text-red-700 dark:text-red-300",
        border: "border-red-200 dark:border-red-800",
        badge: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200",
      };
  }
}

// ---------------------------------------------------------------------------
//  Divergence explanation
// ---------------------------------------------------------------------------

function buildDivergenceExplanation(
  optionName: string,
  algorithmRanks: Record<AlgorithmId, number>,
  enabledAlgorithms: AlgorithmId[]
): string {
  const entries = enabledAlgorithms
    .filter((id) => algorithmRanks[id] !== undefined)
    .map((id) => ({ id, rank: algorithmRanks[id] }))
    .sort((a, b) => a.rank - b.rank);

  if (entries.length < 2) return "";

  const best = entries[0];
  const worst = entries[entries.length - 1];
  const bestInfo = ALGORITHM_INFO[best.id];
  const worstInfo = ALGORITHM_INFO[worst.id];

  return `${optionName} ranks #${best.rank} in ${bestInfo.shortLabel} but #${worst.rank} in ${worstInfo.shortLabel}. This suggests it ${best.rank < worst.rank ? "scores well on weighted totals but has trade-off imbalance" : "is safe but not highest-scoring"}.`;
}

// ---------------------------------------------------------------------------
//  Recommendation text
// ---------------------------------------------------------------------------

function buildRecommendation(consensus: ConsensusResult): string {
  if (consensus.rankings.length === 0) return "";

  const winner = consensus.rankings[0];
  const level = agreementLevel(consensus.overallAgreement);

  switch (level) {
    case "high":
      return `Based on strong inter-algorithm agreement (Kendall's W = ${consensus.overallAgreement.toFixed(2)}), ${winner.optionName} is the recommended choice.`;
    case "moderate":
      return `Based on moderate agreement (Kendall's W = ${consensus.overallAgreement.toFixed(2)}), ${winner.optionName} leads by consensus, but consider reviewing divergent options.`;
    case "low":
      return `Algorithms show weak agreement (Kendall's W = ${consensus.overallAgreement.toFixed(2)}). ${winner.optionName} leads by Borda count, but this decision involves genuine trade-offs.`;
  }
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

interface FrameworkComparisonProps {
  decision: Decision;
}

export function FrameworkComparison({ decision }: FrameworkComparisonProps) {
  const [enabledAlgorithms, setEnabledAlgorithms] = useState<Set<AlgorithmId>>(
    () => new Set(ALL_ALGORITHMS)
  );
  const [expandedCards, setExpandedCards] = useState(false);

  // Compute consensus for enabled algorithms
  const consensus = useMemo((): ConsensusResult | null => {
    const algos = [...enabledAlgorithms] as AlgorithmId[];
    if (algos.length === 0 || decision.options.length === 0) return null;
    return computeConsensus(decision, algos);
  }, [decision, enabledAlgorithms]);

  const toggleAlgorithm = (id: AlgorithmId) => {
    setEnabledAlgorithms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Don't allow disabling all algorithms
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (decision.options.length < 2) {
    return (
      <div
        className="text-sm text-gray-500 dark:text-gray-400 text-center py-4"
        data-testid="framework-empty"
      >
        Add at least 2 options to see framework comparison.
      </div>
    );
  }

  if (!consensus) return null;

  const level = agreementLevel(consensus.overallAgreement);
  const style = agreementStyle(level);
  const recommendation = buildRecommendation(consensus);

  return (
    <div className="space-y-4" data-testid="framework-comparison">
      {/* Algorithm selector */}
      <div className="flex flex-wrap items-center gap-3" data-testid="algorithm-selector">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Algorithms:</span>
        {ALL_ALGORITHMS.map((id) => {
          const info = ALGORITHM_INFO[id];
          const enabled = enabledAlgorithms.has(id);
          return (
            <label
              key={id}
              className={`inline-flex items-center gap-1.5 text-sm cursor-pointer select-none rounded-md px-2.5 py-1 border transition-colors ${
                enabled
                  ? `${info.bgColor} ${info.borderColor} ${info.color} font-medium`
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => toggleAlgorithm(id)}
                className="sr-only"
                aria-label={`Enable ${info.label}`}
              />
              <span
                className={`inline-block w-3 h-3 rounded-sm border ${
                  enabled
                    ? `${info.borderColor} bg-current opacity-60`
                    : "border-gray-300 dark:border-gray-600"
                }`}
                aria-hidden="true"
              />
              {info.shortLabel}
            </label>
          );
        })}
      </div>

      {/* Algorithm info cards */}
      <div>
        <button
          onClick={() => setExpandedCards(!expandedCards)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded mb-2"
          aria-expanded={expandedCards}
          data-testid="toggle-info-cards"
        >
          {expandedCards ? "Hide" : "Show"} algorithm descriptions
        </button>

        {expandedCards && (
          <div className="grid gap-3 sm:grid-cols-3 mb-2" data-testid="algorithm-info-cards">
            {ALL_ALGORITHMS.filter((id) => enabledAlgorithms.has(id)).map((id) => {
              const info = ALGORITHM_INFO[id];
              return (
                <div
                  key={id}
                  className={`rounded-lg border p-3 ${info.borderColor} ${info.bgColor}`}
                >
                  <h4 className={`text-sm font-semibold ${info.color} mb-1`}>{info.label}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                    {info.description}
                  </p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-500">
                    Best for: {info.bestFor}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overall agreement indicator */}
      <div
        className={`rounded-lg border px-4 py-3 ${style.bg} ${style.border}`}
        data-testid="agreement-indicator"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-sm font-semibold ${style.text}`}>{agreementLabel(level)}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
            Kendall&apos;s W = {consensus.overallAgreement.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {consensus.algorithmCount} algorithm{consensus.algorithmCount !== 1 ? "s" : ""}
          </span>
        </div>
        {recommendation && (
          <p className={`text-sm mt-1.5 ${style.text}`} data-testid="recommendation-text">
            {recommendation}
          </p>
        )}
      </div>

      {/* Consensus ranking table */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm border-collapse" data-testid="comparison-table">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                Option
              </th>
              {ALL_ALGORITHMS.filter((id) => enabledAlgorithms.has(id)).map((id) => (
                <th
                  key={id}
                  className={`text-center py-2 px-3 font-medium ${ALGORITHM_INFO[id].color}`}
                >
                  {ALGORITHM_INFO[id].shortLabel}
                </th>
              ))}
              <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                Borda
              </th>
              <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                Consensus
              </th>
            </tr>
          </thead>
          <tbody>
            {consensus.rankings.map((r) => {
              const isDivergent = consensus.divergentOptions.includes(r.optionId);
              const isWinner = r.consensusRank === 1;

              return (
                <tr
                  key={r.optionId}
                  className={`border-b border-gray-100 dark:border-gray-800 ${
                    isWinner
                      ? "bg-yellow-50/50 dark:bg-yellow-900/10"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">
                    <span className="flex items-center gap-1.5">
                      {isWinner && (
                        <span className="text-yellow-500" aria-label="Winner">
                          🏆
                        </span>
                      )}
                      {r.optionName}
                    </span>
                  </td>
                  {ALL_ALGORITHMS.filter((id) => enabledAlgorithms.has(id)).map((id) => (
                    <td key={id} className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                      #{r.algorithmRanks[id]}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center font-mono text-gray-600 dark:text-gray-400">
                    {r.bordaScore}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isDivergent ? (
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                        Divergent
                      </span>
                    ) : r.agreementScore >= 0.8 ? (
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                        Agreed
                      </span>
                    ) : (
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200">
                        Mixed
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pairwise correlations */}
      {consensus.pairwiseCorrelations.length > 0 && (
        <div
          className="text-xs text-gray-500 dark:text-gray-400 space-y-1"
          data-testid="pairwise-correlations"
        >
          <span className="font-medium text-gray-600 dark:text-gray-300">Pairwise agreement:</span>
          <div className="flex flex-wrap gap-3">
            {consensus.pairwiseCorrelations.map((pc) => (
              <span key={`${pc.algorithmA}-${pc.algorithmB}`} className="flex items-center gap-1">
                {ALGORITHM_INFO[pc.algorithmA].shortLabel}
                &harr;
                {ALGORITHM_INFO[pc.algorithmB].shortLabel}:
                <span
                  className={`font-medium ${
                    pc.correlation >= 0.7
                      ? "text-green-600 dark:text-green-400"
                      : pc.correlation >= 0.4
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {(pc.correlation * 100).toFixed(0)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Divergence explanations */}
      {consensus.divergentOptions.length > 0 && (
        <div
          className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 space-y-2"
          data-testid="divergence-explanations"
        >
          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Why algorithms disagree
          </h4>
          {consensus.divergentOptions.map((optId) => {
            const ranking = consensus.rankings.find((r) => r.optionId === optId);
            if (!ranking) return null;
            const explanation = buildDivergenceExplanation(
              ranking.optionName,
              ranking.algorithmRanks,
              [...enabledAlgorithms]
            );
            return (
              <p key={optId} className="text-xs text-amber-700 dark:text-amber-300">
                {explanation}
              </p>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-200 dark:bg-green-800" />
          Agreed — algorithms align on this option
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-800" />
          Mixed — some rank variation
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-red-200 dark:bg-red-800" />
          Divergent — significant rank disagreement
        </span>
      </div>
    </div>
  );
}
