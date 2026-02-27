/**
 * Placeholder for Step 4: Simplified results view.
 * Full implementation in issue #229.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/229
 */

"use client";

import { Trophy } from "lucide-react";

export function WizardStepResults() {
  return (
    <div className="text-center py-12" data-testid="wizard-step-4">
      <Trophy className="h-12 w-12 text-blue-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Your results</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        See your ranked options, explore confidence scores, and dive deeper with advanced analysis.
      </p>
    </div>
  );
}
