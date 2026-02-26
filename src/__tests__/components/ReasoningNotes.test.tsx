/**
 * Tests for per-score reasoning notes (issue #99).
 *
 * Tests the ReasoningPopover component and the UPDATE_REASONING reducer action.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReasoningPopover } from "@/components/ReasoningPopover";
import { decisionReducer, createInitialState } from "@/lib/decision-reducer";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDecision(overrides?: Partial<Decision>): Decision {
  return {
    id: "d1",
    title: "Test Decision",
    options: [
      { id: "opt-1", name: "Option A" },
      { id: "opt-2", name: "Option B" },
    ],
    criteria: [
      { id: "c1", name: "Cost", weight: 50, type: "cost" },
      { id: "c2", name: "Quality", weight: 50, type: "benefit" },
    ],
    scores: {
      "opt-1": { c1: 7, c2: 8 },
      "opt-2": { c1: 5, c2: 9 },
    },
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper to apply action through reducer
// ---------------------------------------------------------------------------

function applyAction(decision: Decision, action: Parameters<typeof decisionReducer>[1]) {
  const state = createInitialState(decision, [decision]);
  const newState = decisionReducer(state, action);
  return newState.decision;
}

// ---------------------------------------------------------------------------
// Reducer tests
// ---------------------------------------------------------------------------

describe("UPDATE_REASONING reducer action", () => {
  it("adds reasoning to a score cell", () => {
    const decision = makeDecision();
    const result = applyAction(decision, {
      type: "UPDATE_REASONING",
      optionId: "opt-1",
      criterionId: "c1",
      text: "Market research shows this is affordable",
      timestamp: Date.now(),
    });

    expect(result.reasoning?.["opt-1"]?.c1).toBe("Market research shows this is affordable");
  });

  it("updates existing reasoning", () => {
    const decision = makeDecision({
      reasoning: { "opt-1": { c1: "Old reasoning" } },
    });
    const result = applyAction(decision, {
      type: "UPDATE_REASONING",
      optionId: "opt-1",
      criterionId: "c1",
      text: "Updated reasoning",
      timestamp: Date.now(),
    });

    expect(result.reasoning?.["opt-1"]?.c1).toBe("Updated reasoning");
  });

  it("preserves reasoning for other cells", () => {
    const decision = makeDecision({
      reasoning: { "opt-1": { c1: "Existing" } },
    });
    const result = applyAction(decision, {
      type: "UPDATE_REASONING",
      optionId: "opt-1",
      criterionId: "c2",
      text: "New note",
      timestamp: Date.now(),
    });

    expect(result.reasoning?.["opt-1"]?.c1).toBe("Existing");
    expect(result.reasoning?.["opt-1"]?.c2).toBe("New note");
  });

  it("cleans up reasoning when option is removed", () => {
    const decision = makeDecision({
      reasoning: {
        "opt-1": { c1: "Some reasoning" },
        "opt-2": { c1: "Other reasoning" },
      },
    });
    const result = applyAction(decision, {
      type: "REMOVE_OPTION",
      optionId: "opt-1",
    });

    expect(result.reasoning?.["opt-1"]).toBeUndefined();
    expect(result.reasoning?.["opt-2"]?.c1).toBe("Other reasoning");
  });

  it("cleans up reasoning when criterion is removed", () => {
    const decision = makeDecision({
      reasoning: {
        "opt-1": { c1: "Cost reasoning", c2: "Quality reasoning" },
      },
    });
    const result = applyAction(decision, {
      type: "REMOVE_CRITERION",
      criterionId: "c1",
    });

    expect(result.reasoning?.["opt-1"]?.c1).toBeUndefined();
    expect(result.reasoning?.["opt-1"]?.c2).toBe("Quality reasoning");
  });
});

// ---------------------------------------------------------------------------
// ReasoningPopover component tests
// ---------------------------------------------------------------------------

describe("ReasoningPopover", () => {
  let onChangeFn: ReturnType<typeof vi.fn<(text: string) => void>>;

  beforeEach(() => {
    onChangeFn = vi.fn<(text: string) => void>();
  });

  it("renders a note icon button", () => {
    render(
      <ReasoningPopover
        value={undefined}
        onChange={onChangeFn}
        optionName="Option A"
        criterionName="Cost"
      />
    );

    const button = screen.getByLabelText(/reasoning for Option A on Cost/i);
    expect(button).toBeInTheDocument();
  });

  it("shows 'Add' label when no reasoning exists", () => {
    render(
      <ReasoningPopover
        value={undefined}
        onChange={onChangeFn}
        optionName="Option A"
        criterionName="Cost"
      />
    );

    expect(screen.getByLabelText(/Add reasoning/i)).toBeInTheDocument();
  });

  it("shows 'Edit' label when reasoning exists", () => {
    render(
      <ReasoningPopover
        value="Existing note"
        onChange={onChangeFn}
        optionName="Option A"
        criterionName="Cost"
      />
    );

    expect(screen.getByLabelText(/Edit reasoning/i)).toBeInTheDocument();
  });

  it("opens popover on click", async () => {
    const user = userEvent.setup();
    render(
      <ReasoningPopover
        value={undefined}
        onChange={onChangeFn}
        optionName="Option A"
        criterionName="Cost"
      />
    );

    const button = screen.getByLabelText(/reasoning for Option A on Cost/i);
    await user.click(button);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Why this score?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Explain your reasoning...")).toBeInTheDocument();
  });

  it("calls onChange when typing reasoning", async () => {
    const user = userEvent.setup();
    render(
      <ReasoningPopover value="" onChange={onChangeFn} optionName="Option A" criterionName="Cost" />
    );

    await user.click(screen.getByLabelText(/reasoning for Option A on Cost/i));
    const textarea = screen.getByPlaceholderText("Explain your reasoning...");
    await user.type(textarea, "Based on market data");

    expect(onChangeFn).toHaveBeenCalled();
  });

  it("shows Clear note button when reasoning exists", async () => {
    const user = userEvent.setup();
    render(
      <ReasoningPopover
        value="Existing note"
        onChange={onChangeFn}
        optionName="Option A"
        criterionName="Cost"
      />
    );

    await user.click(screen.getByLabelText(/Edit reasoning/i));
    const clearBtn = screen.getByText("Clear note");
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(onChangeFn).toHaveBeenCalledWith("");
  });

  it("closes on Escape key", async () => {
    const user = userEvent.setup();
    render(
      <ReasoningPopover
        value={undefined}
        onChange={onChangeFn}
        optionName="Option A"
        criterionName="Cost"
      />
    );

    await user.click(screen.getByLabelText(/reasoning for Option A on Cost/i));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays existing reasoning text in textarea", async () => {
    const user = userEvent.setup();
    render(
      <ReasoningPopover
        value="My existing reasoning"
        onChange={onChangeFn}
        optionName="Option A"
        criterionName="Cost"
      />
    );

    await user.click(screen.getByLabelText(/Edit reasoning/i));
    const textarea = screen.getByPlaceholderText("Explain your reasoning...");
    expect(textarea).toHaveValue("My existing reasoning");
  });
});
