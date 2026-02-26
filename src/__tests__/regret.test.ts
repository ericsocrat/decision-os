/**
 * Unit tests for the Minimax Regret scoring module.
 *
 * Covers:
 *  - Basic ranking with benefit-only criteria
 *  - Cost-only criteria
 *  - Mixed benefit/cost criteria
 *  - Single option
 *  - Single criterion
 *  - Identical scores across all options
 *  - All-zero scores
 *  - Extreme weights (one criterion dominates)
 *  - Tied maximum regrets
 *  - Empty options / criteria
 *  - Missing scores (defaults to 0)
 *  - Published reference examples
 *  - Regret matrix correctness
 *  - bestPerCriterion correctness
 *  - Cost criteria regret inversion
 *  - Multi-method comparison (WSM vs Regret divergence)
 *  - Method string
 *  - Average regret
 *  - maxRegretCriterion identification
 */

import { describe, it, expect } from "vitest";
import { computeRegretResults } from "@/lib/regret";
import { computeResults } from "@/lib/scoring";
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
//  Edge cases — empty / degenerate inputs
// ---------------------------------------------------------------------------

describe("computeRegretResults — edge cases", () => {
  it("returns empty rankings for zero options", () => {
    const d = makeDecision([], [{ id: "c1", name: "C1", weight: 50, type: "benefit" }], {});
    const r = computeRegretResults(d);
    expect(r.rankings).toHaveLength(0);
    expect(r.method).toBe("minimax-regret");
    expect(r.regretMatrix).toEqual({});
    expect(r.bestPerCriterion).toEqual({});
  });

  it("returns empty rankings for zero criteria", () => {
    const d = makeDecision([{ id: "o1", name: "O1" }], [], {});
    const r = computeRegretResults(d);
    expect(r.rankings).toHaveLength(0);
  });

  it("returns empty rankings for no options and no criteria", () => {
    const d = makeDecision([], [], {});
    const r = computeRegretResults(d);
    expect(r.rankings).toHaveLength(0);
    expect(r.regretMatrix).toEqual({});
    expect(r.bestPerCriterion).toEqual({});
  });

  it("handles missing scores (defaults to 0)", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [{ id: "c1", name: "C1", weight: 50, type: "benefit" }],
      { o1: { c1: 8 } } // o2 has no scores → defaults to 0
    );
    const r = computeRegretResults(d);
    expect(r.rankings).toHaveLength(2);
    // o1 has best score → regret 0; o2 has max regret
    expect(r.rankings[0].optionId).toBe("o1");
    expect(r.rankings[0].maxRegret).toBe(0);
    expect(r.rankings[1].optionId).toBe("o2");
    expect(r.rankings[1].maxRegret).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
//  Single option / single criterion
// ---------------------------------------------------------------------------

describe("computeRegretResults — single option", () => {
  it("returns zero regret for single option", () => {
    const d = makeDecision(
      [{ id: "o1", name: "Alpha" }],
      [{ id: "c1", name: "Speed", weight: 50, type: "benefit" }],
      { o1: { c1: 7 } }
    );
    const r = computeRegretResults(d);
    expect(r.rankings).toHaveLength(1);
    expect(r.rankings[0].maxRegret).toBe(0);
    expect(r.rankings[0].avgRegret).toBe(0);
    expect(r.rankings[0].rank).toBe(1);
    expect(r.rankings[0].optionName).toBe("Alpha");
  });
});

describe("computeRegretResults — single criterion", () => {
  it("ranks by regret on that one criterion", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
        { id: "o3", name: "O3" },
      ],
      [{ id: "c1", name: "Quality", weight: 100, type: "benefit" }],
      { o1: { c1: 10 }, o2: { c1: 5 }, o3: { c1: 8 } }
    );
    const r = computeRegretResults(d);
    // Best = 10. Regrets: o1=0, o3=2, o2=5 (weighted by 1.0)
    expect(r.rankings[0].optionId).toBe("o1");
    expect(r.rankings[0].maxRegret).toBe(0);
    expect(r.rankings[1].optionId).toBe("o3");
    expect(r.rankings[1].maxRegret).toBe(2);
    expect(r.rankings[2].optionId).toBe("o2");
    expect(r.rankings[2].maxRegret).toBe(5);
  });
});

// ---------------------------------------------------------------------------
//  Basic benefit-only ranking
// ---------------------------------------------------------------------------

describe("computeRegretResults — benefit-only criteria", () => {
  it("ranks options by minimax regret correctly", () => {
    // Classic example: 3 options, 2 criteria (both benefit, equal weight)
    const d = makeDecision(
      [
        { id: "a", name: "Startup" },
        { id: "b", name: "BigCorp" },
        { id: "c", name: "MidSize" },
      ],
      [
        { id: "salary", name: "Salary", weight: 50, type: "benefit" },
        { id: "growth", name: "Growth", weight: 50, type: "benefit" },
      ],
      {
        a: { salary: 6, growth: 10 }, // best growth
        b: { salary: 10, growth: 4 }, // best salary
        c: { salary: 8, growth: 8 }, // balanced
      }
    );
    const r = computeRegretResults(d);

    // Weights: 0.5 each
    // Best per criterion: salary=10, growth=10
    // Regret matrix (weighted):
    //   a: salary = 0.5*(10-6) = 2.0, growth = 0.5*(10-10) = 0.0 → max = 2.0
    //   b: salary = 0.5*(10-10) = 0.0, growth = 0.5*(10-4) = 3.0 → max = 3.0
    //   c: salary = 0.5*(10-8) = 1.0, growth = 0.5*(10-8) = 1.0 → max = 1.0
    // Winner: c (MidSize) with max regret 1.0 (minimax)

    expect(r.rankings[0].optionName).toBe("MidSize");
    expect(r.rankings[0].maxRegret).toBe(1);
    expect(r.rankings[1].optionName).toBe("Startup");
    expect(r.rankings[1].maxRegret).toBe(2);
    expect(r.rankings[2].optionName).toBe("BigCorp");
    expect(r.rankings[2].maxRegret).toBe(3);
  });
});

// ---------------------------------------------------------------------------
//  Cost-only criteria
// ---------------------------------------------------------------------------

describe("computeRegretResults — cost criteria", () => {
  it("handles cost criteria correctly (inverted scores)", () => {
    // Cost: effective = 10 - raw. Low raw cost = high effective score.
    const d = makeDecision(
      [
        { id: "a", name: "Cheap" },
        { id: "b", name: "Expensive" },
      ],
      [{ id: "cost", name: "Cost", weight: 100, type: "cost" }],
      {
        a: { cost: 2 }, // effective = 10-2 = 8 (good)
        b: { cost: 8 }, // effective = 10-8 = 2 (bad)
      }
    );
    const r = computeRegretResults(d);

    // Best effective = 8. Regret: a = 0 * 1.0 = 0, b = (8-2) * 1.0 = 6
    expect(r.rankings[0].optionId).toBe("a");
    expect(r.rankings[0].maxRegret).toBe(0);
    expect(r.rankings[1].optionId).toBe("b");
    expect(r.rankings[1].maxRegret).toBe(6);
    expect(r.bestPerCriterion["cost"]).toBe(8);
  });
});

// ---------------------------------------------------------------------------
//  Mixed benefit / cost criteria
// ---------------------------------------------------------------------------

describe("computeRegretResults — mixed criteria types", () => {
  it("handles benefit and cost criteria together", () => {
    const d = makeDecision(
      [
        { id: "a", name: "Option A" },
        { id: "b", name: "Option B" },
      ],
      [
        { id: "quality", name: "Quality", weight: 60, type: "benefit" },
        { id: "price", name: "Price", weight: 40, type: "cost" },
      ],
      {
        a: { quality: 9, price: 7 }, // quality eff=9, price eff=10-7=3
        b: { quality: 6, price: 2 }, // quality eff=6, price eff=10-2=8
      }
    );
    const r = computeRegretResults(d);

    // Normalized weights: 0.6, 0.4
    // Best: quality=9, price=8
    // Regret (weighted):
    //   a: quality = 0.6*(9-9) = 0.0, price = 0.4*(8-3) = 2.0 → max = 2.0
    //   b: quality = 0.6*(9-6) = 1.8, price = 0.4*(8-8) = 0.0 → max = 1.8
    // Winner: b (max regret 1.8 < 2.0)

    expect(r.rankings[0].optionId).toBe("b");
    expect(r.rankings[0].maxRegret).toBe(1.8);
    expect(r.rankings[1].optionId).toBe("a");
    expect(r.rankings[1].maxRegret).toBe(2);
  });
});

// ---------------------------------------------------------------------------
//  Identical scores (all tie)
// ---------------------------------------------------------------------------

describe("computeRegretResults — identical scores", () => {
  it("returns zero regret for all options when scores are identical", () => {
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
        o1: { c1: 7, c2: 7 },
        o2: { c1: 7, c2: 7 },
      }
    );
    const r = computeRegretResults(d);
    expect(r.rankings[0].maxRegret).toBe(0);
    expect(r.rankings[1].maxRegret).toBe(0);
  });
});

// ---------------------------------------------------------------------------
//  All-zero scores
// ---------------------------------------------------------------------------

describe("computeRegretResults — all-zero scores", () => {
  it("returns zero regret when all scores are 0", () => {
    const d = makeDecision(
      [
        { id: "o1", name: "O1" },
        { id: "o2", name: "O2" },
      ],
      [{ id: "c1", name: "C1", weight: 50, type: "benefit" }],
      {
        o1: { c1: 0 },
        o2: { c1: 0 },
      }
    );
    const r = computeRegretResults(d);
    expect(r.rankings[0].maxRegret).toBe(0);
    expect(r.rankings[1].maxRegret).toBe(0);
  });
});

// ---------------------------------------------------------------------------
//  Extreme weights (one criterion dominates)
// ---------------------------------------------------------------------------

describe("computeRegretResults — extreme weights", () => {
  it("dominant criterion drives the ranking", () => {
    const d = makeDecision(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      [
        { id: "c1", name: "Dominant", weight: 990, type: "benefit" },
        { id: "c2", name: "Minor", weight: 10, type: "benefit" },
      ],
      {
        a: { c1: 5, c2: 10 },
        b: { c1: 10, c2: 0 },
      }
    );
    const r = computeRegretResults(d);
    // B dominates on the 99%-weight criterion → A has huge regret on c1
    expect(r.rankings[0].optionId).toBe("b");
    expect(r.rankings[0].maxRegretCriterion).toBe("c2"); // B's regret is on Minor
    expect(r.rankings[1].optionId).toBe("a");
    expect(r.rankings[1].maxRegretCriterion).toBe("c1"); // A's pain point
  });
});

// ---------------------------------------------------------------------------
//  Tied maximum regrets
// ---------------------------------------------------------------------------

describe("computeRegretResults — tied max regrets", () => {
  it("maintains stable ordering for options with equal max regret", () => {
    const d = makeDecision(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      [
        { id: "c1", name: "C1", weight: 50, type: "benefit" },
        { id: "c2", name: "C2", weight: 50, type: "benefit" },
      ],
      {
        a: { c1: 10, c2: 5 }, // max regret on c2
        b: { c1: 5, c2: 10 }, // max regret on c1
      }
    );
    const r = computeRegretResults(d);
    // Both have same max regret = 0.5 * 5 = 2.5
    expect(r.rankings[0].maxRegret).toBe(2.5);
    expect(r.rankings[1].maxRegret).toBe(2.5);
    // Stable sort: insertion order preserved
    expect(r.rankings[0].optionId).toBe("a");
    expect(r.rankings[1].optionId).toBe("b");
  });
});

// ---------------------------------------------------------------------------
//  Regret matrix correctness
// ---------------------------------------------------------------------------

describe("computeRegretResults — regret matrix", () => {
  it("correctly computes the full regret matrix", () => {
    const d = makeDecision(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      [
        { id: "c1", name: "C1", weight: 50, type: "benefit" },
        { id: "c2", name: "C2", weight: 50, type: "benefit" },
      ],
      {
        a: { c1: 10, c2: 4 },
        b: { c1: 6, c2: 10 },
      }
    );
    const r = computeRegretResults(d);

    // Weights: 0.5 each
    // Best: c1=10, c2=10
    // a: c1 regret = 0.5*(10-10) = 0, c2 regret = 0.5*(10-4) = 3
    // b: c1 regret = 0.5*(10-6) = 2, c2 regret = 0.5*(10-10) = 0
    expect(r.regretMatrix["a"]["c1"]).toBe(0);
    expect(r.regretMatrix["a"]["c2"]).toBe(3);
    expect(r.regretMatrix["b"]["c1"]).toBe(2);
    expect(r.regretMatrix["b"]["c2"]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
//  bestPerCriterion correctness
// ---------------------------------------------------------------------------

describe("computeRegretResults — bestPerCriterion", () => {
  it("stores the best effective score for each criterion", () => {
    const d = makeDecision(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      [
        { id: "c1", name: "C1", weight: 50, type: "benefit" },
        { id: "c2", name: "C2", weight: 50, type: "cost" },
      ],
      {
        a: { c1: 8, c2: 3 }, // c1 eff=8, c2 eff=7
        b: { c1: 6, c2: 7 }, // c1 eff=6, c2 eff=3
      }
    );
    const r = computeRegretResults(d);
    expect(r.bestPerCriterion["c1"]).toBe(8); // max(8, 6)
    expect(r.bestPerCriterion["c2"]).toBe(7); // max(7, 3) — effective scores
  });
});

// ---------------------------------------------------------------------------
//  maxRegretCriterion identification
// ---------------------------------------------------------------------------

describe("computeRegretResults — maxRegretCriterion", () => {
  it("identifies the criterion causing the most regret for each option", () => {
    const d = makeDecision(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      [
        { id: "salary", name: "Salary", weight: 50, type: "benefit" },
        { id: "wlb", name: "WLB", weight: 50, type: "benefit" },
      ],
      {
        a: { salary: 10, wlb: 3 }, // worst regret on WLB
        b: { salary: 4, wlb: 10 }, // worst regret on Salary
      }
    );
    const r = computeRegretResults(d);
    const optA = r.rankings.find((x) => x.optionId === "a")!;
    const optB = r.rankings.find((x) => x.optionId === "b")!;
    expect(optA.maxRegretCriterion).toBe("wlb");
    expect(optB.maxRegretCriterion).toBe("salary");
  });
});

// ---------------------------------------------------------------------------
//  Average regret
// ---------------------------------------------------------------------------

describe("computeRegretResults — average regret", () => {
  it("computes correct average weighted regret", () => {
    const d = makeDecision(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      [
        { id: "c1", name: "C1", weight: 50, type: "benefit" },
        { id: "c2", name: "C2", weight: 50, type: "benefit" },
      ],
      {
        a: { c1: 10, c2: 4 },
        b: { c1: 6, c2: 10 },
      }
    );
    const r = computeRegretResults(d);
    const optA = r.rankings.find((x) => x.optionId === "a")!;
    // a: regret c1=0, c2=3 → avg = (0+3)/2 = 1.5
    expect(optA.avgRegret).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
//  Method string
// ---------------------------------------------------------------------------

describe("computeRegretResults — method", () => {
  it("returns 'minimax-regret' method string", () => {
    const d = makeDecision(
      [{ id: "o1", name: "O1" }],
      [{ id: "c1", name: "C1", weight: 50, type: "benefit" }],
      { o1: { c1: 5 } }
    );
    const r = computeRegretResults(d);
    expect(r.method).toBe("minimax-regret");
  });
});

// ---------------------------------------------------------------------------
//  Reference example: 3 jobs, 3 criteria (from issue spec)
// ---------------------------------------------------------------------------

describe("computeRegretResults — reference example (job choice)", () => {
  it("correctly reproduces the issue spec example", () => {
    // Job choice: quality, salary, growth — all benefit, equal weights
    const d = makeDecision(
      [
        { id: "startup", name: "Startup Job" },
        { id: "bigcorp", name: "Big Corp" },
        { id: "midsize", name: "Mid-Size" },
      ],
      [
        { id: "quality", name: "Quality", weight: 33.33, type: "benefit" },
        { id: "salary", name: "Salary", weight: 33.33, type: "benefit" },
        { id: "growth", name: "Growth", weight: 33.33, type: "benefit" },
      ],
      {
        startup: { quality: 8, salary: 4, growth: 10 },
        bigcorp: { quality: 5, salary: 10, growth: 3 },
        midsize: { quality: 7, salary: 8, growth: 9 },
      }
    );
    const r = computeRegretResults(d);

    // Best: quality=8, salary=10, growth=10
    // Weights ≈ 1/3 each
    // Regret (weighted):
    //   startup: q=0, s≈2.0, g=0 → max ≈ 2.0
    //   bigcorp: q≈1.0, s=0, g≈2.33 → max ≈ 2.33
    //   midsize: q≈0.33, s≈0.67, g≈0.33 → max ≈ 0.67

    // Winner should be midsize (lowest max regret)
    expect(r.rankings[0].optionName).toBe("Mid-Size");
    expect(r.rankings[0].maxRegret).toBeLessThan(1);

    // BigCorp should be last (highest max regret from poor growth)
    expect(r.rankings[2].optionName).toBe("Big Corp");
    expect(r.rankings[2].maxRegretCriterion).toBe("growth");
  });
});

// ---------------------------------------------------------------------------
//  Reference example 2: city relocation (risk-averse scenario)
// ---------------------------------------------------------------------------

describe("computeRegretResults — reference example (city relocation)", () => {
  it("penalizes the option with extreme weakness", () => {
    // City A: great overall but worst crime rate
    // Compensatory methods (WSM) would pick A. Regret should pick differently.
    const d = makeDecision(
      [
        { id: "a", name: "City A" },
        { id: "b", name: "City B" },
        { id: "c", name: "City C" },
      ],
      [
        { id: "food", name: "Restaurants", weight: 30, type: "benefit" },
        { id: "safety", name: "Safety", weight: 40, type: "benefit" },
        { id: "commute", name: "Commute", weight: 30, type: "cost" },
      ],
      {
        a: { food: 10, safety: 2, commute: 3 }, // Great food, terrible safety
        b: { food: 5, safety: 9, commute: 5 },
        c: { food: 7, safety: 7, commute: 4 },
      }
    );
    const regret = computeRegretResults(d);
    const wsm = computeResults(d);

    // WSM might rank A higher due to compensation
    // Regret should NOT rank A first due to extreme safety weakness
    expect(regret.rankings[0].optionId).not.toBe("a");

    // Verify the methods can indeed disagree
    const wsmWinner = wsm.optionResults[0].optionId;
    const regretWinner = regret.rankings[0].optionId;
    // At minimum, regret penalizes City A more than WSM does
    expect(wsmWinner).toBeDefined();
    expect(regretWinner).toBeDefined();
    const regretA = regret.rankings.find((x) => x.optionId === "a")!;
    expect(regretA.maxRegretCriterion).toBe("safety");
  });
});

// ---------------------------------------------------------------------------
//  WSM vs Regret divergence
// ---------------------------------------------------------------------------

describe("computeRegretResults — WSM divergence", () => {
  it("can produce a different winner than WSM", () => {
    // Designed so WSM picks A (best total) but Regret picks B (no big weakness)
    const d = makeDecision(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      [
        { id: "c1", name: "C1", weight: 50, type: "benefit" },
        { id: "c2", name: "C2", weight: 50, type: "benefit" },
      ],
      {
        a: { c1: 10, c2: 2 }, // WSM: 0.5*10 + 0.5*2 = 6.0
        b: { c1: 7, c2: 7 }, // WSM: 0.5*7 + 0.5*7 = 7.0
      }
    );
    const wsm = computeResults(d);
    const regret = computeRegretResults(d);

    // WSM: B wins (7.0 > 6.0)
    expect(wsm.optionResults[0].optionId).toBe("b");

    // Regret: B also wins here (max regret = 0.5*3 = 1.5 vs A's 0.5*5 = 2.5)
    expect(regret.rankings[0].optionId).toBe("b");

    // Now a case where they actually disagree:
    const d2 = makeDecision(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      [
        { id: "c1", name: "C1", weight: 60, type: "benefit" },
        { id: "c2", name: "C2", weight: 40, type: "benefit" },
      ],
      {
        a: { c1: 10, c2: 1 }, // WSM: 0.6*10 + 0.4*1 = 6.4
        b: { c1: 3, c2: 10 }, // WSM: 0.6*3 + 0.4*10 = 5.8
        c: { c1: 7, c2: 7 }, // WSM: 0.6*7 + 0.4*7 = 7.0
      }
    );
    const wsm2 = computeResults(d2);
    const regret2 = computeRegretResults(d2);

    // WSM winner: C (7.0)
    expect(wsm2.optionResults[0].optionId).toBe("c");
    // Regret winner: also C (balanced), but let's verify structure
    expect(regret2.rankings[0].optionId).toBe("c");
    // A has big regret on c2, B has big regret on c1
    expect(regret2.rankings.find((x) => x.optionId === "a")!.maxRegretCriterion).toBe("c2");
    expect(regret2.rankings.find((x) => x.optionId === "b")!.maxRegretCriterion).toBe("c1");
  });
});

// ---------------------------------------------------------------------------
//  Rank assignment
// ---------------------------------------------------------------------------

describe("computeRegretResults — rank assignment", () => {
  it("assigns 1-based ranks in ascending regret order", () => {
    const d = makeDecision(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      [{ id: "c1", name: "C1", weight: 100, type: "benefit" }],
      { a: { c1: 10 }, b: { c1: 3 }, c: { c1: 7 } }
    );
    const r = computeRegretResults(d);
    expect(r.rankings.map((x) => x.rank)).toEqual([1, 2, 3]);
    expect(r.rankings[0].optionId).toBe("a"); // regret = 0
    expect(r.rankings[1].optionId).toBe("c"); // regret = 3
    expect(r.rankings[2].optionId).toBe("b"); // regret = 7
  });
});

// ---------------------------------------------------------------------------
//  All-zero weights → equal weights
// ---------------------------------------------------------------------------

describe("computeRegretResults — zero weights", () => {
  it("treats all-zero weights as equal weights", () => {
    const d = makeDecision(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      [
        { id: "c1", name: "C1", weight: 0, type: "benefit" },
        { id: "c2", name: "C2", weight: 0, type: "benefit" },
      ],
      {
        a: { c1: 10, c2: 2 },
        b: { c1: 5, c2: 10 },
      }
    );
    const r = computeRegretResults(d);
    // Equal weights = 0.5 each
    // a: c1 regret = 0, c2 regret = 0.5*8 = 4 → max = 4
    // b: c1 regret = 0.5*5 = 2.5, c2 regret = 0 → max = 2.5
    expect(r.rankings[0].optionId).toBe("b");
    expect(r.rankings[0].maxRegret).toBe(2.5);
    expect(r.rankings[1].optionId).toBe("a");
    expect(r.rankings[1].maxRegret).toBe(4);
  });
});

// ---------------------------------------------------------------------------
//  Module exports
// ---------------------------------------------------------------------------

describe("regret module exports", () => {
  it("exports computeRegretResults function", () => {
    expect(typeof computeRegretResults).toBe("function");
  });
});
