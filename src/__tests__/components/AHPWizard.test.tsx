import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { AHPWizard } from "@/components/AHPWizard";

describe("AHPWizard", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockClear();
    // Seed the demo decision (5 criteria) via localStorage
    globalThis.localStorage.clear();
  });

  it("renders the wizard with header and progress", () => {
    renderWithProviders(<AHPWizard onClose={onClose} />);

    expect(screen.getByText("AHP Weight Wizard")).toBeInTheDocument();
    expect(screen.getByText(/Comparison 1 of/)).toBeInTheDocument();
  });

  it("shows all pairs count for 5 demo criteria (10 pairs)", () => {
    renderWithProviders(<AHPWizard onClose={onClose} />);

    // 5 criteria → 10 pairs
    expect(screen.getByText(/of 10/)).toBeInTheDocument();
  });

  it("displays consistency ratio", () => {
    renderWithProviders(<AHPWizard onClose={onClose} />);

    // Default all-equal → CR = 0.000, consistent
    expect(screen.getByText(/CR =/)).toBeInTheDocument();
    expect(screen.getByText("Consistent")).toBeInTheDocument();
  });

  it("shows derived weights section", () => {
    renderWithProviders(<AHPWizard onClose={onClose} />);

    expect(screen.getByText("Derived Weights")).toBeInTheDocument();
    // Each criterion name appears in comparison step AND weight preview
    expect(screen.getAllByText("Cost of Living").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Job Opportunities").length).toBeGreaterThanOrEqual(1);
  });

  it("navigates between comparisons with next/back buttons", async () => {
    const { user } = renderWithProviders(<AHPWizard onClose={onClose} />);

    expect(screen.getByText("Comparison 1 of 10")).toBeInTheDocument();

    const nextBtn = screen.getByLabelText("Next comparison");
    await user.click(nextBtn);
    expect(screen.getByText("Comparison 2 of 10")).toBeInTheDocument();

    const backBtn = screen.getByLabelText("Previous comparison");
    await user.click(backBtn);
    expect(screen.getByText("Comparison 1 of 10")).toBeInTheDocument();
  });

  it("disables back button on first step", () => {
    renderWithProviders(<AHPWizard onClose={onClose} />);

    const backBtn = screen.getByLabelText("Previous comparison");
    expect(backBtn).toBeDisabled();
  });

  it("calls onClose when close button is clicked", async () => {
    const { user } = renderWithProviders(<AHPWizard onClose={onClose} />);

    const closeBtn = screen.getByLabelText("Close AHP wizard");
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("apply weights button is present and enabled for consistent matrix", () => {
    renderWithProviders(<AHPWizard onClose={onClose} />);

    // Default all-equal → consistent → Apply should be enabled
    const applyBtn = screen.getByLabelText("Apply derived weights");
    expect(applyBtn).toBeEnabled();
  });

  it("shows 'Applied' text after clicking apply", async () => {
    const { user } = renderWithProviders(<AHPWizard onClose={onClose} />);

    const applyBtn = screen.getByLabelText("Apply derived weights");
    await user.click(applyBtn);
    expect(screen.getByText("Applied")).toBeInTheDocument();
  });

  it("has accessible slider for comparison input", () => {
    renderWithProviders(<AHPWizard onClose={onClose} />);

    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-label");
  });

  it("updates comparison label when slider changes", () => {
    renderWithProviders(<AHPWizard onClose={onClose} />);

    // Default value displays "1 — Equal"
    expect(screen.getByText(/1 — Equal/)).toBeInTheDocument();

    // Move slider to position 12 → Saaty value 5 → "Strongly more"
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "12" } });

    // Should show the new comparison label
    expect(screen.getByText(/Strongly more/)).toBeInTheDocument();
  });
});
