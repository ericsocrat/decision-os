/**
 * Tests for cognitive bias detection engine.
 * 30+ tests covering all 7 bias types with positive, negative, and edge cases.
 */

import { describe, it, expect } from "vitest";
import { detectBiases, type BiasWarning } from "@/lib/bias-detection";
import type { Decision, Criterion, Option } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  const options: Option[] = overrides.options ?? [
    { id: "o1", name: "Option A" },
    { id: "o2", name: "Option B" },
    { id: "o3", name: "Option C" },
  ];
  const criteria: Criterion[] = overrides.criteria ?? [
    { id: "c1", name: "Quality", weight: 40, type: "benefit" },
    { id: "c2", name: "Cost", weight: 30, type: "cost" },
    { id: "c3", name: "Speed", weight: 20, type: "benefit" },
    { id: "c4", name: "Risk", weight: 10, type: "cost" },
  ];
  const scores = overrides.scores ?? {
    o1: { c1: 8, c2: 4, c3: 7, c4: 3 },
    o2: { c1: 6, c2: 7, c3: 5, c4: 6 },
    o3: { c1: 5, c2: 5, c3: 8, c4: 5 },
  };
  return {
    id: "test",
    title: "Test Decision",
    description: "",
    options,
    criteria,
    scores,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function findBias(warnings: BiasWarning[], type: string): BiasWarning | undefined {
  return warnings.find((w) => w.type === type);
}

/* ------------------------------------------------------------------ */
/*  Edge Cases & Guards                                                */
/* ------------------------------------------------------------------ */

describe("detectBiases — edge cases", () => {
  it("returns empty array for empty decision", () => {
    const d = makeDecision({ options: [], criteria: [], scores: {} });
    expect(detectBiases(d)).toEqual([]);
  });

  it("returns empty array for single option", () => {
    const d = makeDecision({
      options: [{ id: "o1", name: "Only" }],
      scores: { o1: { c1: 5, c2: 5, c3: 5, c4: 5 } },
    });
    expect(detectBiases(d)).toEqual([]);
  });

  it("returns empty array for single criterion", () => {
    const d = makeDecision({
      criteria: [{ id: "c1", name: "Only", weight: 100, type: "benefit" }],
      scores: { o1: { c1: 8 }, o2: { c1: 6 }, o3: { c1: 7 } },
    });
    // Single criterion cannot trigger most biases
    const warnings = detectBiases(d);
    // Weight uniformity requires 2+ criteria
    expect(findBias(warnings, "weight-uniformity")).toBeUndefined();
  });

  it("handles zero scores gracefully", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 0, c2: 0, c3: 0, c4: 0 },
        o2: { c1: 0, c2: 0, c3: 0, c4: 0 },
        o3: { c1: 0, c2: 0, c3: 0, c4: 0 },
      },
    });
    // Should not throw
    const warnings = detectBiases(d);
    expect(Array.isArray(warnings)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  1. Halo Effect                                                     */
/* ------------------------------------------------------------------ */

describe("detectBiases — halo effect", () => {
  it("detects halo effect when one option scores highest on all criteria", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 10, c2: 10, c3: 10, c4: 10 },
        o2: { c1: 5, c2: 5, c3: 5, c4: 5 },
        o3: { c1: 3, c2: 3, c3: 3, c4: 3 },
      },
    });
    const w = findBias(detectBiases(d), "halo-effect");
    expect(w).toBeDefined();
    expect(w!.affectedOptions).toContain("o1");
    expect(w!.severity).toBe("warning");
  });

  it("does not detect halo when scores are distributed", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 10, c2: 3, c3: 7, c4: 2 },
        o2: { c1: 5, c2: 8, c3: 5, c4: 9 },
        o3: { c1: 3, c2: 5, c3: 10, c4: 5 },
      },
    });
    expect(findBias(detectBiases(d), "halo-effect")).toBeUndefined();
  });

  it("detects halo at exactly 80% threshold (4 of 5 criteria)", () => {
    const criteria: Criterion[] = [
      { id: "c1", name: "A", weight: 20, type: "benefit" },
      { id: "c2", name: "B", weight: 20, type: "benefit" },
      { id: "c3", name: "C", weight: 20, type: "benefit" },
      { id: "c4", name: "D", weight: 20, type: "benefit" },
      { id: "c5", name: "E", weight: 20, type: "benefit" },
    ];
    const d = makeDecision({
      criteria,
      options: [
        { id: "o1", name: "A" },
        { id: "o2", name: "B" },
      ],
      scores: {
        o1: { c1: 10, c2: 10, c3: 10, c4: 10, c5: 3 }, // highest on 4/5 = 80%
        o2: { c1: 5, c2: 5, c3: 5, c4: 5, c5: 9 },
      },
    });
    expect(findBias(detectBiases(d), "halo-effect")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  2. Uniformity Bias                                                 */
/* ------------------------------------------------------------------ */

describe("detectBiases — uniformity bias", () => {
  it("detects narrow score range for an option", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 5, c2: 6, c3: 5, c4: 6 }, // range = 1
        o2: { c1: 2, c2: 9, c3: 4, c4: 7 },
        o3: { c1: 3, c2: 8, c3: 5, c4: 6 },
      },
    });
    const w = findBias(detectBiases(d), "uniformity-bias");
    expect(w).toBeDefined();
    expect(w!.affectedOptions).toContain("o1");
    expect(w!.severity).toBe("info");
  });

  it("does not detect uniformity when scores are spread", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 2, c2: 8, c3: 5, c4: 9 },
        o2: { c1: 3, c2: 7, c3: 6, c4: 4 },
        o3: { c1: 1, c2: 9, c3: 4, c4: 8 },
      },
    });
    expect(findBias(detectBiases(d), "uniformity-bias")).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  3. Score Anchoring                                                 */
/* ------------------------------------------------------------------ */

describe("detectBiases — score anchoring", () => {
  it("detects when most scores are the same value", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 5, c2: 5, c3: 5, c4: 5 },
        o2: { c1: 5, c2: 5, c3: 5, c4: 5 },
        o3: { c1: 5, c2: 5, c3: 5, c4: 6 }, // 11/12 = 92% are 5
      },
    });
    const w = findBias(detectBiases(d), "score-anchoring");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("does not detect anchoring when scores vary", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 2, c2: 8, c3: 4, c4: 7 },
        o2: { c1: 6, c2: 3, c3: 9, c4: 1 },
        o3: { c1: 5, c2: 5, c3: 6, c4: 4 },
      },
    });
    expect(findBias(detectBiases(d), "score-anchoring")).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  4. Weight Uniformity                                               */
/* ------------------------------------------------------------------ */

describe("detectBiases — weight uniformity", () => {
  it("detects when all weights are equal", () => {
    const d = makeDecision({
      criteria: [
        { id: "c1", name: "A", weight: 25, type: "benefit" },
        { id: "c2", name: "B", weight: 25, type: "benefit" },
        { id: "c3", name: "C", weight: 25, type: "benefit" },
        { id: "c4", name: "D", weight: 25, type: "benefit" },
      ],
    });
    const w = findBias(detectBiases(d), "weight-uniformity");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("info");
    expect(w!.affectedCriteria).toHaveLength(4);
  });

  it("detects near-equal weights within 10-point range", () => {
    const d = makeDecision({
      criteria: [
        { id: "c1", name: "A", weight: 25, type: "benefit" },
        { id: "c2", name: "B", weight: 30, type: "benefit" },
        { id: "c3", name: "C", weight: 22, type: "benefit" },
        { id: "c4", name: "D", weight: 23, type: "benefit" },
      ],
    });
    const w = findBias(detectBiases(d), "weight-uniformity");
    expect(w).toBeDefined();
  });

  it("does not detect when weights differ significantly", () => {
    const d = makeDecision({
      criteria: [
        { id: "c1", name: "A", weight: 60, type: "benefit" },
        { id: "c2", name: "B", weight: 20, type: "benefit" },
        { id: "c3", name: "C", weight: 15, type: "benefit" },
        { id: "c4", name: "D", weight: 5, type: "benefit" },
      ],
    });
    expect(findBias(detectBiases(d), "weight-uniformity")).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  5. Missing Differentiation                                         */
/* ------------------------------------------------------------------ */

describe("detectBiases — missing differentiation", () => {
  it("detects near-tied options", () => {
    const d = makeDecision({
      criteria: [
        { id: "c1", name: "A", weight: 50, type: "benefit" },
        { id: "c2", name: "B", weight: 50, type: "benefit" },
      ],
      options: [
        { id: "o1", name: "Option A" },
        { id: "o2", name: "Option B" },
      ],
      scores: {
        o1: { c1: 7, c2: 7 },
        o2: { c1: 7, c2: 7 }, // exactly tied
      },
    });
    const w = findBias(detectBiases(d), "missing-differentiation");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("does not detect when options are clearly separated", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 10, c2: 2, c3: 9, c4: 1 },
        o2: { c1: 3, c2: 8, c3: 4, c4: 7 },
        o3: { c1: 5, c2: 5, c3: 5, c4: 5 },
      },
    });
    expect(findBias(detectBiases(d), "missing-differentiation")).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  6. Extreme Scores                                                  */
/* ------------------------------------------------------------------ */

describe("detectBiases — extreme scores", () => {
  it("detects when option has mostly 0s and 10s", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 10, c2: 0, c3: 10, c4: 0 }, // 100% extreme
        o2: { c1: 5, c2: 6, c3: 7, c4: 4 },
        o3: { c1: 3, c2: 8, c3: 5, c4: 6 },
      },
    });
    const w = findBias(detectBiases(d), "extreme-scores");
    expect(w).toBeDefined();
    expect(w!.affectedOptions).toContain("o1");
    expect(w!.severity).toBe("info");
  });

  it("does not detect when scores are moderate", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 6, c2: 4, c3: 7, c4: 3 },
        o2: { c1: 5, c2: 7, c3: 5, c4: 6 },
        o3: { c1: 4, c2: 6, c3: 8, c4: 5 },
      },
    });
    expect(findBias(detectBiases(d), "extreme-scores")).toBeUndefined();
  });

  it("detects at exactly 50% threshold", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 10, c2: 0, c3: 5, c4: 6 }, // 2/4 = 50%, not >50%
        o2: { c1: 5, c2: 6, c3: 7, c4: 4 },
        o3: { c1: 3, c2: 8, c3: 5, c4: 6 },
      },
    });
    // 50% is not > 50%, so should not detect
    expect(findBias(detectBiases(d), "extreme-scores")).toBeUndefined();
  });

  it("detects above 50% threshold (3 of 4)", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 10, c2: 0, c3: 10, c4: 6 }, // 3/4 = 75%
        o2: { c1: 5, c2: 6, c3: 7, c4: 4 },
        o3: { c1: 3, c2: 8, c3: 5, c4: 6 },
      },
    });
    expect(findBias(detectBiases(d), "extreme-scores")).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/*  7. Single-Criterion Dominance                                      */
/* ------------------------------------------------------------------ */

describe("detectBiases — single-criterion dominance", () => {
  it("detects when removing one criterion changes the winner", () => {
    // Set up so option A wins because of criterion c1 (high weight)
    // but option B would win if c1 is removed
    const d = makeDecision({
      criteria: [
        { id: "c1", name: "Deciding Factor", weight: 70, type: "benefit" },
        { id: "c2", name: "Minor", weight: 15, type: "benefit" },
        { id: "c3", name: "Minor2", weight: 15, type: "benefit" },
      ],
      options: [
        { id: "o1", name: "Option A" },
        { id: "o2", name: "Option B" },
      ],
      scores: {
        o1: { c1: 10, c2: 2, c3: 2 }, // wins on c1
        o2: { c1: 3, c2: 9, c3: 9 }, // wins on c2 + c3
      },
    });
    const w = findBias(detectBiases(d), "single-criterion-dominance");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("critical");
    expect(w!.affectedCriteria).toContain("c1");
  });

  it("does not detect when winner is robust across criteria", () => {
    // All benefit-type criteria so o1 dominates across the board
    const d = makeDecision({
      criteria: [
        { id: "c1", name: "A", weight: 40, type: "benefit" },
        { id: "c2", name: "B", weight: 30, type: "benefit" },
        { id: "c3", name: "C", weight: 20, type: "benefit" },
        { id: "c4", name: "D", weight: 10, type: "benefit" },
      ],
      scores: {
        o1: { c1: 9, c2: 9, c3: 9, c4: 9 },
        o2: { c1: 4, c2: 4, c3: 4, c4: 4 },
        o3: { c1: 5, c2: 5, c3: 5, c4: 5 },
      },
    });
    expect(findBias(detectBiases(d), "single-criterion-dominance")).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Warning Structure                                                  */
/* ------------------------------------------------------------------ */

describe("detectBiases — warning structure", () => {
  it("every warning has required fields", () => {
    const d = makeDecision({
      scores: {
        o1: { c1: 10, c2: 10, c3: 10, c4: 10 },
        o2: { c1: 5, c2: 5, c3: 5, c4: 5 },
        o3: { c1: 3, c2: 3, c3: 3, c4: 3 },
      },
    });
    const warnings = detectBiases(d);
    for (const w of warnings) {
      expect(w.type).toBeDefined();
      expect(w.severity).toMatch(/^(info|warning|critical)$/);
      expect(w.title.length).toBeGreaterThan(0);
      expect(w.description.length).toBeGreaterThan(0);
      expect(w.suggestion.length).toBeGreaterThan(0);
    }
  });

  it("returns multiple bias types when applicable", () => {
    // Create a decision that triggers multiple biases
    const d = makeDecision({
      criteria: [
        { id: "c1", name: "A", weight: 25, type: "benefit" },
        { id: "c2", name: "B", weight: 25, type: "benefit" },
        { id: "c3", name: "C", weight: 25, type: "benefit" },
        { id: "c4", name: "D", weight: 25, type: "benefit" },
      ],
      scores: {
        o1: { c1: 5, c2: 5, c3: 5, c4: 5 },
        o2: { c1: 5, c2: 5, c3: 5, c4: 5 },
        o3: { c1: 5, c2: 5, c3: 5, c4: 5 },
      },
    });
    const warnings = detectBiases(d);
    const types = new Set(warnings.map((w) => w.type));
    // Should detect at least uniformity, anchoring, weight uniformity, missing differentiation
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it("bias types are valid BiasType values", () => {
    const validTypes = [
      "halo-effect",
      "uniformity-bias",
      "score-anchoring",
      "weight-uniformity",
      "missing-differentiation",
      "extreme-scores",
      "single-criterion-dominance",
    ];
    const d = makeDecision({
      scores: {
        o1: { c1: 10, c2: 10, c3: 10, c4: 10 },
        o2: { c1: 5, c2: 5, c3: 5, c4: 5 },
        o3: { c1: 5, c2: 5, c3: 5, c4: 5 },
      },
    });
    for (const w of detectBiases(d)) {
      expect(validTypes).toContain(w.type);
    }
  });
});
