import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FrameworkComparison } from "@/components/FrameworkComparison";
import { computeConsensus, ALL_ALGORITHMS, type AlgorithmId } from "@/lib/consensus";
import { computeResults } from "@/lib/scoring";
import { computeTopsisResults } from "@/lib/topsis";
import { computeRegretResults } from "@/lib/regret";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function makeDecision(
  options: { id: string; name: string }[],
  criteria: {
    id: string;
    name: string;
    weight: number;
    type: "benefit" | "cost";
  }[],
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

function simpleDecision(): Decision {
  return makeDecision(
    [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
      { id: "c", name: "Gamma" },
    ],
    [
      { id: "c1", name: "Quality", weight: 60, type: "benefit" },
      { id: "c2", name: "Speed", weight: 40, type: "benefit" },
    ],
    {
      a: { c1: 9, c2: 5 },
      b: { c1: 6, c2: 8 },
      c: { c1: 4, c2: 3 },
    }
  );
}

function dominantDecision(): Decision {
  return makeDecision(
    [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ],
    [
      { id: "c1", name: "Quality", weight: 50, type: "benefit" },
      { id: "c2", name: "Speed", weight: 50, type: "benefit" },
    ],
    {
      a: { c1: 10, c2: 10 },
      b: { c1: 2, c2: 2 },
    }
  );
}

function tinyDecision(): Decision {
  return makeDecision(
    [{ id: "a", name: "Solo" }],
    [{ id: "c1", name: "Q", weight: 100, type: "benefit" }],
    { a: { c1: 7 } }
  );
}

function renderComparison(decision: Decision) {
  const results = computeResults(decision);
  const topsisResults = computeTopsisResults(decision);
  const regretResults = computeRegretResults(decision);
  return render(
    <FrameworkComparison
      decision={decision}
      results={results}
      topsisResults={topsisResults}
      regretResults={regretResults}
    />
  );
}

// ---------------------------------------------------------------------------
//  Pure logic tests (consensus engine integration)
// ---------------------------------------------------------------------------

describe("FrameworkComparison — pure logic via consensus engine", () => {
  it("computeConsensus returns valid results for the simple decision", () => {
    const d = simpleDecision();
    const result = computeConsensus(d);
    expect(result.rankings.length).toBe(3);
    expect(result.algorithmCount).toBe(3);
    expect(result.overallAgreement).toBeGreaterThanOrEqual(0);
    expect(result.overallAgreement).toBeLessThanOrEqual(1);
  });

  it("dominant decision produces high agreement", () => {
    const result = computeConsensus(dominantDecision());
    expect(result.overallAgreement).toBeGreaterThanOrEqual(0.7);
  });

  it("subset of algorithms works correctly", () => {
    const result = computeConsensus(simpleDecision(), ["wsm", "topsis"]);
    expect(result.algorithmCount).toBe(2);
    expect(result.pairwiseCorrelations.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
//  Component tests
// ---------------------------------------------------------------------------

describe("FrameworkComparison — component", () => {
  it("renders the comparison table with all options", () => {
    renderComparison(simpleDecision());
    const table = screen.getByTestId("comparison-table");
    expect(table).toBeDefined();
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.getByText("Gamma")).toBeDefined();
  });

  it("shows algorithm selector with all 3 algorithms", () => {
    renderComparison(simpleDecision());
    const selector = screen.getByTestId("algorithm-selector");
    expect(selector).toBeDefined();

    expect(within(selector).getByText("WSM")).toBeDefined();
    expect(within(selector).getByText("TOPSIS")).toBeDefined();
    expect(within(selector).getByText("Regret")).toBeDefined();
  });

  it("shows agreement indicator", () => {
    renderComparison(simpleDecision());
    const indicator = screen.getByTestId("agreement-indicator");
    expect(indicator).toBeDefined();
    // Should contain Kendall's W value
    expect(indicator.textContent).toContain("Kendall");
  });

  it("shows recommendation text", () => {
    renderComparison(simpleDecision());
    const reco = screen.getByTestId("recommendation-text");
    expect(reco).toBeDefined();
    expect(reco.textContent!.length).toBeGreaterThan(10);
  });

  it("shows empty state for fewer than 2 options", () => {
    renderComparison(tinyDecision());
    const empty = screen.getByTestId("framework-empty");
    expect(empty).toBeDefined();
    expect(empty.textContent).toContain("at least 2 options");
  });

  it("toggles algorithm info cards", async () => {
    const user = userEvent.setup();
    renderComparison(simpleDecision());

    // Cards should be hidden initially
    expect(screen.queryByTestId("algorithm-info-cards")).toBeNull();

    // Click show
    const toggle = screen.getByTestId("toggle-info-cards");
    await user.click(toggle);

    // Cards should now be visible
    const cards = screen.getByTestId("algorithm-info-cards");
    expect(cards).toBeDefined();
    expect(cards.textContent).toContain("Weighted Sum Model");
    expect(cards.textContent).toContain("TOPSIS");
    expect(cards.textContent).toContain("Minimax Regret");

    // Click hide
    await user.click(toggle);
    expect(screen.queryByTestId("algorithm-info-cards")).toBeNull();
  });

  it("disabling an algorithm updates results", async () => {
    const user = userEvent.setup();
    renderComparison(simpleDecision());

    // Find the WSM checkbox within the algorithm selector
    const selector = screen.getByTestId("algorithm-selector");
    const checkboxes = within(selector).getAllByRole("checkbox");
    // 3 checkboxes for 3 algorithms
    expect(checkboxes.length).toBe(3);

    // Uncheck the third algorithm (Regret)
    const regretCheckbox = checkboxes[2];
    await user.click(regretCheckbox);

    // Table header should no longer contain "Regret" column
    const table = screen.getByTestId("comparison-table");
    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).not.toContain("Regret");
  });

  it("does not allow disabling all algorithms", async () => {
    const user = userEvent.setup();
    renderComparison(dominantDecision());

    const selector = screen.getByTestId("algorithm-selector");
    const checkboxes = within(selector).getAllByRole("checkbox");

    // Disable 2 of 3 — only 1 should remain checked
    await user.click(checkboxes[1]); // disable TOPSIS
    await user.click(checkboxes[2]); // disable Regret

    // Try to disable the last one — should be prevented
    await user.click(checkboxes[0]); // try to disable WSM

    // Should still have at least one enabled
    const checked = checkboxes.filter((cb) => (cb as HTMLInputElement).checked);
    expect(checked.length).toBeGreaterThanOrEqual(1);
  });

  it("displays pairwise correlations", () => {
    renderComparison(simpleDecision());
    const correlations = screen.getByTestId("pairwise-correlations");
    expect(correlations).toBeDefined();
    // 3 algorithms → 3 pairs
    expect(correlations.textContent).toContain("WSM");
    expect(correlations.textContent).toContain("TOPSIS");
  });

  it("shows winner with trophy emoji", () => {
    renderComparison(dominantDecision());
    const table = screen.getByTestId("comparison-table");
    const rows = within(table).getAllByRole("row");
    // First data row (index 1, since row 0 is header) should contain winner marker
    const firstDataRow = rows[1];
    expect(firstDataRow.textContent).toContain("🏆");
  });

  it("renders Borda scores in the table", () => {
    renderComparison(simpleDecision());
    const table = screen.getByTestId("comparison-table");
    const headers = within(table).getAllByRole("columnheader");
    const bordaHeader = headers.find((h) => h.textContent === "Borda");
    expect(bordaHeader).toBeDefined();
  });

  it("renders consensus badges (Agreed/Mixed/Divergent)", () => {
    renderComparison(simpleDecision());
    const table = screen.getByTestId("comparison-table");
    const tableText = table.textContent!;
    // Should contain at least one consensus badge
    const hasBadge =
      tableText.includes("Agreed") ||
      tableText.includes("Mixed") ||
      tableText.includes("Divergent");
    expect(hasBadge).toBe(true);
  });

  it("shows strong agreement for dominant decision", () => {
    renderComparison(dominantDecision());
    const indicator = screen.getByTestId("agreement-indicator");
    expect(indicator.textContent).toContain("Strong agreement");
    expect(indicator.textContent).toContain("1.00");
  });

  it("renders correctly with only 2 algorithms enabled", async () => {
    const user = userEvent.setup();
    renderComparison(simpleDecision());

    // Disable one algorithm
    const selector = screen.getByTestId("algorithm-selector");
    const checkboxes = within(selector).getAllByRole("checkbox");
    await user.click(checkboxes[2]); // disable Regret

    // Table should still render
    const table = screen.getByTestId("comparison-table");
    expect(table).toBeDefined();

    // Agreement indicator should update
    const indicator = screen.getByTestId("agreement-indicator");
    expect(indicator.textContent).toContain("2 algorithms");
  });
});
