/**
 * MobileScoreCards — Accordion card layout for scoring on small screens.
 *
 * Renders one card per option with slider inputs for each criterion.
 * Only one card is expanded at a time (accordion pattern).
 * Shown on viewports < 640 px, hidden on sm: and above.
 */

"use client";

import { useCallback, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ScoreSlider } from "./ScoreSlider";
import type { Criterion, Decision, Option, ScoreValue } from "@/lib/types";
import { resolveScoreValue, resolveConfidence } from "@/lib/scoring";
import { ConfidenceDot } from "./ConfidenceDot";
import type { Confidence } from "@/lib/types";

interface MobileScoreCardsProps {
  decision: Decision;
  updateScore: (optionId: string, criterionId: string, value: number | null) => void;
  updateConfidence?: (optionId: string, criterionId: string, confidence: Confidence) => void;
}

/** Letter label for option index (A, B, C, …) */
function optionLabel(idx: number): string {
  return String.fromCharCode(65 + idx);
}

/** Single option card (collapsible) */
function OptionCard({
  option,
  index,
  criteria,
  scores,
  expanded,
  onToggle,
  updateScore,
  updateConfidence,
}: {
  option: Option;
  index: number;
  criteria: Criterion[];
  scores: Record<string, ScoreValue>;
  expanded: boolean;
  onToggle: () => void;
  updateScore: (criterionId: string, value: number) => void;
  updateConfidence?: (criterionId: string, confidence: Confidence) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`mobile-scores-${option.id}`}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold">
            {optionLabel(index)}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {option.name}
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Collapsible body */}
      <div
        id={`mobile-scores-${option.id}`}
        role="region"
        aria-label={`Scores for ${option.name}`}
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 py-3 space-y-4 border-t border-gray-100 dark:border-gray-700">
          {criteria.map((crit) => (
            <div key={crit.id}>
              <div className="flex items-center justify-between mb-1">
                <label
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  htmlFor={`mobile-score-${option.id}-${crit.id}`}
                >
                  {crit.name}
                  <span
                    className={`ml-1.5 text-[10px] font-normal ${
                      crit.type === "cost"
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {crit.type === "cost" ? "↓ cost" : "↑ benefit"}
                  </span>
                </label>
              </div>
              {crit.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                  {crit.description}
                </p>
              )}
              <ScoreSlider
                value={resolveScoreValue(scores[crit.id]) ?? 0}
                onChange={(v) => updateScore(crit.id, v)}
                label={`Score for ${option.name} on ${crit.name}`}
              />
              {resolveConfidence(scores[crit.id]) && updateConfidence && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Confidence:</span>
                  <ConfidenceDot
                    confidence={resolveConfidence(scores[crit.id])!}
                    onChange={(next) => updateConfidence(crit.id, next)}
                    size="md"
                  />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {resolveConfidence(scores[crit.id])}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MobileScoreCards({
  decision,
  updateScore,
  updateConfidence,
}: MobileScoreCardsProps) {
  // Accordion: keep track of which option is expanded (first by default)
  const [expandedId, setExpandedId] = useState<string | null>(decision.options[0]?.id ?? null);

  const toggle = useCallback((optionId: string) => {
    setExpandedId((prev) => (prev === optionId ? null : optionId));
  }, []);

  return (
    <div className="space-y-3 sm:hidden" aria-label="Scores matrix (mobile)">
      {decision.options.map((opt, idx) => (
        <OptionCard
          key={opt.id}
          option={opt}
          index={idx}
          criteria={decision.criteria}
          scores={decision.scores[opt.id] ?? {}}
          expanded={expandedId === opt.id}
          onToggle={() => toggle(opt.id)}
          updateScore={(critId, v) => updateScore(opt.id, critId, v)}
          updateConfidence={
            updateConfidence ? (critId, c) => updateConfidence(opt.id, critId, c) : undefined
          }
        />
      ))}
    </div>
  );
}
