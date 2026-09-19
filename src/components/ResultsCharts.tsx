/**
 * Results charts — a single lazy boundary for the score and trade-off visualizations.
 *
 * Keeping the two Recharts consumers in one module lets the production bundler share
 * the charting runtime instead of emitting a copy for each independently lazy chart.
 */

"use client";

import { BarChart3, Crosshair } from "lucide-react";
import type { Decision, DecisionResults, OptionResult } from "@/lib/types";
import { CollapsibleSection } from "./CollapsibleSection";
import { HelpTooltip } from "./HelpTooltip";
import { ParetoChart } from "./ParetoChart";
import { ScoreChart } from "./ScoreChart";

interface ResultsChartsProps {
  readonly decision: Decision;
  readonly results: DecisionResults;
  readonly optionResults: OptionResult[];
}

export default function ResultsCharts({ decision, results, optionResults }: ResultsChartsProps) {
  return (
    <>
      <section aria-labelledby="chart-heading" className="print:hidden">
        <h2
          id="chart-heading"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3"
        >
          <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Score Visualization
        </h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <ScoreChart optionResults={optionResults} />
        </div>
      </section>

      {decision.criteria.length >= 2 && decision.options.length >= 2 && (
        <CollapsibleSection
          sectionId="pareto"
          title="Trade-Off Explorer"
          ariaLabel="Trade-Off Explorer"
          icon={<Crosshair className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          headerAccessory={<HelpTooltip topic="pareto" />}
        >
          <ParetoChart decision={decision} results={results} />
        </CollapsibleSection>
      )}
    </>
  );
}
