/**
 * Import utilities for Decision OS.
 *
 * Supports importing decisions from:
 * - JSON files (full Decision or results export format)
 * - CSV files (option × criterion score matrix)
 *
 * @see https://github.com/ericsocrat/decision-os/issues/11
 */

import type { Criterion, Decision, Option, ScoreMatrix } from "./types";
import { isDecision } from "./validation";
import { generateId } from "./utils";

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
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // Escaped quote
          field += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        row.push(field.trim());
        field = "";
        i++;
      } else if (ch === "\r") {
        // CRLF or standalone CR
        row.push(field.trim());
        field = "";
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
        i++;
        if (i < text.length && text[i] === "\n") i++;
      } else if (ch === "\n") {
        row.push(field.trim());
        field = "";
        if (row.some((cell) => cell !== "")) rows.push(row);
        row = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last field/row
  row.push(field.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);

  return rows;
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
export function importFromJson(content: string): ImportResult {
  const errors: ImportError[] = [];
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
    // Try to give specific field-level errors
    const d = candidate as Record<string, unknown>;

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

    return { success: false, errors, warnings };
  }

  // Generate fresh ID and timestamps
  const now = new Date().toISOString();
  const decision: Decision = {
    ...(candidate as Decision),
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  return { success: true, decision, errors: [], warnings };
}

// ─── CSV Import ────────────────────────────────────────────────────

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
      if (cell === "") {
        scores.push(null); // Will default to 0
      } else {
        const num = Number(cell);
        if (!Number.isFinite(num)) {
          errors.push({
            type: "validation",
            message: `Row ${r + 1}, column ${c + 1} ("${cell}"): not a valid number.`,
            row: r + 1,
            column: c + 1,
          });
          scores.push(null);
        } else if (num < 0 || num > 10) {
          errors.push({
            type: "validation",
            message: `Row ${r + 1}, column ${c + 1}: score ${num} must be between 0 and 10.`,
            row: r + 1,
            column: c + 1,
          });
          scores.push(Math.max(0, Math.min(10, Math.round(num))));
        } else {
          scores.push(Math.round(num));
        }
      }
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
    name,
    weight: weights[i] ?? 50,
    type: criterionTypes[i] ?? "benefit",
  }));

  const options: Option[] = preview.rows.map((row) => ({
    id: generateId(),
    name: row.option,
  }));

  const scores: ScoreMatrix = {};
  preview.rows.forEach((row, ri) => {
    const optionId = options[ri].id;
    scores[optionId] = {};
    row.scores.forEach((score, ci) => {
      const criterionId = criteria[ci]?.id;
      if (criterionId) {
        scores[optionId][criterionId] = score ?? 0;
      }
    });
  });

  return {
    id: generateId(),
    title: title || "Imported Decision",
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}
