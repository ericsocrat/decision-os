import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataProvider, DataPoint, DataQuery } from "@/lib/data/provider";

// ---------------------------------------------------------------------------
// Concrete stub used across tests
// ---------------------------------------------------------------------------

class StubProvider extends DataProvider {
  readonly id = "stub";
  readonly name = "Stub Provider";
  readonly categories = ["test-category"] as const;

  /** Controls what `fetchData` resolves to */
  result: DataPoint | null = null;

  /** Track how many times fetchData is actually invoked */
  fetchCount = 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async fetchData(query: DataQuery): Promise<DataPoint | null> {
    this.fetchCount += 1;
    return this.result;
  }

  supports(query: DataQuery): boolean {
    return this.categories.includes(query.category as "test-category");
  }

  // Expose protected helpers for testing
  publicNormalize(value: number, min: number, max: number): number {
    return this.normalize(value, min, max);
  }

  publicGetCacheKey(query: DataQuery): string {
    return this.getCacheKey(query);
  }

  setTtl(ms: number): void {
    this.ttlMs = ms;
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseQuery: DataQuery = {
  country: "US",
  city: "New York",
  category: "test-category",
  metric: "rent",
};

const samplePoint: DataPoint = {
  value: 72,
  rawValue: 2800,
  unit: "USD",
  source: "Stub Provider",
  confidence: 0.85,
  tier: 2,
  updatedAt: "2025-01-01T00:00:00Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DataProvider", () => {
  let provider: StubProvider;

  beforeEach(() => {
    provider = new StubProvider();
    provider.result = { ...samplePoint };
  });

  // ── Abstract contract ─────────────────────────────────────────────

  it("exposes id, name, and categories", () => {
    expect(provider.id).toBe("stub");
    expect(provider.name).toBe("Stub Provider");
    expect(provider.categories).toContain("test-category");
  });

  it("supports() returns true for matching category", () => {
    expect(provider.supports(baseQuery)).toBe(true);
  });

  it("supports() returns false for unknown category", () => {
    expect(provider.supports({ ...baseQuery, category: "unknown" })).toBe(
      false,
    );
  });

  // ── fetch() + caching ─────────────────────────────────────────────

  it("fetch() returns the data point from fetchData()", async () => {
    const result = await provider.fetch(baseQuery);
    expect(result).toEqual(samplePoint);
    expect(provider.fetchCount).toBe(1);
  });

  it("fetch() returns null when fetchData() returns null", async () => {
    provider.result = null;
    const result = await provider.fetch(baseQuery);
    expect(result).toBeNull();
    expect(provider.fetchCount).toBe(1);
  });

  it("fetch() caches results and skips fetchData on re-fetch", async () => {
    await provider.fetch(baseQuery);
    await provider.fetch(baseQuery);
    expect(provider.fetchCount).toBe(1);
    expect(provider.cacheSize).toBe(1);
  });

  it("fetch() calls fetchData again after cache expires", async () => {
    provider.setTtl(0); // instant expiry
    await provider.fetch(baseQuery);

    // Advance time by 1 ms so the entry is expired
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 1);

    await provider.fetch(baseQuery);
    expect(provider.fetchCount).toBe(2);

    vi.restoreAllMocks();
  });

  it("different queries produce different cache entries", async () => {
    const query2: DataQuery = { ...baseQuery, city: "Chicago" };
    await provider.fetch(baseQuery);
    await provider.fetch(query2);
    expect(provider.cacheSize).toBe(2);
    expect(provider.fetchCount).toBe(2);
  });

  it("clearCache() empties the cache", async () => {
    await provider.fetch(baseQuery);
    expect(provider.cacheSize).toBe(1);
    provider.clearCache();
    expect(provider.cacheSize).toBe(0);
  });

  // ── getCacheKey ───────────────────────────────────────────────────

  it("getCacheKey() is deterministic", () => {
    const key1 = provider.publicGetCacheKey(baseQuery);
    const key2 = provider.publicGetCacheKey(baseQuery);
    expect(key1).toBe(key2);
  });

  it("getCacheKey() is case-insensitive for country and city", () => {
    const upper = provider.publicGetCacheKey({
      ...baseQuery,
      country: "US",
      city: "New York",
    });
    const lower = provider.publicGetCacheKey({
      ...baseQuery,
      country: "us",
      city: "new york",
    });
    expect(upper).toBe(lower);
  });

  it("getCacheKey() handles missing city with placeholder", () => {
    const key = provider.publicGetCacheKey({
      country: "FR",
      category: "test-category",
      metric: "rent",
    });
    expect(key).toContain("_");
    expect(key).not.toContain("undefined");
  });

  // ── normalize ─────────────────────────────────────────────────────

  it("normalize() maps value to 0–100 linearly", () => {
    expect(provider.publicNormalize(50, 0, 100)).toBe(50);
    expect(provider.publicNormalize(0, 0, 100)).toBe(0);
    expect(provider.publicNormalize(100, 0, 100)).toBe(100);
  });

  it("normalize() clamps below 0", () => {
    expect(provider.publicNormalize(-10, 0, 100)).toBe(0);
  });

  it("normalize() clamps above 100", () => {
    expect(provider.publicNormalize(200, 0, 100)).toBe(100);
  });

  it("normalize() returns 50 when min === max (avoid division by zero)", () => {
    expect(provider.publicNormalize(42, 42, 42)).toBe(50);
  });

  it("normalize() handles inverted ranges correctly", () => {
    // min > max effectively inverts the scale
    const result = provider.publicNormalize(75, 100, 0);
    // (75 - 100) / (0 - 100) = -25 / -100 = 0.25 → 25
    expect(result).toBe(25);
  });

  // ── DataPoint structure ───────────────────────────────────────────

  it("DataPoint has required fields", () => {
    expect(samplePoint.value).toBeGreaterThanOrEqual(0);
    expect(samplePoint.value).toBeLessThanOrEqual(100);
    expect(samplePoint.confidence).toBeGreaterThanOrEqual(0);
    expect(samplePoint.confidence).toBeLessThanOrEqual(1);
    expect([1, 2, 3]).toContain(samplePoint.tier);
    expect(samplePoint.unit).toBeTruthy();
    expect(samplePoint.source).toBeTruthy();
    expect(samplePoint.updatedAt).toBeTruthy();
  });
});
