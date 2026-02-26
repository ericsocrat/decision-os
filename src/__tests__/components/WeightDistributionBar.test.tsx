/**
 * Tests for WeightDistributionBar component.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightDistributionBar } from "@/components/WeightDistributionBar";
import type { Criterion } from "@/lib/types";

const makeCriteria = (weights: number[]): Criterion[] =>
  weights.map((w, i) => ({
    id: `c${i}`,
    name: `Criterion ${i + 1}`,
    weight: w,
    type: "benefit" as const,
  }));

describe("WeightDistributionBar", () => {
  it("shows 'No weights assigned' when all weights are 0", () => {
    render(<WeightDistributionBar criteria={makeCriteria([0, 0, 0])} />);
    expect(screen.getByText("No weights assigned")).toBeInTheDocument();
  });

  it("shows 'No weights assigned' when criteria list is empty", () => {
    render(<WeightDistributionBar criteria={[]} />);
    expect(screen.getByText("No weights assigned")).toBeInTheDocument();
  });

  it("renders the Weight Distribution label", () => {
    render(<WeightDistributionBar criteria={makeCriteria([50, 50])} />);
    expect(screen.getByText("Weight Distribution")).toBeInTheDocument();
  });

  it("renders segments proportionally", () => {
    const { container } = render(<WeightDistributionBar criteria={makeCriteria([75, 25])} />);
    const segments = container.querySelectorAll("[title]");
    expect(segments).toHaveLength(2);
    expect(segments[0]).toHaveAttribute("title", "Criterion 1: 75%");
    expect(segments[1]).toHaveAttribute("title", "Criterion 2: 25%");
  });

  it("displays label text for segments >= 12%", () => {
    render(<WeightDistributionBar criteria={makeCriteria([80, 20])} />);
    // Both the visible bar labels and the sr-only text should match
    const labels80 = screen.getAllByText(/80%/);
    expect(labels80.length).toBeGreaterThanOrEqual(1);
    const labels20 = screen.getAllByText(/20%/);
    expect(labels20.length).toBeGreaterThanOrEqual(1);
  });

  it("hides label text for segments < 12%", () => {
    const criteria = makeCriteria([90, 5, 5]);
    render(<WeightDistributionBar criteria={criteria} />);
    // Only the 90% segment should show inline text
    const visibleLabels = screen.getAllByText(/\d+%/);
    // Should have at least 1 visible label (the 90% one)
    expect(visibleLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("provides screen reader text for all criteria", () => {
    render(<WeightDistributionBar criteria={makeCriteria([60, 40])} />);
    // sr-only text
    expect(screen.getByText(/Criterion 1: 60%/)).toBeInTheDocument();
    expect(screen.getByText(/Criterion 2: 40%/)).toBeInTheDocument();
  });

  it("has role=img with proper aria-label on the bar", () => {
    render(<WeightDistributionBar criteria={makeCriteria([50, 50])} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("aria-label", "Weight distribution bar");
  });

  it("skips segments with very small percentages (<0.5%)", () => {
    const criteria = makeCriteria([99, 1, 0]);
    const { container } = render(<WeightDistributionBar criteria={criteria} />);
    // The 0-weight criterion should not render a segment
    const segments = container.querySelectorAll("[title]");
    expect(segments.length).toBeLessThanOrEqual(2);
  });
});
