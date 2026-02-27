/**
 * Results view — ranked options, breakdown, top drivers, chart visualization, export/share.
 */

"use client";

import { useDecisionData, useResultsContext, useActions } from "./DecisionProvider";
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
  Crosshair,
  FlaskConical,
} from "lucide-react";
import { useState, lazy, Suspense, useMemo } from "react";
import { buildShareLink } from "@/lib/share";
import { createSharedLink, buildServerShareUrl } from "@/lib/share-link";
import { normalizeWeights } from "@/lib/scoring";
import type { TopsisResults } from "@/lib/topsis";
import type { RegretResults } from "@/lib/regret";
import type { Decision, DecisionResults } from "@/lib/types";
import type { ValidationResult } from "@/hooks/useValidation";
import type { CompletenessResult } from "@/lib/completeness";
import { BiasWarnings } from "./BiasWarnings";
import { useBiasDetection } from "@/hooks/useBiasDetection";
import { HybridResults } from "./HybridResults";
import { QualityBar } from "./QualityBar";
import { ConfidenceStrategySelector } from "./ConfidenceStrategySelector";
import { WhatIfPanel } from "./WhatIfPanel";
import { CsvExportMenu } from "./CsvExportMenu";
import { CollapsibleSection, AdvancedSectionsGroup } from "./CollapsibleSection";
import { FrameworkComparison } from "./FrameworkComparison";
import { CompositeConfidenceIndicator } from "./CompositeConfidenceIndicator";
import { OutcomeTracker } from "./OutcomeTracker";
import { RetrospectiveView } from "./RetrospectiveView";
import { PatternInsights } from "./PatternInsights";
import { HelpTooltip } from "./HelpTooltip";
import { ProactiveInsights } from "./ProactiveInsights";

const ScoreChart = lazy(() => import("./ScoreChart").then((m) => ({ default: m.ScoreChart })));
const ParetoChart = lazy(() => import("./ParetoChart").then((m) => ({ default: m.ParetoChart })));

interface ResultsViewProps {
  readonly validation: ValidationResult;
  readonly completeness: CompletenessResult;
  readonly onSwitchToBuilder: () => void;
  readonly onTabChange?: (tab: string) => void;
}

/** Color class for method agreement indicator (non-full-agreement cases). */
function methodAgreementColorClass(allAgree: boolean): string {
  return allAgree
    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
    : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300";
}

export function ResultsView({
  validation,
  completeness,
  onSwitchToBuilder,
  onTabChange,
}: ResultsViewProps) {
  const { decision } = useDecisionData();
  const { results, topsisResults, regretResults } = useResultsContext();
  const { setConfidenceStrategy, updateCriterion, updateScore } = useActions();
  const [shareStatus, setShareStatus] = useState<string>("");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [allAdvancedExpanded, setAllAdvancedExpanded] = useState(false);
  const [scoringMethod, setScoringMethod] = useState<
    "wsm" | "topsis" | "minimax-regret" | "consensus" | "compare"
  >("wsm");
  const biasDetection = useBiasDetection(decision);

  // Agreement / disagreement between WSM, TOPSIS, and Minimax Regret
  const methodAgreement = useMemo(() => {
    if (results.optionResults.length < 2 || topsisResults.rankings.length < 2) {
      return null;
    }
    const wsmWinner = results.optionResults[0].optionId;
    const topsisWinner = topsisResults.rankings[0].optionId;
    const regretWinner =
      regretResults.rankings.length > 0 ? regretResults.rankings[0].optionId : null;
    const allAgree =
      wsmWinner === topsisWinner && (regretWinner === null || wsmWinner === regretWinner);

    // Compute rank-order similarity (Spearman-like)
    const wsmOrder = results.optionResults.map((r) => r.optionId);
    const topsisOrder = topsisResults.rankings.map((r) => r.optionId);
    const regretOrder = regretResults.rankings.map((r) => r.optionId);
    const fullAgreement =
      wsmOrder.every((id, i) => topsisOrder[i] === id) &&
      (regretOrder.length === 0 || wsmOrder.every((id, i) => regretOrder[i] === id));

    return { allAgree, fullAgreement, wsmWinner, topsisWinner, regretWinner };
  }, [results, topsisResults, regretResults]);

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
              {validation.errors.map((err) => (
                <li key={err.message}>{err.message}</li>
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
    a.download = `decision-os-${decision.title.replaceAll(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareLink = async () => {
    try {
      // 1. Try server-stored short URL (requires auth + Supabase)
      const shortId = await createSharedLink(decision);
      if (shortId) {
        const url = buildServerShareUrl(shortId, globalThis.location.origin);
        await navigator.clipboard.writeText(url);
        setShareStatus("Short link copied to clipboard!");
        setTimeout(() => setShareStatus(""), 3000);
        return;
      }

      // 2. Fall back to client-encoded hash URL
      const shareUrl = buildShareLink(decision, globalThis.location.origin);
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
    globalThis.print();
  };

  return (
    <div className="space-y-6">
      {/* Decision quality dashboard */}
      <div className="flex items-center gap-2">
        <QualityBar decision={decision} />
        <HelpTooltip topic="quality-bar" />
      </div>

      {/* Composite confidence indicator */}
      <div className="flex items-center gap-2">
        <CompositeConfidenceIndicator decision={decision} />
        <HelpTooltip topic="composite-confidence" />
      </div>

      {/* Confidence adjustment strategy */}
      <ConfidenceStrategySelector
        value={decision.confidenceStrategy ?? "none"}
        onChange={setConfidenceStrategy}
      />

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
              className="shrink-0 rounded p-1 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-800/30 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            <fieldset
              className="flex items-center rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden"
              aria-label="Scoring method"
            >
              <legend className="sr-only">Scoring method</legend>
              {(
                [
                  { value: "wsm", label: "WSM", topic: "wsm" as const },
                  { value: "topsis", label: "TOPSIS", topic: "topsis" as const },
                  { value: "minimax-regret", label: "Regret", topic: "minimax-regret" as const },
                  { value: "consensus", label: "Consensus", topic: "consensus" as const },
                  { value: "compare", label: "Compare", topic: undefined },
                ] as const
              ).map((method) => (
                <label
                  key={method.value}
                  className={`cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset ${
                    scoringMethod === method.value
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="scoring-method"
                    value={method.value}
                    checked={scoringMethod === method.value}
                    onChange={() => setScoringMethod(method.value)}
                    className="sr-only"
                  />
                  {method.label}
                  {method.topic && <HelpTooltip topic={method.topic} />}
                </label>
              ))}
            </fieldset>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label="Export results as JSON"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
            <CsvExportMenu
              decision={decision}
              results={results}
              topsisResults={topsisResults}
              regretResults={regretResults}
            />
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
            <button
              onClick={() => setWhatIfOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-purple-300 dark:border-purple-600 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              aria-label="Open what-if analysis"
              data-testid="whatif-open-btn"
            >
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">What-If</span>
              <HelpTooltip topic="what-if" />
            </button>
          </div>
        </div>

        {shareStatus && (
          <output
            className={`text-sm mb-3 px-3 py-2 rounded-md ${shareStatus.includes("copied") ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"}`}
          >
            {shareStatus}
          </output>
        )}

        {/* Method agreement / disagreement indicator */}
        {methodAgreement && (
          <div
            className={`text-sm mb-3 px-3 py-2 rounded-md flex items-center gap-2 ${
              methodAgreement.fullAgreement
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : methodAgreementColorClass(methodAgreement.allAgree)
            }`}
            data-testid="method-agreement"
          >
            {methodAgreement.fullAgreement ? (
              <>
                <span className="font-medium">Full agreement:</span> All three methods produce the
                same ranking order. This is an exceptionally robust decision.
              </>
            ) : (
              <MethodAgreementMessage methodAgreement={methodAgreement} decision={decision} />
            )}
          </div>
        )}

        {/* Rankings — render based on selected method */}
        <ScoringMethodView
          scoringMethod={scoringMethod}
          results={results}
          topsisResults={topsisResults}
          regretResults={regretResults}
          decision={decision}
          maxScore={maxScore}
        />
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
              <div className="h-50 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                Loading chart…
              </div>
            }
          >
            <ScoreChart optionResults={results.optionResults} />
          </Suspense>
        </div>
      </section>

      {/* Trade-Off Explorer (Pareto Frontier) — collapsible */}
      {decision.criteria.length >= 2 && decision.options.length >= 2 && (
        <CollapsibleSection
          sectionId="pareto"
          title={
            <>
              Trade-Off Explorer <HelpTooltip topic="pareto" />
            </>
          }
          ariaLabel="Trade-Off Explorer"
          icon={<Crosshair className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
        >
          <Suspense
            fallback={
              <div className="h-50 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                Loading chart…
              </div>
            }
          >
            <ParetoChart decision={decision} results={results} />
          </Suspense>
        </CollapsibleSection>
      )}

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

      {/* Proactive Insights */}
      <ProactiveInsights onTabChange={onTabChange} />

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
            <ScoringMethodExplanation scoringMethod={scoringMethod} />
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
          {scoringMethod === "minimax-regret" && regretResults.rankings.length > 0 && (
            <p>
              <strong>Winner:</strong>{" "}
              <span className="text-blue-700 dark:text-blue-300 font-medium">
                {regretResults.rankings[0].optionName}
              </span>{" "}
              has a maximum regret of {regretResults.rankings[0].maxRegret.toFixed(2)} (on{" "}
              {decision.criteria.find((c) => c.id === regretResults.rankings[0].maxRegretCriterion)
                ?.name ?? "unknown"}
              ).
              {regretResults.rankings.length > 1 && (
                <>
                  {" "}
                  #{2} ({regretResults.rankings[1].optionName}) has max regret{" "}
                  {regretResults.rankings[1].maxRegret.toFixed(2)}.
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
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm font-medium">Bias Warnings</span>
                <HelpTooltip topic="bias-detection" />
              </div>
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

      {/* What-If Analysis Panel */}
      {whatIfOpen && (
        <WhatIfPanel
          decision={decision}
          originalResults={results}
          onApply={(weights, scores) => {
            decision.criteria.forEach((c, i) => {
              if (c.weight !== weights[i]) {
                updateCriterion(c.id, { weight: weights[i] });
              }
            });
            for (const opt of decision.options) {
              for (const crit of decision.criteria) {
                const newVal = scores[opt.id]?.[crit.id] ?? null;
                updateScore(opt.id, crit.id, newVal);
              }
            }
            setWhatIfOpen(false);
          }}
          onClose={() => setWhatIfOpen(false)}
        />
      )}

      {/* ── Advanced Analysis Group ── */}
      <AdvancedSectionsGroup
        sectionIds={["outcome", "retrospective", "patterns"]}
        onExpandAll={setAllAdvancedExpanded}
      >
        <CollapsibleSection
          sectionId="outcome"
          title="Outcome Tracker"
          expanded={allAdvancedExpanded || undefined}
        >
          <OutcomeTracker decision={decision} results={results} />
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="retrospective"
          title="Retrospective Timeline"
          expanded={allAdvancedExpanded || undefined}
        >
          <RetrospectiveView decision={decision} />
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="patterns"
          title="Cross-Decision Patterns"
          expanded={allAdvancedExpanded || undefined}
        >
          <PatternInsights decision={decision} />
        </CollapsibleSection>
      </AdvancedSectionsGroup>
    </div>
  );
}

function NormalizedWeightsTable() {
  const { decision } = useDecisionData();
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
//  Scoring Method View sub-component (eliminates nested ternary)
// ---------------------------------------------------------------------------

type ScoringMethod = "wsm" | "topsis" | "minimax-regret" | "consensus" | "compare";

function ScoringMethodView({
  scoringMethod,
  results,
  topsisResults,
  regretResults,
  decision,
  maxScore,
}: {
  readonly scoringMethod: ScoringMethod;
  readonly results: DecisionResults;
  readonly topsisResults: TopsisResults;
  readonly regretResults: RegretResults;
  readonly decision: Decision;
  readonly maxScore: number;
}) {
  switch (scoringMethod) {
    case "wsm":
      return <WsmRankings results={results} decision={decision} maxScore={maxScore} />;
    case "topsis":
      return <TopsisRankings topsisResults={topsisResults} decision={decision} />;
    case "consensus":
      return (
        <HybridResults
          results={results}
          topsisResults={topsisResults}
          regretResults={regretResults}
          decision={decision}
        />
      );
    case "compare":
      return <FrameworkComparison decision={decision} />;
    default:
      return <RegretRankings regretResults={regretResults} decision={decision} />;
  }
}

// ---------------------------------------------------------------------------
//  Scoring Method Explanation sub-component (eliminates nested ternary)
// ---------------------------------------------------------------------------

function ScoringMethodExplanation({ scoringMethod }: { readonly scoringMethod: string }) {
  if (scoringMethod === "topsis") {
    return (
      <p>
        <strong>How TOPSIS works:</strong> Scores are vector-normalized per criterion, then
        weighted. The ideal (best possible) and anti-ideal (worst possible) solutions are
        identified. Each option is ranked by how close it is to the ideal and how far from the
        anti-ideal (closeness coefficient C* ∈ [0,&nbsp;1]).
      </p>
    );
  }
  return (
    <p>
      <strong>How Minimax Regret works:</strong> For each criterion, regret measures how much worse
      an option is compared to the best option on that criterion. The &quot;maximum regret&quot; is
      the single worst regret across all criteria. The winner is the option that minimizes its
      maximum regret — the option you&apos;ll least kick yourself about.
    </p>
  );
}

// ---------------------------------------------------------------------------
//  Method Agreement Message sub-component
// ---------------------------------------------------------------------------

function MethodAgreementMessage({
  methodAgreement,
  decision,
}: {
  readonly methodAgreement: {
    allAgree: boolean;
    fullAgreement: boolean;
    wsmWinner: string;
    topsisWinner: string;
    regretWinner: string | null;
  };
  readonly decision: Decision;
}) {
  if (methodAgreement.allAgree) {
    return (
      <>
        <span className="font-medium">Winner agrees:</span> All methods pick the same winner, but
        differ on other ranks.
      </>
    );
  }
  return (
    <>
      <span className="font-medium">Methods disagree:</span> WSM picks{" "}
      <span className="font-semibold">
        {decision.options.find((o) => o.id === methodAgreement.wsmWinner)?.name}
      </span>
      , TOPSIS picks{" "}
      <span className="font-semibold">
        {decision.options.find((o) => o.id === methodAgreement.topsisWinner)?.name}
      </span>
      {methodAgreement.regretWinner && (
        <>
          , Minimax Regret picks{" "}
          <span className="font-semibold">
            {decision.options.find((o) => o.id === methodAgreement.regretWinner)?.name}
          </span>
        </>
      )}
      . This decision involves genuine trade-offs.
    </>
  );
}

// ---------------------------------------------------------------------------
//  WSM Rankings sub-component (extracted from inline)
// ---------------------------------------------------------------------------

interface WsmRankingsProps {
  readonly results: DecisionResults;
  readonly decision: Decision;
  readonly maxScore: number;
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
                      className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-70 sm:max-w-100"
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

            {/* Score bar — custom styled div requires role="progressbar" since <progress> cannot be styled consistently cross-browser */}
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
              {r.criterionScores.map((cs) => {
                const reasoning = decision.reasoning?.[r.optionId]?.[cs.criterionId];
                return (
                  <div
                    key={cs.criterionId}
                    className="group relative text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded px-2 py-1"
                    title={reasoning || undefined}
                  >
                    <span className="truncate mr-1">
                      {reasoning && (
                        <span
                          className="text-blue-500 dark:text-blue-400 mr-0.5"
                          aria-hidden="true"
                        >
                          ●
                        </span>
                      )}
                      {cs.criterionName}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-200">
                      {cs.effectiveScore.toFixed(2)}
                    </span>
                    {reasoning && (
                      <div
                        role="tooltip"
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block group-focus-within:block w-48 p-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg text-xs text-gray-700 dark:text-gray-300 z-10 whitespace-normal"
                      >
                        <span className="font-medium">Reasoning:</span> {reasoning}
                      </div>
                    )}
                  </div>
                );
              })}
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
  readonly topsisResults: TopsisResults;
  readonly decision: Decision;
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
                      className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-70 sm:max-w-100"
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

// ---------------------------------------------------------------------------
//  Minimax Regret Rankings sub-component
// ---------------------------------------------------------------------------

interface RegretRankingsProps {
  readonly regretResults: RegretResults;
  readonly decision: Decision;
}

/**
 * Color for a regret cell: green (0) → yellow (mid) → red (high).
 */
function regretCellColor(value: number, maxInMatrix: number): string {
  if (maxInMatrix === 0)
    return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
  const ratio = value / maxInMatrix;
  if (ratio < 0.25) return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
  if (ratio < 0.5)
    return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200";
  if (ratio < 0.75)
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200";
  return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
}

function RegretRankings({ regretResults, decision }: RegretRankingsProps) {
  if (regretResults.rankings.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        Add at least 2 options to see regret analysis.
      </div>
    );
  }

  // Find max regret in the whole matrix for color scaling
  const maxInMatrix = Math.max(...regretResults.rankings.map((r) => r.maxRegret), 0);

  return (
    <div className="space-y-4">
      {/* Ranking cards */}
      <div className="space-y-3">
        {regretResults.rankings.map((r, index) => {
          const isWinner = index === 0;
          const optionDesc = decision.options.find((o) => o.id === r.optionId)?.description;
          const maxRegretCritName =
            decision.criteria.find((c) => c.id === r.maxRegretCriterion)?.name ?? "—";
          // Bar width: winner has lowest regret → widest bar
          const barWidth =
            maxInMatrix > 0 ? ((maxInMatrix - r.maxRegret) / maxInMatrix) * 100 : 100;

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
                        className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-70 sm:max-w-100"
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
                    {r.maxRegret.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">max regret</span>
                </div>
              </div>

              {/* Inverse regret bar (lower regret = wider bar) */}
              <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isWinner ? "bg-blue-600" : "bg-gray-400"
                  }`}
                  style={{ width: `${barWidth}%` }}
                  role="progressbar"
                  aria-valuenow={r.maxRegret}
                  aria-valuemin={0}
                  aria-valuemax={maxInMatrix}
                  aria-label={`${r.optionName}: max regret ${r.maxRegret.toFixed(2)}`}
                />
              </div>

              {/* Regret metrics */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                  <span>Worst criterion</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {maxRegretCritName}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
                  <span>Avg regret</span>
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {r.avgRegret.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regret Matrix Table */}
      <section className="overflow-x-auto" aria-label="Regret matrix">
        <table
          className="min-w-full text-sm border-collapse"
          aria-label="Regret matrix — lower values mean less regret"
        >
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300 font-medium">
                Option
              </th>
              {decision.criteria.map((c) => (
                <th
                  key={c.id}
                  className="text-center py-2 px-3 text-gray-700 dark:text-gray-300 font-medium"
                >
                  {c.name}
                </th>
              ))}
              <th className="text-center py-2 px-3 text-gray-700 dark:text-gray-300 font-bold">
                Max Regret
              </th>
            </tr>
          </thead>
          <tbody>
            {regretResults.rankings.map((r) => {
              const isWinner = r.rank === 1;
              return (
                <tr
                  key={r.optionId}
                  className={`border-b border-gray-100 dark:border-gray-700 ${
                    isWinner ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                  }`}
                >
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">
                    {r.optionName}
                    {isWinner && (
                      <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">
                        ★ winner
                      </span>
                    )}
                  </td>
                  {decision.criteria.map((c) => {
                    const val = regretResults.regretMatrix[r.optionId]?.[c.id] ?? 0;
                    const isMaxForOption = c.id === r.maxRegretCriterion;
                    return (
                      <td
                        key={c.id}
                        className={`py-2 px-3 text-center font-mono text-sm ${regretCellColor(val, maxInMatrix)} ${
                          isMaxForOption ? "ring-2 ring-inset ring-red-400 dark:ring-red-500" : ""
                        }`}
                      >
                        {val.toFixed(2)}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-center font-bold text-gray-900 dark:text-gray-100">
                    {r.maxRegret.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* "Why this ranking?" explanation */}
      <details className="text-sm text-gray-600 dark:text-gray-400">
        <summary className="cursor-pointer font-medium text-blue-600 dark:text-blue-400 hover:underline">
          Why this ranking?
        </summary>
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-blue-200 dark:border-blue-800">
          <p>
            <strong>Minimax Regret</strong> (Savage, 1951) asks: &quot;Which option minimizes my
            maximum possible regret?&quot;
          </p>
          <p>
            For each criterion, regret = (best score among all options) − (this option&apos;s
            score), weighted by the criterion&apos;s importance. The &quot;max regret&quot; column
            shows each option&apos;s single worst criterion gap.
          </p>
          <p>
            The winner is the option whose worst gap is smallest — the choice you&apos;ll least
            regret. This is ideal for risk-averse decisions where you can&apos;t accept a major
            weakness even if other areas are strong.
          </p>
        </div>
      </details>
    </div>
  );
}
