/**
 * Tests for ModeToggle component — accessibility, rendering, interactions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModeToggle } from "@/components/ModeToggle";
import type { WizardMode } from "@/hooks/useWizardMode";

beforeEach(() => {
  localStorage.clear();
});

describe("ModeToggle", () => {
  it("renders as a radiogroup with two options", () => {
    const onModeChange = vi.fn();
    render(<ModeToggle mode="guided" onModeChange={onModeChange} />);

    const group = screen.getByRole("radiogroup", { name: /interface mode/i });
    expect(group).toBeInTheDocument();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
  });

  it("marks guided as checked when mode is guided", () => {
    render(<ModeToggle mode="guided" onModeChange={vi.fn()} />);

    const guidedBtn = screen.getByTestId("mode-guided");
    const advancedBtn = screen.getByTestId("mode-advanced");

    expect(guidedBtn).toHaveAttribute("aria-checked", "true");
    expect(advancedBtn).toHaveAttribute("aria-checked", "false");
  });

  it("marks advanced as checked when mode is advanced", () => {
    render(<ModeToggle mode="advanced" onModeChange={vi.fn()} />);

    const guidedBtn = screen.getByTestId("mode-guided");
    const advancedBtn = screen.getByTestId("mode-advanced");

    expect(guidedBtn).toHaveAttribute("aria-checked", "false");
    expect(advancedBtn).toHaveAttribute("aria-checked", "true");
  });

  it("calls onModeChange with 'advanced' when Advanced is clicked", () => {
    const onModeChange = vi.fn();
    render(<ModeToggle mode="guided" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByTestId("mode-advanced"));
    expect(onModeChange).toHaveBeenCalledWith("advanced");
  });

  it("calls onModeChange with 'guided' when Guided is clicked", () => {
    const onModeChange = vi.fn();
    render(<ModeToggle mode="advanced" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByTestId("mode-guided"));
    expect(onModeChange).toHaveBeenCalledWith("guided");
  });

  it("has data-testid on the container", () => {
    render(<ModeToggle mode="guided" onModeChange={vi.fn()} />);
    expect(screen.getByTestId("mode-toggle")).toBeInTheDocument();
  });

  it("renders Guided and Advanced labels", () => {
    render(<ModeToggle mode="guided" onModeChange={vi.fn()} />);
    expect(screen.getByText("Guided")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("applies active styling to the selected mode button", () => {
    const { rerender } = render(<ModeToggle mode="guided" onModeChange={vi.fn()} />);
    const guidedBtn = screen.getByTestId("mode-guided");
    expect(guidedBtn.className).toContain("bg-blue-600");

    rerender(<ModeToggle mode="advanced" onModeChange={vi.fn()} />);
    const advancedBtn = screen.getByTestId("mode-advanced");
    expect(advancedBtn.className).toContain("bg-blue-600");
  });
});
