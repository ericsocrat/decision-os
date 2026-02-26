/**
 * Pareto Chart — Trade-Off Explorer scatter plot with dominated-option detection.
 *
 * Renders a Recharts ScatterChart with Pareto frontier line and
 * dropdown axis selectors. Lazy-loaded from ResultsView.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/78
 */

"use client";

import { memo, useMemo, useState, useCallback } from "react";
import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Cell,
} from "recharts";
import { AlertTriangle, Info } from "lucide-react";
import type { Decision, DecisionResults } from "@/lib/types";
import {
  computeParetoFrontier,
  defaultAxes,
  type ParetoPoint,
  type ParetoResult,
} from "@/lib/pareto";

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

/** Blue for Pareto-optimal, gray for dominated */
const PARETO_COLOR = "#2563eb"; // blue-600
const DOMINATED_COLOR = "#9ca3af"; // gray-400
const FRONTIER_LINE_COLOR = "#3b82f6"; // blue-500

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParetoChartProps {
  decision: Decision;
  results: DecisionResults;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function ParetoTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ParetoPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{data.optionName}</p>
      <p className="text-gray-600 dark:text-gray-400">
        X: {data.x.toFixed(1)} · Y: {data.y.toFixed(1)}
      </p>
      <p
        className={`mt-1 text-xs font-medium ${
          data.isPareto ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-500"
        }`}
      >
        {data.isPareto ? "★ Pareto-optimal" : "Dominated"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom scatter dot
// ---------------------------------------------------------------------------

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ParetoPoint;
}

function ParetoScatterDot({ cx, cy, payload }: DotProps) {
  if (cx == null || cy == null || !payload) return null;

  const isPareto = payload.isPareto;
  const r = isPareto ? 6 : 4;
  const fill = isPareto ? PARETO_COLOR : DOMINATED_COLOR;
  const opacity = isPareto ? 1 : 0.6;

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} opacity={opacity} stroke="#fff" strokeWidth={1.5} />
      {/* Label */}
      <text
        x={cx}
        y={cy - r - 6}
        textAnchor="middle"
        fontSize={11}
        fill={isPareto ? PARETO_COLOR : DOMINATED_COLOR}
        className="select-none pointer-events-none"
      >
        {payload.optionName}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function ParetoChartInner({ decision, results }: ParetoChartProps) {
  // ── Default axes: two highest-weighted criteria ──────────
  const axes = useMemo(() => defaultAxes(decision), [decision]);
  const [xAxis, setXAxis] = useState<string>(axes?.[0] ?? "");
  const [yAxis, setYAxis] = useState<string>(axes?.[1] ?? "");

  // Update axes if criteria change and current selection is invalid
  const validX = decision.criteria.some((c) => c.id === xAxis) ? xAxis : (axes?.[0] ?? "");
  const validY = decision.criteria.some((c) => c.id === yAxis) ? yAxis : (axes?.[1] ?? "");

  if (validX !== xAxis) setXAxis(validX);
  if (validY !== yAxis) setYAxis(validY);

  const sameAxis = validX === validY && validX !== "";

  // ── Compute Pareto frontier ──────────────────────────────
  const pareto: ParetoResult = useMemo(
    () => computeParetoFrontier(decision, validX, validY),
    [decision, validX, validY]
  );

  // ── Frontier line data (sorted by x for a clean step line) ──
  const frontierLineData = useMemo(() => {
    const frontierPoints = pareto.points.filter((p) => p.isPareto).sort((a, b) => a.x - b.x);
    return frontierPoints.map((p) => ({ x: p.x, y: p.y }));
  }, [pareto]);

  // WSM rank lookup
  const rankMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of results.optionResults) {
      map[r.optionId] = r.rank;
    }
    return map;
  }, [results]);

  const handleXChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setXAxis(e.target.value);
  }, []);

  const handleYChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setYAxis(e.target.value);
  }, []);

  // ── Tooltip content enrichment ───────────────────────────
  const enrichedPoints = useMemo(
    () =>
      pareto.points.map((p) => ({
        ...p,
        rank: rankMap[p.optionId] ?? 0,
      })),
    [pareto.points, rankMap]
  );

  // ── Guard: < 2 criteria ──────────────────────────────────
  if (decision.criteria.length < 2) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
        Add at least 2 criteria to see trade-off analysis.
      </div>
    );
  }

  if (decision.options.length < 2) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
        Add at least 2 options to see trade-off analysis.
      </div>
    );
  }

  // Ensure chart domain has some padding
  const xValues = pareto.points.map((p) => p.x);
  const yValues = pareto.points.map((p) => p.y);
  const xMin = Math.max(0, Math.min(...xValues) - 0.5);
  const xMax = Math.min(10, Math.max(...xValues) + 0.5);
  const yMin = Math.max(0, Math.min(...yValues) - 0.5);
  const yMax = Math.min(10, Math.max(...yValues) + 0.5);

  return (
    <div className="space-y-4">
      {/* Axis Selectors */}
      <div className="flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-medium">X Axis:</span>
          <select
            value={validX}
            onChange={handleXChange}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
          >
            {decision.criteria.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Y Axis:</span>
          <select
            value={validY}
            onChange={handleYChange}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"
          >
            {decision.criteria.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Same axis warning */}
      {sameAxis && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Select different criteria for X and Y axes to see trade-offs.
        </div>
      )}

      {/* Scatter Chart */}
      {!sameAxis && (
        <div
          className="w-full"
          aria-label={`Trade-off scatter plot: ${pareto.xLabel} vs ${pareto.yLabel}. ${pareto.frontier.length} Pareto-optimal options, ${pareto.dominated.length} dominated options.`}
          role="img"
        >
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis
                type="number"
                dataKey="x"
                domain={[xMin, xMax]}
                name={pareto.xLabel}
                label={{
                  value: pareto.xLabel,
                  position: "insideBottom",
                  offset: -10,
                  className: "fill-gray-600 dark:fill-gray-400",
                }}
                tick={{ fontSize: 12, className: "fill-gray-500 dark:fill-gray-400" }}
                className="stroke-gray-300 dark:stroke-gray-600"
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[yMin, yMax]}
                name={pareto.yLabel}
                label={{
                  value: pareto.yLabel,
                  angle: -90,
                  position: "insideLeft",
                  offset: 5,
                  className: "fill-gray-600 dark:fill-gray-400",
                }}
                tick={{ fontSize: 12, className: "fill-gray-500 dark:fill-gray-400" }}
                className="stroke-gray-300 dark:stroke-gray-600"
              />
              <Tooltip content={<ParetoTooltip />} />

              {/* Pareto frontier line */}
              {frontierLineData.length >= 2 && (
                <Line
                  data={frontierLineData}
                  type="monotone"
                  dataKey="y"
                  stroke={FRONTIER_LINE_COLOR}
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  legendType="none"
                  isAnimationActive={false}
                />
              )}

              {/* Scatter points */}
              <Scatter data={enrichedPoints} shape={<ParetoScatterDot />} isAnimationActive={false}>
                {enrichedPoints.map((p) => (
                  <Cell key={p.optionId} fill={p.isPareto ? PARETO_COLOR : DOMINATED_COLOR} />
                ))}
              </Scatter>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {!sameAxis && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: PARETO_COLOR }}
            />
            Pareto-optimal ({pareto.frontier.length})
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full opacity-60"
              style={{ backgroundColor: DOMINATED_COLOR }}
            />
            Dominated ({pareto.dominated.length})
          </span>
          {frontierLineData.length >= 2 && (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-6 border-t-2 border-dashed"
                style={{ borderColor: FRONTIER_LINE_COLOR }}
              />
              Frontier
            </span>
          )}
        </div>
      )}

      {/* Dominated option insights */}
      {!sameAxis && pareto.dominated.length > 0 && (
        <div className="space-y-2">
          {pareto.dominated.map((domId) => {
            const dominators = pareto.dominanceMap[domId] ?? [];
            const domOpt = decision.options.find((o) => o.id === domId);
            // Show only the first dominator for brevity
            const dominator = decision.options.find((o) => o.id === dominators[0]);
            if (!domOpt || !dominator) return null;

            return (
              <div
                key={domId}
                className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-400"
              >
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                <span>
                  <strong className="text-gray-800 dark:text-gray-200">{domOpt.name}</strong> is
                  dominated by{" "}
                  <strong className="text-gray-800 dark:text-gray-200">{dominator.name}</strong> —{" "}
                  {dominator.name} scores higher on both {pareto.xLabel} and {pareto.yLabel}.
                  {dominators.length > 1 &&
                    ` (and ${dominators.length - 1} other${dominators.length > 2 ? "s" : ""})`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const ParetoChart = memo(ParetoChartInner);
