/**
 * EmptyState — compelling landing experience for new / returning users with no data.
 *
 * Shows a hero section, template quick-start cards, a "Try Demo" card,
 * and a feature highlight list. Fades out when user starts a decision.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/234
 */

"use client";

import { memo, useCallback, useState } from "react";
import { Sparkles, Zap, BarChart3, Shield, ArrowRight, Play, Layout } from "lucide-react";
import { TEMPLATES, instantiateTemplate, type DecisionTemplate } from "@/lib/templates";
import type { Decision } from "@/lib/types";

export interface EmptyStateProps {
  /** Called when user picks a template — receives a fully instantiated Decision. */
  readonly onLoadTemplate: (decision: Decision) => void;
  /** Called when user loads the demo decision. */
  readonly onLoadDemo: () => void;
  /** Called when user wants a blank decision in advanced mode. */
  readonly onStartBlank: () => void;
}

// ---------------------------------------------------------------------------
// Feature highlights shown below the template grid
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    title: "Multi-Framework Scoring",
    desc: "WSM, TOPSIS, Minimax Regret, and consensus rankings in one view.",
  },
  {
    icon: <Zap className="h-5 w-5 text-amber-500" />,
    title: "Sensitivity & What-If",
    desc: "See how weight changes affect your rankings instantly.",
  },
  {
    icon: <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />,
    title: "Private & Local-First",
    desc: "All data stays in your browser. No account required.",
  },
  {
    icon: <Layout className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
    title: "Monte Carlo Simulation",
    desc: "Run 10 000 simulations to quantify decision confidence.",
  },
] as const;

// Show at most 6 templates in the quick-start grid
const QUICK_TEMPLATES = TEMPLATES.slice(0, 6);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EmptyState = memo(function EmptyState({
  onLoadTemplate,
  onLoadDemo,
  onStartBlank,
}: EmptyStateProps) {
  const [fadingOut, setFadingOut] = useState(false);

  const handleTemplate = useCallback(
    (tpl: DecisionTemplate) => {
      setFadingOut(true);
      // Allow the fade-out animation to start before calling back
      requestAnimationFrame(() => {
        const decision = instantiateTemplate(tpl);
        onLoadTemplate(decision);
      });
    },
    [onLoadTemplate]
  );

  const handleDemo = useCallback(() => {
    setFadingOut(true);
    requestAnimationFrame(() => onLoadDemo());
  }, [onLoadDemo]);

  const handleBlank = useCallback(() => {
    setFadingOut(true);
    requestAnimationFrame(() => onStartBlank());
  }, [onStartBlank]);

  return (
    <div
      data-testid="empty-state"
      className={`space-y-10 transition-all duration-300 ${
        fadingOut ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* ── Hero ── */}
      <section className="text-center space-y-3" aria-label="Welcome">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40">
          <Sparkles className="h-7 w-7 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Make better decisions, faster
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          Score your options, compare trade-offs, and find the best choice — all in your browser.
        </p>
      </section>

      {/* ── Quick-Start Actions ── */}
      <section aria-label="Quick start" className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={handleBlank}
          data-testid="start-blank"
          className="inline-flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          Start from Scratch
        </button>
        <button
          type="button"
          onClick={handleDemo}
          data-testid="load-demo"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Play className="h-4 w-4" />
          Try Demo Decision
        </button>
      </section>

      {/* ── Template Grid ── */}
      <section aria-label="Templates">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 text-center">
          Or start with a template
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.templateId}
              type="button"
              onClick={() => handleTemplate(tpl)}
              data-testid={`template-${tpl.templateId}`}
              className="group flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
            >
              <span className="text-2xl leading-none" role="img" aria-hidden="true">
                {tpl.icon}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {tpl.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {tpl.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Feature Highlights ── */}
      <section aria-label="Features" className="pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4"
            >
              <div className="shrink-0 mt-0.5">{f.icon}</div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
});
