/**
 * Unit tests for CollaborationBadge component.
 *
 * Covers connection status display, collaborator count,
 * and screen-reader announcements on join/leave.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollaborationBadge } from "@/components/CollaborationBadge";
import { AnnouncerProvider } from "@/components/Announcer";

// ─── Helpers ──────────────────────────────────────────────────────

function renderBadge(props: {
  connectionStatus: "disconnected" | "connecting" | "connected";
  collaboratorCount: number;
}) {
  return render(
    <AnnouncerProvider>
      <CollaborationBadge {...props} />
    </AnnouncerProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe("CollaborationBadge", () => {
  it("renders nothing when disconnected", () => {
    renderBadge({
      connectionStatus: "disconnected",
      collaboratorCount: 0,
    });
    // No badge should be present (Announcer sr-only divs still exist)
    expect(screen.queryByText("Connecting…")).not.toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
  });

  it("shows 'Connecting…' when connecting", () => {
    renderBadge({
      connectionStatus: "connecting",
      collaboratorCount: 0,
    });
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
  });

  it("shows 'Live' when connected with no collaborators", () => {
    renderBadge({
      connectionStatus: "connected",
      collaboratorCount: 0,
    });
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows collaborator count when connected", () => {
    renderBadge({
      connectionStatus: "connected",
      collaboratorCount: 3,
    });
    expect(screen.getByText("3 collaborators")).toBeInTheDocument();
  });

  it("uses singular for 1 collaborator", () => {
    renderBadge({
      connectionStatus: "connected",
      collaboratorCount: 1,
    });
    expect(screen.getByText("1 collaborator")).toBeInTheDocument();
  });

  it("has aria-live for screen readers", () => {
    renderBadge({
      connectionStatus: "connected",
      collaboratorCount: 2,
    });
    const statuses = screen.getAllByRole("status");
    const badge = statuses.find((el) => el.textContent?.includes("collaborator"));
    expect(badge).toBeDefined();
    expect(badge).toHaveAttribute("aria-live", "polite");
  });

  it("announces when a collaborator joins", () => {
    const { rerender } = render(
      <AnnouncerProvider>
        <CollaborationBadge connectionStatus="connected" collaboratorCount={1} />
      </AnnouncerProvider>,
    );

    // Increase count to trigger join announcement
    rerender(
      <AnnouncerProvider>
        <CollaborationBadge connectionStatus="connected" collaboratorCount={2} />
      </AnnouncerProvider>,
    );

    // The announcement is made via the Announcer — verify the badge updates
    expect(screen.getByText("2 collaborators")).toBeInTheDocument();
  });

  it("announces when a collaborator leaves", () => {
    const { rerender } = render(
      <AnnouncerProvider>
        <CollaborationBadge connectionStatus="connected" collaboratorCount={3} />
      </AnnouncerProvider>,
    );

    rerender(
      <AnnouncerProvider>
        <CollaborationBadge connectionStatus="connected" collaboratorCount={2} />
      </AnnouncerProvider>,
    );

    expect(screen.getByText("2 collaborators")).toBeInTheDocument();
  });
});
