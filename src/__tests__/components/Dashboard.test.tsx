/**
 * Tests for Dashboard component — card rendering, actions, search, sort.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { Dashboard } from "@/components/Dashboard";
import { DEMO_DECISION } from "@/lib/demo-data";
import type { Decision } from "@/lib/types";

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  const id = `dec-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    title: "Second Decision",
    options: [
      { id: "o1", name: "Opt A" },
      { id: "o2", name: "Opt B" },
    ],
    criteria: [{ id: "c1", name: "Cost", weight: 50, type: "benefit" }],
    scores: { o1: { c1: 7 }, o2: { c1: 4 } },
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Dashboard", () => {
  const onOpen = vi.fn();
  const onNew = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    onOpen.mockClear();
    onNew.mockClear();
  });

  it("renders the dashboard container", () => {
    renderWithProviders(<Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />);
    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
  });

  it("renders 'Your Decisions' heading", () => {
    renderWithProviders(<Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />);
    expect(screen.getByText("Your Decisions")).toBeInTheDocument();
  });

  it("renders decision cards for each saved decision", () => {
    const second = makeDecision();
    localStorage.setItem(
      "decision-os:decisions",
      JSON.stringify([DEMO_DECISION, second])
    );

    renderWithProviders(<Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />);

    // At least one card should render the demo decision title
    expect(screen.getByText(DEMO_DECISION.title)).toBeInTheDocument();
    expect(screen.getByText("Second Decision")).toBeInTheDocument();
  });

  it("renders 'New Decision' button", () => {
    renderWithProviders(<Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />);
    expect(screen.getByTestId("dashboard-new-decision")).toBeInTheDocument();
  });

  it("calls onNewDecision when 'New Decision' is clicked", async () => {
    const { user } = renderWithProviders(
      <Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />
    );

    await user.click(screen.getByTestId("dashboard-new-decision"));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("renders search input", () => {
    renderWithProviders(<Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />);
    expect(screen.getByTestId("dashboard-search")).toBeInTheDocument();
  });

  it("renders sort selector", () => {
    renderWithProviders(<Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />);
    expect(screen.getByTestId("dashboard-sort")).toBeInTheDocument();
  });

  it("renders Import and Export buttons", () => {
    renderWithProviders(<Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />);
    expect(screen.getByTestId("dashboard-import")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-export")).toBeInTheDocument();
  });

  it("filters cards when searching", async () => {
    const second = makeDecision({ title: "Apartment Hunt" });
    localStorage.setItem(
      "decision-os:decisions",
      JSON.stringify([DEMO_DECISION, second])
    );

    const { user } = renderWithProviders(
      <Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />
    );

    const searchInput = screen.getByTestId("dashboard-search");
    await user.type(searchInput, "apart");

    expect(screen.getByText("Apartment Hunt")).toBeInTheDocument();
    expect(screen.queryByText(DEMO_DECISION.title)).not.toBeInTheDocument();
  });

  it("shows cross-decision insights when 2+ decisions exist", () => {
    const second = makeDecision();
    localStorage.setItem(
      "decision-os:decisions",
      JSON.stringify([DEMO_DECISION, second])
    );

    renderWithProviders(<Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />);
    expect(screen.getByTestId("cross-decision-insights")).toBeInTheDocument();
  });

  it("does not show insights for a single decision", () => {
    renderWithProviders(<Dashboard onOpenDecision={onOpen} onNewDecision={onNew} />);
    expect(screen.queryByTestId("cross-decision-insights")).not.toBeInTheDocument();
  });
});
