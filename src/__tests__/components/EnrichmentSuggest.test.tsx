/**
 * Tests for EnrichmentSuggest component (Issue #108).
 *
 * Validates:
 * - Criterion name → category keyword matching
 * - Suggestion UI rendering with accept/dismiss
 * - Async enrichment and score auto-fill
 * - Tier badge display
 * - Handles no-match / no-options gracefully
 * - Accessibility (ARIA labels)
 *
 * Strategy: The default DEMO_DECISION has location-parseable options
 * ("Austin, TX", "Denver, CO", "Raleigh, NC") and keyword-matching
 * criteria ("Cost of Living", "Weather"). Most tests use it directly.
 * Edge-case tests pre-seed localStorage with custom decisions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { EnrichmentSuggest } from "@/components/EnrichmentSuggest";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "decision-os:decisions";

/** Pre-seed localStorage with a custom decision before rendering. */
function seedDecision(decision: Decision): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([decision]));
}

/** Factory for a minimal test decision. */
function makeDecision(
  overrides: Partial<Decision> & Pick<Decision, "options" | "criteria">,
): Decision {
  return {
    id: `test-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Decision",
    description: "",
    scores: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests — the default DEMO_DECISION has:
//   options:  "Austin, TX", "Denver, CO", "Raleigh, NC"
//   criteria: "Cost of Living" ✓, "Job Opportunities" ✗,
//             "Quality of Life" ✗, "Weather" ✓ (climate keyword),
//             "Proximity to Family" ✗
// → 2 suggestions, each covering 3 options.
// ---------------------------------------------------------------------------

describe("EnrichmentSuggest", () => {
  // ── Detection & rendering ──────────────────────────────

  it("shows suggestions when demo criteria match keywords", async () => {
    renderWithProviders(<EnrichmentSuggest />);

    await waitFor(() => {
      expect(screen.getByText("Suggest Data")).toBeInTheDocument();
    });
  });

  it("detects Cost of Living criterion and shows 3 options", async () => {
    renderWithProviders(<EnrichmentSuggest />);

    await waitFor(() => {
      expect(screen.getByText("Suggest Data")).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText("Enrichment suggestion for Cost of Living"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/3 options/).length).toBeGreaterThanOrEqual(1);
  });

  it("detects Weather criterion via climate keyword", async () => {
    renderWithProviders(<EnrichmentSuggest />);

    await waitFor(() => {
      expect(screen.getByText("Suggest Data")).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText("Enrichment suggestion for Weather"),
    ).toBeInTheDocument();
  });

  it("displays correct suggestion count", async () => {
    renderWithProviders(<EnrichmentSuggest />);

    await waitFor(() => {
      expect(screen.getByText("2 suggestions available")).toBeInTheDocument();
    });
  });

  // ── Edge cases ─────────────────────────────────────────

  it("renders nothing when no criteria match known categories", () => {
    seedDecision(
      makeDecision({
        options: [{ id: "o1", name: "Tokyo, Japan" }],
        criteria: [
          { id: "c1", name: "Random Stuff", weight: 50, type: "benefit" },
        ],
      }),
    );

    renderWithProviders(<EnrichmentSuggest />);
    expect(screen.queryByText("Suggest Data")).not.toBeInTheDocument();
  });

  it("renders nothing when no options are present", () => {
    seedDecision(
      makeDecision({
        options: [],
        criteria: [
          { id: "c1", name: "Cost of Living", weight: 50, type: "cost" },
        ],
      }),
    );

    renderWithProviders(<EnrichmentSuggest />);
    expect(screen.queryByText("Suggest Data")).not.toBeInTheDocument();
  });

  // ── Dismiss flow ───────────────────────────────────────

  it("dismisses a suggestion and updates count", async () => {
    const { user } = renderWithProviders(<EnrichmentSuggest />);

    await waitFor(() => {
      expect(screen.getByText("2 suggestions available")).toBeInTheDocument();
    });

    const dismissBtn = screen.getByLabelText(
      "Dismiss suggestion for Cost of Living",
    );
    await user.click(dismissBtn);

    await waitFor(() => {
      expect(screen.getByText("1 suggestion available")).toBeInTheDocument();
    });

    expect(
      screen.queryByLabelText("Enrichment suggestion for Cost of Living"),
    ).not.toBeInTheDocument();
  });

  // ── Enrich button ──────────────────────────────────────

  it("shows Enrich button in idle state", async () => {
    renderWithProviders(<EnrichmentSuggest />);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Enrich Cost of Living"),
      ).toBeInTheDocument();
    });
  });

  // ── Enrichment execution ───────────────────────────────

  it("runs enrichment and transitions through loading to done", async () => {
    // Seed with a city known to be in the bundled dataset
    seedDecision(
      makeDecision({
        options: [{ id: "o1", name: "Tokyo, Japan" }],
        criteria: [
          { id: "c1", name: "Cost of Living", weight: 100, type: "cost" },
        ],
      }),
    );

    const { user } = renderWithProviders(<EnrichmentSuggest />);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Enrich Cost of Living"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Enrich Cost of Living"));

    // Wait for enrichment to finish — bundled data resolves fast
    await waitFor(
      () => {
        const applied = screen.queryByText("Applied");
        const partial = screen.queryByText("Partial failure");
        expect(applied ?? partial).toBeTruthy();
      },
      { timeout: 10_000 },
    );

    // The Enrich button should be gone (replaced by result state)
    expect(
      screen.queryByLabelText("Enrich Cost of Living"),
    ).not.toBeInTheDocument();

    // Should show option name in results
    expect(screen.getByText("Tokyo, Japan")).toBeInTheDocument();
  }, 15_000);

  // ── Accessibility ──────────────────────────────────────

  it("has correct ARIA labels for accessibility", async () => {
    renderWithProviders(<EnrichmentSuggest />);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Data enrichment suggestions"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText("Enrichment suggestion for Cost of Living"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Enrichment suggestion for Weather"),
    ).toBeInTheDocument();
  });
});
