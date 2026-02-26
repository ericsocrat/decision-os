/**
 * useValidation hook tests.
 *
 * Validates decision form state: required fields, minimums,
 * duplicate names, weight checks.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/89
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useValidation } from "@/hooks/useValidation";
import type { Decision } from "@/lib/types";

// ─── Helpers ───────────────────────────────────────────────────────

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "test-1",
    title: "Pick a City",
    description: "",
    options: [
      { id: "o1", name: "Austin" },
      { id: "o2", name: "Denver" },
    ],
    criteria: [
      { id: "c1", name: "Cost", weight: 50, type: "cost" },
      { id: "c2", name: "Weather", weight: 50, type: "benefit" },
    ],
    scores: {
      o1: { c1: 7, c2: 8 },
      o2: { c1: 6, c2: 9 },
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("useValidation", () => {
  it("returns isValid=true for a valid decision", () => {
    const { result } = renderHook(() => useValidation(makeDecision()));
    expect(result.current.isValid).toBe(true);
    expect(result.current.errorCount).toBe(0);
    expect(result.current.errors).toHaveLength(0);
  });

  it("returns an error when title is empty", () => {
    const { result } = renderHook(() => useValidation(makeDecision({ title: "" })));
    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.some((e) => e.message.includes("title is required"))).toBe(true);
  });

  it("returns an error when fewer than 2 options", () => {
    const decision = makeDecision({ options: [{ id: "o1", name: "Solo" }] });
    const { result } = renderHook(() => useValidation(decision));
    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.some((e) => e.message.includes("at least 2 options"))).toBe(true);
  });

  it("returns an error when no criteria", () => {
    const decision = makeDecision({ criteria: [] });
    const { result } = renderHook(() => useValidation(decision));
    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.some((e) => e.message.includes("1 criterion is required"))).toBe(
      true
    );
  });

  it("returns an error when all weights are zero", () => {
    const decision = makeDecision({
      criteria: [
        { id: "c1", name: "Cost", weight: 0, type: "cost" },
        { id: "c2", name: "Weather", weight: 0, type: "benefit" },
      ],
    });
    const { result } = renderHook(() => useValidation(decision));
    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.some((e) => e.message.includes("weights are zero"))).toBe(true);
  });

  it("returns a warning for empty option names", () => {
    const decision = makeDecision({
      options: [
        { id: "o1", name: "" },
        { id: "o2", name: "Denver" },
      ],
    });
    const { result } = renderHook(() => useValidation(decision));
    expect(result.current.warnings.some((w) => w.message.includes("Option needs a name"))).toBe(
      true
    );
  });

  it("returns a warning for duplicate option names", () => {
    const decision = makeDecision({
      options: [
        { id: "o1", name: "Denver" },
        { id: "o2", name: "Denver" },
      ],
    });
    const { result } = renderHook(() => useValidation(decision));
    expect(result.current.warnings.some((w) => w.message.includes("already exists"))).toBe(true);
  });

  it("returns a warning for empty criterion names", () => {
    const decision = makeDecision({
      criteria: [
        { id: "c1", name: "", weight: 50, type: "cost" },
        { id: "c2", name: "Weather", weight: 50, type: "benefit" },
      ],
    });
    const { result } = renderHook(() => useValidation(decision));
    expect(result.current.warnings.some((w) => w.message.includes("Criterion needs a name"))).toBe(
      true
    );
  });

  it("returns an info for a single zero-weight criterion", () => {
    const decision = makeDecision({
      criteria: [
        { id: "c1", name: "Cost", weight: 0, type: "cost" },
        { id: "c2", name: "Weather", weight: 50, type: "benefit" },
      ],
    });
    const { result } = renderHook(() => useValidation(decision));
    // isValid should still be true (info is not an error)
    expect(result.current.isValid).toBe(true);
    expect(result.current.infos.some((i) => i.message.includes("zero weight"))).toBe(true);
  });

  it("indexes issues by field in byField map", () => {
    const decision = makeDecision({ title: "", options: [{ id: "o1", name: "Solo" }] });
    const { result } = renderHook(() => useValidation(decision));
    expect(result.current.byField.has("title")).toBe(true);
    expect(result.current.byField.has("option")).toBe(true);
  });

  it("indexes issues by ID in byId map", () => {
    const decision = makeDecision({
      options: [
        { id: "o1", name: "" },
        { id: "o2", name: "Denver" },
      ],
    });
    const { result } = renderHook(() => useValidation(decision));
    expect(result.current.byId.has("o1")).toBe(true);
  });

  it("counts errors correctly with multiple validation failures", () => {
    const decision = makeDecision({
      title: "",
      options: [],
      criteria: [],
    });
    const { result } = renderHook(() => useValidation(decision));
    // title + options < 2 + criteria < 1 = 3 errors minimum
    expect(result.current.errorCount).toBeGreaterThanOrEqual(3);
    expect(result.current.isValid).toBe(false);
  });
});
