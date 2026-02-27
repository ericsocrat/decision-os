/**
 * Unit tests for utility functions.
 */

import { describe, it, expect, vi } from "vitest";
import { generateId, safeJsonParse, formatRelativeTime } from "@/lib/utils";

describe("generateId", () => {
  it("returns a non-empty string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });

  it("falls back to timestamp+random when crypto.randomUUID is unavailable", () => {
    const origRandomUUID = crypto.randomUUID;
    vi.stubGlobal("crypto", { ...crypto, randomUUID: undefined });
    const id = generateId();
    expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    vi.stubGlobal("crypto", { ...crypto, randomUUID: origRandomUUID });
  });
});

describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    expect(safeJsonParse('{"a":1}', null)).toEqual({ a: 1 });
  });

  it("returns fallback for invalid JSON", () => {
    expect(safeJsonParse("not json", "default")).toBe("default");
  });

  it("returns fallback for empty string", () => {
    expect(safeJsonParse("", [])).toEqual([]);
  });
});

describe("formatRelativeTime", () => {
  it('returns "just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("returns Xm ago for minutes-old timestamps", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns Xh ago for hour-old timestamps", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe("2h ago");
  });

  it("returns Xd ago for day-old timestamps", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveDaysAgo)).toBe("5d ago");
  });

  it("returns Xs ago for seconds-old timestamps (10-59s)", () => {
    const thirtySecAgo = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatRelativeTime(thirtySecAgo)).toBe("30s ago");
  });

  it("returns absolute date for timestamps older than 30 days", () => {
    const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(fortyFiveDaysAgo.toISOString());
    // Should be a locale-formatted date string (e.g. "May 1, 2025"), not "Xd ago"
    expect(result).not.toContain("d ago");
    expect(result).toMatch(/\d{4}/); // contains a 4-digit year
  });
});
