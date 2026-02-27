/**
 * Unit tests for localStorage persistence layer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDecisions,
  getDecision,
  saveDecision,
  deleteDecision,
  resetToDemo,
} from "@/lib/storage";
import { DEMO_DECISION } from "@/lib/demo-data";
import type { Decision } from "@/lib/types";

const STORAGE_KEY = "decision-os:decisions";

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  const now = new Date().toISOString();
  return {
    id: `test-${Date.now()}`,
    title: "Test Decision",
    description: "",
    options: [
      { id: "o1", name: "A" },
      { id: "o2", name: "B" },
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

describe("getDecisions", () => {
  it("returns a blank decision when localStorage is empty (empty state)", () => {
    const decs = getDecisions();
    expect(decs).toHaveLength(1);
    // New users get a blank decision so the EmptyState screen shows
    expect(decs[0].title).toBe("");
    expect(decs[0].options).toEqual([]);
    expect(decs[0].criteria).toEqual([]);
  });

  it("returns saved decisions from localStorage", () => {
    const custom = makeDecision({ id: "custom-1", title: "Custom" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([custom]));
    const decs = getDecisions();
    expect(decs).toHaveLength(1);
    expect(decs[0].id).toBe("custom-1");
  });

  it("resets to blank on corrupt localStorage data", () => {
    localStorage.setItem(STORAGE_KEY, "not-json");
    const decs = getDecisions();
    expect(decs).toHaveLength(1);
    expect(decs[0].title).toBe("");
  });

  it("resets to blank when stored data is empty array", () => {
    localStorage.setItem(STORAGE_KEY, "[]");
    const decs = getDecisions();
    expect(decs).toHaveLength(1);
    expect(decs[0].title).toBe("");
  });
});

describe("getDecision", () => {
  it("returns a specific decision by ID", () => {
    const d = getDecisions(); // seeds demo
    const found = getDecision(d[0].id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(d[0].id);
  });

  it("returns undefined for non-existent ID", () => {
    getDecisions(); // seed
    expect(getDecision("nonexistent")).toBeUndefined();
  });
});

describe("saveDecision", () => {
  it("persists a new decision and retrieves it", () => {
    const custom = makeDecision({ id: "save-test", title: "Saved" });
    saveDecision(custom);
    const decs = getDecisions();
    expect(decs.some((d) => d.id === "save-test")).toBe(true);
  });

  it("updates an existing decision in place", () => {
    const custom = makeDecision({ id: "update-test", title: "Before" });
    saveDecision(custom);
    saveDecision({ ...custom, title: "After" });
    const found = getDecision("update-test");
    expect(found?.title).toBe("After");
  });
});

describe("deleteDecision", () => {
  it("removes a decision from the list", () => {
    const a = makeDecision({ id: "del-a", title: "A" });
    const b = makeDecision({ id: "del-b", title: "B" });
    saveDecision(a);
    saveDecision(b);
    const result = deleteDecision("del-a");
    expect(result).toBe(true);
    expect(getDecision("del-a")).toBeUndefined();
  });

  it("refuses to delete when only one decision remains", () => {
    // Start with blank decision (first-time user)
    const initial = getDecisions();
    const result = deleteDecision(initial[0].id);
    expect(result).toBe(false);
    expect(getDecisions()).toHaveLength(1);
  });
});

describe("resetToDemo", () => {
  it("restores demo data, removing custom decisions", () => {
    const custom = makeDecision({ id: "will-be-gone", title: "Gone" });
    saveDecision(custom);
    expect(getDecisions().length).toBeGreaterThan(1);
    resetToDemo();
    const decs = getDecisions();
    expect(decs).toHaveLength(1);
    expect(decs[0].id).toBe(DEMO_DECISION.id);
  });
});

// ---------------------------------------------------------------------------
// Branch coverage — edge cases
// ---------------------------------------------------------------------------

describe("getDecisions — edge-case branches", () => {
  it("resets to blank when stored data is valid JSON but not a Decision array", () => {
    // Valid JSON object, but not an array of decisions
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    const decs = getDecisions();
    expect(decs).toHaveLength(1);
    expect(decs[0].title).toBe("");
  });

  it("resets to blank when stored data is a JSON array of non-Decision objects", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ notA: "decision" }]));
    const decs = getDecisions();
    expect(decs).toHaveLength(1);
    expect(decs[0].title).toBe("");
  });

  it("returns demo when localStorage.getItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const decs = getDecisions();
    expect(decs).toHaveLength(1);
    expect(decs[0].id).toBe(DEMO_DECISION.id);
    spy.mockRestore();
  });
});

describe("saveDecision — edge-case branches", () => {
  it("silently fails when localStorage.setItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    // Should not throw
    expect(() => saveDecision(makeDecision({ id: "quota-test" }))).not.toThrow();
    spy.mockRestore();
  });
});

describe("deleteDecision — edge-case branches", () => {
  it("returns false when localStorage throws", () => {
    // Seed some data first, then break localStorage
    const a = makeDecision({ id: "del-a" });
    const b = makeDecision({ id: "del-b" });
    saveDecision(a);
    saveDecision(b);
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const result = deleteDecision("del-a");
    expect(result).toBe(false);
    spy.mockRestore();
  });
});

describe("resetToDemo — edge-case branches", () => {
  it("silently fails when localStorage.setItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => resetToDemo()).not.toThrow();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// SSR guard branches (globalThis.window === undefined)
// ---------------------------------------------------------------------------

describe("SSR guards — window is undefined", () => {
  let origWindow: typeof globalThis.window;

  beforeEach(() => {
    origWindow = globalThis.window;
    // @ts-expect-error — simulating SSR
    delete globalThis.window;
  });

  afterEach(() => {
    globalThis.window = origWindow;
  });

  it("getDecisions returns demo when window is undefined", () => {
    expect(getDecisions()).toEqual([DEMO_DECISION]);
  });

  it("saveDecision no-ops when window is undefined", () => {
    expect(() => saveDecision(makeDecision())).not.toThrow();
  });

  it("deleteDecision returns false when window is undefined", () => {
    expect(deleteDecision("any-id")).toBe(false);
  });

  it("resetToDemo no-ops when window is undefined", () => {
    expect(() => resetToDemo()).not.toThrow();
  });
});
