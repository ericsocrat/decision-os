/**
 * Tests for ConfidenceDot component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfidenceDot } from "@/components/ConfidenceDot";

describe("ConfidenceDot", () => {
  it("renders high confidence with green dot", () => {
    render(<ConfidenceDot confidence="high" onChange={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    expect(btn.querySelector("span")?.className).toContain("bg-green");
  });

  it("renders medium confidence with amber dot", () => {
    render(<ConfidenceDot confidence="medium" onChange={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn.querySelector("span")?.className).toContain("bg-amber");
  });

  it("renders low confidence with red dot", () => {
    render(<ConfidenceDot confidence="low" onChange={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn.querySelector("span")?.className).toContain("bg-red");
  });

  it("cycles high → medium on click", () => {
    const onChange = vi.fn();
    render(<ConfidenceDot confidence="high" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("medium");
  });

  it("cycles medium → low on click", () => {
    const onChange = vi.fn();
    render(<ConfidenceDot confidence="medium" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("low");
  });

  it("cycles low → high on click", () => {
    const onChange = vi.fn();
    render(<ConfidenceDot confidence="low" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("high");
  });

  it("has accessible label describing current and next state", () => {
    render(<ConfidenceDot confidence="high" onChange={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute(
      "aria-label",
      "High confidence — click to change to medium confidence"
    );
  });

  it("meets minimum touch target (24px)", () => {
    render(<ConfidenceDot confidence="high" onChange={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("min-w-6");
    expect(btn.className).toContain("min-h-6");
  });
});
