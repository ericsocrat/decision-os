/**
 * Country-risk data provider — World Bank Governance Indicators.
 *
 * Tier 2 — Bundled WGI data for 120 countries
 * (Tier 3 not needed — WGI covers nearly all countries)
 *
 * WGI scores range from -2.5 (worst) to +2.5 (best).
 * Normalised to 0–100 (higher = better governance).
 *
 * @module data/providers/country-risk
 */

import { DataProvider } from "../provider";
import type { DataPoint, DataQuery } from "../provider";
import {
  COUNTRY_RISK_DATA,
  WGI_MIN,
  WGI_MAX,
} from "../datasets/country-risk";
import type { CountryRiskData } from "../datasets/country-risk";

// ---------------------------------------------------------------------------
// Metric → field mapping
// ---------------------------------------------------------------------------

const METRIC_TO_FIELD: Readonly<Record<string, keyof CountryRiskData>> = {
  "political-stability": "politicalStability",
  "rule-of-law": "ruleOfLaw",
  "corruption-control": "corruptionControl",
  "government-effectiveness": "governmentEffectiveness",
  "regulatory-quality": "regulatoryQuality",
  "voice-accountability": "voiceAccountability",
};

const SUPPORTED_METRICS: readonly string[] = [
  ...Object.keys(METRIC_TO_FIELD),
  "composite-governance",
];

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class CountryRiskProvider extends DataProvider {
  readonly id = "country-risk";
  readonly name = "Country Risk (WGI)";
  readonly categories = ["safety"] as const;

  supports(query: DataQuery): boolean {
    return (
      query.category === "safety" && SUPPORTED_METRICS.includes(query.metric)
    );
  }

  protected async fetchData(query: DataQuery): Promise<DataPoint | null> {
    return this.lookupBundled(query);
  }

  // ── Tier 2 — bundled WGI lookup ────────────────────────────────

  private lookupBundled(query: DataQuery): DataPoint | null {
    const entry = this.findCountry(query.country);
    if (!entry) return null;

    // Composite governance — average of all 6 indicators
    if (query.metric === "composite-governance") {
      return this.buildComposite(entry);
    }

    // Individual indicator
    const field = METRIC_TO_FIELD[query.metric];
    if (field === undefined) return null;

    const rawValue = entry[field] as number;
    return {
      value: this.normalize(rawValue, WGI_MIN, WGI_MAX),
      rawValue,
      unit: "WGI score",
      source: this.name,
      confidence: 0.9,
      tier: 2,
      updatedAt: "2025-01-01T00:00:00Z",
    };
  }

  private buildComposite(entry: CountryRiskData): DataPoint {
    const values = [
      entry.politicalStability,
      entry.ruleOfLaw,
      entry.corruptionControl,
      entry.governmentEffectiveness,
      entry.regulatoryQuality,
      entry.voiceAccountability,
    ];
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const rounded = Math.round(avg * 100) / 100;

    return {
      value: this.normalize(rounded, WGI_MIN, WGI_MAX),
      rawValue: rounded,
      unit: "WGI score",
      source: this.name,
      confidence: 0.9,
      tier: 2,
      updatedAt: "2025-01-01T00:00:00Z",
    };
  }

  private findCountry(country: string): CountryRiskData | undefined {
    const upper = country.toUpperCase();
    return COUNTRY_RISK_DATA.find(
      (c) => c.country.toUpperCase() === upper,
    );
  }
}
