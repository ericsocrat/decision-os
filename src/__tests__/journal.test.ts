/**
 * Unit tests for the decision journal data model and storage.
 *
 * Tests cover: CRUD operations, filtering, timeline generation,
 * snapshot hashing, persistence, and edge cases.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addEntry,
  getEntries,
  deleteEntry,
  getJournal,
  getTimeline,
  deleteJournal,
  snapshotDecision,
} from "@/lib/journal";
import type { JournalFilter } from "@/lib/journal";
import type { Decision } from "@/lib/types";

const JOURNAL_KEY = "decision-os:journals";

/** Minimal valid decision for snapshot tests */
function makeDecision(overrides: Partial<Decision> = {}): Decision {
  const now = new Date().toISOString();
  return {
    id: "dec-1",
    title: "Test Decision",
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
    ],
    criteria: [{ id: "c1", name: "Speed", weight: 50, type: "benefit" }],
    scores: { o1: { c1: 5 }, o2: { c1: 7 } },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

// ─── addEntry ──────────────────────────────────────────────────────────

describe("addEntry", () => {
  it("creates a journal entry with generated id and timestamp", () => {
    const entry = addEntry("dec-1", {
      type: "note",
      content: "Initial thoughts",
    });

    expect(entry.id).toBeTruthy();
    expect(entry.decisionId).toBe("dec-1");
    expect(entry.type).toBe("note");
    expect(entry.content).toBe("Initial thoughts");
    expect(entry.timestamp).toBeTruthy();
    // Valid ISO 8601
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it("stores metadata when provided", () => {
    const entry = addEntry("dec-1", {
      type: "reasoning",
      content: "I feel good about this",
      metadata: { mood: "confident", timeSpent: 30 },
    });

    expect(entry.metadata?.mood).toBe("confident");
    expect(entry.metadata?.timeSpent).toBe(30);
  });

  it("creates journal on first entry", () => {
    addEntry("dec-1", { type: "note", content: "First" });

    const journal = getJournal("dec-1");
    expect(journal).toBeDefined();
    expect(journal!.entries).toHaveLength(1);
    expect(journal!.createdAt).toBeTruthy();
    expect(journal!.lastEntryAt).toBeTruthy();
  });

  it("appends to existing journal", () => {
    addEntry("dec-1", { type: "note", content: "First" });
    addEntry("dec-1", { type: "reasoning", content: "Second" });

    const journal = getJournal("dec-1");
    expect(journal!.entries).toHaveLength(2);
  });

  it("persists entries to localStorage", () => {
    addEntry("dec-1", { type: "note", content: "Persisted" });

    const raw = localStorage.getItem(JOURNAL_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed["dec-1"].entries).toHaveLength(1);
    expect(parsed["dec-1"].entries[0].content).toBe("Persisted");
  });

  it("does not include metadata key when metadata is omitted", () => {
    const entry = addEntry("dec-1", {
      type: "note",
      content: "No metadata",
    });
    expect("metadata" in entry).toBe(false);
  });
});

// ─── getEntries ────────────────────────────────────────────────────────

describe("getEntries", () => {
  it("returns empty array for unknown decision", () => {
    expect(getEntries("nonexistent")).toEqual([]);
  });

  it("returns all entries in chronological order", () => {
    addEntry("dec-1", { type: "note", content: "A" });
    addEntry("dec-1", { type: "reasoning", content: "B" });
    addEntry("dec-1", { type: "outcome", content: "C" });

    const entries = getEntries("dec-1");
    expect(entries).toHaveLength(3);
    expect(entries[0].content).toBe("A");
    expect(entries[2].content).toBe("C");
  });

  it("filters by type", () => {
    addEntry("dec-1", { type: "note", content: "Note 1" });
    addEntry("dec-1", { type: "reasoning", content: "Reason 1" });
    addEntry("dec-1", { type: "note", content: "Note 2" });

    const notes = getEntries("dec-1", { type: "note" });
    expect(notes).toHaveLength(2);
    expect(notes.every((e) => e.type === "note")).toBe(true);
  });

  it("filters by after timestamp", () => {
    const e1 = addEntry("dec-1", { type: "note", content: "Before" });
    // Use e1's timestamp as the boundary
    const entries = getEntries("dec-1", { after: e1.timestamp });
    // e1 itself should be excluded (after is exclusive)
    expect(entries).toHaveLength(0);
  });

  it("filters by before timestamp", () => {
    addEntry("dec-1", { type: "note", content: "Early" });
    addEntry("dec-1", { type: "note", content: "Late" });

    // All entries are before far-future
    const all = getEntries("dec-1", {
      before: new Date(Date.now() + 200000).toISOString(),
    });
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("combines type and time filters", () => {
    addEntry("dec-1", { type: "note", content: "Note early" });
    addEntry("dec-1", { type: "reasoning", content: "Reason" });

    const filter: JournalFilter = {
      type: "reasoning",
      before: new Date(Date.now() + 100000).toISOString(),
    };
    const result = getEntries("dec-1", filter);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("reasoning");
  });
});

// ─── deleteEntry ───────────────────────────────────────────────────────

describe("deleteEntry", () => {
  it("removes an entry by id", () => {
    const e1 = addEntry("dec-1", { type: "note", content: "Keep" });
    const e2 = addEntry("dec-1", { type: "note", content: "Remove" });

    expect(deleteEntry("dec-1", e2.id)).toBe(true);

    const remaining = getEntries("dec-1");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(e1.id);
  });

  it("returns false for unknown entry", () => {
    addEntry("dec-1", { type: "note", content: "Exists" });
    expect(deleteEntry("dec-1", "nonexistent-id")).toBe(false);
  });

  it("returns false for unknown decision", () => {
    expect(deleteEntry("nonexistent", "any-id")).toBe(false);
  });

  it("removes journal when last entry is deleted", () => {
    const entry = addEntry("dec-1", { type: "note", content: "Only one" });
    deleteEntry("dec-1", entry.id);

    expect(getJournal("dec-1")).toBeUndefined();
  });
});

// ─── getTimeline ───────────────────────────────────────────────────────

describe("getTimeline", () => {
  it("returns empty array for unknown decision", () => {
    expect(getTimeline("nonexistent")).toEqual([]);
  });

  it("returns timeline events in chronological order", () => {
    addEntry("dec-1", { type: "note", content: "Started" });
    addEntry("dec-1", { type: "reasoning", content: "Analyzed" });
    addEntry("dec-1", {
      type: "outcome",
      content: "Decided",
      metadata: { mood: "confident" },
    });

    const timeline = getTimeline("dec-1");
    expect(timeline).toHaveLength(3);
    expect(timeline[0].type).toBe("note");
    expect(timeline[1].type).toBe("reasoning");
    expect(timeline[2].type).toBe("outcome");
    expect(timeline[2].metadata?.mood).toBe("confident");
  });

  it("timeline events have correct shape", () => {
    addEntry("dec-1", { type: "retrospective", content: "Looking back" });

    const [event] = getTimeline("dec-1");
    expect(event).toHaveProperty("id");
    expect(event).toHaveProperty("timestamp");
    expect(event).toHaveProperty("type");
    expect(event).toHaveProperty("content");
  });
});

// ─── deleteJournal ─────────────────────────────────────────────────────

describe("deleteJournal", () => {
  it("removes entire journal for a decision", () => {
    addEntry("dec-1", { type: "note", content: "A" });
    addEntry("dec-1", { type: "note", content: "B" });

    expect(deleteJournal("dec-1")).toBe(true);
    expect(getJournal("dec-1")).toBeUndefined();
    expect(getEntries("dec-1")).toEqual([]);
  });

  it("returns false for nonexistent journal", () => {
    expect(deleteJournal("nonexistent")).toBe(false);
  });

  it("does not affect other decisions' journals", () => {
    addEntry("dec-1", { type: "note", content: "Dec 1" });
    addEntry("dec-2", { type: "note", content: "Dec 2" });

    deleteJournal("dec-1");

    expect(getJournal("dec-1")).toBeUndefined();
    expect(getJournal("dec-2")).toBeDefined();
    expect(getEntries("dec-2")).toHaveLength(1);
  });
});

// ─── snapshotDecision ──────────────────────────────────────────────────

describe("snapshotDecision", () => {
  it("produces a hex string", async () => {
    const decision = makeDecision();
    const hash = await snapshotDecision(decision);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("produces identical hash for identical decisions", async () => {
    const d1 = makeDecision();
    const d2 = makeDecision();
    // Guarantee same content ignoring timestamps
    d2.createdAt = d1.createdAt;
    d2.updatedAt = d1.updatedAt;

    const h1 = await snapshotDecision(d1);
    const h2 = await snapshotDecision(d2);
    expect(h1).toBe(h2);
  });

  it("produces different hash when scores change", async () => {
    const d1 = makeDecision();
    const d2 = makeDecision({ scores: { o1: { c1: 10 }, o2: { c1: 3 } } });

    const h1 = await snapshotDecision(d1);
    const h2 = await snapshotDecision(d2);
    expect(h1).not.toBe(h2);
  });

  it("ignores title/description changes (only scores matter)", async () => {
    const d1 = makeDecision();
    const d2 = makeDecision({
      title: "Different Title",
      description: "Different description",
    });

    const h1 = await snapshotDecision(d1);
    const h2 = await snapshotDecision(d2);
    expect(h1).toBe(h2);
  });

  it("can be stored in entry metadata", async () => {
    const decision = makeDecision();
    const hash = await snapshotDecision(decision);

    const entry = addEntry("dec-1", {
      type: "outcome",
      content: "Made the call",
      metadata: { snapshotHash: hash, mood: "confident" },
    });

    expect(entry.metadata?.snapshotHash).toBe(hash);
    expect(entry.metadata?.snapshotHash).toMatch(/^[0-9a-f]+$/);
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("handles empty content gracefully", () => {
    const entry = addEntry("dec-1", { type: "note", content: "" });
    expect(entry.content).toBe("");
    expect(getEntries("dec-1")).toHaveLength(1);
  });

  it("handles corrupt localStorage gracefully", () => {
    localStorage.setItem(JOURNAL_KEY, "not-valid-json");
    // Should not throw, returns defaults
    expect(getEntries("dec-1")).toEqual([]);
  });

  it("handles multiple decisions independently", () => {
    addEntry("dec-1", { type: "note", content: "Dec 1 entry" });
    addEntry("dec-2", { type: "reasoning", content: "Dec 2 entry" });

    expect(getEntries("dec-1")).toHaveLength(1);
    expect(getEntries("dec-2")).toHaveLength(1);
    expect(getEntries("dec-1")[0].decisionId).toBe("dec-1");
    expect(getEntries("dec-2")[0].decisionId).toBe("dec-2");
  });

  it("all four entry types are supported", () => {
    const types = ["note", "reasoning", "outcome", "retrospective"] as const;
    for (const type of types) {
      addEntry("dec-1", { type, content: `Entry of type ${type}` });
    }
    const entries = getEntries("dec-1");
    expect(entries).toHaveLength(4);
    const entryTypes = entries.map((e) => e.type);
    expect(entryTypes).toContain("note");
    expect(entryTypes).toContain("reasoning");
    expect(entryTypes).toContain("outcome");
    expect(entryTypes).toContain("retrospective");
  });

  it("snapshotDecision uses FNV-1a fallback when crypto.subtle is unavailable", async () => {
    const originalCrypto = globalThis.crypto;
    // Temporarily remove crypto.subtle
    Object.defineProperty(globalThis, "crypto", {
      value: { subtle: undefined },
      configurable: true,
      writable: true,
    });

    try {
      const decision = makeDecision();
      const hash = await snapshotDecision(decision);
      // FNV-1a produces an 8-char hex string (32-bit hash)
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        value: originalCrypto,
        configurable: true,
        writable: true,
      });
    }
  });

  it("loadJournals returns empty when localStorage throws", () => {
    // Seed good data first, then corrupt it
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("access denied");
    });
    // getEntries calls loadJournals internally
    expect(getEntries("any")).toEqual([]);
    spy.mockRestore();
  });
});
