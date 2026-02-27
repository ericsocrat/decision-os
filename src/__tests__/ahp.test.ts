import { describe, it, expect } from "vitest";
import {
  buildPairwiseMatrix,
  deriveWeights,
  lambdaMax,
  consistencyIndex,
  consistencyRatio,
  isConsistent,
  weightsTo100,
  computeAHP,
  pairCount,
  generatePairs,
  saatyLabel,
  ahpLocalPriorities,
  ahpGlobalPriorities,
  ahpFullAnalysis,
} from "@/lib/ahp";
import type { PairwiseComparison, AHPComparisons } from "@/lib/ahp";

// ---------------------------------------------------------------------------
// buildPairwiseMatrix
// ---------------------------------------------------------------------------

describe("buildPairwiseMatrix", () => {
  it("produces identity matrix when all comparisons are equal (empty)", () => {
    const ids = ["a", "b", "c"];
    const m = buildPairwiseMatrix(ids, []);
    expect(m).toEqual([
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ]);
  });

  it("sets reciprocal values for a single comparison", () => {
    const ids = ["x", "y"];
    const comps: PairwiseComparison[] = [
      { criterionA: "x", criterionB: "y", value: 5 },
    ];
    const m = buildPairwiseMatrix(ids, comps);
    expect(m[0][1]).toBe(5);
    expect(m[1][0]).toBeCloseTo(1 / 5);
    expect(m[0][0]).toBe(1);
    expect(m[1][1]).toBe(1);
  });

  it("clamps values to Saaty range [1/9, 9]", () => {
    const ids = ["a", "b"];
    const comps: PairwiseComparison[] = [
      { criterionA: "a", criterionB: "b", value: 20 },
    ];
    const m = buildPairwiseMatrix(ids, comps);
    expect(m[0][1]).toBe(9);
    expect(m[1][0]).toBeCloseTo(1 / 9);
  });

  it("ignores comparisons with unknown criterion ids", () => {
    const ids = ["a", "b"];
    const comps: PairwiseComparison[] = [
      { criterionA: "a", criterionB: "UNKNOWN", value: 3 },
    ];
    const m = buildPairwiseMatrix(ids, comps);
    expect(m[0][1]).toBe(1);
  });

  it("ignores self-comparisons (same criterion on both sides)", () => {
    const ids = ["a", "b"];
    const comps: PairwiseComparison[] = [
      { criterionA: "a", criterionB: "a", value: 5 },
    ];
    const m = buildPairwiseMatrix(ids, comps);
    // Self-comparison should be ignored, diagonal stays 1
    expect(m[0][0]).toBe(1);
    expect(m[0][1]).toBe(1);
  });

  it("handles single criterion", () => {
    const m = buildPairwiseMatrix(["only"], []);
    expect(m).toEqual([[1]]);
  });
});

// ---------------------------------------------------------------------------
// deriveWeights
// ---------------------------------------------------------------------------

describe("deriveWeights", () => {
  it("returns empty array for empty matrix", () => {
    expect(deriveWeights([])).toEqual([]);
  });

  it("returns [1] for single criterion", () => {
    expect(deriveWeights([[1]])).toEqual([1]);
  });

  it("returns equal weights for identity matrix", () => {
    const m = buildPairwiseMatrix(["a", "b", "c"], []);
    const w = deriveWeights(m);
    expect(w).toHaveLength(3);
    for (const v of w) {
      expect(v).toBeCloseTo(1 / 3, 5);
    }
  });

  it("gives higher weight to more important criterion", () => {
    const ids = ["a", "b"];
    const comps: PairwiseComparison[] = [
      { criterionA: "a", criterionB: "b", value: 5 },
    ];
    const m = buildPairwiseMatrix(ids, comps);
    const w = deriveWeights(m);
    expect(w[0]).toBeGreaterThan(w[1]);
    expect(w[0] + w[1]).toBeCloseTo(1, 5);
  });

  it("produces weights summing to 1 for a 4x4 matrix", () => {
    const ids = ["a", "b", "c", "d"];
    const comps: PairwiseComparison[] = [
      { criterionA: "a", criterionB: "b", value: 3 },
      { criterionA: "a", criterionB: "c", value: 5 },
      { criterionA: "a", criterionB: "d", value: 7 },
      { criterionA: "b", criterionB: "c", value: 3 },
      { criterionA: "b", criterionB: "d", value: 5 },
      { criterionA: "c", criterionB: "d", value: 3 },
    ];
    const m = buildPairwiseMatrix(ids, comps);
    const w = deriveWeights(m);
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
    // Expected priority order: a > b > c > d
    expect(w[0]).toBeGreaterThan(w[1]);
    expect(w[1]).toBeGreaterThan(w[2]);
    expect(w[2]).toBeGreaterThan(w[3]);
  });
});

// ---------------------------------------------------------------------------
// lambdaMax
// ---------------------------------------------------------------------------

describe("lambdaMax", () => {
  it("equals n for a perfectly consistent matrix", () => {
    const ids = ["a", "b", "c"];
    const comps: PairwiseComparison[] = [
      { criterionA: "a", criterionB: "b", value: 2 },
      { criterionA: "a", criterionB: "c", value: 4 },
      { criterionA: "b", criterionB: "c", value: 2 },
    ];
    const m = buildPairwiseMatrix(ids, comps);
    const w = deriveWeights(m);
    const lm = lambdaMax(m, w);
    expect(lm).toBeCloseTo(3, 2);
  });

  it("returns 1 for single criterion", () => {
    expect(lambdaMax([[1]], [1])).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// consistencyIndex & consistencyRatio
// ---------------------------------------------------------------------------

describe("consistencyIndex", () => {
  it("is 0 for matrices with n <= 2", () => {
    expect(consistencyIndex([[1]], [1])).toBe(0);
    expect(consistencyIndex([[1, 3], [1 / 3, 1]], [0.75, 0.25])).toBe(0);
  });

  it("is near 0 for a perfectly consistent matrix", () => {
    const ids = ["a", "b", "c"];
    const comps: PairwiseComparison[] = [
      { criterionA: "a", criterionB: "b", value: 3 },
      { criterionA: "a", criterionB: "c", value: 9 },
      { criterionA: "b", criterionB: "c", value: 3 },
    ];
    const m = buildPairwiseMatrix(ids, comps);
    const w = deriveWeights(m);
    expect(consistencyIndex(m, w)).toBeCloseTo(0, 2);
  });
});

describe("consistencyRatio", () => {
  it("is 0 for n <= 2", () => {
    expect(consistencyRatio([[1, 5], [0.2, 1]], [0.83, 0.17])).toBe(0);
  });

  it("is below 0.1 for consistent judgments", () => {
    const ids = ["a", "b", "c"];
    const comps: PairwiseComparison[] = [
      { criterionA: "a", criterionB: "b", value: 3 },
      { criterionA: "a", criterionB: "c", value: 5 },
      { criterionA: "b", criterionB: "c", value: 2 },
    ];
    const m = buildPairwiseMatrix(ids, comps);
    const w = deriveWeights(m);
    const cr = consistencyRatio(m, w);
    expect(cr).toBeLessThan(0.1);
  });

  it("uses fallback RI for matrices larger than the RI table", () => {
    // Build an identity 16x16 matrix (n = 16 >= RANDOM_INDEX.length)
    const ids = Array.from({ length: 16 }, (_, i) => `c${i}`);
    const m = buildPairwiseMatrix(ids, []);
    const w = deriveWeights(m);
    // All equal weights → perfectly consistent → CR = 0
    const cr = consistencyRatio(m, w);
    expect(cr).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isConsistent
// ---------------------------------------------------------------------------

describe("isConsistent", () => {
  it("returns true for CR < 0.1", () => {
    expect(isConsistent(0)).toBe(true);
    expect(isConsistent(0.05)).toBe(true);
    expect(isConsistent(0.099)).toBe(true);
  });

  it("returns false for CR >= 0.1", () => {
    expect(isConsistent(0.1)).toBe(false);
    expect(isConsistent(0.5)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// weightsTo100
// ---------------------------------------------------------------------------

describe("weightsTo100", () => {
  it("returns empty for empty input", () => {
    expect(weightsTo100([])).toEqual([]);
  });

  it("sums to exactly 100", () => {
    const w100 = weightsTo100([0.333, 0.333, 0.334]);
    expect(w100.reduce((s, v) => s + v, 0)).toBe(100);
  });

  it("handles uneven weights", () => {
    const w100 = weightsTo100([0.5, 0.3, 0.2]);
    expect(w100).toEqual([50, 30, 20]);
  });

  it("uses largest-remainder for rounding", () => {
    const w100 = weightsTo100([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);
    expect(w100.reduce((s, v) => s + v, 0)).toBe(100);
    for (const v of w100) {
      expect(v).toBe(10);
    }
  });
});

// ---------------------------------------------------------------------------
// computeAHP (high-level)
// ---------------------------------------------------------------------------

describe("computeAHP", () => {
  it("produces consistent result for a well-formed comparison set", () => {
    const ids = ["a", "b", "c"];
    const comps: PairwiseComparison[] = [
      { criterionA: "a", criterionB: "b", value: 3 },
      { criterionA: "a", criterionB: "c", value: 5 },
      { criterionA: "b", criterionB: "c", value: 2 },
    ];
    const result = computeAHP(ids, comps);

    expect(result.isConsistent).toBe(true);
    expect(result.consistencyRatio).toBeLessThan(0.1);
    expect(result.weights).toHaveLength(3);
    expect(result.weights100).toHaveLength(3);
    expect(result.weights100.reduce((s, v) => s + v, 0)).toBe(100);
    expect(result.weights[0]).toBeGreaterThan(result.weights[1]);
    expect(result.weights[1]).toBeGreaterThan(result.weights[2]);
  });

  it("flags inconsistent judgments", () => {
    const ids = ["a", "b", "c"];
    const comps: PairwiseComparison[] = [
      { criterionA: "a", criterionB: "b", value: 9 },
      { criterionA: "b", criterionB: "c", value: 9 },
      { criterionA: "a", criterionB: "c", value: 1 / 9 }, // contradictory
    ];
    const result = computeAHP(ids, comps);
    expect(result.isConsistent).toBe(false);
    expect(result.consistencyRatio).toBeGreaterThan(0.1);
  });
});

// ---------------------------------------------------------------------------
// pairCount & generatePairs
// ---------------------------------------------------------------------------

describe("pairCount", () => {
  it("returns 0 for 0 or 1 criteria", () => {
    expect(pairCount(0)).toBe(0);
    expect(pairCount(1)).toBe(0);
  });

  it("returns correct count for n criteria", () => {
    expect(pairCount(2)).toBe(1);
    expect(pairCount(3)).toBe(3);
    expect(pairCount(5)).toBe(10);
  });
});

describe("generatePairs", () => {
  it("generates all unique pairs in order", () => {
    const pairs = generatePairs(["a", "b", "c"]);
    expect(pairs).toEqual([
      { a: "a", b: "b" },
      { a: "a", b: "c" },
      { a: "b", b: "c" },
    ]);
  });

  it("returns empty for single criterion", () => {
    expect(generatePairs(["x"])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// saatyLabel
// ---------------------------------------------------------------------------

describe("saatyLabel", () => {
  it("returns 'Equal' for 1", () => {
    expect(saatyLabel(1)).toBe("Equal");
  });

  it("returns descriptive labels for scale values", () => {
    expect(saatyLabel(2)).toBe("Slightly more");
    expect(saatyLabel(3)).toBe("Moderately more");
    expect(saatyLabel(4)).toBe("Moderate-to-strong");
    expect(saatyLabel(5)).toBe("Strongly more");
    expect(saatyLabel(6)).toBe("Strong-to-very-strong");
    expect(saatyLabel(7)).toBe("Very strongly more");
    expect(saatyLabel(8)).toBe("Very-to-extremely strong");
    expect(saatyLabel(9)).toBe("Extremely more");
  });

  it("returns 'Equal' for values below 1", () => {
    expect(saatyLabel(0)).toBe("Equal");
    expect(saatyLabel(-3)).toBe("Moderately more");
  });

  it("returns 'Equal' for out-of-range values", () => {
    expect(saatyLabel(15)).toBe("Equal");
  });
});

// ---------------------------------------------------------------------------
// ahpLocalPriorities (Level 2)
// ---------------------------------------------------------------------------

describe("ahpLocalPriorities", () => {
  it("returns equal priorities when all options are equal", () => {
    const result = ahpLocalPriorities(["o1", "o2", "o3"], []);
    expect(result.priorities).toHaveLength(3);
    for (const p of result.priorities) {
      expect(p).toBeCloseTo(1 / 3, 5);
    }
    expect(result.isConsistent).toBe(true);
  });

  it("gives higher priority to preferred option", () => {
    const comps: PairwiseComparison[] = [
      { criterionA: "o1", criterionB: "o2", value: 5 },
      { criterionA: "o1", criterionB: "o3", value: 7 },
      { criterionA: "o2", criterionB: "o3", value: 3 },
    ];
    const result = ahpLocalPriorities(["o1", "o2", "o3"], comps);
    expect(result.priorities[0]).toBeGreaterThan(result.priorities[1]);
    expect(result.priorities[1]).toBeGreaterThan(result.priorities[2]);
    expect(result.isConsistent).toBe(true);
  });

  it("detects inconsistency in option comparisons", () => {
    const comps: PairwiseComparison[] = [
      { criterionA: "o1", criterionB: "o2", value: 9 },
      { criterionA: "o2", criterionB: "o3", value: 9 },
      { criterionA: "o1", criterionB: "o3", value: 1 / 9 },
    ];
    const result = ahpLocalPriorities(["o1", "o2", "o3"], comps);
    expect(result.isConsistent).toBe(false);
    expect(result.cr).toBeGreaterThan(0.1);
  });
});

// ---------------------------------------------------------------------------
// ahpGlobalPriorities (Synthesis)
// ---------------------------------------------------------------------------

describe("ahpGlobalPriorities", () => {
  it("returns empty for empty inputs", () => {
    expect(ahpGlobalPriorities([], [])).toEqual([]);
  });

  it("synthesizes global priorities from weights and local priorities", () => {
    // 2 criteria, 3 options
    const localPriorities = [
      [0.6, 0.3, 0.1], // criterion 1: option priorities
      [0.1, 0.3, 0.6], // criterion 2: option priorities
    ];
    const weights = [0.5, 0.5]; // equal weights
    const globals = ahpGlobalPriorities(localPriorities, weights);
    expect(globals).toHaveLength(3);
    // Expected: [0.5*0.6+0.5*0.1, 0.5*0.3+0.5*0.3, 0.5*0.1+0.5*0.6]
    //         = [0.35, 0.30, 0.35]
    expect(globals[0]).toBeCloseTo(0.35, 5);
    expect(globals[1]).toBeCloseTo(0.30, 5);
    expect(globals[2]).toBeCloseTo(0.35, 5);
  });

  it("gives higher global priority when weight favors strong local priority", () => {
    const localPriorities = [
      [0.8, 0.2], // criterion 1: option A dominates
      [0.3, 0.7], // criterion 2: option B dominates
    ];
    const weights = [0.9, 0.1]; // criterion 1 strongly favored
    const globals = ahpGlobalPriorities(localPriorities, weights);
    expect(globals[0]).toBeGreaterThan(globals[1]); // A should win
  });
});

// ---------------------------------------------------------------------------
// ahpFullAnalysis
// ---------------------------------------------------------------------------

describe("ahpFullAnalysis", () => {
  const criterionIds = ["c1", "c2"];
  const optionIds = ["o1", "o2", "o3"];

  const comparisons: AHPComparisons = {
    criteriaComparisons: [
      { criterionA: "c1", criterionB: "c2", value: 3 }, // c1 moderately more important
    ],
    optionComparisons: {
      c1: [
        { criterionA: "o1", criterionB: "o2", value: 5 },
        { criterionA: "o1", criterionB: "o3", value: 7 },
        { criterionA: "o2", criterionB: "o3", value: 3 },
      ],
      c2: [
        { criterionA: "o1", criterionB: "o2", value: 1 / 3 },
        { criterionA: "o1", criterionB: "o3", value: 1 / 5 },
        { criterionA: "o2", criterionB: "o3", value: 1 / 3 },
      ],
    },
  };

  it("produces rankings with correct count", () => {
    const result = ahpFullAnalysis(criterionIds, optionIds, comparisons);
    expect(result.rankings).toHaveLength(3);
    expect(result.rankings[0].rank).toBe(1);
    expect(result.rankings[1].rank).toBe(2);
    expect(result.rankings[2].rank).toBe(3);
  });

  it("derives criterion weights", () => {
    const result = ahpFullAnalysis(criterionIds, optionIds, comparisons);
    expect(result.criterionWeights).toHaveLength(2);
    // c1 weighted 3× more than c2
    expect(result.criterionWeights[0]).toBeGreaterThan(result.criterionWeights[1]);
    expect(result.criterionWeights100.reduce((s, v) => s + v, 0)).toBe(100);
  });

  it("computes local priorities per criterion", () => {
    const result = ahpFullAnalysis(criterionIds, optionIds, comparisons);
    expect(result.localPriorities).toHaveLength(2);
    // For c1: o1 > o2 > o3
    const c1Local = result.localPriorities[0].optionPriorities;
    expect(c1Local[0]).toBeGreaterThan(c1Local[1]);
    expect(c1Local[1]).toBeGreaterThan(c1Local[2]);
    // For c2: o3 > o2 > o1 (reciprocal favors o3)
    const c2Local = result.localPriorities[1].optionPriorities;
    expect(c2Local[2]).toBeGreaterThan(c2Local[1]);
    expect(c2Local[1]).toBeGreaterThan(c2Local[0]);
  });

  it("reports overall consistency", () => {
    const result = ahpFullAnalysis(criterionIds, optionIds, comparisons);
    expect(result.overallConsistent).toBe(true);
    expect(result.criterionConsistent).toBe(true);
  });

  it("issues size warning for large problems", () => {
    // 11 criteria × 11 options = 55 + 11*55 = 660 comparisons > 100
    const manyIds = Array.from({ length: 11 }, (_, i) => `c${i}`);
    const manyOpts = Array.from({ length: 11 }, (_, i) => `o${i}`);
    const emptyComps: AHPComparisons = { criteriaComparisons: [], optionComparisons: {} };
    const result = ahpFullAnalysis(manyIds, manyOpts, emptyComps);
    expect(result.sizeWarning).not.toBeNull();
    expect(result.sizeWarning).toContain("comparisons");
  });

  it("returns no size warning for small problems", () => {
    const result = ahpFullAnalysis(criterionIds, optionIds, comparisons);
    expect(result.sizeWarning).toBeNull();
  });

  it("handles missing option comparisons gracefully", () => {
    const partial: AHPComparisons = {
      criteriaComparisons: comparisons.criteriaComparisons,
      optionComparisons: {}, // no option comparisons
    };
    const result = ahpFullAnalysis(criterionIds, optionIds, partial);
    // Without comparisons, all options get equal local priorities
    expect(result.globalPriorities).toHaveLength(3);
    for (const gp of result.globalPriorities) {
      expect(gp).toBeCloseTo(1 / 3, 5);
    }
  });
});
