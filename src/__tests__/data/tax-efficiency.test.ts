import { describe, it, expect, beforeEach } from "vitest";
import { TaxEfficiencyProvider } from "@/lib/data/providers/tax-efficiency";
import type { DataQuery } from "@/lib/data/provider";
import { TAX_DATA } from "@/lib/data/datasets/tax-efficiency";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function query(overrides: Partial<DataQuery> = {}): DataQuery {
  return {
    country: "US",
    category: "tax",
    metric: "income-tax-rate",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TaxEfficiencyProvider", () => {
  let provider: TaxEfficiencyProvider;

  beforeEach(() => {
    provider = new TaxEfficiencyProvider();
  });

  // ── Identity ────────────────────────────────────────────────────

  it("has correct id, name, and categories", () => {
    expect(provider.id).toBe("tax-efficiency");
    expect(provider.name).toBe("Tax Efficiency");
    expect(provider.categories).toContain("tax");
  });

  // ── supports() ──────────────────────────────────────────────────

  it("supports valid tax queries", () => {
    expect(provider.supports(query())).toBe(true);
    expect(
      provider.supports(query({ metric: "corporate-tax-rate" })),
    ).toBe(true);
    expect(
      provider.supports(query({ metric: "tax-freedom-index" })),
    ).toBe(true);
  });

  it("rejects unsupported category", () => {
    expect(provider.supports(query({ category: "cost-of-living" }))).toBe(
      false,
    );
  });

  it("rejects unknown metric", () => {
    expect(provider.supports(query({ metric: "nonsense" }))).toBe(false);
  });

  // ── Tier 2 — bundled data ───────────────────────────────────────

  it("returns Tier 2 data for a known country", async () => {
    const result = await provider.fetch(query({ country: "US" }));
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(2);
    expect(result?.source).toBe("Tax Efficiency");
    expect(result?.confidence).toBe(0.85);
    expect(result?.rawValue).toBe(24); // US income tax rate
    expect(result?.unit).toBe("%");
  });

  it("inverts normalization for tax rate metrics (lower tax = higher score)", async () => {
    // UAE: 0% income tax → should score near 100
    const uae = await provider.fetch(query({ country: "AE" }));
    // Belgium: 40% income tax → should score much lower
    const be = await provider.fetch(query({ country: "BE" }));

    expect(uae).not.toBeNull();
    expect(be).not.toBeNull();
    expect(uae!.value).toBeGreaterThan(be!.value);
    expect(uae!.value).toBeGreaterThan(80);
  });

  it("does NOT invert tax-freedom-index (already higher = better)", async () => {
    // UAE has high freedom index (~92), Belgium low (~28)
    const uae = await provider.fetch(
      query({ country: "AE", metric: "tax-freedom-index" }),
    );
    const be = await provider.fetch(
      query({ country: "BE", metric: "tax-freedom-index" }),
    );

    expect(uae).not.toBeNull();
    expect(be).not.toBeNull();
    expect(uae!.value).toBeGreaterThan(be!.value);
  });

  it("returns data for all supported metrics", async () => {
    const metrics = [
      "income-tax-rate",
      "corporate-tax-rate",
      "sales-tax-rate",
      "social-security-rate",
      "tax-freedom-index",
    ];

    for (const metric of metrics) {
      const result = await provider.fetch(query({ metric }));
      expect(result).not.toBeNull();
      expect(result?.tier).toBe(2);
    }
  });

  it("matches country case-insensitively", async () => {
    const result = await provider.fetch(query({ country: "us" }));
    expect(result).not.toBeNull();
    expect(result?.rawValue).toBe(24);
  });

  // ── Tier 3 — estimation ─────────────────────────────────────────

  it("returns Tier 3 estimated data for unknown country with income group", async () => {
    // Myanmar is in the income-group map (LMC) but not in the tax dataset
    const result = await provider.fetch(query({ country: "MM" }));
    expect(result).not.toBeNull();
    expect(result?.tier).toBe(3);
    expect(result?.confidence).toBe(0.35);
    expect(result?.source).toContain("estimated");
  });

  it("returns null for completely unknown country", async () => {
    const result = await provider.fetch(query({ country: "XX" }));
    expect(result).toBeNull();
  });

  // ── Dataset sanity ──────────────────────────────────────────────

  it("bundled dataset covers >= 60 countries", () => {
    expect(TAX_DATA.length).toBeGreaterThanOrEqual(60);
  });

  it("all tax rates are non-negative", () => {
    for (const entry of TAX_DATA) {
      expect(entry.incomeTaxRate).toBeGreaterThanOrEqual(0);
      expect(entry.corporateTaxRate).toBeGreaterThanOrEqual(0);
      expect(entry.salesTaxRate).toBeGreaterThanOrEqual(0);
      expect(entry.socialSecurityRate).toBeGreaterThanOrEqual(0);
    }
  });
});
