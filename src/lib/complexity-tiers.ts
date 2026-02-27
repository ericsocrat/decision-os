/**
 * Progressive complexity tiers for DecisionBuilder.
 *
 * Features are revealed progressively based on user engagement:
 * - Essential: core inputs (options, criteria, weights, scores, weight distribution)
 * - Intermediate: confidence dots, reasoning popovers, bias warnings
 * - Expert: AHP wizard, provenance indicators, scoring prompts, drag-and-drop
 *
 * @see https://github.com/ericsocrat/decision-os/issues/231
 */

import type { Decision } from "./types";
import { readScore } from "./scoring";

/** The three progressive complexity tiers */
export type ComplexityTier = "essential" | "intermediate" | "expert";

/** User-controlled tier preferences persisted to localStorage */
export interface TierPreferences {
  /** Override: show all features regardless of engagement */
  showAllFeatures: boolean;
  /** Whether expert tier has been manually unlocked */
  expertUnlocked: boolean;
}

/** Numeric rank for tier comparison (`TIER_RANK[a] >= TIER_RANK[b]`) */
export const TIER_RANK: Record<ComplexityTier, number> = {
  essential: 0,
  intermediate: 1,
  expert: 2,
} as const;

/** Human-readable labels for each tier */
export const TIER_LABELS: Record<ComplexityTier, string> = {
  essential: "Essential",
  intermediate: "Intermediate",
  expert: "Expert",
};

/** Short descriptions for each tier */
export const TIER_DESCRIPTIONS: Record<ComplexityTier, string> = {
  essential: "Core decision inputs",
  intermediate: "Confidence & reasoning tools",
  expert: "Advanced analysis & reordering",
};

const PREFS_KEY = "decisionos:builder-tier-prefs";

const DEFAULT_PREFERENCES: TierPreferences = {
  showAllFeatures: false,
  expertUnlocked: false,
};

// ---------------------------------------------------------------------------
// Score counting
// ---------------------------------------------------------------------------

/**
 * Count how many score cells are filled (non-null) in the decision.
 */
export function countFilledScores(decision: Decision): number {
  let count = 0;
  for (const opt of decision.options) {
    for (const crit of decision.criteria) {
      if (readScore(decision.scores, opt.id, crit.id) !== null) {
        count++;
      }
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Saved decision count (reads localStorage directly to avoid circular deps)
// ---------------------------------------------------------------------------

const DECISIONS_KEY = "decision-os:decisions";

/**
 * Count saved decisions in localStorage without importing storage.ts.
 */
export function getSavedDecisionCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(DECISIONS_KEY);
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Tier computation
// ---------------------------------------------------------------------------

/**
 * Compute the appropriate complexity tier based on user engagement.
 *
 * Priority order:
 * 1. `showAllFeatures` override → expert
 * 2. `expertUnlocked` flag OR ≥3 saved decisions → expert
 * 3. ≥50% score cells filled → intermediate
 * 4. Default → essential
 */
export function getComplexityTier(
  decision: Decision,
  preferences: TierPreferences,
  savedDecisionCount: number,
): ComplexityTier {
  if (preferences.showAllFeatures) return "expert";

  if (preferences.expertUnlocked || savedDecisionCount >= 3) return "expert";

  const totalCells = decision.options.length * decision.criteria.length;
  const filledCells = countFilledScores(decision);
  const fillRatio = totalCells > 0 ? filledCells / totalCells : 0;

  if (fillRatio >= 0.5) return "intermediate";
  return "essential";
}

/**
 * Check whether the current tier meets a minimum tier requirement.
 */
export function isTierVisible(
  currentTier: ComplexityTier,
  minTier: ComplexityTier,
): boolean {
  return TIER_RANK[currentTier] >= TIER_RANK[minTier];
}

// ---------------------------------------------------------------------------
// Preference persistence
// ---------------------------------------------------------------------------

/**
 * Load tier preferences from localStorage.
 */
export function loadTierPreferences(): TierPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFERENCES;
    const obj = parsed as Record<string, unknown>;
    return {
      showAllFeatures: obj.showAllFeatures === true,
      expertUnlocked: obj.expertUnlocked === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Save tier preferences to localStorage.
 */
export function saveTierPreferences(prefs: TierPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable — fail silently
  }
}
