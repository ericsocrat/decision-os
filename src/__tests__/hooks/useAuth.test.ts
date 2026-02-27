/**
 * useAuth hook tests.
 *
 * Verifies auth state management, sign-in/sign-out flows,
 * and behavior when cloud is disabled.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/89
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";

// ─── Mocks ─────────────────────────────────────────────────────────

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock("@/lib/supabase", () => ({
  isCloudEnabled: vi.fn(() => false),
  getSupabase: vi.fn(() => null),
}));

// Get reference to mocked functions so we can change return values
import { isCloudEnabled, getSupabase } from "@/lib/supabase";

const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
    onAuthStateChange: mockOnAuthStateChange,
    signInWithOAuth: mockSignInWithOAuth,
    signOut: mockSignOut,
  },
};

// ─── Tests ─────────────────────────────────────────────────────────

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCloudEnabled).mockReturnValue(false);
    vi.mocked(getSupabase).mockReturnValue(null);
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("returns cloudEnabled=false and loading=false when cloud is disabled", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.cloudEnabled).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("signIn is a no-op when cloud is disabled", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("github");
    });

    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
  });

  it("signOut is a no-op when cloud is disabled", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("sets loading=true initially when cloud is enabled", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    vi.mocked(getSupabase).mockReturnValue(mockSupabaseClient as never);

    const { result, unmount } = renderHook(() => useAuth());

    expect(result.current.cloudEnabled).toBe(true);
    expect(result.current.loading).toBe(true);

    // Wait for async getSession effect to settle, then unmount to avoid act() warning
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    unmount();
  });

  it("fetches session on mount when cloud is enabled", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    vi.mocked(getSupabase).mockReturnValue(mockSupabaseClient as never);
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1", email: "test@example.com" },
          access_token: "tok",
        },
      },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual({ id: "user-1", email: "test@example.com" });
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("subscribes to auth state changes and unsubscribes on unmount", () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    vi.mocked(getSupabase).mockReturnValue(mockSupabaseClient as never);

    const { unmount } = renderHook(() => useAuth());

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("calls signInWithOAuth with the correct provider when cloud is enabled", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    vi.mocked(getSupabase).mockReturnValue(mockSupabaseClient as never);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("google");
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" })
    );
  });

  it("sets error when signIn fails", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    vi.mocked(getSupabase).mockReturnValue(mockSupabaseClient as never);
    mockSignInWithOAuth.mockResolvedValue({
      error: { message: "OAuth error", status: 400 },
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("github");
    });

    expect(result.current.error).toBe("OAuth error");
  });

  it("calls signOut on supabase when cloud is enabled", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    vi.mocked(getSupabase).mockReturnValue(mockSupabaseClient as never);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("sets error when signOut fails", async () => {
    vi.mocked(isCloudEnabled).mockReturnValue(true);
    vi.mocked(getSupabase).mockReturnValue(mockSupabaseClient as never);
    mockSignOut.mockResolvedValue({
      error: { message: "Sign out failed", status: 500 },
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.error).toBe("Sign out failed");
  });
});
