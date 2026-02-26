/**
 * Decision Builder — Title, description, options, criteria, and scores matrix.
 */

"use client";

import { useDecision } from "./DecisionProvider";
import { Plus, Trash2, Info, Clock, AlertCircle, AlertTriangle, Undo2, Redo2 } from "lucide-react";
import { showToast } from "./Toast";
import { formatRelativeTime } from "@/lib/utils";
import type { CriterionType } from "@/lib/types";
import type { ValidationResult } from "@/hooks/useValidation";
import { useCallback, useMemo, useRef } from "react";
import { computeCompleteness } from "@/lib/completeness";
import { CompletionRing } from "./CompletionRing";

interface DecisionBuilderProps {
  validation: ValidationResult;
}

export function DecisionBuilder({ validation }: DecisionBuilderProps) {
  const {
    decision,
    updateTitle,
    updateDescription,
    addOption,
    updateOption,
    removeOption,
    addCriterion,
    updateCriterion,
    removeCriterion,
    updateScore,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDecision();

  const gridRef = useRef<HTMLTableElement>(null);
  const completeness = useMemo(() => computeCompleteness(decision), [decision]);

  /** Arrow-key navigation within the score matrix (WAI-ARIA grid pattern) */
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
      const rows = decision.options.length;
      const cols = decision.criteria.length;
      let nextRow = rowIdx;
      let nextCol = colIdx;

      switch (e.key) {
        case "ArrowUp":
          nextRow = Math.max(0, rowIdx - 1);
          break;
        case "ArrowDown":
          nextRow = Math.min(rows - 1, rowIdx + 1);
          break;
        case "ArrowLeft":
          nextCol = Math.max(0, colIdx - 1);
          break;
        case "ArrowRight":
          nextCol = Math.min(cols - 1, colIdx + 1);
          break;
        default:
          return; // Don't prevent default for other keys
      }

      if (nextRow !== rowIdx || nextCol !== colIdx) {
        e.preventDefault();
        const selector = `[data-grid-row="${nextRow}"][data-grid-col="${nextCol}"]`;
        const next = gridRef.current?.querySelector<HTMLInputElement>(selector);
        next?.focus();
        next?.select();
      }
    },
    [decision.options.length, decision.criteria.length]
  );

  return (
    <div className="space-y-6">
      {/* Undo/Redo toolbar */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          aria-label="Undo (Ctrl+Z)"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Undo</span>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
          aria-label="Redo (Ctrl+Shift+Z)"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Redo</span>
        </button>
      </div>

      {/* Title & Description */}
      <section aria-labelledby="decision-heading">
        <h2
          id="decision-heading"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3"
        >
          Decision Details
        </h2>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="decision-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="decision-title"
              type="text"
              value={decision.title}
              onChange={(e) => updateTitle(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                validation.byField.has("title")
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
              } dark:bg-gray-700 dark:text-gray-100`}
              placeholder="What are you deciding?"
              maxLength={100}
              aria-invalid={validation.byField.has("title") || undefined}
              aria-describedby={validation.byField.has("title") ? "title-error" : undefined}
            />
            {validation.byField.has("title") && (
              <p
                id="title-error"
                className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                {validation.byField.get("title")![0].message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="decision-desc"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description
            </label>
            <textarea
              id="decision-desc"
              value={decision.description || ""}
              onChange={(e) => updateDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Brief context about this decision..."
              maxLength={500}
            />
          </div>
          {/* Timestamps */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created{" "}
              <time
                dateTime={decision.createdAt}
                title={new Date(decision.createdAt).toLocaleString()}
              >
                {formatRelativeTime(decision.createdAt)}
              </time>
            </span>
            {decision.updatedAt !== decision.createdAt && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated{" "}
                <time
                  dateTime={decision.updatedAt}
                  title={new Date(decision.updatedAt).toLocaleString()}
                >
                  {formatRelativeTime(decision.updatedAt)}
                </time>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Options */}
      <section aria-labelledby="options-heading">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="options-heading"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Options
          </h2>
          <button
            onClick={addOption}
            className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Add option"
          >
            <Plus className="h-4 w-4" />
            Add Option
          </button>
        </div>
        <div className="space-y-2">
          {decision.options.map((opt, index) => {
            // Labels: A-Z, then AA, AB, ...
            const label =
              index < 26
                ? String.fromCharCode(65 + index)
                : String.fromCharCode(65 + Math.floor(index / 26) - 1) +
                  String.fromCharCode(65 + (index % 26));
            const optIssues = validation.byId.get(opt.id);
            const hasIssue = !!optIssues && optIssues.length > 0;
            return (
              <div key={opt.id}>
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-medium text-gray-400">{label}</span>
                  <input
                    type="text"
                    value={opt.name}
                    onChange={(e) => updateOption(opt.id, { name: e.target.value })}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      hasIssue
                        ? "border-orange-400 focus:border-orange-500 focus:ring-orange-500"
                        : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
                    } dark:bg-gray-700 dark:text-gray-100`}
                    placeholder={`Option ${label}`}
                    aria-label={`Option ${index + 1} name`}
                    maxLength={80}
                    aria-invalid={hasIssue || undefined}
                  />
                  {decision.options.length > 2 && (
                    <button
                      onClick={() => {
                        removeOption(opt.id);
                        showToast({
                          text: `Option "${opt.name}" removed`,
                          action: { label: "Undo", onClick: undo },
                        });
                      }}
                      className="rounded-md p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                      aria-label={`Remove option ${opt.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {hasIssue && (
                  <p className="ml-8 mt-0.5 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {optIssues![0].message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Criteria */}
      <section aria-labelledby="criteria-heading">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2
              id="criteria-heading"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Criteria
            </h2>
            <span id="weight-range-desc" className="sr-only">
              Enter a value between 0 and 100
            </span>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 top-6 z-10 hidden group-hover:block w-64 rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
                <p className="font-medium mb-1">Benefit vs Cost:</p>
                <p>
                  <strong>Benefit:</strong> Higher score = better (e.g., quality, speed)
                </p>
                <p>
                  <strong>Cost:</strong> Lower score = better (e.g., price, risk). Scores are
                  inverted internally.
                </p>
                <p className="mt-1">Weights are normalized to sum to 100%.</p>
              </div>
            </div>
          </div>
          <button
            onClick={addCriterion}
            className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Add criterion"
          >
            <Plus className="h-4 w-4" />
            Add Criterion
          </button>
        </div>
        <div className="space-y-2">
          {validation.byField.has("weights") && (
            <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {validation.byField.get("weights")![0].message}
            </div>
          )}
          {decision.criteria.map((crit) => {
            const critIssues = validation.byId.get(crit.id);
            const critWarning = critIssues?.find((i) => i.severity === "warning");
            const critInfo = critIssues?.find((i) => i.severity === "info");
            return (
              <div key={crit.id}>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    value={crit.name}
                    onChange={(e) => updateCriterion(crit.id, { name: e.target.value })}
                    className={`flex-1 min-w-[120px] rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      critWarning
                        ? "border-orange-400 focus:border-orange-500 focus:ring-orange-500"
                        : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
                    } dark:bg-gray-700 dark:text-gray-100`}
                    placeholder="Criterion name"
                    aria-label={`Criterion name: ${crit.name}`}
                    maxLength={80}
                    aria-invalid={!!critWarning || undefined}
                  />
                  <div className="flex items-center gap-1">
                    <label
                      className="text-xs text-gray-500 w-12 text-right"
                      htmlFor={`weight-${crit.id}`}
                    >
                      Weight
                    </label>
                    <input
                      id={`weight-${crit.id}`}
                      type="number"
                      min={0}
                      max={100}
                      value={crit.weight}
                      onChange={(e) =>
                        updateCriterion(crit.id, {
                          weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                        })
                      }
                      className="w-16 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-2 text-sm text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label={`Weight for ${crit.name}`}
                      aria-describedby="weight-range-desc"
                    />
                  </div>
                  <select
                    value={crit.type}
                    onChange={(e) =>
                      updateCriterion(crit.id, { type: e.target.value as CriterionType })
                    }
                    className="rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label={`Type for ${crit.name}`}
                  >
                    <option value="benefit">Benefit ↑</option>
                    <option value="cost">Cost ↓</option>
                  </select>
                  {decision.criteria.length > 1 && (
                    <button
                      onClick={() => {
                        removeCriterion(crit.id);
                        showToast({
                          text: `Criterion "${crit.name}" removed`,
                          action: { label: "Undo", onClick: undo },
                        });
                      }}
                      className="rounded-md p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                      aria-label={`Remove criterion ${crit.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {critWarning && (
                  <p className="mt-0.5 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {critWarning.message}
                  </p>
                )}
                {critInfo && !critWarning && (
                  <p className="mt-0.5 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" />
                    {critInfo.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Scores Matrix */}
      <section aria-labelledby="scores-heading">
        <h2
          id="scores-heading"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3"
        >
          Scores Matrix
          <span className="text-sm font-normal text-gray-500 ml-2">(0–10 per cell)</span>
        </h2>
        <span id="score-range-desc" className="sr-only">
          Enter a value between 0 and 10
        </span>
        <div className="overflow-x-auto">
          <table
            ref={gridRef}
            className="min-w-full border-collapse"
            role="grid"
            aria-label="Scores matrix"
          >
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  Option / Criterion
                </th>
                {decision.criteria.map((crit) => (
                  <th
                    key={crit.id}
                    className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-gray-200 dark:border-gray-700"
                  >
                    <div>{crit.name}</div>
                    <span
                      className={`text-[10px] font-normal ${crit.type === "cost" ? "text-orange-600" : "text-green-600"}`}
                    >
                      {crit.type === "cost" ? "↓ cost" : "↑ benefit"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decision.options.map((opt, rowIdx) => (
                <tr key={opt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700">
                    {opt.name}
                  </td>
                  {decision.criteria.map((crit, colIdx) => (
                    <td
                      key={crit.id}
                      className="px-3 py-2 text-center border-b border-gray-100 dark:border-gray-700"
                    >
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={1}
                        value={decision.scores[opt.id]?.[crit.id] ?? 0}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v)) {
                            updateScore(opt.id, crit.id, Math.max(0, Math.min(10, v)));
                          }
                        }}
                        onKeyDown={(e) => handleGridKeyDown(e, rowIdx, colIdx)}
                        data-grid-row={rowIdx}
                        data-grid-col={colIdx}
                        className="w-14 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-2 py-1.5 text-sm text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label={`Score for ${opt.name} on ${crit.name}`}
                        aria-describedby="score-range-desc"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Completion progress ring */}
        {completeness.total > 0 && (
          <div className="mt-4">
            <CompletionRing completeness={completeness} />
          </div>
        )}
      </section>
    </div>
  );
}
