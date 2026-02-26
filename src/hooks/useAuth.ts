/**
 * Authentication hook for Decision OS.
 *
 * Wraps Supabase Auth with a React-friendly API.
 * Returns `null` user and no-op methods when cloud is not configured,
 * so callers never need to check isCloudEnabled() themselves.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { getSupabase, isCloudEnabled } from "@/lib/supabase";

export interface AuthState {
  /** Current Supabase user or null. */
  user: User | null;
  /** Current session or null. */
  session: Session | null;
  /** True while the initial session check is in progress. */
  loading: boolean;
  /** Whether cloud auth is even available (env vars set). */
  cloudEnabled: boolean;
  /** Last auth error message if any. */
  error: string | null;

  /** Sign in with a supported OAuth provider. */
  signIn: (provider: "github" | "google") => Promise<void>;
  /** Sign out and clear the session. */
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const cloudEnabled = isCloudEnabled();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // If cloud is not configured, we're never "loading" — skip straight to idle
  const [loading, setLoading] = useState(cloudEnabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cloudEnabled) return;

    const sb = getSupabase();
    if (!sb) return; // Should not happen if cloudEnabled is true

    // Get initial session (async — setState in callback is fine)
    sb.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setError(null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [cloudEnabled]);

  const signIn = useCallback(async (provider: "github" | "google") => {
    const sb = getSupabase();
    if (!sb) return;

    setError(null);
    const { error: authError } = await sb.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    if (authError) {
      handleAuthError(authError, setError);
    }
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;

    setError(null);
    const { error: authError } = await sb.auth.signOut();
    if (authError) {
      handleAuthError(authError, setError);
    }
  }, []);

  return {
    user,
    session,
    loading,
    cloudEnabled,
    error,
    signIn,
    signOut,
  };
}

function handleAuthError(err: AuthError, setError: (msg: string) => void) {
  console.error("[DecisionOS:auth]", err.message);
  setError(err.message);
}
