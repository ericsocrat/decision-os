/**
 * Unit tests for Pareto frontier computation.
 */

import { describe, it, expect } from "vitest";
import { computeParetoFrontier, defaultAxes } from "@/lib/pareto";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDecision(overrides?: Partial<Decision>): Decision {
  return {
    id: "test",
    title: "Test",
    description: "",
    options: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ],
    criteria: [
      { id: "x", name: "X", weight: 50, type: "benefit" },
      { id: "y", name: "Y", weight: 50, type: "benefit" },
    ],
    scores: {
      a: { x: 9, y: 2 },
      b: { x: 5, y: 6 },
      c: { x: 3, y: 9 },
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeParetoFrontier
// ---------------------------------------------------------------------------

describe("computeParetoFrontier", () => {
  it("identifies a basic Pareto frontier (no dominated options)", () => {
    // A(9,2), B(5,6), C(3,9) — all Pareto-optimal (trade-offs)
    const d = makeDecision();
    const result = computeParetoFrontier(d, "x", "y");

    expect(result.frontier).toEqual(expect.arrayContaining(["a", "b", "c"]));
    expect(result.dominated).toEqual([]);
    expect(result.points).toHaveLength(3);
    expect(result.points.every((p) => p.isPareto)).toBe(true);
  });

  it("detects dominated options", () => {
    // A(9,8) dominates B(5,6) and C(3,4)
    const d = makeDecision({
      scores: {
        a: { x: 9, y: 8 },
        b: { x: 5, y: 6 },
        c: { x: 3, y: 4 },
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    expect(result.frontier).toEqual(["a"]);
    expect(result.dominated).toEqual(expect.arrayContaining(["b", "c"]));
    expect(result.dominanceMap["b"]).toContain("a");
    expect(result.dominanceMap["c"]).toContain("a");
  });

  it("handles all options on frontier (diagonal trade-offs)", () => {
    const d = makeDecision({
      scores: {
        a: { x: 10, y: 0 },
        b: { x: 0, y: 10 },
        c: { x: 5, y: 5 },
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    // All three are Pareto-optimal
    expect(result.frontier).toHaveLength(3);
    expect(result.dominated).toHaveLength(0);
  });

  it("handles all options dominated (single dominator)", () => {
    const d = makeDecision({
      scores: {
        a: { x: 10, y: 10 },
        b: { x: 5, y: 5 },
        c: { x: 3, y: 3 },
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    expect(result.frontier).toEqual(["a"]);
    expect(result.dominated).toHaveLength(2);
  });

  it("handles tied scores — tied options are not dominated by each other", () => {
    const d = makeDecision({
      scores: {
        a: { x: 5, y: 5 },
        b: { x: 5, y: 5 },
        c: { x: 3, y: 3 },
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    // A and B tie — neither dominates the other (need strict > on at least one)
    expect(result.frontier).toEqual(expect.arrayContaining(["a", "b"]));
    // C is dominated by both A and B
    expect(result.dominated).toEqual(["c"]);
    expect(result.dominanceMap["c"]).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("handles a single option (always Pareto-optimal)", () => {
    const d = makeDecision({
      options: [{ id: "solo", name: "Solo" }],
      scores: { solo: { x: 5, y: 5 } },
    });
    const result = computeParetoFrontier(d, "x", "y");

    expect(result.frontier).toEqual(["solo"]);
    expect(result.dominated).toEqual([]);
  });

  it("handles two options — one dominates other", () => {
    const d = makeDecision({
      options: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      scores: {
        a: { x: 7, y: 8 },
        b: { x: 4, y: 3 },
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    expect(result.frontier).toEqual(["a"]);
    expect(result.dominated).toEqual(["b"]);
  });

  it("handles two options — neither dominates (trade-off)", () => {
    const d = makeDecision({
      options: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      scores: {
        a: { x: 9, y: 2 },
        b: { x: 2, y: 9 },
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    expect(result.frontier).toEqual(["a", "b"]);
    expect(result.dominated).toEqual([]);
  });

  it("handles cost criteria (inverts scores)", () => {
    // cost criterion: lower raw = better, so effective = 10 - raw
    const d = makeDecision({
      criteria: [
        { id: "x", name: "Price", weight: 50, type: "cost" },
        { id: "y", name: "Quality", weight: 50, type: "benefit" },
      ],
      scores: {
        a: { x: 2, y: 8 }, // effective x = 8, y = 8 → dominant
        b: { x: 8, y: 4 }, // effective x = 2, y = 4 → dominated
        c: { x: 5, y: 9 }, // effective x = 5, y = 9 → Pareto
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    // A(8,8) dominates B(2,4); A and C are both Pareto-optimal
    expect(result.frontier).toEqual(expect.arrayContaining(["a", "c"]));
    expect(result.dominated).toEqual(["b"]);
  });

  it("handles missing scores (treated as 0)", () => {
    const d = makeDecision({
      scores: {
        a: { x: 5 }, // y missing → 0
        b: { y: 5 }, // x missing → 0
        c: { x: 3, y: 3 },
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    // A(5,0), B(0,5), C(3,3) — all Pareto (no one dominates another)
    expect(result.frontier).toHaveLength(3);
  });

  it("handles null scores (treated as 0)", () => {
    const d = makeDecision({
      scores: {
        a: { x: null, y: 8 },
        b: { x: 7, y: null },
        c: { x: 5, y: 5 },
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    // A(0,8), B(7,0), C(5,5) — all Pareto
    expect(result.frontier).toHaveLength(3);
  });

  it("returns correct axis labels", () => {
    const d = makeDecision({
      criteria: [
        { id: "x", name: "Price", weight: 50, type: "cost" },
        { id: "y", name: "Quality", weight: 50, type: "benefit" },
      ],
    });
    const result = computeParetoFrontier(d, "x", "y");

    expect(result.xLabel).toBe("Price");
    expect(result.yLabel).toBe("Quality");
  });

  it("returns empty result for invalid criterion IDs", () => {
    const d = makeDecision();
    const result = computeParetoFrontier(d, "nonexistent", "y");
    expect(result.points).toEqual([]);
    expect(result.frontier).toEqual([]);
  });

  it("handles ScoredCell values (extracts numeric value)", () => {
    const d = makeDecision({
      scores: {
        a: { x: { value: 9, confidence: "high" }, y: 2 },
        b: { x: 5, y: { value: 6, confidence: "low" } },
        c: { x: 3, y: { value: 9, confidence: "medium" } },
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    // Same as basic test: A(9,2), B(5,6), C(3,9) — all Pareto
    expect(result.frontier).toHaveLength(3);
    expect(result.points[0].x).toBe(9);
    expect(result.points[0].y).toBe(2);
  });

  it("handles many options (stress test)", () => {
    const options = Array.from({ length: 20 }, (_, i) => ({
      id: `opt-${i}`,
      name: `Option ${i}`,
    }));
    const scores: Record<string, Record<string, number>> = {};
    for (let i = 0; i < 20; i++) {
      scores[`opt-${i}`] = { x: i, y: 19 - i }; // Diagonal — all Pareto
    }
    const d = makeDecision({ options, scores });
    const result = computeParetoFrontier(d, "x", "y");

    expect(result.frontier).toHaveLength(20);
    expect(result.dominated).toHaveLength(0);
  });

  it("dominanceMap lists all dominators for a dominated option", () => {
    const d = makeDecision({
      options: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      scores: {
        a: { x: 10, y: 8 },
        b: { x: 8, y: 10 },
        c: { x: 5, y: 5 }, // dominated by both A and B
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    expect(result.dominanceMap["c"]).toEqual(expect.arrayContaining(["a", "b"]));
    expect(result.dominanceMap["c"]).toHaveLength(2);
  });

  it("partial domination (equal on one axis, strictly better on other)", () => {
    const d = makeDecision({
      scores: {
        a: { x: 5, y: 8 },
        b: { x: 5, y: 6 }, // A dominates B (equal on x, better on y)
        c: { x: 3, y: 9 },
      },
    });
    const result = computeParetoFrontier(d, "x", "y");

    expect(result.frontier).toEqual(expect.arrayContaining(["a", "c"]));
    expect(result.dominated).toEqual(["b"]);
  });
});

// ---------------------------------------------------------------------------
// defaultAxes
// ---------------------------------------------------------------------------

describe("defaultAxes", () => {
  it("returns the two highest-weighted criteria", () => {
    const d = makeDecision({
      criteria: [
        { id: "c1", name: "C1", weight: 20, type: "benefit" },
        { id: "c2", name: "C2", weight: 40, type: "benefit" },
        { id: "c3", name: "C3", weight: 30, type: "benefit" },
      ],
    });
    const axes = defaultAxes(d);
    expect(axes).toEqual(["c2", "c3"]); // 40 and 30
  });

  it("returns null with fewer than 2 criteria", () => {
    const d = makeDecision({
      criteria: [{ id: "c1", name: "C1", weight: 50, type: "benefit" }],
    });
    expect(defaultAxes(d)).toBeNull();
  });

  it("returns null with no criteria", () => {
    const d = makeDecision({ criteria: [] });
    expect(defaultAxes(d)).toBeNull();
  });
});
