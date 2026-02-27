/**
 * Enrichment engine — the bridge between data providers and Decision OS.
 *
 * Responsibilities:
 * - Three-tier fallback: Tier 1 (live) → Tier 2 (bundled) → Tier 3 (estimated)
 * - Per-provider timeout (default 5 s)
 * - Batch enrichment (parallel queries)
 * - `suggestEnrichments()` — analyse a Decision's criteria names and propose
 *   matching DataQuery objects
 *
 * @module data/engine
 */

import type { Decision } from "../types";
import type { DataPoint, DataQuery } from "./provider";
import type { ProviderRegistry } from "./registry";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default per-provider timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Race a promise against a timeout. Resolves to `null` if the timeout
 * fires first.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

/**
 * Keyword → category mapping used by `suggestEnrichments` to infer what
 * data queries might be useful for a given criterion name.
 */
const KEYWORD_MAP: ReadonlyArray<{
  pattern: RegExp;
  category: string;
  metric: string;
}> = [
  { pattern: /cost.?of.?living|col\b|living.?cost/i, category: "cost-of-living", metric: "overall" },
  { pattern: /rent|housing/i, category: "cost-of-living", metric: "rent-1br-center" },
  { pattern: /groceries|food/i, category: "cost-of-living", metric: "groceries" },
  { pattern: /tax|income.?tax/i, category: "tax", metric: "income-tax-rate" },
  { pattern: /corporate.?tax|business.?tax/i, category: "tax", metric: "corporate-tax-rate" },
  { pattern: /universit|higher.?ed|college/i, category: "university", metric: "ranking" },
  { pattern: /safe|crime|security/i, category: "safety", metric: "safety-index" },
  { pattern: /climate|weather|temperature/i, category: "climate", metric: "avg-temperature" },
  { pattern: /health|healthcare/i, category: "healthcare", metric: "quality-index" },
  { pattern: /internet|connectivity|broadband/i, category: "infrastructure", metric: "internet-speed" },
  { pattern: /pollution|air.?quality|environment/i, category: "environment", metric: "pollution-index" },
  { pattern: /transport|commut/i, category: "infrastructure", metric: "transport-index" },
];

// ---------------------------------------------------------------------------
// EnrichmentEngine
// ---------------------------------------------------------------------------

export class EnrichmentEngine {
  private readonly registry: ProviderRegistry;
  private timeoutMs: number;

  constructor(registry: ProviderRegistry, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.registry = registry;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Set the per-provider timeout (ms).
   */
  setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }

  // ── Single-query enrichment with three-tier fallback ──────────────

  /**
   * Enrich a single query using the three-tier fallback strategy:
   *
   * 1. Try every provider that supports the query, preferring lower tiers
   *    (Tier 1 > Tier 2 > Tier 3).
   * 2. Each provider call is capped by `timeoutMs`.
   * 3. Returns the best `DataPoint` found, or `null` if no provider can
   *    satisfy the query.
   */
  async enrich(query: DataQuery): Promise<DataPoint | null> {
    const providers = this.registry.getProvidersForCategory(query.category);
    const candidates = providers.filter((p) => p.supports(query));

    if (candidates.length === 0) return null;

    let best: DataPoint | null = null;

    for (const provider of candidates) {
      const result = await withTimeout(provider.fetch(query), this.timeoutMs);
      if (result) {
        best = pickBetter(best, result);
        // Short-circuit: Tier 1 with high confidence is optimal
        if (best.tier === 1 && best.confidence >= 0.9) break;
      }
    }

    return best;
  }

  // ── Batch enrichment ──────────────────────────────────────────────

  /**
   * Enrich multiple queries in parallel. Returns a `Map` keyed by a
   * deterministic string representation of each query.
   *
   * Queries that cannot be satisfied map to `null`.
   */
  async enrichBatch(
    queries: readonly DataQuery[],
  ): Promise<Map<string, DataPoint | null>> {
    const results = new Map<string, DataPoint | null>();
    const settled = await Promise.allSettled(
      queries.map((q) => this.enrich(q)),
    );

    for (let i = 0; i < queries.length; i++) {
      const key = queryKey(queries[i]);
      const outcome = settled[i];
      results.set(key, outcome.status === "fulfilled" ? outcome.value : null);
    }

    return results;
  }

  // ── Suggestion engine ─────────────────────────────────────────────

  /**
   * Analyse a `Decision`'s criteria names, option names, and description
   * to propose enrichment queries.
   *
   * Returns a list of `DataQuery` objects that the UI can offer to the
   * user for one-click enrichment.
   */
  suggestEnrichments(decision: Decision): DataQuery[] {
    const locations = extractLocations(decision);
    const suggestions: DataQuery[] = [];
    const seen = new Set<string>();

    for (const criterion of decision.criteria) {
      this.collectCriterionSuggestions(criterion.name, locations, seen, suggestions);
    }

    return suggestions;
  }

  /** Push matching queries for a single criterion name. */
  private collectCriterionSuggestions(
    criterionName: string,
    locations: readonly Location[],
    seen: Set<string>,
    out: DataQuery[],
  ): void {
    for (const entry of KEYWORD_MAP) {
      if (!entry.pattern.test(criterionName)) continue;
      if (this.registry.getProvidersForCategory(entry.category).length === 0) continue;

      for (const loc of locations) {
        const query: DataQuery = {
          country: loc.country,
          city: loc.city,
          category: entry.category,
          metric: entry.metric,
        };
        const key = queryKey(query);
        if (!seen.has(key)) {
          seen.add(key);
          out.push(query);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Given two candidate DataPoints, return the one with the better tier
 * (lower = better). On equal tier, pick the higher confidence.
 */
function pickBetter(current: DataPoint | null, next: DataPoint): DataPoint {
  if (!current) return next;
  if (next.tier < current.tier) return next;
  if (next.tier === current.tier && next.confidence > current.confidence) {
    return next;
  }
  return current;
}

/** Deterministic string key for a DataQuery */
function queryKey(q: DataQuery): string {
  return [
    q.country.toLowerCase(),
    q.city?.toLowerCase() ?? "_",
    q.category,
    q.metric,
  ].join("|");
}

/** Simple location struct */
interface Location {
  country: string;
  city?: string;
}

/**
 * Best-effort extraction of locations from option names.
 *
 * For now this is a naive implementation that treats each option name
 * as a potential "City, Country" or just "Country" pair. A more
 * sophisticated NLP-based approach can replace this later.
 */
function extractLocations(decision: Decision): Location[] {
  const locations: Location[] = [];
  const seen = new Set<string>();

  for (const option of decision.options) {
    const parts = option.name.split(",").map((s) => s.trim());
    const loc: Location =
      parts.length >= 2
        ? { city: parts[0], country: parts[1] }
        : { country: parts[0] };

    const key =
      (loc.country?.toLowerCase() ?? "") +
      "|" +
      (loc.city?.toLowerCase() ?? "");
    if (!seen.has(key)) {
      seen.add(key);
      locations.push(loc);
    }
  }

  return locations;
}
