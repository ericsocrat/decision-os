/**
 * CSV export utilities for Decision OS.
 *
 * Generates well-formed CSV files for the decision matrix and results summary.
 * Files include a UTF-8 BOM for Excel compatibility and properly escape
 * fields containing commas, double-quotes, or newlines per RFC 4180.
 */

import type { Decision } from "./types";
import type { DecisionResults } from "./types";
import type { TopsisResults } from "@/lib/topsis";
import type { RegretResults } from "@/lib/regret";
import { resolveScoreValue } from "./scoring";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** UTF-8 BOM for Excel auto-detection */
const BOM = "\uFEFF";

/** Escape a CSV field per RFC 4180 */
export function escapeCSVField(field: string): string {
  if (/[,"\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/** Build a CSV string from rows of fields */
function rowsToCSV(rows: string[][]): string {
  return (
    BOM +
    rows.map((row) => row.map(escapeCSVField).join(",")).join("\r\n") +
    "\r\n"
  );
}

/**
 * Sanitize a decision title for use as a filename.
 * Replaces non-alphanumeric characters (except hyphens) with hyphens,
 * collapses consecutive hyphens, and trims to 50 characters.
 */
export function sanitizeFilename(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Decision Matrix CSV
// ---------------------------------------------------------------------------

/**
 * Generate a CSV representation of the decision scoring matrix.
 *
 * Columns: Option | Criterion1 (weight%) | Criterion2 (weight%) | ...
 * Rows: one per option with raw scores.
 */
export function exportDecisionMatrixCSV(decision: Decision): string {
  const { options, criteria, scores } = decision;
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;

  // Header row
  const header = [
    "Option",
    ...criteria.map((c) => {
      const pct = Math.round((c.weight / totalWeight) * 100);
      const suffix = c.type === "cost" ? " (cost)" : "";
      return `${c.name} (${pct}%)${suffix}`;
    }),
  ];

  // Data rows
  const dataRows = options.map((opt) => [
    opt.name,
    ...criteria.map((c) => {
      const raw = resolveScoreValue(scores[opt.id]?.[c.id]);
      return raw === null ? "0" : String(raw);
    }),
  ]);

  // Comment row for zero-score note
  const commentRow = [
    "# Scores of 0 may indicate unfilled values",
    ...criteria.map(() => ""),
  ];

  return rowsToCSV([commentRow, header, ...dataRows]);
}

// ---------------------------------------------------------------------------
// Results Summary CSV
// ---------------------------------------------------------------------------

interface ExportResultsInput {
  decision: Decision;
  results: DecisionResults;
  topsisResults: TopsisResults | null;
  regretResults: RegretResults | null;
}

/**
 * Generate a CSV of the results summary.
 *
 * Columns: Rank | Option | WSM Score | TOPSIS Closeness | Max Regret | Consensus Rank
 * Rows: one per option sorted by WSM rank.
 */
export function exportResultsSummaryCSV({
  decision,
  results,
  topsisResults,
  regretResults,
}: ExportResultsInput): string {
  const sorted = [...results.optionResults].sort(
    (a, b) => a.rank - b.rank,
  );

  // Build header dynamically based on available results
  const header = ["Rank", "Option", "WSM Score"];
  if (topsisResults) header.push("TOPSIS Closeness");
  if (regretResults) header.push("Max Regret");
  header.push("Consensus Rank");

  // Build a lookup for TOPSIS/Regret by optionId
  const topsisMap = new Map(
    topsisResults?.rankings.map((r) => [r.optionId, r]) ?? [],
  );
  const regretMap = new Map(
    regretResults?.rankings.map((r) => [r.optionId, r]) ?? [],
  );

  // For consensus rank, use simple average of available ranks
  const consensusRank = (optId: string, wsmRank: number): number => {
    const ranks = [wsmRank];
    const t = topsisMap.get(optId);
    if (t) ranks.push(t.rank);
    const r = regretMap.get(optId);
    if (r) ranks.push(r.rank);
    return Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length);
  };

  const dataRows = sorted.map((opt) => {
    const row = [
      String(opt.rank),
      decision.options.find((o) => o.id === opt.optionId)?.name ?? opt.optionName,
      opt.totalScore.toFixed(2),
    ];
    if (topsisResults) {
      const t = topsisMap.get(opt.optionId);
      row.push(t ? t.closenessCoefficient.toFixed(2) : "N/A");
    }
    if (regretResults) {
      const r = regretMap.get(opt.optionId);
      row.push(r ? r.maxRegret.toFixed(2) : "N/A");
    }
    row.push(String(consensusRank(opt.optionId, opt.rank)));
    return row;
  });

  return rowsToCSV([header, ...dataRows]);
}

// ---------------------------------------------------------------------------
// Download trigger
// ---------------------------------------------------------------------------

/**
 * Trigger a browser download for a CSV string.
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
