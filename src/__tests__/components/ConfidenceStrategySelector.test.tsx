/**
 * Tests for ConfidenceStrategySelector component.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/94
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfidenceStrategySelector } from "@/components/ConfidenceStrategySelector";
import type { ConfidenceStrategy } from "@/lib/types";

describe("ConfidenceStrategySelector", () => {
  it("renders all three strategy options", () => {
    render(<ConfidenceStrategySelector value="none" onChange={vi.fn()} />);
    expect(screen.getByText("Display Only")).toBeInTheDocument();
    expect(screen.getByText("Penalize")).toBeInTheDocument();
    expect(screen.getByText("Widen Range")).toBeInTheDocument();
  });

  it("marks the current strategy as selected", () => {
    render(<ConfidenceStrategySelector value="penalize" onChange={vi.fn()} />);
    const penalizeBtn = screen.getByRole("radio", { name: /penalize/i });
    expect(penalizeBtn).toHaveAttribute("aria-checked", "true");

    const noneBtn = screen.getByRole("radio", { name: /display only/i });
    expect(noneBtn).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange when a strategy is clicked", () => {
    const onChange = vi.fn();
    render(<ConfidenceStrategySelector value="none" onChange={onChange} />);

    fireEvent.click(screen.getByText("Penalize"));
    expect(onChange).toHaveBeenCalledWith("penalize");
  });

  it("calls onChange with 'widen' when Widen Range is clicked", () => {
    const onChange = vi.fn();
    render(<ConfidenceStrategySelector value="none" onChange={onChange} />);

    fireEvent.click(screen.getByText("Widen Range"));
    expect(onChange).toHaveBeenCalledWith("widen");
  });

  it("calls onChange with 'none' when Display Only is clicked", () => {
    const onChange = vi.fn();
    render(<ConfidenceStrategySelector value="penalize" onChange={onChange} />);

    fireEvent.click(screen.getByText("Display Only"));
    expect(onChange).toHaveBeenCalledWith("none");
  });

  it("has proper radiogroup role and label", () => {
    render(<ConfidenceStrategySelector value="none" onChange={vi.fn()} />);
    const radiogroup = screen.getByRole("radiogroup", {
      name: /confidence adjustment strategy/i,
    });
    expect(radiogroup).toBeInTheDocument();
  });

  it("renders the component container with test id", () => {
    render(<ConfidenceStrategySelector value="none" onChange={vi.fn()} />);
    expect(screen.getByTestId("confidence-strategy-selector")).toBeInTheDocument();
  });

  it("shows descriptions for each strategy", () => {
    render(<ConfidenceStrategySelector value="none" onChange={vi.fn()} />);
    expect(
      screen.getByText(/confidence is shown but does not affect scores/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/low-confidence scores are reduced/i)).toBeInTheDocument();
    expect(screen.getByText(/widens the range for sensitivity/i)).toBeInTheDocument();
  });
});
