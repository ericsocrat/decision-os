/**
 * Tests for CompletionRing component.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompletionRing } from "@/components/CompletionRing";
import type { CompletenessResult } from "@/lib/completeness";

function makeCompleteness(overrides: Partial<CompletenessResult> = {}): CompletenessResult {
  return {
    filled: 4,
    total: 6,
    ratio: 4 / 6,
    percent: 67,
    tier: "green",
    ...overrides,
  };
}

describe("CompletionRing", () => {
  it("renders percentage text", () => {
    render(<CompletionRing completeness={makeCompleteness()} />);
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("renders filled/total label", () => {
    render(<CompletionRing completeness={makeCompleteness()} />);
    expect(screen.getByText("4/6 scores filled")).toBeInTheDocument();
  });

  it("shows 'fully informed' message at 100%", () => {
    render(
      <CompletionRing
        completeness={makeCompleteness({ filled: 6, total: 6, ratio: 1, percent: 100, tier: "blue" })}
      />
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText(/fully informed/)).toBeInTheDocument();
  });

  it("shows 'fill all scores' message when incomplete", () => {
    render(<CompletionRing completeness={makeCompleteness({ percent: 50 })} />);
    expect(screen.getByText(/Fill all scores/)).toBeInTheDocument();
  });

  it("renders SVG with correct size", () => {
    const { container } = render(
      <CompletionRing completeness={makeCompleteness()} size={120} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "120");
    expect(svg).toHaveAttribute("height", "120");
  });

  it("has role=status for live updates", () => {
    render(<CompletionRing completeness={makeCompleteness()} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
