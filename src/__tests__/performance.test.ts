/**
 * Performance benchmarks for large decision matrices.
 *
 * Verifies that core operations stay under target thresholds:
 *   - computeResults:       < 100ms for 10×10, < 500ms for 20×20
 *   - sensitivityAnalysis:  < 100ms for 10×10
 *   - Score matrix creation: < 50ms for 10×10
 *
 * @see https://github.com/ericsocrat/decision-os/issues/121
 */

import { describe, it, expect } from "vitest";
import type { Decision, Criterion, Option } from "@/lib/types";
import { computeResults, sensitivityAnalysis } from "@/lib/scoring";
import { computeTopsisResults } from "@/lib/topsis";
import { computeRegretResults } from "@/lib/regret";
import { generateId } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Generate a synthetic decision with the given dimensions.
 * Scores are randomized between 1–10.
 */
function createLargeDecision(optionCount: number, criterionCount: number): Decision {
  const options: Option[] = Array.from(
    { length: optionCount },
    (_, i): Option => ({
      id: generateId(),
      name: `Option ${String(i + 1)}`,
    })
  );

  const criteria: Criterion[] = Array.from(
    { length: criterionCount },
    (_, i): Criterion => ({
      id: generateId(),
      name: `Criterion ${String(i + 1)}`,
      weight: Math.round(100 / criterionCount),
      type: i % 3 === 0 ? "cost" : "benefit",
    })
  );

  const scores: Decision["scores"] = {};
  for (const opt of options) {
    scores[opt.id] = {};
    for (const crit of criteria) {
      scores[opt.id][crit.id] = Math.round(Math.random() * 9) + 1;
    }
  }

  return {
    id: generateId(),
    title: `Benchmark ${String(optionCount)}×${String(criterionCount)}`,
    description: "Synthetic decision for performance testing",
    options,
    criteria,
    scores,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Measure execution time of a function in milliseconds.
 * Runs the function once and returns elapsed time.
 */
function measureMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

// ── Benchmarks ─────────────────────────────────────────────────────

describe("Performance benchmarks", () => {
  // ── 10×10 matrix ──

  describe("10×10 decision matrix", () => {
    const decision = createLargeDecision(10, 10);

    it("computeResults completes in < 100ms", () => {
      const elapsed = measureMs(() => {
        computeResults(decision);
      });
      console.log(`  computeResults(10×10): ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(100);
    });

    it("sensitivityAnalysis completes in < 100ms", () => {
      const elapsed = measureMs(() => {
        sensitivityAnalysis(decision, 20);
      });
      console.log(`  sensitivityAnalysis(10×10): ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(100);
    });

    it("TOPSIS + Regret complete in < 100ms combined", () => {
      const elapsed = measureMs(() => {
        computeTopsisResults(decision);
        computeRegretResults(decision);
      });
      console.log(`  TOPSIS+Regret(10×10): ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(100);
    });
  });

  // ── 20×20 matrix ──

  describe("20×20 decision matrix", () => {
    const decision = createLargeDecision(20, 20);

    it("computeResults completes in < 500ms", () => {
      const elapsed = measureMs(() => {
        computeResults(decision);
      });
      console.log(`  computeResults(20×20): ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(500);
    });

    it("all scoring algorithms complete in < 500ms combined", () => {
      const elapsed = measureMs(() => {
        computeResults(decision);
        computeTopsisResults(decision);
        computeRegretResults(decision);
        sensitivityAnalysis(decision, 20);
      });
      console.log(`  all algorithms(20×20): ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(500);
    });
  });

  // ── Score matrix creation ──

  describe("large decision creation", () => {
    it("creates a 10×10 decision in < 50ms", () => {
      const elapsed = measureMs(() => {
        createLargeDecision(10, 10);
      });
      console.log(`  createLargeDecision(10×10): ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(50);
    });

    it("creates a 20×20 decision in < 100ms", () => {
      const elapsed = measureMs(() => {
        createLargeDecision(20, 20);
      });
      console.log(`  createLargeDecision(20×20): ${elapsed.toFixed(2)}ms`);
      expect(elapsed).toBeLessThan(100);
    });
  });

  // ── Context hook isolation ──

  describe("context split verification", () => {
    it("focused hook types are exported correctly", async () => {
      const mod = await import("@/components/DecisionProvider");
      expect(typeof mod.useDecisionData).toBe("function");
      expect(typeof mod.useResultsContext).toBe("function");
      expect(typeof mod.useActions).toBe("function");
      // Backward-compatible hook still exists
      expect(typeof mod.useDecision).toBe("function");
      expect(typeof mod.useDecisionState).toBe("function");
      expect(typeof mod.useDecisionDispatch).toBe("function");
    });
  });
});
