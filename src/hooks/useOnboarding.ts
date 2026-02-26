/**
 * Onboarding state machine hook.
 *
 * States: idle | step1 | step2 | step3
 * On first visit (no localStorage flag), auto-triggers step1.
 * Persists completion to localStorage so returning users skip the tour.
 */

import { useState, useCallback } from "react";

const ONBOARDED_KEY = "decisionos:onboarded";

export type OnboardingStep = "idle" | "step1" | "step2" | "step3";

export interface OnboardingState {
  /** Current step of the tour (idle = not showing) */
  step: OnboardingStep;
  /** Whether the user has been previously onboarded */
  isOnboarded: boolean;
  /** Advance to the next step; from step3 → dismiss */
  next: () => void;
  /** Dismiss the tour entirely */
  dismiss: () => void;
  /** Re-trigger the tour from step1 */
  restart: () => void;
}

/**
 * Check if the user has been onboarded (safe for SSR).
 */
function getOnboarded(): boolean {
  if (typeof window === "undefined") return true; // SSR: assume onboarded
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "true";
  } catch {
    return false;
  }
}

/** Check if this is a shared link (skip onboarding). */
function isShareLink(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("share");
  } catch {
    return false;
  }
}

function setOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, "true");
  } catch {
    // Storage may be full or blocked
  }
}

/** Compute initial onboarding state (lazy initializer for useState). */
function initOnboarding(): { step: OnboardingStep; isOnboarded: boolean } {
  const onboarded = getOnboarded();
  if (onboarded || isShareLink()) {
    return { step: "idle", isOnboarded: onboarded };
  }
  return { step: "step1", isOnboarded: false };
}

export function useOnboarding(): OnboardingState {
  const [state, setState] = useState(initOnboarding);

  const next = useCallback(() => {
    setState((prev) => {
      switch (prev.step) {
        case "step1":
          return { ...prev, step: "step2" as const };
        case "step2":
          return { ...prev, step: "step3" as const };
        case "step3":
          setOnboarded();
          return { step: "idle" as const, isOnboarded: true };
        default:
          return prev;
      }
    });
  }, []);

  const dismiss = useCallback(() => {
    setOnboarded();
    setState({ step: "idle", isOnboarded: true });
  }, []);

  const restart = useCallback(() => {
    setState((prev) => ({ ...prev, step: "step1" as const }));
  }, []);

  return { step: state.step, isOnboarded: state.isOnboarded, next, dismiss, restart };
}
