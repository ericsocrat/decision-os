/**
 * Import Modal component — file picker, JSON import, CSV preview.
 *
 * Supports:
 * - File picker for .json and .csv files
 * - Drag-and-drop onto the modal
 * - JSON import with instant validation
 * - CSV import with preview step (set title, weights, benefit/cost types)
 *
 * @see https://github.com/ericsocrat/decision-os/issues/11
 */

"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, FileJson, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import type { CsvPreviewData, ImportError } from "@/lib/import";
import {
  importFromJson,
  parseCsvPreview,
  csvToDecision,
  validateFile,
  readFileAsText,
  SUPPORTED_EXTENSIONS,
} from "@/lib/import";
import { saveDecision } from "@/lib/storage";
import { useActions } from "./DecisionProvider";
import { showToast } from "./Toast";

interface ImportModalProps {
  onClose: () => void;
}

export const ImportModal = memo(function ImportModal({ onClose }: ImportModalProps) {
  const { loadDecision } = useActions();
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | null>(null);
  const [csvTitle, setCsvTitle] = useState("Imported Decision");
  const [criterionTypes, setCriterionTypes] = useState<("benefit" | "cost")[]>([]);
  const [weights, setWeights] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);
  const triggerRef = useRef<Element | null>(null);

  // Focus trap & Escape key
  useEffect(() => {
    triggerRef.current = document.activeElement;
    const modal = modalRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && modal) {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    modal?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the element that opened the modal
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [onClose]);

  const processFile = useCallback(
    async (file: File) => {
      setErrors([]);
      setCsvPreview(null);

      // Validate file
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        setErrors(fileErrors);
        return;
      }

      const content = await readFileAsText(file);
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

      if (ext === ".json") {
        const result = importFromJson(content);
        if (result.success && result.decision) {
          saveDecision(result.decision);
          loadDecision(result.decision.id);
          showToast({ text: `Imported "${result.decision.title}" successfully!` });
          if (result.warnings.length > 0) {
            showToast({ text: result.warnings[0].message, duration: 5000 });
          }
          onClose();
        } else {
          setErrors(result.errors);
        }
      } else if (ext === ".csv") {
        const parsed = parseCsvPreview(content);
        if (parsed.errors.length > 0 && !parsed.data) {
          setErrors(parsed.errors);
        } else if (parsed.data) {
          setCsvPreview(parsed.data);
          setCsvTitle("Imported Decision");
          setCriterionTypes(parsed.data.headers.map(() => "benefit"));
          setWeights(parsed.data.headers.map(() => 50));
          if (parsed.errors.length > 0) {
            setErrors(parsed.errors);
          }
        }
      }
    },
    [loadDecision, onClose]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleCsvConfirm = useCallback(() => {
    if (!csvPreview) return;
    const decision = csvToDecision(csvPreview, csvTitle, criterionTypes, weights);
    saveDecision(decision);
    loadDecision(decision.id);
    showToast({ text: `Imported "${decision.title}" from CSV!` });
    onClose();
  }, [csvPreview, csvTitle, criterionTypes, weights, loadDecision, onClose]);

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Import decision"
    >
      <div
        ref={modalRef}
        className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-800"
        tabIndex={-1}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Import Decision
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close import dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* File picker / Drop zone (only show when no CSV preview) */}
          {!csvPreview && (
            <div
              className={`relative flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {isDragging ? (
                <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                  Drop file to import
                </p>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Choose a file
                      </button>{" "}
                      or drag and drop
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      JSON or CSV up to 1 MB
                    </p>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileJson className="h-4 w-4" /> .json
                    </span>
                    <span className="flex items-center gap-1">
                      <FileSpreadsheet className="h-4 w-4" /> .csv
                    </span>
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={SUPPORTED_EXTENSIONS.join(",")}
                onChange={handleFileChange}
                aria-label="Choose file to import"
              />
            </div>
          )}

          {/* Error display */}
          {errors.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                    {errors.length === 1 ? "Import Error" : `${errors.length} Import Errors`}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-400">
                    {errors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* CSV Preview Step */}
          {csvPreview && (
            <CsvPreview
              preview={csvPreview}
              title={csvTitle}
              onTitleChange={setCsvTitle}
              criterionTypes={criterionTypes}
              onCriterionTypesChange={setCriterionTypes}
              weights={weights}
              onWeightsChange={setWeights}
              onConfirm={handleCsvConfirm}
              onCancel={() => {
                setCsvPreview(null);
                setErrors([]);
              }}
            />
          )}

          {/* Format hints */}
          {!csvPreview && errors.length === 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Supported formats
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <FileJson className="h-4 w-4 text-blue-500" /> JSON
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Full decision export or results export from Decision OS.
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <FileSpreadsheet className="h-4 w-4 text-green-500" /> CSV
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Options as rows, criteria as columns. First row = headers.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── CSV Preview Sub-component ─────────────────────────────────────

interface CsvPreviewProps {
  preview: CsvPreviewData;
  title: string;
  onTitleChange: (title: string) => void;
  criterionTypes: ("benefit" | "cost")[];
  onCriterionTypesChange: (types: ("benefit" | "cost")[]) => void;
  weights: number[];
  onWeightsChange: (w: number[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function CsvPreview({
  preview,
  title,
  onTitleChange,
  criterionTypes,
  onCriterionTypesChange,
  weights,
  onWeightsChange,
  onConfirm,
  onCancel,
}: CsvPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Decision title */}
      <div>
        <label
          htmlFor="csv-import-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Decision Title
        </label>
        <input
          id="csv-import-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          placeholder="Enter decision title"
        />
      </div>

      {/* Preview table */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Preview ({preview.rows.length} options × {preview.headers.length} criteria)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                  Option
                </th>
                {preview.headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {preview.rows.map((row, ri) => (
                <tr key={ri}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                    {row.option}
                  </td>
                  {row.scores.map((s, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 ${s === null ? "text-gray-400 italic" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      {s === null ? "0" : s}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Criterion configuration */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Criterion Settings
        </h3>
        <div className="space-y-2">
          {preview.headers.map((header, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
            >
              <span className="min-w-[100px] text-sm font-medium text-gray-900 dark:text-gray-100">
                {header}
              </span>
              <select
                value={criterionTypes[i]}
                onChange={(e) => {
                  const next = [...criterionTypes];
                  next[i] = e.target.value as "benefit" | "cost";
                  onCriterionTypesChange(next);
                }}
                className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                aria-label={`Type for ${header}`}
              >
                <option value="benefit">Benefit (higher = better)</option>
                <option value="cost">Cost (lower = better)</option>
              </select>
              <div className="flex items-center gap-1">
                <label htmlFor={`weight-${i}`} className="text-xs text-gray-500 dark:text-gray-400">
                  Weight:
                </label>
                <input
                  id={`weight-${i}`}
                  type="number"
                  min={0}
                  max={100}
                  value={weights[i]}
                  onChange={(e) => {
                    const next = [...weights];
                    next[i] = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                    onWeightsChange(next);
                  }}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Check className="h-4 w-4" />
          Confirm Import
        </button>
      </div>
    </div>
  );
}
