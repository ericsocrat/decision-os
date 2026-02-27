/**
 * Realtime collaboration hook for Decision OS.
 *
 * Manages the lifecycle of a Supabase Realtime channel for a decision:
 *   - Joins channel on mount (when authed + cloud enabled)
 *   - Leaves channel on unmount or decision change
 *   - Broadcasts local actions to collaborators
 *   - Applies remote actions via APPLY_REMOTE dispatch
 *   - Responds to snapshot requests from late joiners
 *   - Tracks presence (connected collaborators)
 *
 * Returns a no-op state when cloud is not configured.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/248
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import type { DecisionAction } from "@/lib/decision-reducer";
import type { Decision } from "@/lib/types";
import type { PresenceUser, RealtimeConfig } from "@/lib/realtime-types";
import {
  joinDecisionChannel,
  leaveDecisionChannel,
  isChannelActive,
  broadcastAction,
  broadcastSnapshot,
  trackEditingField,
  onRemoteAction,
  onPresenceChange,
  onSnapshot,
  onSnapshotRequest,
} from "@/lib/realtime";
import { isCloudEnabled } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export interface UseRealtimeReturn {
  /** List of connected collaborators (excluding self). */
  collaborators: PresenceUser[];
  /** Whether a realtime channel is currently active. */
  isConnected: boolean;
  /** Connection lifecycle status. */
  connectionStatus: ConnectionStatus;
  /** Broadcast a local action to collaborators. */
  broadcast: (action: DecisionAction) => void;
  /** Update which field the current user is editing. */
  setEditingField: (field: string | null) => void;
}

// ---------------------------------------------------------------------------
// No-op return for when collaboration is disabled
// ---------------------------------------------------------------------------

const NOOP_RETURN: UseRealtimeReturn = {
  collaborators: [],
  isConnected: false,
  connectionStatus: "disconnected",
  broadcast: () => undefined,
  setEditingField: () => undefined,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Connect to a collaborative decision channel.
 *
 * @param decisionId  Current decision ID
 * @param userId      Supabase auth user ID (null if not authed)
 * @param userMeta    Display name + avatar for presence
 * @param dispatch    Decision reducer dispatch
 * @param getDecision A ref-stable getter for the latest decision state
 * @param config      Optional realtime config overrides
 */
export function useRealtime(
  decisionId: string,
  userId: string | null,
  userMeta: { displayName: string; avatarUrl: string },
  dispatch: Dispatch<DecisionAction>,
  getDecision: () => Decision,
  config?: Partial<RealtimeConfig>,
): UseRealtimeReturn {
  const [collaborators, setCollaborators] = useState<PresenceUser[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  // Keep latest refs to avoid stale closures in callbacks
  const getDecisionRef = useRef(getDecision);
  useEffect(() => {
    getDecisionRef.current = getDecision;
  }, [getDecision]);

  const dispatchRef = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  // Track the decision ID we're currently connected to
  const connectedDecisionRef = useRef<string | null>(null);

  // ── Channel lifecycle ──
  useEffect(() => {
    if (!isCloudEnabled() || !userId) {
      setConnectionStatus("disconnected");
      return;
    }

    setConnectionStatus("connecting");

    const channel = joinDecisionChannel(decisionId, userId, userMeta, config);

    if (!channel) {
      setConnectionStatus("disconnected");
      return;
    }

    connectedDecisionRef.current = decisionId;

    // Listen for remote actions → dispatch locally
    // We don't replay individual actions since conflicting concurrent edits
    // are rare in decision-making. Instead, we rely on periodic snapshot
    // reconciliation via the snapshot listener below.
    const unsubAction = onRemoteAction(() => {
      // Future: could replay actions for lower-latency collaboration
    });

    // Listen for snapshots → apply full state
    const unsubSnapshot = onSnapshot((decision) => {
      dispatchRef.current({ type: "APPLY_REMOTE", decision });
    });

    // Listen for snapshot requests → respond with current state
    const unsubRequest = onSnapshotRequest(() => {
      broadcastSnapshot(getDecisionRef.current());
    });

    // Listen for presence changes
    const unsubPresence = onPresenceChange((users) => {
      setCollaborators(users);
    });

    // Mark connected once the channel subscribes
    // The subscribe callback in realtime.ts handles the initial track
    setConnectionStatus("connected");

    return () => {
      unsubAction();
      unsubSnapshot();
      unsubRequest();
      unsubPresence();
      leaveDecisionChannel();
      connectedDecisionRef.current = null;
      setConnectionStatus("disconnected");
      setCollaborators([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionId, userId]);

  // ── Broadcast helper ──
  const broadcast = useCallback(
    (action: DecisionAction) => {
      if (!isChannelActive()) return;
      broadcastAction(action);
    },
    [],
  );

  // ── Editing field tracker ──
  const setEditingField = useCallback(
    (field: string | null) => {
      if (!isChannelActive()) return;
      void trackEditingField(field);
    },
    [],
  );

  // ── Periodic snapshot broadcast ──
  useEffect(() => {
    if (connectionStatus !== "connected") return;

    const intervalMs = config?.snapshotIntervalMs ?? 10_000;
    const timer = setInterval(() => {
      if (isChannelActive()) {
        broadcastSnapshot(getDecisionRef.current());
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [connectionStatus, config?.snapshotIntervalMs]);

  if (!isCloudEnabled() || !userId) {
    return NOOP_RETURN;
  }

  return {
    collaborators,
    isConnected: connectionStatus === "connected",
    connectionStatus,
    broadcast,
    setEditingField,
  };
}
