import { describe, it, expect, beforeEach } from "vitest";
import { QualityOfLifeProvider } from "@/lib/data/providers/quality-of-life";
import type { DataQuery } from "@/lib/data/provider";
import {
  QUALITY_OF_LIFE_DATA,
  REGIONAL_AVERAGES,
  COUNTRY_REGION,
} from "@/lib/data/datasets/quality-of-life";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function query(overrides: Partial<DataQuery> = {}): DataQuery {
  return {
    country: "US",
    city: "New York",
    category: "safety",
    metric: "safety-index",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("QualityOfLifeProvider", () => {
  let provider: QualityOfLifeProvider;

  beforeEach(() => {
    provider = new QualityOfLifeProvider();
  });

  // ── Identity ────────────────────────────────────────────────────

  it("has correct id, name, and categories", () => {
    expect(provider.id).toBe("quality-of-life");
    expect(provider.name).toBe("Quality of Life");
    expect(provider.categories).toContain("safety");
    expect(provider.categories).toContain("healthcare");
    expect(provider.categories).toContain("climate");
  });

  // ── supports() ──────────────────────────────────────────────────

  it("supports valid queries across multiple categories", () => {
    expect(provider.supports(query())).toBe(true);
    expect(
      provider.supports(
        query({ category: "healthcare", metric: "healthcare-index" }),
      ),
    ).toBe(true);
    expect(
      provider.supports(
        query({ category: "climate", metric: "climate-comfort" }),
      ),
    ).toBe(true);
    expect(
      provider.supports(
        query({ category: "environment", metric: "pollution-index" }),
      ),
    ).toBe(true);
    expect(
      provider.supports(
        query({ category: "infrastructure", metric: "infrastructure-quality" }),
      ),
    ).toBe(true);
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
    expect(result?.source).toBe("Quality of Life");
    expect(result?.confidence).toBe(0.85);
    expect(result?.rawValue).toBe(52); // NYC safety index
  });

  it("inverts pollution index (less pollution = higher score)", async () => {
    // Helsinki: pollutionIndex = 12 (low) → inverted score should be high
    const helsinki = await provider.fetch(
      query({
        city: "Helsinki",
        country: "FI",
        category: "environment",
        metric: "pollution-index",
      }),
    );
    // Delhi: pollutionIndex = 85 (high) → inverted score should be low
    const delhi = await provider.fetch(
      query({
        city: "Delhi",
        country: "IN",
        category: "environment",
        metric: "pollution-index",
      }),
    );

    expect(helsinki).not.toBeNull();
    expect(delhi).not.toBeNull();
    // Helsinki (low pollution) should score higher
    expect(helsinki!.value).toBeGreaterThan(delhi!.value);
    expect(helsinki!.value).toBeGreaterThan(80); // 100-12 = 88
    expect(delhi!.value).toBeLessThan(20); // 100-85 = 15
  });

  it("returns data for all 6 metrics", async () => {
    const metrics = [
      "safety-index",
      "healthcare-index",
      "climate-comfort",
      "pollution-index",
      "infrastructure-quality",
      "green-space-access",
    ];

    for (const metric of metrics) {
      const result = await provider.fetch(
        query({ metric, category: "safety" }),
      );
      expect(result).not.toBeNull();
      expect(result?.tier).toBe(2);
    }
  });

  it("matches city and country case-insensitively", async () => {
    const result = await provider.fetch(
      query({ city: "new york", country: "us" }),
    );
    expect(result).not.toBeNull();
    expect(result?.rawValue).toBe(52);
  });

  it("falls back to first country entry when no city specified", async () => {
    const result = await provider.fetch(
      query({ city: undefined, country: "US" }),
    );
    expect(result).not.toBeNull();
    // First US city is New York
    expect(result?.rawValue).toBe(52);
  });

  // ── Tier 3 — regional estimation ───────────────────────────────

  it("returns Tier 3 data for unknown city in known country region", async () => {
    // Austin is not in the dataset but US → "north-america" region
    const result = await provider.fetch(
      query({ city: "Austin", country: "US" }),
    );
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(3);
    expect(result?.confidence).toBe(0.4);
    expect(result?.source).toContain("regional estimate");
    // North America safety average = 55
    expect(result?.rawValue).toBe(55);
  });

  it("inverts pollution in Tier 3 estimation", async () => {
    // South Asia region has pollution 72
    // Use a city not in dataset but country in south-asia region
    const result = await provider.fetch(
      query({
        city: "Karachi",
        country: "PK",
        category: "environment",
        metric: "pollution-index",
      }),
    );
    expect(result).not.toBeNull();
    expect(result?.rawValue).toBe(72); // South Asia pollution avg
    expect(result?.value).toBeCloseTo(28, 0); // 100 - 72 = 28 (inverted)
  });

  it("returns null for completely unknown country", async () => {
    const result = await provider.fetch(
      query({ city: "Unknown", country: "XX" }),
    );
    expect(result).toBeNull();
  });

  // ── Defensive guards (field === undefined) ──────────────────────

  it("returns null when metric has no field mapping (bypasses supports)", async () => {
    const result = await provider.fetch(
      query({ metric: "nonexistent-metric" }),
    );
    expect(result).toBeNull();
  });

  it("returns null for unknown metric with estimation-eligible country", async () => {
    const result = await provider.fetch(
      query({ country: "PK", city: "Karachi", metric: "fake-metric" }),
    );
    expect(result).toBeNull();
  });

  // ── Caching ─────────────────────────────────────────────────────

  it("caches results for identical queries", async () => {
    const q = query();
    const r1 = await provider.fetch(q);
    const r2 = await provider.fetch(q);
    expect(r1).toStrictEqual(r2);
    expect(provider.cacheSize).toBe(1);
  });

  // ── Dataset sanity ──────────────────────────────────────────────

  it("bundled dataset covers >= 80 cities", () => {
    expect(QUALITY_OF_LIFE_DATA.length).toBeGreaterThanOrEqual(80);
  });

  it("regional averages cover >= 10 regions", () => {
    expect(Object.keys(REGIONAL_AVERAGES).length).toBeGreaterThanOrEqual(10);
  });

  it("country-region map covers >= 50 countries", () => {
    expect(Object.keys(COUNTRY_REGION).length).toBeGreaterThanOrEqual(50);
  });

  it("all index values are between 0 and 100", () => {
    const fields: (keyof typeof QUALITY_OF_LIFE_DATA[0])[] = [
      "safetyIndex",
      "healthcareIndex",
      "climateComfort",
      "pollutionIndex",
      "infrastructureQuality",
      "greenSpaceAccess",
    ];

    for (const entry of QUALITY_OF_LIFE_DATA) {
      for (const field of fields) {
        const val = entry[field] as number;
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    }
  });
});
