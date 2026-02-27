/**
 * Tests for WizardStepOptions — Step 2 Streamlined Options Entry.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/227
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { WizardStepOptions } from "@/components/wizard/WizardStepOptions";

beforeEach(() => {
  localStorage.clear();
});

describe("WizardStepOptions", () => {
  it("renders the step 2 container", () => {
    renderWithProviders(<WizardStepOptions />);
    expect(screen.getByTestId("wizard-step-2")).toBeInTheDocument();
  });

  it("renders option inputs", () => {
    renderWithProviders(<WizardStepOptions />);
    // Demo data has 3 options so should render 3 inputs
    expect(screen.getByTestId("option-input-0")).toBeInTheDocument();
    expect(screen.getByTestId("option-input-1")).toBeInTheDocument();
    expect(screen.getByTestId("option-input-2")).toBeInTheDocument();
  });

  it("renders a list with accessible label", () => {
    renderWithProviders(<WizardStepOptions />);
    expect(screen.getByRole("list", { name: /decision options/i })).toBeInTheDocument();
  });

  it("renders the Add another option button", () => {
    renderWithProviders(<WizardStepOptions />);
    expect(screen.getByTestId("add-option-btn")).toBeInTheDocument();
    expect(screen.getByText(/add another option/i)).toBeInTheDocument();
  });

  it("adds a new option row when Add button is clicked", () => {
    renderWithProviders(<WizardStepOptions />);
    const initialCount = screen.getAllByRole("listitem").length;
    fireEvent.click(screen.getByTestId("add-option-btn"));
    expect(screen.getAllByRole("listitem").length).toBe(initialCount + 1);
  });

  it("shows remove buttons for each option when more than 2 exist", () => {
    renderWithProviders(<WizardStepOptions />);
    // Demo data has 3 options
    expect(screen.getByTestId("option-remove-0")).toBeInTheDocument();
    expect(screen.getByTestId("option-remove-1")).toBeInTheDocument();
    expect(screen.getByTestId("option-remove-2")).toBeInTheDocument();
  });

  it("removes an option when remove button is clicked", () => {
    renderWithProviders(<WizardStepOptions />);
    const initialCount = screen.getAllByRole("listitem").length;
    fireEvent.click(screen.getByTestId("option-remove-0"));
    expect(screen.getAllByRole("listitem").length).toBe(initialCount - 1);
  });

  it("updates option name when user types", async () => {
    const { user } = renderWithProviders(<WizardStepOptions />);
    const input = screen.getByTestId("option-input-0") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "New Option Name");
    expect(input.value).toBe("New Option Name");
  });

  it("each input has an accessible aria-label", () => {
    renderWithProviders(<WizardStepOptions />);
    expect(screen.getByLabelText("Option 1 name")).toBeInTheDocument();
    expect(screen.getByLabelText("Option 2 name")).toBeInTheDocument();
  });

  it("displays the decision title in the context header", () => {
    renderWithProviders(<WizardStepOptions />);
    // Demo data has title "Best City to Relocate To"
    expect(screen.getByText(/best city to relocate to/i)).toBeInTheDocument();
  });

  it("shows tip text about 2-5 options", () => {
    renderWithProviders(<WizardStepOptions />);
    expect(screen.getByText(/2–5 options works best/i)).toBeInTheDocument();
  });

  it("shows options count", () => {
    renderWithProviders(<WizardStepOptions />);
    expect(screen.getByTestId("options-count")).toBeInTheDocument();
  });

  it("adds new row on Enter key press in last input", () => {
    renderWithProviders(<WizardStepOptions />);
    const initialCount = screen.getAllByRole("listitem").length;
    const lastIndex = initialCount - 1;
    const lastInput = screen.getByTestId(`option-input-${lastIndex}`);
    fireEvent.keyDown(lastInput, { key: "Enter" });
    expect(screen.getAllByRole("listitem").length).toBe(initialCount + 1);
  });

  it("Enter key in non-last input does not add row", () => {
    renderWithProviders(<WizardStepOptions />);
    const initialCount = screen.getAllByRole("listitem").length;
    const firstInput = screen.getByTestId("option-input-0");
    fireEvent.keyDown(firstInput, { key: "Enter" });
    expect(screen.getAllByRole("listitem").length).toBe(initialCount);
  });
});

describe("WizardStepOptions — wizard-templates integration", () => {
  it("exports getTypeExamples for all predefined types", async () => {
    const { getTypeExamples } = await import("@/lib/wizard-templates");
    const types = ["job-career", "housing", "purchase", "investment", "education", "custom"];
    for (const t of types) {
      const result = getTypeExamples(t);
      expect(result.placeholder).toBeDefined();
      expect(result.examples.length).toBeGreaterThan(0);
    }
  });

  it("getTypeExamples falls back to custom for unknown types", async () => {
    const { getTypeExamples } = await import("@/lib/wizard-templates");
    const result = getTypeExamples("nonexistent");
    expect(result.placeholder).toContain("Option A");
  });
});
