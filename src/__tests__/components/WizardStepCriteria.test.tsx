/**
 * Tests for WizardStepCriteria — Step 3 Criteria, Weights, and Scoring.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/228
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { WizardStepCriteria, importanceLabel, scoreLabel, scoreColor } from "@/components/wizard/WizardStepCriteria";

beforeEach(() => {
  localStorage.clear();
});

describe("importanceLabel", () => {
  it("returns 'Most Important' for weight >= 25", () => {
    expect(importanceLabel(25)).toBe("Most Important");
    expect(importanceLabel(50)).toBe("Most Important");
  });

  it("returns 'Very Important' for weight 20-24", () => {
    expect(importanceLabel(20)).toBe("Very Important");
    expect(importanceLabel(24)).toBe("Very Important");
  });

  it("returns 'Important' for weight 15-19", () => {
    expect(importanceLabel(15)).toBe("Important");
  });

  it("returns 'Somewhat Important' for weight 10-14", () => {
    expect(importanceLabel(10)).toBe("Somewhat Important");
  });

  it("returns 'Slightly Important' for weight 5-9", () => {
    expect(importanceLabel(5)).toBe("Slightly Important");
  });

  it("returns 'Minimal' for weight < 5", () => {
    expect(importanceLabel(2)).toBe("Minimal");
    expect(importanceLabel(0)).toBe("Minimal");
  });
});

describe("scoreLabel", () => {
  it("returns correct labels for each score range", () => {
    expect(scoreLabel(0)).toBe("Not Scored");
    expect(scoreLabel(1)).toBe("Poor");
    expect(scoreLabel(2)).toBe("Poor");
    expect(scoreLabel(3)).toBe("Below Average");
    expect(scoreLabel(4)).toBe("Below Average");
    expect(scoreLabel(5)).toBe("Average");
    expect(scoreLabel(6)).toBe("Average");
    expect(scoreLabel(7)).toBe("Good");
    expect(scoreLabel(8)).toBe("Very Good");
    expect(scoreLabel(9)).toBe("Excellent");
    expect(scoreLabel(10)).toBe("Outstanding");
  });
});

describe("scoreColor", () => {
  it("returns different color classes for score ranges", () => {
    expect(scoreColor(0)).toContain("gray");
    expect(scoreColor(1)).toContain("red");
    expect(scoreColor(3)).toContain("orange");
    expect(scoreColor(5)).toContain("yellow");
    expect(scoreColor(7)).toContain("lime");
    expect(scoreColor(8)).toContain("green");
    expect(scoreColor(9)).toContain("emerald");
    expect(scoreColor(10)).toContain("blue");
  });
});

describe("WizardStepCriteria", () => {
  it("renders the step 3 container", () => {
    renderWithProviders(<WizardStepCriteria />);
    expect(screen.getByTestId("wizard-step-3")).toBeInTheDocument();
  });

  it("starts on the criteria sub-step", () => {
    renderWithProviders(<WizardStepCriteria />);
    expect(screen.getByTestId("substep-criteria")).toBeInTheDocument();
  });

  it("renders criteria rows from demo data", () => {
    renderWithProviders(<WizardStepCriteria />);
    // Demo data has criteria — check that at least one criterion name input exists
    const criteriaInputs = screen.getAllByRole("textbox");
    expect(criteriaInputs.length).toBeGreaterThan(0);
  });

  it("renders the Add a criterion button", () => {
    renderWithProviders(<WizardStepCriteria />);
    expect(screen.getByTestId("add-criterion-btn")).toBeInTheDocument();
  });

  it("renders the Score Your Options button", () => {
    renderWithProviders(<WizardStepCriteria />);
    expect(screen.getByTestId("goto-scoring-btn")).toBeInTheDocument();
  });

  it("renders weight distribution bar", () => {
    renderWithProviders(<WizardStepCriteria />);
    expect(screen.getByTestId("weight-distribution")).toBeInTheDocument();
  });

  it("renders weight sliders for criteria", () => {
    renderWithProviders(<WizardStepCriteria />);
    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBeGreaterThan(0);
  });

  it("renders benefit/cost type selectors", () => {
    renderWithProviders(<WizardStepCriteria />);
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
  });

  it("transitions to scoring sub-step when button clicked", () => {
    renderWithProviders(<WizardStepCriteria />);
    fireEvent.click(screen.getByTestId("goto-scoring-btn"));
    expect(screen.getByTestId("substep-scoring")).toBeInTheDocument();
  });

  it("shows scoring progress bar in scoring sub-step", () => {
    renderWithProviders(<WizardStepCriteria />);
    fireEvent.click(screen.getByTestId("goto-scoring-btn"));
    expect(screen.getByTestId("scoring-progress")).toBeInTheDocument();
  });

  it("shows score sliders in scoring sub-step", () => {
    renderWithProviders(<WizardStepCriteria />);
    fireEvent.click(screen.getByTestId("goto-scoring-btn"));
    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBeGreaterThan(0);
  });

  it("shows back to criteria button in scoring sub-step", () => {
    renderWithProviders(<WizardStepCriteria />);
    fireEvent.click(screen.getByTestId("goto-scoring-btn"));
    expect(screen.getByTestId("back-to-criteria-btn")).toBeInTheDocument();
  });

  it("transitions back to criteria sub-step", () => {
    renderWithProviders(<WizardStepCriteria />);
    fireEvent.click(screen.getByTestId("goto-scoring-btn"));
    expect(screen.getByTestId("substep-scoring")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("back-to-criteria-btn"));
    expect(screen.getByTestId("substep-criteria")).toBeInTheDocument();
  });

  it("shows criterion cards in scoring sub-step", () => {
    renderWithProviders(<WizardStepCriteria />);
    fireEvent.click(screen.getByTestId("goto-scoring-btn"));
    // Each criterion should have a score card
    const criteriaCount = screen.getAllByText(/%$/).length;
    expect(criteriaCount).toBeGreaterThan(0);
  });

  it("score sliders have accessible aria-label", () => {
    renderWithProviders(<WizardStepCriteria />);
    fireEvent.click(screen.getByTestId("goto-scoring-btn"));
    const sliders = screen.getAllByRole("slider");
    for (const slider of sliders) {
      expect(slider).toHaveAttribute("aria-label");
    }
  });

  it("displays scores filled count text", () => {
    renderWithProviders(<WizardStepCriteria />);
    fireEvent.click(screen.getByTestId("goto-scoring-btn"));
    expect(screen.getByText(/scores filled/i)).toBeInTheDocument();
  });
});
