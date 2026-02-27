/**
 * Tax-efficiency data provider.
 *
 * Tier 2 — Bundled dataset (OECD + major economies)
 * Tier 3 — Regional estimation via World Bank income-group defaults
 *
 * Tax rates are "cost" criteria — lower tax is better for the user.
 * For rate metrics, normalization is **inverted**: 100 = 0% tax, 0 = max tax.
 * For `tax-freedom-index`, no inversion is needed (already higher = better).
 *
 * @module data/providers/tax-efficiency
 */

import { DataProvider } from "../provider";
import type { DataPoint, DataQuery } from "../provider";
import {
  TAX_DATA,
  TAX_GROUP_DEFAULTS,
  TAX_RANGES,
} from "../datasets/tax-efficiency";
import type { CountryTaxData } from "../datasets/tax-efficiency";
import { COUNTRY_INCOME_GROUP } from "../datasets/cost-of-living";

// ---------------------------------------------------------------------------
// Metric mapping
// ---------------------------------------------------------------------------

type MetricKey = keyof typeof TAX_RANGES;

const METRIC_TO_FIELD: Readonly<Record<string, MetricKey>> = {
  "income-tax-rate": "incomeTaxRate",
  "corporate-tax-rate": "corporateTaxRate",
  "sales-tax-rate": "salesTaxRate",
  "social-security-rate": "socialSecurityRate",
  "tax-freedom-index": "taxFreedomIndex",
};

const METRIC_UNITS: Readonly<Record<string, string>> = {
  "income-tax-rate": "%",
  "corporate-tax-rate": "%",
  "sales-tax-rate": "%",
  "social-security-rate": "%",
  "tax-freedom-index": "index",
};

/** Metrics where lower raw value = higher score (inverted normalization) */
const INVERTED_METRICS = new Set<string>([
  "income-tax-rate",
  "corporate-tax-rate",
  "sales-tax-rate",
  "social-security-rate",
]);

const SUPPORTED_METRICS = Object.keys(METRIC_TO_FIELD);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class TaxEfficiencyProvider extends DataProvider {
  readonly id = "tax-efficiency";
  readonly name = "Tax Efficiency";
  readonly categories = ["tax"] as const;

  supports(query: DataQuery): boolean {
    return (
      query.category === "tax" && SUPPORTED_METRICS.includes(query.metric)
    );
  }

  protected async fetchData(query: DataQuery): Promise<DataPoint | null> {
    // Tier 2 — bundled data
    const bundled = this.lookupBundled(query);
    if (bundled) return bundled;

    // Tier 3 — estimation
    return this.estimate(query);
  }

  // ── Tier 2 ──────────────────────────────────────────────────────

  private lookupBundled(query: DataQuery): DataPoint | null {
    const entry = this.findCountry(query);
    if (!entry) return null;

    return this.buildPoint(entry, query.metric, 2, 0.85, this.name);
  }

  private findCountry(query: DataQuery): CountryTaxData | undefined {
    const code = query.country.toUpperCase();
    return TAX_DATA.find((c) => c.country === code);
  }

  // ── Tier 3 ──────────────────────────────────────────────────────

  private estimate(query: DataQuery): DataPoint | null {
    const group = COUNTRY_INCOME_GROUP[query.country.toUpperCase()];
    if (!group) return null;

    const defaults = TAX_GROUP_DEFAULTS[group];
    if (!defaults) return null;

    const entry: CountryTaxData = {
      country: query.country.toUpperCase(),
      ...defaults,
    };

    return this.buildPoint(
      entry,
      query.metric,
      3,
      0.35,
      `${this.name} (estimated)`,
    );
  }

  // ── Shared builder ──────────────────────────────────────────────

  private buildPoint(
    entry: CountryTaxData,
    metric: string,
    tier: 1 | 2 | 3,
    confidence: number,
    source: string,
  ): DataPoint | null {
    const field = METRIC_TO_FIELD[metric];
    if (field === undefined) return null;

    const rawValue = entry[field];
    const range = TAX_RANGES[field];
    const inverted = INVERTED_METRICS.has(metric);

    // For inverted metrics: 100 means lowest tax (best), 0 means highest
    const normalized = inverted
      ? 100 - this.normalize(rawValue, range.min, range.max)
      : this.normalize(rawValue, range.min, range.max);

    return {
      value: normalized,
      rawValue,
      unit: METRIC_UNITS[metric] ?? "%",
      source,
      confidence,
      tier,
      updatedAt: "2025-01-01T00:00:00Z",
    };
  }
}
