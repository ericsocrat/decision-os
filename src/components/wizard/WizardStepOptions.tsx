/**
 * Placeholder for Step 2: Options entry.
 * Full implementation in issue #227.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/227
 */

"use client";

import { List } from "lucide-react";

export function WizardStepOptions() {
  return (
    <div className="text-center py-12" data-testid="wizard-step-2">
      <List className="h-12 w-12 text-blue-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Add your options
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        List the options you&apos;re comparing. You can add details and descriptions for each.
      </p>
    </div>
  );
}
