/**
 * Cost-of-living data provider.
 *
 * Tier 1 — Numbeo API (requires `NEXT_PUBLIC_NUMBEO_API_KEY` env var)
 * Tier 2 — Bundled dataset (~100 cities)
 * Tier 3 — Regional estimation via World Bank income-group multipliers
 *
 * @module data/providers/cost-of-living
 */

import { DataProvider } from "../provider";
import type { DataPoint, DataQuery } from "../provider";
import {
  COST_OF_LIVING_DATA,
  COUNTRY_INCOME_GROUP,
  INCOME_GROUP_MULTIPLIERS,
  RANGES,
} from "../datasets/cost-of-living";
import type { CityData } from "../datasets/cost-of-living";

// ---------------------------------------------------------------------------
// Metric → CityData field mapping
// ---------------------------------------------------------------------------

type MetricKey = keyof typeof RANGES;

const METRIC_TO_FIELD: Readonly<Record<string, MetricKey>> = {
  "rent-1br-center": "rent1brCenter",
  "rent-1br-outside": "rent1brOutside",
  "groceries-index": "groceriesIndex",
  "restaurant-meal": "restaurantMeal",
  "transport-monthly": "transportMonthly",
  "utilities-monthly": "utilitiesMonthly",
  "internet-monthly": "internetMonthly",
  "overall-index": "overall",
};

const METRIC_UNITS: Readonly<Record<string, string>> = {
  "rent-1br-center": "USD/month",
  "rent-1br-outside": "USD/month",
  "groceries-index": "index",
  "restaurant-meal": "USD",
  "transport-monthly": "USD/month",
  "utilities-monthly": "USD/month",
  "internet-monthly": "USD/month",
  "overall-index": "index",
};

const SUPPORTED_METRICS = Object.keys(METRIC_TO_FIELD);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class CostOfLivingProvider extends DataProvider {
  readonly id = "cost-of-living";
  readonly name = "Cost of Living";
  readonly categories = ["cost-of-living"] as const;

  supports(query: DataQuery): boolean {
    return (
      query.category === "cost-of-living" &&
      SUPPORTED_METRICS.includes(query.metric)
    );
  }

  protected async fetchData(query: DataQuery): Promise<DataPoint | null> {
    // Tier 2 — bundled data
    const bundled = this.lookupBundled(query);
    if (bundled) return bundled;

    // Tier 3 — estimation
    return this.estimate(query);
  }

  // ── Tier 2 — bundled lookup ─────────────────────────────────────

  private lookupBundled(query: DataQuery): DataPoint | null {
    const city = this.findCity(query);
    if (!city) return null;

    const field = METRIC_TO_FIELD[query.metric];
    if (field === undefined) return null;

    const rawValue = city[field];
    const range = RANGES[field];

    return {
      value: this.normalize(rawValue, range.min, range.max),
      rawValue,
      unit: METRIC_UNITS[query.metric] ?? "USD",
      source: this.name,
      confidence: 0.85,
      tier: 2,
      updatedAt: "2025-01-01T00:00:00Z",
    };
  }

  private findCity(query: DataQuery): CityData | undefined {
    const qCountry = query.country.toUpperCase();
    const qCity = query.city?.toLowerCase();

    return COST_OF_LIVING_DATA.find((c) => {
      if (c.country.toUpperCase() !== qCountry) return false;
      if (qCity && c.city.toLowerCase() !== qCity) return false;
      // If no city specified, match first entry for the country
      return true;
    });
  }

  // ── Tier 3 — estimation ─────────────────────────────────────────

  private estimate(query: DataQuery): DataPoint | null {
    const group = COUNTRY_INCOME_GROUP[query.country.toUpperCase()];
    if (!group) return null;

    const multiplier = INCOME_GROUP_MULTIPLIERS[group];
    if (multiplier === undefined) return null;

    const field = METRIC_TO_FIELD[query.metric];
    if (field === undefined) return null;

    const range = RANGES[field];
    const median = (range.min + range.max) / 2;
    const rawValue = Math.round(median * multiplier);

    return {
      value: this.normalize(rawValue, range.min, range.max),
      rawValue,
      unit: METRIC_UNITS[query.metric] ?? "USD",
      source: `${this.name} (estimated)`,
      confidence: 0.4,
      tier: 3,
      updatedAt: "2025-01-01T00:00:00Z",
    };
  }
}
