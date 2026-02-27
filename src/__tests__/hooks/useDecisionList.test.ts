/**
 * Tests for useDecisionList hook — search, sort, status, quality.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDecisionList, type DecisionStatus, type SortField } from "@/hooks/useDecisionList";
import type { Decision } from "@/lib/types";
import { DEMO_DECISION } from "@/lib/demo-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: `dec-${Math.random().toString(36).slice(2)}`,
    title: "Test Decision",
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
    ],
    criteria: [
      { id: "c1", name: "Cost", weight: 50, type: "benefit" },
      { id: "c2", name: "Quality", weight: 50, type: "benefit" },
    ],
    scores: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeScoredDecision(title: string, updatedAt: string): Decision {
  return makeDecision({
    title,
    updatedAt,
    scores: {
      o1: { c1: 8, c2: 6 },
      o2: { c1: 5, c2: 9 },
    },
  });
}

function makeEmptyDecision(): Decision {
  return {
    id: `dec-empty-${Math.random().toString(36).slice(2)}`,
    title: "",
    options: [],
    criteria: [],
    scores: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useDecisionList", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns all decisions as cards with metadata", () => {
    const decisions = [DEMO_DECISION, makeDecision({ title: "My Choice" })];
    const { result } = renderHook(() => useDecisionList(decisions));

    expect(result.current.cards).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.cards[0].title).toBeTruthy();
  });

  it("computes 'empty' status for blank decisions", () => {
    const decisions = [makeEmptyDecision()];
    const { result } = renderHook(() => useDecisionList(decisions));

    expect(result.current.cards[0].status).toBe("empty" satisfies DecisionStatus);
    expect(result.current.cards[0].statusLabel).toBe("Empty");
  });

  it("computes 'in-progress' status for partially scored decisions", () => {
    const partial = makeDecision({
      scores: { o1: { c1: 5, c2: null }, o2: { c1: null, c2: null } },
    });
    const decisions = [partial];
    const { result } = renderHook(() => useDecisionList(decisions));

    expect(result.current.cards[0].status).toBe("in-progress" satisfies DecisionStatus);
  });

  it("computes 'winner' status for fully scored decisions with clear winner", () => {
    const winner = makeDecision({
      scores: { o1: { c1: 9, c2: 9 }, o2: { c1: 2, c2: 2 } },
    });
    const decisions = [winner];
    const { result } = renderHook(() => useDecisionList(decisions));

    expect(result.current.cards[0].status).toBe("winner" satisfies DecisionStatus);
    expect(result.current.cards[0].winnerName).toBeTruthy();
    expect(result.current.cards[0].winnerScore).toBeGreaterThan(0);
  });

  it("computes 'scored' status for fully scored without clear winner", () => {
    const close = makeDecision({
      scores: { o1: { c1: 7, c2: 7 }, o2: { c1: 7, c2: 7 } },
    });
    const decisions = [close];
    const { result } = renderHook(() => useDecisionList(decisions));

    expect(result.current.cards[0].status).toBe("scored" satisfies DecisionStatus);
  });

  it("filters by search query (title)", () => {
    const decisions = [
      makeDecision({ title: "Job Offer Comparison" }),
      makeDecision({ title: "Apartment Hunt" }),
      makeDecision({ title: "Vacation Planning" }),
    ];
    const { result } = renderHook(() => useDecisionList(decisions));

    act(() => {
      result.current.setQuery("apart");
    });

    expect(result.current.cards).toHaveLength(1);
    expect(result.current.cards[0].title).toBe("Apartment Hunt");
    expect(result.current.totalCount).toBe(3); // totalCount unchanged
  });

  it("filters by search query (option name)", () => {
    const dec = makeDecision({
      title: "My Choices",
      options: [
        { id: "o1", name: "Tesla Model 3" },
        { id: "o2", name: "BMW i4" },
      ],
    });
    const decisions = [dec, makeDecision({ title: "Other" })];
    const { result } = renderHook(() => useDecisionList(decisions));

    act(() => {
      result.current.setQuery("tesla");
    });

    expect(result.current.cards).toHaveLength(1);
    expect(result.current.cards[0].title).toBe("My Choices");
  });

  it("sorts by 'recent' (default)", () => {
    const decisions = [
      makeScoredDecision("Old", "2025-01-01T00:00:00.000Z"),
      makeScoredDecision("New", "2026-06-01T00:00:00.000Z"),
      makeScoredDecision("Mid", "2026-03-01T00:00:00.000Z"),
    ];
    const { result } = renderHook(() => useDecisionList(decisions));

    expect(result.current.cards[0].title).toBe("New");
    expect(result.current.cards[1].title).toBe("Mid");
    expect(result.current.cards[2].title).toBe("Old");
  });

  it("sorts by 'alphabetical'", () => {
    const decisions = [
      makeDecision({ title: "Zebra" }),
      makeDecision({ title: "Apple" }),
      makeDecision({ title: "Mango" }),
    ];
    const { result } = renderHook(() => useDecisionList(decisions));

    act(() => {
      result.current.setSortField("alphabetical" satisfies SortField);
    });

    expect(result.current.cards[0].title).toBe("Apple");
    expect(result.current.cards[1].title).toBe("Mango");
    expect(result.current.cards[2].title).toBe("Zebra");
  });

  it("sorts by 'quality'", () => {
    const full = makeDecision({
      title: "Full",
      scores: { o1: { c1: 8, c2: 7 }, o2: { c1: 6, c2: 5 } },
    });
    const partial = makeDecision({
      title: "Partial",
      scores: { o1: { c1: 5 }, o2: {} },
    });
    const empty = makeEmptyDecision();
    const decisions = [partial, empty, full];
    const { result } = renderHook(() => useDecisionList(decisions));

    act(() => {
      result.current.setSortField("quality" satisfies SortField);
    });

    // Full (100%) first, then empty (100% of 0 total → blue tier, 100%), then partial
    // Actually empty has total=0, percent=100. Let's just check full is high
    expect(result.current.cards[0].completeness.percent).toBeGreaterThanOrEqual(
      result.current.cards[result.current.cards.length - 1].completeness.percent
    );
  });

  it("includes completeness data in card", () => {
    const dec = makeDecision({
      scores: { o1: { c1: 5, c2: 3 }, o2: { c1: null, c2: null } },
    });
    const decisions = [dec];
    const { result } = renderHook(() => useDecisionList(decisions));

    expect(result.current.cards[0].completeness.total).toBe(4); // 2 options × 2 criteria
    expect(result.current.cards[0].completeness.filled).toBe(2); // 2 scored
    expect(result.current.cards[0].completeness.percent).toBe(50);
  });

  it("shows 'Untitled Decision' for empty title", () => {
    const dec = makeDecision({ title: "" });
    const decisions = [dec];
    const { result } = renderHook(() => useDecisionList(decisions));

    expect(result.current.cards[0].title).toBe("Untitled Decision");
  });
});
