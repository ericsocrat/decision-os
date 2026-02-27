/**
 * Data provider base class and shared types for the enrichment system.
 *
 * Every data source (cost-of-living, tax, university rankings, etc.)
 * extends `DataProvider`. The base class supplies:
 * - In-memory cache with configurable TTL
 * - Linear min-max normalization
 * - Deterministic cache keys
 * - Standard fetch + supports interface
 *
 * @module data/provider
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single enriched data point */
export interface DataPoint {
  /** Normalised value on a 0–100 scale */
  value: number;
  /** Original value in the metric's native unit */
  rawValue: number;
  /** Unit of the raw value (e.g. "USD", "index", "rank") */
  unit: string;
  /** Human-readable provider name */
  source: string;
  /** How reliable this data point is (0.0–1.0) */
  confidence: number;
  /** Data freshness tier: 1 = live API, 2 = bundled, 3 = estimated */
  tier: 1 | 2 | 3;
  /** When the data was last refreshed (ISO 8601) */
  updatedAt: string;
  /** Optional source URL for citation */
  citation?: string;
}

/** Structured query for fetching a data point */
export interface DataQuery {
  /** City name (optional — some metrics are country-level) */
  city?: string;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** Top-level metric category (e.g. "cost-of-living", "tax") */
  category: string;
  /** Specific metric within the category (e.g. "rent-1br-center") */
  metric: string;
}

/** Cached entry wrapping a DataPoint with expiry */
interface CacheEntry {
  data: DataPoint;
  expiresAt: number; // Unix ms
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default cache TTL: 24 hours */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// DataProvider abstract class
// ---------------------------------------------------------------------------

/**
 * Base class for all data providers.
 *
 * Subclasses must implement:
 * - `id` — unique provider identifier
 * - `name` — human-readable provider name
 * - `categories` — list of supported categories
 * - `fetchData(query)` — the actual data retrieval logic
 * - `supports(query)` — whether this provider can handle the query
 */
export abstract class DataProvider {
  /** Unique provider identifier */
  abstract readonly id: string;

  /** Human-readable name */
  abstract readonly name: string;

  /** Categories this provider covers */
  abstract readonly categories: readonly string[];

  /** Cache TTL in milliseconds */
  protected ttlMs: number = DEFAULT_TTL_MS;

  /** Internal cache */
  private readonly cache = new Map<string, CacheEntry>();

  // ── Abstract methods required by subclasses ──────────────────────────

  /**
   * Fetch a data point for the given query.
   * Implementations should NOT cache — the base class handles that.
   * Return `null` if the query cannot be satisfied.
   */
  protected abstract fetchData(query: DataQuery): Promise<DataPoint | null>;

  /**
   * Whether this provider can handle the given query.
   */
  abstract supports(query: DataQuery): boolean;

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Fetch a data point, returning a cached result if available.
   * Returns `null` when the query cannot be fulfilled.
   */
  async fetch(query: DataQuery): Promise<DataPoint | null> {
    const key = this.getCacheKey(query);
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const data = await this.fetchData(query);
    if (data) {
      this.cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
    }
    return data;
  }

  /**
   * Clear the entire cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Number of entries currently in the cache (including expired).
   */
  get cacheSize(): number {
    return this.cache.size;
  }

  // ── Protected helpers ───────────────────────────────────────────────

  /**
   * Build a deterministic cache key from a query.
   */
  protected getCacheKey(query: DataQuery): string {
    const parts = [
      this.id,
      query.country.toLowerCase(),
      query.city?.toLowerCase() ?? "_",
      query.category,
      query.metric,
    ];
    return parts.join("|");
  }

  /**
   * Linear min-max normalization to a 0–100 scale.
   *
   * @param value — raw value to normalize
   * @param min — the minimum of the domain (maps to 0)
   * @param max — the maximum of the domain (maps to 100)
   * @returns normalized value clamped to [0, 100]
   */
  protected normalize(value: number, min: number, max: number): number {
    if (max === min) return 50; // avoid division by zero
    const ratio = (value - min) / (max - min);
    return Math.max(0, Math.min(100, ratio * 100));
  }
}
