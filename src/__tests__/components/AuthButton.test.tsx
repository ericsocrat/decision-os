/**
 * Tests for AuthButton component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthButton } from "@/components/AuthButton";
import type { AuthState } from "@/hooks/useAuth";
import type { User } from "@supabase/supabase-js";

function makeAuth(overrides: Partial<AuthState> = {}): AuthState {
  return {
    user: null,
    session: null,
    loading: false,
    cloudEnabled: true,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "alice@example.com",
    app_metadata: {},
    user_metadata: { full_name: "Alice Smith", avatar_url: "https://example.com/avatar.png" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

describe("AuthButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── Guard: local-only mode ─────────────────────────── */
  it("renders nothing when cloudEnabled is false", () => {
    const { container } = render(<AuthButton auth={makeAuth({ cloudEnabled: false })} />);
    expect(container.innerHTML).toBe("");
  });

  /* ── Loading state ──────────────────────────────────── */
  it("shows loading skeleton when loading", () => {
    const { container } = render(<AuthButton auth={makeAuth({ loading: true })} />);
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });

  /* ── Signed-in state ────────────────────────────────── */
  it("shows user display name and avatar when signed in", () => {
    render(<AuthButton auth={makeAuth({ user: makeUser() })} />);
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    // alt="" gives the img role="presentation", so query by presentation role
    const avatar = screen.getByRole("presentation");
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("shows initial letter fallback when no avatar_url", () => {
    const user = makeUser({ user_metadata: { full_name: "Bob" } });
    render(<AuthButton auth={makeAuth({ user })} />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("falls back to email prefix when no full_name", () => {
    const user = makeUser({ user_metadata: {}, email: "charlie@example.com" });
    render(<AuthButton auth={makeAuth({ user })} />);
    expect(screen.getByText("charlie")).toBeInTheDocument();
  });

  it("calls signOut when Sign Out is clicked", async () => {
    const signOut = vi.fn();
    const user = userEvent.setup();
    render(<AuthButton auth={makeAuth({ user: makeUser(), signOut })} />);
    await user.click(screen.getByLabelText("Sign out"));
    expect(signOut).toHaveBeenCalled();
  });

  /* ── Signed-out state (dropdown) ────────────────────── */
  it("shows Sign In button when signed out", () => {
    render(<AuthButton auth={makeAuth()} />);
    expect(screen.getByLabelText("Sign in")).toBeInTheDocument();
  });

  it("opens dropdown with auth providers on click", async () => {
    const user = userEvent.setup();
    render(<AuthButton auth={makeAuth()} />);
    await user.click(screen.getByLabelText("Sign in"));
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
  });

  it("calls signIn('github') when GitHub option is clicked", async () => {
    const signIn = vi.fn();
    const user = userEvent.setup();
    render(<AuthButton auth={makeAuth({ signIn })} />);
    await user.click(screen.getByLabelText("Sign in"));
    await user.click(screen.getByText("Continue with GitHub"));
    expect(signIn).toHaveBeenCalledWith("github");
  });

  it("calls signIn('google') when Google option is clicked", async () => {
    const signIn = vi.fn();
    const user = userEvent.setup();
    render(<AuthButton auth={makeAuth({ signIn })} />);
    await user.click(screen.getByLabelText("Sign in"));
    await user.click(screen.getByText("Continue with Google"));
    expect(signIn).toHaveBeenCalledWith("google");
  });

  it("closes dropdown on Escape key", async () => {
    const user = userEvent.setup();
    render(<AuthButton auth={makeAuth()} />);
    await user.click(screen.getByLabelText("Sign in"));
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByText("Continue with GitHub")).not.toBeInTheDocument();
    });
  });

  it("closes dropdown on outside click", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <AuthButton auth={makeAuth()} />
      </div>,
    );
    await user.click(screen.getByLabelText("Sign in"));
    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    await waitFor(() => {
      expect(screen.queryByText("Continue with GitHub")).not.toBeInTheDocument();
    });
  });

  it("shows error message in dropdown when error is set", async () => {
    const user = userEvent.setup();
    render(<AuthButton auth={makeAuth({ error: "Auth failed" })} />);
    await user.click(screen.getByLabelText("Sign in"));
    expect(screen.getByText("Auth failed")).toBeInTheDocument();
  });

  it("sets aria-expanded correctly on Sign In button", async () => {
    const user = userEvent.setup();
    render(<AuthButton auth={makeAuth()} />);
    const btn = screen.getByLabelText("Sign in");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });
});
