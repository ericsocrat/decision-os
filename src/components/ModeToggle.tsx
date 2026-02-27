/**
 * ModeToggle — floating pill for switching between Guided and Advanced modes.
 *
 * Renders as a fixed-position radio group at the bottom-right of the viewport.
 * Active segment: filled background. Inactive segment: outline + hover state.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/225
 */

"use client";

import { memo } from "react";
import { Compass, Zap } from "lucide-react";
import type { WizardMode } from "@/hooks/useWizardMode";

interface ModeToggleProps {
  /** Current interface mode */
  mode: WizardMode;
  /** Callback when user selects a mode */
  onModeChange: (mode: WizardMode) => void;
}

export const ModeToggle = memo(function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Interface mode"
      className="fixed bottom-6 right-6 z-50 inline-flex rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg print:hidden"
      data-testid="mode-toggle"
    >
      <button
        role="radio"
        aria-checked={mode === "guided"}
        onClick={() => onModeChange("guided")}
        className={`inline-flex items-center gap-1.5 rounded-l-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          mode === "guided"
            ? "bg-blue-600 text-white dark:bg-blue-500"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
        data-testid="mode-guided"
      >
        <Compass className="h-4 w-4" />
        Guided
      </button>
      <button
        role="radio"
        aria-checked={mode === "advanced"}
        onClick={() => onModeChange("advanced")}
        className={`inline-flex items-center gap-1.5 rounded-r-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          mode === "advanced"
            ? "bg-blue-600 text-white dark:bg-blue-500"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
        data-testid="mode-advanced"
      >
        <Zap className="h-4 w-4" />
        Advanced
      </button>
    </div>
  );
});
