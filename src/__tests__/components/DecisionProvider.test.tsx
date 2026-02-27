/**
 * Integration tests for DecisionProvider context.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { DecisionProvider, useDecision } from "@/components/DecisionProvider";
import { AnnouncerProvider } from "@/components/Announcer";
import { DEMO_DECISION } from "@/lib/demo-data";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AnnouncerProvider>
      <DecisionProvider>{children}</DecisionProvider>
    </AnnouncerProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  // Seed the demo decision so tests have data to work with
  // (storage now starts blank for new users to show EmptyState)
  localStorage.setItem("decision-os:decisions", JSON.stringify([DEMO_DECISION]));
});

describe("DecisionProvider", () => {
  it("provides default decision (demo data)", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    expect(result.current.decision.id).toBe(DEMO_DECISION.id);
    expect(result.current.decisions).toHaveLength(1);
  });

  it("updateTitle changes the decision title", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    act(() => result.current.updateTitle("New Title"));
    expect(result.current.decision.title).toBe("New Title");
  });

  it("updateDescription changes the decision description", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    act(() => result.current.updateDescription("Some desc"));
    expect(result.current.decision.description).toBe("Some desc");
  });

  it("addOption adds a new option", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    const before = result.current.decision.options.length;
    act(() => result.current.addOption());
    expect(result.current.decision.options.length).toBe(before + 1);
  });

  it("removeOption removes an option", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    const firstId = result.current.decision.options[0].id;
    act(() => result.current.addOption()); // ensure >2 options
    const countAfterAdd = result.current.decision.options.length;
    act(() => result.current.removeOption(firstId));
    expect(result.current.decision.options.length).toBe(countAfterAdd - 1);
    expect(result.current.decision.options.find((o) => o.id === firstId)).toBeUndefined();
  });

  it("addCriterion adds a new criterion", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    const before = result.current.decision.criteria.length;
    act(() => result.current.addCriterion());
    expect(result.current.decision.criteria.length).toBe(before + 1);
  });

  it("removeCriterion removes a criterion", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    act(() => result.current.addCriterion()); // add so there's >1
    const toRemove = result.current.decision.criteria[0].id;
    const countBefore = result.current.decision.criteria.length;
    act(() => result.current.removeCriterion(toRemove));
    expect(result.current.decision.criteria.length).toBe(countBefore - 1);
  });

  it("updateScore updates the score matrix", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    const optId = result.current.decision.options[0].id;
    const critId = result.current.decision.criteria[0].id;
    act(() => result.current.updateScore(optId, critId, 8));
    expect(result.current.decision.scores[optId][critId]).toBe(8);
  });

  it("updateScore clamps values to 0-10", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    const optId = result.current.decision.options[0].id;
    const critId = result.current.decision.criteria[0].id;
    act(() => result.current.updateScore(optId, critId, 15));
    expect(result.current.decision.scores[optId][critId]).toBe(10);
    act(() => result.current.updateScore(optId, critId, -3));
    expect(result.current.decision.scores[optId][critId]).toBe(0);
  });

  it("createNewDecision creates and switches to a new decision", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    act(() => result.current.createNewDecision());
    expect(result.current.decision.title).toBe("Untitled Decision");
    expect(result.current.decisions.length).toBe(2);
  });

  it("resetDemo restores demo data", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    act(() => result.current.createNewDecision());
    expect(result.current.decisions.length).toBe(2);
    act(() => result.current.resetDemo());
    expect(result.current.decisions.length).toBe(1);
    expect(result.current.decision.id).toBe(DEMO_DECISION.id);
  });

  it("results are computed from decision data", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    expect(result.current.results.optionResults.length).toBe(DEMO_DECISION.options.length);
    expect(result.current.results.optionResults[0].rank).toBe(1);
  });

  it("sensitivity analysis is computed", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    expect(result.current.sensitivity.points.length).toBeGreaterThan(0);
  });

  // ── Undo/Redo tests ──────────────────────────────────────

  it("undo restores previous state (structural)", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    const before = result.current.decision.options.length;
    act(() => result.current.addOption());
    expect(result.current.decision.options.length).toBe(before + 1);
    act(() => result.current.undo());
    expect(result.current.decision.options.length).toBe(before);
  });

  it("redo restores undone state", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    act(() => result.current.addOption());
    const withOption = result.current.decision.options.length;
    act(() => result.current.undo());
    expect(result.current.decision.options.length).toBe(withOption - 1);
    act(() => result.current.redo());
    expect(result.current.decision.options.length).toBe(withOption);
  });

  it("new mutation after undo clears redo stack", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    act(() => result.current.addOption());
    act(() => result.current.addOption());
    act(() => result.current.undo()); // back to 1 add
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.addOption()); // new structural mutation
    expect(result.current.canRedo).toBe(false);
  });

  it("canUndo / canRedo reflect stack state", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    act(() => result.current.addOption());
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    act(() => result.current.undo());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("switching decisions clears history", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    act(() => result.current.addOption());
    expect(result.current.canUndo).toBe(true);
    act(() => result.current.createNewDecision());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  // ── Undo coalescing tests ──────────────────────────────

  it("rapid title edits coalesce into 1 undo entry", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    const originalTitle = result.current.decision.title;
    // Type several characters rapidly (within 500ms)
    act(() => result.current.updateTitle("H"));
    act(() => result.current.updateTitle("He"));
    act(() => result.current.updateTitle("Hel"));
    act(() => result.current.updateTitle("Hell"));
    act(() => result.current.updateTitle("Hello"));
    expect(result.current.decision.title).toBe("Hello");
    // Single undo should restore the original title
    act(() => result.current.undo());
    expect(result.current.decision.title).toBe(originalTitle);
    // And there should be no more undo entries
    expect(result.current.canUndo).toBe(false);
  });

  it("title edits after 500ms pause create a new undo group", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDecision(), { wrapper });
    const originalTitle = result.current.decision.title;

    // First burst
    act(() => result.current.updateTitle("First"));
    // Advance time past the coalesce window (wrapped in act to flush timers)
    act(() => vi.advanceTimersByTime(600));
    // Second burst
    act(() => result.current.updateTitle("Second"));

    // Undo should restore "First", not the original
    act(() => result.current.undo());
    expect(result.current.decision.title).toBe("First");
    // Another undo restores original
    act(() => result.current.undo());
    expect(result.current.decision.title).toBe(originalTitle);

    vi.useRealTimers();
  });

  it("structural changes always create separate undo entries", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    const startOptions = result.current.decision.options.length;
    act(() => result.current.addOption());
    act(() => result.current.addOption());
    expect(result.current.decision.options.length).toBe(startOptions + 2);
    // Each add should be its own undo entry
    act(() => result.current.undo());
    expect(result.current.decision.options.length).toBe(startOptions + 1);
    act(() => result.current.undo());
    expect(result.current.decision.options.length).toBe(startOptions);
  });

  it("switching from title to option name starts a new undo group", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    const originalTitle = result.current.decision.title;
    const optId = result.current.decision.options[0].id;
    const originalName = result.current.decision.options[0].name;

    // Type in title
    act(() => result.current.updateTitle("Changed Title"));
    // Then type in option name (different field)
    act(() => result.current.updateOption(optId, { name: "Changed Option" }));

    // Undo option name change
    act(() => result.current.undo());
    expect(result.current.decision.options[0].name).toBe(originalName);
    expect(result.current.decision.title).toBe("Changed Title");

    // Undo title change
    act(() => result.current.undo());
    expect(result.current.decision.title).toBe(originalTitle);
  });

  it("redo works correctly with coalesced entries", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    // Rapid title edits (coalesce into 1 entry)
    act(() => result.current.updateTitle("A"));
    act(() => result.current.updateTitle("AB"));
    act(() => result.current.updateTitle("ABC"));
    // Undo the entire burst
    act(() => result.current.undo());
    expect(result.current.decision.title).toBe(DEMO_DECISION.title);
    // Redo restores the final state
    act(() => result.current.redo());
    expect(result.current.decision.title).toBe("ABC");
  });

  it("score changes are always structural", () => {
    const { result } = renderHook(() => useDecision(), { wrapper });
    const optId = result.current.decision.options[0].id;
    const critId = result.current.decision.criteria[0].id;
    act(() => result.current.updateScore(optId, critId, 5));
    act(() => result.current.updateScore(optId, critId, 8));
    // Two structural changes → two undo entries
    act(() => result.current.undo());
    expect(result.current.decision.scores[optId]?.[critId]).toBe(5);
    act(() => result.current.undo());
    // Original score (may be 0 or undefined)
    const orig = DEMO_DECISION.scores[optId]?.[critId] ?? 0;
    expect(result.current.decision.scores[optId]?.[critId] ?? 0).toBe(orig);
  });
});
