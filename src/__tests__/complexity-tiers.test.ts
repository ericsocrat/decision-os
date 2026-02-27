/**
 * Tests for progressive complexity tiers.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/231
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  countFilledScores,
  getComplexityTier,
  getSavedDecisionCount,
  isTierVisible,
  loadTierPreferences,
  saveTierPreferences,
  TIER_LABELS,
  TIER_RANK,
  TIER_DESCRIPTIONS,
  type TierPreferences,
} from "@/lib/complexity-tiers";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helper: create a minimal Decision for testing
// ---------------------------------------------------------------------------

function makeDecision(overrides?: Partial<Decision>): Decision {
  return {
    id: "test-1",
    title: "Test",
    options: [
      { id: "opt-a", name: "A" },
      { id: "opt-b", name: "B" },
    ],
    criteria: [
      { id: "crit-1", name: "C1", weight: 50, type: "benefit" },
      { id: "crit-2", name: "C2", weight: 50, type: "cost" },
    ],
    scores: {},
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const DEFAULT_PREFS: TierPreferences = { showAllFeatures: false, expertUnlocked: false };

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// countFilledScores
// ---------------------------------------------------------------------------

describe("countFilledScores", () => {
  it("returns 0 for empty score matrix", () => {
    expect(countFilledScores(makeDecision())).toBe(0);
  });

  it("counts non-null cells", () => {
    const d = makeDecision({
      scores: {
        "opt-a": { "crit-1": 5, "crit-2": null },
        "opt-b": { "crit-1": 7, "crit-2": 3 },
      },
    });
    expect(countFilledScores(d)).toBe(3);
  });

  it("counts ScoredCell objects", () => {
    const d = makeDecision({
      scores: {
        "opt-a": { "crit-1": { value: 5, confidence: "high" }, "crit-2": null },
        "opt-b": { "crit-1": null, "crit-2": null },
      },
    });
    expect(countFilledScores(d)).toBe(1);
  });

  it("handles no options or criteria", () => {
    const d = makeDecision({ options: [], criteria: [] });
    expect(countFilledScores(d)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getComplexityTier
// ---------------------------------------------------------------------------

describe("getComplexityTier", () => {
  it("returns essential with empty scores and default prefs", () => {
    expect(getComplexityTier(makeDecision(), DEFAULT_PREFS, 0)).toBe("essential");
  });

  it("returns intermediate when ≥50% scores filled", () => {
    const d = makeDecision({
      scores: {
        "opt-a": { "crit-1": 5, "crit-2": 3 },
        "opt-b": { "crit-1": null, "crit-2": null },
      },
    });
    // 2 filled / 4 total = 50%
    expect(getComplexityTier(d, DEFAULT_PREFS, 0)).toBe("intermediate");
  });

  it("returns essential when <50% scores filled", () => {
    const d = makeDecision({
      scores: {
        "opt-a": { "crit-1": 5, "crit-2": null },
        "opt-b": { "crit-1": null, "crit-2": null },
      },
    });
    // 1 filled / 4 total = 25%
    expect(getComplexityTier(d, DEFAULT_PREFS, 0)).toBe("essential");
  });

  it("returns expert when showAllFeatures is true", () => {
    expect(
      getComplexityTier(makeDecision(), { showAllFeatures: true, expertUnlocked: false }, 0),
    ).toBe("expert");
  });

  it("returns expert when expertUnlocked is true", () => {
    expect(
      getComplexityTier(makeDecision(), { showAllFeatures: false, expertUnlocked: true }, 0),
    ).toBe("expert");
  });

  it("returns expert when savedDecisionCount ≥ 3", () => {
    expect(getComplexityTier(makeDecision(), DEFAULT_PREFS, 3)).toBe("expert");
    expect(getComplexityTier(makeDecision(), DEFAULT_PREFS, 5)).toBe("expert");
  });

  it("showAllFeatures overrides fill ratio (even 0%)", () => {
    expect(
      getComplexityTier(makeDecision(), { showAllFeatures: true, expertUnlocked: false }, 0),
    ).toBe("expert");
  });

  it("handles zero total cells (no options or criteria)", () => {
    const d = makeDecision({ options: [], criteria: [] });
    expect(getComplexityTier(d, DEFAULT_PREFS, 0)).toBe("essential");
  });

  it("returns expert when exactly at 3 saved decisions threshold", () => {
    expect(getComplexityTier(makeDecision(), DEFAULT_PREFS, 3)).toBe("expert");
  });

  it("returns intermediate at exactly 50% fill", () => {
    const d = makeDecision({
      scores: {
        "opt-a": { "crit-1": 5, "crit-2": null },
        "opt-b": { "crit-1": 7, "crit-2": null },
      },
    });
    // 2/4 = 50%
    expect(getComplexityTier(d, DEFAULT_PREFS, 0)).toBe("intermediate");
  });
});

// ---------------------------------------------------------------------------
// isTierVisible
// ---------------------------------------------------------------------------

describe("isTierVisible", () => {
  it("essential meets essential", () => {
    expect(isTierVisible("essential", "essential")).toBe(true);
  });

  it("essential does not meet intermediate", () => {
    expect(isTierVisible("essential", "intermediate")).toBe(false);
  });

  it("intermediate meets intermediate", () => {
    expect(isTierVisible("intermediate", "intermediate")).toBe(true);
  });

  it("expert meets all tiers", () => {
    expect(isTierVisible("expert", "essential")).toBe(true);
    expect(isTierVisible("expert", "intermediate")).toBe(true);
    expect(isTierVisible("expert", "expert")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getSavedDecisionCount
// ---------------------------------------------------------------------------

describe("getSavedDecisionCount", () => {
  it("returns 0 when localStorage is empty", () => {
    expect(getSavedDecisionCount()).toBe(0);
  });

  it("counts decisions from localStorage", () => {
    localStorage.setItem("decision-os:decisions", JSON.stringify([{ id: "1" }, { id: "2" }]));
    expect(getSavedDecisionCount()).toBe(2);
  });

  it("returns 0 for invalid JSON", () => {
    localStorage.setItem("decision-os:decisions", "NOT JSON");
    expect(getSavedDecisionCount()).toBe(0);
  });

  it("returns 0 for non-array JSON", () => {
    localStorage.setItem("decision-os:decisions", JSON.stringify({ id: "1" }));
    expect(getSavedDecisionCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Preference persistence
// ---------------------------------------------------------------------------

describe("loadTierPreferences", () => {
  it("returns defaults when nothing stored", () => {
    expect(loadTierPreferences()).toEqual({ showAllFeatures: false, expertUnlocked: false });
  });

  it("loads saved preferences", () => {
    localStorage.setItem(
      "decisionos:builder-tier-prefs",
      JSON.stringify({ showAllFeatures: true, expertUnlocked: true }),
    );
    expect(loadTierPreferences()).toEqual({ showAllFeatures: true, expertUnlocked: true });
  });

  it("defaults to false for missing fields", () => {
    localStorage.setItem("decisionos:builder-tier-prefs", JSON.stringify({}));
    expect(loadTierPreferences()).toEqual({ showAllFeatures: false, expertUnlocked: false });
  });

  it("handles invalid JSON gracefully", () => {
    localStorage.setItem("decisionos:builder-tier-prefs", "broken");
    expect(loadTierPreferences()).toEqual({ showAllFeatures: false, expertUnlocked: false });
  });

  it("ignores non-boolean values", () => {
    localStorage.setItem(
      "decisionos:builder-tier-prefs",
      JSON.stringify({ showAllFeatures: "yes", expertUnlocked: 1 }),
    );
    expect(loadTierPreferences()).toEqual({ showAllFeatures: false, expertUnlocked: false });
  });
});

describe("saveTierPreferences", () => {
  it("persists preferences to localStorage", () => {
    saveTierPreferences({ showAllFeatures: true, expertUnlocked: false });
    const raw = localStorage.getItem("decisionos:builder-tier-prefs");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ showAllFeatures: true, expertUnlocked: false });
  });

  it("handles localStorage error gracefully", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => saveTierPreferences({ showAllFeatures: true, expertUnlocked: false })).not.toThrow();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("TIER_RANK has correct ordering", () => {
    expect(TIER_RANK.essential).toBeLessThan(TIER_RANK.intermediate);
    expect(TIER_RANK.intermediate).toBeLessThan(TIER_RANK.expert);
  });

  it("TIER_LABELS has entries for all tiers", () => {
    expect(TIER_LABELS.essential).toBe("Essential");
    expect(TIER_LABELS.intermediate).toBe("Intermediate");
    expect(TIER_LABELS.expert).toBe("Expert");
  });

  it("TIER_DESCRIPTIONS has entries for all tiers", () => {
    expect(TIER_DESCRIPTIONS.essential).toBeTruthy();
    expect(TIER_DESCRIPTIONS.intermediate).toBeTruthy();
    expect(TIER_DESCRIPTIONS.expert).toBeTruthy();
  });
});
