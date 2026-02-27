/**
 * Lazy-loading facade for bundled datasets.
 *
 * Datasets are loaded via dynamic `import()` so they are code-split
 * and excluded from the initial page bundle. Each loader returns the
 * full dataset module; results are cached after the first call.
 *
 * @module data/datasets/loader
 */

import type { DatasetMetadata } from "./metadata";
import type { CityData } from "./cost-of-living";
import type { CountryTaxData } from "./tax-efficiency";
import type { QualityOfLifeData } from "./quality-of-life";
import type { CountryRiskData } from "./country-risk";
import type { UniversityData } from "./university-rankings";

// ---------------------------------------------------------------------------
// Dataset module types (mirrors the public API of each dataset)
// ---------------------------------------------------------------------------

export interface CostOfLivingModule {
  readonly COST_OF_LIVING_DATA: readonly CityData[];
  readonly COUNTRY_INCOME_GROUP: Readonly<Record<string, string>>;
  readonly INCOME_GROUP_MULTIPLIERS: Readonly<Record<string, number>>;
  readonly RANGES: Readonly<
    Record<string, Readonly<{ min: number; max: number }>>
  >;
  readonly METADATA: DatasetMetadata;
}

export interface TaxEfficiencyModule {
  readonly TAX_DATA: readonly CountryTaxData[];
  readonly TAX_GROUP_DEFAULTS: Readonly<
    Record<string, Omit<CountryTaxData, "country">>
  >;
  readonly TAX_RANGES: Readonly<
    Record<string, Readonly<{ min: number; max: number }>>
  >;
  readonly METADATA: DatasetMetadata;
}

export interface QualityOfLifeModule {
  readonly QUALITY_OF_LIFE_DATA: readonly QualityOfLifeData[];
  readonly REGIONAL_AVERAGES: Readonly<Record<string, unknown>>;
  readonly COUNTRY_REGION: Readonly<Record<string, string>>;
  readonly METADATA: DatasetMetadata;
}

export interface CountryRiskModule {
  readonly COUNTRY_RISK_DATA: readonly CountryRiskData[];
  readonly WGI_MIN: number;
  readonly WGI_MAX: number;
  readonly METADATA: DatasetMetadata;
}

export interface UniversityRankingsModule {
  readonly UNIVERSITY_DATA: readonly UniversityData[];
  readonly MAX_RANK: number;
  readonly METADATA: DatasetMetadata;
  getUniversitiesInCity(
    city: string,
    country: string,
  ): readonly UniversityData[];
  getUniversitiesInCountry(country: string): readonly UniversityData[];
}

// ---------------------------------------------------------------------------
// Lazy loaders (dynamic import + cache)
// ---------------------------------------------------------------------------

let colCache: CostOfLivingModule | undefined;
let taxCache: TaxEfficiencyModule | undefined;
let qolCache: QualityOfLifeModule | undefined;
let riskCache: CountryRiskModule | undefined;
let uniCache: UniversityRankingsModule | undefined;

/**
 * Lazily load the cost-of-living dataset.
 * The module is code-split and cached after the first call.
 */
export async function loadCostOfLiving(): Promise<CostOfLivingModule> {
  if (colCache) return colCache;
  const mod = await import("./cost-of-living");
  colCache = mod;
  return mod;
}

/**
 * Lazily load the tax-efficiency dataset.
 */
export async function loadTaxEfficiency(): Promise<TaxEfficiencyModule> {
  if (taxCache) return taxCache;
  const mod = await import("./tax-efficiency");
  taxCache = mod;
  return mod;
}

/**
 * Lazily load the quality-of-life dataset.
 */
export async function loadQualityOfLife(): Promise<QualityOfLifeModule> {
  if (qolCache) return qolCache;
  const mod = await import("./quality-of-life");
  qolCache = mod;
  return mod;
}

/**
 * Lazily load the country-risk (WGI) dataset.
 */
export async function loadCountryRisk(): Promise<CountryRiskModule> {
  if (riskCache) return riskCache;
  const mod = await import("./country-risk");
  riskCache = mod;
  return mod;
}

/**
 * Lazily load the university-rankings dataset.
 */
export async function loadUniversityRankings(): Promise<UniversityRankingsModule> {
  if (uniCache) return uniCache;
  const mod = await import("./university-rankings");
  uniCache = mod;
  return mod;
}

// ---------------------------------------------------------------------------
// Metadata-only helpers (lightweight — avoids loading full dataset)
// ---------------------------------------------------------------------------

/**
 * Catalogue of all available datasets with their loaders.
 * Metadata is loaded lazily alongside the dataset.
 */
export const DATASET_CATALOGUE = [
  { id: "cost-of-living", load: loadCostOfLiving },
  { id: "tax-efficiency", load: loadTaxEfficiency },
  { id: "quality-of-life", load: loadQualityOfLife },
  { id: "country-risk", load: loadCountryRisk },
  { id: "university-rankings", load: loadUniversityRankings },
] as const;

/**
 * Load all dataset metadata (triggers all lazy loads).
 */
export async function loadAllMetadata(): Promise<
  readonly { id: string; metadata: DatasetMetadata }[]
> {
  const results = await Promise.all(
    DATASET_CATALOGUE.map(async (entry) => {
      const mod = await entry.load();
      return { id: entry.id, metadata: (mod as { METADATA: DatasetMetadata }).METADATA };
    }),
  );
  return results;
}
