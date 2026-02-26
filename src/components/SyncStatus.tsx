/**
 * SyncStatus — visual indicator for cloud sync state.
 *
 * Hidden when cloud is not configured.
 * Shows a small icon with tooltip describing the current sync status.
 */

"use client";

import { memo } from "react";
import { Cloud, CloudOff, Loader2, Check, AlertTriangle, RefreshCw } from "lucide-react";
import type { UseSyncReturn } from "@/hooks/useSync";
import { isCloudEnabled } from "@/lib/supabase";

interface SyncStatusProps {
  sync: UseSyncReturn;
  isAuthenticated: boolean;
}

const statusConfig = {
  idle: { icon: Cloud, label: "Cloud sync ready", color: "text-gray-400 dark:text-gray-500" },
  syncing: { icon: Loader2, label: "Syncing…", color: "text-blue-500" },
  done: { icon: Check, label: "Synced", color: "text-green-500" },
  error: { icon: AlertTriangle, label: "Sync error", color: "text-amber-500" },
  offline: { icon: CloudOff, label: "Offline", color: "text-gray-400 dark:text-gray-500" },
} as const;

export const SyncStatus = memo(function SyncStatus({ sync, isAuthenticated }: SyncStatusProps) {
  if (!isCloudEnabled() || !isAuthenticated) return null;

  const { status, lastResult, triggerSync, isSyncing } = sync;
  const config = statusConfig[status];
  const Icon = config.icon;

  const tooltip = lastResult
    ? `${config.label} — ↑${lastResult.uploaded} ↓${lastResult.downloaded}${lastResult.error ? ` (${lastResult.error})` : ""}`
    : config.label;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={triggerSync}
        disabled={isSyncing}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${config.color}`}
        title={tooltip}
        aria-label={tooltip}
      >
        {isSyncing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">{status === "done" ? "Synced" : config.label}</span>
      </button>

      {status === "error" && (
        <button
          onClick={triggerSync}
          className="inline-flex items-center rounded-md p-1 text-xs text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Retry sync"
          aria-label="Retry sync"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
});
