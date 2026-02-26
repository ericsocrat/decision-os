/**
 * Tests for ResultsView component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { ResultsView } from "@/components/ResultsView";
import type { ValidationResult } from "@/hooks/useValidation";

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

beforeEach(() => {
  localStorage.clear();
  onSwitchToBuilder.mockClear();
});

describe("ResultsView", () => {
  it("renders rankings section", () => {
    renderWithProviders(
      <ResultsView validation={validResult} onSwitchToBuilder={onSwitchToBuilder} />
    );
    expect(screen.getByText("Rankings")).toBeInTheDocument();
  });

  it("renders ranked option cards", () => {
    renderWithProviders(
      <ResultsView validation={validResult} onSwitchToBuilder={onSwitchToBuilder} />
    );
    // Demo data should produce ranked results; the #1 option should have "Winner" badge
    expect(screen.getByText("Winner")).toBeInTheDocument();
  });

  it("renders export JSON button", () => {
    renderWithProviders(
      <ResultsView validation={validResult} onSwitchToBuilder={onSwitchToBuilder} />
    );
    expect(screen.getByRole("button", { name: /export.*json/i })).toBeInTheDocument();
  });

  it("renders share link button", () => {
    renderWithProviders(
      <ResultsView validation={validResult} onSwitchToBuilder={onSwitchToBuilder} />
    );
    expect(screen.getByRole("button", { name: /copy share link/i })).toBeInTheDocument();
  });

  it("renders Top Drivers section", () => {
    renderWithProviders(
      <ResultsView validation={validResult} onSwitchToBuilder={onSwitchToBuilder} />
    );
    expect(screen.getByText("Top Drivers")).toBeInTheDocument();
  });

  it("renders Explain This Result section", () => {
    renderWithProviders(
      <ResultsView validation={validResult} onSwitchToBuilder={onSwitchToBuilder} />
    );
    expect(screen.getByText("Explain This Result")).toBeInTheDocument();
    expect(screen.getByText(/how scoring works/i)).toBeInTheDocument();
  });

  it("shows validation guard when invalid", () => {
    renderWithProviders(
      <ResultsView validation={invalidResult} onSwitchToBuilder={onSwitchToBuilder} />
    );
    expect(screen.getByText(/fix these issues/i)).toBeInTheDocument();
    expect(screen.getByText("Decision title is required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go to builder/i })).toBeInTheDocument();
  });

  it("Go to Builder button fires callback", async () => {
    const { user } = renderWithProviders(
      <ResultsView validation={invalidResult} onSwitchToBuilder={onSwitchToBuilder} />
    );
    await user.click(screen.getByRole("button", { name: /go to builder/i }));
    expect(onSwitchToBuilder).toHaveBeenCalledTimes(1);
  });
});
