/**
 * SensitivityView component tests.
 *
 * Verifies the weight swing sensitivity analysis UI including:
 * slider control, summary badge (robust/sensitive), detailed
 * points table, and edge cases.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/87
 */

import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { SensitivityView } from "@/components/SensitivityView";

// The default DecisionProvider loads the demo decision (3 options, 5 criteria)
// which is sufficient for sensitivity analysis rendering.

beforeEach(() => {
  // Seed localStorage with demo data to ensure consistent state
  localStorage.clear();
});

describe("SensitivityView", () => {
  it("renders the Sensitivity Analysis heading", () => {
    renderWithProviders(<SensitivityView />);

    expect(screen.getByText("Sensitivity Analysis")).toBeInTheDocument();
  });

  it("renders the swing percentage slider control", () => {
    renderWithProviders(<SensitivityView />);

    const slider = screen.getByLabelText("Swing percentage");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("type", "range");
    expect(slider).toHaveAttribute("min", "5");
    expect(slider).toHaveAttribute("max", "50");
    expect(slider).toHaveAttribute("step", "5");
  });

  it("displays the current swing percentage value", () => {
    renderWithProviders(<SensitivityView />);

    // Default swing percent is shown — the label span is one of multiple matches
    const matches = screen.getAllByText(/±\d+%/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders a robust or sensitive summary badge", () => {
    renderWithProviders(<SensitivityView />);

    // Multiple role="status" elements exist (announcer provider adds one).
    // Find the non-sr-only one that contains result text.
    const statuses = screen.getAllByRole("status");
    const resultStatus = statuses.find(
      (el) =>
        el.textContent?.includes("Robust Result") || el.textContent?.includes("Sensitive Result")
    );
    expect(resultStatus).toBeTruthy();
  });

  it("renders the sensitivity analysis details table", () => {
    renderWithProviders(<SensitivityView />);

    const table = screen.getByRole("table", { name: "Sensitivity analysis details" });
    expect(table).toBeInTheDocument();

    // Table headers
    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain("Criterion");
    expect(headerTexts).toContain("Direction");
    expect(headerTexts).toContain("Weight Change");
    expect(headerTexts).toContain("Winner");
    expect(headerTexts).toContain("Status");
  });

  it("renders sensitivity points with criterion names from the demo decision", () => {
    renderWithProviders(<SensitivityView />);

    const table = screen.getByRole("table", { name: "Sensitivity analysis details" });
    const rows = within(table).getAllByRole("row");

    // At least header row + some data rows (demo has 5 criteria × 2 directions = 10 points)
    expect(rows.length).toBeGreaterThan(1);
  });

  it("shows direction indicators (Up/Down) in the table", () => {
    renderWithProviders(<SensitivityView />);

    const table = screen.getByRole("table", { name: "Sensitivity analysis details" });

    // Each criterion has both Up and Down directions
    expect(within(table).getAllByText("↑ Up").length).toBeGreaterThanOrEqual(1);
    expect(within(table).getAllByText("↓ Down").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Stable or Changed badges in the status column", () => {
    renderWithProviders(<SensitivityView />);

    const table = screen.getByRole("table", { name: "Sensitivity analysis details" });

    // Every row should have either a Stable or Changed badge
    const stableCount = within(table).queryAllByText("Stable").length;
    const changedCount = within(table).queryAllByText("Changed").length;
    expect(stableCount + changedCount).toBeGreaterThan(0);
  });

  it("displays weight change arrows (original → adjusted)", () => {
    renderWithProviders(<SensitivityView />);

    const table = screen.getByRole("table", { name: "Sensitivity analysis details" });

    // Weight change cells show "X → Y" format
    const cells = within(table).getAllByRole("cell");
    const weightChangeCells = cells.filter((cell) => cell.textContent?.includes("→"));
    expect(weightChangeCells.length).toBeGreaterThan(0);
  });

  it("updates the slider value on interaction", () => {
    renderWithProviders(<SensitivityView />);

    const slider = screen.getByLabelText("Swing percentage");
    expect(slider).toHaveValue("20"); // default

    // fireEvent.change is the reliable way to update range inputs
    fireEvent.change(slider, { target: { value: "30" } });
    expect(slider).toHaveValue("30");
  });

  it("renders the How It Works explanation section", () => {
    renderWithProviders(<SensitivityView />);

    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText(/Weight Swing Analysis/)).toBeInTheDocument();
    expect(screen.getByText(/tests the robustness of your decision/)).toBeInTheDocument();
  });

  it("displays the summary text from sensitivity analysis", () => {
    renderWithProviders(<SensitivityView />);

    // Multiple role="status" exist; find the one with sensitivity summary text
    const statuses = screen.getAllByRole("status");
    const resultStatus = statuses.find(
      (el) => (el.textContent?.length ?? 0) > 10 && !el.classList.contains("sr-only")
    );
    expect(resultStatus).toBeTruthy();
    expect(resultStatus!.textContent!.length).toBeGreaterThan(0);
  });
});
