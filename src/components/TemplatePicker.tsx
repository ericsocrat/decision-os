/**
 * Template Picker modal — grid of pre-built decision templates.
 *
 * Opens as a dialog, keyboard-navigable (Tab, Enter, Escape).
 * Selecting a template creates a new decision and closes the modal.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/10
 */

"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { TEMPLATES, instantiateTemplate } from "@/lib/templates";
import type { DecisionTemplate } from "@/lib/templates";

interface TemplatePickerProps {
  onSelect: (template: DecisionTemplate) => void;
  onClose: () => void;
}

export function TemplatePicker({ onSelect, onClose }: TemplatePickerProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Focus trap and Escape handling
  useEffect(() => {
    triggerRef.current = document.activeElement;
    const modal = modalRef.current;
    if (!modal) return;

    // Focus the first card
    const firstCard = modal.querySelector<HTMLElement>("[data-template-card]");
    firstCard?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the element that opened the modal
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a decision template"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Start from Template
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Choose a pre-built template to get started quickly.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close template picker"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATES.map((template) => (
            <button
              key={template.templateId}
              data-template-card
              onClick={() => onSelect(template)}
              className="text-left rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" role="img" aria-hidden="true">
                  {template.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {template.description}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                    {template.criteria.length} criteria · {template.options.length} options
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { instantiateTemplate };
