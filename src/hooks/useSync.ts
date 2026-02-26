/**
 * Sync status hook for Decision OS.
 *
 * Exposes sync state and triggers for the UI.
 * Safe to call even when cloud is not configured — returns idle state.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fullSync, type SyncResult, type SyncStatus } from "@/lib/sync";
import { isCloudEnabled } from "@/lib/supabase";

export interface UseSyncReturn {
  /** Current sync status. */
  status: SyncStatus;
  /** Last sync result with details. */
  lastResult: SyncResult | null;
  /** Trigger a manual sync. */
  triggerSync: () => Promise<void>;
  /** Whether a sync is currently in progress. */
  isSyncing: boolean;
}

export function useSync(isAuthenticated: boolean): UseSyncReturn {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const syncingRef = useRef(false);

  const triggerSync = useCallback(async () => {
    if (!isCloudEnabled() || !isAuthenticated || syncingRef.current) return;

    syncingRef.current = true;
    setStatus("syncing");

    const result = await fullSync();
    setLastResult(result);
    setStatus(result.status);
    syncingRef.current = false;
  }, [isAuthenticated]);

  // Auto-sync on mount when authenticated
  useEffect(() => {
    if (!isAuthenticated || !isCloudEnabled()) return;

    // Small delay so the UI settles before the sync network call
    const timer = setTimeout(() => {
      triggerSync();
    }, 500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, triggerSync]);

  // Sync on window focus (tab visibility change)
  useEffect(() => {
    if (!isAuthenticated || !isCloudEnabled()) return;

    const handleFocus = () => {
      triggerSync();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isAuthenticated, triggerSync]);

  return {
    status,
    lastResult,
    triggerSync,
    isSyncing: status === "syncing",
  };
}
