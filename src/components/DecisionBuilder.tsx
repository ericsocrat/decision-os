/**
 * Decision Builder — Title, description, options, criteria, and scores matrix.
 */

"use client";

import { useDecisionData, useActions } from "./DecisionProvider";
import {
  Plus,
  Trash2,
  Info,
  Clock,
  AlertCircle,
  AlertTriangle,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronUp,
  Scale,
} from "lucide-react";
import { showToast } from "./Toast";
import { formatRelativeTime } from "@/lib/utils";
import type { CriterionType } from "@/lib/types";
import type { ValidationResult } from "@/hooks/useValidation";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { type CompletenessResult } from "@/lib/completeness";
import { readScore, resolveConfidence } from "@/lib/scoring";
import { ConfidenceDot } from "./ConfidenceDot";
import { CompletionRing } from "./CompletionRing";
import { WeightSlider } from "./WeightSlider";
import { WeightDistributionBar } from "./WeightDistributionBar";
import { ReasoningPopover } from "./ReasoningPopover";
import { ScoringPrompt } from "./ScoringPrompt";
import type { CalibrationData } from "./ScoringPrompt";
import { BiasWarnings } from "./BiasWarnings";
import { useBiasDetection } from "@/hooks/useBiasDetection";
import { MobileScoreCards } from "./MobileScoreCards";
import { ScoreProvenanceIndicator } from "./ScoreProvenanceIndicator";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { getMetadata, canRestoreEnriched } from "@/lib/provenance";
import { AHPWizard } from "./AHPWizard";
import { HelpTooltip } from "./HelpTooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";
import { CriterionTooltip } from "./CriterionTooltip";

interface DecisionBuilderProps {
  validation: ValidationResult;
  completeness: CompletenessResult;
}

export const DecisionBuilder = memo(function DecisionBuilder({
  validation,
  completeness,
}: DecisionBuilderProps) {
  const { decision, canUndo, canRedo } = useDecisionData();
  const {
    updateTitle,
    updateDescription,
    addOption,
    updateOption,
    removeOption,
    reorderOptions,
    addCriterion,
    updateCriterion,
    removeCriterion,
    reorderCriteria,
    updateScore,
    updateConfidence,
    updateReasoning,
    restoreEnrichedValue,
    undo,
    redo,
  } = useActions();

  const gridRef = useRef<HTMLTableElement>(null);
  const [autoNormalize, setAutoNormalize] = useState(false);
  const biasDetection = useBiasDetection(decision);

  /** Track which score cell is focused (for guided scoring prompt) */
  const [focusedCell, setFocusedCell] = useState<{
    optionId: string;
    criterionId: string;
  } | null>(null);

  /** Build calibration data for the focused cell */
  const focusedCalibration = useMemo<CalibrationData | undefined>(() => {
    if (!focusedCell) return undefined;
    const allScores: number[] = [];
    for (const opt of decision.options) {
      const s = readScore(decision.scores, opt.id, focusedCell.criterionId);
      if (s !== null) allScores.push(s);
    }
    return {
      allScores,
      currentScore: readScore(decision.scores, focusedCell.optionId, focusedCell.criterionId),
    };
  }, [focusedCell, decision.options, decision.scores]);

  const [showAHP, setShowAHP] = useState(false);

  /** Track which option/criterion descriptions are expanded */
  const [expandedDescs, setExpandedDescs] = useState<Set<string>>(() => {
    // Auto-expand any items that already have descriptions
    const ids = new Set<string>();
    for (const opt of decision.options) {
      if (opt.description) ids.add(`opt-${opt.id}`);
    }
    for (const crit of decision.criteria) {
      if (crit.description) ids.add(`crit-${crit.id}`);
    }
    return ids;
  });

  const toggleDesc = useCallback((key: string) => {
    setExpandedDescs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /** Find the criterion with the highest weight */
  const highestWeightId = useMemo(() => {
    if (decision.criteria.length === 0) return null;
    return decision.criteria.reduce((max, c) => (c.weight > max.weight ? c : max)).id;
  }, [decision.criteria]);

  /** Handle weight change with optional auto-normalization */
  const handleWeightChange = useCallback(
    (critId: string, newWeight: number) => {
      if (!autoNormalize) {
        updateCriterion(critId, { weight: Math.max(0, Math.min(100, Math.round(newWeight))) });
        return;
      }
      // Auto-normalize: redistribute delta among other criteria proportionally
      const clamped = Math.max(0, Math.min(100, Math.round(newWeight)));
      const current = decision.criteria.find((c) => c.id === critId);
      if (!current) return;
      const delta = clamped - current.weight;
      if (delta === 0) return;
      const others = decision.criteria.filter((c) => c.id !== critId);
      const othersTotal = others.reduce((sum, c) => sum + c.weight, 0);
      // Apply the change
      updateCriterion(critId, { weight: clamped });
      // Redistribute delta among others proportionally
      if (othersTotal > 0) {
        for (const other of others) {
          const share = other.weight / othersTotal;
          const adjusted = Math.max(0, Math.round(other.weight - delta * share));
          updateCriterion(other.id, { weight: adjusted });
        }
      }
    },
    [autoNormalize, decision.criteria, updateCriterion]
  );

  // ── Drag-and-drop sensors and handlers ──────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleOptionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = decision.options.findIndex((o) => o.id === active.id);
      const newIndex = decision.options.findIndex((o) => o.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderOptions(oldIndex, newIndex);
      }
    },
    [decision.options, reorderOptions]
  );

  const handleCriteriaDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = decision.criteria.findIndex((c) => c.id === active.id);
      const newIndex = decision.criteria.findIndex((c) => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderCriteria(oldIndex, newIndex);
      }
    },
    [decision.criteria, reorderCriteria]
  );

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
              Title <span className="text-red-500 dark:text-red-400">*</span>
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
              aria-required="true"
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleOptionDragEnd}
        >
          <SortableContext
            items={decision.options.map((o) => o.id)}
            strategy={verticalListSortingStrategy}
          >
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
                  <SortableItem key={opt.id} id={opt.id} dragLabel={`Reorder option ${opt.name}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        {label}
                      </span>
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
                          className="rounded-md p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                          aria-label={`Remove option ${opt.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {/* Description toggle + textarea */}
                    <div className="ml-8 mt-1">
                      <button
                        type="button"
                        onClick={() => toggleDesc(`opt-${opt.id}`)}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-expanded={expandedDescs.has(`opt-${opt.id}`)}
                        aria-controls={`opt-desc-${opt.id}`}
                      >
                        {expandedDescs.has(`opt-${opt.id}`) ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {opt.description ? "Edit description" : "Add description"}
                      </button>
                      {expandedDescs.has(`opt-${opt.id}`) && (
                        <div className="mt-1" id={`opt-desc-${opt.id}`}>
                          <textarea
                            value={opt.description ?? ""}
                            onChange={(e) =>
                              updateOption(opt.id, { description: e.target.value.slice(0, 500) })
                            }
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            placeholder="Add notes about this option..."
                            rows={2}
                            maxLength={500}
                            aria-label={`Description for option ${opt.name}`}
                          />
                          <p className="text-right text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {(opt.description ?? "").length}/500
                          </p>
                        </div>
                      )}
                    </div>
                    {hasIssue && (
                      <p className="ml-8 mt-0.5 text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {optIssues![0].message}
                      </p>
                    )}
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
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
            <HelpTooltip topic="weight-normalization" />
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCriteriaDragEnd}
        >
          <SortableContext
            items={decision.criteria.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {validation.byField.has("weights") && (
                <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {validation.byField.get("weights")![0].message}
                </div>
              )}
              {decision.criteria.map((crit, critIndex) => {
                const critIssues = validation.byId.get(crit.id);
                const critWarning = critIssues?.find((i) => i.severity === "warning");
                const critInfo = critIssues?.find((i) => i.severity === "info");
                return (
                  <SortableItem
                    key={crit.id}
                    id={crit.id}
                    dragLabel={`Reorder criterion ${crit.name}`}
                  >
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
                      {crit.description && (
                        <CriterionTooltip
                          description={crit.description}
                          criterionName={crit.name}
                        />
                      )}
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
                          className="rounded-md p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                          aria-label={`Remove criterion ${crit.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <WeightSlider
                      id={crit.id}
                      name={crit.name}
                      value={crit.weight}
                      onChange={(v) => handleWeightChange(crit.id, v)}
                      colorIndex={critIndex}
                      isHighest={crit.id === highestWeightId}
                    />
                    {/* Criterion description toggle + textarea */}
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => toggleDesc(`crit-${crit.id}`)}
                        className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-expanded={expandedDescs.has(`crit-${crit.id}`)}
                        aria-controls={`crit-desc-${crit.id}`}
                      >
                        {expandedDescs.has(`crit-${crit.id}`) ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {crit.description ? "Edit description" : "Add description"}
                      </button>
                      {expandedDescs.has(`crit-${crit.id}`) && (
                        <div className="mt-1" id={`crit-desc-${crit.id}`}>
                          <textarea
                            value={crit.description ?? ""}
                            onChange={(e) =>
                              updateCriterion(crit.id, {
                                description: e.target.value.slice(0, 500),
                              })
                            }
                            className="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            placeholder="Describe what this criterion measures..."
                            rows={2}
                            maxLength={500}
                            aria-label={`Description for criterion ${crit.name}`}
                          />
                          <p className="text-right text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {(crit.description ?? "").length}/500
                          </p>
                        </div>
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
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {/* Weight Distribution Bar */}
        <WeightDistributionBar criteria={decision.criteria} />

        {/* Auto-Normalize Toggle */}
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoNormalize}
            onChange={(e) => setAutoNormalize(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500"
          />
          Auto-normalize weights to 100%
        </label>

        {/* AHP Wizard */}
        {decision.criteria.length >= 2 && (
          <div className="mt-3">
            {showAHP ? (
              <AHPWizard onClose={() => setShowAHP(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setShowAHP(true)}
                className="inline-flex items-center gap-2 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                <Scale className="h-4 w-4" />
                Derive weights with AHP wizard
                <HelpTooltip topic="ahp" />
              </button>
            )}
          </div>
        )}
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

        {/* Mobile: Card-based scoring (< 640px) */}
        <MobileScoreCards
          decision={decision}
          updateScore={updateScore}
          updateConfidence={updateConfidence}
          updateReasoning={updateReasoning}
        />

        {/* Desktop: Table layout (≥ 640px) — CSS containment for paint isolation */}
        <div className="hidden sm:block overflow-x-auto" style={{ contain: "content" }}>
          <table
            ref={gridRef}
            className="min-w-full border-collapse"
            role="grid"
            aria-label="Scores matrix"
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-gray-200 dark:border-gray-700"
                >
                  Option / Criterion
                </th>
                {decision.criteria.map((crit) => (
                  <th
                    key={crit.id}
                    scope="col"
                    className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 py-2 border-b border-gray-200 dark:border-gray-700"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>{crit.name}</span>
                      {crit.description && (
                        <CriterionTooltip
                          description={crit.description}
                          criterionName={crit.name}
                        />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-normal ${crit.type === "cost" ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}
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
                  <th
                    scope="row"
                    className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 text-left"
                  >
                    {opt.name}
                  </th>
                  {decision.criteria.map((crit, colIdx) => {
                    const cellValue = readScore(decision.scores, opt.id, crit.id);
                    const isNull = cellValue === null;
                    const confidence = resolveConfidence(decision.scores[opt.id]?.[crit.id]);
                    const isFocused =
                      focusedCell?.optionId === opt.id && focusedCell?.criterionId === crit.id;
                    const promptId = `scoring-prompt-${opt.id}-${crit.id}`;
                    return (
                      <td
                        key={crit.id}
                        className="px-3 py-2 text-center border-b border-gray-100 dark:border-gray-700"
                      >
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={1}
                            value={isNull ? "" : cellValue}
                            placeholder={isNull ? "?" : undefined}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                updateScore(opt.id, crit.id, null);
                              } else {
                                const v = Number(raw);
                                if (Number.isFinite(v)) {
                                  updateScore(opt.id, crit.id, Math.max(0, Math.min(10, v)));
                                }
                              }
                            }}
                            onFocus={() =>
                              setFocusedCell({ optionId: opt.id, criterionId: crit.id })
                            }
                            onBlur={() => setFocusedCell(null)}
                            onKeyDown={(e) => handleGridKeyDown(e, rowIdx, colIdx)}
                            data-grid-row={rowIdx}
                            data-grid-col={colIdx}
                            className={`w-14 rounded-md px-2 py-1.5 text-sm text-center focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              isNull
                                ? "border-2 border-dashed border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                : "border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            }`}
                            aria-label={`Score for ${opt.name} on ${crit.name}${isNull ? " (not scored)" : ""}`}
                            aria-describedby={
                              isFocused ? `score-range-desc ${promptId}` : "score-range-desc"
                            }
                          />
                          {confidence && (
                            <ConfidenceDot
                              confidence={confidence}
                              onChange={(next) => updateConfidence(opt.id, crit.id, next)}
                            />
                          )}
                          <ReasoningPopover
                            value={decision.reasoning?.[opt.id]?.[crit.id]}
                            onChange={(text) => updateReasoning(opt.id, crit.id, text)}
                            optionName={opt.name}
                            criterionName={crit.name}
                          />
                          <ScoreProvenanceIndicator
                            metadata={getMetadata(decision, opt.id, crit.id)}
                            canRestore={canRestoreEnriched(decision, opt.id, crit.id)}
                            onRestore={() => restoreEnrichedValue(opt.id, crit.id)}
                          />
                          <ConfidenceIndicator metadata={getMetadata(decision, opt.id, crit.id)} />
                        </div>
                        {isFocused && (
                          <ScoringPrompt
                            criterionType={crit.type}
                            promptId={promptId}
                            calibration={focusedCalibration}
                          />
                        )}
                      </td>
                    );
                  })}
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

      {/* Bias Detection Warnings */}
      <BiasWarnings
        warnings={biasDetection.warnings}
        onDismiss={biasDetection.dismiss}
        onDismissAll={biasDetection.dismissAll}
      />
    </div>
  );
});
