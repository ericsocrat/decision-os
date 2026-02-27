/**
 * Tests for DecisionSkeleton loading placeholder.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DecisionSkeleton } from "@/components/DecisionSkeleton";

describe("DecisionSkeleton", () => {
  it("renders with aria-busy", () => {
    const { container } = render(<DecisionSkeleton />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-busy", "true");
  });

  it("has accessible loading label", () => {
    const { container } = render(<DecisionSkeleton />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute("aria-label", "Loading decision…");
  });

  it("renders skeleton sections", () => {
    const { container } = render(<DecisionSkeleton />);
    const sections = container.querySelectorAll("section");
    // Title, Options, Criteria, Scores = 4 sections
    expect(sections.length).toBe(4);
  });

  it("has animate-pulse class", () => {
    const { container } = render(<DecisionSkeleton />);
    expect(container.firstElementChild?.className).toContain("animate-pulse");
  });
});
