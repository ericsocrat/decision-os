/**
 * Tests for ProactiveInsights component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { ProactiveInsights } from "@/components/ProactiveInsights";

beforeEach(() => {
  localStorage.clear();
});

describe("ProactiveInsights", () => {
  it("renders the Key Insights section with demo data", () => {
    renderWithProviders(<ProactiveInsights />);
    expect(screen.getByText("Key Insights")).toBeInTheDocument();
    expect(screen.getByTestId("proactive-insights")).toBeInTheDocument();
  });

  it("renders at least one insight card", () => {
    renderWithProviders(<ProactiveInsights />);
    // Demo data should generate at least a robustness or margin insight
    const insights = screen.getByTestId("proactive-insights");
    const cards = insights.querySelectorAll("[data-testid^='insight-']");
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("renders robustness insight", () => {
    renderWithProviders(<ProactiveInsights />);
    expect(screen.getByTestId("insight-robustness")).toBeInTheDocument();
  });

  it("renders margin insight", () => {
    renderWithProviders(<ProactiveInsights />);
    expect(screen.getByTestId("insight-margin")).toBeInTheDocument();
  });

  it("calls onTabChange when action link is clicked", async () => {
    const onTabChange = vi.fn();
    const { user } = renderWithProviders(<ProactiveInsights onTabChange={onTabChange} />);

    // Find any action button
    const actions = screen.queryAllByTestId(/^insight-action-/);
    if (actions.length > 0) {
      await user.click(actions[0]);
      expect(onTabChange).toHaveBeenCalled();
      // Should map action targets to tab IDs
      const calledWith = onTabChange.mock.calls[0][0];
      expect(["sensitivity", "montecarlo", "builder"]).toContain(calledWith);
    }
  });

  it("does not render when decision has no scored options", () => {
    // Override localStorage with a blank decision
    localStorage.setItem(
      "decision-os:decisions",
      JSON.stringify([
        {
          id: "blank",
          title: "Empty",
          options: [{ id: "o1", name: "Only One" }],
          criteria: [{ id: "c1", name: "C1", weight: 50, type: "benefit" }],
          scores: { o1: { c1: 5 } },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ])
    );

    renderWithProviders(<ProactiveInsights />);
    expect(screen.queryByTestId("proactive-insights")).not.toBeInTheDocument();
  });

  it("has proper section heading with aria", () => {
    renderWithProviders(<ProactiveInsights />);
    const section = screen.getByTestId("proactive-insights");
    expect(section.tagName).toBe("SECTION");
    expect(section).toHaveAttribute("aria-labelledby", "insights-heading");
    expect(screen.getByText("Key Insights").id).toBe("insights-heading");
  });
});
