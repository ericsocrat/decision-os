/**
 * Realtime collaboration type definitions.
 *
 * Types for Supabase Realtime channels: presence state, broadcast payloads,
 * and configuration for the collaborative decision-making feature.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/248
 */

import type { DecisionAction } from "@/lib/decision-reducer";
import type { Decision } from "./types";

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------

/** A user's presence metadata broadcast to other collaborators. */
export interface PresenceUser {
  /** Supabase auth user ID. */
  userId: string;
  /** Display name (from OAuth profile or email prefix). */
  displayName: string;
  /** Avatar URL from OAuth provider (may be empty). */
  avatarUrl: string;
  /** Which field the user is currently editing (null if idle). */
  editingField: string | null;
  /** ISO timestamp of when the user joined the channel. */
  joinedAt: string;
  /** CSS color assigned to this collaborator (for UI indicators). */
  color: string;
}

// ---------------------------------------------------------------------------
// Broadcast
// ---------------------------------------------------------------------------

/** Payload types for Supabase Broadcast messages on a decision channel. */
export type BroadcastPayload =
  | {
      type: "action";
      /** ID of the sender (to filter own messages). */
      senderId: string;
      /** The reducer action being applied. */
      action: DecisionAction;
      /** Monotonic timestamp for ordering. */
      timestamp: number;
    }
  | {
      type: "snapshot";
      /** ID of the sender. */
      senderId: string;
      /** Full decision state for late joiners. */
      decision: Decision;
      /** Monotonic timestamp. */
      timestamp: number;
    }
  | {
      type: "request_snapshot";
      /** ID of the requester. */
      senderId: string;
    };

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Configuration for the realtime engine. */
export interface RealtimeConfig {
  /** Whether realtime collaboration is enabled. */
  enabled: boolean;
  /** Prefix for Supabase Realtime channel names. */
  channelPrefix: string;
  /** How often to broadcast a full snapshot (ms). Default: 10000. */
  snapshotIntervalMs: number;
  /** Max events per second for the Realtime connection. */
  eventsPerSecond: number;
}

/** Default realtime configuration. */
export const DEFAULT_REALTIME_CONFIG: RealtimeConfig = {
  enabled: true,
  channelPrefix: "decision:",
  snapshotIntervalMs: 10_000,
  eventsPerSecond: 10,
};

// ---------------------------------------------------------------------------
// Collaborator Colors
// ---------------------------------------------------------------------------

/** Pool of distinguishable colors for up to 8 collaborators. */
export const COLLABORATOR_COLORS: readonly string[] = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
] as const;

/**
 * Pick a color for a collaborator based on their index.
 * Wraps around if more than 8 collaborators.
 */
export function getCollaboratorColor(index: number): string {
  return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
}
