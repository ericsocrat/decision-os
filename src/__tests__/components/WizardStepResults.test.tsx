/**
 * Tests for WizardStepResults — Step 4 Simplified Results.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/229
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { WizardStepResults } from "@/components/wizard/WizardStepResults";

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Component tests (rendered with DEMO_DECISION via renderWithProviders)
// ---------------------------------------------------------------------------

describe("WizardStepResults", () => {
  it("renders the step 4 container", () => {
    renderWithProviders(<WizardStepResults />);
    expect(screen.getByTestId("wizard-step-4")).toBeInTheDocument();
  });

  it("shows the winner card with name and score", () => {
    renderWithProviders(<WizardStepResults />);
    expect(screen.getByTestId("winner-card")).toBeInTheDocument();
    // Demo data should produce a winner with a score like X.XX/10
    expect(screen.getByTestId("winner-card").textContent).toMatch(/\d+\.\d+\/10/);
  });

  it("renders the winner score bar", () => {
    renderWithProviders(<WizardStepResults />);
    const bar = screen.getByTestId("winner-score-bar");
    expect(bar).toBeInTheDocument();
    // Bar should have a width style > 0%
    expect(bar.style.width).not.toBe("0%");
  });

  it("displays a winner explanation", () => {
    renderWithProviders(<WizardStepResults />);
    const explanation = screen.getByTestId("winner-explanation");
    expect(explanation).toBeInTheDocument();
    expect(explanation.textContent!.length).toBeGreaterThan(10);
  });

  it("shows runner-ups list for multi-option decisions", () => {
    renderWithProviders(<WizardStepResults />);
    expect(screen.getByTestId("runner-ups")).toBeInTheDocument();
    // Demo data has 3 options → 2 runner-ups
    expect(screen.getByTestId("runner-up-2")).toBeInTheDocument();
    expect(screen.getByTestId("runner-up-3")).toBeInTheDocument();
  });

  it("displays confidence checklist with all 3 indicators", () => {
    renderWithProviders(<WizardStepResults />);
    expect(screen.getByTestId("confidence-checklist")).toBeInTheDocument();
    expect(screen.getByTestId("confidence-robustness")).toBeInTheDocument();
    expect(screen.getByTestId("confidence-agreement")).toBeInTheDocument();
    expect(screen.getByTestId("confidence-margin")).toBeInTheDocument();
  });

  it("shows explore further section with 4 cards", () => {
    renderWithProviders(<WizardStepResults />);
    expect(screen.getByTestId("explore-further")).toBeInTheDocument();
    expect(screen.getByTestId("explore-what-if-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("explore-compare-methods")).toBeInTheDocument();
    expect(screen.getByTestId("explore-sensitivity")).toBeInTheDocument();
    expect(screen.getByTestId("explore-monte-carlo")).toBeInTheDocument();
  });

  it("calls onSwitchToAdvanced when an explore card is clicked", async () => {
    const onSwitch = vi.fn();
    const { user } = renderWithProviders(
      <WizardStepResults onSwitchToAdvanced={onSwitch} />,
    );

    await user.click(screen.getByTestId("explore-what-if-analysis"));
    expect(onSwitch).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("explore-monte-carlo"));
    expect(onSwitch).toHaveBeenCalledTimes(2);
  });

  it("each confidence indicator shows level text (Strong/Moderate/Sensitive)", () => {
    renderWithProviders(<WizardStepResults />);
    const checklist = screen.getByTestId("confidence-checklist");
    const text = checklist.textContent!;
    // Each indicator should have one of: Strong, Moderate, Sensitive
    expect(text).toMatch(/Strong|Moderate|Sensitive/);
  });

  it("renders #1 badge on the winner card", () => {
    renderWithProviders(<WizardStepResults />);
    const winnerCard = screen.getByTestId("winner-card");
    expect(winnerCard.textContent).toContain("#1");
  });

  it("matches snapshot", () => {
    const { container } = renderWithProviders(<WizardStepResults />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Confidence indicator level tests
// ---------------------------------------------------------------------------

describe("WizardStepResults — confidence levels", () => {
  it("shows Robustness indicator with a description", () => {
    renderWithProviders(<WizardStepResults />);
    const robustness = screen.getByTestId("confidence-robustness");
    expect(robustness.textContent).toContain("Robustness");
    // Should have a description about weight changes
    expect(robustness.textContent).toMatch(/weight|winner/i);
  });

  it("shows Agreement indicator with a description", () => {
    renderWithProviders(<WizardStepResults />);
    const agreement = screen.getByTestId("confidence-agreement");
    expect(agreement.textContent).toContain("Agreement");
    expect(agreement.textContent).toMatch(/method/i);
  });

  it("shows Margin indicator with a description about points", () => {
    renderWithProviders(<WizardStepResults />);
    const margin = screen.getByTestId("confidence-margin");
    expect(margin.textContent).toContain("Margin");
    expect(margin.textContent).toMatch(/point/i);
  });
});
