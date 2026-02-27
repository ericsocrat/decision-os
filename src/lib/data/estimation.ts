/**
 * Tier 3 estimation engine — provides data for locations not in bundled datasets.
 *
 * Three estimation strategies:
 * 1. **Income-group proxy** — World Bank income group medians
 * 2. **Regional proxy** — geographic region medians
 * 3. **Composite** — weighted average of all available strategies
 *
 * Estimation confidence never exceeds 0.5.
 *
 * @module data/estimation
 */

import type { DataPoint } from "./provider";
import { COUNTRY_INCOME_GROUP } from "./datasets/cost-of-living";
import { COUNTRY_REGION, REGIONAL_AVERAGES } from "./datasets/quality-of-life";
import type { RegionalAverage } from "./datasets/quality-of-life";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single estimation result from one strategy */
export interface EstimationResult {
  value: number;
  confidence: number;
  strategy: "income-group" | "regional" | "composite";
}

/** Metric descriptor for the estimation engine */
export interface MetricDescriptor {
  /** Min value in the domain */
  min: number;
  /** Max value in the domain */
  max: number;
  /** Whether lower raw values = better (e.g. pollution, tax rate) */
  inverted?: boolean;
}

// ---------------------------------------------------------------------------
// Income-group medians (0–100 normalised scores by category/metric)
// These provide a rough baseline for countries not in any bundled dataset.
// ---------------------------------------------------------------------------

interface IncomeGroupMedians {
  safety: number;
  healthcare: number;
  climate: number;
  infrastructure: number;
  costOfLiving: number;
  university: number;
}

const INCOME_GROUP_MEDIANS: Readonly<Record<string, IncomeGroupMedians>> = {
  HIC: { safety: 68, healthcare: 78, climate: 55, infrastructure: 78, costOfLiving: 70, university: 65 },
  UMC: { safety: 50, healthcare: 55, climate: 55, infrastructure: 52, costOfLiving: 42, university: 35 },
  LMC: { safety: 40, healthcare: 38, climate: 50, infrastructure: 35, costOfLiving: 28, university: 18 },
  LIC: { safety: 32, healthcare: 25, climate: 52, infrastructure: 22, costOfLiving: 18, university: 8 },
};

// ---------------------------------------------------------------------------
// Regional-metric mapping (maps generic category → QoL field)
// ---------------------------------------------------------------------------

const CATEGORY_TO_QOL_FIELD: Readonly<Record<string, keyof RegionalAverage>> = {
  safety: "safetyIndex",
  healthcare: "healthcareIndex",
  climate: "climateComfort",
  infrastructure: "infrastructureQuality",
  environment: "pollutionIndex",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Estimate a normalised score (0–100) for a country using income-group data.
 * Returns null if the country has no known income group.
 */
export function estimateFromIncomeGroup(
  country: string,
  category: string,
): EstimationResult | null {
  const group = COUNTRY_INCOME_GROUP[country.toUpperCase()];
  if (!group) return null;

  const medians = INCOME_GROUP_MEDIANS[group];
  if (!medians) return null;

  const value = pickIncomeGroupValue(medians, category);
  if (value === null) return null;

  return { value, confidence: 0.3, strategy: "income-group" };
}

/**
 * Estimate a normalised score (0–100) for a country using regional averages.
 * Returns null if the country has no known region.
 */
export function estimateFromRegion(
  country: string,
  category: string,
): EstimationResult | null {
  const region = COUNTRY_REGION[country.toUpperCase()];
  if (!region) return null;

  const regionData = REGIONAL_AVERAGES[region];
  if (!regionData) return null;

  const field = CATEGORY_TO_QOL_FIELD[category];
  if (field !== undefined) {
    return { value: regionData[field], confidence: 0.4, strategy: "regional" };
  }

  // For categories not directly in QoL data, return null
  return null;
}

/**
 * Best estimate combining all available strategies.
 *
 * Uses a weighted average when multiple strategies produce results:
 * - Regional: weight 0.6 (more specific)
 * - Income-group: weight 0.4 (broader but always available)
 *
 * Falls back to whichever single strategy is available.
 * Confidence is capped at 0.5.
 */
export function bestEstimate(
  country: string,
  category: string,
): EstimationResult | null {
  const incomeResult = estimateFromIncomeGroup(country, category);
  const regionResult = estimateFromRegion(country, category);

  if (incomeResult && regionResult) {
    return compositeEstimate(incomeResult, regionResult);
  }

  if (regionResult) return regionResult;
  if (incomeResult) return incomeResult;

  return null;
}

/**
 * Build a DataPoint from an estimation result.
 */
export function estimationToDataPoint(
  result: EstimationResult,
  source: string,
  unit: string,
): DataPoint {
  return {
    value: Math.round(result.value * 100) / 100,
    rawValue: Math.round(result.value * 100) / 100,
    unit,
    source: `${source} (${result.strategy} estimate)`,
    confidence: result.confidence,
    tier: 3,
    updatedAt: "2025-01-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function compositeEstimate(
  income: EstimationResult,
  regional: EstimationResult,
): EstimationResult {
  const regionalWeight = 0.6;
  const incomeWeight = 0.4;
  const value =
    regional.value * regionalWeight + income.value * incomeWeight;
  const confidence = Math.min(
    regional.confidence * regionalWeight + income.confidence * incomeWeight + 0.05,
    0.5,
  );

  return {
    value: Math.round(value * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    strategy: "composite",
  };
}

function pickIncomeGroupValue(
  medians: IncomeGroupMedians,
  category: string,
): number | null {
  switch (category) {
    case "safety":
      return medians.safety;
    case "healthcare":
      return medians.healthcare;
    case "climate":
      return medians.climate;
    case "infrastructure":
      return medians.infrastructure;
    case "cost-of-living":
      return medians.costOfLiving;
    case "university":
      return medians.university;
    default:
      return null;
  }
}
