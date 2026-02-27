/**
 * CsvExportMenu — dropdown menu for CSV export options.
 *
 * Renders a button that toggles a dropdown with three choices:
 * - Export Decision Matrix (CSV)
 * - Export Results Summary (CSV)
 * - Export All (both files)
 *
 * Uses Escape and click-outside to dismiss.
 */

"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import type { Decision, DecisionResults } from "@/lib/types";
import type { TopsisResults } from "@/lib/topsis";
import type { RegretResults } from "@/lib/regret";
import {
  exportDecisionMatrixCSV,
  exportResultsSummaryCSV,
  downloadCSV,
  sanitizeFilename,
} from "@/lib/csv-export";

export interface CsvExportMenuProps {
  decision: Decision;
  results: DecisionResults;
  topsisResults: TopsisResults | null;
  regretResults: RegretResults | null;
}

export const CsvExportMenu = memo(function CsvExportMenu({
  decision,
  results,
  topsisResults,
  regretResults,
}: CsvExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const slug = sanitizeFilename(decision.title);

  const handleMatrix = useCallback(() => {
    const csv = exportDecisionMatrixCSV(decision);
    downloadCSV(csv, `${slug}-matrix.csv`);
    setOpen(false);
  }, [decision, slug]);

  const handleResults = useCallback(() => {
    const csv = exportResultsSummaryCSV({
      decision,
      results,
      topsisResults,
      regretResults,
    });
    downloadCSV(csv, `${slug}-results.csv`);
    setOpen(false);
  }, [decision, results, topsisResults, regretResults, slug]);

  const handleAll = useCallback(() => {
    const matrixCsv = exportDecisionMatrixCSV(decision);
    downloadCSV(matrixCsv, `${slug}-matrix.csv`);

    const resultsCsv = exportResultsSummaryCSV({
      decision,
      results,
      topsisResults,
      regretResults,
    });
    // Small delay so browser handles two sequential downloads
    setTimeout(() => {
      downloadCSV(resultsCsv, `${slug}-results.csv`);
    }, 100);
    setOpen(false);
  }, [decision, results, topsisResults, regretResults, slug]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const itemClass =
    "block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        aria-label="Export CSV"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <FileSpreadsheet className="h-4 w-4" />
        <span className="hidden sm:inline">Export CSV</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
        >
          <button
            role="menuitem"
            className={itemClass}
            onClick={handleMatrix}
          >
            Decision Matrix
          </button>
          <button
            role="menuitem"
            className={itemClass}
            onClick={handleResults}
          >
            Results Summary
          </button>
          <button
            role="menuitem"
            className={itemClass}
            onClick={handleAll}
          >
            Export All
          </button>
        </div>
      )}
    </div>
  );
});
