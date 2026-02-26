/**
 * Unit tests for the sync engine.
 *
 * Mocks both localStorage (via storage module) and cloud storage
 * to verify merge logic, migration, and conflict resolution.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Decision } from "@/lib/types";

// ─── Mock cloud-storage ────────────────────────────────────────────

const mockCloudGet = vi.fn<() => Promise<Decision[]>>();
const mockCloudSave = vi.fn<() => Promise<boolean>>();
const mockCloudSaveAll = vi.fn<() => Promise<boolean>>();
const mockCloudDelete = vi.fn<() => Promise<boolean>>();

vi.mock("@/lib/cloud-storage", () => ({
  cloudGetDecisions: (...args: unknown[]) => mockCloudGet(...(args as [])),
  cloudSaveDecision: (...args: unknown[]) => mockCloudSave(...(args as [])),
  cloudSaveAllDecisions: (...args: unknown[]) => mockCloudSaveAll(...(args as [])),
  cloudDeleteDecision: (...args: unknown[]) => mockCloudDelete(...(args as [])),
}));

// ─── Mock localStorage storage ─────────────────────────────────────

const mockLocalGet = vi.fn<() => Decision[]>();
const mockLocalSave = vi.fn();

vi.mock("@/lib/storage", () => ({
  getDecisions: (...args: unknown[]) => mockLocalGet(...(args as [])),
  saveDecision: (...args: unknown[]) => mockLocalSave(...(args as [])),
}));

// ─── Mock supabase ─────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  isCloudEnabled: () => true,
  getSupabase: () => ({}),
}));

// Import AFTER mocking
const { fullSync, hasMigrated } = await import("@/lib/sync");

// ─── Helpers ───────────────────────────────────────────────────────

function makeDecision(id: string, updatedAt: string): Decision {
  return {
    id,
    title: `Decision ${id}`,
    description: "",
    options: [
      { id: "o1", name: "A" },
      { id: "o2", name: "B" },
    ],
    criteria: [{ id: "c1", name: "Speed", weight: 50, type: "benefit" }],
    scores: { o1: { c1: 5 }, o2: { c1: 7 } },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt,
  };
}

const MIGRATION_KEY = "decision-os:cloud-migrated";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// ─── Tests ─────────────────────────────────────────────────────────

describe("fullSync", () => {
  it("performs initial migration when cloud is empty and not yet migrated", async () => {
    const local = [makeDecision("d1", "2025-06-01T00:00:00Z")];
    mockLocalGet.mockReturnValue(local);
    mockCloudGet.mockResolvedValue([]);
    mockCloudSaveAll.mockResolvedValue(true);

    const result = await fullSync();

    expect(result.status).toBe("done");
    expect(result.uploaded).toBe(1);
    expect(mockCloudSaveAll).toHaveBeenCalledWith(local);
  });

  it("downloads cloud-only decisions to local", async () => {
    localStorage.setItem(MIGRATION_KEY, "true");
    const cloudOnly = makeDecision("cloud-1", "2025-06-01T00:00:00Z");
    mockLocalGet.mockReturnValue([]);
    mockCloudGet.mockResolvedValue([cloudOnly]);

    const result = await fullSync();

    expect(result.status).toBe("done");
    expect(result.downloaded).toBe(1);
    expect(mockLocalSave).toHaveBeenCalledWith(cloudOnly);
  });

  it("uploads local-only decisions to cloud", async () => {
    localStorage.setItem(MIGRATION_KEY, "true");
    const localOnly = makeDecision("local-1", "2025-06-01T00:00:00Z");
    mockLocalGet.mockReturnValue([localOnly]);
    mockCloudGet.mockResolvedValue([]);
    mockCloudSave.mockResolvedValue(true);

    const result = await fullSync();

    expect(result.status).toBe("done");
    expect(result.uploaded).toBe(1);
  });

  it("resolves conflicts with last-write-wins — local newer", async () => {
    localStorage.setItem(MIGRATION_KEY, "true");
    const localNewer = makeDecision("shared", "2025-06-15T00:00:00Z");
    const cloudOlder = makeDecision("shared", "2025-06-01T00:00:00Z");
    mockLocalGet.mockReturnValue([localNewer]);
    mockCloudGet.mockResolvedValue([cloudOlder]);
    mockCloudSave.mockResolvedValue(true);

    const result = await fullSync();

    expect(result.status).toBe("done");
    expect(result.uploaded).toBe(1);
    expect(result.downloaded).toBe(0);
  });

  it("resolves conflicts with last-write-wins — cloud newer", async () => {
    localStorage.setItem(MIGRATION_KEY, "true");
    const localOlder = makeDecision("shared", "2025-06-01T00:00:00Z");
    const cloudNewer = makeDecision("shared", "2025-06-15T00:00:00Z");
    mockLocalGet.mockReturnValue([localOlder]);
    mockCloudGet.mockResolvedValue([cloudNewer]);

    const result = await fullSync();

    expect(result.status).toBe("done");
    expect(result.downloaded).toBe(1);
    expect(mockLocalSave).toHaveBeenCalledWith(cloudNewer);
  });

  it("does nothing for decisions with identical timestamps", async () => {
    localStorage.setItem(MIGRATION_KEY, "true");
    const ts = "2025-06-01T00:00:00Z";
    const local = makeDecision("same", ts);
    const cloud = makeDecision("same", ts);
    mockLocalGet.mockReturnValue([local]);
    mockCloudGet.mockResolvedValue([cloud]);

    const result = await fullSync();

    expect(result.status).toBe("done");
    expect(result.uploaded).toBe(0);
    expect(result.downloaded).toBe(0);
    expect(result.merged).toBe(1);
  });

  it("handles errors gracefully", async () => {
    mockLocalGet.mockReturnValue([]);
    mockCloudGet.mockRejectedValue(new Error("Network error"));

    const result = await fullSync();

    expect(result.status).toBe("error");
    expect(result.error).toBe("Network error");
  });
});

describe("hasMigrated", () => {
  it("returns false when migration key is not set", () => {
    expect(hasMigrated()).toBe(false);
  });

  it("returns true when migration key is set", () => {
    localStorage.setItem(MIGRATION_KEY, "true");
    expect(hasMigrated()).toBe(true);
  });
});
