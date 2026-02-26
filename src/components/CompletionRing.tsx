/**
 * CompletionRing — SVG circular progress indicator showing score-matrix
 * completeness as a fraction, percentage, and colour-coded ring.
 *
 * Pure presentational component — all data comes via props.
 *
 * The ring is animated with a CSS transition on `stroke-dashoffset`.
 */

"use client";

import { memo } from "react";
import type { CompletenessResult } from "@/lib/completeness";
import { tierStrokeColour, tierTextColour } from "@/lib/completeness";

interface CompletionRingProps {
  completeness: CompletenessResult;
  /** Diameter of the ring in pixels. @default 80 */
  size?: number;
}

export const CompletionRing = memo(function CompletionRing({
  completeness,
  size = 80,
}: CompletionRingProps) {
  const { filled, total, percent, tier } = completeness;

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - completeness.ratio);

  return (
    <div className="flex items-center gap-4">
      {/* SVG ring */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${tierStrokeColour[tier]} transition-[stroke-dashoffset] duration-500 ease-out`}
          />
        </svg>
        {/* Centred percentage */}
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-semibold ${tierTextColour[tier]}`}
        >
          {percent}%
        </span>
      </div>

      {/* Label text */}
      <div>
        <p
          className={`text-sm font-medium ${tierTextColour[tier]}`}
          role="status"
          aria-live="polite"
        >
          {filled}/{total} scores filled
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {percent === 100
            ? "All scores filled — results are fully informed"
            : "Fill all scores for the most accurate results"}
        </p>
      </div>
    </div>
  );
});
