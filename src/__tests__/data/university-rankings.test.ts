import { describe, it, expect, beforeEach } from "vitest";
import { UniversityRankingsProvider } from "@/lib/data/providers/university-rankings";
import type { DataQuery } from "@/lib/data/provider";
import {
  UNIVERSITY_DATA,
  MAX_RANK,
  getUniversitiesInCity,
  getUniversitiesInCountry,
} from "@/lib/data/datasets/university-rankings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function query(overrides: Partial<DataQuery> = {}): DataQuery {
  return {
    country: "US",
    city: "Cambridge",
    category: "university",
    metric: "overall-rank",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UniversityRankingsProvider", () => {
  let provider: UniversityRankingsProvider;

  beforeEach(() => {
    provider = new UniversityRankingsProvider();
  });

  // ── Identity ────────────────────────────────────────────────────

  it("has correct id, name, and categories", () => {
    expect(provider.id).toBe("university-rankings");
    expect(provider.name).toBe("University Rankings");
    expect(provider.categories).toContain("university");
  });

  // ── supports() ──────────────────────────────────────────────────

  it("supports valid university queries", () => {
    expect(provider.supports(query())).toBe(true);
    expect(
      provider.supports(query({ metric: "academic-reputation" })),
    ).toBe(true);
    expect(
      provider.supports(query({ metric: "city-university-density" })),
    ).toBe(true);
  });

  it("rejects unsupported category", () => {
    expect(provider.supports(query({ category: "tax" }))).toBe(false);
  });

  it("rejects unknown metric", () => {
    expect(provider.supports(query({ metric: "nonsense" }))).toBe(false);
  });

  // ── Tier 2 — bundled city-level data ────────────────────────────

  it("returns Tier 2 data for a known city (MIT in Cambridge, US)", async () => {
    const result = await provider.fetch(query());
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(2);
    expect(result?.source).toBe("University Rankings");
    expect(result?.confidence).toBe(0.85);
    // MIT is rank 1 → rawValue = 1
    expect(result?.rawValue).toBe(1);
    // rank 1 → score = (200-1+1)/200 * 100 = 100
    expect(result?.value).toBe(100);
    expect(result?.unit).toBe("rank");
  });

  it("inverts rank to score correctly", async () => {
    const result = await provider.fetch(query());
    // MIT rank 1 → 100
    expect(result?.value).toBe(100);

    // Check a lower-ranked university
    const result2 = await provider.fetch(
      query({ city: "São Paulo", country: "BR" }),
    );
    expect(result2).not.toBeNull();
    // rank 100 → (200-100+1)/200*100 = 50.5
    expect(result2?.value).toBe(50.5);
    expect(result2?.rawValue).toBe(100);
  });

  it("returns direct score metrics (academic-reputation)", async () => {
    const result = await provider.fetch(
      query({ metric: "academic-reputation" }),
    );
    expect(result).not.toBeNull();
    // MIT academic reputation = 100
    expect(result?.rawValue).toBe(100);
    expect(result?.value).toBe(100);
    expect(result?.unit).toBe("score");
  });

  it("returns data for all supported metrics", async () => {
    const metrics = [
      "overall-rank",
      "academic-reputation",
      "employer-reputation",
      "research-output",
      "international-diversity",
      "graduation-rate",
      "city-university-density",
    ];

    for (const metric of metrics) {
      const result = await provider.fetch(query({ metric }));
      expect(result).not.toBeNull();
      expect(result?.tier).toBe(2);
    }
  });

  it("city-university-density returns count of universities", async () => {
    // London has multiple universities in the dataset (Imperial, UCL, King's)
    const result = await provider.fetch(
      query({
        city: "London",
        country: "GB",
        metric: "city-university-density",
      }),
    );
    expect(result).not.toBeNull();
    expect(result?.rawValue).toBeGreaterThanOrEqual(3);
    expect(result?.unit).toBe("count");
  });

  it("matches city and country case-insensitively", async () => {
    const result = await provider.fetch(
      query({ city: "cambridge", country: "us" }),
    );
    expect(result).not.toBeNull();
    expect(result?.rawValue).toBe(1);
  });

  it("picks best university when city has multiple", async () => {
    // Beijing has Peking U (rank 14) and Tsinghua (rank 19)
    const result = await provider.fetch(
      query({ city: "Beijing", country: "CN" }),
    );
    expect(result).not.toBeNull();
    expect(result?.rawValue).toBe(14); // Peking is ranked higher
  });

  // ── Tier 3 — country-level estimation ───────────────────────────

  it("returns Tier 3 data for unknown city in known country", async () => {
    // Houston is not in the dataset but US has universities
    const result = await provider.fetch(
      query({ city: "Houston", country: "US" }),
    );
    // No universities in Houston → falls through to country estimate
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(3);
    expect(result?.confidence).toBe(0.45);
    expect(result?.source).toContain("country estimate");
    // Best US university is MIT, rank 1
    expect(result?.rawValue).toBe(1);
  });

  it("returns Tier 3 data for country-only query (no city)", async () => {
    const result = await provider.fetch(
      query({ city: undefined, country: "GB" }),
    );
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(3);
    // Best GB university is Cambridge, rank 2
    expect(result?.rawValue).toBe(2);
  });

  it("returns null for completely unknown country", async () => {
    const result = await provider.fetch(
      query({ city: "Unknown", country: "XX" }),
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

  // ── Dataset helpers ─────────────────────────────────────────────

  it("getUniversitiesInCity returns entries", () => {
    const unis = getUniversitiesInCity("London", "GB");
    expect(unis.length).toBeGreaterThanOrEqual(3);
  });

  it("getUniversitiesInCountry returns entries", () => {
    const unis = getUniversitiesInCountry("US");
    expect(unis.length).toBeGreaterThanOrEqual(10);
  });

  // ── Dataset sanity ──────────────────────────────────────────────

  it("bundled dataset covers >= 70 universities", () => {
    expect(UNIVERSITY_DATA.length).toBeGreaterThanOrEqual(70);
  });

  it("MAX_RANK equals 200", () => {
    expect(MAX_RANK).toBe(200);
  });

  it("all ranks are between 1 and MAX_RANK", () => {
    for (const uni of UNIVERSITY_DATA) {
      expect(uni.overallRank).toBeGreaterThanOrEqual(1);
      expect(uni.overallRank).toBeLessThanOrEqual(MAX_RANK);
    }
  });

  it("all score fields are between 0 and 100", () => {
    for (const uni of UNIVERSITY_DATA) {
      expect(uni.academicReputation).toBeGreaterThanOrEqual(0);
      expect(uni.academicReputation).toBeLessThanOrEqual(100);
      expect(uni.employerReputation).toBeGreaterThanOrEqual(0);
      expect(uni.employerReputation).toBeLessThanOrEqual(100);
      expect(uni.researchOutput).toBeGreaterThanOrEqual(0);
      expect(uni.researchOutput).toBeLessThanOrEqual(100);
      expect(uni.internationalDiversity).toBeGreaterThanOrEqual(0);
      expect(uni.internationalDiversity).toBeLessThanOrEqual(100);
      expect(uni.graduationRate).toBeGreaterThanOrEqual(0);
      expect(uni.graduationRate).toBeLessThanOrEqual(100);
    }
  });
});
