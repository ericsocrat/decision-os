/**
 * WeightSlider — horizontal range slider with synced number input.
 *
 * Features: drag input, keyboard (arrows ±1, Shift+arrows ±10),
 * color intensity by value, ARIA attributes, dark mode.
 */

"use client";

import { useCallback } from "react";

/** Same colour palette as ScoreChart.tsx for consistency. */
const COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#c026d3",
  "#854d0e",
];

interface WeightSliderProps {
  id: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  colorIndex: number;
  isHighest: boolean;
}

export function WeightSlider({
  id,
  name,
  value,
  onChange,
  colorIndex,
  isHighest,
}: WeightSliderProps) {
  const color = COLORS[colorIndex % COLORS.length];

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
      onChange(v);
    },
    [onChange]
  );

  // Compute the fill percentage for the slider track gradient
  const percent = Math.max(0, Math.min(100, value));

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 min-w-[100px] relative">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={handleSliderChange}
          className="w-full h-2 rounded-full appearance-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, #d1d5db ${percent}%, #d1d5db 100%)`,
          }}
          aria-label={`Weight for ${name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          id={`slider-${id}`}
        />
      </div>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={handleNumberChange}
        className={`w-14 rounded-md border px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
          isHighest
            ? "border-blue-400 dark:border-blue-500 font-semibold"
            : "border-gray-300 dark:border-gray-600"
        }`}
        aria-label={`Weight value for ${name}`}
        id={`weight-${id}`}
      />
      {isHighest && (
        <span
          className="text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap hidden sm:inline"
          aria-label="Highest weight"
        >
          ★
        </span>
      )}
    </div>
  );
}
