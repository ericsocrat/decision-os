import { describe, it, expect, beforeEach } from "vitest";
import { CostOfLivingProvider } from "@/lib/data/providers/cost-of-living";
import type { DataQuery } from "@/lib/data/provider";
import { COST_OF_LIVING_DATA, RANGES } from "@/lib/data/datasets/cost-of-living";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function query(overrides: Partial<DataQuery> = {}): DataQuery {
  return {
    country: "US",
    city: "New York",
    category: "cost-of-living",
    metric: "rent-1br-center",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CostOfLivingProvider", () => {
  let provider: CostOfLivingProvider;

  beforeEach(() => {
    provider = new CostOfLivingProvider();
  });

  // ── Identity ────────────────────────────────────────────────────

  it("has correct id, name, and categories", () => {
    expect(provider.id).toBe("cost-of-living");
    expect(provider.name).toBe("Cost of Living");
    expect(provider.categories).toContain("cost-of-living");
  });

  // ── supports() ──────────────────────────────────────────────────

  it("supports valid cost-of-living queries", () => {
    expect(provider.supports(query())).toBe(true);
    expect(provider.supports(query({ metric: "overall-index" }))).toBe(true);
  });

  it("rejects unsupported category", () => {
    expect(provider.supports(query({ category: "tax" }))).toBe(false);
  });

  it("rejects unknown metric", () => {
    expect(provider.supports(query({ metric: "nonsense" }))).toBe(false);
  });

  // ── Tier 2 — bundled data ───────────────────────────────────────

  it("returns Tier 2 data for a known city", async () => {
    const result = await provider.fetch(query());
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(2);
    expect(result?.source).toBe("Cost of Living");
    expect(result?.confidence).toBe(0.85);
    expect(result?.rawValue).toBe(3500); // New York 1BR center rent
    expect(result?.unit).toBe("USD/month");
  });

  it("normalizes values to 0–100", async () => {
    const result = await provider.fetch(query());
    expect(result?.value).toBeGreaterThanOrEqual(0);
    expect(result?.value).toBeLessThanOrEqual(100);
  });

  it("returns data for different metrics", async () => {
    const metrics = [
      "rent-1br-center",
      "rent-1br-outside",
      "groceries-index",
      "restaurant-meal",
      "transport-monthly",
      "utilities-monthly",
      "internet-monthly",
      "overall-index",
    ];

    for (const metric of metrics) {
      const result = await provider.fetch(query({ metric }));
      expect(result).not.toBeNull();
      expect(result?.tier).toBe(2);
    }
  });

  it("matches city case-insensitively", async () => {
    const result = await provider.fetch(query({ city: "new york" }));
    expect(result).not.toBeNull();
    expect(result?.rawValue).toBe(3500);
  });

  it("falls back to first country entry when no city specified", async () => {
    const result = await provider.fetch(
      query({ country: "US", city: undefined }),
    );
    expect(result).not.toBeNull();
    // Should match the first US city in dataset (New York)
    expect(result?.rawValue).toBe(3500);
  });

  // ── Tier 3 — estimation ─────────────────────────────────────────

  it("returns Tier 3 estimated data for unknown city in known country", async () => {
    const result = await provider.fetch(
      query({ country: "US", city: "Nowhere Town" }),
    );
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(3);
    expect(result?.source).toContain("estimated");
    expect(result?.confidence).toBe(0.4);
  });

  it("returns Tier 3 for a low-income country not in dataset", async () => {
    const result = await provider.fetch(
      query({ country: "ET", city: "Bahir Dar" }),
    );
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(3);
    expect(result?.confidence).toBe(0.4);
    // Low income → multiplier 0.25 → should be relatively cheap
    expect(result?.value).toBeLessThan(50);
  });

  it("returns null for a country not in income-group map", async () => {
    const result = await provider.fetch(
      query({ country: "XX", city: "Unknown" }),
    );
    expect(result).toBeNull();
  });

  // ── Defensive guards (field === undefined) ──────────────────────

  it("returns null when metric has no field mapping (bypasses supports)", async () => {
    // Calling fetch() directly with an unsupported metric exercises the
    // field === undefined guards in both lookupBundled and estimate
    const result = await provider.fetch(
      query({ metric: "nonexistent-metric" }),
    );
    expect(result).toBeNull();
  });

  it("returns null for unknown metric with estimation-eligible country", async () => {
    // Country in income-group map but metric is invalid
    const result = await provider.fetch(
      query({ country: "ET", city: "Addis Ababa", metric: "fake-metric" }),
    );
    expect(result).toBeNull();
  });

  // ── Caching ─────────────────────────────────────────────────────

  it("caches results across identical queries", async () => {
    const r1 = await provider.fetch(query());
    const r2 = await provider.fetch(query());
    expect(r1).toEqual(r2);
    expect(provider.cacheSize).toBe(1);
  });

  // ── Dataset sanity ──────────────────────────────────────────────

  it("bundled dataset has >= 90 cities", () => {
    expect(COST_OF_LIVING_DATA.length).toBeGreaterThanOrEqual(90);
  });

  it("all range min < max", () => {
    for (const [, range] of Object.entries(RANGES)) {
      expect(range.min).toBeLessThan(range.max);
    }
  });
});
