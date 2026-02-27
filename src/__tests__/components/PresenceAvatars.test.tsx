/**
 * Unit tests for PresenceAvatars component.
 *
 * Covers avatar rendering, initials extraction, overflow indicator,
 * editing indicator, and accessibility attributes.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PresenceAvatars } from "@/components/PresenceAvatars";
import type { PresenceUser } from "@/lib/realtime-types";

// ─── Helpers ──────────────────────────────────────────────────────

function makeUser(overrides: Partial<PresenceUser> = {}): PresenceUser {
  return {
    userId: "u-1",
    displayName: "Alice Smith",
    avatarUrl: "",
    editingField: null,
    joinedAt: new Date().toISOString(),
    color: "#3b82f6",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe("PresenceAvatars", () => {
  it("renders nothing when no collaborators", () => {
    const { container } = render(<PresenceAvatars collaborators={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders avatar with initials for a single user", () => {
    render(<PresenceAvatars collaborators={[makeUser()]} />);
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("renders initials from single-word name", () => {
    render(
      <PresenceAvatars collaborators={[makeUser({ displayName: "Alice" })]} />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders avatar image when avatarUrl is provided", () => {
    render(
      <PresenceAvatars
        collaborators={[
          makeUser({ avatarUrl: "https://example.com/avatar.png" }),
        ]}
      />,
    );
    const img = screen.getByAltText("Alice Smith");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("shows editing indicator dot when user is editing", () => {
    render(
      <PresenceAvatars
        collaborators={[makeUser({ editingField: "title" })]}
      />,
    );

    const avatar = screen.getByRole("img", { name: /editing title/i });
    expect(avatar).toBeInTheDocument();
  });

  it("shows up to 4 visible avatars", () => {
    const users = Array.from({ length: 4 }, (_, i) =>
      makeUser({
        userId: `u-${i}`,
        displayName: `User ${i}`,
        color: `#${String(i).padStart(6, "0")}`,
      }),
    );

    render(<PresenceAvatars collaborators={users} />);

    // All 4 should be visible
    for (let i = 0; i < 4; i++) {
      expect(screen.getByText(`U${i}`)).toBeInTheDocument();
    }
  });

  it("shows +N overflow indicator for more than 4 collaborators", () => {
    const users = Array.from({ length: 6 }, (_, i) =>
      makeUser({
        userId: `u-${i}`,
        displayName: `User ${i}`,
        color: `#${String(i).padStart(6, "0")}`,
      }),
    );

    render(<PresenceAvatars collaborators={users} />);

    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("has proper aria-label on the group", () => {
    const users = [
      makeUser({ userId: "u-1" }),
      makeUser({ userId: "u-2", displayName: "Bob" }),
    ];

    render(<PresenceAvatars collaborators={users} />);

    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("aria-label", "2 collaborators connected");
  });

  it("uses singular label for one collaborator", () => {
    render(<PresenceAvatars collaborators={[makeUser()]} />);

    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("aria-label", "1 collaborator connected");
  });

  it("applies collaborator color as background", () => {
    render(
      <PresenceAvatars
        collaborators={[makeUser({ color: "#ef4444" })]}
      />,
    );

    const avatar = screen.getByRole("img");
    expect(avatar).toHaveStyle({ backgroundColor: "#ef4444" });
  });
});
