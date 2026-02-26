/**
 * Tests for WhatIfPanel component.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/93
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { WhatIfPanel } from "@/components/WhatIfPanel";
import { computeResults } from "@/lib/scoring";
import type { Decision, DecisionResults } from "@/lib/types";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "test-1",
    title: "Test Decision",
    description: "",
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
    ],
    criteria: [
      { id: "c1", name: "Cost", weight: 60, type: "cost" },
      { id: "c2", name: "Quality", weight: 40, type: "benefit" },
    ],
    scores: {
      o1: { c1: 3, c2: 8 },
      o2: { c1: 7, c2: 5 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function setup(decision?: Decision) {
  const d = decision ?? makeDecision();
  const originalResults = computeResults(d);
  const onApply = vi.fn();
  const onClose = vi.fn();

  const utils = render(
    <WhatIfPanel
      decision={d}
      originalResults={originalResults}
      onApply={onApply}
      onClose={onClose}
    />
  );

  return { ...utils, decision: d, originalResults, onApply, onClose };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WhatIfPanel", () => {
  it("renders the modal with dialog role", () => {
    setup();
    expect(screen.getByRole("dialog", { name: /what-if analysis/i })).toBeInTheDocument();
  });

  it("displays the panel title", () => {
    setup();
    expect(screen.getByText("What-If Analysis")).toBeInTheDocument();
  });

  it("renders weight sliders for each criterion", () => {
    setup();
    expect(screen.getByLabelText(/cost weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quality weight/i)).toBeInTheDocument();
  });

  it("renders the score matrix with all options and criteria", () => {
    setup();
    const matrix = screen.getByTestId("whatif-score-matrix");
    expect(within(matrix).getByText("Option A")).toBeInTheDocument();
    expect(within(matrix).getByText("Option B")).toBeInTheDocument();
    expect(within(matrix).getByText("Cost")).toBeInTheDocument();
    expect(within(matrix).getByText("Quality")).toBeInTheDocument();
  });

  it("renders original and what-if ranking columns", () => {
    setup();
    const rankings = screen.getByTestId("whatif-rankings");
    expect(within(rankings).getByText("Original")).toBeInTheDocument();
    expect(within(rankings).getByText("What-If")).toBeInTheDocument();
  });

  it("shows both options in original rankings", () => {
    setup();
    const rankings = screen.getByTestId("whatif-rankings");
    expect(within(rankings).getAllByText("Option A").length).toBeGreaterThanOrEqual(1);
    expect(within(rankings).getAllByText("Option B").length).toBeGreaterThanOrEqual(1);
  });

  it("Apply button is disabled when no changes are made", () => {
    setup();
    const applyBtn = screen.getByTestId("whatif-apply");
    expect(applyBtn).toBeDisabled();
  });

  it("Reset button is disabled when no changes are made", () => {
    setup();
    const resetBtn = screen.getByTestId("whatif-reset");
    expect(resetBtn).toBeDisabled();
  });

  it("enables Apply and Reset after changing a weight", () => {
    setup();
    const costSlider = screen.getByLabelText(/cost weight/i);
    fireEvent.change(costSlider, { target: { value: "80" } });

    expect(screen.getByTestId("whatif-apply")).not.toBeDisabled();
    expect(screen.getByTestId("whatif-reset")).not.toBeDisabled();
  });

  it("enables Apply after changing a score", () => {
    setup();
    const scoreInputs = screen.getAllByLabelText(/score$/i);
    // Change first score input
    fireEvent.change(scoreInputs[0], { target: { value: "5" } });

    expect(screen.getByTestId("whatif-apply")).not.toBeDisabled();
  });

  it("calls onClose when close button is clicked", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByLabelText(/close what-if panel/i));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByTestId("whatif-panel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onApply with modified weights and scores when Apply is clicked", () => {
    const { onApply, decision } = setup();

    // Change cost weight to 80
    const costSlider = screen.getByLabelText(/cost weight/i);
    fireEvent.change(costSlider, { target: { value: "80" } });

    fireEvent.click(screen.getByTestId("whatif-apply"));

    expect(onApply).toHaveBeenCalledOnce();
    const [weights, scores] = onApply.mock.calls[0];
    expect(weights[0]).toBe(80); // Cost weight changed
    expect(weights[1]).toBe(40); // Quality weight unchanged
    // Scores should be the original numeric values
    expect(scores[decision.options[0].id][decision.criteria[0].id]).toBe(3);
  });

  it("resets to original values when Reset is clicked", () => {
    setup();

    // Change weight
    const costSlider = screen.getByLabelText(/cost weight/i) as HTMLInputElement;
    fireEvent.change(costSlider, { target: { value: "80" } });
    expect(screen.getByTestId("whatif-apply")).not.toBeDisabled();

    // Click reset
    fireEvent.click(screen.getByTestId("whatif-reset"));

    // Apply should be disabled again (no changes)
    expect(screen.getByTestId("whatif-apply")).toBeDisabled();
  });

  it("shows rank change indicators when rankings differ", () => {
    // Option A: great speed (9), great price (2, low cost = good)
    // Option B: mediocre speed (5), bad price (8, high cost = bad)
    // At equal weights both criteria matter => A wins
    // Flip: set Speed=0, Price=100 => price dominates => still A wins on price
    // Need a scenario where A wins originally but flips:
    // A: speed=9, price=8 (expensive)  B: speed=5, price=2 (cheap)
    // At speed=100, price=0: A wins (9 vs 5)
    // At speed=0, price=100: B wins (cost effective: 10-2=8 vs 10-8=2)
    const d = makeDecision({
      criteria: [
        { id: "c1", name: "Speed", weight: 100, type: "benefit" },
        { id: "c2", name: "Price", weight: 0, type: "cost" },
      ],
      scores: {
        o1: { c1: 9, c2: 8 }, // Great speed, expensive
        o2: { c1: 5, c2: 2 }, // Mediocre speed, cheap
      },
    });

    const originalResults = computeResults(d);
    // Verify A wins originally
    expect(originalResults.optionResults[0].optionId).toBe("o1");

    const onApply = vi.fn();
    const onClose = vi.fn();

    render(
      <WhatIfPanel
        decision={d}
        originalResults={originalResults}
        onApply={onApply}
        onClose={onClose}
      />
    );

    // Flip: Speed=0, Price=100 => B wins on price
    const speedSlider = screen.getByLabelText(/speed weight/i);
    fireEvent.change(speedSlider, { target: { value: "0" } });

    const priceSlider = screen.getByLabelText(/price weight/i);
    fireEvent.change(priceSlider, { target: { value: "100" } });

    // Should show rank change arrows in the What-If column
    const rankings = screen.getByTestId("whatif-rankings");
    const arrows = within(rankings).getAllByLabelText(/up|down/i);
    expect(arrows.length).toBeGreaterThan(0);
  });
});
