/**
 * Bundled tax-efficiency data for OECD + major economies.
 *
 * All rates are expressed as percentages (0–60+).
 * The `taxFreedomIndex` is a composite 0–100 score where
 * **higher = lower tax burden** (inverted).
 *
 * @module data/datasets/tax-efficiency
 */

export interface CountryTaxData {
  country: string; // ISO 3166-1 alpha-2
  /** Effective income tax rate for median income (%) */
  incomeTaxRate: number;
  /** Headline corporate tax rate (%) */
  corporateTaxRate: number;
  /** Standard VAT / sales-tax rate (%) */
  salesTaxRate: number;
  /** Employee social-security contribution rate (%) */
  socialSecurityRate: number;
  /** Composite tax-freedom index (0–100, 100 = lowest burden) */
  taxFreedomIndex: number;
}

/**
 * Income-group based fallback rates for Tier 3 estimation.
 */
export const TAX_GROUP_DEFAULTS: Readonly<
  Record<string, Omit<CountryTaxData, "country">>
> = {
  HIC: {
    incomeTaxRate: 30,
    corporateTaxRate: 23,
    salesTaxRate: 18,
    socialSecurityRate: 12,
    taxFreedomIndex: 45,
  },
  UMC: {
    incomeTaxRate: 22,
    corporateTaxRate: 25,
    salesTaxRate: 15,
    socialSecurityRate: 8,
    taxFreedomIndex: 55,
  },
  LMC: {
    incomeTaxRate: 15,
    corporateTaxRate: 28,
    salesTaxRate: 12,
    socialSecurityRate: 5,
    taxFreedomIndex: 60,
  },
  LIC: {
    incomeTaxRate: 10,
    corporateTaxRate: 30,
    salesTaxRate: 10,
    socialSecurityRate: 3,
    taxFreedomIndex: 65,
  },
};

// ---------------------------------------------------------------------------
// Dataset — OECD + major economies
// ---------------------------------------------------------------------------

export const TAX_DATA: readonly CountryTaxData[] = [
  // North America
  { country: "US", incomeTaxRate: 24, corporateTaxRate: 21, salesTaxRate: 7, socialSecurityRate: 7.65, taxFreedomIndex: 58 },
  { country: "CA", incomeTaxRate: 26, corporateTaxRate: 26.5, salesTaxRate: 5, socialSecurityRate: 5.95, taxFreedomIndex: 52 },
  { country: "MX", incomeTaxRate: 30, corporateTaxRate: 30, salesTaxRate: 16, socialSecurityRate: 3, taxFreedomIndex: 42 },

  // Europe — Western
  { country: "GB", incomeTaxRate: 20, corporateTaxRate: 25, salesTaxRate: 20, socialSecurityRate: 12, taxFreedomIndex: 48 },
  { country: "DE", incomeTaxRate: 30, corporateTaxRate: 30, salesTaxRate: 19, socialSecurityRate: 20, taxFreedomIndex: 36 },
  { country: "FR", incomeTaxRate: 30, corporateTaxRate: 25, salesTaxRate: 20, socialSecurityRate: 22, taxFreedomIndex: 32 },
  { country: "NL", incomeTaxRate: 37, corporateTaxRate: 25.8, salesTaxRate: 21, socialSecurityRate: 28, taxFreedomIndex: 30 },
  { country: "BE", incomeTaxRate: 40, corporateTaxRate: 25, salesTaxRate: 21, socialSecurityRate: 13, taxFreedomIndex: 28 },
  { country: "CH", incomeTaxRate: 12, corporateTaxRate: 14.9, salesTaxRate: 8.1, socialSecurityRate: 6.4, taxFreedomIndex: 76 },
  { country: "AT", incomeTaxRate: 32, corporateTaxRate: 23, salesTaxRate: 20, socialSecurityRate: 18, taxFreedomIndex: 34 },
  { country: "LU", incomeTaxRate: 28, corporateTaxRate: 24.9, salesTaxRate: 17, socialSecurityRate: 12.5, taxFreedomIndex: 40 },
  { country: "IE", incomeTaxRate: 20, corporateTaxRate: 12.5, salesTaxRate: 23, socialSecurityRate: 4, taxFreedomIndex: 58 },
  { country: "IT", incomeTaxRate: 35, corporateTaxRate: 24, salesTaxRate: 22, socialSecurityRate: 10, taxFreedomIndex: 35 },
  { country: "ES", incomeTaxRate: 24, corporateTaxRate: 25, salesTaxRate: 21, socialSecurityRate: 6.4, taxFreedomIndex: 44 },
  { country: "PT", incomeTaxRate: 23, corporateTaxRate: 21, salesTaxRate: 23, socialSecurityRate: 11, taxFreedomIndex: 42 },

  // Europe — Nordics
  { country: "SE", incomeTaxRate: 32, corporateTaxRate: 20.6, salesTaxRate: 25, socialSecurityRate: 7, taxFreedomIndex: 38 },
  { country: "NO", incomeTaxRate: 22, corporateTaxRate: 22, salesTaxRate: 25, socialSecurityRate: 8, taxFreedomIndex: 44 },
  { country: "DK", incomeTaxRate: 37, corporateTaxRate: 22, salesTaxRate: 25, socialSecurityRate: 0, taxFreedomIndex: 36 },
  { country: "FI", incomeTaxRate: 30, corporateTaxRate: 20, salesTaxRate: 25.5, socialSecurityRate: 8, taxFreedomIndex: 38 },
  { country: "IS", incomeTaxRate: 23, corporateTaxRate: 20, salesTaxRate: 24, socialSecurityRate: 4, taxFreedomIndex: 46 },

  // Europe — Central / Eastern
  { country: "PL", incomeTaxRate: 12, corporateTaxRate: 19, salesTaxRate: 23, socialSecurityRate: 14, taxFreedomIndex: 52 },
  { country: "CZ", incomeTaxRate: 15, corporateTaxRate: 19, salesTaxRate: 21, socialSecurityRate: 11, taxFreedomIndex: 54 },
  { country: "HU", incomeTaxRate: 15, corporateTaxRate: 9, salesTaxRate: 27, socialSecurityRate: 18.5, taxFreedomIndex: 50 },
  { country: "SK", incomeTaxRate: 19, corporateTaxRate: 21, salesTaxRate: 20, socialSecurityRate: 14, taxFreedomIndex: 48 },
  { country: "RO", incomeTaxRate: 10, corporateTaxRate: 16, salesTaxRate: 19, socialSecurityRate: 25, taxFreedomIndex: 52 },
  { country: "BG", incomeTaxRate: 10, corporateTaxRate: 10, salesTaxRate: 20, socialSecurityRate: 13, taxFreedomIndex: 62 },
  { country: "HR", incomeTaxRate: 20, corporateTaxRate: 18, salesTaxRate: 25, socialSecurityRate: 20, taxFreedomIndex: 40 },
  { country: "SI", incomeTaxRate: 27, corporateTaxRate: 19, salesTaxRate: 22, socialSecurityRate: 22, taxFreedomIndex: 36 },
  { country: "EE", incomeTaxRate: 20, corporateTaxRate: 20, salesTaxRate: 22, socialSecurityRate: 2, taxFreedomIndex: 56 },
  { country: "LT", incomeTaxRate: 20, corporateTaxRate: 15, salesTaxRate: 21, socialSecurityRate: 20, taxFreedomIndex: 46 },
  { country: "LV", incomeTaxRate: 20, corporateTaxRate: 20, salesTaxRate: 21, socialSecurityRate: 11, taxFreedomIndex: 48 },
  { country: "GR", incomeTaxRate: 22, corporateTaxRate: 22, salesTaxRate: 24, socialSecurityRate: 14, taxFreedomIndex: 40 },
  { country: "RS", incomeTaxRate: 10, corporateTaxRate: 15, salesTaxRate: 20, socialSecurityRate: 20, taxFreedomIndex: 52 },
  { country: "TR", incomeTaxRate: 15, corporateTaxRate: 25, salesTaxRate: 20, socialSecurityRate: 15, taxFreedomIndex: 46 },
  { country: "UA", incomeTaxRate: 18, corporateTaxRate: 18, salesTaxRate: 20, socialSecurityRate: 22, taxFreedomIndex: 44 },

  // Asia-Pacific
  { country: "JP", incomeTaxRate: 23, corporateTaxRate: 23.2, salesTaxRate: 10, socialSecurityRate: 15, taxFreedomIndex: 46 },
  { country: "KR", incomeTaxRate: 15, corporateTaxRate: 25, salesTaxRate: 10, socialSecurityRate: 9.4, taxFreedomIndex: 54 },
  { country: "SG", incomeTaxRate: 7, corporateTaxRate: 17, salesTaxRate: 9, socialSecurityRate: 20, taxFreedomIndex: 72 },
  { country: "HK", incomeTaxRate: 15, corporateTaxRate: 16.5, salesTaxRate: 0, socialSecurityRate: 5, taxFreedomIndex: 78 },
  { country: "TW", incomeTaxRate: 12, corporateTaxRate: 20, salesTaxRate: 5, socialSecurityRate: 11, taxFreedomIndex: 62 },
  { country: "AU", incomeTaxRate: 24.5, corporateTaxRate: 30, salesTaxRate: 10, socialSecurityRate: 0, taxFreedomIndex: 52 },
  { country: "NZ", incomeTaxRate: 17.5, corporateTaxRate: 28, salesTaxRate: 15, socialSecurityRate: 0, taxFreedomIndex: 56 },
  { country: "CN", incomeTaxRate: 20, corporateTaxRate: 25, salesTaxRate: 13, socialSecurityRate: 11, taxFreedomIndex: 46 },
  { country: "IN", incomeTaxRate: 10, corporateTaxRate: 25, salesTaxRate: 18, socialSecurityRate: 12, taxFreedomIndex: 52 },
  { country: "TH", incomeTaxRate: 10, corporateTaxRate: 20, salesTaxRate: 7, socialSecurityRate: 5, taxFreedomIndex: 64 },
  { country: "MY", incomeTaxRate: 8, corporateTaxRate: 24, salesTaxRate: 6, socialSecurityRate: 11, taxFreedomIndex: 62 },
  { country: "VN", incomeTaxRate: 10, corporateTaxRate: 20, salesTaxRate: 10, socialSecurityRate: 11, taxFreedomIndex: 58 },
  { country: "PH", incomeTaxRate: 20, corporateTaxRate: 25, salesTaxRate: 12, socialSecurityRate: 5, taxFreedomIndex: 52 },
  { country: "ID", incomeTaxRate: 15, corporateTaxRate: 22, salesTaxRate: 11, socialSecurityRate: 4, taxFreedomIndex: 58 },

  // Middle East
  { country: "AE", incomeTaxRate: 0, corporateTaxRate: 9, salesTaxRate: 5, socialSecurityRate: 5, taxFreedomIndex: 92 },
  { country: "SA", incomeTaxRate: 0, corporateTaxRate: 20, salesTaxRate: 15, socialSecurityRate: 10, taxFreedomIndex: 80 },
  { country: "QA", incomeTaxRate: 0, corporateTaxRate: 10, salesTaxRate: 0, socialSecurityRate: 5, taxFreedomIndex: 90 },
  { country: "BH", incomeTaxRate: 0, corporateTaxRate: 0, salesTaxRate: 10, socialSecurityRate: 7, taxFreedomIndex: 92 },
  { country: "KW", incomeTaxRate: 0, corporateTaxRate: 15, salesTaxRate: 0, socialSecurityRate: 8, taxFreedomIndex: 88 },
  { country: "IL", incomeTaxRate: 25, corporateTaxRate: 23, salesTaxRate: 17, socialSecurityRate: 12, taxFreedomIndex: 42 },

  // Africa
  { country: "ZA", incomeTaxRate: 18, corporateTaxRate: 27, salesTaxRate: 15, socialSecurityRate: 1, taxFreedomIndex: 52 },
  { country: "NG", incomeTaxRate: 7, corporateTaxRate: 30, salesTaxRate: 7.5, socialSecurityRate: 8, taxFreedomIndex: 58 },
  { country: "KE", incomeTaxRate: 10, corporateTaxRate: 30, salesTaxRate: 16, socialSecurityRate: 6, taxFreedomIndex: 52 },
  { country: "EG", incomeTaxRate: 15, corporateTaxRate: 22.5, salesTaxRate: 14, socialSecurityRate: 11, taxFreedomIndex: 52 },
  { country: "MA", incomeTaxRate: 20, corporateTaxRate: 31, salesTaxRate: 20, socialSecurityRate: 6.7, taxFreedomIndex: 42 },
  { country: "GH", incomeTaxRate: 15, corporateTaxRate: 25, salesTaxRate: 15, socialSecurityRate: 5.5, taxFreedomIndex: 52 },

  // South America
  { country: "BR", incomeTaxRate: 15, corporateTaxRate: 34, salesTaxRate: 17, socialSecurityRate: 11, taxFreedomIndex: 38 },
  { country: "AR", incomeTaxRate: 27, corporateTaxRate: 35, salesTaxRate: 21, socialSecurityRate: 17, taxFreedomIndex: 28 },
  { country: "CL", incomeTaxRate: 8, corporateTaxRate: 27, salesTaxRate: 19, socialSecurityRate: 7, taxFreedomIndex: 56 },
  { country: "CO", incomeTaxRate: 10, corporateTaxRate: 35, salesTaxRate: 19, socialSecurityRate: 8, taxFreedomIndex: 46 },
  { country: "PE", incomeTaxRate: 8, corporateTaxRate: 29.5, salesTaxRate: 18, socialSecurityRate: 13, taxFreedomIndex: 50 },
  { country: "UY", incomeTaxRate: 15, corporateTaxRate: 25, salesTaxRate: 22, socialSecurityRate: 15, taxFreedomIndex: 44 },
  { country: "CR", incomeTaxRate: 15, corporateTaxRate: 30, salesTaxRate: 13, socialSecurityRate: 10.5, taxFreedomIndex: 46 },
  { country: "PA", incomeTaxRate: 15, corporateTaxRate: 25, salesTaxRate: 7, socialSecurityRate: 10, taxFreedomIndex: 58 },
];

// ---------------------------------------------------------------------------
// Dataset range helpers (pre-computed for normalization)
// ---------------------------------------------------------------------------

function computeRange(accessor: (c: CountryTaxData) => number): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const c of TAX_DATA) {
    const v = accessor(c);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

export const TAX_RANGES = {
  incomeTaxRate: computeRange((c) => c.incomeTaxRate),
  corporateTaxRate: computeRange((c) => c.corporateTaxRate),
  salesTaxRate: computeRange((c) => c.salesTaxRate),
  socialSecurityRate: computeRange((c) => c.socialSecurityRate),
  taxFreedomIndex: computeRange((c) => c.taxFreedomIndex),
} as const;
