/**
 * Hook for managing the wizard mode (guided vs advanced).
 *
 * First-time users default to "guided" mode (wizard).
 * Returning users restore their persisted preference.
 * Share links (?share=...) force "advanced" mode.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/225
 */

"use client";

import { useState, useCallback, useEffect } from "react";

/** Interface mode: guided wizard or full advanced dashboard */
export type WizardMode = "guided" | "advanced";

export interface WizardModeState {
  /** Current interface mode */
  mode: WizardMode;
  /** Switch to a specific mode (persists to localStorage) */
  setMode: (mode: WizardMode) => void;
  /** Whether this is the user's first visit (no stored preference) */
  isFirstVisit: boolean;
}

const STORAGE_KEY = "decisionos:wizard-mode";

/**
 * Determine the initial mode from URL params and localStorage.
 *
 * Priority order:
 * 1. URL ?share=... → always "advanced"
 * 2. URL ?mode=guided|advanced → override
 * 3. localStorage stored preference
 * 4. Default: "guided" (first visit)
 */
function resolveInitialMode(): { mode: WizardMode; isFirstVisit: boolean } {
  if (typeof window === "undefined") {
    return { mode: "guided", isFirstVisit: true };
  }

  const params = new URLSearchParams(window.location.search);

  // Share links always force advanced mode
  if (params.has("share")) {
    return { mode: "advanced", isFirstVisit: false };
  }

  // Explicit mode param overrides everything
  const modeParam = params.get("mode");
  if (modeParam === "guided" || modeParam === "advanced") {
    return { mode: modeParam, isFirstVisit: false };
  }

  // Check localStorage for returning user preference
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "guided" || stored === "advanced") {
      return { mode: stored, isFirstVisit: false };
    }
  } catch {
    // localStorage unavailable
  }

  // First visit — default to guided
  return { mode: "guided", isFirstVisit: true };
}

/**
 * Manage the interface mode (guided wizard vs advanced dashboard).
 */
export function useWizardMode(): WizardModeState {
  const [state] = useState(resolveInitialMode);
  const [mode, setModeState] = useState<WizardMode>(state.mode);
  const [isFirstVisit] = useState(state.isFirstVisit);

  const setMode = useCallback((newMode: WizardMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Persist initial mode on first visit
  useEffect(() => {
    if (isFirstVisit) {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // localStorage unavailable
      }
    }
  }, [isFirstVisit, mode]);

  return { mode, setMode, isFirstVisit };
}
