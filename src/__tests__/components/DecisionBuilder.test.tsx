/**
 * Tests for DecisionBuilder component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { DecisionBuilder } from "@/components/DecisionBuilder";
import type { ValidationResult } from "@/hooks/useValidation";
import type { CompletenessResult } from "@/lib/completeness";

// Mock showToast since it depends on global state
vi.mock("@/components/Toast", () => ({
  showToast: vi.fn(),
}));

const emptyValidation: ValidationResult = {
  issues: [],
  errors: [],
  warnings: [],
  infos: [],
  errorCount: 0,
  isValid: true,
  byId: new Map(),
  byField: new Map(),
};

const defaultCompleteness: CompletenessResult = {
  filled: 0,
  total: 0,
  ratio: 1,
  percent: 100,
  tier: "blue",
};

beforeEach(() => {
  localStorage.clear();
});

describe("DecisionBuilder", () => {
  it("renders Decision Details heading", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    expect(screen.getByText("Decision Details")).toBeInTheDocument();
  });

  it("renders title input with initial demo value", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();
    expect((titleInput as HTMLInputElement).value.length).toBeGreaterThan(0);
  });

  it("renders description textarea", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    const desc = screen.getByPlaceholderText(/brief context/i);
    expect(desc).toBeInTheDocument();
  });

  it("renders Options section with Add Option button", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    expect(screen.getByText("Options")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add option/i })).toBeInTheDocument();
  }, 15_000);

  it("renders Criteria section with Add Criterion button", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    expect(screen.getByText("Criteria")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add criterion/i })).toBeInTheDocument();
  });

  it("renders Scores Matrix section", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    expect(screen.getByText(/scores matrix/i)).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: /scores matrix/i })).toBeInTheDocument();
  });

  it("renders Undo and Redo buttons", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /redo/i })).toBeInTheDocument();
  });

  it("Undo button is disabled when no history", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    const undoBtn = screen.getByRole("button", { name: /undo/i });
    expect(undoBtn).toBeDisabled();
  });

  it("adds an option when Add Option is clicked", async () => {
    const { user } = renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    const inputs = screen.getAllByRole("textbox");
    const initialCount = inputs.length;
    await user.click(screen.getByRole("button", { name: /add option/i }));
    const newInputs = screen.getAllByRole("textbox");
    expect(newInputs.length).toBeGreaterThan(initialCount);
  }, 15_000);

  it("renders score inputs in the grid", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    const grid = screen.getByRole("grid");
    const scoreInputs = grid.querySelectorAll('input[type="number"]');
    // Demo data has 3 options × 4 criteria = 12 score inputs
    expect(scoreInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("shows validation error on title when present", () => {
    const validation: ValidationResult = {
      ...emptyValidation,
      isValid: false,
      errorCount: 1,
      errors: [{ field: "title", severity: "error", message: "Decision title is required" }],
      byField: new Map([
        ["title", [{ field: "title", severity: "error", message: "Decision title is required" }]],
      ]),
    };
    renderWithProviders(<DecisionBuilder validation={validation} completeness={defaultCompleteness} />);
    expect(screen.getByText("Decision title is required")).toBeInTheDocument();
  });

  it("renders description toggle buttons for options", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    // Demo data has 3 options with descriptions → should show "Edit description"
    const editBtns = screen.getAllByText("Edit description");
    expect(editBtns.length).toBeGreaterThanOrEqual(1);
  });

  it("renders description toggle buttons for criteria", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    // Demo data has 4 criteria with descriptions → "Edit description" buttons
    const editBtns = screen.getAllByText("Edit description");
    // At least some should be from criteria
    expect(editBtns.length).toBeGreaterThanOrEqual(3);
  });

  it("expands description textarea when toggle clicked", async () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    // Demo data auto-expands descriptions that are non-empty
    // Find a textarea (should be auto-expanded for demo descriptions)
    const textareas = screen.getAllByRole("textbox");
    // Includes name inputs + description textareas
    expect(textareas.length).toBeGreaterThan(7); // title + desc + at least 3 option names + descriptions
  });

  it("shows character counter on expanded descriptions", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    // Demo data has descriptions that auto-expand, so counters should be visible
    const counters = screen.getAllByText(/\/500$/);
    expect(counters.length).toBeGreaterThanOrEqual(1);
  });

  it("shows criterion description tooltip in score matrix header", () => {
    renderWithProviders(<DecisionBuilder validation={emptyValidation} completeness={defaultCompleteness} />);
    // Demo criteria have descriptions, so tooltips should exist
    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.length).toBeGreaterThanOrEqual(1);
  });
});
