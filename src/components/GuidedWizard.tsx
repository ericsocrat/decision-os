/**
 * GuidedWizard — 4-step guided experience for new users.
 *
 * Renders one step at a time with a progress bar, step indicators,
 * and back/continue navigation. Uses the same DecisionProvider state
 * as the advanced dashboard — switching modes preserves all data.
 *
 * Step content is plugged in from separate components (issues #226-#229).
 * This shell handles layout, navigation, progress visualization, and validation gates.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/225
 */

"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";
import { useDecisionData } from "./DecisionProvider";
import { readScore } from "@/lib/scoring";
import { WizardStepType } from "./wizard/WizardStepType";
import { WizardStepOptions } from "./wizard/WizardStepOptions";
import { WizardStepCriteria } from "./wizard/WizardStepCriteria";
import { WizardStepResults } from "./wizard/WizardStepResults";

/** Step metadata */
interface StepConfig {
  /** Step number (1-based) */
  number: number;
  /** Short label shown in the progress indicator */
  label: string;
  /** Full title displayed above step content */
  title: string;
}

const STEPS: StepConfig[] = [
  { number: 1, label: "Type", title: "Choose Decision Type" },
  { number: 2, label: "Options", title: "Add Your Options" },
  { number: 3, label: "Score", title: "Set Criteria & Score" },
  { number: 4, label: "Results", title: "Your Results" },
];

interface GuidedWizardProps {
  /** Callback to switch to advanced mode */
  onSwitchToAdvanced: () => void;
}

export const GuidedWizard = memo(function GuidedWizard({ onSwitchToAdvanced }: GuidedWizardProps) {
  const { decision } = useDecisionData();
  const [currentStep, setCurrentStep] = useState(1);

  const stepConfig = STEPS[currentStep - 1];
  const totalSteps = STEPS.length;
  const progressPercent = (currentStep / totalSteps) * 100;

  // ── Step validation gates ──────────────────────────

  /** Check whether the user can advance past the current step */
  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case 1:
        // Step 1: require a non-empty title before advancing
        return decision.title.trim().length > 0;
      case 2:
        // Step 2: need at least 1 option with a name
        return decision.options.some((o) => o.name.trim().length > 0);
      case 3:
        // Step 3: need at least 1 criterion and 1 score
        if (decision.criteria.length === 0) return false;
        for (const opt of decision.options) {
          for (const crit of decision.criteria) {
            if (readScore(decision.scores, opt.id, crit.id) !== null) return true;
          }
        }
        return false;
      case 4:
        // Step 4: results — no further advancement
        return false;
      default:
        return false;
    }
  }, [currentStep, decision]);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const goForward = useCallback(() => {
    if (canAdvance && currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [canAdvance, currentStep, totalSteps]);

  // ── Step rendering ─────────────────────────────────

  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return <WizardStepType />;
      case 2:
        return <WizardStepOptions />;
      case 3:
        return <WizardStepCriteria />;
      case 4:
        return <WizardStepResults onSwitchToAdvanced={onSwitchToAdvanced} />;
      default:
        return null;
    }
  }, [currentStep, onSwitchToAdvanced]);

  return (
    <div
      className="mx-auto max-w-2xl"
      data-testid="guided-wizard"
      role="region"
      aria-label="Guided decision wizard"
    >
      {/* ── Progress indicator ────────────────────────── */}
      <div className="mb-8">
        {/* Step dots + labels */}
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((step) => {
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;
            return (
              <div key={step.number} className="flex flex-col items-center gap-1">
                <div
                  className={`h-3 w-3 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? "bg-blue-600 dark:bg-blue-400"
                      : isCurrent
                        ? "ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-600 dark:bg-blue-400"
                        : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    isCurrent
                      ? "text-blue-600 dark:text-blue-400"
                      : isCompleted
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div
          className="h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Step ${currentStep} of ${totalSteps}`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Compact step indicator (mobile) */}
        <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400 sm:hidden">
          Step {currentStep} of {totalSteps}
        </p>
      </div>

      {/* ── Step header ───────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{stepConfig.title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Step {currentStep} of {totalSteps}
        </p>
      </div>

      {/* ── Step content ──────────────────────────────── */}
      <div className="min-h-[300px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        {stepContent}
      </div>

      {/* ── Navigation footer ─────────────────────────── */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              data-testid="wizard-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSwitchToAdvanced}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            data-testid="wizard-skip"
          >
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Skip to Advanced
            </span>
          </button>
          {currentStep < totalSteps && (
            <button
              type="button"
              onClick={goForward}
              disabled={!canAdvance}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
              data-testid="wizard-continue"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {currentStep === totalSteps && (
            <button
              type="button"
              onClick={onSwitchToAdvanced}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
              data-testid="wizard-open-advanced"
            >
              <Zap className="h-4 w-4" />
              Open in Advanced Mode
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
