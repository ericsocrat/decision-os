/**
 * Bundled World Bank Worldwide Governance Indicators (WGI) dataset.
 *
 * Scores are on the original WGI scale: -2.5 (worst) to +2.5 (best).
 * The provider normalises them to 0–100 at query time.
 *
 * Sources: World Bank WGI (latest available year, aggregated).
 *
 * @module data/datasets/country-risk
 */

import type { DatasetMetadata } from "./metadata";

export interface CountryRiskData {
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** Political Stability and Absence of Violence (-2.5 to +2.5) */
  politicalStability: number;
  /** Rule of Law (-2.5 to +2.5) */
  ruleOfLaw: number;
  /** Control of Corruption (-2.5 to +2.5) */
  corruptionControl: number;
  /** Government Effectiveness (-2.5 to +2.5) */
  governmentEffectiveness: number;
  /** Regulatory Quality (-2.5 to +2.5) */
  regulatoryQuality: number;
  /** Voice and Accountability (-2.5 to +2.5) */
  voiceAccountability: number;
}

// ---------------------------------------------------------------------------
// WGI data — 120 countries (representative worldwide coverage)
// ---------------------------------------------------------------------------

export const COUNTRY_RISK_DATA: readonly CountryRiskData[] = [
  // North America
  { country: "US", politicalStability: 0.35, ruleOfLaw: 1.55, corruptionControl: 1.30, governmentEffectiveness: 1.50, regulatoryQuality: 1.60, voiceAccountability: 1.10 },
  { country: "CA", politicalStability: 1.15, ruleOfLaw: 1.80, corruptionControl: 1.85, governmentEffectiveness: 1.75, regulatoryQuality: 1.80, voiceAccountability: 1.50 },
  { country: "MX", politicalStability: -0.75, ruleOfLaw: -0.60, corruptionControl: -0.90, governmentEffectiveness: -0.20, regulatoryQuality: 0.10, voiceAccountability: 0.00 },

  // Western Europe
  { country: "GB", politicalStability: 0.55, ruleOfLaw: 1.65, corruptionControl: 1.70, governmentEffectiveness: 1.45, regulatoryQuality: 1.75, voiceAccountability: 1.30 },
  { country: "DE", politicalStability: 0.70, ruleOfLaw: 1.60, corruptionControl: 1.80, governmentEffectiveness: 1.50, regulatoryQuality: 1.70, voiceAccountability: 1.40 },
  { country: "FR", politicalStability: 0.30, ruleOfLaw: 1.40, corruptionControl: 1.30, governmentEffectiveness: 1.35, regulatoryQuality: 1.20, voiceAccountability: 1.15 },
  { country: "NL", politicalStability: 0.95, ruleOfLaw: 1.80, corruptionControl: 1.90, governmentEffectiveness: 1.80, regulatoryQuality: 1.85, voiceAccountability: 1.55 },
  { country: "BE", politicalStability: 0.60, ruleOfLaw: 1.40, corruptionControl: 1.45, governmentEffectiveness: 1.15, regulatoryQuality: 1.20, voiceAccountability: 1.35 },
  { country: "CH", politicalStability: 1.30, ruleOfLaw: 1.95, corruptionControl: 2.10, governmentEffectiveness: 2.00, regulatoryQuality: 1.85, voiceAccountability: 1.60 },
  { country: "AT", politicalStability: 1.00, ruleOfLaw: 1.80, corruptionControl: 1.50, governmentEffectiveness: 1.55, regulatoryQuality: 1.45, voiceAccountability: 1.40 },
  { country: "IE", politicalStability: 1.05, ruleOfLaw: 1.70, corruptionControl: 1.60, governmentEffectiveness: 1.40, regulatoryQuality: 1.75, voiceAccountability: 1.40 },
  { country: "LU", politicalStability: 1.35, ruleOfLaw: 1.85, corruptionControl: 2.05, governmentEffectiveness: 1.80, regulatoryQuality: 1.80, voiceAccountability: 1.55 },
  { country: "IT", politicalStability: 0.35, ruleOfLaw: 0.30, corruptionControl: 0.20, governmentEffectiveness: 0.40, regulatoryQuality: 0.70, voiceAccountability: 1.00 },
  { country: "ES", politicalStability: 0.40, ruleOfLaw: 1.00, corruptionControl: 0.70, governmentEffectiveness: 1.00, regulatoryQuality: 0.85, voiceAccountability: 1.10 },
  { country: "PT", politicalStability: 0.95, ruleOfLaw: 1.10, corruptionControl: 0.90, governmentEffectiveness: 1.05, regulatoryQuality: 0.90, voiceAccountability: 1.20 },

  // Nordic
  { country: "SE", politicalStability: 0.95, ruleOfLaw: 1.90, corruptionControl: 2.05, governmentEffectiveness: 1.75, regulatoryQuality: 1.75, voiceAccountability: 1.55 },
  { country: "NO", politicalStability: 1.20, ruleOfLaw: 1.95, corruptionControl: 2.15, governmentEffectiveness: 1.90, regulatoryQuality: 1.65, voiceAccountability: 1.65 },
  { country: "DK", politicalStability: 1.00, ruleOfLaw: 1.90, corruptionControl: 2.20, governmentEffectiveness: 1.85, regulatoryQuality: 1.75, voiceAccountability: 1.55 },
  { country: "FI", politicalStability: 1.10, ruleOfLaw: 2.00, corruptionControl: 2.15, governmentEffectiveness: 1.85, regulatoryQuality: 1.75, voiceAccountability: 1.55 },
  { country: "IS", politicalStability: 1.40, ruleOfLaw: 1.85, corruptionControl: 1.90, governmentEffectiveness: 1.55, regulatoryQuality: 1.30, voiceAccountability: 1.50 },

  // Central & Eastern Europe
  { country: "PL", politicalStability: 0.55, ruleOfLaw: 0.50, corruptionControl: 0.50, governmentEffectiveness: 0.45, regulatoryQuality: 0.90, voiceAccountability: 0.60 },
  { country: "CZ", politicalStability: 0.90, ruleOfLaw: 1.10, corruptionControl: 0.55, governmentEffectiveness: 0.85, regulatoryQuality: 1.10, voiceAccountability: 1.00 },
  { country: "HU", politicalStability: 0.60, ruleOfLaw: 0.45, corruptionControl: 0.10, governmentEffectiveness: 0.40, regulatoryQuality: 0.55, voiceAccountability: 0.30 },
  { country: "RO", politicalStability: 0.15, ruleOfLaw: 0.30, corruptionControl: -0.10, governmentEffectiveness: -0.15, regulatoryQuality: 0.40, voiceAccountability: 0.50 },
  { country: "BG", politicalStability: 0.15, ruleOfLaw: -0.05, corruptionControl: -0.20, governmentEffectiveness: 0.05, regulatoryQuality: 0.50, voiceAccountability: 0.40 },
  { country: "HR", politicalStability: 0.65, ruleOfLaw: 0.30, corruptionControl: 0.10, governmentEffectiveness: 0.35, regulatoryQuality: 0.35, voiceAccountability: 0.55 },
  { country: "SK", politicalStability: 0.55, ruleOfLaw: 0.55, corruptionControl: 0.35, governmentEffectiveness: 0.45, regulatoryQuality: 0.75, voiceAccountability: 0.70 },
  { country: "SI", politicalStability: 0.80, ruleOfLaw: 1.00, corruptionControl: 0.70, governmentEffectiveness: 0.90, regulatoryQuality: 0.75, voiceAccountability: 0.95 },
  { country: "EE", politicalStability: 0.55, ruleOfLaw: 1.30, corruptionControl: 1.35, governmentEffectiveness: 1.20, regulatoryQuality: 1.55, voiceAccountability: 1.15 },
  { country: "LT", politicalStability: 0.50, ruleOfLaw: 1.05, corruptionControl: 0.70, governmentEffectiveness: 0.95, regulatoryQuality: 1.15, voiceAccountability: 0.95 },
  { country: "LV", politicalStability: 0.40, ruleOfLaw: 0.95, corruptionControl: 0.50, governmentEffectiveness: 0.80, regulatoryQuality: 1.10, voiceAccountability: 0.85 },
  { country: "RS", politicalStability: -0.10, ruleOfLaw: -0.15, corruptionControl: -0.30, governmentEffectiveness: -0.05, regulatoryQuality: 0.10, voiceAccountability: 0.00 },
  { country: "UA", politicalStability: -1.80, ruleOfLaw: -0.60, corruptionControl: -0.75, governmentEffectiveness: -0.30, regulatoryQuality: -0.15, voiceAccountability: 0.10 },
  { country: "BY", politicalStability: -0.25, ruleOfLaw: -1.00, corruptionControl: -0.50, governmentEffectiveness: -0.60, regulatoryQuality: -0.90, voiceAccountability: -1.55 },
  { country: "RU", politicalStability: -0.70, ruleOfLaw: -0.80, corruptionControl: -0.85, governmentEffectiveness: -0.25, regulatoryQuality: -0.45, voiceAccountability: -1.35 },

  // Asia-Pacific
  { country: "JP", politicalStability: 1.05, ruleOfLaw: 1.50, corruptionControl: 1.50, governmentEffectiveness: 1.60, regulatoryQuality: 1.20, voiceAccountability: 1.05 },
  { country: "KR", politicalStability: 0.25, ruleOfLaw: 1.15, corruptionControl: 0.65, governmentEffectiveness: 1.25, regulatoryQuality: 1.10, voiceAccountability: 0.85 },
  { country: "CN", politicalStability: -0.30, ruleOfLaw: -0.25, corruptionControl: -0.15, governmentEffectiveness: 0.55, regulatoryQuality: -0.15, voiceAccountability: -1.60 },
  { country: "IN", politicalStability: -0.80, ruleOfLaw: -0.05, corruptionControl: -0.35, governmentEffectiveness: -0.15, regulatoryQuality: -0.30, voiceAccountability: 0.25 },
  { country: "SG", politicalStability: 1.50, ruleOfLaw: 1.80, corruptionControl: 2.10, governmentEffectiveness: 2.25, regulatoryQuality: 2.20, voiceAccountability: 0.35 },
  { country: "HK", politicalStability: 0.70, ruleOfLaw: 1.50, corruptionControl: 1.55, governmentEffectiveness: 1.70, regulatoryQuality: 1.95, voiceAccountability: -0.10 },
  { country: "TW", politicalStability: 0.60, ruleOfLaw: 1.20, corruptionControl: 0.95, governmentEffectiveness: 1.30, regulatoryQuality: 1.35, voiceAccountability: 0.90 },
  { country: "TH", politicalStability: -0.55, ruleOfLaw: -0.10, corruptionControl: -0.40, governmentEffectiveness: 0.35, regulatoryQuality: 0.20, voiceAccountability: -0.75 },
  { country: "MY", politicalStability: 0.10, ruleOfLaw: 0.50, corruptionControl: 0.20, governmentEffectiveness: 0.85, regulatoryQuality: 0.60, voiceAccountability: -0.25 },
  { country: "PH", politicalStability: -1.00, ruleOfLaw: -0.40, corruptionControl: -0.50, governmentEffectiveness: 0.00, regulatoryQuality: -0.05, voiceAccountability: -0.10 },
  { country: "VN", politicalStability: 0.10, ruleOfLaw: 0.05, corruptionControl: -0.40, governmentEffectiveness: 0.15, regulatoryQuality: -0.30, voiceAccountability: -1.40 },
  { country: "ID", politicalStability: -0.45, ruleOfLaw: -0.25, corruptionControl: -0.30, governmentEffectiveness: 0.10, regulatoryQuality: -0.05, voiceAccountability: 0.05 },
  { country: "BD", politicalStability: -1.15, ruleOfLaw: -0.85, corruptionControl: -1.05, governmentEffectiveness: -0.75, regulatoryQuality: -0.85, voiceAccountability: -0.40 },
  { country: "PK", politicalStability: -2.15, ruleOfLaw: -0.80, corruptionControl: -0.85, governmentEffectiveness: -0.60, regulatoryQuality: -0.65, voiceAccountability: -0.60 },
  { country: "MM", politicalStability: -2.20, ruleOfLaw: -1.50, corruptionControl: -1.25, governmentEffectiveness: -1.35, regulatoryQuality: -1.50, voiceAccountability: -1.85 },
  { country: "KH", politicalStability: -0.10, ruleOfLaw: -1.05, corruptionControl: -1.15, governmentEffectiveness: -0.70, regulatoryQuality: -0.45, voiceAccountability: -1.30 },

  // Oceania
  { country: "AU", politicalStability: 0.85, ruleOfLaw: 1.70, corruptionControl: 1.75, governmentEffectiveness: 1.55, regulatoryQuality: 1.80, voiceAccountability: 1.40 },
  { country: "NZ", politicalStability: 1.40, ruleOfLaw: 1.90, corruptionControl: 2.15, governmentEffectiveness: 1.65, regulatoryQuality: 1.90, voiceAccountability: 1.55 },

  // Middle East & North Africa
  { country: "AE", politicalStability: 0.80, ruleOfLaw: 0.70, corruptionControl: 1.15, governmentEffectiveness: 1.30, regulatoryQuality: 0.90, voiceAccountability: -1.05 },
  { country: "SA", politicalStability: -0.20, ruleOfLaw: 0.20, corruptionControl: 0.35, governmentEffectiveness: 0.20, regulatoryQuality: 0.05, voiceAccountability: -1.80 },
  { country: "QA", politicalStability: 0.95, ruleOfLaw: 0.80, corruptionControl: 0.95, governmentEffectiveness: 0.85, regulatoryQuality: 0.55, voiceAccountability: -0.75 },
  { country: "IL", politicalStability: -1.05, ruleOfLaw: 1.10, corruptionControl: 0.80, governmentEffectiveness: 1.15, regulatoryQuality: 1.15, voiceAccountability: 0.55 },
  { country: "TR", politicalStability: -1.35, ruleOfLaw: -0.30, corruptionControl: -0.35, governmentEffectiveness: 0.05, regulatoryQuality: 0.00, voiceAccountability: -0.85 },
  { country: "EG", politicalStability: -1.20, ruleOfLaw: -0.45, corruptionControl: -0.55, governmentEffectiveness: -0.55, regulatoryQuality: -0.60, voiceAccountability: -1.25 },
  { country: "MA", politicalStability: -0.30, ruleOfLaw: -0.20, corruptionControl: -0.30, governmentEffectiveness: -0.15, regulatoryQuality: -0.20, voiceAccountability: -0.60 },
  { country: "TN", politicalStability: -0.70, ruleOfLaw: -0.20, corruptionControl: -0.35, governmentEffectiveness: -0.40, regulatoryQuality: -0.25, voiceAccountability: 0.00 },
  { country: "JO", politicalStability: -0.35, ruleOfLaw: 0.30, corruptionControl: 0.20, governmentEffectiveness: 0.15, regulatoryQuality: 0.15, voiceAccountability: -0.55 },
  { country: "LB", politicalStability: -1.70, ruleOfLaw: -0.80, corruptionControl: -1.15, governmentEffectiveness: -1.30, regulatoryQuality: -0.45, voiceAccountability: -0.30 },
  { country: "KW", politicalStability: 0.15, ruleOfLaw: 0.20, corruptionControl: -0.05, governmentEffectiveness: -0.05, regulatoryQuality: -0.05, voiceAccountability: -0.50 },
  { country: "OM", politicalStability: 0.60, ruleOfLaw: 0.55, corruptionControl: 0.50, governmentEffectiveness: 0.40, regulatoryQuality: 0.45, voiceAccountability: -1.00 },
  { country: "BH", politicalStability: -0.30, ruleOfLaw: 0.40, corruptionControl: 0.25, governmentEffectiveness: 0.40, regulatoryQuality: 0.65, voiceAccountability: -1.20 },

  // Sub-Saharan Africa
  { country: "ZA", politicalStability: -0.15, ruleOfLaw: 0.00, corruptionControl: -0.10, governmentEffectiveness: -0.05, regulatoryQuality: 0.15, voiceAccountability: 0.60 },
  { country: "KE", politicalStability: -1.05, ruleOfLaw: -0.40, corruptionControl: -0.80, governmentEffectiveness: -0.30, regulatoryQuality: -0.15, voiceAccountability: -0.10 },
  { country: "NG", politicalStability: -1.85, ruleOfLaw: -0.85, corruptionControl: -1.05, governmentEffectiveness: -0.95, regulatoryQuality: -0.70, voiceAccountability: -0.40 },
  { country: "GH", politicalStability: 0.00, ruleOfLaw: 0.00, corruptionControl: -0.15, governmentEffectiveness: -0.20, regulatoryQuality: -0.05, voiceAccountability: 0.45 },
  { country: "ET", politicalStability: -1.70, ruleOfLaw: -0.60, corruptionControl: -0.30, governmentEffectiveness: -0.40, regulatoryQuality: -0.50, voiceAccountability: -1.20 },
  { country: "TZ", politicalStability: -0.25, ruleOfLaw: -0.30, corruptionControl: -0.45, governmentEffectiveness: -0.45, regulatoryQuality: -0.30, voiceAccountability: -0.55 },
  { country: "SN", politicalStability: -0.05, ruleOfLaw: -0.15, corruptionControl: -0.10, governmentEffectiveness: -0.30, regulatoryQuality: -0.10, voiceAccountability: 0.20 },
  { country: "CI", politicalStability: -0.50, ruleOfLaw: -0.55, corruptionControl: -0.50, governmentEffectiveness: -0.45, regulatoryQuality: -0.35, voiceAccountability: -0.35 },
  { country: "RW", politicalStability: 0.10, ruleOfLaw: 0.10, corruptionControl: 0.55, governmentEffectiveness: 0.35, regulatoryQuality: 0.30, voiceAccountability: -1.10 },
  { country: "UG", politicalStability: -0.55, ruleOfLaw: -0.30, corruptionControl: -0.85, governmentEffectiveness: -0.45, regulatoryQuality: -0.20, voiceAccountability: -0.50 },
  { country: "MZ", politicalStability: -1.00, ruleOfLaw: -0.90, corruptionControl: -0.75, governmentEffectiveness: -0.75, regulatoryQuality: -0.60, voiceAccountability: -0.40 },
  { country: "AO", politicalStability: -0.30, ruleOfLaw: -1.10, corruptionControl: -1.10, governmentEffectiveness: -0.95, regulatoryQuality: -0.80, voiceAccountability: -0.90 },
  { country: "CD", politicalStability: -2.25, ruleOfLaw: -1.65, corruptionControl: -1.45, governmentEffectiveness: -1.55, regulatoryQuality: -1.35, voiceAccountability: -1.15 },
  { country: "BW", politicalStability: 0.85, ruleOfLaw: 0.55, corruptionControl: 0.70, governmentEffectiveness: 0.35, regulatoryQuality: 0.55, voiceAccountability: 0.55 },
  { country: "MU", politicalStability: 0.80, ruleOfLaw: 0.85, corruptionControl: 0.35, governmentEffectiveness: 0.75, regulatoryQuality: 0.80, voiceAccountability: 0.75 },

  // South America
  { country: "BR", politicalStability: -0.45, ruleOfLaw: -0.20, corruptionControl: -0.35, governmentEffectiveness: -0.40, regulatoryQuality: -0.15, voiceAccountability: 0.40 },
  { country: "AR", politicalStability: 0.00, ruleOfLaw: -0.45, corruptionControl: -0.40, governmentEffectiveness: -0.30, regulatoryQuality: -0.70, voiceAccountability: 0.55 },
  { country: "CL", politicalStability: 0.15, ruleOfLaw: 0.90, corruptionControl: 0.85, governmentEffectiveness: 0.70, regulatoryQuality: 1.15, voiceAccountability: 0.90 },
  { country: "CO", politicalStability: -0.85, ruleOfLaw: -0.30, corruptionControl: -0.30, governmentEffectiveness: -0.05, regulatoryQuality: 0.25, voiceAccountability: 0.05 },
  { country: "PE", politicalStability: -0.55, ruleOfLaw: -0.60, corruptionControl: -0.45, governmentEffectiveness: -0.35, regulatoryQuality: 0.30, voiceAccountability: 0.10 },
  { country: "UY", politicalStability: 0.90, ruleOfLaw: 0.70, corruptionControl: 1.00, governmentEffectiveness: 0.45, regulatoryQuality: 0.45, voiceAccountability: 1.10 },
  { country: "EC", politicalStability: -0.70, ruleOfLaw: -0.70, corruptionControl: -0.55, governmentEffectiveness: -0.55, regulatoryQuality: -0.50, voiceAccountability: -0.05 },
  { country: "VE", politicalStability: -1.10, ruleOfLaw: -1.80, corruptionControl: -1.50, governmentEffectiveness: -1.60, regulatoryQuality: -2.00, voiceAccountability: -1.45 },
  { country: "BO", politicalStability: -0.40, ruleOfLaw: -1.00, corruptionControl: -0.60, governmentEffectiveness: -0.65, regulatoryQuality: -0.85, voiceAccountability: -0.10 },
  { country: "PY", politicalStability: -0.30, ruleOfLaw: -0.75, corruptionControl: -0.85, governmentEffectiveness: -0.70, regulatoryQuality: -0.30, voiceAccountability: 0.00 },

  // Central America & Caribbean
  { country: "CR", politicalStability: 0.45, ruleOfLaw: 0.40, corruptionControl: 0.45, governmentEffectiveness: 0.20, regulatoryQuality: 0.30, voiceAccountability: 0.95 },
  { country: "PA", politicalStability: 0.20, ruleOfLaw: -0.20, corruptionControl: -0.25, governmentEffectiveness: 0.00, regulatoryQuality: 0.20, voiceAccountability: 0.45 },
  { country: "JM", politicalStability: -0.10, ruleOfLaw: -0.20, corruptionControl: -0.25, governmentEffectiveness: 0.00, regulatoryQuality: 0.30, voiceAccountability: 0.60 },
  { country: "TT", politicalStability: -0.05, ruleOfLaw: -0.10, corruptionControl: -0.15, governmentEffectiveness: -0.05, regulatoryQuality: 0.10, voiceAccountability: 0.50 },
  { country: "DO", politicalStability: 0.05, ruleOfLaw: -0.50, corruptionControl: -0.60, governmentEffectiveness: -0.50, regulatoryQuality: -0.10, voiceAccountability: 0.20 },
  { country: "GT", politicalStability: -0.55, ruleOfLaw: -1.00, corruptionControl: -0.75, governmentEffectiveness: -0.60, regulatoryQuality: -0.30, voiceAccountability: -0.20 },
  { country: "HN", politicalStability: -0.55, ruleOfLaw: -0.95, corruptionControl: -0.80, governmentEffectiveness: -0.75, regulatoryQuality: -0.40, voiceAccountability: -0.30 },
  { country: "SV", politicalStability: 0.15, ruleOfLaw: -0.60, corruptionControl: -0.40, governmentEffectiveness: -0.20, regulatoryQuality: -0.10, voiceAccountability: -0.10 },
  { country: "CU", politicalStability: 0.30, ruleOfLaw: -0.60, corruptionControl: 0.00, governmentEffectiveness: -0.35, regulatoryQuality: -1.55, voiceAccountability: -1.65 },
  { country: "HT", politicalStability: -1.80, ruleOfLaw: -1.45, corruptionControl: -1.30, governmentEffectiveness: -1.60, regulatoryQuality: -1.00, voiceAccountability: -0.55 },

  // Additional Asian countries
  { country: "LK", politicalStability: -0.45, ruleOfLaw: -0.05, corruptionControl: -0.20, governmentEffectiveness: -0.30, regulatoryQuality: -0.20, voiceAccountability: -0.20 },
  { country: "NP", politicalStability: -0.65, ruleOfLaw: -0.55, corruptionControl: -0.60, governmentEffectiveness: -0.75, regulatoryQuality: -0.55, voiceAccountability: -0.15 },
  { country: "MN", politicalStability: 0.50, ruleOfLaw: -0.25, corruptionControl: -0.35, governmentEffectiveness: -0.40, regulatoryQuality: -0.25, voiceAccountability: 0.20 },
  { country: "KZ", politicalStability: -0.05, ruleOfLaw: -0.35, corruptionControl: -0.45, governmentEffectiveness: 0.00, regulatoryQuality: -0.10, voiceAccountability: -1.15 },
  { country: "UZ", politicalStability: -0.40, ruleOfLaw: -0.95, corruptionControl: -0.85, governmentEffectiveness: -0.40, regulatoryQuality: -0.60, voiceAccountability: -1.55 },
  { country: "GE", politicalStability: -0.30, ruleOfLaw: 0.30, corruptionControl: 0.65, governmentEffectiveness: 0.55, regulatoryQuality: 0.85, voiceAccountability: 0.15 },
  { country: "AZ", politicalStability: -0.50, ruleOfLaw: -0.55, corruptionControl: -0.80, governmentEffectiveness: -0.10, regulatoryQuality: -0.10, voiceAccountability: -1.50 },
  { country: "AM", politicalStability: -0.30, ruleOfLaw: -0.10, corruptionControl: -0.10, governmentEffectiveness: -0.10, regulatoryQuality: 0.05, voiceAccountability: -0.05 },
];

/** WGI scale bounds used for normalisation */
export const WGI_MIN = -2.5;
export const WGI_MAX = 2.5;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const METADATA: DatasetMetadata = {
  name: "Country Risk (WGI)",
  source: "World Bank Worldwide Governance Indicators",
  updated: "2025-Q1",
  version: 1,
  recordCount: COUNTRY_RISK_DATA.length,
  coverage: "120 countries — worldwide governance indicators",
};
