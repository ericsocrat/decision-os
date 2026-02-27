/**
 * AHP Pairwise Comparison Wizard
 *
 * Step-by-step UI for deriving criterion weights via the Analytic Hierarchy
 * Process. Users compare each unique pair of criteria on the Saaty 1–9 scale,
 * then apply the derived weights to the decision.
 */
"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Scale,
  X,
} from "lucide-react";
import { useDecisionData, useActions } from "./DecisionProvider";
import {
  computeAHP,
  generatePairs,
  pairCount,
  saatyLabel,
} from "@/lib/ahp";
import type { PairwiseComparison } from "@/lib/ahp";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AHPWizardProps {
  readonly onClose: () => void;
}

// ---------------------------------------------------------------------------
// Saaty-scale slider config
// ---------------------------------------------------------------------------

/** Discrete stops: [1/9, 1/8, …, 1/2, 1, 2, …, 9] mapped to a 0–16 range. */
const SLIDER_STOPS = [
  1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2,
  1,
  2, 3, 4, 5, 6, 7, 8, 9,
] as const;

function sliderIndexToValue(index: number): number {
  return SLIDER_STOPS[Math.round(index)] ?? 1;
}

function valueToSliderIndex(value: number): number {
  let best = 8; // default to center (1)
  let bestDist = Infinity;
  for (let i = 0; i < SLIDER_STOPS.length; i++) {
    const dist = Math.abs(SLIDER_STOPS[i] - value);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatComparisonValue(value: number): string {
  if (value >= 1) return `${Math.round(value)}`;
  return `1/${Math.round(1 / value)}`;
}

function crColorClass(cr: number): string {
  if (cr < 0.05) return "text-green-600 dark:text-green-400";
  if (cr < 0.1) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function crBgClass(cr: number): string {
  if (cr < 0.05) return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
  if (cr < 0.1) return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
  return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AHPWizard({ onClose }: Readonly<AHPWizardProps>) {
  const { decision } = useDecisionData();
  const { updateCriterion } = useActions();

  const criterionIds = useMemo(
    () => decision.criteria.map((c) => c.id),
    [decision.criteria],
  );

  const criterionNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of decision.criteria) {
      map.set(c.id, c.name);
    }
    return map;
  }, [decision.criteria]);

  const pairs = useMemo(() => generatePairs(criterionIds), [criterionIds]);
  const totalPairs = pairCount(criterionIds.length);

  // Comparison values keyed "criterionA::criterionB" → value (Saaty scale)
  const [values, setValues] = useState<Map<string, number>>(() => {
    const m = new Map<string, number>();
    for (const p of pairs) {
      m.set(`${p.a}::${p.b}`, 1);
    }
    return m;
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [applied, setApplied] = useState(false);

  // Build comparisons from the values map
  const comparisons: PairwiseComparison[] = useMemo(
    () =>
      pairs.map((p) => ({
        criterionA: p.a,
        criterionB: p.b,
        value: values.get(`${p.a}::${p.b}`) ?? 1,
      })),
    [pairs, values],
  );

  // Compute AHP result on every change
  const result = useMemo(
    () => computeAHP(criterionIds, comparisons),
    [criterionIds, comparisons],
  );

  // Current pair for the step view
  const currentPair = pairs[currentStep] as { a: string; b: string } | undefined;
  const currentKey = currentPair ? `${currentPair.a}::${currentPair.b}` : "";
  const currentValue = values.get(currentKey) ?? 1;

  const handleSliderChange = useCallback(
    (sliderIndex: number) => {
      if (!currentKey) return;
      const val = sliderIndexToValue(sliderIndex);
      setValues((prev) => {
        const next = new Map(prev);
        next.set(currentKey, val);
        return next;
      });
    },
    [currentKey],
  );

  const handleApply = useCallback(() => {
    const w100 = result.weights100;
    for (let i = 0; i < criterionIds.length; i++) {
      updateCriterion(criterionIds[i], { weight: w100[i] });
    }
    setApplied(true);
  }, [result.weights100, criterionIds, updateCriterion]);

  // Edge case: less than 2 criteria
  if (criterionIds.length < 2) {
    return (
      <section
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg"
        aria-label="AHP Wizard"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          AHP requires at least 2 criteria. Add more criteria first.
        </p>
        <button
          onClick={onClose}
          className="mt-4 rounded-md bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden"
      aria-label="AHP Pairwise Comparison Wizard"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-3">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            AHP Weight Wizard
          </h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close AHP wizard"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>
            Comparison {currentStep + 1} of {totalPairs}
          </span>
          <span>{Math.round(((currentStep + 1) / totalPairs) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalPairs) * 100}%` }}
          />
        </div>
      </div>

      {/* Comparison Step */}
      {currentPair && (
        <div className="px-5 py-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            How much more important is…
          </p>

          <div className="flex items-center justify-between gap-4 mb-4">
            <span
              className={`text-sm font-medium flex-1 text-right ${currentValue >= 1 ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}
            >
              {criterionNames.get(currentPair.a)}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">vs</span>
            <span
              className={`text-sm font-medium flex-1 text-left ${currentValue < 1 ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}
            >
              {criterionNames.get(currentPair.b)}
            </span>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min={0}
              max={SLIDER_STOPS.length - 1}
              step={1}
              value={valueToSliderIndex(currentValue)}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full accent-blue-600"
              aria-label={`Importance of ${criterionNames.get(currentPair.a)} vs ${criterionNames.get(currentPair.b)}`}
            />
            <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
              <span>← {criterionNames.get(currentPair.b)} more</span>
              <span>Equal</span>
              <span>{criterionNames.get(currentPair.a)} more →</span>
            </div>
            <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
              {formatComparisonValue(currentValue)} — {saatyLabel(currentValue)}
              {currentValue > 1 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {" "}({criterionNames.get(currentPair.a)})
                </span>
              )}
              {currentValue < 1 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {" "}({criterionNames.get(currentPair.b)})
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Consistency Indicator */}
      <div className={`mx-5 mb-4 rounded-md border p-3 ${crBgClass(result.consistencyRatio)}`}>
        <div className="flex items-center gap-2">
          {result.isConsistent ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span className={`text-sm font-medium ${crColorClass(result.consistencyRatio)}`}>
            CR = {result.consistencyRatio.toFixed(3)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {result.isConsistent ? "Consistent" : "Inconsistent — revise judgments"}
          </span>
        </div>
      </div>

      {/* Preview weights */}
      <div className="mx-5 mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
          Derived Weights
        </p>
        <div className="space-y-1">
          {criterionIds.map((id, i) => (
            <div key={id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">
                {criterionNames.get(id)}
              </span>
              <div className="w-24 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
                  style={{ width: `${(result.weights[i] ?? 0) * 100}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                {result.weights100[i]}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation & Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-5 py-3">
        <button
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous comparison"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {applied ? (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Applied
            </span>
          ) : (
            <button
              onClick={handleApply}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={!result.isConsistent}
              aria-label="Apply derived weights"
            >
              Apply Weights
            </button>
          )}
        </div>

        <button
          onClick={() => setCurrentStep((s) => Math.min(totalPairs - 1, s + 1))}
          disabled={currentStep >= totalPairs - 1}
          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next comparison"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
