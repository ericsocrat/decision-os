/**
 * Monte Carlo Simulation view.
 *
 * Lets the user configure and run N stochastic simulations with
 * perturbed criterion weights. Displays win probabilities, score
 * distributions, confidence intervals, and mini histograms.
 */

"use client";

import { HelpTooltip } from "./HelpTooltip";
import { useState, useMemo } from "react";
import { useDecisionData, useResultsContext } from "./DecisionProvider";
import {
  Dices,
  Play,
  BarChart3,
  TrendingUp,
  Trophy,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
} from "lucide-react";
import { DEFAULT_CONFIG } from "@/lib/monte-carlo";
import { useMonteCarloWorker } from "@/hooks/useMonteCarloWorker";
import type {
  MonteCarloConfig,
  MonteCarloOptionResult,
  PerturbationDistribution,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Tiny inline histogram (sparkline) */
function MiniHistogram({ option }: { option: MonteCarloOptionResult }) {
  const maxCount = Math.max(...option.histogram.map((b) => b.count), 1);
  return (
    <div className="flex items-end gap-px h-10" aria-hidden="true" title="Score distribution">
      {option.histogram.map((bucket, i) => (
        <div
          key={i}
          className="flex-1 bg-blue-500 dark:bg-blue-400 rounded-t-sm min-w-[2px] transition-all"
          style={{ height: `${(bucket.count / maxCount) * 100}%` }}
        />
      ))}
    </div>
  );
}

/** Win-probability bar */
function WinBar({ probability }: { probability: number }) {
  const pct = Math.round(probability * 100);
  const color =
    pct >= 50
      ? "bg-green-500 dark:bg-green-400"
      : pct >= 25
        ? "bg-yellow-500 dark:bg-yellow-400"
        : "bg-red-400 dark:bg-red-500";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums min-w-[3rem] text-right">
        {pct}%
      </span>
    </div>
  );
}

/** Confidence interval card */
function CICard({ option }: { option: MonteCarloOptionResult }) {
  return (
    <div className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
      <span title="90% confidence interval">
        90% CI [{option.p5} – {option.p95}]
      </span>
      <span className="mx-1.5">·</span>
      <span title="Interquartile range">
        IQR [{option.p25} – {option.p75}]
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MonteCarloView() {
  const { decision } = useDecisionData();
  const { results } = useResultsContext();

  // Config state
  const [numSimulations, setNumSimulations] = useState(DEFAULT_CONFIG.numSimulations);
  const [perturbationRange, setPerturbationRange] = useState(DEFAULT_CONFIG.perturbationRange);
  const [distribution, setDistribution] = useState<PerturbationDistribution>(
    DEFAULT_CONFIG.distribution
  );
  const [seed, setSeed] = useState(DEFAULT_CONFIG.seed);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Worker hook
  const worker = useMonteCarloWorker();

  const hasOptions = results.optionResults.length >= 2;

  const config: MonteCarloConfig = useMemo(
    () => ({ numSimulations, perturbationRange, distribution, seed }),
    [numSimulations, perturbationRange, distribution, seed]
  );

  const runSimulation = () => {
    worker.run(decision, config);
  };

  const mcResults = worker.results;
  const isRunning = worker.status === "running";

  // Empty state
  if (!hasOptions) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-6 text-center text-gray-500 dark:text-gray-400">
        <Dices className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>Add at least 2 options and criteria to run Monte Carlo simulations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Configuration Panel ──────────────────────────────── */}
      <section aria-labelledby="mc-heading">
        <h2
          id="mc-heading"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3"
        >
          <Dices className="h-5 w-5 text-indigo-600" />
          Monte Carlo Simulation
          <HelpTooltip topic="monte-carlo" />
        </h2>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
          {/* Primary controls row */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Simulations slider */}
            <div className="flex-1 min-w-[160px]">
              <label
                htmlFor="mc-sims"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Simulations
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="mc-sims"
                  type="range"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={numSimulations}
                  onChange={(e) => setNumSimulations(Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                  aria-label="Number of simulations"
                />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400 tabular-nums min-w-[4rem] text-right">
                  {numSimulations.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Perturbation range slider */}
            <div className="flex-1 min-w-[160px]">
              <label
                htmlFor="mc-range"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Weight uncertainty
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="mc-range"
                  type="range"
                  min={0.05}
                  max={0.5}
                  step={0.05}
                  value={perturbationRange}
                  onChange={(e) => setPerturbationRange(Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                  aria-label="Perturbation range"
                />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400 tabular-nums min-w-[3rem] text-right">
                  ±{Math.round(perturbationRange * 100)}%
                </span>
              </div>
            </div>

            {/* Run / Cancel button */}
            {isRunning ? (
              <button
                onClick={() => worker.cancel()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-medium shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            ) : (
              <button
                onClick={runSimulation}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="h-4 w-4" />
                Run Simulation
              </button>
            )}
          </div>

          {/* Advanced settings (collapsible) */}
          <div>
            <button
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {showAdvanced ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              Advanced settings
            </button>

            {showAdvanced && (
              <div className="mt-3 flex flex-wrap gap-4 pl-1">
                {/* Distribution */}
                <div className="min-w-[140px]">
                  <label
                    htmlFor="mc-dist"
                    className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
                  >
                    Distribution
                  </label>
                  <select
                    id="mc-dist"
                    value={distribution}
                    onChange={(e) => setDistribution(e.target.value as PerturbationDistribution)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="uniform">Uniform</option>
                    <option value="normal">Normal (Gaussian)</option>
                    <option value="triangular">Triangular</option>
                  </select>
                </div>

                {/* Seed */}
                <div className="min-w-[120px]">
                  <label
                    htmlFor="mc-seed"
                    className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
                  >
                    Seed (0 = random)
                  </label>
                  <input
                    id="mc-seed"
                    type="number"
                    min={0}
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Progress Bar (during simulation) ─────────────────── */}
      {isRunning && (
        <section
          className="rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30 p-4"
          role="progressbar"
          aria-valuenow={Math.round(worker.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Simulation progress"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
              Running simulation…
            </span>
            <span className="text-sm tabular-nums text-indigo-700 dark:text-indigo-400">
              {Math.round(worker.progress * 100)}% — {worker.completed.toLocaleString()} /{" "}
              {worker.total.toLocaleString()}
            </span>
          </div>
          <div className="h-3 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(worker.progress * 100, 1)}%` }}
            />
          </div>
          {!worker.workerSupported && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Running on main thread — UI may be temporarily unresponsive
            </p>
          )}
        </section>
      )}

      {/* ── Cancelled state ──────────────────────────────────── */}
      {worker.status === "cancelled" && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Simulation cancelled
              </p>
            </div>
            <button
              onClick={runSimulation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              Restart
            </button>
          </div>
        </section>
      )}

      {/* ── Error state ──────────────────────────────────────── */}
      {worker.status === "error" && (
        <section className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Simulation failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-400">{worker.error}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Results Section ──────────────────────────────────── */}
      {mcResults && (
        <>
          {/* Summary banner */}
          <output className="block rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30 p-4">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                  Simulation Complete
                </p>
                <p className="text-sm text-indigo-700 dark:text-indigo-400">{mcResults.summary}</p>
              </div>
            </div>
          </output>

          {/* Win Probabilities */}
          <section aria-labelledby="mc-win-heading">
            <h3
              id="mc-win-heading"
              className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3"
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              Win Probabilities
            </h3>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
              <table
                className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
                aria-label="Win probabilities by option"
              >
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/4">
                      Option
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Win Probability
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                      Mean
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                      Std Dev
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {mcResults.options.map((opt, idx) => (
                    <tr
                      key={opt.optionId}
                      className={idx === 0 ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {idx === 0 && (
                          <Trophy className="inline h-3.5 w-3.5 text-amber-500 mr-1 -mt-0.5" />
                        )}
                        {opt.optionName}
                      </td>
                      <td className="px-4 py-3">
                        <WinBar probability={opt.winProbability} />
                      </td>
                      <td className="px-4 py-3 text-sm text-center tabular-nums text-gray-700 dark:text-gray-300">
                        {opt.meanScore}
                      </td>
                      <td className="px-4 py-3 text-sm text-center tabular-nums text-gray-700 dark:text-gray-300">
                        {opt.stdDev}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Score Distributions */}
          <section aria-labelledby="mc-dist-heading">
            <h3
              id="mc-dist-heading"
              className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3"
            >
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Score Distributions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mcResults.options.map((opt) => (
                <div
                  key={opt.optionId}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2"
                >
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {opt.optionName}
                  </h4>
                  <MiniHistogram option={opt} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Median: {opt.p50}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Mean: {opt.meanScore}
                    </span>
                  </div>
                  <CICard option={opt} />
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section aria-labelledby="mc-explain">
            <h3
              id="mc-explain"
              className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3"
            >
              <Info className="h-4 w-4 text-gray-400" />
              How It Works
            </h3>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <p>
                <strong>Monte Carlo simulation</strong> tests how sensitive your decision is to
                uncertainty in criterion weights. Each simulation randomly perturbs every weight
                within ±{Math.round(perturbationRange * 100)}% using a <em>{distribution}</em>{" "}
                distribution, then re-scores all options.
              </p>
              <p>
                Over {numSimulations.toLocaleString()} simulations, we count how often each option
                &quot;wins&quot; (ranks #1). A dominant option will win most simulations; a close
                race means small preference shifts could change the outcome.
              </p>
              <p>
                The <strong>90% confidence interval</strong> [p5–p95] shows the range where each
                option&apos;s score lands 90% of the time. Narrower intervals indicate more
                predictable outcomes.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
