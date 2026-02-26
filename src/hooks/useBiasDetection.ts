/**
 * useBiasDetection — debounced bias detection with dismissal management.
 *
 * Runs detectBiases() when the decision changes, debounced by 500ms.
 * Supports individual dismiss and "dismiss all". Dismissed warnings
 * reappear when the decision data changes (new hash).
 */

"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { detectBiases, type BiasWarning, type BiasType } from "@/lib/bias-detection";
import type { Decision } from "@/lib/types";

/** Create a simple hash of the decision's scoring-relevant data. */
function decisionHash(d: Decision): string {
  const scores = JSON.stringify(d.scores);
  const weights = d.criteria.map((c) => c.weight).join(",");
  const optIds = d.options.map((o) => o.id).join(",");
  const critIds = d.criteria.map((c) => `${c.id}:${c.type}`).join(",");
  return `${optIds}|${critIds}|${weights}|${scores}`;
}

export interface BiasDetectionResult {
  /** Active (non-dismissed) warnings */
  warnings: BiasWarning[];
  /** All detected warnings (including dismissed) */
  allWarnings: BiasWarning[];
  /** Dismiss a single warning by type */
  dismiss: (type: BiasType) => void;
  /** Dismiss all current warnings */
  dismissAll: () => void;
  /** Count of dismissed warnings */
  dismissedCount: number;
}

/**
 * Stores dismissed set + the hash it was dismissed for.
 * When the hash changes the set automatically resets (derived state pattern).
 */
interface DismissalState {
  hash: string;
  dismissed: Set<BiasType>;
}

export function useBiasDetection(decision: Decision): BiasDetectionResult {
  const [dismissalState, setDismissalState] = useState<DismissalState>({
    hash: "",
    dismissed: new Set(),
  });
  const [allWarnings, setAllWarnings] = useState<BiasWarning[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute hash to detect meaningful changes
  const hash = useMemo(() => decisionHash(decision), [decision]);

  // Derive dismissed set — auto-reset when hash changes (no effect needed)
  const dismissed = useMemo(
    () => (dismissalState.hash === hash ? dismissalState.dismissed : new Set<BiasType>()),
    [dismissalState, hash]
  );

  // Debounced detection
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAllWarnings(detectBiases(decision));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [decision]);

  const warnings = useMemo(
    () => allWarnings.filter((w) => !dismissed.has(w.type)),
    [allWarnings, dismissed]
  );

  const dismiss = useCallback(
    (type: BiasType) => {
      setDismissalState((prev) => {
        const base = prev.hash === hash ? prev.dismissed : new Set<BiasType>();
        return { hash, dismissed: new Set(base).add(type) };
      });
    },
    [hash]
  );

  const dismissAll = useCallback(() => {
    setDismissalState({ hash, dismissed: new Set(allWarnings.map((w) => w.type)) });
  }, [hash, allWarnings]);

  return {
    warnings,
    allWarnings,
    dismiss,
    dismissAll,
    dismissedCount: dismissed.size,
  };
}
