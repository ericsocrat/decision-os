/**
 * Tests for HybridResults — multi-algorithm consensus ranking display.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HybridResults, buildHybridSummary } from "@/components/HybridResults";
import type { Decision, DecisionResults } from "@/lib/types";
import type { TopsisResults, TopsisOptionResult } from "@/lib/topsis";
import type { RegretResults, RegretOptionResult } from "@/lib/regret";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDecision(optionCount: number): Decision {
  const options = Array.from({ length: optionCount }, (_, i) => ({
    id: `opt-${i + 1}`,
    name: `Option ${String.fromCharCode(65 + i)}`,
  }));
  return {
    id: "d1",
    title: "Test Decision",
    options,
    criteria: [
      { id: "c1", name: "Cost", weight: 5, type: "cost" as const },
      { id: "c2", name: "Quality", weight: 5, type: "benefit" as const },
    ],
    scores: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeWsmResults(ranks: number[]): DecisionResults {
  return {
    decisionId: "d1",
    optionResults: ranks.map((rank, i) => ({
      optionId: `opt-${i + 1}`,
      optionName: `Option ${String.fromCharCode(65 + i)}`,
      totalScore: 10 - rank,
      rank,
      criterionScores: [],
    })),
    topDrivers: [],
  };
}

function makeTopsisResults(ranks: number[]): TopsisResults {
  return {
    rankings: ranks.map((rank, i) => ({
      optionId: `opt-${i + 1}`,
      optionName: `Option ${String.fromCharCode(65 + i)}`,
      closenessCoefficient: 1 - rank * 0.1,
      distanceToIdeal: rank * 0.1,
      distanceToAntiIdeal: 1 - rank * 0.1,
      rank,
    })) as TopsisOptionResult[],
    idealSolution: {},
    antiIdealSolution: {},
    method: "topsis" as const,
  };
}

function makeRegretResults(ranks: number[]): RegretResults {
  return {
    rankings: ranks.map((rank, i) => ({
      optionId: `opt-${i + 1}`,
      optionName: `Option ${String.fromCharCode(65 + i)}`,
      maxRegret: rank * 0.1,
      maxRegretCriterion: "c1",
      avgRegret: rank * 0.05,
      rank,
    })) as RegretOptionResult[],
    regretMatrix: {},
    bestPerCriterion: {},
    method: "minimax-regret" as const,
  };
}

// ---------------------------------------------------------------------------
// buildHybridSummary — pure logic tests
// ---------------------------------------------------------------------------

describe("buildHybridSummary", () => {
  it("detects unanimous consensus when all algorithms agree", () => {
    const decision = makeDecision(3);
    const summary = buildHybridSummary(
      makeWsmResults([1, 2, 3]),
      makeTopsisResults([1, 2, 3]),
      makeRegretResults([1, 2, 3]),
      decision
    );

    expect(summary.agreementCount).toBe(3);
    expect(summary.winnerName).toBe("Option A");
    expect(summary.summaryText).toContain("All 3 algorithms agree");
    expect(summary.rows.every((r) => r.consensus === "unanimous")).toBe(true);
  });

  it("detects 2-of-3 agreement when one method disagrees on the winner", () => {
    const decision = makeDecision(3);
    const summary = buildHybridSummary(
      makeWsmResults([1, 2, 3]),
      makeTopsisResults([1, 2, 3]),
      makeRegretResults([2, 1, 3]), // Regret picks Option B
      decision
    );

    expect(summary.agreementCount).toBe(2);
    expect(summary.winnerName).toBe("Option A");
    expect(summary.summaryText).toContain("2 of 3 algorithms agree");
  });

  it("detects all-different winners", () => {
    const decision = makeDecision(3);
    const summary = buildHybridSummary(
      makeWsmResults([1, 2, 3]), // A wins
      makeTopsisResults([2, 1, 3]), // B wins
      makeRegretResults([3, 2, 1]), // C wins
      decision
    );

    expect(summary.agreementCount).toBe(1);
    expect(summary.summaryText).toContain("different winners");
  });

  it("marks rows as near when rank spread is 1", () => {
    const decision = makeDecision(3);
    const summary = buildHybridSummary(
      makeWsmResults([1, 2, 3]),
      makeTopsisResults([1, 3, 2]), // B and C swapped
      makeRegretResults([1, 2, 3]),
      decision
    );

    const optB = summary.rows.find((r) => r.optionId === "opt-2")!;
    expect(optB.consensus).toBe("near");
    expect(optB.maxRankSpread).toBe(1);
  });

  it("marks rows as divergent when rank spread is 2+", () => {
    const decision = makeDecision(3);
    const summary = buildHybridSummary(
      makeWsmResults([1, 2, 3]),
      makeTopsisResults([3, 1, 2]), // A drastically different
      makeRegretResults([1, 2, 3]),
      decision
    );

    const optA = summary.rows.find((r) => r.optionId === "opt-1")!;
    expect(optA.consensus).toBe("divergent");
    expect(optA.maxRankSpread).toBe(2);
  });

  it("sorts rows by average rank (best first)", () => {
    const decision = makeDecision(3);
    const summary = buildHybridSummary(
      makeWsmResults([1, 2, 3]),
      makeTopsisResults([1, 2, 3]),
      makeRegretResults([1, 2, 3]),
      decision
    );

    expect(summary.rows[0].optionId).toBe("opt-1");
    expect(summary.rows[1].optionId).toBe("opt-2");
    expect(summary.rows[2].optionId).toBe("opt-3");
  });

  it("handles two options", () => {
    const decision = makeDecision(2);
    const summary = buildHybridSummary(
      makeWsmResults([1, 2]),
      makeTopsisResults([1, 2]),
      makeRegretResults([2, 1]),
      decision
    );

    expect(summary.rows).toHaveLength(2);
    expect(summary.agreementCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// HybridResults component tests
// ---------------------------------------------------------------------------

describe("HybridResults", () => {
  it("renders the consensus table with correct columns", () => {
    const decision = makeDecision(3);
    render(
      <HybridResults
        results={makeWsmResults([1, 2, 3])}
        topsisResults={makeTopsisResults([1, 2, 3])}
        regretResults={makeRegretResults([1, 2, 3])}
        decision={decision}
      />
    );

    expect(screen.getByTestId("consensus-table")).toBeInTheDocument();
    expect(screen.getByText("Option")).toBeInTheDocument();
    expect(screen.getByText("WSM")).toBeInTheDocument();
    expect(screen.getByText("TOPSIS")).toBeInTheDocument();
    expect(screen.getByText("Regret")).toBeInTheDocument();
    expect(screen.getByText("Consensus")).toBeInTheDocument();
  });

  it("displays all option names", () => {
    const decision = makeDecision(3);
    render(
      <HybridResults
        results={makeWsmResults([1, 2, 3])}
        topsisResults={makeTopsisResults([1, 2, 3])}
        regretResults={makeRegretResults([1, 2, 3])}
        decision={decision}
      />
    );

    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
    expect(screen.getByText("Option C")).toBeInTheDocument();
  });

  it("renders rank numbers for each method", () => {
    const decision = makeDecision(2);
    render(
      <HybridResults
        results={makeWsmResults([1, 2])}
        topsisResults={makeTopsisResults([2, 1])}
        regretResults={makeRegretResults([1, 2])}
        decision={decision}
      />
    );

    // Option A: WSM #1, TOPSIS #2, Regret #1
    const cells = screen.getAllByText(/#[12]/);
    expect(cells.length).toBeGreaterThanOrEqual(4);
  });

  it("shows summary text for full agreement", () => {
    const decision = makeDecision(2);
    render(
      <HybridResults
        results={makeWsmResults([1, 2])}
        topsisResults={makeTopsisResults([1, 2])}
        regretResults={makeRegretResults([1, 2])}
        decision={decision}
      />
    );

    const summary = screen.getByTestId("consensus-summary");
    expect(summary.textContent).toContain("All 3 algorithms agree");
    expect(summary.textContent).toContain("Option A");
  });

  it("shows unanimous consensus labels when all methods agree", () => {
    const decision = makeDecision(2);
    render(
      <HybridResults
        results={makeWsmResults([1, 2])}
        topsisResults={makeTopsisResults([1, 2])}
        regretResults={makeRegretResults([1, 2])}
        decision={decision}
      />
    );

    const unanimousLabels = screen.getAllByText("✓ Unanimous");
    expect(unanimousLabels).toHaveLength(2);
  });

  it("shows divergent label when methods strongly disagree", () => {
    const decision = makeDecision(3);
    render(
      <HybridResults
        results={makeWsmResults([1, 2, 3])}
        topsisResults={makeTopsisResults([3, 2, 1])}
        regretResults={makeRegretResults([1, 2, 3])}
        decision={decision}
      />
    );

    expect(screen.getAllByText("✗ Divergent").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the color legend", () => {
    const decision = makeDecision(2);
    render(
      <HybridResults
        results={makeWsmResults([1, 2])}
        topsisResults={makeTopsisResults([1, 2])}
        regretResults={makeRegretResults([1, 2])}
        decision={decision}
      />
    );

    expect(screen.getByText(/Unanimous — all methods agree/)).toBeInTheDocument();
    expect(screen.getByText(/Close — 1 rank difference/)).toBeInTheDocument();
    expect(screen.getByText(/Divergent — 2\+ rank difference/)).toBeInTheDocument();
  });

  it("shows empty message when no options", () => {
    const decision = makeDecision(0);
    render(
      <HybridResults
        results={makeWsmResults([])}
        topsisResults={makeTopsisResults([])}
        regretResults={makeRegretResults([])}
        decision={decision}
      />
    );

    expect(screen.getByText(/Add at least 2 options/)).toBeInTheDocument();
  });
});
