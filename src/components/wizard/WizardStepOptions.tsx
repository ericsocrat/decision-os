/**
 * Wizard Step 2 — Streamlined Options Entry.
 *
 * Users add the options they're comparing (e.g., "Company A", "Company B").
 * Minimal UI: numbered text inputs with add/remove, Enter to add row,
 * and type-specific placeholder text.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/227
 */

"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Plus, X, Lightbulb, ChevronDown } from "lucide-react";
import { useDecisionData, useActions } from "@/components/DecisionProvider";
import { getTypeExamples } from "@/lib/wizard-templates";

/** Soft limit for options — warn but don't block */
const SOFT_LIMIT = 10;

/** Try to infer the wizard type from criteria for placeholder text */
function inferTypeFromCriteria(criteriaNames: string[]): string | null {
  if (criteriaNames.length === 0) return "custom";
  const first = criteriaNames[0]?.toLowerCase() ?? "";
  if (first.includes("salary")) return "job-career";
  if (first.includes("price") && criteriaNames.some((c) => c.toLowerCase().includes("safety")))
    return "housing";
  if (first.includes("price")) return "purchase";
  if (first.includes("return")) return "investment";
  if (first.includes("program")) return "education";
  return "custom";
}

export const WizardStepOptions = memo(function WizardStepOptions() {
  const { decision } = useDecisionData();
  const { addOption, updateOption, removeOption } = useActions();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const lastAddedIdRef = useRef<string | null>(null);

  // Ensure at least 2 option rows exist on mount
  useEffect(() => {
    const count = decision.options.length;
    if (count < 2) {
      for (let i = count; i < 2; i++) {
        addOption();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus the last added option input
  useEffect(() => {
    if (lastAddedIdRef.current) {
      const id = lastAddedIdRef.current;
      lastAddedIdRef.current = null;
      requestAnimationFrame(() => {
        inputRefs.current.get(id)?.focus();
      });
    }
  });

  // Auto-focus first empty input on mount
  useEffect(() => {
    const firstEmpty = decision.options.find(
      (o) => o.name.trim() === "" || /^Option \d+$/.test(o.name),
    );
    if (firstEmpty) {
      requestAnimationFrame(() => {
        inputRefs.current.get(firstEmpty.id)?.focus();
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const inferredType = inferTypeFromCriteria(decision.criteria.map((c) => c.name));
  const typeExamples = getTypeExamples(inferredType);

  const handleNameChange = useCallback(
    (optionId: string, name: string) => {
      updateOption(optionId, { name });
      if (validationError) setValidationError(null);
    },
    [updateOption, validationError],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (index === decision.options.length - 1) {
          addOption();
        } else {
          const nextOpt = decision.options[index + 1];
          if (nextOpt) inputRefs.current.get(nextOpt.id)?.focus();
        }
      }
    },
    [addOption, decision.options],
  );

  const handleRemove = useCallback(
    (optionId: string) => {
      removeOption(optionId);
    },
    [removeOption],
  );

  const handleAddOption = useCallback(() => {
    addOption();
  }, [addOption]);

  const namedCount = decision.options.filter(
    (o) => o.name.trim().length > 0 && !/^Option \d+$/.test(o.name),
  ).length;
  const showWarning = decision.options.length > SOFT_LIMIT;

  // Register/unregister input refs
  const setInputRef = useCallback((id: string, el: HTMLInputElement | null) => {
    if (el) {
      inputRefs.current.set(id, el);
    } else {
      inputRefs.current.delete(id);
    }
  }, []);

  // Track newly added option for focus
  const prevOptionsCountRef = useRef(decision.options.length);
  useEffect(() => {
    if (decision.options.length > prevOptionsCountRef.current) {
      const lastOpt = decision.options[decision.options.length - 1];
      if (lastOpt) lastAddedIdRef.current = lastOpt.id;
    }
    prevOptionsCountRef.current = decision.options.length;
  }, [decision.options]);

  return (
    <div data-testid="wizard-step-2">
      {/* Context header */}
      <div className="mb-5">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add the options you&apos;re comparing
          {decision.title ? (
            <>
              {" "}
              for:{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                &ldquo;{decision.title}&rdquo;
              </span>
            </>
          ) : (
            ":"
          )}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          Tip: 2–5 options works best. You can always add more later in Advanced mode.
        </p>
      </div>

      {/* Option inputs */}
      <div className="space-y-2" role="list" aria-label="Decision options">
        {decision.options.map((option, index) => {
          // Clear auto-generated "Option N" names for display
          const displayName = /^Option \d+$/.test(option.name) ? "" : option.name;

          return (
            <div key={option.id} role="listitem" className="group flex items-center gap-2">
              <span className="w-6 text-right text-sm font-medium text-gray-400 dark:text-gray-500 tabular-nums select-none">
                {index + 1}.
              </span>
              <input
                ref={(el) => setInputRef(option.id, el)}
                type="text"
                value={displayName}
                onChange={(e) => handleNameChange(option.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={typeExamples.placeholder}
                aria-label={`Option ${index + 1} name`}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
                data-testid={`option-input-${index}`}
              />
              {/* Remove button — show when more than 2 rows */}
              {decision.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemove(option.id)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                  aria-label={`Remove option ${index + 1}`}
                  data-testid={`option-remove-${index}`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={handleAddOption}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        data-testid="add-option-btn"
      >
        <Plus className="h-4 w-4" />
        Add another option
      </button>

      {/* Soft limit warning */}
      {showWarning && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400" data-testid="options-warning">
          Consider narrowing your options for clearer results.
        </p>
      )}

      {/* Validation error */}
      {validationError && (
        <p
          className="mt-3 text-sm text-red-600 dark:text-red-400"
          role="alert"
          data-testid="options-error"
        >
          {validationError}
        </p>
      )}

      {/* Options count helper */}
      <p className="mt-3 text-xs text-gray-400 dark:text-gray-500" data-testid="options-count">
        {namedCount} option{namedCount !== 1 ? "s" : ""} added
        {namedCount < 2 && " — add at least 2 to compare"}
      </p>

      {/* Quick examples collapsible */}
      {inferredType && inferredType !== "custom" && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors"
            data-testid="toggle-examples"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                showExamples ? "rotate-180" : ""
              }`}
            />
            Quick examples
          </button>
          {showExamples && (
            <div
              className="mt-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-3"
              data-testid="examples-panel"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                Common option names for inspiration:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {typeExamples.examples.map((example) => (
                  <span
                    key={example}
                    className="inline-block rounded-full bg-white dark:bg-gray-600 px-2.5 py-0.5 text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500"
                  >
                    {example}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
