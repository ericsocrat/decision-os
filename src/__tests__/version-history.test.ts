/**
 * Unit tests for version-history module.
 *
 * Covers CRUD operations, deduplication by hash, auto-versioning throttle,
 * pruning, diffVersions, and localStorage edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveVersion,
  getVersions,
  getVersion,
  deleteVersion,
  clearVersions,
  pruneVersions,
  autoVersion,
  resetAutoVersionThrottle,
  diffVersions,
} from "@/lib/version-history";
import type { Decision } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = "decision-os:versions:";

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  const now = new Date().toISOString();
  return {
    id: "dec-1",
    title: "Test Decision",
    description: "A test",
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
    ],
    criteria: [
      { id: "c1", name: "Speed", weight: 50, type: "benefit" },
      { id: "c2", name: "Cost", weight: 30, type: "cost" },
    ],
    scores: { o1: { c1: 7, c2: 3 }, o2: { c1: 5, c2: 8 } },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeDecisionV2(overrides: Partial<Decision> = {}): Decision {
  return makeDecision({
    title: "Updated Decision",
    description: "Changed description",
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
      { id: "o3", name: "Option C" },
    ],
    criteria: [
      { id: "c1", name: "Speed", weight: 70, type: "benefit" },
    ],
    scores: { o1: { c1: 9 }, o2: { c1: 4 }, o3: { c1: 6 } },
    ...overrides,
  });
}

// ── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  resetAutoVersionThrottle();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── CRUD ───────────────────────────────────────────────────────────

describe("saveVersion", () => {
  it("saves a version and retrieves it", async () => {
    const dec = makeDecision();
    const version = await saveVersion(dec, "v1", "manual");

    expect(version).not.toBeNull();
    expect(version!.decisionId).toBe("dec-1");
    expect(version!.label).toBe("v1");
    expect(version!.trigger).toBe("manual");
    expect(version!.snapshotHash).toBeTruthy();
    expect(version!.snapshot.title).toBe("Test Decision");
  });

  it("deduplicates by hash — no-op if same decision", async () => {
    const dec = makeDecision();
    const v1 = await saveVersion(dec);
    const v2 = await saveVersion(dec);

    expect(v1).not.toBeNull();
    expect(v2).toBeNull();
    expect(getVersions("dec-1")).toHaveLength(1);
  });

  it("saves a new version when decision content changes", async () => {
    const dec1 = makeDecision();
    const dec2 = makeDecision({
      scores: { o1: { c1: 10, c2: 3 }, o2: { c1: 5, c2: 8 } },
    });
    await saveVersion(dec1, "first");
    const v2 = await saveVersion(dec2, "second");

    expect(v2).not.toBeNull();
    expect(getVersions("dec-1")).toHaveLength(2);
    // Newest first
    expect(getVersions("dec-1")[0].label).toBe("second");
  });

  it("stores an independent snapshot (not a reference)", async () => {
    const dec = makeDecision();
    const version = await saveVersion(dec);
    dec.title = "Mutated after save";

    expect(version!.snapshot.title).toBe("Test Decision");
  });

  it("caps at 100 versions", async () => {
    const dec = makeDecision();
    // Pre-populate with 100 versions
    const versions: DecisionVersion[] = [];
    for (let i = 0; i < 100; i++) {
      versions.push({
        id: `v-${i}`,
        decisionId: "dec-1",
        snapshot: dec,
        snapshotHash: `hash-${i}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        trigger: "auto",
      });
    }
    localStorage.setItem(`${STORAGE_KEY_PREFIX}dec-1`, JSON.stringify(versions));

    // Save a new version with a different hash
    const newDec = makeDecision({ title: "Version 101" });
    await saveVersion(newDec, "newest");

    const all = getVersions("dec-1");
    expect(all).toHaveLength(100); // Capped
    expect(all[0].label).toBe("newest");
  });
});

describe("getVersions", () => {
  it("returns empty array for unknown decision", () => {
    expect(getVersions("nonexistent")).toEqual([]);
  });

  it("returns versions sorted newest first", async () => {
    const dec1 = makeDecision({ scores: { o1: { c1: 1 }, o2: { c1: 2 } } });
    const dec2 = makeDecision({ scores: { o1: { c1: 3 }, o2: { c1: 4 } } });
    const dec3 = makeDecision({ scores: { o1: { c1: 5 }, o2: { c1: 6 } } });
    await saveVersion(dec1, "first");
    await saveVersion(dec2, "second");
    await saveVersion(dec3, "third");

    const versions = getVersions("dec-1");
    expect(versions).toHaveLength(3);
    expect(versions[0].label).toBe("third");
    expect(versions[2].label).toBe("first");
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}dec-1`, "not valid json{{{");
    expect(getVersions("dec-1")).toEqual([]);
  });

  it("handles non-array JSON gracefully", () => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}dec-1`, JSON.stringify({ bad: "data" }));
    expect(getVersions("dec-1")).toEqual([]);
  });
});

describe("getVersion", () => {
  it("returns a specific version by ID", async () => {
    const dec = makeDecision();
    const saved = await saveVersion(dec, "target");
    const found = getVersion("dec-1", saved!.id);
    expect(found).not.toBeNull();
    expect(found!.label).toBe("target");
  });

  it("returns null for unknown version ID", async () => {
    const dec = makeDecision();
    await saveVersion(dec);
    expect(getVersion("dec-1", "nonexistent")).toBeNull();
  });
});

describe("deleteVersion", () => {
  it("removes a version and returns true", async () => {
    const dec = makeDecision();
    const saved = await saveVersion(dec);
    expect(deleteVersion("dec-1", saved!.id)).toBe(true);
    expect(getVersions("dec-1")).toHaveLength(0);
  });

  it("returns false for unknown version ID", () => {
    expect(deleteVersion("dec-1", "nonexistent")).toBe(false);
  });
});

describe("clearVersions", () => {
  it("removes all versions for a decision", async () => {
    const dec1 = makeDecision({ scores: { o1: { c1: 1 }, o2: { c1: 2 } } });
    const dec2 = makeDecision({ scores: { o1: { c1: 3 }, o2: { c1: 4 } } });
    await saveVersion(dec1);
    await saveVersion(dec2);
    expect(getVersions("dec-1")).toHaveLength(2);

    clearVersions("dec-1");
    expect(getVersions("dec-1")).toEqual([]);
  });
});

describe("pruneVersions", () => {
  it("prunes to specified count", async () => {
    // Create 5 unique versions (must differ structurally for different hashes)
    for (let i = 0; i < 5; i++) {
      await saveVersion(
        makeDecision({ scores: { o1: { c1: i }, o2: { c1: i + 10 } } }),
        `label-${i}`,
      );
    }
    expect(getVersions("dec-1")).toHaveLength(5);

    pruneVersions("dec-1", 3);
    const remaining = getVersions("dec-1");
    expect(remaining).toHaveLength(3);
    // Keeps newest
    expect(remaining[0].label).toBe("label-4");
  });

  it("no-op if under max count", async () => {
    await saveVersion(makeDecision());
    pruneVersions("dec-1", 10);
    expect(getVersions("dec-1")).toHaveLength(1);
  });
});

// ── Auto-Versioning ───────────────────────────────────────────────

describe("autoVersion", () => {
  it("creates an auto-version on first call", async () => {
    const dec = makeDecision();
    const version = await autoVersion(dec);
    expect(version).not.toBeNull();
    expect(version!.trigger).toBe("auto");
  });

  it("throttles within 5-minute window", async () => {
    const dec1 = makeDecision();
    const dec2 = makeDecision({ title: "Changed" });

    const v1 = await autoVersion(dec1);
    expect(v1).not.toBeNull();

    const v2 = await autoVersion(dec2);
    expect(v2).toBeNull(); // Throttled
  });

  it("allows new auto-version after throttle window", async () => {
    const dateNow = vi.spyOn(Date, "now");
    const startTime = 1700000000000;
    dateNow.mockReturnValue(startTime);

    const dec1 = makeDecision();
    await autoVersion(dec1);

    // Move forward 6 minutes
    dateNow.mockReturnValue(startTime + 6 * 60 * 1000);

    const dec2 = makeDecision({ scores: { o1: { c1: 10, c2: 1 }, o2: { c1: 2, c2: 9 } } });
    const v2 = await autoVersion(dec2);
    expect(v2).not.toBeNull();
  });

  it("resetAutoVersionThrottle clears throttle for a specific decision", async () => {
    const dec = makeDecision();
    await autoVersion(dec);

    resetAutoVersionThrottle("dec-1");
    const dec2 = makeDecision({ scores: { o1: { c1: 10, c2: 1 }, o2: { c1: 2, c2: 9 } } });
    const v2 = await autoVersion(dec2);
    expect(v2).not.toBeNull();
  });

  it("resetAutoVersionThrottle clears all throttles", async () => {
    const dec1 = makeDecision({ id: "dec-1" });
    const dec2 = makeDecision({ id: "dec-2" });
    await autoVersion(dec1);
    await autoVersion(dec2);

    resetAutoVersionThrottle();

    const v1 = await autoVersion(makeDecision({ id: "dec-1", scores: { o1: { c1: 10 }, o2: { c1: 1 } } }));
    const v2 = await autoVersion(makeDecision({ id: "dec-2", scores: { o1: { c1: 1 }, o2: { c1: 10 } } }));
    expect(v1).not.toBeNull();
    expect(v2).not.toBeNull();
  });

  it("deduplicates even if throttle allows", async () => {
    const dateNow = vi.spyOn(Date, "now");
    const startTime = 1700000000000;
    dateNow.mockReturnValue(startTime);

    const dec = makeDecision();
    await autoVersion(dec);

    // Move forward 6 minutes, but same decision
    dateNow.mockReturnValue(startTime + 6 * 60 * 1000);
    const v2 = await autoVersion(dec);
    expect(v2).toBeNull(); // Same hash
  });
});

// ── Diff ──────────────────────────────────────────────────────────

describe("diffVersions", () => {
  it("detects no changes for identical decisions", () => {
    const dec = makeDecision();
    const diff = diffVersions(dec, dec);

    expect(diff.titleChanged).toBe(false);
    expect(diff.descriptionChanged).toBe(false);
    expect(diff.addedOptions).toEqual([]);
    expect(diff.removedOptions).toEqual([]);
    expect(diff.addedCriteria).toEqual([]);
    expect(diff.removedCriteria).toEqual([]);
    expect(diff.changedScores).toBe(0);
    expect(diff.changedWeights).toEqual([]);
  });

  it("detects title change", () => {
    const older = makeDecision({ title: "Old Title" });
    const newer = makeDecision({ title: "New Title" });
    expect(diffVersions(older, newer).titleChanged).toBe(true);
  });

  it("detects description change", () => {
    const older = makeDecision({ description: "Old" });
    const newer = makeDecision({ description: "New" });
    expect(diffVersions(older, newer).descriptionChanged).toBe(true);
  });

  it("detects description change from undefined to string", () => {
    const older = makeDecision({ description: undefined });
    const newer = makeDecision({ description: "Added" });
    expect(diffVersions(older, newer).descriptionChanged).toBe(true);
  });

  it("detects added options", () => {
    const older = makeDecision();
    const newer = makeDecision({
      options: [
        { id: "o1", name: "Option A" },
        { id: "o2", name: "Option B" },
        { id: "o3", name: "Option C" },
      ],
    });
    const diff = diffVersions(older, newer);
    expect(diff.addedOptions).toEqual(["Option C"]);
    expect(diff.removedOptions).toEqual([]);
  });

  it("detects removed options", () => {
    const older = makeDecision();
    const newer = makeDecision({
      options: [{ id: "o1", name: "Option A" }],
    });
    const diff = diffVersions(older, newer);
    expect(diff.removedOptions).toEqual(["Option B"]);
    expect(diff.addedOptions).toEqual([]);
  });

  it("detects added and removed criteria", () => {
    const older = makeDecision();
    const newer = makeDecision({
      criteria: [
        { id: "c1", name: "Speed", weight: 50, type: "benefit" },
        { id: "c3", name: "Quality", weight: 40, type: "benefit" },
      ],
    });
    const diff = diffVersions(older, newer);
    expect(diff.addedCriteria).toEqual(["Quality"]);
    expect(diff.removedCriteria).toEqual(["Cost"]);
  });

  it("detects weight changes", () => {
    const older = makeDecision();
    const newer = makeDecision({
      criteria: [
        { id: "c1", name: "Speed", weight: 80, type: "benefit" },
        { id: "c2", name: "Cost", weight: 30, type: "cost" },
      ],
    });
    const diff = diffVersions(older, newer);
    expect(diff.changedWeights).toEqual([
      { name: "Speed", oldWeight: 50, newWeight: 80 },
    ]);
  });

  it("detects score changes", () => {
    const older = makeDecision();
    const newer = makeDecision({
      scores: { o1: { c1: 9, c2: 3 }, o2: { c1: 5, c2: 8 } },
    });
    const diff = diffVersions(older, newer);
    expect(diff.changedScores).toBe(1); // Only o1.c1 changed (7→9)
  });

  it("produces a comprehensive diff for large changes", () => {
    const older = makeDecision();
    const newer = makeDecisionV2();
    const diff = diffVersions(older, newer);

    expect(diff.titleChanged).toBe(true);
    expect(diff.descriptionChanged).toBe(true);
    expect(diff.addedOptions).toEqual(["Option C"]);
    expect(diff.removedOptions).toEqual([]);
    expect(diff.removedCriteria).toEqual(["Cost"]);
    expect(diff.addedCriteria).toEqual([]);
    expect(diff.changedWeights).toEqual([
      { name: "Speed", oldWeight: 50, newWeight: 70 },
    ]);
    // o1.c1: 7→9, o2.c1: 5→4
    expect(diff.changedScores).toBe(2);
  });
});

// ── Edge Cases ────────────────────────────────────────────────────

describe("edge cases", () => {
  it("handles localStorage setItem quota exceeded", async () => {
    const origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    try {
      // saveVersion should not throw
      const version = await saveVersion(makeDecision());
      // It returns the version object (created in memory) even though persist failed
      expect(version).not.toBeNull();
    } finally {
      Storage.prototype.setItem = origSetItem;
    }
  });

  it("clearVersions is no-op if key does not exist", () => {
    // Should not throw
    clearVersions("does-not-exist");
    expect(getVersions("does-not-exist")).toEqual([]);
  });

  it("handles clearVersions localStorage.removeItem failure", () => {
    const origRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = vi.fn(() => {
      throw new Error("removeItem failed");
    });

    try {
      // Should not throw
      clearVersions("dec-1");
    } finally {
      Storage.prototype.removeItem = origRemoveItem;
    }
  });
});
