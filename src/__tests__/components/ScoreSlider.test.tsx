/**
 * Tests for ScoreSlider component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScoreSlider } from "@/components/ScoreSlider";

describe("ScoreSlider", () => {
  it("renders with correct value and label", () => {
    render(<ScoreSlider value={5} onChange={vi.fn()} label="Speed score" />);
    const slider = screen.getByRole("slider", { name: "Speed score" });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-valuenow", "5");
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("uses default min/max/step", () => {
    render(<ScoreSlider value={0} onChange={vi.fn()} label="test" />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "10");
    expect(slider).toHaveAttribute("step", "1");
  });

  it("fires onChange with numeric value", () => {
    const onChange = vi.fn();
    render(<ScoreSlider value={3} onChange={onChange} label="test" />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("applies red color for low values (0-2)", () => {
    const { container } = render(<ScoreSlider value={1} onChange={vi.fn()} label="test" />);
    const valueSpan = container.querySelector("span");
    expect(valueSpan?.className).toContain("text-red");
  });

  it("applies green color for high values (7-8)", () => {
    const { container } = render(<ScoreSlider value={8} onChange={vi.fn()} label="test" />);
    const valueSpan = container.querySelector("span");
    expect(valueSpan?.className).toContain("text-green");
  });

  it("applies emerald color for max values (9-10)", () => {
    const { container } = render(<ScoreSlider value={10} onChange={vi.fn()} label="test" />);
    const valueSpan = container.querySelector("span");
    expect(valueSpan?.className).toContain("text-emerald");
  });

  it("has correct ARIA min/max attributes", () => {
    render(<ScoreSlider value={5} onChange={vi.fn()} label="test" />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "10");
  });
});
