/**
 * Placeholder for Step 1: Decision Type selector.
 * Full implementation in issue #226.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/226
 */

"use client";

import { Lightbulb } from "lucide-react";

export function WizardStepType() {
  return (
    <div className="text-center py-12" data-testid="wizard-step-1">
      <Lightbulb className="h-12 w-12 text-blue-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        What are you deciding?
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        Choose a decision type to get started with pre-configured criteria, or create a custom
        decision from scratch.
      </p>
    </div>
  );
}
