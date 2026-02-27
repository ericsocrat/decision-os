/**
 * Placeholder for Step 3: Criteria, weights, and scoring.
 * Full implementation in issue #228.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/228
 */

"use client";

import { SlidersHorizontal } from "lucide-react";

export function WizardStepCriteria() {
  return (
    <div className="text-center py-12" data-testid="wizard-step-3">
      <SlidersHorizontal className="h-12 w-12 text-blue-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Set criteria &amp; score
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        Define what matters, adjust weights, and score each option on every criterion.
      </p>
    </div>
  );
}
