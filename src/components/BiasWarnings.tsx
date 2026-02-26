/**
 * BiasWarnings — displays cognitive bias detection warnings.
 *
 * Each warning is individually dismissible. A "Dismiss all" button clears all.
 * Warnings are announced via aria-live for screen readers.
 */

"use client";

import { AlertTriangle, Brain, Info, X, XCircle } from "lucide-react";
import type { BiasWarning, BiasSeverity, BiasType } from "@/lib/bias-detection";

interface BiasWarningsProps {
  warnings: BiasWarning[];
  onDismiss: (type: BiasType) => void;
  onDismissAll: () => void;
  /** Compact mode for Results tab (shorter descriptions) */
  compact?: boolean;
}

const SEVERITY_STYLES: Record<
  BiasSeverity,
  { bg: string; border: string; icon: string; text: string }
> = {
  critical: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-500",
    text: "text-red-800 dark:text-red-300",
  },
  warning: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800",
    icon: "text-orange-500",
    text: "text-orange-800 dark:text-orange-300",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-500",
    text: "text-blue-800 dark:text-blue-300",
  },
};

function SeverityIcon({ severity }: { severity: BiasSeverity }) {
  const style = SEVERITY_STYLES[severity];
  switch (severity) {
    case "critical":
      return <XCircle className={`h-4 w-4 shrink-0 ${style.icon}`} />;
    case "warning":
      return <AlertTriangle className={`h-4 w-4 shrink-0 ${style.icon}`} />;
    case "info":
      return <Info className={`h-4 w-4 shrink-0 ${style.icon}`} />;
  }
}

export function BiasWarnings({ warnings, onDismiss, onDismissAll, compact }: BiasWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <div
      className="space-y-2"
      aria-live="polite"
      aria-label="Decision quality insights"
      data-testid="bias-warnings"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Brain className="h-4 w-4 text-purple-500" />
          {compact
            ? `Bias Check: ${warnings.length} issue${warnings.length !== 1 ? "s" : ""}`
            : "Decision Quality Insights"}
        </h3>
        {warnings.length > 1 && (
          <button
            onClick={onDismissAll}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss all bias warnings"
          >
            Dismiss all
          </button>
        )}
      </div>

      {warnings.map((w) => {
        const style = SEVERITY_STYLES[w.severity];
        return (
          <div
            key={w.type}
            className={`rounded-md border ${style.border} ${style.bg} px-3 py-2.5 text-sm ${style.text}`}
            role="alert"
          >
            <div className="flex items-start gap-2">
              <SeverityIcon severity={w.severity} />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{w.title}</p>
                {!compact && (
                  <>
                    <p className="mt-0.5 text-xs opacity-80">{w.description}</p>
                    <p className="mt-1 text-xs font-medium opacity-90">💡 {w.suggestion}</p>
                  </>
                )}
              </div>
              <button
                onClick={() => onDismiss(w.type)}
                className="shrink-0 rounded p-0.5 opacity-50 hover:opacity-100 transition-opacity"
                aria-label={`Dismiss ${w.title}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
