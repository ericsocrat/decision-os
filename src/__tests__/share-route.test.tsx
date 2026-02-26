/**
 * /share route integration tests.
 *
 * Verifies the ShareView component correctly renders shared decisions
 * from URL hash data, including error states for invalid/missing data
 * and read-only mode verification.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/90
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { ShareView } from "@/components/ShareView";
import { encodeShareUrl } from "@/lib/share";
import type { Decision } from "@/lib/types";

// ─── Mocks ─────────────────────────────────────────────────────────

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

const sampleDecision: Decision = {
  id: "share-test-decision",
  title: "Best Programming Language",
  description: "Comparing languages for our next project",
  options: [
    { id: "opt-ts", name: "TypeScript" },
    { id: "opt-py", name: "Python" },
    { id: "opt-rs", name: "Rust" },
  ],
  criteria: [
    { id: "c-perf", name: "Performance", weight: 40, type: "benefit" },
    { id: "c-eco", name: "Ecosystem", weight: 35, type: "benefit" },
    { id: "c-learn", name: "Learning Curve", weight: 25, type: "cost" },
  ],
  scores: {
    "opt-ts": { "c-perf": 7, "c-eco": 9, "c-learn": 3 },
    "opt-py": { "c-perf": 5, "c-eco": 10, "c-learn": 2 },
    "opt-rs": { "c-perf": 10, "c-eco": 6, "c-learn": 8 },
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-15T12:00:00.000Z",
};

// ─── Helpers ───────────────────────────────────────────────────────

let originalHash: string;

beforeEach(() => {
  originalHash = window.location.hash;
});

afterEach(() => {
  window.location.hash = originalHash;
});

// ─── Tests ─────────────────────────────────────────────────────────

describe("ShareView (/share route)", () => {
  it("shows error when URL has no hash data", async () => {
    window.location.hash = "";

    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Decision")).toBeInTheDocument();
    });
    expect(screen.getByText("No decision data found in the URL.")).toBeInTheDocument();
  });

  it("shows error for invalid hash prefix", async () => {
    window.location.hash = "#invalid=data";

    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("No decision data found in the URL.")).toBeInTheDocument();
    });
  });

  it("shows error for empty share data", async () => {
    window.location.hash = "#d=";

    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Empty share data.")).toBeInTheDocument();
    });
  });

  it("shows error for corrupted/invalid encoded data", async () => {
    window.location.hash = "#d=this-is-not-valid-lzstring-data!!!";

    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Failed to decode the shared decision. The link may be invalid or corrupted."
        )
      ).toBeInTheDocument();
    });
  });

  it("renders shared decision in read-only mode with valid data", async () => {
    const encoded = encodeShareUrl(sampleDecision);
    window.location.hash = `#d=${encoded}`;

    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Best Programming Language")).toBeInTheDocument();
    });

    // Description is shown
    expect(screen.getByText("Comparing languages for our next project")).toBeInTheDocument();

    // "Shared Decision" label is rendered
    expect(screen.getByText("Shared Decision")).toBeInTheDocument();

    // Option names appear in the rankings and breakdown
    expect(screen.getAllByText("TypeScript").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Python").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Rust").length).toBeGreaterThanOrEqual(1);

    // Criteria names appear in the breakdown
    expect(screen.getAllByText("Performance").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ecosystem").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Learning Curve").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render edit controls (read-only mode)", async () => {
    const encoded = encodeShareUrl(sampleDecision);
    window.location.hash = `#d=${encoded}`;

    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Best Programming Language")).toBeInTheDocument();
    });

    // No edit-related buttons
    expect(screen.queryByRole("button", { name: /Add Option/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Criterion/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Undo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Redo/i })).not.toBeInTheDocument();
  });

  it("renders 'Open in Decision OS' link pointing to root", async () => {
    const encoded = encodeShareUrl(sampleDecision);
    window.location.hash = `#d=${encoded}`;

    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Best Programming Language")).toBeInTheDocument();
    });

    const link = screen.getByText("Open in Decision OS");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/");
  });

  it("renders 'Go to Decision OS' link on error state", async () => {
    window.location.hash = "";

    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Decision")).toBeInTheDocument();
    });

    const link = screen.getByText("Go to Decision OS");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/");
  });

  it("share page renders without requiring authentication", async () => {
    const encoded = encodeShareUrl(sampleDecision);
    window.location.hash = `#d=${encoded}`;

    // Rendering without any auth mocks should work fine
    renderWithProviders(<ShareView />);

    await waitFor(() => {
      expect(screen.getByText("Best Programming Language")).toBeInTheDocument();
    });

    // The page renders successfully without auth — no auth error shown
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/login/i)).not.toBeInTheDocument();
  });
});
