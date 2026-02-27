/**
 * Wizard Step 3 — Criteria, Weights, and Simplified Scoring.
 *
 * Two sub-steps:
 *   3a: Criteria list with weight sliders + importance labels + add/remove
 *   3b: Score matrix with score sliders + labels + scoring progress
 *
 * @see https://github.com/ericsocrat/decision-os/issues/228
 */

"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Plus, X, ArrowRight, ArrowLeft } from "lucide-react";
import { useDecisionData, useActions } from "@/components/DecisionProvider";
import { readScore } from "@/lib/scoring";

// ── Utility functions ────────────────────────────────

/** Map a weight to a human-readable importance label */
export function importanceLabel(weight: number): string {
  if (weight >= 25) return "Most Important";
  if (weight >= 20) return "Very Important";
  if (weight >= 15) return "Important";
  if (weight >= 10) return "Somewhat Important";
  if (weight >= 5) return "Slightly Important";
  return "Minimal";
}

/** Map a score (1-10) to a human-readable label */
export function scoreLabel(score: number): string {
  if (score <= 0) return "Not Scored";
  if (score <= 2) return "Poor";
  if (score <= 4) return "Below Average";
  if (score <= 6) return "Average";
  if (score === 7) return "Good";
  if (score === 8) return "Very Good";
  if (score === 9) return "Excellent";
  return "Outstanding";
}

/** Map a score to a Tailwind color class for the slider fill */
export function scoreColor(score: number): string {
  if (score <= 0) return "bg-gray-300 dark:bg-gray-600";
  if (score <= 2) return "bg-red-500";
  if (score <= 4) return "bg-orange-500";
  if (score <= 6) return "bg-yellow-500";
  if (score === 7) return "bg-lime-500";
  if (score === 8) return "bg-green-500";
  if (score === 9) return "bg-emerald-500";
  return "bg-blue-500";
}

// ── Main Component ───────────────────────────────────

export const WizardStepCriteria = memo(function WizardStepCriteria() {
  const { decision } = useDecisionData();
  const { addCriterion, updateCriterion, removeCriterion, updateScore } = useActions();
  const [subStep, setSubStep] = useState<"criteria" | "scoring">("criteria");

  const totalWeight = useMemo(
    () => decision.criteria.reduce((s, c) => s + c.weight, 0),
    [decision.criteria],
  );

  // Scoring progress
  const totalCells = decision.options.length * decision.criteria.length;
  const filledCells = useMemo(() => {
    let count = 0;
    for (const opt of decision.options) {
      for (const crit of decision.criteria) {
        const score = readScore(decision.scores, opt.id, crit.id);
        if (score !== null && score > 0) count++;
      }
    }
    return count;
  }, [decision.options, decision.criteria, decision.scores]);

  const handleAddCriterion = useCallback(() => {
    addCriterion();
  }, [addCriterion]);

  if (subStep === "criteria") {
    return (
      <div data-testid="wizard-step-3">
        <div data-testid="substep-criteria">
          {/* Header */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {decision.criteria.length > 0
              ? "These criteria were suggested for your decision. Adjust importance or add your own:"
              : "Add the criteria that matter for your decision:"}
          </p>

          {/* Criteria list */}
          <div className="space-y-3">
            {decision.criteria.map((criterion) => (
              <CriterionRow
                key={criterion.id}
                id={criterion.id}
                name={criterion.name}
                weight={criterion.weight}
                type={criterion.type}
                totalWeight={totalWeight}
                onUpdate={updateCriterion}
                onRemove={removeCriterion}
                canRemove={decision.criteria.length > 1}
              />
            ))}
          </div>

          {/* Add criterion button */}
          <button
            type="button"
            onClick={handleAddCriterion}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            data-testid="add-criterion-btn"
          >
            <Plus className="h-4 w-4" />
            Add a criterion
          </button>

          {/* Weight distribution bar */}
          {decision.criteria.length > 0 && (
            <div className="mt-5" data-testid="weight-distribution">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Weight distribution:
              </p>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                {decision.criteria.map((c) => {
                  const pct = totalWeight > 0 ? (c.weight / totalWeight) * 100 : 0;
                  return (
                    <div
                      key={c.id}
                      className={`${c.type === "cost" ? "bg-amber-400 dark:bg-amber-500" : "bg-blue-500 dark:bg-blue-400"} transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                      title={`${c.name}: ${c.weight}`}
                    />
                  );
                })}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {decision.criteria.map((c) => (
                  <span key={c.id} className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[80px]">
                    {c.name.split(" ")[0]} {c.weight}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transition to scoring */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setSubStep("scoring")}
              disabled={decision.criteria.length === 0 || decision.options.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
              data-testid="goto-scoring-btn"
            >
              Score Your Options
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sub-step 3b: Scoring ────────────────────────────

  return (
    <div data-testid="wizard-step-3">
      <div data-testid="substep-scoring">
        {/* Header */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Rate each option on each criterion (1–10):
        </p>

        {/* Criterion cards with per-option sliders */}
        <div className="space-y-4">
          {decision.criteria.map((criterion) => {
            const weightPct = totalWeight > 0 ? Math.round((criterion.weight / totalWeight) * 100) : 0;
            return (
              <div
                key={criterion.id}
                className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4"
                data-testid={`score-card-${criterion.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {criterion.name}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    {weightPct}%
                  </span>
                </div>
                <div className="space-y-3">
                  {decision.options.map((option) => {
                    const currentScore = readScore(decision.scores, option.id, criterion.id) ?? 0;
                    return (
                      <ScoreSlider
                        key={option.id}
                        optionName={option.name}
                        score={currentScore}
                        onChange={(value) => updateScore(option.id, criterion.id, value)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scoring progress */}
        <div className="mt-5" data-testid="scoring-progress">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>
              {filledCells} of {totalCells} scores filled
            </span>
            <span className="tabular-nums">
              {totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${totalCells > 0 ? (filledCells / totalCells) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Back to criteria */}
        <div className="mt-6 flex justify-start">
          <button
            type="button"
            onClick={() => setSubStep("criteria")}
            className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            data-testid="back-to-criteria-btn"
          >
            <ArrowLeft className="h-4 w-4" />
            Adjust Criteria
          </button>
        </div>
      </div>
    </div>
  );
});

// ── Criterion Row ────────────────────────────────────

interface CriterionRowProps {
  id: string;
  name: string;
  weight: number;
  type: "benefit" | "cost";
  totalWeight: number;
  onUpdate: (id: string, updates: { name?: string; weight?: number; type?: "benefit" | "cost" }) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const CriterionRow = memo(function CriterionRow({
  id,
  name,
  weight,
  type,
  onUpdate,
  onRemove,
  canRemove,
}: CriterionRowProps) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-3">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={name}
          onChange={(e) => onUpdate(id, { name: e.target.value })}
          placeholder="Criterion name"
          className="flex-1 rounded border border-gray-200 dark:border-gray-600 bg-transparent px-2 py-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
          aria-label={`Criterion name: ${name || "unnamed"}`}
          data-testid={`criterion-name-${id}`}
        />
        <select
          value={type}
          onChange={(e) => onUpdate(id, { type: e.target.value as "benefit" | "cost" })}
          className="rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label={`${name} type`}
          data-testid={`criterion-type-${id}`}
        >
          <option value="benefit">benefit</option>
          <option value="cost">cost</option>
        </select>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(id)}
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            aria-label={`Remove ${name}`}
            data-testid={`criterion-remove-${id}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          value={weight}
          onChange={(e) => onUpdate(id, { weight: Number(e.target.value) })}
          className="flex-1 accent-blue-500 h-2 cursor-pointer"
          aria-label={`${name} weight`}
          aria-valuetext={`${weight}, ${importanceLabel(weight)}`}
          data-testid={`criterion-weight-${id}`}
        />
        <span className="w-8 text-right text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
          {weight}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 w-28 text-right truncate">
          {importanceLabel(weight)}
        </span>
      </div>
    </div>
  );
});

// ── Score Slider ─────────────────────────────────────

interface ScoreSliderProps {
  optionName: string;
  score: number;
  onChange: (value: number) => void;
}

const ScoreSlider = memo(function ScoreSlider({ optionName, score, onChange }: ScoreSliderProps) {
  const label = scoreLabel(score);
  const color = scoreColor(score);

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-gray-700 dark:text-gray-300 truncate" title={optionName}>
        {optionName}
      </span>
      <div className="relative flex-1">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={score}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-blue-500 h-2 cursor-pointer"
          aria-label={`${optionName} score`}
          aria-valuetext={`${score} out of 10, ${label}`}
          data-testid={`score-slider-${optionName.replace(/\s+/g, "-").toLowerCase()}`}
        />
        {/* Fill indicator */}
        <div
          className={`absolute top-1/2 left-0 h-2 rounded-full pointer-events-none -translate-y-1/2 ${color} opacity-30`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <span className="w-10 text-center text-sm font-medium text-gray-700 dark:text-gray-300 tabular-nums">
        {score}/10
      </span>
      <span className={`w-20 text-right text-xs font-medium ${score > 0 ? "text-gray-600 dark:text-gray-400" : "text-gray-400 dark:text-gray-500"}`}>
        {label}
      </span>
    </div>
  );
});
