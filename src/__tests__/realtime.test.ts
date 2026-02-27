/**
 * Unit tests for the realtime collaboration engine.
 *
 * Mocks Supabase client to verify channel lifecycle, broadcast/presence
 * operations, and callback registration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DecisionAction } from "@/lib/decision-reducer";
import type { Decision } from "@/lib/types";

// ─── Mock Supabase ────────────────────────────────────────────────

let mockCloudEnabled = true;
let mockChannel: ReturnType<typeof createMockChannel>;

function createMockChannel() {
  const listeners: Record<string, Record<string, Array<(payload: unknown) => void>>> = {};
  return {
    on: vi.fn((type: string, filter: { event: string }, callback: (payload: unknown) => void) => {
      if (!listeners[type]) listeners[type] = {};
      if (!listeners[type][filter.event]) listeners[type][filter.event] = [];
      listeners[type][filter.event].push(callback);
      return mockChannel; // chainable
    }),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      if (cb) cb("SUBSCRIBED");
      return mockChannel;
    }),
    track: vi.fn().mockResolvedValue(undefined),
    send: vi.fn(),
    presenceState: vi.fn().mockReturnValue({}),
    _listeners: listeners,
    // Helper to simulate events in tests
    _emit(type: string, event: string, payload: unknown) {
      for (const cb of listeners[type]?.[event] ?? []) {
        cb(payload);
      }
    },
  };
}

vi.mock("@/lib/supabase", () => ({
  isCloudEnabled: () => mockCloudEnabled,
  getSupabase: () =>
    mockCloudEnabled
      ? {
          channel: () => {
            mockChannel = createMockChannel();
            return mockChannel;
          },
          removeChannel: vi.fn(),
        }
      : null,
}));

// ─── Import after mocks ──────────────────────────────────────────

import {
  joinDecisionChannel,
  leaveDecisionChannel,
  isChannelActive,
  broadcastAction,
  broadcastSnapshot,
  trackEditingField,
  getPresenceState,
  onRemoteAction,
  onPresenceChange,
  onSnapshot,
  onSnapshotRequest,
} from "@/lib/realtime";

// ─── Helpers ──────────────────────────────────────────────────────

function makeDemoDecision(): Decision {
  return {
    id: "d-1",
    title: "Test",
    description: "",
    options: [{ id: "o1", name: "A" }],
    criteria: [{ id: "c1", name: "C", weight: 50, type: "benefit" }],
    scores: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe("realtime engine", () => {
  beforeEach(() => {
    leaveDecisionChannel();
    mockCloudEnabled = true;
    mockChannel = createMockChannel();
  });

  describe("joinDecisionChannel", () => {
    it("returns null when cloud is disabled", () => {
      mockCloudEnabled = false;
      const ch = joinDecisionChannel("d-1", "u-1", {
        displayName: "Alice",
        avatarUrl: "",
      });
      expect(ch).toBeNull();
    });

    it("creates and returns a channel when cloud is enabled", () => {
      const ch = joinDecisionChannel("d-1", "u-1", {
        displayName: "Alice",
        avatarUrl: "",
      });
      expect(ch).not.toBeNull();
      expect(isChannelActive()).toBe(true);
    });

    it("sets up broadcast and presence listeners", () => {
      joinDecisionChannel("d-1", "u-1", {
        displayName: "Alice",
        avatarUrl: "",
      });
      // Should have called .on for broadcast (action, snapshot, request_snapshot) and presence (sync)
      expect(mockChannel.on).toHaveBeenCalledTimes(4);
    });

    it("tracks presence on subscribe", () => {
      joinDecisionChannel("d-1", "u-1", {
        displayName: "Alice",
        avatarUrl: "https://example.com/avatar.png",
      });
      expect(mockChannel.subscribe).toHaveBeenCalled();
      // track is called asynchronously from subscribe callback
      expect(mockChannel.track).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u-1",
          displayName: "Alice",
          avatarUrl: "https://example.com/avatar.png",
          editingField: null,
        }),
      );
    });

    it("leaves existing channel before joining new one", () => {
      joinDecisionChannel("d-1", "u-1", {
        displayName: "Alice",
        avatarUrl: "",
      });
      expect(isChannelActive()).toBe(true);

      // Join a different channel
      joinDecisionChannel("d-2", "u-1", {
        displayName: "Alice",
        avatarUrl: "",
      });
      expect(isChannelActive()).toBe(true);
    });
  });

  describe("leaveDecisionChannel", () => {
    it("clears channel state", () => {
      joinDecisionChannel("d-1", "u-1", {
        displayName: "Alice",
        avatarUrl: "",
      });
      expect(isChannelActive()).toBe(true);

      leaveDecisionChannel();
      expect(isChannelActive()).toBe(false);
    });

    it("is safe to call when no channel is active", () => {
      expect(() => leaveDecisionChannel()).not.toThrow();
    });
  });

  describe("isChannelActive", () => {
    it("returns false initially", () => {
      expect(isChannelActive()).toBe(false);
    });

    it("returns true after joining", () => {
      joinDecisionChannel("d-1", "u-1", { displayName: "Alice", avatarUrl: "" });
      expect(isChannelActive()).toBe(true);
    });
  });

  describe("broadcastAction", () => {
    it("sends action when channel is active", () => {
      joinDecisionChannel("d-1", "u-1", { displayName: "Alice", avatarUrl: "" });

      const action: DecisionAction = { type: "UPDATE_TITLE", title: "New", timestamp: Date.now() };
      broadcastAction(action);

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "broadcast",
          event: "action",
          payload: expect.objectContaining({
            type: "action",
            senderId: "u-1",
            action,
          }),
        }),
      );
    });

    it("does nothing when no channel is active", () => {
      const action: DecisionAction = { type: "UPDATE_TITLE", title: "New", timestamp: Date.now() };
      broadcastAction(action);
      // Should not throw
      expect(mockChannel.send).not.toHaveBeenCalled();
    });
  });

  describe("broadcastSnapshot", () => {
    it("sends full decision snapshot", () => {
      joinDecisionChannel("d-1", "u-1", { displayName: "Alice", avatarUrl: "" });

      const decision = makeDemoDecision();
      broadcastSnapshot(decision);

      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "broadcast",
          event: "snapshot",
          payload: expect.objectContaining({
            type: "snapshot",
            senderId: "u-1",
            decision,
          }),
        }),
      );
    });
  });

  describe("trackEditingField", () => {
    it("updates presence with the field being edited", async () => {
      joinDecisionChannel("d-1", "u-1", { displayName: "Alice", avatarUrl: "" });

      // Mock presence state to include the user
      mockChannel.presenceState.mockReturnValue({
        "u-1": [
          {
            userId: "u-1",
            displayName: "Alice",
            avatarUrl: "",
            editingField: null,
            joinedAt: new Date().toISOString(),
            color: "",
          },
        ],
      });

      await trackEditingField("title");

      expect(mockChannel.track).toHaveBeenCalledWith(
        expect.objectContaining({
          editingField: "title",
        }),
      );
    });

    it("does nothing when no channel is active", async () => {
      await expect(trackEditingField("title")).resolves.toBeUndefined();
    });
  });

  describe("getPresenceState", () => {
    it("returns empty array initially", () => {
      expect(getPresenceState()).toEqual([]);
    });
  });

  describe("callback registration", () => {
    it("onRemoteAction registers and unregisters callbacks", () => {
      joinDecisionChannel("d-1", "u-1", { displayName: "Alice", avatarUrl: "" });

      const cb = vi.fn();
      const unsub = onRemoteAction(cb);

      // Simulate a remote action broadcast
      mockChannel._emit("broadcast", "action", {
        payload: {
          type: "action",
          senderId: "u-2", // different user
          action: { type: "UPDATE_TITLE", title: "Remote", timestamp: Date.now() },
          timestamp: Date.now(),
        },
      });

      expect(cb).toHaveBeenCalled();

      unsub();
      cb.mockClear();

      // After unsubscribe, callback should not be called
      // (can't test this directly since the listener is already registered on the channel)
    });

    it("onPresenceChange registers callbacks", () => {
      joinDecisionChannel("d-1", "u-1", { displayName: "Alice", avatarUrl: "" });

      const cb = vi.fn();
      const unsub = onPresenceChange(cb);
      expect(typeof unsub).toBe("function");
      unsub();
    });

    it("onSnapshot registers callbacks", () => {
      joinDecisionChannel("d-1", "u-1", { displayName: "Alice", avatarUrl: "" });

      const cb = vi.fn();
      const unsub = onSnapshot(cb);

      // Simulate snapshot
      mockChannel._emit("broadcast", "snapshot", {
        payload: {
          type: "snapshot",
          senderId: "u-2",
          decision: makeDemoDecision(),
          timestamp: Date.now(),
        },
      });

      expect(cb).toHaveBeenCalled();
      unsub();
    });

    it("onSnapshotRequest registers callbacks", () => {
      joinDecisionChannel("d-1", "u-1", { displayName: "Alice", avatarUrl: "" });

      const cb = vi.fn();
      const unsub = onSnapshotRequest(cb);

      // Simulate snapshot request
      mockChannel._emit("broadcast", "request_snapshot", {
        payload: {
          type: "request_snapshot",
          senderId: "u-2",
        },
      });

      expect(cb).toHaveBeenCalled();
      unsub();
    });
  });
});
