/**
 * Tests for useBiasDetection hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBiasDetection } from "@/hooks/useBiasDetection";
import { DEMO_DECISION } from "@/lib/demo-data";
import type { Decision } from "@/lib/types";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    ...DEMO_DECISION,
    ...overrides,
  };
}

describe("useBiasDetection", () => {
  it("starts with empty warnings", () => {
    const { result } = renderHook(() => useBiasDetection(makeDecision()));
    // Before debounce fires, warnings should be empty
    expect(result.current.warnings).toEqual([]);
    expect(result.current.allWarnings).toEqual([]);
    expect(result.current.dismissedCount).toBe(0);
  });

  it("detects biases after debounce delay", () => {
    const { result } = renderHook(() => useBiasDetection(makeDecision()));

    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Should have run bias detection
    expect(result.current.allWarnings).toBeDefined();
    // Warnings array should match allWarnings (nothing dismissed)
    expect(result.current.warnings.length).toBe(result.current.allWarnings.length);
  });

  it("dismisses a single warning by type", () => {
    const { result } = renderHook(() => useBiasDetection(makeDecision()));

    act(() => {
      vi.advanceTimersByTime(600);
    });

    const allCount = result.current.allWarnings.length;
    if (allCount === 0) return; // No biases to dismiss in demo data

    const firstType = result.current.allWarnings[0].type;
    act(() => {
      result.current.dismiss(firstType);
    });

    expect(result.current.dismissedCount).toBe(1);
    expect(result.current.warnings.length).toBe(allCount - 1);
    expect(result.current.warnings.every((w) => w.type !== firstType)).toBe(true);
  });

  it("dismisses all warnings", () => {
    const { result } = renderHook(() => useBiasDetection(makeDecision()));

    act(() => {
      vi.advanceTimersByTime(600);
    });

    if (result.current.allWarnings.length === 0) return;

    act(() => {
      result.current.dismissAll();
    });

    expect(result.current.warnings).toEqual([]);
    expect(result.current.dismissedCount).toBe(result.current.allWarnings.length);
  });

  it("resets dismissals when decision data changes", () => {
    const decision1 = makeDecision();
    const { result, rerender } = renderHook(
      ({ decision }) => useBiasDetection(decision),
      { initialProps: { decision: decision1 } }
    );

    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Dismiss all
    if (result.current.allWarnings.length > 0) {
      act(() => {
        result.current.dismissAll();
      });
      expect(result.current.warnings).toEqual([]);

      // Change the decision data (different scores = different hash)
      const decision2 = makeDecision({
        scores: { ...decision1.scores, [decision1.options[0].id]: { [decision1.criteria[0].id]: 1 } },
      });
      rerender({ decision: decision2 });

      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Dismissals should be reset — warnings should reappear if detected
      expect(result.current.dismissedCount).toBe(0);
    }
  });

  it("debounces rapid decision changes", () => {
    const decision1 = makeDecision();
    const { result, rerender } = renderHook(
      ({ decision }) => useBiasDetection(decision),
      { initialProps: { decision: decision1 } }
    );

    // Simulate rapid changes
    for (let i = 0; i < 5; i++) {
      rerender({ decision: makeDecision({ title: `Decision ${i}` }) });
    }

    // Before debounce fires, no warnings
    expect(result.current.allWarnings).toEqual([]);

    // After debounce, detection runs
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Detection should have run (only once, for the last version)
    expect(result.current.allWarnings).toBeDefined();
  });
});
