/**
 * ScoreSlider — Touch-optimized range slider for score input (0–10).
 *
 * Designed for mobile use with a ≥ 44 × 44 px touch target on the thumb.
 * Shows the current value next to the slider with color coding (red→green).
 */

"use client";

import { useCallback } from "react";

interface ScoreSliderProps {
  /** Current value (0–10) */
  value: number;
  /** Called on every change with the new integer value */
  onChange: (value: number) => void;
  /** Accessible label describing what this slider controls */
  label: string;
  /** Minimum value (default 0) */
  min?: number;
  /** Maximum value (default 10) */
  max?: number;
  /** Step increment (default 1) */
  step?: number;
}

/** Map a 0–10 value to a Tailwind text-color class */
function valueColor(v: number): string {
  if (v <= 2) return "text-red-600 dark:text-red-400";
  if (v <= 4) return "text-orange-600 dark:text-orange-400";
  if (v <= 6) return "text-yellow-600 dark:text-yellow-400";
  if (v <= 8) return "text-green-600 dark:text-green-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function ScoreSlider({
  value,
  onChange,
  label,
  min = 0,
  max = 10,
  step = 1,
}: ScoreSliderProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="score-slider flex-1 h-2 rounded-full appearance-none cursor-pointer accent-blue-600"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
        }}
      />
      <span
        className={`min-w-[2rem] text-right text-sm font-bold tabular-nums ${valueColor(value)}`}
      >
        {value}
      </span>
    </div>
  );
}
