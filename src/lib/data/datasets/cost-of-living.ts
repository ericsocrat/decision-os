/**
 * Bundled cost-of-living data for ~100 cities worldwide.
 *
 * Sources: aggregated public indices (Numbeo-style). All monetary values
 * are in USD/month (or per unit where noted). The `overall` index is a
 * composite 0–100 score where higher = more expensive.
 *
 * The dataset is intentionally kept small (< 25 KB) to avoid bloating
 * the client bundle.
 *
 * @module data/datasets/cost-of-living
 */

export interface CityData {
  city: string;
  country: string;
  /** 1BR city-centre rent (USD/month) */
  rent1brCenter: number;
  /** 1BR outside-centre rent (USD/month) */
  rent1brOutside: number;
  /** Groceries index (relative, 0–100) */
  groceriesIndex: number;
  /** Average restaurant meal (USD) */
  restaurantMeal: number;
  /** Monthly transit pass (USD) */
  transportMonthly: number;
  /** Basic utilities — electricity, heating, water (USD/month) */
  utilitiesMonthly: number;
  /** Internet — 60 Mbps+ (USD/month) */
  internetMonthly: number;
  /** Composite index (0–100) */
  overall: number;
}

/**
 * World Bank income-group multipliers relative to global median.
 * Used for Tier 3 estimation when a city isn't in the dataset.
 */
export const INCOME_GROUP_MULTIPLIERS: Readonly<Record<string, number>> = {
  HIC: 1.4, // High-income countries
  UMC: 0.75, // Upper-middle-income
  LMC: 0.45, // Lower-middle-income
  LIC: 0.25, // Low-income
};

/**
 * Mapping from ISO 3166-1 alpha-2 country codes to World Bank income groups.
 * Only countries referenced in the dataset + common extras are included.
 */
export const COUNTRY_INCOME_GROUP: Readonly<Record<string, string>> = {
  US: "HIC", GB: "HIC", DE: "HIC", FR: "HIC", JP: "HIC", AU: "HIC",
  CA: "HIC", CH: "HIC", SE: "HIC", NO: "HIC", DK: "HIC", NL: "HIC",
  BE: "HIC", AT: "HIC", FI: "HIC", IE: "HIC", NZ: "HIC", SG: "HIC",
  KR: "HIC", IL: "HIC", AE: "HIC", QA: "HIC", IT: "HIC", ES: "HIC",
  PT: "HIC", CZ: "HIC", PL: "HIC", HU: "HIC", GR: "HIC", HR: "HIC",
  SK: "HIC", SI: "HIC", EE: "HIC", LT: "HIC", LV: "HIC", IS: "HIC",
  LU: "HIC", HK: "HIC", TW: "HIC", SA: "HIC", KW: "HIC", BH: "HIC",
  BR: "UMC", MX: "UMC", CN: "UMC", TR: "UMC", TH: "UMC", MY: "UMC",
  ZA: "UMC", CO: "UMC", AR: "UMC", PE: "UMC", RO: "UMC", BG: "UMC",
  RS: "UMC", CL: "HIC", UY: "HIC", CR: "UMC", PA: "HIC",
  IN: "LMC", PH: "LMC", VN: "LMC", EG: "LMC", NG: "LMC", PK: "LMC",
  BD: "LMC", KE: "LMC", GH: "LMC", UA: "LMC", MA: "LMC", TN: "LMC",
  ID: "LMC", LK: "LMC", MM: "LMC", KH: "LMC",
  ET: "LIC", MZ: "LIC", MW: "LIC", NE: "LIC", TD: "LIC",
};

// ---------------------------------------------------------------------------
// Dataset (~100 cities)
// ---------------------------------------------------------------------------

export const COST_OF_LIVING_DATA: readonly CityData[] = [
  // North America
  { city: "New York", country: "US", rent1brCenter: 3500, rent1brOutside: 2400, groceriesIndex: 86, restaurantMeal: 25, transportMonthly: 127, utilitiesMonthly: 180, internetMonthly: 65, overall: 87 },
  { city: "San Francisco", country: "US", rent1brCenter: 3200, rent1brOutside: 2300, groceriesIndex: 82, restaurantMeal: 22, transportMonthly: 98, utilitiesMonthly: 160, internetMonthly: 58, overall: 85 },
  { city: "Los Angeles", country: "US", rent1brCenter: 2500, rent1brOutside: 1700, groceriesIndex: 75, restaurantMeal: 20, transportMonthly: 100, utilitiesMonthly: 145, internetMonthly: 60, overall: 78 },
  { city: "Chicago", country: "US", rent1brCenter: 2000, rent1brOutside: 1400, groceriesIndex: 68, restaurantMeal: 18, transportMonthly: 105, utilitiesMonthly: 130, internetMonthly: 55, overall: 70 },
  { city: "Miami", country: "US", rent1brCenter: 2400, rent1brOutside: 1600, groceriesIndex: 72, restaurantMeal: 20, transportMonthly: 112, utilitiesMonthly: 150, internetMonthly: 55, overall: 75 },
  { city: "Austin", country: "US", rent1brCenter: 1800, rent1brOutside: 1300, groceriesIndex: 65, restaurantMeal: 16, transportMonthly: 41, utilitiesMonthly: 135, internetMonthly: 50, overall: 65 },
  { city: "Seattle", country: "US", rent1brCenter: 2200, rent1brOutside: 1600, groceriesIndex: 73, restaurantMeal: 20, transportMonthly: 99, utilitiesMonthly: 140, internetMonthly: 60, overall: 74 },
  { city: "Boston", country: "US", rent1brCenter: 2800, rent1brOutside: 1900, groceriesIndex: 78, restaurantMeal: 22, transportMonthly: 90, utilitiesMonthly: 165, internetMonthly: 62, overall: 80 },
  { city: "Toronto", country: "CA", rent1brCenter: 2100, rent1brOutside: 1500, groceriesIndex: 70, restaurantMeal: 18, transportMonthly: 115, utilitiesMonthly: 120, internetMonthly: 55, overall: 72 },
  { city: "Vancouver", country: "CA", rent1brCenter: 2300, rent1brOutside: 1700, groceriesIndex: 72, restaurantMeal: 19, transportMonthly: 77, utilitiesMonthly: 100, internetMonthly: 52, overall: 73 },
  { city: "Montreal", country: "CA", rent1brCenter: 1400, rent1brOutside: 1000, groceriesIndex: 62, restaurantMeal: 16, transportMonthly: 66, utilitiesMonthly: 85, internetMonthly: 48, overall: 56 },
  { city: "Mexico City", country: "MX", rent1brCenter: 700, rent1brOutside: 450, groceriesIndex: 35, restaurantMeal: 8, transportMonthly: 18, utilitiesMonthly: 45, internetMonthly: 25, overall: 30 },

  // Europe — Western
  { city: "London", country: "GB", rent1brCenter: 2600, rent1brOutside: 1700, groceriesIndex: 75, restaurantMeal: 20, transportMonthly: 180, utilitiesMonthly: 200, internetMonthly: 35, overall: 82 },
  { city: "Paris", country: "FR", rent1brCenter: 1500, rent1brOutside: 950, groceriesIndex: 72, restaurantMeal: 18, transportMonthly: 84, utilitiesMonthly: 170, internetMonthly: 30, overall: 73 },
  { city: "Berlin", country: "DE", rent1brCenter: 1200, rent1brOutside: 800, groceriesIndex: 55, restaurantMeal: 12, transportMonthly: 86, utilitiesMonthly: 250, internetMonthly: 30, overall: 60 },
  { city: "Munich", country: "DE", rent1brCenter: 1500, rent1brOutside: 1050, groceriesIndex: 60, restaurantMeal: 14, transportMonthly: 55, utilitiesMonthly: 260, internetMonthly: 30, overall: 68 },
  { city: "Amsterdam", country: "NL", rent1brCenter: 1700, rent1brOutside: 1200, groceriesIndex: 62, restaurantMeal: 17, transportMonthly: 100, utilitiesMonthly: 190, internetMonthly: 35, overall: 72 },
  { city: "Zurich", country: "CH", rent1brCenter: 2800, rent1brOutside: 2000, groceriesIndex: 90, restaurantMeal: 30, transportMonthly: 80, utilitiesMonthly: 220, internetMonthly: 42, overall: 90 },
  { city: "Geneva", country: "CH", rent1brCenter: 2600, rent1brOutside: 1800, groceriesIndex: 88, restaurantMeal: 28, transportMonthly: 70, utilitiesMonthly: 200, internetMonthly: 40, overall: 88 },
  { city: "Stockholm", country: "SE", rent1brCenter: 1400, rent1brOutside: 950, groceriesIndex: 65, restaurantMeal: 16, transportMonthly: 90, utilitiesMonthly: 95, internetMonthly: 28, overall: 66 },
  { city: "Copenhagen", country: "DK", rent1brCenter: 1600, rent1brOutside: 1100, groceriesIndex: 68, restaurantMeal: 20, transportMonthly: 55, utilitiesMonthly: 135, internetMonthly: 32, overall: 72 },
  { city: "Oslo", country: "NO", rent1brCenter: 1600, rent1brOutside: 1200, groceriesIndex: 75, restaurantMeal: 22, transportMonthly: 73, utilitiesMonthly: 145, internetMonthly: 40, overall: 76 },
  { city: "Dublin", country: "IE", rent1brCenter: 2000, rent1brOutside: 1400, groceriesIndex: 68, restaurantMeal: 18, transportMonthly: 120, utilitiesMonthly: 170, internetMonthly: 45, overall: 74 },
  { city: "Brussels", country: "BE", rent1brCenter: 1100, rent1brOutside: 800, groceriesIndex: 60, restaurantMeal: 16, transportMonthly: 49, utilitiesMonthly: 175, internetMonthly: 35, overall: 58 },
  { city: "Vienna", country: "AT", rent1brCenter: 1000, rent1brOutside: 700, groceriesIndex: 58, restaurantMeal: 14, transportMonthly: 50, utilitiesMonthly: 200, internetMonthly: 25, overall: 55 },
  { city: "Helsinki", country: "FI", rent1brCenter: 1200, rent1brOutside: 850, groceriesIndex: 65, restaurantMeal: 15, transportMonthly: 60, utilitiesMonthly: 110, internetMonthly: 22, overall: 60 },
  { city: "Lisbon", country: "PT", rent1brCenter: 1100, rent1brOutside: 700, groceriesIndex: 48, restaurantMeal: 10, transportMonthly: 40, utilitiesMonthly: 110, internetMonthly: 28, overall: 47 },
  { city: "Madrid", country: "ES", rent1brCenter: 1200, rent1brOutside: 800, groceriesIndex: 50, restaurantMeal: 12, transportMonthly: 54, utilitiesMonthly: 110, internetMonthly: 30, overall: 50 },
  { city: "Barcelona", country: "ES", rent1brCenter: 1250, rent1brOutside: 850, groceriesIndex: 52, restaurantMeal: 13, transportMonthly: 40, utilitiesMonthly: 120, internetMonthly: 32, overall: 52 },
  { city: "Rome", country: "IT", rent1brCenter: 1100, rent1brOutside: 750, groceriesIndex: 55, restaurantMeal: 14, transportMonthly: 35, utilitiesMonthly: 170, internetMonthly: 25, overall: 52 },
  { city: "Milan", country: "IT", rent1brCenter: 1300, rent1brOutside: 900, groceriesIndex: 58, restaurantMeal: 15, transportMonthly: 39, utilitiesMonthly: 165, internetMonthly: 26, overall: 58 },
  { city: "Luxembourg City", country: "LU", rent1brCenter: 2000, rent1brOutside: 1500, groceriesIndex: 70, restaurantMeal: 20, transportMonthly: 0, utilitiesMonthly: 180, internetMonthly: 40, overall: 70 },
  { city: "Reykjavik", country: "IS", rent1brCenter: 1600, rent1brOutside: 1200, groceriesIndex: 74, restaurantMeal: 22, transportMonthly: 80, utilitiesMonthly: 50, internetMonthly: 55, overall: 68 },

  // Europe — Central / Eastern
  { city: "Prague", country: "CZ", rent1brCenter: 900, rent1brOutside: 650, groceriesIndex: 42, restaurantMeal: 8, transportMonthly: 25, utilitiesMonthly: 140, internetMonthly: 18, overall: 40 },
  { city: "Warsaw", country: "PL", rent1brCenter: 800, rent1brOutside: 550, groceriesIndex: 40, restaurantMeal: 8, transportMonthly: 25, utilitiesMonthly: 130, internetMonthly: 12, overall: 38 },
  { city: "Krakow", country: "PL", rent1brCenter: 650, rent1brOutside: 450, groceriesIndex: 38, restaurantMeal: 7, transportMonthly: 22, utilitiesMonthly: 120, internetMonthly: 12, overall: 34 },
  { city: "Budapest", country: "HU", rent1brCenter: 700, rent1brOutside: 450, groceriesIndex: 38, restaurantMeal: 7, transportMonthly: 30, utilitiesMonthly: 130, internetMonthly: 12, overall: 34 },
  { city: "Bucharest", country: "RO", rent1brCenter: 600, rent1brOutside: 400, groceriesIndex: 35, restaurantMeal: 7, transportMonthly: 15, utilitiesMonthly: 100, internetMonthly: 8, overall: 30 },
  { city: "Sofia", country: "BG", rent1brCenter: 550, rent1brOutside: 350, groceriesIndex: 32, restaurantMeal: 6, transportMonthly: 20, utilitiesMonthly: 100, internetMonthly: 9, overall: 28 },
  { city: "Belgrade", country: "RS", rent1brCenter: 500, rent1brOutside: 350, groceriesIndex: 30, restaurantMeal: 6, transportMonthly: 20, utilitiesMonthly: 90, internetMonthly: 14, overall: 26 },
  { city: "Zagreb", country: "HR", rent1brCenter: 650, rent1brOutside: 450, groceriesIndex: 42, restaurantMeal: 8, transportMonthly: 35, utilitiesMonthly: 140, internetMonthly: 15, overall: 36 },
  { city: "Bratislava", country: "SK", rent1brCenter: 750, rent1brOutside: 500, groceriesIndex: 40, restaurantMeal: 8, transportMonthly: 25, utilitiesMonthly: 150, internetMonthly: 12, overall: 36 },
  { city: "Ljubljana", country: "SI", rent1brCenter: 800, rent1brOutside: 550, groceriesIndex: 46, restaurantMeal: 10, transportMonthly: 30, utilitiesMonthly: 155, internetMonthly: 25, overall: 40 },
  { city: "Tallinn", country: "EE", rent1brCenter: 700, rent1brOutside: 500, groceriesIndex: 42, restaurantMeal: 9, transportMonthly: 30, utilitiesMonthly: 130, internetMonthly: 18, overall: 36 },
  { city: "Vilnius", country: "LT", rent1brCenter: 650, rent1brOutside: 450, groceriesIndex: 40, restaurantMeal: 8, transportMonthly: 22, utilitiesMonthly: 120, internetMonthly: 12, overall: 34 },
  { city: "Riga", country: "LV", rent1brCenter: 600, rent1brOutside: 400, groceriesIndex: 40, restaurantMeal: 8, transportMonthly: 25, utilitiesMonthly: 115, internetMonthly: 12, overall: 32 },
  { city: "Athens", country: "GR", rent1brCenter: 550, rent1brOutside: 400, groceriesIndex: 45, restaurantMeal: 10, transportMonthly: 30, utilitiesMonthly: 120, internetMonthly: 25, overall: 38 },
  { city: "Istanbul", country: "TR", rent1brCenter: 500, rent1brOutside: 300, groceriesIndex: 32, restaurantMeal: 5, transportMonthly: 18, utilitiesMonthly: 55, internetMonthly: 10, overall: 26 },
  { city: "Kyiv", country: "UA", rent1brCenter: 450, rent1brOutside: 250, groceriesIndex: 25, restaurantMeal: 5, transportMonthly: 8, utilitiesMonthly: 60, internetMonthly: 6, overall: 22 },

  // Asia-Pacific
  { city: "Tokyo", country: "JP", rent1brCenter: 1200, rent1brOutside: 800, groceriesIndex: 65, restaurantMeal: 10, transportMonthly: 80, utilitiesMonthly: 160, internetMonthly: 35, overall: 62 },
  { city: "Osaka", country: "JP", rent1brCenter: 900, rent1brOutside: 600, groceriesIndex: 60, restaurantMeal: 8, transportMonthly: 60, utilitiesMonthly: 140, internetMonthly: 32, overall: 52 },
  { city: "Seoul", country: "KR", rent1brCenter: 900, rent1brOutside: 550, groceriesIndex: 62, restaurantMeal: 9, transportMonthly: 45, utilitiesMonthly: 120, internetMonthly: 20, overall: 52 },
  { city: "Singapore", country: "SG", rent1brCenter: 2800, rent1brOutside: 1800, groceriesIndex: 70, restaurantMeal: 12, transportMonthly: 80, utilitiesMonthly: 130, internetMonthly: 28, overall: 78 },
  { city: "Hong Kong", country: "HK", rent1brCenter: 2500, rent1brOutside: 1600, groceriesIndex: 72, restaurantMeal: 10, transportMonthly: 55, utilitiesMonthly: 140, internetMonthly: 22, overall: 80 },
  { city: "Taipei", country: "TW", rent1brCenter: 700, rent1brOutside: 450, groceriesIndex: 48, restaurantMeal: 6, transportMonthly: 30, utilitiesMonthly: 65, internetMonthly: 18, overall: 35 },
  { city: "Sydney", country: "AU", rent1brCenter: 2200, rent1brOutside: 1500, groceriesIndex: 72, restaurantMeal: 18, transportMonthly: 115, utilitiesMonthly: 160, internetMonthly: 50, overall: 76 },
  { city: "Melbourne", country: "AU", rent1brCenter: 1800, rent1brOutside: 1200, groceriesIndex: 68, restaurantMeal: 16, transportMonthly: 105, utilitiesMonthly: 145, internetMonthly: 48, overall: 68 },
  { city: "Auckland", country: "NZ", rent1brCenter: 1500, rent1brOutside: 1100, groceriesIndex: 66, restaurantMeal: 15, transportMonthly: 100, utilitiesMonthly: 120, internetMonthly: 48, overall: 65 },
  { city: "Shanghai", country: "CN", rent1brCenter: 1100, rent1brOutside: 600, groceriesIndex: 42, restaurantMeal: 5, transportMonthly: 30, utilitiesMonthly: 55, internetMonthly: 12, overall: 42 },
  { city: "Beijing", country: "CN", rent1brCenter: 1000, rent1brOutside: 500, groceriesIndex: 40, restaurantMeal: 5, transportMonthly: 25, utilitiesMonthly: 50, internetMonthly: 10, overall: 40 },
  { city: "Bangkok", country: "TH", rent1brCenter: 550, rent1brOutside: 300, groceriesIndex: 32, restaurantMeal: 3, transportMonthly: 25, utilitiesMonthly: 60, internetMonthly: 15, overall: 24 },
  { city: "Kuala Lumpur", country: "MY", rent1brCenter: 550, rent1brOutside: 350, groceriesIndex: 35, restaurantMeal: 4, transportMonthly: 22, utilitiesMonthly: 45, internetMonthly: 18, overall: 26 },
  { city: "Ho Chi Minh City", country: "VN", rent1brCenter: 500, rent1brOutside: 300, groceriesIndex: 28, restaurantMeal: 3, transportMonthly: 8, utilitiesMonthly: 50, internetMonthly: 8, overall: 20 },
  { city: "Mumbai", country: "IN", rent1brCenter: 600, rent1brOutside: 300, groceriesIndex: 25, restaurantMeal: 3, transportMonthly: 10, utilitiesMonthly: 35, internetMonthly: 8, overall: 22 },
  { city: "Delhi", country: "IN", rent1brCenter: 400, rent1brOutside: 200, groceriesIndex: 22, restaurantMeal: 2, transportMonthly: 8, utilitiesMonthly: 30, internetMonthly: 7, overall: 18 },
  { city: "Bangalore", country: "IN", rent1brCenter: 350, rent1brOutside: 180, groceriesIndex: 22, restaurantMeal: 2, transportMonthly: 12, utilitiesMonthly: 32, internetMonthly: 10, overall: 17 },
  { city: "Manila", country: "PH", rent1brCenter: 400, rent1brOutside: 220, groceriesIndex: 28, restaurantMeal: 3, transportMonthly: 9, utilitiesMonthly: 60, internetMonthly: 25, overall: 22 },
  { city: "Jakarta", country: "ID", rent1brCenter: 450, rent1brOutside: 250, groceriesIndex: 28, restaurantMeal: 3, transportMonthly: 12, utilitiesMonthly: 40, internetMonthly: 15, overall: 20 },
  { city: "Phnom Penh", country: "KH", rent1brCenter: 450, rent1brOutside: 250, groceriesIndex: 30, restaurantMeal: 3, transportMonthly: 0, utilitiesMonthly: 50, internetMonthly: 20, overall: 22 },

  // Middle East
  { city: "Dubai", country: "AE", rent1brCenter: 2000, rent1brOutside: 1300, groceriesIndex: 55, restaurantMeal: 12, transportMonthly: 80, utilitiesMonthly: 140, internetMonthly: 70, overall: 62 },
  { city: "Abu Dhabi", country: "AE", rent1brCenter: 1600, rent1brOutside: 1100, groceriesIndex: 52, restaurantMeal: 10, transportMonthly: 60, utilitiesMonthly: 130, internetMonthly: 68, overall: 56 },
  { city: "Tel Aviv", country: "IL", rent1brCenter: 1800, rent1brOutside: 1200, groceriesIndex: 68, restaurantMeal: 18, transportMonthly: 50, utilitiesMonthly: 130, internetMonthly: 22, overall: 70 },
  { city: "Riyadh", country: "SA", rent1brCenter: 850, rent1brOutside: 550, groceriesIndex: 42, restaurantMeal: 8, transportMonthly: 0, utilitiesMonthly: 70, internetMonthly: 55, overall: 36 },
  { city: "Doha", country: "QA", rent1brCenter: 1500, rent1brOutside: 1000, groceriesIndex: 55, restaurantMeal: 10, transportMonthly: 0, utilitiesMonthly: 80, internetMonthly: 65, overall: 52 },

  // Africa
  { city: "Cape Town", country: "ZA", rent1brCenter: 650, rent1brOutside: 400, groceriesIndex: 32, restaurantMeal: 8, transportMonthly: 35, utilitiesMonthly: 65, internetMonthly: 30, overall: 30 },
  { city: "Johannesburg", country: "ZA", rent1brCenter: 550, rent1brOutside: 350, groceriesIndex: 30, restaurantMeal: 7, transportMonthly: 40, utilitiesMonthly: 60, internetMonthly: 28, overall: 28 },
  { city: "Nairobi", country: "KE", rent1brCenter: 400, rent1brOutside: 200, groceriesIndex: 30, restaurantMeal: 5, transportMonthly: 20, utilitiesMonthly: 55, internetMonthly: 30, overall: 24 },
  { city: "Lagos", country: "NG", rent1brCenter: 550, rent1brOutside: 250, groceriesIndex: 35, restaurantMeal: 4, transportMonthly: 15, utilitiesMonthly: 50, internetMonthly: 25, overall: 25 },
  { city: "Cairo", country: "EG", rent1brCenter: 250, rent1brOutside: 120, groceriesIndex: 18, restaurantMeal: 3, transportMonthly: 8, utilitiesMonthly: 20, internetMonthly: 8, overall: 15 },
  { city: "Casablanca", country: "MA", rent1brCenter: 400, rent1brOutside: 250, groceriesIndex: 28, restaurantMeal: 5, transportMonthly: 18, utilitiesMonthly: 55, internetMonthly: 15, overall: 22 },
  { city: "Accra", country: "GH", rent1brCenter: 450, rent1brOutside: 200, groceriesIndex: 30, restaurantMeal: 5, transportMonthly: 15, utilitiesMonthly: 55, internetMonthly: 30, overall: 24 },
  { city: "Tunis", country: "TN", rent1brCenter: 300, rent1brOutside: 180, groceriesIndex: 22, restaurantMeal: 3, transportMonthly: 12, utilitiesMonthly: 30, internetMonthly: 12, overall: 16 },
  { city: "Addis Ababa", country: "ET", rent1brCenter: 350, rent1brOutside: 150, groceriesIndex: 25, restaurantMeal: 3, transportMonthly: 5, utilitiesMonthly: 20, internetMonthly: 15, overall: 14 },

  // South America
  { city: "São Paulo", country: "BR", rent1brCenter: 650, rent1brOutside: 400, groceriesIndex: 32, restaurantMeal: 7, transportMonthly: 35, utilitiesMonthly: 75, internetMonthly: 20, overall: 32 },
  { city: "Rio de Janeiro", country: "BR", rent1brCenter: 600, rent1brOutside: 350, groceriesIndex: 30, restaurantMeal: 7, transportMonthly: 40, utilitiesMonthly: 70, internetMonthly: 22, overall: 30 },
  { city: "Buenos Aires", country: "AR", rent1brCenter: 400, rent1brOutside: 280, groceriesIndex: 26, restaurantMeal: 6, transportMonthly: 8, utilitiesMonthly: 30, internetMonthly: 18, overall: 22 },
  { city: "Santiago", country: "CL", rent1brCenter: 700, rent1brOutside: 450, groceriesIndex: 42, restaurantMeal: 8, transportMonthly: 38, utilitiesMonthly: 80, internetMonthly: 25, overall: 36 },
  { city: "Bogotá", country: "CO", rent1brCenter: 500, rent1brOutside: 300, groceriesIndex: 28, restaurantMeal: 5, transportMonthly: 20, utilitiesMonthly: 50, internetMonthly: 18, overall: 24 },
  { city: "Lima", country: "PE", rent1brCenter: 550, rent1brOutside: 350, groceriesIndex: 30, restaurantMeal: 5, transportMonthly: 22, utilitiesMonthly: 45, internetMonthly: 18, overall: 25 },
  { city: "Montevideo", country: "UY", rent1brCenter: 600, rent1brOutside: 400, groceriesIndex: 40, restaurantMeal: 10, transportMonthly: 32, utilitiesMonthly: 80, internetMonthly: 25, overall: 34 },
  { city: "San José", country: "CR", rent1brCenter: 600, rent1brOutside: 400, groceriesIndex: 40, restaurantMeal: 8, transportMonthly: 30, utilitiesMonthly: 50, internetMonthly: 28, overall: 32 },
  { city: "Panama City", country: "PA", rent1brCenter: 1000, rent1brOutside: 650, groceriesIndex: 42, restaurantMeal: 8, transportMonthly: 25, utilitiesMonthly: 65, internetMonthly: 35, overall: 38 },
];

// ---------------------------------------------------------------------------
// Dataset range helpers (pre-computed for normalization)
// ---------------------------------------------------------------------------

function computeRange(accessor: (c: CityData) => number): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const c of COST_OF_LIVING_DATA) {
    const v = accessor(c);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

export const RANGES = {
  rent1brCenter: computeRange((c) => c.rent1brCenter),
  rent1brOutside: computeRange((c) => c.rent1brOutside),
  groceriesIndex: computeRange((c) => c.groceriesIndex),
  restaurantMeal: computeRange((c) => c.restaurantMeal),
  transportMonthly: computeRange((c) => c.transportMonthly),
  utilitiesMonthly: computeRange((c) => c.utilitiesMonthly),
  internetMonthly: computeRange((c) => c.internetMonthly),
  overall: computeRange((c) => c.overall),
} as const;
