/**
 * CompareView component tests.
 *
 * Verifies the decision comparison UI: selector dropdowns, empty states,
 * agreement badge, side-by-side rankings, divergence heatmap, and weight table.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/85
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { CompareView } from "@/components/CompareView";
import type { Decision } from "@/lib/types";

const STORAGE_KEY = "decision-os:decisions";

// ─── Fixtures ──────────────────────────────────────────────────────

const decisionA: Decision = {
  id: "dec-a",
  title: "Decision Alpha",
  description: "First decision",
  options: [
    { id: "opt-1", name: "Option X" },
    { id: "opt-2", name: "Option Y" },
    { id: "opt-3", name: "Option Z" },
  ],
  criteria: [
    { id: "crit-1", name: "Speed", weight: 50, type: "benefit" },
    { id: "crit-2", name: "Cost", weight: 30, type: "cost" },
    { id: "crit-3", name: "Quality", weight: 20, type: "benefit" },
  ],
  scores: {
    "opt-1": { "crit-1": 8, "crit-2": 5, "crit-3": 7 },
    "opt-2": { "crit-1": 6, "crit-2": 3, "crit-3": 9 },
    "opt-3": { "crit-1": 4, "crit-2": 8, "crit-3": 5 },
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const decisionB: Decision = {
  id: "dec-b",
  title: "Decision Beta",
  description: "Second decision",
  options: [
    { id: "opt-1", name: "Option X" },
    { id: "opt-2", name: "Option Y" },
    { id: "opt-3", name: "Option Z" },
  ],
  criteria: [
    { id: "crit-1", name: "Speed", weight: 40, type: "benefit" },
    { id: "crit-2", name: "Cost", weight: 40, type: "cost" },
    { id: "crit-3", name: "Quality", weight: 20, type: "benefit" },
  ],
  scores: {
    "opt-1": { "crit-1": 7, "crit-2": 6, "crit-3": 8 },
    "opt-2": { "crit-1": 5, "crit-2": 4, "crit-3": 7 },
    "opt-3": { "crit-1": 9, "crit-2": 2, "crit-3": 6 },
  },
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function seedDecisions(decisions: Decision[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("CompareView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // --- Empty state ---

  it("shows empty state when fewer than 2 decisions exist", () => {
    // Default localStorage has 1 demo decision
    renderWithProviders(<CompareView />);

    expect(screen.getByText(/Create at least 2 decisions/i)).toBeInTheDocument();
  });

  // --- Selector rendering ---

  it("renders two dropdown selectors when 2+ decisions exist", () => {
    seedDecisions([decisionA, decisionB]);
    renderWithProviders(<CompareView />);

    const selectA = screen.getByLabelText("Decision A");
    const selectB = screen.getByLabelText("Decision B");

    expect(selectA).toBeInTheDocument();
    expect(selectB).toBeInTheDocument();
  });

  it("lists all decision titles in dropdown options", () => {
    seedDecisions([decisionA, decisionB]);
    renderWithProviders(<CompareView />);

    const selectA = screen.getByLabelText("Decision A");
    const options = within(selectA).getAllByRole("option");

    // Placeholder + 2 decisions
    expect(options).toHaveLength(3);
    expect(options[1]).toHaveTextContent("Decision Alpha");
    expect(options[2]).toHaveTextContent("Decision Beta");
  });

  // --- Pre-selection state ---

  it("shows prompt text before both selections are made", () => {
    seedDecisions([decisionA, decisionB]);
    renderWithProviders(<CompareView />);

    expect(screen.getByText(/Select two decisions above/i)).toBeInTheDocument();
  });

  // --- Comparison results ---

  it("renders agreement badge after selecting both decisions", async () => {
    seedDecisions([decisionA, decisionB]);
    const { user } = renderWithProviders(<CompareView />);

    const selectA = screen.getByLabelText("Decision A");
    const selectB = screen.getByLabelText("Decision B");

    await user.selectOptions(selectA, "dec-a");
    await user.selectOptions(selectB, "dec-b");

    // Agreement badge shows alignment text
    expect(screen.getByText(/alignment/i)).toBeInTheDocument();
  });

  it("renders side-by-side rankings with option names", async () => {
    seedDecisions([decisionA, decisionB]);
    const { user } = renderWithProviders(<CompareView />);

    await user.selectOptions(screen.getByLabelText("Decision A"), "dec-a");
    await user.selectOptions(screen.getByLabelText("Decision B"), "dec-b");

    // Both decision titles appear in the comparison
    expect(screen.getAllByText("Decision Alpha").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Decision Beta").length).toBeGreaterThanOrEqual(1);

    // Shared options appear in the comparison
    expect(screen.getAllByText("Option X").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Option Y").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Option Z").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the divergence heatmap table", async () => {
    seedDecisions([decisionA, decisionB]);
    const { user } = renderWithProviders(<CompareView />);

    await user.selectOptions(screen.getByLabelText("Decision A"), "dec-a");
    await user.selectOptions(screen.getByLabelText("Decision B"), "dec-b");

    // Heatmap section heading
    expect(screen.getByText("Score Divergence")).toBeInTheDocument();

    // Table headers (appear in both divergence and weight tables)
    expect(screen.getAllByText("Dec A").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Dec B").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Delta").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the weight comparison table", async () => {
    seedDecisions([decisionA, decisionB]);
    const { user } = renderWithProviders(<CompareView />);

    await user.selectOptions(screen.getByLabelText("Decision A"), "dec-a");
    await user.selectOptions(screen.getByLabelText("Decision B"), "dec-b");

    expect(screen.getByText("Weight Comparison")).toBeInTheDocument();

    // Shared criteria should appear
    expect(screen.getAllByText("Speed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Cost").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Quality").length).toBeGreaterThanOrEqual(1);
  });

  it("renders delta analysis section", async () => {
    seedDecisions([decisionA, decisionB]);
    const { user } = renderWithProviders(<CompareView />);

    await user.selectOptions(screen.getByLabelText("Decision A"), "dec-a");
    await user.selectOptions(screen.getByLabelText("Decision B"), "dec-b");

    expect(screen.getByText("Delta Analysis")).toBeInTheDocument();
  });

  // --- Edge: non-overlapping options ---

  it("shows N/A for options that exist in only one decision", async () => {
    const decisionWithExtra: Decision = {
      ...decisionB,
      id: "dec-c",
      title: "Decision Gamma",
      options: [
        { id: "opt-1", name: "Option X" },
        { id: "opt-unique", name: "Unique Option" },
      ],
      scores: {
        "opt-1": { "crit-1": 7, "crit-2": 6, "crit-3": 8 },
        "opt-unique": { "crit-1": 5, "crit-2": 5, "crit-3": 5 },
      },
    };
    seedDecisions([decisionA, decisionWithExtra]);
    const { user } = renderWithProviders(<CompareView />);

    await user.selectOptions(screen.getByLabelText("Decision A"), "dec-a");
    await user.selectOptions(screen.getByLabelText("Decision B"), "dec-c");

    // Options only in one decision show N/A
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThanOrEqual(1);
  });

  // --- Disabling logic ---

  it("disables selected Decision A in Decision B dropdown", async () => {
    seedDecisions([decisionA, decisionB]);
    const { user } = renderWithProviders(<CompareView />);

    await user.selectOptions(screen.getByLabelText("Decision A"), "dec-a");

    const selectB = screen.getByLabelText("Decision B");
    const optionAinB = within(selectB).getByText("Decision Alpha");

    expect(optionAinB).toBeDisabled();
  });
});
