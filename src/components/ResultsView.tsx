/**
 * Results view — ranked options, breakdown, top drivers, chart visualization, export/share.
 */

"use client";

import { useDecision } from "./DecisionProvider";
import {
  Download,
  Link,
  Trophy,
  TrendingUp,
  BarChart3,
  FileText,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { useState, lazy, Suspense, useMemo } from "react";
import { buildShareLink } from "@/lib/share";
import { normalizeWeights } from "@/lib/scoring";
import type { TopsisResults } from "@/lib/topsis";
import type { Decision, DecisionResults } from "@/lib/types";
import type { ValidationResult } from "@/hooks/useValidation";
import type { CompletenessResult } from "@/lib/completeness";
import { BiasWarnings } from "./BiasWarnings";
import { useBiasDetection } from "@/hooks/useBiasDetection";

const ScoreChart = lazy(() => import("./ScoreChart").then((m) => ({ default: m.ScoreChart })));

interface ResultsViewProps {
  validation: ValidationResult;
  completeness: CompletenessResult;
  onSwitchToBuilder: () => void;
}

export function ResultsView({ validation, completeness, onSwitchToBuilder }: ResultsViewProps) {
  const { decision, results, topsisResults } = useDecision();
  const [shareStatus, setShareStatus] = useState<string>("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [scoringMethod, setScoringMethod] = useState<"wsm" | "topsis">("wsm");
  const biasDetection = useBiasDetection(decision);

  // Agreement / disagreement between WSM and TOPSIS
  const methodAgreement = useMemo(() => {
    if (results.optionResults.length < 2 || topsisResults.rankings.length < 2) {
      return null;
    }
    const wsmWinner = results.optionResults[0].optionId;
    const topsisWinner = topsisResults.rankings[0].optionId;
    const agree = wsmWinner === topsisWinner;

    // Compute rank-order similarity (Spearman-like)
    const wsmOrder = results.optionResults.map((r) => r.optionId);
    const topsisOrder = topsisResults.rankings.map((r) => r.optionId);
    const fullAgreement = wsmOrder.every((id, i) => topsisOrder[i] === id);

    return { agree, fullAgreement, wsmWinner, topsisWinner };
  }, [results, topsisResults]);

  if (results.optionResults.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-gray-500 dark:text-gray-400">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>Add at least 2 options and 1 criterion to see results.</p>
      </div>
    );
  }

  // Validation guard — block results for critical errors
  if (!validation.isValid) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-red-800 dark:text-red-300 mb-2">
              Fix these issues to see results:
            </h3>
            <ul className="space-y-1 text-sm text-red-700 dark:text-red-400 list-disc list-inside">
              {validation.errors.map((err, i) => (
                <li key={i}>{err.message}</li>
              ))}
            </ul>
            <button
              onClick={onSwitchToBuilder}
              className="mt-4 inline-flex items-center gap-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Go to Builder &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...results.optionResults.map((r) => r.totalScore));

  const defaultCount = completeness.total - completeness.filled;
  const showIncompleteBanner = defaultCount > 0 && !bannerDismissed;

  const handleExportJson = () => {
    const data = {
      decision,
      results: results.optionResults.map((r) => ({
        option: r.optionName,
        rank: r.rank,
        totalScore: r.totalScore,
        breakdown: r.criterionScores.map((cs) => ({
          criterion: cs.criterionName,
          rawScore: cs.rawScore,
          effectiveScore: cs.effectiveScore,
          weight: cs.normalizedWeight,
          type: cs.criterionType,
        })),
      })),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decision-os-${decision.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareLink = async () => {
    try {
      const shareUrl = buildShareLink(decision, window.location.origin);
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus("Link copied to clipboard!");
        setTimeout(() => setShareStatus(""), 3000);
        return;
      }
      // Compact URL too long — suggest JSON export instead
      setShareStatus("Decision too large for URL sharing. Use JSON export instead.");
    } catch {
      setShareStatus("Failed to copy link.");
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Non-blocking validation warnings */}
      {validation.warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              <span className="font-medium">Warning:</span>{" "}
              {validation.warnings.map((w) => w.message).join(". ")}.
            </div>
          </div>
        </div>
      )}

      {/* Incomplete scores banner */}
      {showIncompleteBanner && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <span className="font-medium">
                  {defaultCount} of {completeness.total} scores are at the default value (0).
                </span>{" "}
                Results may not reflect your actual evaluation.
                <button
                  onClick={onSwitchToBuilder}
                  className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-amber-800 dark:text-amber-200 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-500 rounded"
                >
                  Fill remaining scores &rarr;
                </button>
              </div>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="flex-shrink-0 rounded p-1 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-800/30 focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Dismiss incomplete scores warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Ranking */}
      <section aria-labelledby="ranking-heading">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="ranking-heading"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
          >
            <Trophy className="h-5 w-5 text-yellow-500" />
            Rankings
          </h2>
          <div className="flex items-center gap-2">
            {/* Scoring method selector */}
            <div
              className="flex items-center rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden"
              role="radiogroup"
              aria-label="Scoring method"
            >
              <button
                role="radio"
                aria-checked={scoringMethod === "wsm"}
                onClick={() => setScoringMethod("wsm")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                  scoringMethod === "wsm"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                WSM
              </button>
              <button
                role="radio"
                aria-checked={scoringMethod === "topsis"}
                onClick={() => setScoringMethod("topsis")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                  scoringMethod === "topsis"
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                TOPSIS
              </button>
            </div>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label="Export results as JSON"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
            <button
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors print:hidden"
              aria-label="Print / export as PDF"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button
              onClick={handleShareLink}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label="Copy share link"
            >
              <Link className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        {shareStatus && (
          <div
            className={`text-sm mb-3 px-3 py-2 rounded-md ${shareStatus.includes("copied") ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"}`}
            role="status"
          >
            {shareStatus}
          </div>
        )}

        {/* Method agreement / disagreement indicator */}
        {methodAgreement && (
          <div
            className={`text-sm mb-3 px-3 py-2 rounded-md flex items-center gap-2 ${
              methodAgreement.fullAgreement
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : methodAgreement.agree
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
            }`}
            data-testid="method-agreement"
          >
            {methodAgreement.fullAgreement ? (
              <>
                <span className="font-medium">Full agreement:</span> WSM and TOPSIS produce the same
                ranking order.
              </>
            ) : methodAgreement.agree ? (
              <>
                <span className="font-medium">Winner agrees:</span> Both methods pick the same
                winner, but differ on other ranks.
              </>
            ) : (
              <>
                <span className="font-medium">Methods disagree:</span> WSM picks{" "}
                <span className="font-semibold">
                  {decision.options.find((o) => o.id === methodAgreement.wsmWinner)?.name}
                </span>
                , TOPSIS picks{" "}
                <span className="font-semibold">
                  {decision.options.find((o) => o.id === methodAgreement.topsisWinner)?.name}
                </span>
                . Consider reviewing your criteria weights.
              </>
            )}
          </div>
        )}

        {/* Rankings — render based on selected method */}
        {scoringMethod === "wsm" ? (
          <WsmRankings results={results} decision={decision} maxScore={maxScore} />
        ) : (
          <TopsisRankings topsisResults={topsisResults} decision={decision} />
        )}
      </section>

      {/* Score Chart Visualization */}
      <section aria-labelledby="chart-heading" className="print:hidden">
        <h2
          id="chart-heading"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3"
        >
          <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Score Visualization
        </h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <Suspense
            fallback={
              <div className="h-[200px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                Loading chart…
              </div>
            }
          >
            <ScoreChart optionResults={results.optionResults} />
          </Suspense>
        </div>
      </section>

      {/* Top Drivers */}
      <section aria-labelledby="drivers-heading">
        <h2
          id="drivers-heading"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3"
        >
          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          Top Drivers
        </h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {results.topDrivers.map((driver, index) => {
            const pct = (driver.normalizedWeight * 100).toFixed(1);
            return (
              <div
                key={driver.criterionId}
                className={`flex items-center justify-between p-3 ${
                  index < results.topDrivers.length - 1
                    ? "border-b border-gray-100 dark:border-gray-700"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {driver.criterionName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${driver.normalizedWeight * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Explain Results */}
      <section aria-labelledby="explain-heading">
        <h2
          id="explain-heading"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3"
        >
          Explain This Result
        </h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
          {scoringMethod === "wsm" ? (
            <p>
              <strong>How WSM works:</strong> Each criterion&apos;s raw weight is normalized so all
              weights sum to 100%. For each option, scores (0–10) are multiplied by the normalized
              weight. Cost criteria are inverted (10 − score) so lower costs yield higher effective
              scores.
            </p>
          ) : (
            <p>
              <strong>How TOPSIS works:</strong> Scores are vector-normalized per criterion, then
              weighted. The ideal (best possible) and anti-ideal (worst possible) solutions are
              identified. Each option is ranked by how close it is to the ideal and how far from the
              anti-ideal (closeness coefficient C* ∈ [0,&nbsp;1]).
            </p>
          )}
          {scoringMethod === "wsm" && results.optionResults.length > 0 && (
            <p>
              <strong>Winner:</strong>{" "}
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                {results.optionResults[0].optionName}
              </span>{" "}
              scored {results.optionResults[0].totalScore.toFixed(2)} out of a maximum of 10.00.
              {results.optionResults.length > 1 && (
                <>
                  {" "}
                  The margin over #{2} ({results.optionResults[1].optionName}) is{" "}
                  {(
                    results.optionResults[0].totalScore - results.optionResults[1].totalScore
                  ).toFixed(2)}{" "}
                  points.
                </>
              )}
            </p>
          )}
          {scoringMethod === "topsis" && topsisResults.rankings.length > 0 && (
            <p>
              <strong>Winner:</strong>{" "}
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                {topsisResults.rankings[0].optionName}
              </span>{" "}
              has a closeness coefficient of{" "}
              {topsisResults.rankings[0].closenessCoefficient.toFixed(2)}.
              {topsisResults.rankings.length > 1 && (
                <>
                  {" "}
                  The gap over #{2} ({topsisResults.rankings[1].optionName}) is{" "}
                  {(
                    topsisResults.rankings[0].closenessCoefficient -
                    topsisResults.rankings[1].closenessCoefficient
                  ).toFixed(2)}
                  .
                </>
              )}
            </p>
          )}
          <p>
            <strong>Top driver:</strong>{" "}
            {results.topDrivers.length > 0 ? results.topDrivers[0].impactDescription : "N/A"}
          </p>
          {biasDetection.warnings.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <BiasWarnings
                warnings={biasDetection.warnings}
                onDismiss={biasDetection.dismiss}
                onDismissAll={biasDetection.dismissAll}
                compact
              />
            </div>
          )}
          <NormalizedWeightsTable />
        </div>
      </section>
    </div>
  );
}

function NormalizedWeightsTable() {
  const { decision } = useDecision();
  const nw = normalizeWeights(decision.criteria.map((c) => c.weight));

  return (
    <div className="mt-2">
      <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Normalized Weights:</p>
      <div className="flex flex-wrap gap-2">
        {decision.criteria.map((c, i) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs text-gray-700 dark:text-gray-300"
          >
            {c.name}: <strong>{(nw[i] * 100).toFixed(1)}%</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  WSM Rankings sub-component (extracted from inline)
// ---------------------------------------------------------------------------

interface WsmRankingsProps {
  results: DecisionResults;
  decision: Decision;
  maxScore: number;
}

function WsmRankings({ results, decision, maxScore }: WsmRankingsProps) {
  return (
    <div className="space-y-3">
      {results.optionResults.map((r, index) => {
        const barWidth = maxScore > 0 ? (r.totalScore / maxScore) * 100 : 0;
        const isWinner = index === 0;
        const optionDesc = decision.options.find((o) => o.id === r.optionId)?.description;

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
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {r.optionName}
                  </span>
                  {optionDesc && (
                    <p
                      className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px] sm:max-w-[400px]"
                      title={optionDesc}
                    >
                      {optionDesc}
                    </p>
                  )}
                </div>
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
                className={`h-full rounded-full transition-all duration-500 ${
                  isWinner ? "bg-blue-600" : "bg-gray-400"
                }`}
                style={{ width: `${barWidth}%` }}
                role="progressbar"
                aria-valuenow={r.totalScore}
                aria-valuemin={0}
                aria-valuemax={10}
                aria-label={`${r.optionName}: ${r.totalScore.toFixed(2)}`}
              />
            </div>

            {/* Criterion breakdown */}
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
  );
}

// ---------------------------------------------------------------------------
//  TOPSIS Rankings sub-component
// ---------------------------------------------------------------------------

interface TopsisRankingsProps {
  topsisResults: TopsisResults;
  decision: Decision;
}

function TopsisRankings({ topsisResults, decision }: TopsisRankingsProps) {
  const maxCoefficient = Math.max(...topsisResults.rankings.map((r) => r.closenessCoefficient), 0);

  return (
    <div className="space-y-3">
      {topsisResults.rankings.map((r, index) => {
        const barWidth = maxCoefficient > 0 ? (r.closenessCoefficient / maxCoefficient) * 100 : 0;
        const isWinner = index === 0;
        const optionDesc = decision.options.find((o) => o.id === r.optionId)?.description;

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
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {r.optionName}
                  </span>
                  {optionDesc && (
                    <p
                      className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px] sm:max-w-[400px]"
                      title={optionDesc}
                    >
                      {optionDesc}
                    </p>
                  )}
                </div>
                {isWinner && (
                  <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                    Winner
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {r.closenessCoefficient.toFixed(2)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">C*</span>
              </div>
            </div>

            {/* Closeness bar */}
            <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isWinner ? "bg-blue-600" : "bg-gray-400"
                }`}
                style={{ width: `${barWidth}%` }}
                role="progressbar"
                aria-valuenow={r.closenessCoefficient}
                aria-valuemin={0}
                aria-valuemax={1}
                aria-label={`${r.optionName}: closeness ${r.closenessCoefficient.toFixed(2)}`}
              />
            </div>

            {/* Distance metrics */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                <span>D⁺ (to ideal)</span>
                <span className="font-medium text-gray-900 dark:text-gray-200">
                  {r.distanceToIdeal.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                <span>D⁻ (to anti-ideal)</span>
                <span className="font-medium text-gray-900 dark:text-gray-200">
                  {r.distanceToAntiIdeal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
