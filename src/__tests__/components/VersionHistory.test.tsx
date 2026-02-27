/**
 * Unit tests for VersionHistory component.
 *
 * Tests rendering, save checkpoint, expand/collapse, restore confirmation,
 * delete, and diff display.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { resetAutoVersionThrottle } from "@/lib/version-history";

// Lazy-loaded component — import directly for testing
import VersionHistory from "@/components/VersionHistory";

// ── Helpers ────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  resetAutoVersionThrottle();
});

// ── Render Tests ──────────────────────────────────────────────────

describe("VersionHistory", () => {
  it("renders heading and save button", () => {
    renderWithProviders(<VersionHistory />);

    expect(screen.getByRole("heading", { name: /version history/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save version/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/version label/i)).toBeInTheDocument();
  });

  it("shows empty state message when no versions exist", () => {
    renderWithProviders(<VersionHistory />);

    expect(screen.getByText(/no versions saved yet/i)).toBeInTheDocument();
  });

  it("saves a manual version checkpoint", async () => {
    const { user } = renderWithProviders(<VersionHistory />);

    const input = screen.getByPlaceholderText(/version label/i);
    await user.type(input, "My checkpoint");
    await user.click(screen.getByRole("button", { name: /save version/i }));

    await waitFor(() => {
      expect(screen.queryByText(/no versions saved yet/i)).not.toBeInTheDocument();
    });
  });

  it("saves a version without a label", async () => {
    const { user } = renderWithProviders(<VersionHistory />);

    await user.click(screen.getByRole("button", { name: /save version/i }));

    await waitFor(() => {
      expect(screen.queryByText(/no versions saved yet/i)).not.toBeInTheDocument();
    });
  });

  it("displays version count", async () => {
    const { user } = renderWithProviders(<VersionHistory />);

    // Initially 0 versions
    expect(screen.getByText(/0 versions/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save version/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 version(?!s)/i)).toBeInTheDocument();
    });
  });

  it("expands and collapses version details", async () => {
    const { user } = renderWithProviders(<VersionHistory />);

    // Save a version first
    await user.click(screen.getByRole("button", { name: /save version/i }));

    await waitFor(() => {
      expect(screen.queryByText(/no versions saved yet/i)).not.toBeInTheDocument();
    });

    // Find the expand button and click it
    const expandButton = screen.getByRole("button", { expanded: false });
    await user.click(expandButton);

    // Should show details
    await waitFor(() => {
      expect(screen.getByText(/diff vs current/i)).toBeInTheDocument();
      expect(screen.getByText(/restore/i)).toBeInTheDocument();
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    // Collapse
    const collapseButton = screen.getByRole("button", { expanded: true });
    await user.click(collapseButton);

    await waitFor(() => {
      expect(screen.queryByText(/diff vs current/i)).not.toBeInTheDocument();
    });
  });

  it("shows restore confirmation dialog", async () => {
    const { user } = renderWithProviders(<VersionHistory />);

    await user.click(screen.getByRole("button", { name: /save version/i }));

    await waitFor(() => {
      expect(screen.queryByText(/no versions saved yet/i)).not.toBeInTheDocument();
    });

    // Expand
    const expandButton = screen.getByRole("button", { expanded: false });
    await user.click(expandButton);

    // Click Restore
    await waitFor(() => {
      expect(screen.getByText(/restore/i)).toBeInTheDocument();
    });
    const restoreBtn = screen.getByRole("button", { name: /restore/i });
    await user.click(restoreBtn);

    // Confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/restore this version\?/i)).toBeInTheDocument();
      expect(screen.getByText(/confirm/i)).toBeInTheDocument();
      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });
  });

  it("can cancel restore confirmation", async () => {
    const { user } = renderWithProviders(<VersionHistory />);

    await user.click(screen.getByRole("button", { name: /save version/i }));

    await waitFor(() => {
      expect(screen.queryByText(/no versions saved yet/i)).not.toBeInTheDocument();
    });

    const expandButton = screen.getByRole("button", { expanded: false });
    await user.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText(/restore/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /restore/i }));

    await waitFor(() => {
      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });
    await user.click(screen.getByText(/cancel/i));

    // Should go back to normal buttons
    await waitFor(() => {
      expect(screen.queryByText(/restore this version\?/i)).not.toBeInTheDocument();
    });
  });

  it("deletes a version", async () => {
    const { user } = renderWithProviders(<VersionHistory />);

    await user.click(screen.getByRole("button", { name: /save version/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 version(?!s)/i)).toBeInTheDocument();
    });

    const expandButton = screen.getByRole("button", { expanded: false });
    await user.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText(/delete/i)).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/0 versions/i)).toBeInTheDocument();
    });
  });

  it("shows trigger badge for manual versions", async () => {
    const { user } = renderWithProviders(<VersionHistory />);

    await user.click(screen.getByRole("button", { name: /save version/i }));

    await waitFor(() => {
      expect(screen.getByText("Manual")).toBeInTheDocument();
    });
  });
});
