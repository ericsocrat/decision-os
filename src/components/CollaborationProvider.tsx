/**
 * Collaboration context provider for Decision OS.
 *
 * Provides realtime collaboration state (collaborators, connection status,
 * editing field tracking) to the component tree. Wraps the useRealtime hook
 * and exposes it via React Context.
 *
 * Safe to use without authentication — returns idle/disconnected state.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/248
 */

"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
  type Dispatch,
} from "react";
import type { DecisionAction } from "@/lib/decision-reducer";
import type { Decision } from "@/lib/types";
import type { PresenceUser, RealtimeConfig } from "@/lib/realtime-types";
import {
  useRealtime,
  type ConnectionStatus,
  type UseRealtimeReturn,
} from "@/hooks/useRealtime";

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

export interface CollaborationValue {
  /** Connected collaborators (excluding self). */
  collaborators: PresenceUser[];
  /** Whether a realtime channel is active. */
  isConnected: boolean;
  /** Connection lifecycle status. */
  connectionStatus: ConnectionStatus;
  /** Broadcast a local action to collaborators. */
  broadcast: (action: DecisionAction) => void;
  /** Update which field the current user is editing. */
  setEditingField: (field: string | null) => void;
}

const CollaborationCtx = createContext<CollaborationValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access collaboration state. Returns null-safe defaults when
 * CollaborationProvider is not mounted (e.g., in tests).
 */
export function useCollaboration(): CollaborationValue {
  const ctx = useContext(CollaborationCtx);
  if (!ctx) {
    // Fallback for non-collaborative contexts (tests, local-only mode)
    return {
      collaborators: [],
      isConnected: false,
      connectionStatus: "disconnected",
      broadcast: () => undefined,
      setEditingField: () => undefined,
    };
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface CollaborationProviderProps {
  children: ReactNode;
  decisionId: string;
  userId: string | null;
  displayName: string;
  avatarUrl: string;
  dispatch: Dispatch<DecisionAction>;
  getDecision: () => Decision;
  config?: Partial<RealtimeConfig>;
}

export function CollaborationProvider({
  children,
  decisionId,
  userId,
  displayName,
  avatarUrl,
  dispatch,
  getDecision,
  config,
}: Readonly<CollaborationProviderProps>) {
  // Memoize user meta to avoid recreating on every render
  const userMeta = useMemo(
    () => ({ displayName, avatarUrl }),
    [displayName, avatarUrl],
  );

  const realtimeState: UseRealtimeReturn = useRealtime(
    decisionId,
    userId,
    userMeta,
    dispatch,
    getDecision,
    config,
  );

  const value: CollaborationValue = {
    collaborators: realtimeState.collaborators,
    isConnected: realtimeState.isConnected,
    connectionStatus: realtimeState.connectionStatus,
    broadcast: realtimeState.broadcast,
    setEditingField: realtimeState.setEditingField,
  };

  return <CollaborationCtx value={value}>{children}</CollaborationCtx>;
}
