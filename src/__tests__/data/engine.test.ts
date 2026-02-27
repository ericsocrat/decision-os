import { describe, it, expect, beforeEach } from "vitest";
import { DataProvider, DataPoint, DataQuery } from "@/lib/data/provider";
import { ProviderRegistry } from "@/lib/data/registry";
import { EnrichmentEngine } from "@/lib/data/engine";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
// Stub provider
// ---------------------------------------------------------------------------

function makePoint(overrides: Partial<DataPoint> = {}): DataPoint {
  return {
    value: 60,
    rawValue: 1500,
    unit: "USD",
    source: "stub",
    confidence: 0.8,
    tier: 2,
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

class StubProvider extends DataProvider {
  readonly id: string;
  readonly name: string;
  readonly categories: readonly string[];
  result: DataPoint | null;

  constructor(id: string, categories: string[], result: DataPoint | null = makePoint()) {
    super();
    this.id = id;
    this.name = `Provider ${id}`;
    this.categories = categories;
    this.result = result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async fetchData(query: DataQuery): Promise<DataPoint | null> {
    return this.result;
  }

  supports(query: DataQuery): boolean {
    return this.categories.includes(query.category);
  }
}

/** A provider that never resolves (simulates timeout) */
class HangingProvider extends DataProvider {
  readonly id = "hanging";
  readonly name = "Hanging Provider";
  readonly categories = ["test"] as const;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected fetchData(_q: DataQuery): Promise<DataPoint | null> {
    return new Promise(() => {
      /* never resolves */
    });
  }

  supports(): boolean {
    return true;
  }
}

/** A provider that rejects */
class FailingProvider extends DataProvider {
  readonly id = "failing";
  readonly name = "Failing Provider";
  readonly categories = ["test"] as const;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async fetchData(_q: DataQuery): Promise<DataPoint | null> {
    throw new Error("network error");
  }

  supports(): boolean {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseQuery: DataQuery = {
  country: "US",
  city: "Boston",
  category: "test",
  metric: "alpha",
};

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "d1",
    title: "Where to live?",
    options: [
      { id: "o1", name: "Berlin, DE" },
      { id: "o2", name: "Tokyo, JP" },
    ],
    criteria: [
      { id: "c1", name: "Cost of Living", weight: 50, type: "cost" },
      { id: "c2", name: "Safety", weight: 30, type: "benefit" },
    ],
    scores: {},
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// ProviderRegistry tests
// ---------------------------------------------------------------------------

describe("ProviderRegistry", () => {
  let reg: ProviderRegistry;

  beforeEach(() => {
    reg = new ProviderRegistry();
  });

  it("registers and retrieves a provider by id", () => {
    const p = new StubProvider("a", ["cat"]);
    reg.register(p);
    expect(reg.getProvider("a")).toBe(p);
    expect(reg.size).toBe(1);
  });

  it("returns undefined for unknown id", () => {
    expect(reg.getProvider("nope")).toBeUndefined();
  });

  it("overwrites provider on duplicate id", () => {
    const p1 = new StubProvider("a", ["cat1"]);
    const p2 = new StubProvider("a", ["cat2"]);
    reg.register(p1);
    reg.register(p2);
    expect(reg.size).toBe(1);
    expect(reg.getProvider("a")).toBe(p2);
  });

  it("getProvidersForCategory returns matching providers", () => {
    reg.register(new StubProvider("a", ["cost", "tax"]));
    reg.register(new StubProvider("b", ["tax"]));
    reg.register(new StubProvider("c", ["safety"]));
    expect(reg.getProvidersForCategory("tax")).toHaveLength(2);
    expect(reg.getProvidersForCategory("cost")).toHaveLength(1);
    expect(reg.getProvidersForCategory("unknown")).toHaveLength(0);
  });

  it("listCategories returns sorted de-duplicated list", () => {
    reg.register(new StubProvider("a", ["tax", "cost"]));
    reg.register(new StubProvider("b", ["tax", "safety"]));
    expect(reg.listCategories()).toEqual(["cost", "safety", "tax"]);
  });
});

// ---------------------------------------------------------------------------
// EnrichmentEngine tests
// ---------------------------------------------------------------------------

describe("EnrichmentEngine", () => {
  let reg: ProviderRegistry;
  let engine: EnrichmentEngine;

  beforeEach(() => {
    reg = new ProviderRegistry();
    engine = new EnrichmentEngine(reg);
  });

  it("enrich() returns null when no providers match", async () => {
    const result = await engine.enrich(baseQuery);
    expect(result).toBeNull();
  });

  it("enrich() returns data from a matching provider", async () => {
    const point = makePoint({ value: 77 });
    reg.register(new StubProvider("a", ["test"], point));
    const result = await engine.enrich(baseQuery);
    expect(result).toEqual(point);
  });

  it("enrich() prefers lower-tier results", async () => {
    const tier2 = makePoint({ tier: 2, confidence: 0.9 });
    const tier1 = makePoint({ tier: 1, confidence: 0.7 });
    reg.register(new StubProvider("bundled", ["test"], tier2));
    reg.register(new StubProvider("live", ["test"], tier1));
    const result = await engine.enrich(baseQuery);
    expect(result?.tier).toBe(1);
  });

  it("enrich() prefers higher confidence on same tier", async () => {
    const low = makePoint({ tier: 2, confidence: 0.5 });
    const high = makePoint({ tier: 2, confidence: 0.95 });
    reg.register(new StubProvider("lo", ["test"], low));
    reg.register(new StubProvider("hi", ["test"], high));
    const result = await engine.enrich(baseQuery);
    expect(result?.confidence).toBe(0.95);
  });

  it("enrich() keeps current when later provider returns worse tier", async () => {
    const tier1 = makePoint({ tier: 1, confidence: 0.7 });
    const tier2 = makePoint({ tier: 2, confidence: 0.9 });
    // Register better provider first — engine should keep it when worse comes later
    reg.register(new StubProvider("live", ["test"], tier1));
    reg.register(new StubProvider("bundled", ["test"], tier2));
    const result = await engine.enrich(baseQuery);
    expect(result?.tier).toBe(1);
    expect(result?.confidence).toBe(0.7);
  });

  it("enrich() keeps current on same tier with equal confidence", async () => {
    const first = makePoint({ tier: 2, confidence: 0.8, source: "first" });
    const second = makePoint({ tier: 2, confidence: 0.8, source: "second" });
    reg.register(new StubProvider("a", ["test"], first));
    reg.register(new StubProvider("b", ["test"], second));
    const result = await engine.enrich(baseQuery);
    // first provider registered first — becomes current, second has equal confidence
    // pickBetter keeps current on equal confidence
    expect(result?.source).toBe("first");
  });

  it("enrich() gracefully handles provider errors", async () => {
    reg.register(new FailingProvider());
    const result = await engine.enrich(baseQuery);
    expect(result).toBeNull();
  });

  it("enrich() times out slow providers", async () => {
    reg.register(new HangingProvider());
    engine.setTimeout(50); // 50ms timeout
    const result = await engine.enrich(baseQuery);
    expect(result).toBeNull();
  }, 2000);

  it("enrichBatch() processes multiple queries in parallel", async () => {
    reg.register(new StubProvider("a", ["test"], makePoint({ value: 10 })));
    reg.register(new StubProvider("b", ["other"], makePoint({ value: 90 })));

    const queries: DataQuery[] = [
      { country: "US", category: "test", metric: "x" },
      { country: "US", category: "other", metric: "y" },
      { country: "US", category: "none", metric: "z" },
    ];

    const results = await engine.enrichBatch(queries);
    expect(results.size).toBe(3);

    // "none" category → null
    const keys = [...results.keys()];
    const values = [...results.values()];
    const nullCount = values.filter((v) => v === null).length;
    expect(nullCount).toBe(1);
    expect(keys.length).toBe(3);
  });

  // ── suggestEnrichments ──────────────────────────────────────────

  it("suggestEnrichments() returns queries from matching criteria", () => {
    reg.register(new StubProvider("col", ["cost-of-living"]));
    reg.register(new StubProvider("safe", ["safety"]));

    const decision = makeDecision();
    const suggestions = engine.suggestEnrichments(decision);

    // 2 criteria × 2 options = up to 4 suggestions
    expect(suggestions.length).toBeGreaterThanOrEqual(2);

    const categories = suggestions.map((s) => s.category);
    expect(categories).toContain("cost-of-living");
    expect(categories).toContain("safety");
  });

  it("suggestEnrichments() de-duplicates queries", () => {
    reg.register(new StubProvider("col", ["cost-of-living"]));

    const decision = makeDecision({
      criteria: [
        { id: "c1", name: "Cost of Living", weight: 50, type: "cost" },
        { id: "c2", name: "Living Cost", weight: 30, type: "cost" },
      ],
    });

    const suggestions = engine.suggestEnrichments(decision);
    const keys = suggestions.map((s) => `${s.country}|${s.city ?? "_"}|${s.category}|${s.metric}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("suggestEnrichments() returns empty for unrecognised criteria", () => {
    reg.register(new StubProvider("col", ["cost-of-living"]));
    const decision = makeDecision({
      criteria: [{ id: "c1", name: "Vibes", weight: 100, type: "benefit" }],
    });
    expect(engine.suggestEnrichments(decision)).toEqual([]);
  });

  it("suggestEnrichments() skips categories with no registered providers", () => {
    // Nothing registered → no suggestions even for matching criteria
    const decision = makeDecision();
    expect(engine.suggestEnrichments(decision)).toEqual([]);
  });

  it("enrich() short-circuits on tier 1 with >= 0.9 confidence", async () => {
    const fastProvider = new StubProvider(
      "fast",
      ["test"],
      makePoint({ tier: 1, confidence: 0.95 })
    );
    const slowProvider = new StubProvider(
      "slow",
      ["test"],
      makePoint({ tier: 1, confidence: 1.0, value: 999 })
    );
    reg.register(fastProvider);
    reg.register(slowProvider);

    const result = await engine.enrich(baseQuery);
    // Should get fastProvider's result because it short-circuits
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(0.95);
    expect(result!.value).not.toBe(999);
  });

  it("suggestEnrichments() deduplicates locations from duplicate option names", () => {
    reg.register(new StubProvider("col", ["cost-of-living"]));
    const decision = makeDecision({
      options: [
        { id: "o1", name: "Berlin, DE" },
        { id: "o2", name: "Berlin, DE" },
      ],
      criteria: [{ id: "c1", name: "Cost of Living", weight: 50, type: "cost" }],
    });
    const suggestions = engine.suggestEnrichments(decision);
    // Only 1 unique location → 1 suggestion, not 2
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].city).toBe("Berlin");
    expect(suggestions[0].country).toBe("DE");
  });

  it("enrichBatch() handles rejected promises gracefully", async () => {
    reg.register(new FailingProvider());
    const results = await engine.enrichBatch([baseQuery]);
    const key = "us|boston|test|alpha";
    expect(results.get(key)).toBeNull();
  });
});
