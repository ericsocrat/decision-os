/**
 * Wizard Step 1 — Decision Type Selector with Auto-Populated Templates.
 *
 * Users name their decision and pick a type card (Job, Housing, etc.).
 * Selecting a type shows a preview of suggested criteria and auto-
 * populates them in DecisionProvider when Continue is pressed.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/226
 */

"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Briefcase,
  GraduationCap,
  Home,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDecisionData, useActions } from "@/components/DecisionProvider";
import { DECISION_TYPES, type DecisionTypeCard } from "@/lib/wizard-templates";
import { generateId } from "@/lib/utils";

/** Map icon names to actual Lucide components */
const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  Home,
  ShoppingCart,
  TrendingUp,
  GraduationCap,
  Sparkles,
};

export const WizardStepType = memo(function WizardStepType() {
  const { decision } = useDecisionData();
  const { updateTitle, replaceCriteria } = useActions();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Auto-focus the title input on mount
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const selectedCard = DECISION_TYPES.find((t) => t.id === selectedType) ?? null;

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateTitle(e.target.value);
    },
    [updateTitle]
  );

  const handleTypeSelect = useCallback(
    (typeId: string) => {
      setSelectedType(typeId);

      // Find the type card
      const card = DECISION_TYPES.find((t) => t.id === typeId);
      if (!card) return;

      // Auto-populate criteria (with fresh IDs)
      const newCriteria = card.criteria.map((c) => ({
        id: generateId(),
        name: c.name,
        weight: c.weight,
        type: c.type,
        description: c.description,
      }));
      replaceCriteria(newCriteria);
    },
    [replaceCriteria]
  );

  return (
    <div data-testid="wizard-step-1">
      {/* Title input */}
      <div className="mb-6">
        <label
          htmlFor="wizard-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          Give your decision a name
        </label>
        <input
          ref={titleRef}
          id="wizard-title"
          type="text"
          value={decision.title}
          onChange={handleTitleChange}
          placeholder='e.g., "Which apartment should I rent?"'
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
          data-testid="wizard-title-input"
        />
      </div>

      {/* Type label */}
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        What type of decision is this?
      </p>

      {/* Type cards grid */}
      <div
        role="radiogroup"
        aria-label="Decision type"
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6"
        data-testid="type-card-grid"
      >
        {DECISION_TYPES.map((card, index) => (
          <TypeCard
            key={card.id}
            card={card}
            isSelected={selectedType === card.id}
            onSelect={handleTypeSelect}
            delay={index * 50}
          />
        ))}
      </div>

      {/* Criteria preview */}
      {selectedCard && selectedCard.criteria.length > 0 && <CriteriaPreview card={selectedCard} />}
    </div>
  );
});

// ── Type Card ────────────────────────────────────────────

interface TypeCardProps {
  card: DecisionTypeCard;
  isSelected: boolean;
  onSelect: (typeId: string) => void;
  delay: number;
}

const TypeCard = memo(function TypeCard({ card, isSelected, onSelect, delay }: TypeCardProps) {
  const Icon = ICON_MAP[card.iconName] ?? Sparkles;

  return (
    <button
      role="radio"
      aria-checked={isSelected}
      onClick={() => onSelect(card.id)}
      className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:-translate-y-0.5 hover:shadow-md ${
        isSelected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-400"
          : "border-gray-200 bg-white hover:border-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-blue-500"
      }`}
      style={{ animationDelay: `${delay}ms` }}
      data-testid={`type-card-${card.id}`}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
          <Check className="h-3 w-3" />
        </span>
      )}

      <Icon
        className={`h-8 w-8 ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
      />

      <span
        className={`text-sm font-semibold ${isSelected ? "text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-gray-100"}`}
      >
        {card.title}
      </span>

      <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
        {card.description}
      </span>
    </button>
  );
});

// ── Criteria Preview ─────────────────────────────────────

interface CriteriaPreviewProps {
  card: DecisionTypeCard;
}

const CriteriaPreview = memo(function CriteriaPreview({ card }: CriteriaPreviewProps) {
  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4"
      data-testid="criteria-preview"
    >
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Suggested criteria for &ldquo;{card.title}&rdquo;:
      </p>
      <ul className="space-y-1.5">
        {card.criteria.map((criterion) => (
          <li key={criterion.name} className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              {criterion.name}
              {criterion.type === "cost" && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded px-1">
                  cost
                </span>
              )}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              weight: {criterion.weight}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        You can customize these in the next steps.
      </p>
    </div>
  );
});
