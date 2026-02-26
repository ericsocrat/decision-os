/**
 * Unit tests for utility functions.
 */

import { describe, it, expect } from "vitest";
import { generateId, safeJsonParse, decodeDecisionFromUrl, formatRelativeTime } from "@/lib/utils";
import { compressToEncodedURIComponent } from "lz-string";
import { DEMO_DECISION } from "@/lib/demo-data";

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

describe("decodeDecisionFromUrl (legacy format)", () => {
  it("decodes a legacy lz-string encoded decision", () => {
    const encoded = compressToEncodedURIComponent(JSON.stringify(DEMO_DECISION));
    expect(encoded.length).toBeGreaterThan(0);
    const decoded = decodeDecisionFromUrl(encoded, null);
    expect(decoded).toEqual(DEMO_DECISION);
  });

  it("returns fallback on invalid encoded data", () => {
    expect(decodeDecisionFromUrl("%%%invalid%%%", "fallback")).toBe("fallback");
  });

  it("returns fallback on empty string", () => {
    expect(decodeDecisionFromUrl("", null)).toBeNull();
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
});
