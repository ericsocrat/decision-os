/**
 * ConfidenceDot — Small colored indicator for per-cell confidence level.
 *
 * Renders a clickable dot that cycles through high → medium → low → high.
 * - 🟢 High confidence (default)
 * - 🟡 Medium confidence
 * - 🔴 Low confidence
 *
 * Accessible: aria-label describes the level, keyboard-toggleable.
 */

"use client";

import type { Confidence } from "@/lib/types";

interface ConfidenceDotProps {
  confidence: Confidence;
  onChange: (next: Confidence) => void;
  /** Size variant */
  size?: "sm" | "md";
}

const CYCLE: Confidence[] = ["high", "medium", "low"];

const CONF_COLORS: Record<Confidence, string> = {
  high: "bg-green-500",
  medium: "bg-amber-400",
  low: "bg-red-500",
};

const CONF_LABELS: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export function ConfidenceDot({ confidence, onChange, size = "sm" }: ConfidenceDotProps) {
  const next = CYCLE[(CYCLE.indexOf(confidence) + 1) % CYCLE.length];
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className={`inline-flex items-center justify-center rounded-full ${dotSize} ${CONF_COLORS[confidence]} ring-1 ring-inset ring-black/10 dark:ring-white/20 cursor-pointer hover:scale-125 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`}
      aria-label={`${CONF_LABELS[confidence]} — click to change to ${CONF_LABELS[next].toLowerCase()}`}
      title={CONF_LABELS[confidence]}
    />
  );
}
