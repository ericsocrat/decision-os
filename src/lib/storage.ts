/**
 * LocalStorage persistence layer for Decision OS.
 *
 * All decisions are stored in localStorage under a single key
 * as a JSON array. This keeps the MVP simple with no backend.
 */

import type { Decision } from "./types";
import { DEMO_DECISION } from "./demo-data";
import { safeJsonParse, generateId } from "./utils";
import { isDecisionArray } from "./validation";

const STORAGE_KEY = "decision-os:decisions";

/**
 * Create a minimal blank decision for first-time users.
 * This lets the EmptyState screen render instead of dumping users into demo data.
 */
function createBlankDecision(): Decision {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: "",
    options: [],
    criteria: [],
    scores: {},
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get all saved decisions from localStorage.
 * New users get a blank decision (shows EmptyState). SSR returns the demo.
 */
export function getDecisions(): Decision[] {
  if (globalThis.window === undefined) return [DEMO_DECISION];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First visit — start with a blank decision so EmptyState shows
      const initial = [createBlankDecision()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = safeJsonParse<unknown>(raw, null);
    if (!isDecisionArray(parsed) || parsed.length === 0) {
      console.warn("[DecisionOS] localStorage data invalid — resetting to blank");
      const initial = [createBlankDecision()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return parsed;
  } catch {
    // localStorage unavailable (private browsing, quota exceeded, etc.)
    return [DEMO_DECISION];
  }
}

/**
 * Get a single decision by ID.
 */
export function getDecision(id: string): Decision | undefined {
  return getDecisions().find((d) => d.id === id);
}

/**
 * Save a decision (create or update).
 */
export function saveDecision(decision: Decision): void {
  if (globalThis.window === undefined) return;

  try {
    const decisions = getDecisions();
    const index = decisions.findIndex((d) => d.id === decision.id);

    const updated = {
      ...decision,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      decisions[index] = updated;
    } else {
      decisions.push(updated);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  } catch {
    // localStorage unavailable or quota exceeded — fail silently
  }
}

/**
 * Delete a decision by ID.
 * Will not delete the last remaining decision.
 */
export function deleteDecision(id: string): boolean {
  if (globalThis.window === undefined) return false;

  try {
    const decisions = getDecisions();
    if (decisions.length <= 1) return false;

    const filtered = decisions.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset all decisions back to demo data only.
 */
export function resetToDemo(): void {
  if (globalThis.window === undefined) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([DEMO_DECISION]));
  } catch {
    // localStorage unavailable — fail silently
  }
}
