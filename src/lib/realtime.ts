/**
 * Realtime collaboration engine for Decision OS.
 *
 * Uses Supabase Realtime to enable live multi-user editing of decisions:
 *   - **Broadcast**: Fan-out reducer actions to all participants (<100ms)
 *   - **Presence**: Track who is connected and what they're editing
 *   - **Postgres Changes**: Backstop listener for missed messages
 *
 * All functions are no-ops when Supabase is not configured (local-only mode).
 *
 * @see https://github.com/ericsocrat/decision-os/issues/248
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, isCloudEnabled } from "./supabase";
import type { DecisionAction } from "./decision-reducer";
import type { Decision } from "./types";
import type {
  PresenceUser,
  BroadcastPayload,
  RealtimeConfig,
} from "./realtime-types";
import { DEFAULT_REALTIME_CONFIG, getCollaboratorColor } from "./realtime-types";

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

let _channel: RealtimeChannel | null = null;
let _userId: string | null = null;
let _config: RealtimeConfig = DEFAULT_REALTIME_CONFIG;
let _presenceState: Map<string, PresenceUser> = new Map();
let _remoteActionCallbacks: Array<(action: DecisionAction, senderId: string) => void> = [];
let _presenceCallbacks: Array<(users: PresenceUser[]) => void> = [];
let _snapshotCallbacks: Array<(decision: Decision, senderId: string) => void> = [];
let _snapshotRequestCallbacks: Array<(senderId: string) => void> = [];

// ---------------------------------------------------------------------------
// Channel Lifecycle
// ---------------------------------------------------------------------------

/**
 * Join a collaborative decision channel.
 * Creates a Supabase Realtime channel with Broadcast + Presence.
 *
 * @returns The channel instance, or `null` if cloud is not enabled.
 */
export function joinDecisionChannel(
  decisionId: string,
  userId: string,
  userMeta: { displayName: string; avatarUrl: string },
  config: Partial<RealtimeConfig> = {},
): RealtimeChannel | null {
  if (!isCloudEnabled()) return null;
  const sb = getSupabase();
  if (!sb) return null;

  // Leave any existing channel first
  leaveDecisionChannel();

  _config = { ...DEFAULT_REALTIME_CONFIG, ...config };
  _userId = userId;

  const channelName = `${_config.channelPrefix}${decisionId}`;

  _channel = sb.channel(channelName, {
    config: {
      broadcast: { self: false }, // Don't receive own broadcasts
      presence: { key: userId },
    },
  });

  // ── Broadcast: remote actions ──
  _channel.on("broadcast", { event: "action" }, ({ payload }) => {
    const data = payload as BroadcastPayload;
    if (data.type === "action" && data.senderId !== _userId) {
      for (const cb of _remoteActionCallbacks) {
        cb(data.action, data.senderId);
      }
    }
  });

  // ── Broadcast: snapshots ──
  _channel.on("broadcast", { event: "snapshot" }, ({ payload }) => {
    const data = payload as BroadcastPayload;
    if (data.type === "snapshot" && data.senderId !== _userId) {
      for (const cb of _snapshotCallbacks) {
        cb(data.decision, data.senderId);
      }
    }
  });

  // ── Broadcast: snapshot requests (from late joiners) ──
  _channel.on("broadcast", { event: "request_snapshot" }, ({ payload }) => {
    const data = payload as BroadcastPayload;
    if (data.type === "request_snapshot" && data.senderId !== _userId) {
      for (const cb of _snapshotRequestCallbacks) {
        cb(data.senderId);
      }
    }
  });

  // ── Presence: sync ──
  _channel.on("presence", { event: "sync" }, () => {
    if (!_channel) return;
    const state = _channel.presenceState<PresenceUser>();
    _presenceState = new Map();
    let colorIndex = 0;

    for (const [key, presences] of Object.entries(state)) {
      if (key === _userId) continue; // Exclude self
      const p = presences[0];
      if (p) {
        _presenceState.set(key, {
          ...p,
          color: p.color || getCollaboratorColor(colorIndex++),
        });
      }
    }

    notifyPresenceChange();
  });

  // ── Subscribe & track presence ──
  _channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await _channel?.track({
        userId,
        displayName: userMeta.displayName,
        avatarUrl: userMeta.avatarUrl,
        editingField: null,
        joinedAt: new Date().toISOString(),
        color: "",
      } satisfies PresenceUser);

      // Request a snapshot from other participants (for late joiners)
      broadcastSnapshotRequest();
    }
  });

  return _channel;
}

/**
 * Leave the current decision channel.
 * Unsubscribes and cleans up all callbacks.
 */
export function leaveDecisionChannel(): void {
  if (_channel) {
    const sb = getSupabase();
    if (sb) {
      sb.removeChannel(_channel);
    }
    _channel = null;
  }
  _presenceState = new Map();
  _remoteActionCallbacks = [];
  _presenceCallbacks = [];
  _snapshotCallbacks = [];
  _snapshotRequestCallbacks = [];
  _userId = null;
}

/**
 * Check if a realtime channel is currently active.
 */
export function isChannelActive(): boolean {
  return _channel !== null;
}

// ---------------------------------------------------------------------------
// Broadcast Operations
// ---------------------------------------------------------------------------

/**
 * Broadcast a reducer action to all collaborators.
 */
export function broadcastAction(action: DecisionAction): void {
  if (!_channel || !_userId) return;

  const payload: BroadcastPayload = {
    type: "action",
    senderId: _userId,
    action,
    timestamp: Date.now(),
  };

  _channel.send({
    type: "broadcast",
    event: "action",
    payload,
  });
}

/**
 * Broadcast the full decision snapshot (for late joiners or periodic sync).
 */
export function broadcastSnapshot(decision: Decision): void {
  if (!_channel || !_userId) return;

  const payload: BroadcastPayload = {
    type: "snapshot",
    senderId: _userId,
    decision,
    timestamp: Date.now(),
  };

  _channel.send({
    type: "broadcast",
    event: "snapshot",
    payload,
  });
}

/**
 * Request a snapshot from other participants (used by late joiners).
 */
function broadcastSnapshotRequest(): void {
  if (!_channel || !_userId) return;

  const payload: BroadcastPayload = {
    type: "request_snapshot",
    senderId: _userId,
  };

  _channel.send({
    type: "broadcast",
    event: "request_snapshot",
    payload,
  });
}

// ---------------------------------------------------------------------------
// Presence Operations
// ---------------------------------------------------------------------------

/**
 * Update the current user's presence — sets which field is being edited.
 */
export async function trackEditingField(field: string | null): Promise<void> {
  if (!_channel || !_userId) return;

  const currentPresence = _channel.presenceState<PresenceUser>()[_userId]?.[0];
  if (currentPresence) {
    await _channel.track({
      ...currentPresence,
      editingField: field,
    });
  }
}

/**
 * Get the current list of collaborators (excluding self).
 */
export function getPresenceState(): PresenceUser[] {
  return Array.from(_presenceState.values());
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

/**
 * Register a callback for remote actions.
 * @returns An unsubscribe function.
 */
export function onRemoteAction(
  callback: (action: DecisionAction, senderId: string) => void,
): () => void {
  _remoteActionCallbacks.push(callback);
  return () => {
    _remoteActionCallbacks = _remoteActionCallbacks.filter((cb) => cb !== callback);
  };
}

/**
 * Register a callback for presence changes.
 * @returns An unsubscribe function.
 */
export function onPresenceChange(
  callback: (users: PresenceUser[]) => void,
): () => void {
  _presenceCallbacks.push(callback);
  return () => {
    _presenceCallbacks = _presenceCallbacks.filter((cb) => cb !== callback);
  };
}

/**
 * Register a callback for snapshot broadcasts (from other users).
 * @returns An unsubscribe function.
 */
export function onSnapshot(
  callback: (decision: Decision, senderId: string) => void,
): () => void {
  _snapshotCallbacks.push(callback);
  return () => {
    _snapshotCallbacks = _snapshotCallbacks.filter((cb) => cb !== callback);
  };
}

/**
 * Register a callback for snapshot requests (from late joiners).
 * @returns An unsubscribe function.
 */
export function onSnapshotRequest(
  callback: (senderId: string) => void,
): () => void {
  _snapshotRequestCallbacks.push(callback);
  return () => {
    _snapshotRequestCallbacks = _snapshotRequestCallbacks.filter((cb) => cb !== callback);
  };
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function notifyPresenceChange(): void {
  const users = getPresenceState();
  for (const cb of _presenceCallbacks) {
    cb(users);
  }
}
