/**
 * Quality-of-life data provider — safety, healthcare, climate, environment.
 *
 * Tier 2 — Bundled data for ~90 cities
 * Tier 3 — Regional estimation via COUNTRY_REGION → REGIONAL_AVERAGES
 *
 * All metrics normalised to 0–100 (higher = better).
 * Pollution index is inverted: low pollution → high score.
 *
 * @module data/providers/quality-of-life
 */

import { DataProvider } from "../provider";
import type { DataPoint, DataQuery } from "../provider";
import {
  QUALITY_OF_LIFE_DATA,
  COUNTRY_REGION,
  REGIONAL_AVERAGES,
} from "../datasets/quality-of-life";
import type { QualityOfLifeData } from "../datasets/quality-of-life";

// ---------------------------------------------------------------------------
// Metric → field mapping
// ---------------------------------------------------------------------------

type QoLField = keyof Omit<QualityOfLifeData, "city" | "country">;

const METRIC_TO_FIELD: Readonly<Record<string, QoLField>> = {
  "safety-index": "safetyIndex",
  "healthcare-index": "healthcareIndex",
  "climate-comfort": "climateComfort",
  "pollution-index": "pollutionIndex",
  "infrastructure-quality": "infrastructureQuality",
  "green-space-access": "greenSpaceAccess",
};

const INVERTED_METRICS: ReadonlySet<string> = new Set(["pollution-index"]);

const METRIC_UNITS: Readonly<Record<string, string>> = {
  "safety-index": "index",
  "healthcare-index": "index",
  "climate-comfort": "index",
  "pollution-index": "index",
  "infrastructure-quality": "index",
  "green-space-access": "index",
};

const SUPPORTED_METRICS = Object.keys(METRIC_TO_FIELD);

// Category mapping: provider registers under multiple categories
const SUPPORTED_CATEGORIES: ReadonlySet<string> = new Set([
  "safety",
  "healthcare",
  "climate",
  "environment",
  "infrastructure",
]);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class QualityOfLifeProvider extends DataProvider {
  readonly id = "quality-of-life";
  readonly name = "Quality of Life";
  readonly categories = [
    "safety",
    "healthcare",
    "climate",
    "environment",
    "infrastructure",
  ] as const;

  supports(query: DataQuery): boolean {
    return (
      SUPPORTED_CATEGORIES.has(query.category) &&
      SUPPORTED_METRICS.includes(query.metric)
    );
  }

  protected async fetchData(query: DataQuery): Promise<DataPoint | null> {
    // Tier 2 — bundled city data
    const bundled = this.lookupBundled(query);
    if (bundled) return bundled;

    // Tier 3 — regional estimation
    return this.estimate(query);
  }

  // ── Tier 2 — bundled lookup ─────────────────────────────────────

  private lookupBundled(query: DataQuery): DataPoint | null {
    const entry = this.findCity(query);
    if (!entry) return null;

    return this.buildPoint(entry, query.metric, 0.85, 2);
  }

  private findCity(query: DataQuery): QualityOfLifeData | undefined {
    const qCountry = query.country.toUpperCase();
    const qCity = query.city?.toLowerCase();

    return QUALITY_OF_LIFE_DATA.find((c) => {
      if (c.country.toUpperCase() !== qCountry) return false;
      if (qCity && c.city.toLowerCase() !== qCity) return false;
      return true;
    });
  }

  // ── Tier 3 — regional estimation ───────────────────────────────

  private estimate(query: DataQuery): DataPoint | null {
    const region = COUNTRY_REGION[query.country.toUpperCase()];
    if (!region) return null;

    const avg = REGIONAL_AVERAGES[region];
    if (!avg) return null;

    const field = METRIC_TO_FIELD[query.metric];
    if (field === undefined) return null;

    const rawValue = avg[field];
    const value = INVERTED_METRICS.has(query.metric)
      ? this.normalize(100 - rawValue, 0, 100)
      : this.normalize(rawValue, 0, 100);

    return {
      value,
      rawValue,
      unit: METRIC_UNITS[query.metric] ?? "index",
      source: `${this.name} (regional estimate)`,
      confidence: 0.4,
      tier: 3,
      updatedAt: "2025-01-01T00:00:00Z",
    };
  }

  // ── Shared point builder ────────────────────────────────────────

  private buildPoint(
    entry: QualityOfLifeData,
    metric: string,
    confidence: number,
    tier: 2 | 3,
  ): DataPoint | null {
    const field = METRIC_TO_FIELD[metric];
    if (field === undefined) return null;

    const rawValue = entry[field];

    // Invert pollution: less pollution → higher score
    const value = INVERTED_METRICS.has(metric)
      ? this.normalize(100 - rawValue, 0, 100)
      : this.normalize(rawValue, 0, 100);

    return {
      value,
      rawValue,
      unit: METRIC_UNITS[metric] ?? "index",
      source: this.name,
      confidence,
      tier,
      updatedAt: "2025-01-01T00:00:00Z",
    };
  }
}
