/**
 * Validation utilities for Decision OS.
 *
 * All user input goes through these validators before being saved.
 * Returns structured error messages for UI display.
 * Also includes runtime type guards for localStorage/URL data integrity.
 */

import type { Criterion, Decision, Option, ScoreMatrix } from "./types";
import { MAX_SCORE, resolveScoreValue } from "./scoring";

export interface ValidationError {
  field: string;
  message: string;
}

// ─── Runtime Type Guards ───────────────────────────────────────────

/**
 * Runtime type guard: checks if a value is a valid Option.
 */
export function isOption(data: unknown): data is Option {
  if (typeof data !== "object" || data === null) return false;
  const o = data as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string";
}

/**
 * Runtime type guard: checks if a value is a valid Criterion.
 */
export function isCriterion(data: unknown): data is Criterion {
  if (typeof data !== "object" || data === null) return false;
  const c = data as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    typeof c.weight === "number" &&
    c.weight >= 0 &&
    (c.type === "benefit" || c.type === "cost")
  );
}

/**
 * Runtime type guard: checks if a value is a valid Decision.
 */
export function isDecision(data: unknown): data is Decision {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.title === "string" &&
    Array.isArray(d.options) &&
    d.options.every(isOption) &&
    Array.isArray(d.criteria) &&
    d.criteria.every(isCriterion) &&
    typeof d.scores === "object" &&
    d.scores !== null &&
    typeof d.createdAt === "string" &&
    typeof d.updatedAt === "string"
  );
}

/**
 * Runtime type guard: checks if a value is a valid Decision array.
 */
export function isDecisionArray(data: unknown): data is Decision[] {
  return Array.isArray(data) && data.every(isDecision);
}

// ─── Field-Level Validators ────────────────────────────────────────

/**
 * Validate an entire decision. Returns an array of errors (empty = valid).
 */
export function validateDecision(decision: Decision): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title
  if (!decision.title.trim()) {
    errors.push({ field: "title", message: "Decision title is required." });
  }

  // Options
  if (decision.options.length < 2) {
    errors.push({
      field: "options",
      message: "At least 2 options are required.",
    });
  }

  decision.options.forEach((opt, i) => {
    const optErrors = validateOption(opt);
    optErrors.forEach((e) => {
      errors.push({ field: `options[${i}].${e.field}`, message: e.message });
    });
  });

  // Check for duplicate option names
  const optionNames = new Set<string>();
  decision.options.forEach((opt, i) => {
    const name = opt.name.trim().toLowerCase();
    if (optionNames.has(name)) {
      errors.push({
        field: `options[${i}].name`,
        message: `Duplicate option name: "${opt.name}".`,
      });
    }
    optionNames.add(name);
  });

  // Criteria
  if (decision.criteria.length < 1) {
    errors.push({
      field: "criteria",
      message: "At least 1 criterion is required.",
    });
  }

  decision.criteria.forEach((crit, i) => {
    const critErrors = validateCriterion(crit);
    critErrors.forEach((e) => {
      errors.push({ field: `criteria[${i}].${e.field}`, message: e.message });
    });
  });

  // Scores
  const scoreErrors = validateScores(decision.scores, decision.options, decision.criteria);
  errors.push(...scoreErrors);

  return errors;
}

/**
 * Validate a single option.
 */
export function validateOption(option: Option): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!option.name.trim()) {
    errors.push({ field: "name", message: "Option name is required." });
  }
  return errors;
}

/**
 * Validate a single criterion.
 */
export function validateCriterion(criterion: Criterion): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!criterion.name.trim()) {
    errors.push({ field: "name", message: "Criterion name is required." });
  }

  if (!Number.isFinite(criterion.weight) || criterion.weight < 0 || criterion.weight > 100) {
    errors.push({
      field: "weight",
      message: "Weight must be between 0 and 100.",
    });
  }

  if (criterion.type !== "benefit" && criterion.type !== "cost") {
    errors.push({
      field: "type",
      message: 'Type must be "benefit" or "cost".',
    });
  }

  return errors;
}

/**
 * Validate the scores matrix.
 * Ensures all scored values are numbers between 0 and MAX_SCORE.
 * `null` values are valid (not yet scored).
 */
export function validateScores(
  scores: ScoreMatrix,
  options: Option[],
  criteria: Criterion[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const option of options) {
    for (const criterion of criteria) {
      const raw = scores[option.id]?.[criterion.id];
      if (raw === null || raw === undefined) continue; // null = unscored, valid
      const value = resolveScoreValue(raw);
      if (value !== null && (!Number.isFinite(value) || value < 0 || value > MAX_SCORE)) {
        errors.push({
          field: `scores.${option.id}.${criterion.id}`,
          message: `Score for "${option.name}" on "${criterion.name}" must be 0–${MAX_SCORE}.`,
        });
      }
    }
  }

  return errors;
}
