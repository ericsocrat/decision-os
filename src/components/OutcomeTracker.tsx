/**
 * OutcomeTracker component — records post-decision outcomes and
 * compares them to predicted scores.
 *
 * Renders:
 * - option chooser (which option was picked)
 * - implementation date input
 * - outcome rating (1–10 slider)
 * - notes text area
 * - prediction vs actual comparison bar
 * - milestone timeline
 * - follow-up survey
 */

"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, Clock, Star, MessageSquare, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import type { Decision, DecisionResults } from "@/lib/types";
import {
  recordChoice,
  recordImplementation,
  recordOutcome as recordOutcomeFn,
  addFollowUp,
  getOutcome,
  comparePrediction,
  getOutcomeTimeline,
  findPredictedScore,
} from "@/lib/outcome-tracking";
import type { PredictionComparison, TimelineMilestone } from "@/lib/outcome-tracking";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OutcomeTrackerProps {
  decision: Decision;
  results: DecisionResults;
}

// ---------------------------------------------------------------------------
// Milestone type → style mapping
// ---------------------------------------------------------------------------

const MILESTONE_STYLES: Record<
  TimelineMilestone["type"],
  { bg: string; border: string; icon: string }
> = {
  decision:       { bg: "bg-blue-100 dark:bg-blue-900/30",   border: "border-blue-400", icon: "📋" },
  implementation: { bg: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-400", icon: "🚀" },
  outcome:        { bg: "bg-green-100 dark:bg-green-900/30",  border: "border-green-400", icon: "✅" },
  "follow-up":    { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-400", icon: "🔁" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OutcomeTracker({ decision, results }: Readonly<OutcomeTrackerProps>) {
  // Reactive state that refreshes when we mutate localStorage
  const [revision, setRevision] = useState(0);
  const bump = () => setRevision((r) => r + 1);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- revision triggers re-read from localStorage
  const outcome = useMemo(() => getOutcome(decision.id), [decision.id, revision]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const comparison = useMemo(() => comparePrediction(decision.id), [decision.id, revision]);
  const timeline = useMemo(
    () => getOutcomeTimeline(decision.id, decision),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision triggers re-read from localStorage
    [decision, revision],
  );

  // ── Local form state ──────────────────────────────────────────────────
  const [ratingInput, setRatingInput] = useState<number>(outcome?.outcomeRating ?? 5);
  const [notesInput, setNotesInput] = useState(outcome?.outcomeNotes ?? "");
  const [implDate, setImplDate] = useState(
    outcome?.implementedAt ? outcome.implementedAt.slice(0, 10) : "",
  );
  const [followUpSat, setFollowUpSat] = useState(5);
  const [followUpNotes, setFollowUpNotes] = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleChooseOption = (optionId: string) => {
    const predicted = findPredictedScore(optionId, results.optionResults);
    recordChoice(decision, optionId, predicted);
    bump();
  };

  const handleRecordImplementation = () => {
    if (!implDate) return;
    recordImplementation(decision.id, new Date(implDate).toISOString());
    bump();
  };

  const handleRecordOutcome = () => {
    recordOutcomeFn(decision.id, ratingInput, notesInput || undefined);
    bump();
  };

  const handleAddFollowUp = () => {
    addFollowUp(decision.id, followUpSat, followUpNotes || undefined);
    setFollowUpNotes("");
    bump();
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section
      className="space-y-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5"
      aria-label="Outcome Tracker"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        Outcome Tracker
      </h3>

      {/* ── Step 1: Choose option ───────────────────────────────────── */}
      {!outcome && (
        <div className="space-y-2" data-testid="choose-option">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Which option did you decide on?
          </p>
          <div className="flex flex-wrap gap-2">
            {decision.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleChooseOption(opt.id)}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-colors"
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── After option is chosen ─────────────────────────────────── */}
      {outcome && (
        <>
          {/* Chosen option badge */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Chose:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-0.5 text-green-800 dark:text-green-300 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {outcome.chosenOptionName}
            </span>
          </div>

          {/* ── Implementation date ──────────────────────────────── */}
          <div className="space-y-2" data-testid="implementation-date">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Implementation Date
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={implDate}
                onChange={(e) => setImplDate(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                aria-label="Implementation date"
              />
              <button
                onClick={handleRecordImplementation}
                disabled={!implDate}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
            {outcome.implementedAt && (
              <p className="text-xs text-green-600 dark:text-green-400">
                Implemented on {new Date(outcome.implementedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* ── Outcome rating ───────────────────────────────────── */}
          <div className="space-y-2" data-testid="outcome-rating">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Star className="h-4 w-4" />
              Outcome Rating
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={ratingInput}
                onChange={(e) => setRatingInput(Number(e.target.value))}
                className="flex-1 accent-blue-600"
                aria-label="Outcome rating"
              />
              <span className="text-lg font-bold text-gray-900 dark:text-white min-w-[2ch] text-center">
                {ratingInput}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">/10</span>
            </div>
            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Notes about the outcome..."
              rows={2}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
              aria-label="Outcome notes"
            />
            <button
              onClick={handleRecordOutcome}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              Save Outcome
            </button>
          </div>

          {/* ── Prediction vs Actual comparison ──────────────────── */}
          {comparison && <PredictionComparisonCard comparison={comparison} />}

          {/* ── Follow-up survey ─────────────────────────────────── */}
          {outcome.outcomeRating !== undefined && (
            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4" data-testid="follow-up">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Follow-up Check-in
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFollowUpSat((s) => Math.max(1, s - 1))}
                  className="rounded p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Decrease satisfaction"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-lg font-bold min-w-[2ch] text-center">{followUpSat}</span>
                <button
                  onClick={() => setFollowUpSat((s) => Math.min(10, s + 1))}
                  className="rounded p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Increase satisfaction"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500">/10 satisfaction</span>
              </div>
              <textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="What changed since the decision?"
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
                aria-label="Follow-up notes"
              />
              <button
                onClick={handleAddFollowUp}
                className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
              >
                Add Follow-up
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Timeline ─────────────────────────────────────────────── */}
      {timeline.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4" data-testid="timeline">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Decision Timeline
          </h4>
          <div className="relative space-y-3 pl-6">
            {/* Vertical line */}
            <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600" />

            {timeline.map((m, i) => {
              const style = MILESTONE_STYLES[m.type];
              return (
                <div key={`${m.date}-${i}`} className="relative flex gap-3">
                  {/* Dot */}
                  <div
                    className={`absolute -left-3.5 top-1 h-3 w-3 rounded-full border-2 ${style.border} ${style.bg}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {style.icon} {m.label}
                    </p>
                    {m.detail && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {m.detail}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(m.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: PredictionComparisonCard
// ---------------------------------------------------------------------------

function PredictionComparisonCard({ comparison }: Readonly<{ comparison: PredictionComparison }>) {
  let deltaIcon: React.ReactNode = null;
  if (comparison.delta > 0.5) {
    deltaIcon = <TrendingUp className="h-4 w-4 text-green-600" />;
  } else if (comparison.delta < -0.5) {
    deltaIcon = <TrendingDown className="h-4 w-4 text-red-600" />;
  }

  let accuracyColor = "text-red-600 dark:text-red-400";
  if (comparison.accuracy >= 0.8) {
    accuracyColor = "text-green-600 dark:text-green-400";
  } else if (comparison.accuracy >= 0.5) {
    accuracyColor = "text-yellow-600 dark:text-yellow-400";
  }

  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 space-y-3"
      data-testid="prediction-comparison"
    >
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Predicted vs Actual
      </h4>

      {/* Dual bars */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            <span>Predicted</span>
            <span>{comparison.predictedScore}/10</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${comparison.predictedScore * 10}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            <span>Actual</span>
            <span>{comparison.actualRating}/10</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500"
              style={{ width: `${comparison.actualRating * 10}%` }}
            />
          </div>
        </div>
      </div>

      {/* Delta & accuracy */}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          {deltaIcon}
          <span className="text-gray-600 dark:text-gray-400">
            Delta: {comparison.delta > 0 ? "+" : ""}
            {comparison.delta}
          </span>
        </span>
        <span className={`font-medium ${accuracyColor}`}>
          {Math.round(comparison.accuracy * 100)}% accuracy
        </span>
      </div>
    </div>
  );
}
