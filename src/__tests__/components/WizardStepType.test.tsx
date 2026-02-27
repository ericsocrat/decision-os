/**
 * Tests for WizardStepType — Step 1 Decision Type Selector.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/226
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { WizardStepType } from "@/components/wizard/WizardStepType";
import { DECISION_TYPES } from "@/lib/wizard-templates";

beforeEach(() => {
  localStorage.clear();
});

describe("WizardStepType", () => {
  it("renders the step 1 container", () => {
    renderWithProviders(<WizardStepType />);
    expect(screen.getByTestId("wizard-step-1")).toBeInTheDocument();
  });

  it("renders a title input", () => {
    renderWithProviders(<WizardStepType />);
    const input = screen.getByTestId("wizard-title-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("renders the title input with a label", () => {
    renderWithProviders(<WizardStepType />);
    expect(screen.getByLabelText(/give your decision a name/i)).toBeInTheDocument();
  });

  it("renders all 6 decision type cards", () => {
    renderWithProviders(<WizardStepType />);
    for (const card of DECISION_TYPES) {
      expect(screen.getByTestId(`type-card-${card.id}`)).toBeInTheDocument();
    }
  });

  it("renders a radiogroup with Decision type label", () => {
    renderWithProviders(<WizardStepType />);
    expect(screen.getByRole("radiogroup", { name: /decision type/i })).toBeInTheDocument();
  });

  it("renders 6 radio buttons (one per card)", () => {
    renderWithProviders(<WizardStepType />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(6);
  });

  it("no card is selected by default", () => {
    renderWithProviders(<WizardStepType />);
    const radios = screen.getAllByRole("radio");
    for (const radio of radios) {
      expect(radio).toHaveAttribute("aria-checked", "false");
    }
  });

  it("shows card titles and descriptions", () => {
    renderWithProviders(<WizardStepType />);
    expect(screen.getByText("Job / Career")).toBeInTheDocument();
    expect(screen.getByText("Housing")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("selects a card when clicked", () => {
    renderWithProviders(<WizardStepType />);
    const housingCard = screen.getByTestId("type-card-housing");
    fireEvent.click(housingCard);
    expect(housingCard).toHaveAttribute("aria-checked", "true");
  });

  it("shows criteria preview when a type card is selected", () => {
    renderWithProviders(<WizardStepType />);
    expect(screen.queryByTestId("criteria-preview")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("type-card-housing"));
    expect(screen.getByTestId("criteria-preview")).toBeInTheDocument();
  });

  it("does not show criteria preview for custom type", () => {
    renderWithProviders(<WizardStepType />);
    fireEvent.click(screen.getByTestId("type-card-custom"));
    // Custom has 0 criteria, so preview should not show
    expect(screen.queryByTestId("criteria-preview")).not.toBeInTheDocument();
  });

  it("preview lists all criteria for the selected type", () => {
    renderWithProviders(<WizardStepType />);
    fireEvent.click(screen.getByTestId("type-card-housing"));
    const preview = screen.getByTestId("criteria-preview");
    const housingType = DECISION_TYPES.find((t) => t.id === "housing")!;
    for (const criteria of housingType.criteria) {
      expect(within(preview).getByText(criteria.name)).toBeInTheDocument();
    }
  });

  it("preview shows customization helper text", () => {
    renderWithProviders(<WizardStepType />);
    fireEvent.click(screen.getByTestId("type-card-job-career"));
    expect(screen.getByText(/you can customize these in the next steps/i)).toBeInTheDocument();
  });

  it("switching type updates the preview", () => {
    renderWithProviders(<WizardStepType />);
    // Select housing first
    fireEvent.click(screen.getByTestId("type-card-housing"));
    expect(screen.getByText("Price")).toBeInTheDocument();

    // Switch to investment
    fireEvent.click(screen.getByTestId("type-card-investment"));
    expect(screen.getByText("Expected Return")).toBeInTheDocument();
    expect(screen.getByTestId("type-card-investment")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("type-card-housing")).toHaveAttribute("aria-checked", "false");
  });

  it("updates decision title when user types in the input", async () => {
    const { user } = renderWithProviders(<WizardStepType />);
    const input = screen.getByTestId("wizard-title-input");
    await user.clear(input);
    await user.type(input, "My big decision");
    expect(input).toHaveValue("My big decision");
  });

  it("shows cost badges for cost-type criteria in the preview", () => {
    renderWithProviders(<WizardStepType />);
    fireEvent.click(screen.getByTestId("type-card-housing"));
    // Housing has "Price" as a cost criterion
    const preview = screen.getByTestId("criteria-preview");
    const costBadges = within(preview).getAllByText("cost");
    expect(costBadges.length).toBeGreaterThanOrEqual(1);
  });
});
