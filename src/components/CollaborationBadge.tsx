/**
 * Collaboration badge — connection status indicator for the header.
 *
 * Shows:
 *   - Green dot + "N collaborators" when connected with others
 *   - Yellow dot + "Connecting…" when connecting
 *   - Hidden when disconnected or no collaborators
 *
 * Uses aria-live for screen-reader announcements on join/leave.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/248
 */

"use client";

import { memo, useEffect, useRef } from "react";
import type { ConnectionStatus } from "@/hooks/useRealtime";
import { useAnnounce } from "./Announcer";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const CollaborationBadge = memo(function CollaborationBadge({
  connectionStatus,
  collaboratorCount,
}: Readonly<{
  connectionStatus: ConnectionStatus;
  collaboratorCount: number;
}>) {
  const announce = useAnnounce();
  const prevCountRef = useRef(collaboratorCount);

  // Announce join/leave events
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = collaboratorCount;

    if (collaboratorCount > prev) {
      announce(`A collaborator joined. ${collaboratorCount} collaborator${collaboratorCount !== 1 ? "s" : ""} connected.`);
    } else if (collaboratorCount < prev && prev > 0) {
      announce(`A collaborator left. ${collaboratorCount} collaborator${collaboratorCount !== 1 ? "s" : ""} connected.`);
    }
  }, [collaboratorCount, announce]);

  if (connectionStatus === "disconnected") return null;

  const isConnecting = connectionStatus === "connecting";

  return (
    <div
      className="flex items-center gap-1.5 text-xs"
      role="status"
      aria-live="polite"
    >
      {/* Status dot */}
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          isConnecting
            ? "bg-yellow-400 animate-pulse"
            : "bg-green-500"
        }`}
        aria-hidden="true"
      />

      {/* Label */}
      <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {isConnecting
          ? "Connecting…"
          : collaboratorCount > 0
            ? `${collaboratorCount} collaborator${collaboratorCount !== 1 ? "s" : ""}`
            : "Live"}
      </span>
    </div>
  );
});
