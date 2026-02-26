/**
 * TabErrorFallback — lightweight fallback for tab-level ErrorBoundaries.
 *
 * Shown when a single analysis tab (Results, Sensitivity, Compare, Monte Carlo)
 * crashes during render. Reassures the user their data is safe and provides
 * a retry button that resets just this tab's error boundary.
 */

"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

interface TabErrorFallbackProps {
  /** Display name for the tab that errored */
  tab: string;
  /** Called when the user clicks "Try Again" — should reset the ErrorBoundary */
  onReset?: () => void;
}

export function TabErrorFallback({ tab, onReset }: TabErrorFallbackProps) {
  return (
    <div role="alert" className="min-h-[200px] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-8 w-8 text-amber-500 dark:text-amber-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {tab} encountered an error
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your decision data is safe. Other tabs are unaffected.
        </p>
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
