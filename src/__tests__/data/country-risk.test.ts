import { describe, it, expect, beforeEach } from "vitest";
import { CountryRiskProvider } from "@/lib/data/providers/country-risk";
import type { DataQuery } from "@/lib/data/provider";
import {
  COUNTRY_RISK_DATA,
  WGI_MIN,
  WGI_MAX,
} from "@/lib/data/datasets/country-risk";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function query(overrides: Partial<DataQuery> = {}): DataQuery {
  return {
    country: "US",
    category: "safety",
    metric: "political-stability",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CountryRiskProvider", () => {
  let provider: CountryRiskProvider;

  beforeEach(() => {
    provider = new CountryRiskProvider();
  });

  // ── Identity ────────────────────────────────────────────────────

  it("has correct id, name, and categories", () => {
    expect(provider.id).toBe("country-risk");
    expect(provider.name).toBe("Country Risk (WGI)");
    expect(provider.categories).toContain("safety");
  });

  // ── supports() ──────────────────────────────────────────────────

  it("supports valid safety queries", () => {
    expect(provider.supports(query())).toBe(true);
    expect(provider.supports(query({ metric: "rule-of-law" }))).toBe(true);
    expect(
      provider.supports(query({ metric: "composite-governance" })),
    ).toBe(true);
  });

  it("rejects unsupported category", () => {
    expect(provider.supports(query({ category: "tax" }))).toBe(false);
  });

  it("rejects unknown metric", () => {
    expect(provider.supports(query({ metric: "nonsense" }))).toBe(false);
  });

  // ── Tier 2 — bundled data ───────────────────────────────────────

  it("returns Tier 2 data for a known country", async () => {
    const result = await provider.fetch(query({ country: "US" }));
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(2);
    expect(result?.source).toBe("Country Risk (WGI)");
    expect(result?.confidence).toBe(0.9);
    expect(result?.rawValue).toBe(0.35); // US political stability
    expect(result?.unit).toBe("WGI score");
  });

  it("normalises WGI scores to 0-100 range", async () => {
    const result = await provider.fetch(query({ country: "SG" }));
    expect(result).not.toBeNull();
    // SG political stability = 1.50 → (1.50 - (-2.5)) / (2.5 - (-2.5)) * 100 = 80
    expect(result?.value).toBe(80);
  });

  it("higher governance scores produce higher normalised values", async () => {
    // Finland (good governance) vs Russia (poor governance)
    const fi = await provider.fetch(query({ country: "FI" }));
    const ru = await provider.fetch(query({ country: "RU" }));
    expect(fi).not.toBeNull();
    expect(ru).not.toBeNull();
    expect(fi!.value).toBeGreaterThan(ru!.value);
  });

  it("returns data for all supported individual metrics", async () => {
    const metrics = [
      "political-stability",
      "rule-of-law",
      "corruption-control",
      "government-effectiveness",
      "regulatory-quality",
      "voice-accountability",
    ];

    for (const metric of metrics) {
      const result = await provider.fetch(query({ metric }));
      expect(result).not.toBeNull();
      expect(result?.tier).toBe(2);
    }
  });

  it("returns composite governance as average of 6 indicators", async () => {
    const result = await provider.fetch(
      query({ metric: "composite-governance" }),
    );
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(2);
    // US composite = avg(0.35, 1.55, 1.30, 1.50, 1.60, 1.10)
    const expected = (0.35 + 1.55 + 1.30 + 1.50 + 1.60 + 1.10) / 6;
    expect(result?.rawValue).toBeCloseTo(expected, 2);
  });

  it("matches country case-insensitively", async () => {
    const result = await provider.fetch(query({ country: "us" }));
    expect(result).not.toBeNull();
    expect(result?.rawValue).toBe(0.35);
  });

  it("returns null for unknown country", async () => {
    const result = await provider.fetch(query({ country: "XX" }));
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

  it("bundled dataset covers >= 100 countries", () => {
    expect(COUNTRY_RISK_DATA.length).toBeGreaterThanOrEqual(100);
  });

  it("WGI bounds are -2.5 and +2.5", () => {
    expect(WGI_MIN).toBe(-2.5);
    expect(WGI_MAX).toBe(2.5);
  });

  it("all WGI scores are within valid range", () => {
    const fields: (keyof typeof COUNTRY_RISK_DATA[0])[] = [
      "politicalStability",
      "ruleOfLaw",
      "corruptionControl",
      "governmentEffectiveness",
      "regulatoryQuality",
      "voiceAccountability",
    ];

    for (const entry of COUNTRY_RISK_DATA) {
      for (const field of fields) {
        const val = entry[field] as number;
        expect(val).toBeGreaterThanOrEqual(WGI_MIN);
        expect(val).toBeLessThanOrEqual(WGI_MAX);
      }
    }
  });
});
