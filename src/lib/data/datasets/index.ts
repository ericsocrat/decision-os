/**
 * Dataset barrel — re-exports metadata type + lazy loader.
 *
 * Individual dataset modules should be imported directly (or via
 * the lazy loader) to keep the initial bundle small.
 *
 * @module data/datasets
 */

export type { DatasetMetadata } from "./metadata";
export {
  loadCostOfLiving,
  loadTaxEfficiency,
  loadQualityOfLife,
  loadCountryRisk,
  loadUniversityRankings,
  loadAllMetadata,
  DATASET_CATALOGUE,
} from "./loader";
export type {
  CostOfLivingModule,
  TaxEfficiencyModule,
  QualityOfLifeModule,
  CountryRiskModule,
  UniversityRankingsModule,
} from "./loader";
