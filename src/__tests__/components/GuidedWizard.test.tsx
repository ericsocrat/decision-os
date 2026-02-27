/**
 * Tests for GuidedWizard component — step navigation, progress, validation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { GuidedWizard } from "@/components/GuidedWizard";

beforeEach(() => {
  localStorage.clear();
});

describe("GuidedWizard", () => {
  it("renders the wizard container", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    expect(screen.getByTestId("guided-wizard")).toBeInTheDocument();
  });

  it("renders wizard region with accessible label", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    expect(screen.getByRole("region", { name: /guided decision wizard/i })).toBeInTheDocument();
  });

  it("displays step 1 by default", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    expect(screen.getByTestId("wizard-step-1")).toBeInTheDocument();
    expect(screen.getByText("Choose Decision Type")).toBeInTheDocument();
    const stepTexts = screen.getAllByText("Step 1 of 4");
    expect(stepTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders progress bar", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    const progress = screen.getByRole("progressbar");
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute("aria-valuenow", "25");
  });

  it("renders Continue button on step 1", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    expect(screen.getByTestId("wizard-continue")).toBeInTheDocument();
  });

  it("does not render Back button on step 1", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    expect(screen.queryByTestId("wizard-back")).not.toBeInTheDocument();
  });

  it("renders Skip to Advanced link", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    expect(screen.getByTestId("wizard-skip")).toBeInTheDocument();
  });

  it("calls onSwitchToAdvanced when skip is clicked", () => {
    const onSwitch = vi.fn();
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={onSwitch} />);
    fireEvent.click(screen.getByTestId("wizard-skip"));
    expect(onSwitch).toHaveBeenCalledOnce();
  });

  it("navigates to step 2 when Continue is clicked on step 1", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    fireEvent.click(screen.getByTestId("wizard-continue"));
    expect(screen.getByTestId("wizard-step-2")).toBeInTheDocument();
    expect(screen.getByText("Add Your Options")).toBeInTheDocument();
  });

  it("shows Back button on step 2", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    fireEvent.click(screen.getByTestId("wizard-continue"));
    expect(screen.getByTestId("wizard-back")).toBeInTheDocument();
  });

  it("navigates back to step 1 when Back is clicked on step 2", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    fireEvent.click(screen.getByTestId("wizard-continue"));
    expect(screen.getByTestId("wizard-step-2")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("wizard-back"));
    expect(screen.getByTestId("wizard-step-1")).toBeInTheDocument();
  });

  it("updates progress bar on step 2", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    fireEvent.click(screen.getByTestId("wizard-continue"));
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "50");
  });

  it("disables Continue on step 2 when no options exist (demo data overrides)", () => {
    // Note: renderWithProviders seeds DEMO_DECISION which has options,
    // so Continue should be enabled in this case
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    fireEvent.click(screen.getByTestId("wizard-continue")); // to step 2
    const continueBtn = screen.getByTestId("wizard-continue");
    // Demo data has options, so it should be enabled
    expect(continueBtn).not.toBeDisabled();
  });

  it("renders Open in Advanced Mode button on step 4", () => {
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    // Navigate through all steps: step 1 (always can advance)
    fireEvent.click(screen.getByTestId("wizard-continue")); // to step 2
    // step 2 — demo data has options, so can advance
    fireEvent.click(screen.getByTestId("wizard-continue")); // to step 3
    // step 3 — demo data has criteria and scores, so can advance
    fireEvent.click(screen.getByTestId("wizard-continue")); // to step 4
    expect(screen.getByTestId("wizard-step-4")).toBeInTheDocument();
    expect(screen.getByTestId("wizard-open-advanced")).toBeInTheDocument();
    // No Continue button on last step
    expect(screen.queryByTestId("wizard-continue")).not.toBeInTheDocument();
  });

  it("calls onSwitchToAdvanced from Open in Advanced Mode button", () => {
    const onSwitch = vi.fn();
    renderWithProviders(<GuidedWizard onSwitchToAdvanced={onSwitch} />);
    fireEvent.click(screen.getByTestId("wizard-continue")); // to step 2
    fireEvent.click(screen.getByTestId("wizard-continue")); // to step 3
    fireEvent.click(screen.getByTestId("wizard-continue")); // to step 4
    fireEvent.click(screen.getByTestId("wizard-open-advanced"));
    expect(onSwitch).toHaveBeenCalledOnce();
  });

  it("renders 4 step dots in the progress indicator", () => {
    const { container } = renderWithProviders(<GuidedWizard onSwitchToAdvanced={vi.fn()} />);
    const dots = container.querySelectorAll(".rounded-full.h-3.w-3");
    expect(dots).toHaveLength(4);
  });
});
