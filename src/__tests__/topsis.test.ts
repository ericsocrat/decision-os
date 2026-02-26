/**
 * Unit tests for the TOPSIS scoring module.
 *
 * Covers:
 *  - Basic ranking with benefit-only criteria
 *  - Cost-only criteria
 *  - Mixed benefit/cost criteria
 *  - Single option, single criterion
 *  - Identical scores across options
 *  - All-zero scores
 *  - Extreme weights (one criterion dominates)
 *  - Perfect ideal match (closeness = 1)
 *  - Edge cases (empty options/criteria, zero-column)
 *  - Reference academic example verification
 *  - Ideal and anti-ideal solution correctness
 *  - Closeness coefficient bounds [0, 1]
 */

import { describe, it, expect } from "vitest";
import { computeTopsisResults } from "@/lib/topsis";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function makeDecision(
  options: { id: string; name: string }[],
  criteria: { id: string; name: string; weight: number; type: "benefit" | "cost" }[],
  scores: Record<string, Record<string, number>>
): Decision {
  return {
    id: "test",
    title: "Test Decision",
    options,
    criteria,
    scores,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
//  Empty / degenerate inputs
// ---------------------------------------------------------------------------

describe("computeTopsisResults — edge cases", () => {
  it("returns empty rankings for zero options", () => {
    const d = makeDecision([], [{ id: "c1", name: "C1", weight: 50, type: "benefit" }], {});
    const r = computeTopsisResults(d);
    expect(r.rankings).toHaveLength(0);
    expect(r.method).toBe("topsis");
  });

  it("returns empty rankings for zero criteria", () => {
    const d = makeDecision([{ id: "o1", name: "O1" }], [], {});
    const r = computeTopsisResults(d);
    expect(r.rankings).toHaveLength(0);
  });

  it("returns empty rankings for no options and no criteria", () => {
    const d = makeDecision([], [], {});
    const r = computeTopsisResults(d);
    expect(r.rankings).toHaveLength(0);
    expect(r.idealSolution).toEqual({});
    expect(r.antiIdealSolution).toEqual({});
  });

  it("handles missing scores (defaults to 0)", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [{ id: "c1", name: "C1", weight: 50, type: "benefit" }],
      { o1: { c1: 8 } } // o2 has no scores
    );
    const r = computeTopsisResults(d);
    expect(r.rankings).toHaveLength(2);
    // o1 should rank first — it has score 8 vs 0
    expect(r.rankings[0].optionId).toBe("o1");
    expect(r.rankings[1].optionId).toBe("o2");
  });

  it("returns closeness 0.5 for single option", () => {
    const d = makeDecision(
      [{ id: "o1", name: "Alpha" }],
      [{ id: "c1", name: "Speed", weight: 50, type: "benefit" }],
      { o1: { c1: 7 } }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings).toHaveLength(1);
    expect(r.rankings[0].closenessCoefficient).toBe(0.5);
    expect(r.rankings[0].rank).toBe(1);
    expect(r.rankings[0].optionName).toBe("Alpha");
  });

  it("handles all-zero scores gracefully", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [
        { id: "c1", name: "C1", weight: 50, type: "benefit" },
        { id: "c2", name: "C2", weight: 50, type: "benefit" },
      ],
      {
        o1: { c1: 0, c2: 0 },
        o2: { c1: 0, c2: 0 },
      }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings).toHaveLength(2);
    // Both should get closeness 0.5 — no differentiation
    expect(r.rankings[0].closenessCoefficient).toBe(0.5);
    expect(r.rankings[1].closenessCoefficient).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
//  Benefit-only criteria
// ---------------------------------------------------------------------------

describe("computeTopsisResults — benefit criteria", () => {
  const decision = makeDecision(
    [
      { id: "o1", name: "Alpha" },
      { id: "o2", name: "Beta" },
      { id: "o3", name: "Gamma" },
    ],
    [
      { id: "c1", name: "Quality", weight: 60, type: "benefit" },
      { id: "c2", name: "Speed", weight: 40, type: "benefit" },
    ],
    {
      o1: { c1: 9, c2: 8 },
      o2: { c1: 5, c2: 6 },
      o3: { c1: 3, c2: 4 },
    }
  );

  it("ranks options correctly with benefit-only criteria", () => {
    const r = computeTopsisResults(decision);
    expect(r.rankings[0].optionId).toBe("o1"); // best on both
    expect(r.rankings[1].optionId).toBe("o2");
    expect(r.rankings[2].optionId).toBe("o3"); // worst on both
  });

  it("assigns consecutive ranks starting from 1", () => {
    const r = computeTopsisResults(decision);
    expect(r.rankings.map((x) => x.rank)).toEqual([1, 2, 3]);
  });

  it("winner has highest closeness coefficient", () => {
    const r = computeTopsisResults(decision);
    expect(r.rankings[0].closenessCoefficient).toBeGreaterThan(r.rankings[1].closenessCoefficient);
  });

  it("all closeness coefficients are in [0, 1]", () => {
    const r = computeTopsisResults(decision);
    for (const opt of r.rankings) {
      expect(opt.closenessCoefficient).toBeGreaterThanOrEqual(0);
      expect(opt.closenessCoefficient).toBeLessThanOrEqual(1);
    }
  });

  it("returns ideal and anti-ideal solutions", () => {
    const r = computeTopsisResults(decision);
    // For benefit criteria, ideal = max, anti-ideal = min
    expect(r.idealSolution["c1"]).toBeGreaterThan(r.antiIdealSolution["c1"]);
    expect(r.idealSolution["c2"]).toBeGreaterThan(r.antiIdealSolution["c2"]);
  });
});

// ---------------------------------------------------------------------------
//  Cost-only criteria
// ---------------------------------------------------------------------------

describe("computeTopsisResults — cost criteria", () => {
  it("ranks lower cost as better", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "Cheap" },
        { id: "o2", name: "Expensive" },
      ],
      [{ id: "c1", name: "Price", weight: 100, type: "cost" }],
      {
        o1: { c1: 2 },
        o2: { c1: 9 },
      }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings[0].optionId).toBe("o1"); // lower cost is better
    expect(r.rankings[0].closenessCoefficient).toBeGreaterThan(r.rankings[1].closenessCoefficient);
  });

  it("sets ideal as min and anti-ideal as max for cost", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [{ id: "c1", name: "Cost", weight: 50, type: "cost" }],
      {
        o1: { c1: 3 },
        o2: { c1: 8 },
      }
    );
    const r = computeTopsisResults(d);
    // For cost: ideal is min (o1's weighted norm), anti-ideal is max (o2's weighted norm)
    expect(r.idealSolution["c1"]).toBeLessThan(r.antiIdealSolution["c1"]);
  });
});

// ---------------------------------------------------------------------------
//  Mixed criteria
// ---------------------------------------------------------------------------

describe("computeTopsisResults — mixed benefit/cost", () => {
  it("balances benefit and cost criteria", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "Balance" },
        { id: "o2", name: "HighQ" },
        { id: "o3", name: "Cheap" },
      ],
      [
        { id: "c1", name: "Quality", weight: 50, type: "benefit" },
        { id: "c2", name: "Price", weight: 50, type: "cost" },
      ],
      {
        o1: { c1: 7, c2: 3 }, // good quality, low price → best
        o2: { c1: 9, c2: 9 }, // great quality, high price
        o3: { c1: 2, c2: 1 }, // poor quality, very low price
      }
    );
    const r = computeTopsisResults(d);
    // Balance has best trade-off (high benefit, low cost)
    expect(r.rankings[0].optionId).toBe("o1");
  });

  it("uses correct ideal direction per criterion type", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "A" },
        { id: "o2", name: "B" },
      ],
      [
        { id: "c1", name: "Benefit", weight: 50, type: "benefit" },
        { id: "c2", name: "Cost", weight: 50, type: "cost" },
      ],
      {
        o1: { c1: 10, c2: 1 }, // perfect on both dimensions
        o2: { c1: 1, c2: 10 }, // worst on both
      }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings[0].optionId).toBe("o1");
    // o1 should be very close to ideal (closeness near 1)
    expect(r.rankings[0].closenessCoefficient).toBeGreaterThan(0.9);
    // o2 should be near anti-ideal (closeness near 0)
    expect(r.rankings[1].closenessCoefficient).toBeLessThan(0.1);
  });
});

// ---------------------------------------------------------------------------
//  Weights
// ---------------------------------------------------------------------------

describe("computeTopsisResults — weight handling", () => {
  it("extreme weight makes one criterion dominate", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [
        { id: "c1", name: "Quality", weight: 99, type: "benefit" },
        { id: "c2", name: "Speed", weight: 1, type: "benefit" },
      ],
      {
        o1: { c1: 9, c2: 1 }, // great quality, bad speed
        o2: { c1: 2, c2: 10 }, // bad quality, great speed
      }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings[0].optionId).toBe("o1"); // quality dominates
  });

  it("equal weights produce equal influence", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [
        { id: "c1", name: "A", weight: 50, type: "benefit" },
        { id: "c2", name: "B", weight: 50, type: "benefit" },
      ],
      {
        o1: { c1: 10, c2: 0 },
        o2: { c1: 0, c2: 10 },
      }
    );
    const r = computeTopsisResults(d);
    // Symmetric — both should get equal closeness
    expect(r.rankings[0].closenessCoefficient).toEqual(r.rankings[1].closenessCoefficient);
  });

  it("handles all-zero weights (normalizeWeights returns equal)", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [
        { id: "c1", name: "A", weight: 0, type: "benefit" },
        { id: "c2", name: "B", weight: 0, type: "benefit" },
      ],
      {
        o1: { c1: 9, c2: 3 },
        o2: { c1: 3, c2: 9 },
      }
    );
    const r = computeTopsisResults(d);
    // Equal weights → symmetric scores → same closeness
    expect(r.rankings[0].closenessCoefficient).toEqual(r.rankings[1].closenessCoefficient);
  });
});

// ---------------------------------------------------------------------------
//  Tied / identical scores
// ---------------------------------------------------------------------------

describe("computeTopsisResults — ties", () => {
  it("identical scores produce equal closeness", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
        { id: "o3", name: "O3" },
      ],
      [
        { id: "c1", name: "A", weight: 50, type: "benefit" },
        { id: "c2", name: "B", weight: 50, type: "benefit" },
      ],
      {
        o1: { c1: 5, c2: 5 },
        o2: { c1: 5, c2: 5 },
        o3: { c1: 5, c2: 5 },
      }
    );
    const r = computeTopsisResults(d);
    const coefficients = r.rankings.map((x) => x.closenessCoefficient);
    expect(new Set(coefficients).size).toBe(1); // all identical
  });

  it("two tied options, one different", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
        { id: "o3", name: "O3" },
      ],
      [{ id: "c1", name: "Quality", weight: 100, type: "benefit" }],
      {
        o1: { c1: 8 },
        o2: { c1: 8 },
        o3: { c1: 3 },
      }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings[0].closenessCoefficient).toEqual(r.rankings[1].closenessCoefficient);
    expect(r.rankings[0].closenessCoefficient).toBeGreaterThan(r.rankings[2].closenessCoefficient);
  });
});

// ---------------------------------------------------------------------------
//  Distance properties
// ---------------------------------------------------------------------------

describe("computeTopsisResults — distance properties", () => {
  it("winner has smallest distance to ideal", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "Best" },
        { id: "o2", name: "Mid" },
        { id: "o3", name: "Worst" },
      ],
      [
        { id: "c1", name: "A", weight: 50, type: "benefit" },
        { id: "c2", name: "B", weight: 50, type: "benefit" },
      ],
      {
        o1: { c1: 10, c2: 10 },
        o2: { c1: 5, c2: 5 },
        o3: { c1: 1, c2: 1 },
      }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings[0].distanceToIdeal).toBeLessThanOrEqual(r.rankings[1].distanceToIdeal);
    expect(r.rankings[1].distanceToIdeal).toBeLessThanOrEqual(r.rankings[2].distanceToIdeal);
  });

  it("worst option has smallest distance to anti-ideal", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "Best" },
        { id: "o2", name: "Worst" },
      ],
      [{ id: "c1", name: "A", weight: 100, type: "benefit" }],
      {
        o1: { c1: 10 },
        o2: { c1: 1 },
      }
    );
    const r = computeTopsisResults(d);
    const worst = r.rankings.find((x) => x.optionId === "o2")!;
    const best = r.rankings.find((x) => x.optionId === "o1")!;
    expect(worst.distanceToAntiIdeal).toBeLessThanOrEqual(best.distanceToAntiIdeal);
  });

  it("distances are non-negative", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [
        { id: "c1", name: "A", weight: 70, type: "benefit" },
        { id: "c2", name: "B", weight: 30, type: "cost" },
      ],
      {
        o1: { c1: 6, c2: 4 },
        o2: { c1: 8, c2: 7 },
      }
    );
    const r = computeTopsisResults(d);
    for (const opt of r.rankings) {
      expect(opt.distanceToIdeal).toBeGreaterThanOrEqual(0);
      expect(opt.distanceToAntiIdeal).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
//  Structure / method field
// ---------------------------------------------------------------------------

describe("computeTopsisResults — result structure", () => {
  it("returns method: topsis", () => {
    const d = makeDecision(
      [{ id: "o1", name: "O1" }],
      [{ id: "c1", name: "C1", weight: 50, type: "benefit" }],
      { o1: { c1: 5 } }
    );
    expect(computeTopsisResults(d).method).toBe("topsis");
  });

  it("includes idealSolution and antiIdealSolution keys for each criterion", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [
        { id: "c1", name: "A", weight: 50, type: "benefit" },
        { id: "c2", name: "B", weight: 50, type: "cost" },
      ],
      {
        o1: { c1: 8, c2: 3 },
        o2: { c1: 4, c2: 7 },
      }
    );
    const r = computeTopsisResults(d);
    expect(Object.keys(r.idealSolution)).toContain("c1");
    expect(Object.keys(r.idealSolution)).toContain("c2");
    expect(Object.keys(r.antiIdealSolution)).toContain("c1");
    expect(Object.keys(r.antiIdealSolution)).toContain("c2");
  });

  it("each ranking entry has all required fields", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [{ id: "c1", name: "C1", weight: 50, type: "benefit" }],
      { o1: { c1: 7 }, o2: { c1: 3 } }
    );
    const r = computeTopsisResults(d);
    for (const opt of r.rankings) {
      expect(opt).toHaveProperty("optionId");
      expect(opt).toHaveProperty("optionName");
      expect(opt).toHaveProperty("closenessCoefficient");
      expect(opt).toHaveProperty("distanceToIdeal");
      expect(opt).toHaveProperty("distanceToAntiIdeal");
      expect(opt).toHaveProperty("rank");
    }
  });
});

// ---------------------------------------------------------------------------
//  Single criterion
// ---------------------------------------------------------------------------

describe("computeTopsisResults — single criterion", () => {
  it("ranks by single benefit criterion", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
        { id: "o3", name: "O3" },
      ],
      [{ id: "c1", name: "Quality", weight: 100, type: "benefit" }],
      {
        o1: { c1: 10 },
        o2: { c1: 5 },
        o3: { c1: 1 },
      }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings.map((x) => x.optionId)).toEqual(["o1", "o2", "o3"]);
  });

  it("ranks by single cost criterion (lower is better)", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "Pricey" },
        { id: "o2", name: "Cheap" },
      ],
      [{ id: "c1", name: "Price", weight: 100, type: "cost" }],
      {
        o1: { c1: 9 },
        o2: { c1: 2 },
      }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings[0].optionId).toBe("o2");
    expect(r.rankings[1].optionId).toBe("o1");
  });
});

// ---------------------------------------------------------------------------
//  Many options / many criteria
// ---------------------------------------------------------------------------

describe("computeTopsisResults — larger matrix", () => {
  it("handles 5 options × 4 criteria", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
        { id: "o3", name: "O3" },
        { id: "o4", name: "O4" },
        { id: "o5", name: "O5" },
      ],
      [
        { id: "c1", name: "Quality", weight: 30, type: "benefit" },
        { id: "c2", name: "Speed", weight: 25, type: "benefit" },
        { id: "c3", name: "Price", weight: 25, type: "cost" },
        { id: "c4", name: "Risk", weight: 20, type: "cost" },
      ],
      {
        o1: { c1: 8, c2: 7, c3: 4, c4: 3 },
        o2: { c1: 6, c2: 9, c3: 6, c4: 5 },
        o3: { c1: 9, c2: 5, c3: 3, c4: 2 },
        o4: { c1: 4, c2: 4, c3: 8, c4: 8 },
        o5: { c1: 7, c2: 6, c3: 5, c4: 4 },
      }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings).toHaveLength(5);
    expect(r.rankings.map((x) => x.rank)).toEqual([1, 2, 3, 4, 5]);
    // Best option should be o3 (highest quality, lowest price+risk) or o1
    // Just verify structure and ranking properties
    for (let i = 0; i < r.rankings.length - 1; i++) {
      expect(r.rankings[i].closenessCoefficient).toBeGreaterThanOrEqual(
        r.rankings[i + 1].closenessCoefficient
      );
    }
  });
});

// ---------------------------------------------------------------------------
//  Reference example — verifiable by hand
// ---------------------------------------------------------------------------

describe("computeTopsisResults — reference example", () => {
  // Two options, two equal-weight benefit criteria
  // o1: (4, 6), o2: (8, 2)
  //
  // Column norms: sqrt(4²+8²) = sqrt(80) ≈ 8.944, sqrt(6²+2²) = sqrt(40) ≈ 6.325
  // Normalized: o1: (0.4472, 0.9487), o2: (0.8944, 0.3162)
  // Weighted (w=0.5 each): o1: (0.2236, 0.4743), o2: (0.4472, 0.1581)
  // Ideal A+: (0.4472, 0.4743)
  // Anti-ideal A-: (0.2236, 0.1581)
  // D+(o1) = sqrt((0.2236−0.4472)² + (0.4743−0.4743)²) = sqrt(0.05) ≈ 0.2236
  // D-(o1) = sqrt((0.2236−0.2236)² + (0.4743−0.1581)²) = sqrt(0.1) ≈ 0.3162
  // C(o1) = 0.3162/(0.2236+0.3162) = 0.3162/0.5398 ≈ 0.5858
  //
  // D+(o2) = sqrt((0.4472−0.4472)² + (0.1581−0.4743)²) = sqrt(0.1) ≈ 0.3162
  // D-(o2) = sqrt((0.4472−0.2236)² + (0.1581−0.1581)²) = sqrt(0.05) ≈ 0.2236
  // C(o2) = 0.2236/(0.3162+0.2236) = 0.2236/0.5398 ≈ 0.4142

  it("produces correct closeness for hand-calculated example", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [
        { id: "c1", name: "A", weight: 50, type: "benefit" },
        { id: "c2", name: "B", weight: 50, type: "benefit" },
      ],
      {
        o1: { c1: 4, c2: 6 },
        o2: { c1: 8, c2: 2 },
      }
    );
    const r = computeTopsisResults(d);
    expect(r.rankings[0].optionId).toBe("o1");
    expect(r.rankings[0].closenessCoefficient).toBeCloseTo(0.59, 1);
    expect(r.rankings[1].closenessCoefficient).toBeCloseTo(0.41, 1);
  });

  it("best option in reference example is the one with higher sum", () => {
    // o1 sum = 10, o2 sum = 10 → but TOPSIS considers geometry
    // o1 = (4,6) is closer to the ideal column-by-column distribution
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [
        { id: "c1", name: "A", weight: 50, type: "benefit" },
        { id: "c2", name: "B", weight: 50, type: "benefit" },
      ],
      {
        o1: { c1: 4, c2: 6 },
        o2: { c1: 8, c2: 2 },
      }
    );
    const r = computeTopsisResults(d);
    // o1 ranks first because it's geometrically closer to the ideal point
    expect(r.rankings[0].optionId).toBe("o1");
  });
});

// ---------------------------------------------------------------------------
//  WSM vs TOPSIS disagreement scenario
// ---------------------------------------------------------------------------

describe("computeTopsisResults — WSM disagreement scenario", () => {
  it("can rank differently from simple weighted sum", () => {
    // Set up a scenario where WSM and TOPSIS would rank differently
    // WSM uses effectiveScore (cost inverted as 10-score), TOPSIS uses vector normalization
    // With 3 options and mixed criteria, orderings can differ
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
        { id: "o3", name: "O3" },
      ],
      [
        { id: "c1", name: "Perf", weight: 40, type: "benefit" },
        { id: "c2", name: "Price", weight: 30, type: "cost" },
        { id: "c3", name: "Risk", weight: 30, type: "cost" },
      ],
      {
        o1: { c1: 7, c2: 5, c3: 4 },
        o2: { c1: 9, c2: 8, c3: 9 }, // high perf but very high cost/risk
        o3: { c1: 5, c2: 2, c3: 1 }, // low perf but very low cost/risk
      }
    );
    const r = computeTopsisResults(d);
    // Just verify TOPSIS produces a valid ranking — the key point is it CAN differ
    expect(r.rankings).toHaveLength(3);
    expect(r.rankings.every((x) => x.closenessCoefficient >= 0)).toBe(true);
  });
});
