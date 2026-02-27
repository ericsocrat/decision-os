/**
 * Outcome tracking — records post-decision results and compares to predictions.
 *
 * Each decision can have at most one `DecisionOutcome` which captures:
 * - which option was chosen
 * - when it was implemented
 * - actual outcome rating (1–10)
 * - notes about the outcome
 * - optional follow-up satisfaction ratings
 *
 * Outcomes are stored in localStorage under a separate key and integrate
 * with the journal module by auto-creating journal entries.
 *
 * @module outcome-tracking
 */

import type { Decision, OptionResult } from "./types";
import { safeJsonParse } from "./utils";
import { addEntry } from "./journal";
import type { JournalEntry } from "./journal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single follow-up check-in */
export interface FollowUp {
  date: string; // ISO 8601
  satisfaction: number; // 1–10
  notes?: string;
}

/** Outcome data for a single decision */
export interface DecisionOutcome {
  decisionId: string;
  chosenOptionId: string;
  chosenOptionName: string;
  decidedAt: string; // ISO 8601 — when the decision was finalized
  implementedAt?: string; // ISO 8601
  outcomeRating?: number; // 1–10
  outcomeNotes?: string;
  followUps: FollowUp[];
  /** Predicted score (WSM total score) for the chosen option at decision time */
  predictedScore?: number;
}

/** Comparison between predicted score and actual outcome */
export interface PredictionComparison {
  chosenOptionName: string;
  predictedScore: number; // normalized 0–10
  actualRating: number; // 1–10
  delta: number; // actual - predicted (positive = better than expected)
  accuracy: number; // 0–1, how close prediction was to actual
}

/** Timeline milestone for visualizing decision lifecycle */
export interface TimelineMilestone {
  date: string;
  label: string;
  type: "decision" | "implementation" | "outcome" | "follow-up";
  detail?: string;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const OUTCOME_STORAGE_KEY = "decision-os:outcomes";

type OutcomeMap = Record<string, DecisionOutcome>;

function loadOutcomes(): OutcomeMap {
  if (globalThis.window === undefined) return {};
  try {
    const raw = localStorage.getItem(OUTCOME_STORAGE_KEY);
    if (!raw) return {};
    return safeJsonParse<OutcomeMap>(raw, {});
  } catch {
    return {};
  }
}

function persistOutcomes(outcomes: OutcomeMap): void {
  if (globalThis.window === undefined) return;
  try {
    localStorage.setItem(OUTCOME_STORAGE_KEY, JSON.stringify(outcomes));
  } catch {
    // quota exceeded or private-browsing — fail silently
  }
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Record which option was chosen for a decision.
 * Creates or overwrites the outcome record and auto-creates a journal entry.
 *
 * @returns The created/updated outcome and the auto-generated journal entry
 */
export function recordChoice(
  decision: Decision,
  chosenOptionId: string,
  predictedScore?: number,
): { outcome: DecisionOutcome; journalEntry: JournalEntry } {
  const option = decision.options.find((o) => o.id === chosenOptionId);
  const optionName = option?.name ?? chosenOptionId;
  const now = new Date().toISOString();

  const outcomes = loadOutcomes();
  const existing = outcomes[decision.id];

  const outcome: DecisionOutcome = {
    decisionId: decision.id,
    chosenOptionId,
    chosenOptionName: optionName,
    decidedAt: now,
    followUps: existing?.followUps ?? [],
    ...(predictedScore === undefined ? {} : { predictedScore }),
    // Preserve existing outcome data if updating the choice
    ...(existing?.implementedAt ? { implementedAt: existing.implementedAt } : {}),
    ...(existing?.outcomeRating === undefined ? {} : { outcomeRating: existing.outcomeRating }),
    ...(existing?.outcomeNotes ? { outcomeNotes: existing.outcomeNotes } : {}),
  };

  outcomes[decision.id] = outcome;
  persistOutcomes(outcomes);

  const journalEntry = addEntry(decision.id, {
    type: "outcome",
    content: `Chose "${optionName}" for this decision.`,
    metadata: { mood: "confident" },
  });

  return { outcome, journalEntry };
}

/**
 * Record the implementation date for a decision outcome.
 */
export function recordImplementation(
  decisionId: string,
  implementedAt: string,
): DecisionOutcome | undefined {
  const outcomes = loadOutcomes();
  const outcome = outcomes[decisionId];
  if (!outcome) return undefined;

  outcome.implementedAt = implementedAt;
  outcomes[decisionId] = outcome;
  persistOutcomes(outcomes);

  addEntry(decisionId, {
    type: "outcome",
    content: `Implemented decision on ${new Date(implementedAt).toLocaleDateString()}.`,
  });

  return outcome;
}

/**
 * Record an outcome rating and optional notes.
 */
export function recordOutcome(
  decisionId: string,
  rating: number,
  notes?: string,
): DecisionOutcome | undefined {
  const outcomes = loadOutcomes();
  const outcome = outcomes[decisionId];
  if (!outcome) return undefined;

  outcome.outcomeRating = Math.max(1, Math.min(10, Math.round(rating)));
  if (notes !== undefined) outcome.outcomeNotes = notes;
  outcomes[decisionId] = outcome;
  persistOutcomes(outcomes);

  addEntry(decisionId, {
    type: "outcome",
    content: `Rated outcome ${outcome.outcomeRating}/10.` + (notes ? ` ${notes}` : ""),
  });

  return outcome;
}

/**
 * Add a follow-up check-in to an existing outcome.
 */
export function addFollowUp(
  decisionId: string,
  satisfaction: number,
  notes?: string,
): DecisionOutcome | undefined {
  const outcomes = loadOutcomes();
  const outcome = outcomes[decisionId];
  if (!outcome) return undefined;

  const followUp: FollowUp = {
    date: new Date().toISOString(),
    satisfaction: Math.max(1, Math.min(10, Math.round(satisfaction))),
    ...(notes ? { notes } : {}),
  };

  outcome.followUps.push(followUp);
  outcomes[decisionId] = outcome;
  persistOutcomes(outcomes);

  addEntry(decisionId, {
    type: "retrospective",
    content: `Follow-up check-in: satisfaction ${followUp.satisfaction}/10.` + (notes ? ` ${notes}` : ""),
  });

  return outcome;
}

/**
 * Get the outcome for a decision (or undefined).
 */
export function getOutcome(decisionId: string): DecisionOutcome | undefined {
  return loadOutcomes()[decisionId];
}

/**
 * Delete the outcome for a decision.
 */
export function deleteOutcome(decisionId: string): boolean {
  const outcomes = loadOutcomes();
  if (!outcomes[decisionId]) return false;
  delete outcomes[decisionId];
  persistOutcomes(outcomes);
  return true;
}

// ---------------------------------------------------------------------------
// Prediction comparison
// ---------------------------------------------------------------------------

/**
 * Compare predicted score to actual outcome rating.
 * Returns undefined if either predicted score or outcome rating is missing.
 */
export function comparePrediction(
  decisionId: string,
): PredictionComparison | undefined {
  const outcome = getOutcome(decisionId);
  if (!outcome) return undefined;
  if (outcome.predictedScore === undefined || outcome.outcomeRating === undefined) {
    return undefined;
  }

  // Normalize predicted score to 0–10 scale (it's already on that scale from WSM)
  const predicted = Math.max(0, Math.min(10, outcome.predictedScore));
  const actual = outcome.outcomeRating;
  const delta = actual - predicted;
  // Accuracy: 1 - (|delta| / 10), clamped to [0, 1]
  const accuracy = Math.max(0, 1 - Math.abs(delta) / 10);

  return {
    chosenOptionName: outcome.chosenOptionName,
    predictedScore: Math.round(predicted * 100) / 100,
    actualRating: actual,
    delta: Math.round(delta * 100) / 100,
    accuracy: Math.round(accuracy * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/**
 * Build a timeline of milestones for a decision's lifecycle.
 */
export function getOutcomeTimeline(
  decisionId: string,
  decision?: Decision,
): TimelineMilestone[] {
  const milestones: TimelineMilestone[] = [];

  // Decision creation
  if (decision) {
    milestones.push({
      date: decision.createdAt,
      label: "Decision Created",
      type: "decision",
      detail: decision.title,
    });
  }

  const outcome = getOutcome(decisionId);
  if (!outcome) return milestones;

  // Choice made
  milestones.push({
    date: outcome.decidedAt,
    label: "Option Chosen",
    type: "decision",
    detail: `Chose "${outcome.chosenOptionName}"`,
  });

  // Implementation
  if (outcome.implementedAt) {
    milestones.push({
      date: outcome.implementedAt,
      label: "Implemented",
      type: "implementation",
    });
  }

  // Outcome recorded
  if (outcome.outcomeRating !== undefined) {
    milestones.push({
      date: outcome.implementedAt ?? outcome.decidedAt,
      label: "Outcome Rated",
      type: "outcome",
      detail: `${outcome.outcomeRating}/10` + (outcome.outcomeNotes ? ` — ${outcome.outcomeNotes}` : ""),
    });
  }

  // Follow-ups
  for (const fu of outcome.followUps) {
    milestones.push({
      date: fu.date,
      label: "Follow-up",
      type: "follow-up",
      detail: `Satisfaction: ${fu.satisfaction}/10` + (fu.notes ? ` — ${fu.notes}` : ""),
    });
  }

  // Sort chronologically
  return milestones.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

/**
 * Find the predicted score for a specific option from decision results.
 * Useful for passing to `recordChoice`.
 */
export function findPredictedScore(
  optionId: string,
  results: OptionResult[],
): number | undefined {
  const match = results.find((r) => r.optionId === optionId);
  return match?.totalScore;
}
