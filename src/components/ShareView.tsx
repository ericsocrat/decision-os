/**
 * ShareView — read-only presentation of a shared decision.
 *
 * Displays a clean, presentation-ready view with:
 * - Decision title & description
 * - Ranked options with score breakdowns
 * - Sensitivity analysis summary
 * - Top drivers
 * - No editing controls
 *
 * Used by the /share route to render decisions from compressed URL data.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/4
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Trophy, TrendingUp, BarChart3, Activity, Shield, AlertTriangle } from "lucide-react";
import { decodeShareUrl } from "@/lib/share";
import { fetchSharedDecision } from "@/lib/share-link";
import { computeResults, sensitivityAnalysis, normalizeWeights } from "@/lib/scoring";
import type { Decision, DecisionResults, SensitivityAnalysis } from "@/lib/types";

// ---------------------------------------------------------------------------
//  Main component
// ---------------------------------------------------------------------------

export function ShareView() {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load decision from URL: ?id=<shortId> (server) or #d=<encoded> (legacy)
  useEffect(() => {
    let cancelled = false;

    async function loadDecision() {
      try {
        // 1. Check for server-stored short ID (?id=...)
        const params = new URLSearchParams(window.location.search);
        const shortId = params.get("id");

        if (shortId) {
          const fetched = await fetchSharedDecision(shortId);
          if (cancelled) return;
          if (fetched) {
            setDecision(fetched);
            setLoading(false);
            return;
          }
          setError("Shared decision not found. The link may have expired or is invalid.");
          setLoading(false);
          return;
        }

        // 2. Fall back to legacy hash-based encoding (#d=...)
        const hash = window.location.hash;
        if (!hash.startsWith("#d=")) {
          setError("No decision data found in the URL.");
          setLoading(false);
          return;
        }
        const encoded = hash.slice("#d=".length);
        if (!encoded) {
          setError("Empty share data.");
          setLoading(false);
          return;
        }
        const decoded = decodeShareUrl(encoded);
        if (!decoded) {
          setError("Failed to decode the shared decision. The link may be invalid or corrupted.");
          setLoading(false);
          return;
        }
        setDecision(decoded);
      } catch {
        if (!cancelled) {
          setError("An error occurred while loading the shared decision.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDecision();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !decision) {
    return <ErrorState message={error ?? "Unknown error"} />;
  }

  return <SharedDecisionView decision={decision} />;
}

// ---------------------------------------------------------------------------
//  Sub-components
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-3">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-600 dark:text-gray-400">Loading shared decision…</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Unable to Load Decision
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
        <Link
          href="/"
          className="inline-block mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Go to Decision OS
        </Link>
      </div>
    </div>
  );
}

function SharedDecisionView({ decision }: { decision: Decision }) {
  const results = useMemo(() => computeResults(decision), [decision]);
  const sensitivity = useMemo(() => sensitivityAnalysis(decision), [decision]);
  const maxScore = Math.max(...results.optionResults.map((r) => r.totalScore), 0.001);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                Shared Decision
              </p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {decision.title}
              </h1>
              {decision.description && (
                <p className="mt-1 text-gray-600 dark:text-gray-400">{decision.description}</p>
              )}
            </div>
            <Link
              href="/"
              className="text-sm text-blue-600 dark:text-blue-400 underline hover:no-underline"
            >
              Open in Decision OS
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Rankings */}
        <RankingsSection results={results} maxScore={maxScore} />

        {/* Score Breakdown */}
        <BreakdownSection results={results} decision={decision} />

        {/* Sensitivity */}
        <SensitivitySection sensitivity={sensitivity} />

        {/* Top Drivers */}
        <TopDriversSection results={results} />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Powered by{" "}
          <Link href="/" className="text-blue-600 dark:text-blue-400 underline hover:no-underline">
            Decision OS
          </Link>{" "}
          — Structured decision-making tool
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Rankings Section
// ---------------------------------------------------------------------------

function RankingsSection({ results, maxScore }: { results: DecisionResults; maxScore: number }) {
  return (
    <section aria-labelledby="share-ranking-heading">
      <h2
        id="share-ranking-heading"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4"
      >
        <Trophy className="h-5 w-5 text-yellow-500" />
        Rankings
      </h2>

      <div className="space-y-3">
        {results.optionResults.map((r, index) => {
          const barWidth = maxScore > 0 ? (r.totalScore / maxScore) * 100 : 0;
          const isWinner = index === 0;

          return (
            <div
              key={r.optionId}
              className={`rounded-lg border p-4 ${
                isWinner
                  ? "border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                      isWinner
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {r.rank}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {r.optionName}
                  </span>
                  {isWinner && (
                    <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                      Winner
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {r.totalScore.toFixed(2)}
                </span>
              </div>

              {/* Score bar */}
              <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isWinner ? "bg-blue-600" : "bg-gray-400"}`}
                  style={{ width: `${barWidth}%` }}
                  role="progressbar"
                  aria-valuenow={r.totalScore}
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-label={`${r.optionName}: ${r.totalScore.toFixed(2)}`}
                />
              </div>

              {/* Criterion scores */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {r.criterionScores.map((cs) => (
                  <div
                    key={cs.criterionId}
                    className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded px-2 py-1"
                  >
                    <span className="truncate mr-1">{cs.criterionName}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-200">
                      {cs.effectiveScore.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//  Score Breakdown Table
// ---------------------------------------------------------------------------

function BreakdownSection({ results, decision }: { results: DecisionResults; decision: Decision }) {
  const normalized = normalizeWeights(decision.criteria.map((c) => c.weight));

  return (
    <section aria-labelledby="share-breakdown-heading">
      <h2
        id="share-breakdown-heading"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4"
      >
        <BarChart3 className="h-5 w-5 text-gray-500" />
        Score Breakdown
      </h2>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm" aria-label="Score breakdown">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                Criterion
              </th>
              <th className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-400">
                Weight
              </th>
              {results.optionResults.map((r) => (
                <th
                  key={r.optionId}
                  className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-400"
                >
                  {r.optionName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {decision.criteria.map((criterion, ci) => (
              <tr key={criterion.id} className="bg-white dark:bg-gray-900">
                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{criterion.name}</td>
                <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                  {(normalized[ci] * 100).toFixed(0)}%
                </td>
                {results.optionResults.map((r) => {
                  const cs = r.criterionScores.find((s) => s.criterionId === criterion.id);
                  return (
                    <td
                      key={r.optionId}
                      className="px-4 py-2 text-center text-gray-900 dark:text-gray-100"
                    >
                      {cs ? cs.rawScore.toFixed(1) : "–"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
              <td className="px-4 py-2 text-gray-900 dark:text-gray-100">Total</td>
              <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">100%</td>
              {results.optionResults.map((r) => (
                <td
                  key={r.optionId}
                  className="px-4 py-2 text-center text-gray-900 dark:text-gray-100"
                >
                  {r.totalScore.toFixed(2)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
//  Sensitivity Section
// ---------------------------------------------------------------------------

function SensitivitySection({ sensitivity }: { sensitivity: SensitivityAnalysis }) {
  const unstablePoints = sensitivity.points.filter((p) => p.winnerChanged);

  return (
    <section aria-labelledby="share-sensitivity-heading">
      <h2
        id="share-sensitivity-heading"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4"
      >
        <Activity className="h-5 w-5 text-orange-500" />
        Sensitivity Analysis
      </h2>

      {/* Stability badge */}
      <div
        className={`rounded-lg border p-4 mb-4 ${
          unstablePoints.length === 0
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
            : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
        }`}
      >
        <div className="flex items-center gap-2">
          <Shield
            className={`h-5 w-5 ${unstablePoints.length === 0 ? "text-green-600" : "text-orange-600"}`}
          />
          <span
            className={`font-medium ${unstablePoints.length === 0 ? "text-green-800 dark:text-green-200" : "text-orange-800 dark:text-orange-200"}`}
          >
            {unstablePoints.length === 0
              ? "Decision is robust — no single criterion weight change flips the winner"
              : `${unstablePoints.length} criterion weight change${unstablePoints.length > 1 ? "s" : ""} could change the winner`}
          </span>
        </div>
      </div>

      {/* Unstable criteria table */}
      {unstablePoints.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm" aria-label="Sensitivity analysis details">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                  Criterion
                </th>
                <th className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-400">
                  Original Weight
                </th>
                <th className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-400">
                  Adjusted Weight
                </th>
                <th className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-400">
                  New Winner
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {unstablePoints.map((p) => (
                <tr key={p.criterionId} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{p.criterionName}</td>
                  <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                    {p.originalWeight.toFixed(0)}
                  </td>
                  <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                    {p.adjustedWeight.toFixed(0)}
                  </td>
                  <td className="px-4 py-2 text-center font-medium text-orange-700 dark:text-orange-300">
                    {p.newWinner}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{sensitivity.summary}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
//  Top Drivers Section
// ---------------------------------------------------------------------------

function TopDriversSection({ results }: { results: DecisionResults }) {
  if (results.topDrivers.length === 0) return null;

  return (
    <section aria-labelledby="share-drivers-heading">
      <h2
        id="share-drivers-heading"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4"
      >
        <TrendingUp className="h-5 w-5 text-blue-500" />
        Top Drivers
      </h2>

      <div className="space-y-2">
        {results.topDrivers.map((d) => (
          <div
            key={d.criterionId}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between"
          >
            <div>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {d.criterionName}
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">{d.impactDescription}</p>
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {(d.normalizedWeight * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
