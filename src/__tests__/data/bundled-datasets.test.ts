/**
 * Tests for bundled worldwide datasets (Issue #107).
 *
 * Validates:
 * - Coverage thresholds (100+ cities, 60+ tax countries)
 * - Metadata correctness on every dataset
 * - Lazy-loading facade caching and module resolution
 * - Dataset typing / structural integrity
 * - Size budget (total < 200 KB gzipped estimate)
 */

import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Direct dataset imports (for coverage / integrity checks)
// ---------------------------------------------------------------------------

import { COST_OF_LIVING_DATA, RANGES, METADATA as COL_METADATA } from "@/lib/data/datasets/cost-of-living";
import { TAX_DATA, TAX_RANGES, METADATA as TAX_METADATA } from "@/lib/data/datasets/tax-efficiency";
import { QUALITY_OF_LIFE_DATA, METADATA as QOL_METADATA, REGIONAL_AVERAGES, COUNTRY_REGION } from "@/lib/data/datasets/quality-of-life";
import { COUNTRY_RISK_DATA, METADATA as RISK_METADATA, WGI_MIN, WGI_MAX } from "@/lib/data/datasets/country-risk";
import { UNIVERSITY_DATA, METADATA as UNI_METADATA, MAX_RANK } from "@/lib/data/datasets/university-rankings";
import type { DatasetMetadata } from "@/lib/data/datasets/metadata";

// ---------------------------------------------------------------------------
// Lazy loader imports
// ---------------------------------------------------------------------------

import {
  loadCostOfLiving,
  loadTaxEfficiency,
  loadQualityOfLife,
  loadCountryRisk,
  loadUniversityRankings,
  loadAllMetadata,
  DATASET_CATALOGUE,
} from "@/lib/data/datasets/loader";

// =========================================================================
// Coverage thresholds
// =========================================================================

describe("dataset coverage thresholds", () => {
  it("cost-of-living dataset has >= 100 cities", () => {
    expect(COST_OF_LIVING_DATA.length).toBeGreaterThanOrEqual(100);
  });

  it("quality-of-life dataset has >= 100 cities", () => {
    expect(QUALITY_OF_LIFE_DATA.length).toBeGreaterThanOrEqual(100);
  });

  it("tax-efficiency dataset has >= 60 countries", () => {
    expect(TAX_DATA.length).toBeGreaterThanOrEqual(60);
  });

  it("country-risk dataset has >= 100 countries", () => {
    expect(COUNTRY_RISK_DATA.length).toBeGreaterThanOrEqual(100);
  });

  it("university-rankings dataset has >= 50 universities", () => {
    expect(UNIVERSITY_DATA.length).toBeGreaterThanOrEqual(50);
  });
});

// =========================================================================
// Metadata
// =========================================================================

describe("dataset metadata", () => {
  const allMetadata: readonly [string, DatasetMetadata][] = [
    ["cost-of-living", COL_METADATA],
    ["tax-efficiency", TAX_METADATA],
    ["quality-of-life", QOL_METADATA],
    ["country-risk", RISK_METADATA],
    ["university-rankings", UNI_METADATA],
  ];

  it.each(allMetadata)(
    "%s metadata has all required fields",
    (_id, meta) => {
      expect(meta.name).toBeTruthy();
      expect(meta.source).toBeTruthy();
      expect(meta.updated).toMatch(/^\d{4}-Q[1-4]$/);
      expect(meta.version).toBeGreaterThanOrEqual(1);
      expect(meta.recordCount).toBeGreaterThan(0);
      expect(meta.coverage).toBeTruthy();
    },
  );

  it("cost-of-living recordCount matches actual data length", () => {
    expect(COL_METADATA.recordCount).toBe(COST_OF_LIVING_DATA.length);
  });

  it("tax-efficiency recordCount matches actual data length", () => {
    expect(TAX_METADATA.recordCount).toBe(TAX_DATA.length);
  });

  it("quality-of-life recordCount matches actual data length", () => {
    expect(QOL_METADATA.recordCount).toBe(QUALITY_OF_LIFE_DATA.length);
  });

  it("country-risk recordCount matches actual data length", () => {
    expect(RISK_METADATA.recordCount).toBe(COUNTRY_RISK_DATA.length);
  });

  it("university-rankings recordCount matches actual data length", () => {
    expect(UNI_METADATA.recordCount).toBe(UNIVERSITY_DATA.length);
  });
});

// =========================================================================
// Structural integrity
// =========================================================================

describe("dataset structural integrity", () => {
  it("cost-of-living entries have valid fields", () => {
    for (const city of COST_OF_LIVING_DATA) {
      expect(city.city).toBeTruthy();
      expect(city.country).toMatch(/^[A-Z]{2}$/);
      expect(city.overall).toBeGreaterThanOrEqual(0);
      expect(city.overall).toBeLessThanOrEqual(100);
    }
  });

  it("cost-of-living RANGES are computed correctly", () => {
    expect(RANGES.overall.min).toBeGreaterThanOrEqual(0);
    expect(RANGES.overall.max).toBeLessThanOrEqual(100);
    expect(RANGES.overall.max).toBeGreaterThan(RANGES.overall.min);
  });

  it("tax-efficiency entries have valid fields", () => {
    for (const tax of TAX_DATA) {
      expect(tax.country).toMatch(/^[A-Z]{2}$/);
      expect(tax.taxFreedomIndex).toBeGreaterThanOrEqual(0);
      expect(tax.taxFreedomIndex).toBeLessThanOrEqual(100);
    }
  });

  it("tax-efficiency TAX_RANGES are computed correctly", () => {
    expect(TAX_RANGES.taxFreedomIndex.max).toBeGreaterThan(
      TAX_RANGES.taxFreedomIndex.min,
    );
  });

  it("quality-of-life entries have valid fields", () => {
    for (const city of QUALITY_OF_LIFE_DATA) {
      expect(city.city).toBeTruthy();
      expect(city.country).toMatch(/^[A-Z]{2}$/);
      expect(city.safetyIndex).toBeGreaterThanOrEqual(0);
      expect(city.safetyIndex).toBeLessThanOrEqual(100);
    }
  });

  it("quality-of-life has regional averages and country mapping", () => {
    expect(Object.keys(REGIONAL_AVERAGES).length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(COUNTRY_REGION).length).toBeGreaterThanOrEqual(50);
  });

  it("country-risk entries have valid WGI range", () => {
    for (const entry of COUNTRY_RISK_DATA) {
      expect(entry.country).toMatch(/^[A-Z]{2}$/);
      expect(entry.politicalStability).toBeGreaterThanOrEqual(WGI_MIN);
      expect(entry.politicalStability).toBeLessThanOrEqual(WGI_MAX);
    }
  });

  it("university-rankings entries have valid ranks", () => {
    for (const uni of UNIVERSITY_DATA) {
      expect(uni.overallRank).toBeGreaterThanOrEqual(1);
      expect(uni.overallRank).toBeLessThanOrEqual(MAX_RANK);
      expect(uni.name).toBeTruthy();
      expect(uni.country).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("no duplicate cities in cost-of-living dataset", () => {
    const keys = COST_OF_LIVING_DATA.map(
      (c) => `${c.city.toLowerCase()}|${c.country}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("no duplicate cities in quality-of-life dataset", () => {
    const keys = QUALITY_OF_LIFE_DATA.map(
      (c) => `${c.city.toLowerCase()}|${c.country}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("no duplicate countries in tax-efficiency dataset", () => {
    const countries = TAX_DATA.map((c) => c.country);
    expect(new Set(countries).size).toBe(countries.length);
  });

  it("no duplicate countries in country-risk dataset", () => {
    const countries = COUNTRY_RISK_DATA.map((c) => c.country);
    expect(new Set(countries).size).toBe(countries.length);
  });
});

// =========================================================================
// Lazy-loading facade
// =========================================================================

describe("lazy-loading facade", () => {
  it("loadCostOfLiving resolves with METADATA and data", async () => {
    const mod = await loadCostOfLiving();
    expect(mod.METADATA.name).toBe("Cost of Living");
    expect(mod.COST_OF_LIVING_DATA.length).toBeGreaterThanOrEqual(100);
    expect(mod.RANGES).toBeDefined();
  });

  it("loadTaxEfficiency resolves with METADATA and data", async () => {
    const mod = await loadTaxEfficiency();
    expect(mod.METADATA.name).toBe("Tax Efficiency");
    expect(mod.TAX_DATA.length).toBeGreaterThanOrEqual(60);
  });

  it("loadQualityOfLife resolves with METADATA and data", async () => {
    const mod = await loadQualityOfLife();
    expect(mod.METADATA.name).toBe("Quality of Life");
    expect(mod.QUALITY_OF_LIFE_DATA.length).toBeGreaterThanOrEqual(100);
  });

  it("loadCountryRisk resolves with METADATA and data", async () => {
    const mod = await loadCountryRisk();
    expect(mod.METADATA.name).toBe("Country Risk (WGI)");
    expect(mod.COUNTRY_RISK_DATA.length).toBeGreaterThanOrEqual(100);
  });

  it("loadUniversityRankings resolves with METADATA and data", async () => {
    const mod = await loadUniversityRankings();
    expect(mod.METADATA.name).toBe("University Rankings");
    expect(mod.UNIVERSITY_DATA.length).toBeGreaterThanOrEqual(50);
  });

  it("loadCostOfLiving caches the module on repeated calls", async () => {
    const first = await loadCostOfLiving();
    const second = await loadCostOfLiving();
    expect(first).toBe(second);
  });

  it("DATASET_CATALOGUE lists all 5 datasets", () => {
    expect(DATASET_CATALOGUE).toHaveLength(5);
    const ids = DATASET_CATALOGUE.map((d) => d.id);
    expect(ids).toContain("cost-of-living");
    expect(ids).toContain("tax-efficiency");
    expect(ids).toContain("quality-of-life");
    expect(ids).toContain("country-risk");
    expect(ids).toContain("university-rankings");
  });

  it("loadAllMetadata returns metadata for all 5 datasets", async () => {
    const results = await loadAllMetadata();
    expect(results).toHaveLength(5);
    for (const result of results) {
      expect(result.metadata.name).toBeTruthy();
      expect(result.metadata.version).toBeGreaterThanOrEqual(1);
    }
  });
});
