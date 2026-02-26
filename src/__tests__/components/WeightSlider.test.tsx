/**
 * Tests for WeightSlider component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeightSlider } from "@/components/WeightSlider";

describe("WeightSlider", () => {
  const defaultProps = {
    id: "crit-1",
    name: "Quality",
    value: 40,
    onChange: vi.fn(),
    colorIndex: 0,
    isHighest: false,
  };

  it("renders range and number inputs", () => {
    render(<WeightSlider {...defaultProps} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("displays the correct value", () => {
    render(<WeightSlider {...defaultProps} />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    const number = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(slider.value).toBe("40");
    expect(number.value).toBe("40");
  });

  it("calls onChange when slider is moved", () => {
    const onChange = vi.fn();
    render(<WeightSlider {...defaultProps} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "75" } });
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it("calls onChange when number input changes", () => {
    const onChange = vi.fn();
    render(<WeightSlider {...defaultProps} onChange={onChange} />);
    const number = screen.getByRole("spinbutton");
    fireEvent.change(number, { target: { value: "60" } });
    expect(onChange).toHaveBeenCalledWith(60);
  });

  it("clamps number input to 0-100", () => {
    const onChange = vi.fn();
    render(<WeightSlider {...defaultProps} onChange={onChange} />);
    const number = screen.getByRole("spinbutton");
    fireEvent.change(number, { target: { value: "150" } });
    expect(onChange).toHaveBeenCalledWith(100);
    fireEvent.change(number, { target: { value: "-10" } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("shows star indicator when isHighest", () => {
    render(<WeightSlider {...defaultProps} isHighest={true} />);
    expect(screen.getByText("★")).toBeInTheDocument();
  });

  it("does not show star when not highest", () => {
    render(<WeightSlider {...defaultProps} isHighest={false} />);
    expect(screen.queryByText("★")).not.toBeInTheDocument();
  });

  it("applies highlighted border when isHighest", () => {
    render(<WeightSlider {...defaultProps} isHighest={true} />);
    const numberInput = screen.getByRole("spinbutton");
    expect(numberInput.className).toContain("border-blue-400");
    expect(numberInput.className).toContain("font-semibold");
  });

  it("has correct ARIA attributes on slider", () => {
    render(<WeightSlider {...defaultProps} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-label", "Weight for Quality");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "100");
    expect(slider).toHaveAttribute("aria-valuenow", "40");
  });

  it("applies gradient fill based on value", () => {
    render(<WeightSlider {...defaultProps} value={50} />);
    const slider = screen.getByRole("slider");
    expect(slider.style.background).toContain("50%");
  });

  it("cycles colors for different colorIndex values", () => {
    const { rerender } = render(<WeightSlider {...defaultProps} colorIndex={0} />);
    const slider0 = screen.getByRole("slider");
    const bg0 = slider0.style.background;

    rerender(<WeightSlider {...defaultProps} colorIndex={1} />);
    const slider1 = screen.getByRole("slider");
    const bg1 = slider1.style.background;

    expect(bg0).not.toBe(bg1);
  });
});
