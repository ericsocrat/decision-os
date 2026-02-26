/**
 * ScoringPrompt — focus-triggered contextual scoring guidance.
 *
 * Renders beneath a score input when focused, showing criterion-appropriate
 * prompts that guide users toward consistent, calibrated scoring. Includes
 * reference anchors (1/5/10) and optional relative calibration showing how
 * the current score compares to other scores for the same criterion.
 */

"use client";

import type { CriterionType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Prompt data
// ---------------------------------------------------------------------------

interface AnchorSet {
  question: string;
  low: string;
  mid: string;
  high: string;
}

const PROMPTS: Record<CriterionType, AnchorSet> = {
  cost: {
    question: "How does the total cost compare to your budget?",
    low: "1 = far over budget",
    mid: "5 = within budget",
    high: "10 = well under budget",
  },
  benefit: {
    question: "Rate this from worst case to ideal outcome.",
    low: "1 = deal-breaker",
    mid: "5 = acceptable",
    high: "10 = exceptional",
  },
};

// ---------------------------------------------------------------------------
// Calibration helpers
// ---------------------------------------------------------------------------

export interface CalibrationData {
  /** All non-null scores for the same criterion across options */
  allScores: number[];
  /** The current score (null if un-scored) */
  currentScore: number | null;
}

/**
 * Builds a short calibration label, e.g. "Your other scores: 3, 7, 9 — avg 6.3"
 */
export function buildCalibrationLabel(data: CalibrationData): string | null {
  const others = data.allScores.filter((s) => s !== data.currentScore);
  if (others.length === 0) return null;
  const avg = others.reduce((a, b) => a + b, 0) / others.length;
  return `Other scores: ${others.join(", ")} — avg ${avg.toFixed(1)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ScoringPromptProps {
  /** Criterion type determines which prompt set to show */
  criterionType: CriterionType;
  /** Unique id for aria-describedby */
  promptId: string;
  /** Optional calibration data */
  calibration?: CalibrationData;
}

export function ScoringPrompt({ criterionType, promptId, calibration }: ScoringPromptProps) {
  const anchors = PROMPTS[criterionType];
  const calibrationLabel = calibration ? buildCalibrationLabel(calibration) : null;

  return (
    <div
      id={promptId}
      role="tooltip"
      className="mt-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 shadow-sm animate-in fade-in duration-150"
    >
      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{anchors.question}</p>
      <div className="flex items-center gap-3 text-[11px]">
        <span className="text-red-500 dark:text-red-400">{anchors.low}</span>
        <span className="text-yellow-600 dark:text-yellow-400">{anchors.mid}</span>
        <span className="text-green-600 dark:text-green-400">{anchors.high}</span>
      </div>
      {calibrationLabel && (
        <p className="mt-1.5 text-[11px] text-blue-600 dark:text-blue-400 italic">
          {calibrationLabel}
        </p>
      )}
    </div>
  );
}
