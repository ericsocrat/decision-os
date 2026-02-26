/**
 * Tests for ResultsView component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { ResultsView } from "@/components/ResultsView";
import type { ValidationResult } from "@/hooks/useValidation";
import type { CompletenessResult } from "@/lib/completeness";

// Mock lazy-loaded ScoreChart
vi.mock("@/components/ScoreChart", () => ({
  ScoreChart: () => <div data-testid="score-chart">Chart</div>,
}));

const validResult: ValidationResult = {
  issues: [],
  errors: [],
  warnings: [],
  infos: [],
  errorCount: 0,
  isValid: true,
  byId: new Map(),
  byField: new Map(),
};

const invalidResult: ValidationResult = {
  ...validResult,
  isValid: false,
  errorCount: 1,
  errors: [{ field: "title", severity: "error", message: "Decision title is required" }],
};

const onSwitchToBuilder = vi.fn();

/** Default full-completion result for tests (demo data has non-zero scores). */
const fullCompleteness: CompletenessResult = {
  filled: 20,
  total: 20,
  ratio: 1,
  percent: 100,
  tier: "blue",
};

beforeEach(() => {
  localStorage.clear();
  onSwitchToBuilder.mockClear();
});

describe("ResultsView", () => {
  it("renders rankings section", () => {
    renderWithProviders(
      <ResultsView
        validation={validResult}
        completeness={fullCompleteness}
        onSwitchToBuilder={onSwitchToBuilder}
      />
    );
    expect(screen.getByText("Rankings")).toBeInTheDocument();
  });

  it("renders ranked option cards", () => {
    renderWithProviders(
      <ResultsView
        validation={validResult}
        completeness={fullCompleteness}
        onSwitchToBuilder={onSwitchToBuilder}
      />
    );
    // Demo data should produce ranked results; the #1 option should have "Winner" badge
    expect(screen.getByText("Winner")).toBeInTheDocument();
  });

  it("renders export JSON button", () => {
    renderWithProviders(
      <ResultsView
        validation={validResult}
        completeness={fullCompleteness}
        onSwitchToBuilder={onSwitchToBuilder}
      />
    );
    expect(screen.getByRole("button", { name: /export.*json/i })).toBeInTheDocument();
  });

  it("renders share link button", () => {
    renderWithProviders(
      <ResultsView
        validation={validResult}
        completeness={fullCompleteness}
        onSwitchToBuilder={onSwitchToBuilder}
      />
    );
    expect(screen.getByRole("button", { name: /copy share link/i })).toBeInTheDocument();
  });

  it("renders Top Drivers section", () => {
    renderWithProviders(
      <ResultsView
        validation={validResult}
        completeness={fullCompleteness}
        onSwitchToBuilder={onSwitchToBuilder}
      />
    );
    expect(screen.getByText("Top Drivers")).toBeInTheDocument();
  });

  it("renders Explain This Result section", () => {
    renderWithProviders(
      <ResultsView
        validation={validResult}
        completeness={fullCompleteness}
        onSwitchToBuilder={onSwitchToBuilder}
      />
    );
    expect(screen.getByText("Explain This Result")).toBeInTheDocument();
    expect(screen.getByText(/how wsm works/i)).toBeInTheDocument();
  });

  it("shows validation guard when invalid", () => {
    renderWithProviders(
      <ResultsView
        validation={invalidResult}
        completeness={fullCompleteness}
        onSwitchToBuilder={onSwitchToBuilder}
      />
    );
    expect(screen.getByText(/fix these issues/i)).toBeInTheDocument();
    expect(screen.getByText("Decision title is required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go to builder/i })).toBeInTheDocument();
  });

  it("Go to Builder button fires callback", async () => {
    const { user } = renderWithProviders(
      <ResultsView
        validation={invalidResult}
        completeness={fullCompleteness}
        onSwitchToBuilder={onSwitchToBuilder}
      />
    );
    await user.click(screen.getByRole("button", { name: /go to builder/i }));
    expect(onSwitchToBuilder).toHaveBeenCalledTimes(1);
  });

  it("shows option descriptions in ranking cards", () => {
    renderWithProviders(
      <ResultsView
        validation={validResult}
        completeness={fullCompleteness}
        onSwitchToBuilder={onSwitchToBuilder}
      />
    );
    // Demo data options have descriptions — should be displayed as truncated text
    const descriptions = screen.getAllByTitle(/./);
    // At least some should be option descriptions from demo data
    expect(descriptions.length).toBeGreaterThanOrEqual(1);
  });
});
