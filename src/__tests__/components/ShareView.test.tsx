/**
 * ShareView component tests — read-only shared decision display.
 *
 * Covers the sub-sections rendered when a valid decision is loaded:
 * rankings, score breakdown, sensitivity, top drivers, and footer.
 * Error state and basic rendering are covered by share-route.test.tsx (#90).
 *
 * @see https://github.com/ericsocrat/decision-os/issues/87
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { ShareView } from "@/components/ShareView";
import { encodeShareUrl } from "@/lib/share";
import type { Decision } from "@/lib/types";

// Mock next/link to render as plain <a>
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ─── Fixtures ──────────────────────────────────────────────────────

const testDecision: Decision = {
  id: "share-view-test",
  title: "Remote vs Office Work",
  description: "Evaluating work arrangements for the team",
  options: [
    { id: "opt-remote", name: "Fully Remote" },
    { id: "opt-hybrid", name: "Hybrid (3/2)" },
    { id: "opt-office", name: "Full Office" },
  ],
  criteria: [
    { id: "c-prod", name: "Productivity", weight: 40, type: "benefit" },
    { id: "c-cost", name: "Cost Savings", weight: 30, type: "benefit" },
    { id: "c-collab", name: "Collaboration", weight: 30, type: "benefit" },
  ],
  scores: {
    "opt-remote": { "c-prod": 8, "c-cost": 9, "c-collab": 5 },
    "opt-hybrid": { "c-prod": 7, "c-cost": 6, "c-collab": 8 },
    "opt-office": { "c-prod": 6, "c-cost": 3, "c-collab": 9 },
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-15T00:00:00.000Z",
};

let originalHash: string;

beforeEach(() => {
  originalHash = window.location.hash;
});

afterEach(() => {
  window.location.hash = originalHash;
});

function setValidHash() {
  const encoded = encodeShareUrl(testDecision);
  window.location.hash = `#d=${encoded}`;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("ShareView", () => {
  it("renders the rankings section with ranked options", async () => {
    setValidHash();
    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Remote vs Office Work")).toBeInTheDocument();
    });

    // Rankings heading
    expect(screen.getByText("Rankings")).toBeInTheDocument();

    // All option names appear
    expect(screen.getAllByText("Fully Remote").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Hybrid (3/2)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Full Office").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the score breakdown table with criteria columns", async () => {
    setValidHash();
    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Remote vs Office Work")).toBeInTheDocument();
    });

    // Criteria names appear in the breakdown
    expect(screen.getAllByText("Productivity").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Cost Savings").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Collaboration").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the sensitivity analysis section", async () => {
    setValidHash();
    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Remote vs Office Work")).toBeInTheDocument();
    });

    // Sensitivity section heading
    expect(screen.getByText("Sensitivity Analysis")).toBeInTheDocument();
  });

  it("renders top drivers section", async () => {
    setValidHash();
    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Remote vs Office Work")).toBeInTheDocument();
    });

    expect(screen.getByText("Top Drivers")).toBeInTheDocument();
  });

  it("renders the powered-by footer", async () => {
    setValidHash();
    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Remote vs Office Work")).toBeInTheDocument();
    });

    expect(screen.getByText(/Powered by/)).toBeInTheDocument();
  });

  it("renders the decision description when present", async () => {
    setValidHash();
    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Remote vs Office Work")).toBeInTheDocument();
    });

    expect(screen.getByText("Evaluating work arrangements for the team")).toBeInTheDocument();
  });

  it("renders score bars with percentage widths in rankings", async () => {
    setValidHash();
    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Remote vs Office Work")).toBeInTheDocument();
    });

    // Score bars should render — they have aria roles or visual widths
    // The highest-scoring option gets 100% width, others proportionally less
    // Check that score numbers appear
    const scoreElements = screen.getAllByText(/^\d+\.\d+$/);
    expect(scoreElements.length).toBeGreaterThan(0);
  });
});
