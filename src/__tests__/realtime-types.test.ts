/**
 * Unit tests for realtime-types module.
 *
 * Covers exported constants and helper functions.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_REALTIME_CONFIG,
  COLLABORATOR_COLORS,
  getCollaboratorColor,
} from "@/lib/realtime-types";

describe("DEFAULT_REALTIME_CONFIG", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_REALTIME_CONFIG.enabled).toBe(true);
    expect(DEFAULT_REALTIME_CONFIG.channelPrefix).toBe("decision:");
    expect(DEFAULT_REALTIME_CONFIG.snapshotIntervalMs).toBe(10_000);
    expect(DEFAULT_REALTIME_CONFIG.eventsPerSecond).toBe(10);
  });
});

describe("COLLABORATOR_COLORS", () => {
  it("provides 8 distinguishable colors", () => {
    expect(COLLABORATOR_COLORS).toHaveLength(8);
    // All unique
    const unique = new Set(COLLABORATOR_COLORS);
    expect(unique.size).toBe(8);
  });

  it("contains valid CSS color strings", () => {
    for (const color of COLLABORATOR_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("getCollaboratorColor", () => {
  it("returns the correct color for index 0", () => {
    expect(getCollaboratorColor(0)).toBe(COLLABORATOR_COLORS[0]);
  });

  it("wraps around for indices beyond the pool size", () => {
    expect(getCollaboratorColor(8)).toBe(COLLABORATOR_COLORS[0]);
    expect(getCollaboratorColor(9)).toBe(COLLABORATOR_COLORS[1]);
    expect(getCollaboratorColor(16)).toBe(COLLABORATOR_COLORS[0]);
  });

  it("returns different colors for different indices within pool", () => {
    const colors = Array.from({ length: 8 }, (_, i) => getCollaboratorColor(i));
    const unique = new Set(colors);
    expect(unique.size).toBe(8);
  });
});
