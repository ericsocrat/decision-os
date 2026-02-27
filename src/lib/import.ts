/**
 * Import utilities for Decision OS.
 *
 * Supports importing decisions from:
 * - JSON files (full Decision or results export format)
 * - CSV files (option × criterion score matrix)
 *
 * @see https://github.com/ericsocrat/decision-os/issues/11
 */

import type { Criterion, Decision, Option, ScoreMatrix, ScoreValue } from "./types";
import { isDecision } from "./validation";
import { generateId } from "./utils";
import { sanitizeText, sanitizeMultilineText } from "./sanitize";

// ─── Types ─────────────────────────────────────────────────────────

export interface ImportError {
  type: "schema" | "validation" | "format" | "size";
  message: string;
  field?: string;
  row?: number;
  column?: number;
}

export interface ImportWarning {
  message: string;
  field?: string;
}

export interface ImportResult {
  success: boolean;
  decision?: Decision;
  errors: ImportError[];
  warnings: ImportWarning[];
}

/** Parsed CSV data before user confirmation */
export interface CsvPreviewData {
  headers: string[]; // criterion names (excluding first column)
  rows: { option: string; scores: (number | null)[] }[];
  raw: string[][];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Maximum file size in bytes (1 MB) */
export const MAX_FILE_SIZE = 1_048_576;

/** Supported file extensions */
export const SUPPORTED_EXTENSIONS = [".json", ".csv"];

// ─── CSV Parser ────────────────────────────────────────────────────

/**
 * Lightweight CSV parser that handles:
 * - Quoted fields with commas: "New York, NY"
 * - Escaped quotes: "He said ""hello"""
 * - CRLF and LF line endings
 * - Empty fields
 *
 * No external dependencies (~40 lines).
 */
/** Mutable state for the CSV parser. */
interface CsvParserState {
  rows: string[][];
  row: string[];
  field: string;
  inQuotes: boolean;
  i: number;
}

/** Handle a character inside a quoted field. */
function handleQuotedChar(state: CsvParserState, text: string): void {
  const ch = text[state.i];
  if (ch === '"') {
    if (state.i + 1 < text.length && text[state.i + 1] === '"') {
      state.field += '"';
      state.i += 2;
    } else {
      state.inQuotes = false;
      state.i++;
    }
  } else {
    state.field += ch;
    state.i++;
  }
}

/** Finish the current row and push it if non-empty. */
function finishCsvRow(state: CsvParserState): void {
  state.row.push(state.field.trim());
  state.field = "";
  if (state.row.some((cell) => cell !== "")) state.rows.push(state.row);
  state.row = [];
}

/** Handle a character outside a quoted field. */
function handleUnquotedChar(state: CsvParserState, text: string): void {
  const ch = text[state.i];
  if (ch === '"') {
    state.inQuotes = true;
    state.i++;
  } else if (ch === ",") {
    state.row.push(state.field.trim());
    state.field = "";
    state.i++;
  } else if (ch === "\r") {
    finishCsvRow(state);
    state.i++;
    if (state.i < text.length && text[state.i] === "\n") state.i++;
  } else if (ch === "\n") {
    finishCsvRow(state);
    state.i++;
  } else {
    state.field += ch;
    state.i++;
  }
}

export function parseCsv(text: string): string[][] {
  const state: CsvParserState = { rows: [], row: [], field: "", inQuotes: false, i: 0 };

  while (state.i < text.length) {
    if (state.inQuotes) {
      handleQuotedChar(state, text);
    } else {
      handleUnquotedChar(state, text);
    }
  }

  // Last field/row
  finishCsvRow(state);

  return state.rows;
}

// ─── JSON Import ───────────────────────────────────────────────────

/**
 * Import a decision from a JSON string.
 *
 * Handles two formats:
 * 1. Full Decision object (with id, createdAt, etc.)
 * 2. Results export object (with `decision` key from ResultsView export)
 *
 * Always generates new id and createdAt to avoid overwriting existing decisions.
 */
/** Collect field-level validation errors for a non-Decision object. */
function collectDecisionFieldErrors(d: Record<string, unknown>): ImportError[] {
  const errors: ImportError[] = [];

  if (typeof d.title !== "string" || !d.title) {
    errors.push({ type: "schema", message: 'Missing or invalid "title" field.', field: "title" });
  }
  if (!Array.isArray(d.options)) {
    errors.push({
      type: "schema",
      message: 'Missing or invalid "options" array.',
      field: "options",
    });
  } else if (d.options.length < 1) {
    errors.push({
      type: "validation",
      message: "At least 1 option is required.",
      field: "options",
    });
  }
  if (!Array.isArray(d.criteria)) {
    errors.push({
      type: "schema",
      message: 'Missing or invalid "criteria" array.',
      field: "criteria",
    });
  } else if (d.criteria.length < 1) {
    errors.push({
      type: "validation",
      message: "At least 1 criterion is required.",
      field: "criteria",
    });
  }
  if (typeof d.scores !== "object" || d.scores === null) {
    errors.push({
      type: "schema",
      message: 'Missing or invalid "scores" object.',
      field: "scores",
    });
  }

  if (errors.length === 0) {
    errors.push({ type: "schema", message: "JSON does not match the Decision schema." });
  }

  return errors;
}

export function importFromJson(content: string): ImportResult {
  const warnings: ImportWarning[] = [];

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      success: false,
      errors: [{ type: "format", message: "Invalid JSON: file could not be parsed." }],
      warnings: [],
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      success: false,
      errors: [{ type: "format", message: "JSON must be an object." }],
      warnings: [],
    };
  }

  const obj = parsed as Record<string, unknown>;

  // Check for results export format (has "decision" key)
  let candidate: unknown = obj;
  if ("decision" in obj && typeof obj.decision === "object" && obj.decision !== null) {
    candidate = obj.decision;
    warnings.push({ message: "Detected results export format — extracting decision data." });
  }

  // Validate as Decision
  if (!isDecision(candidate)) {
    const errors = collectDecisionFieldErrors(candidate as Record<string, unknown>);
    return { success: false, errors, warnings };
  }

  // Generate fresh ID and timestamps, sanitize text fields
  const now = new Date().toISOString();
  const decision: Decision = {
    ...candidate,
    id: generateId(),
    title: sanitizeText(candidate.title, 100),
    description: candidate.description
      ? sanitizeMultilineText(candidate.description, 500)
      : undefined,
    options: candidate.options.map((o) => ({
      ...o,
      id: o.id,
      name: sanitizeText(o.name, 80),
    })),
    criteria: candidate.criteria.map((c) => ({
      ...c,
      id: c.id,
      name: sanitizeText(c.name, 80),
    })),
    createdAt: now,
    updatedAt: now,
  };

  return { success: true, decision, errors: [], warnings };
}

// ─── CSV Import ────────────────────────────────────────────────────

/** Parse a single score cell, returning the value and any errors/warnings. */
function parseCsvScoreCell(
  cell: string,
  row: number,
  column: number
): { value: number | null; error?: ImportError } {
  if (cell === "") return { value: null };

  const num = Number(cell);
  if (!Number.isFinite(num)) {
    return {
      value: null,
      error: {
        type: "validation",
        message: `Row ${row}, column ${column} ("${cell}"): not a valid number.`,
        row,
        column,
      },
    };
  }
  if (num < 0 || num > 10) {
    return {
      value: Math.max(0, Math.min(10, Math.round(num))),
      error: {
        type: "validation",
        message: `Row ${row}, column ${column}: score ${num} must be between 0 and 10.`,
        row,
        column,
      },
    };
  }
  return { value: Math.round(num) };
}

/**
 * Parse CSV text into a preview data structure.
 * Does NOT create a Decision — the user must confirm via CsvPreview first.
 */
export function parseCsvPreview(content: string): { data?: CsvPreviewData; errors: ImportError[] } {
  const errors: ImportError[] = [];
  const rows = parseCsv(content);

  if (rows.length < 2) {
    return {
      errors: [
        {
          type: "format",
          message: "CSV must have a header row and at least one data row.",
        },
      ],
    };
  }

  const headerRow = rows[0];
  if (headerRow.length < 2) {
    return {
      errors: [
        {
          type: "format",
          message: "CSV header must have at least 2 columns (Option + at least 1 criterion).",
        },
      ],
    };
  }

  const headers = headerRow.slice(1); // criterion names
  const dataRows: CsvPreviewData["rows"] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const option = row[0] || "";

    if (!option) {
      errors.push({
        type: "validation",
        message: `Row ${r + 1}: option name is empty.`,
        row: r + 1,
        column: 1,
      });
    }

    // Check for mismatched column count
    if (row.length !== headerRow.length) {
      errors.push({
        type: "format",
        message: `Row ${r + 1} has ${row.length} columns but header has ${headerRow.length}.`,
        row: r + 1,
      });
    }

    const scores: (number | null)[] = [];
    for (let c = 1; c < headerRow.length; c++) {
      const cell = row[c] ?? "";
      const result = parseCsvScoreCell(cell, r + 1, c + 1);
      if (result.error) errors.push(result.error);
      scores.push(result.value);
    }

    dataRows.push({ option, scores });
  }

  return {
    data: { headers, rows: dataRows, raw: rows },
    errors,
  };
}

/**
 * Convert confirmed CSV preview data into a Decision.
 *
 * @param preview - The parsed CSV data
 * @param title - Decision title provided by user
 * @param criterionTypes - Array of "benefit" | "cost" for each criterion
 * @param weights - Array of weights (0–100) for each criterion
 */
export function csvToDecision(
  preview: CsvPreviewData,
  title: string,
  criterionTypes: ("benefit" | "cost")[],
  weights: number[]
): Decision {
  const now = new Date().toISOString();

  const criteria: Criterion[] = preview.headers.map((name, i) => ({
    id: generateId(),
    name: sanitizeText(name, 80),
    weight: weights[i] ?? 50,
    type: criterionTypes[i] ?? "benefit",
  }));

  const options: Option[] = preview.rows.map((row) => ({
    id: generateId(),
    name: sanitizeText(row.option, 80),
  }));

  const scores: ScoreMatrix = {};
  preview.rows.forEach((row, ri) => {
    const optionId = options[ri].id;
    scores[optionId] = {};
    row.scores.forEach((score, ci) => {
      const criterionId = criteria[ci]?.id;
      if (criterionId) {
        // Preserve null from CSV empty cells
        scores[optionId][criterionId] = score as ScoreValue;
      }
    });
  });

  return {
    id: generateId(),
    title: sanitizeText(title, 100) || "Imported Decision",
    options,
    criteria,
    scores,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── File Handler ──────────────────────────────────────────────────

/**
 * Validate a File object before processing.
 * Returns errors for wrong type, empty, or oversized files.
 */
export function validateFile(file: File): ImportError[] {
  const errors: ImportError[] = [];
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    errors.push({
      type: "format",
      message: "Only .json and .csv files are supported.",
    });
  }

  if (file.size === 0) {
    errors.push({ type: "format", message: "File is empty." });
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push({ type: "size", message: "File exceeds 1 MB limit." });
  }

  return errors;
}

/**
 * Read a File and return its text content.
 */
export function readFileAsText(file: File): Promise<string> {
  return file.text();
}
