/**
 * ReasoningPopover — click-triggered popover for per-score reasoning notes.
 *
 * Renders a small note icon. When clicked, shows a textarea popover
 * for entering/editing reasoning text. A filled icon indicates existing reasoning.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare } from "lucide-react";

interface ReasoningPopoverProps {
  /** Current reasoning text (empty string or undefined = no reasoning) */
  value: string | undefined;
  /** Called when reasoning text changes */
  onChange: (text: string) => void;
  /** Accessible label for the button */
  optionName: string;
  criterionName: string;
}

export function ReasoningPopover({
  value,
  onChange,
  optionName,
  criterionName,
}: ReasoningPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasReasoning = !!value && value.trim().length > 0;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  }, []);

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`p-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
          hasReasoning
            ? "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            : "text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400"
        }`}
        aria-label={`${hasReasoning ? "Edit" : "Add"} reasoning for ${optionName} on ${criterionName}`}
        aria-expanded={isOpen}
        title={hasReasoning ? value : "Add reasoning note"}
      >
        <MessageSquare className="h-3.5 w-3.5" fill={hasReasoning ? "currentColor" : "none"} />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-1 left-1/2 -translate-x-1/2 w-56 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg p-2"
          role="dialog"
          aria-modal="true"
          aria-label={`Reasoning for ${optionName} on ${criterionName}`}
          onKeyDown={handleKeyDown}
        >
          <label htmlFor={`reasoning-${optionName}-${criterionName}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Why this score?
          </label>
          <textarea
            id={`reasoning-${optionName}-${criterionName}`}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 px-2 py-1.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            rows={3}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Explain your reasoning..."
            autoFocus
          />
          {hasReasoning && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="mt-1 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear note
            </button>
          )}
        </div>
      )}
    </div>
  );
}
