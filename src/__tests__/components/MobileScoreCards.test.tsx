/**
 * MobileScoreCards & ScoreSlider — Unit Tests
 *
 * Covers:
 *  - ScoreSlider rendering, value display, change handler
 *  - MobileScoreCards accordion behavior
 *  - Option card expand/collapse
 *  - Score change propagation
 *  - WCAG accessibility attributes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScoreSlider } from "@/components/ScoreSlider";
import { MobileScoreCards } from "@/components/MobileScoreCards";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
// ScoreSlider
// ---------------------------------------------------------------------------

describe("ScoreSlider", () => {
  it("renders a range input with correct attributes", () => {
    render(<ScoreSlider value={5} onChange={vi.fn()} label="Test slider" />);

    const slider = screen.getByRole("slider", { name: "Test slider" });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "10");
    expect(slider).toHaveAttribute("step", "1");
    expect(slider).toHaveAttribute("aria-valuenow", "5");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "10");
  });

  it("displays the current value", () => {
    render(<ScoreSlider value={7} onChange={vi.fn()} label="Test" />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("calls onChange when slider value changes", () => {
    const onChange = vi.fn();
    render(<ScoreSlider value={3} onChange={onChange} label="Test" />);

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "8" } });
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it("accepts custom min/max/step", () => {
    render(<ScoreSlider value={2} onChange={vi.fn()} label="Custom" min={1} max={5} step={0.5} />);

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "5");
    expect(slider).toHaveAttribute("step", "0.5");
  });
});

// ---------------------------------------------------------------------------
// MobileScoreCards
// ---------------------------------------------------------------------------

function makeDecision(): Decision {
  return {
    id: "test-1",
    title: "Test Decision",
    description: "",
    options: [
      { id: "opt-a", name: "Option Alpha" },
      { id: "opt-b", name: "Option Beta" },
      { id: "opt-c", name: "Option Gamma" },
    ],
    criteria: [
      { id: "c1", name: "Cost", weight: 40, type: "cost" },
      { id: "c2", name: "Quality", weight: 60, type: "benefit", description: "Build quality" },
    ],
    scores: {
      "opt-a": { c1: 3, c2: 8 },
      "opt-b": { c1: 7, c2: 5 },
      "opt-c": { c1: 5, c2: 6 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("MobileScoreCards", () => {
  let decision: Decision;
  let updateScore: ReturnType<
    typeof vi.fn<(optionId: string, criterionId: string, value: number | null) => void>
  >;

  beforeEach(() => {
    decision = makeDecision();
    updateScore = vi.fn<(optionId: string, criterionId: string, value: number | null) => void>();
  });

  it("renders a card for each option", () => {
    render(<MobileScoreCards decision={decision} updateScore={updateScore} />);

    expect(screen.getByText("Option Alpha")).toBeInTheDocument();
    expect(screen.getByText("Option Beta")).toBeInTheDocument();
    expect(screen.getByText("Option Gamma")).toBeInTheDocument();
  });

  it("renders option labels A, B, C", () => {
    render(<MobileScoreCards decision={decision} updateScore={updateScore} />);

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("first option is expanded by default", () => {
    render(<MobileScoreCards decision={decision} updateScore={updateScore} />);

    const firstToggle = screen.getByRole("button", { name: /Option Alpha/i });
    expect(firstToggle).toHaveAttribute("aria-expanded", "true");
  });

  it("other options are collapsed by default", () => {
    render(<MobileScoreCards decision={decision} updateScore={updateScore} />);

    const secondToggle = screen.getByRole("button", { name: /Option Beta/i });
    const thirdToggle = screen.getByRole("button", { name: /Option Gamma/i });
    expect(secondToggle).toHaveAttribute("aria-expanded", "false");
    expect(thirdToggle).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking a collapsed card expands it and collapses the other", () => {
    render(<MobileScoreCards decision={decision} updateScore={updateScore} />);

    // Click Beta
    fireEvent.click(screen.getByRole("button", { name: /Option Beta/i }));

    // Beta is now expanded, Alpha collapsed
    expect(screen.getByRole("button", { name: /Option Beta/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: /Option Alpha/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("clicking the expanded card collapses it", () => {
    render(<MobileScoreCards decision={decision} updateScore={updateScore} />);

    // Click Alpha (already expanded) to collapse
    fireEvent.click(screen.getByRole("button", { name: /Option Alpha/i }));
    expect(screen.getByRole("button", { name: /Option Alpha/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  it("renders sliders for each criterion in the expanded card", () => {
    render(<MobileScoreCards decision={decision} updateScore={updateScore} />);

    // Alpha is expanded — should have sliders for Cost and Quality
    const sliders = screen.getAllByRole("slider");
    // At least 2 sliders visible for the expanded option
    expect(sliders.length).toBeGreaterThanOrEqual(2);
  });

  it("displays criterion descriptions as hint text", () => {
    render(<MobileScoreCards decision={decision} updateScore={updateScore} />);

    // Quality has description "Build quality" — shown in all 3 cards
    const hints = screen.getAllByText("Build quality");
    expect(hints.length).toBe(3);
  });

  it("shows cost/benefit type labels", () => {
    render(<MobileScoreCards decision={decision} updateScore={updateScore} />);

    // Each card has both labels — 3 cards × 1 of each
    expect(screen.getAllByText("↓ cost").length).toBe(3);
    expect(screen.getAllByText("↑ benefit").length).toBe(3);
  });

  it("calls updateScore when a slider changes", () => {
    render(<MobileScoreCards decision={decision} updateScore={updateScore} />);

    // Find the first slider (Cost for Option Alpha)
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "9" } });

    expect(updateScore).toHaveBeenCalledWith("opt-a", "c1", 9);
  });

  it("has aria-label for the cards container", () => {
    const { container } = render(
      <MobileScoreCards decision={decision} updateScore={updateScore} />
    );

    const section = container.querySelector('[aria-label="Scores matrix (mobile)"]');
    expect(section).toBeInTheDocument();
  });
});
