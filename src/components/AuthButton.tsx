/**
 * AuthButton — Sign in/out UI for the header.
 *
 * Shows nothing when cloud auth is not configured (local-only mode).
 * When configured but not signed in: shows "Sign In" dropdown with providers.
 * When signed in: shows avatar + "Sign Out" button.
 */

"use client";

import { memo, useCallback, useRef, useState, useEffect } from "react";
import { LogIn, LogOut, Github, ChevronDown } from "lucide-react";
import type { AuthState } from "@/hooks/useAuth";

interface AuthButtonProps {
  auth: AuthState;
}

export const AuthButton = memo(function AuthButton({ auth }: AuthButtonProps) {
  const { user, loading, cloudEnabled, error, signIn, signOut } = auth;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const handleSignIn = useCallback(
    (provider: "github" | "google") => {
      setIsOpen(false);
      signIn(provider);
    },
    [signIn]
  );

  // Don't render at all in local-only mode
  if (!cloudEnabled) return null;

  // Loading state
  if (loading) {
    return <div className="h-8 w-20 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />;
  }

  // Signed in
  if (user) {
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.preferred_username ||
      user.email?.split("@")[0] ||
      "User";
    const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5" title={user.email ?? displayName}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-6 w-6 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hidden text-sm text-gray-700 dark:text-gray-300 sm:inline">
            {displayName}
          </span>
        </div>

        <button
          onClick={signOut}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    );
  }

  // Signed out — dropdown with providers
  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        aria-label="Sign in"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <LogIn className="h-4 w-4" />
        <span>Sign In</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-800"
          role="menu"
        >
          <div className="p-1.5">
            <button
              onClick={() => handleSignIn("github")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              role="menuitem"
            >
              <Github className="h-4 w-4" />
              Continue with GitHub
            </button>
            <button
              onClick={() => handleSignIn("google")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              role="menuitem"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          {error && (
            <div className="border-t border-gray-200 px-3 py-2 text-xs text-red-500 dark:border-gray-700">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/** Simple Google icon (inline SVG to avoid an extra dependency). */
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
