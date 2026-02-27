/**
 * Bundled quality-of-life dataset — ~100 cities worldwide.
 *
 * All indices are on a 0–100 scale (higher = better), except
 * pollutionIndex which is raw (higher = more pollution — the
 * provider inverts it at query time).
 *
 * Sources: Numbeo, WHO, Climate Data (aggregated/approximated).
 *
 * @module data/datasets/quality-of-life
 */

export interface QualityOfLifeData {
  city: string;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** Crime safety perception index (0–100, higher = safer) */
  safetyIndex: number;
  /** Healthcare system quality index (0–100) */
  healthcareIndex: number;
  /** Climate comfort score (0–100, higher = more comfortable) */
  climateComfort: number;
  /** Pollution index (0–100, higher = more pollution) */
  pollutionIndex: number;
  /** Infrastructure quality composite (0–100) */
  infrastructureQuality: number;
  /** Green space / parks access per capita (0–100) */
  greenSpaceAccess: number;
}

// ---------------------------------------------------------------------------
// Regional averages used for Tier 3 estimation
// ---------------------------------------------------------------------------

export interface RegionalAverage {
  safetyIndex: number;
  healthcareIndex: number;
  climateComfort: number;
  pollutionIndex: number;
  infrastructureQuality: number;
  greenSpaceAccess: number;
}

export const REGIONAL_AVERAGES: Readonly<Record<string, RegionalAverage>> = {
  "western-europe": { safetyIndex: 68, healthcareIndex: 78, climateComfort: 60, pollutionIndex: 30, infrastructureQuality: 78, greenSpaceAccess: 72 },
  "northern-europe": { safetyIndex: 72, healthcareIndex: 80, climateComfort: 42, pollutionIndex: 22, infrastructureQuality: 82, greenSpaceAccess: 78 },
  "southern-europe": { safetyIndex: 62, healthcareIndex: 72, climateComfort: 72, pollutionIndex: 38, infrastructureQuality: 65, greenSpaceAccess: 58 },
  "eastern-europe": { safetyIndex: 58, healthcareIndex: 55, climateComfort: 48, pollutionIndex: 42, infrastructureQuality: 52, greenSpaceAccess: 50 },
  "north-america": { safetyIndex: 55, healthcareIndex: 68, climateComfort: 58, pollutionIndex: 35, infrastructureQuality: 72, greenSpaceAccess: 62 },
  "latin-america": { safetyIndex: 38, healthcareIndex: 50, climateComfort: 65, pollutionIndex: 48, infrastructureQuality: 42, greenSpaceAccess: 45 },
  "east-asia": { safetyIndex: 72, healthcareIndex: 75, climateComfort: 55, pollutionIndex: 50, infrastructureQuality: 80, greenSpaceAccess: 52 },
  "southeast-asia": { safetyIndex: 55, healthcareIndex: 48, climateComfort: 50, pollutionIndex: 55, infrastructureQuality: 45, greenSpaceAccess: 40 },
  "south-asia": { safetyIndex: 42, healthcareIndex: 35, climateComfort: 40, pollutionIndex: 72, infrastructureQuality: 30, greenSpaceAccess: 28 },
  "middle-east": { safetyIndex: 65, healthcareIndex: 58, climateComfort: 35, pollutionIndex: 50, infrastructureQuality: 60, greenSpaceAccess: 30 },
  "sub-saharan-africa": { safetyIndex: 35, healthcareIndex: 28, climateComfort: 55, pollutionIndex: 45, infrastructureQuality: 25, greenSpaceAccess: 35 },
  "oceania": { safetyIndex: 65, healthcareIndex: 78, climateComfort: 70, pollutionIndex: 22, infrastructureQuality: 75, greenSpaceAccess: 78 },
};

/**
 * Maps ISO alpha-2 country code → region key for Tier 3 estimation.
 */
export const COUNTRY_REGION: Readonly<Record<string, string>> = {
  // Western Europe
  GB: "western-europe", DE: "western-europe", FR: "western-europe",
  NL: "western-europe", BE: "western-europe", CH: "western-europe",
  AT: "western-europe", IE: "western-europe", LU: "western-europe",
  // Northern Europe
  SE: "northern-europe", NO: "northern-europe", DK: "northern-europe",
  FI: "northern-europe", IS: "northern-europe",
  // Southern Europe
  IT: "southern-europe", ES: "southern-europe", PT: "southern-europe",
  GR: "southern-europe", HR: "southern-europe", SI: "southern-europe",
  // Eastern Europe
  PL: "eastern-europe", CZ: "eastern-europe", HU: "eastern-europe",
  RO: "eastern-europe", BG: "eastern-europe", SK: "eastern-europe",
  UA: "eastern-europe", RS: "eastern-europe", LT: "eastern-europe",
  LV: "eastern-europe", EE: "eastern-europe", BY: "eastern-europe",
  RU: "eastern-europe",
  // North America
  US: "north-america", CA: "north-america",
  // Latin America
  MX: "latin-america", BR: "latin-america", AR: "latin-america",
  CL: "latin-america", CO: "latin-america", PE: "latin-america",
  UY: "latin-america", EC: "latin-america", CR: "latin-america",
  PA: "latin-america",
  // East Asia
  JP: "east-asia", KR: "east-asia", CN: "east-asia", TW: "east-asia",
  HK: "east-asia",
  // Southeast Asia
  SG: "southeast-asia", TH: "southeast-asia", MY: "southeast-asia",
  VN: "southeast-asia", PH: "southeast-asia", ID: "southeast-asia",
  // South Asia
  IN: "south-asia", BD: "south-asia", PK: "south-asia", LK: "south-asia",
  NP: "south-asia",
  // Middle East
  AE: "middle-east", SA: "middle-east", QA: "middle-east",
  IL: "middle-east", TR: "middle-east", EG: "middle-east",
  JO: "middle-east", KW: "middle-east", BH: "middle-east",
  OM: "middle-east", MA: "middle-east",
  // Sub-Saharan Africa
  ZA: "sub-saharan-africa", KE: "sub-saharan-africa", NG: "sub-saharan-africa",
  GH: "sub-saharan-africa", ET: "sub-saharan-africa", TZ: "sub-saharan-africa",
  RW: "sub-saharan-africa", SN: "sub-saharan-africa", UG: "sub-saharan-africa",
  // Oceania
  AU: "oceania", NZ: "oceania",
};

// ---------------------------------------------------------------------------
// Dataset — ~100 cities
// ---------------------------------------------------------------------------

export const QUALITY_OF_LIFE_DATA: readonly QualityOfLifeData[] = [
  // North America
  { city: "New York", country: "US", safetyIndex: 52, healthcareIndex: 72, climateComfort: 55, pollutionIndex: 48, infrastructureQuality: 78, greenSpaceAccess: 62 },
  { city: "Los Angeles", country: "US", safetyIndex: 45, healthcareIndex: 70, climateComfort: 82, pollutionIndex: 55, infrastructureQuality: 68, greenSpaceAccess: 55 },
  { city: "Chicago", country: "US", safetyIndex: 42, healthcareIndex: 72, climateComfort: 45, pollutionIndex: 40, infrastructureQuality: 72, greenSpaceAccess: 65 },
  { city: "San Francisco", country: "US", safetyIndex: 40, healthcareIndex: 78, climateComfort: 72, pollutionIndex: 35, infrastructureQuality: 72, greenSpaceAccess: 72 },
  { city: "Boston", country: "US", safetyIndex: 55, healthcareIndex: 82, climateComfort: 50, pollutionIndex: 32, infrastructureQuality: 75, greenSpaceAccess: 68 },
  { city: "Seattle", country: "US", safetyIndex: 48, healthcareIndex: 78, climateComfort: 58, pollutionIndex: 30, infrastructureQuality: 72, greenSpaceAccess: 75 },
  { city: "Miami", country: "US", safetyIndex: 45, healthcareIndex: 68, climateComfort: 72, pollutionIndex: 38, infrastructureQuality: 62, greenSpaceAccess: 55 },
  { city: "Toronto", country: "CA", safetyIndex: 62, healthcareIndex: 75, climateComfort: 48, pollutionIndex: 28, infrastructureQuality: 75, greenSpaceAccess: 68 },
  { city: "Vancouver", country: "CA", safetyIndex: 60, healthcareIndex: 78, climateComfort: 62, pollutionIndex: 25, infrastructureQuality: 72, greenSpaceAccess: 82 },
  { city: "Montreal", country: "CA", safetyIndex: 64, healthcareIndex: 72, climateComfort: 45, pollutionIndex: 25, infrastructureQuality: 68, greenSpaceAccess: 72 },

  // Western Europe
  { city: "London", country: "GB", safetyIndex: 55, healthcareIndex: 78, climateComfort: 48, pollutionIndex: 45, infrastructureQuality: 82, greenSpaceAccess: 72 },
  { city: "Manchester", country: "GB", safetyIndex: 50, healthcareIndex: 75, climateComfort: 42, pollutionIndex: 38, infrastructureQuality: 72, greenSpaceAccess: 68 },
  { city: "Edinburgh", country: "GB", safetyIndex: 62, healthcareIndex: 78, climateComfort: 38, pollutionIndex: 25, infrastructureQuality: 72, greenSpaceAccess: 78 },
  { city: "Berlin", country: "DE", safetyIndex: 60, healthcareIndex: 80, climateComfort: 48, pollutionIndex: 32, infrastructureQuality: 82, greenSpaceAccess: 78 },
  { city: "Munich", country: "DE", safetyIndex: 78, healthcareIndex: 82, climateComfort: 52, pollutionIndex: 25, infrastructureQuality: 85, greenSpaceAccess: 82 },
  { city: "Paris", country: "FR", safetyIndex: 52, healthcareIndex: 82, climateComfort: 55, pollutionIndex: 42, infrastructureQuality: 80, greenSpaceAccess: 58 },
  { city: "Amsterdam", country: "NL", safetyIndex: 68, healthcareIndex: 80, climateComfort: 50, pollutionIndex: 28, infrastructureQuality: 85, greenSpaceAccess: 75 },
  { city: "Brussels", country: "BE", safetyIndex: 52, healthcareIndex: 78, climateComfort: 48, pollutionIndex: 35, infrastructureQuality: 72, greenSpaceAccess: 62 },
  { city: "Zurich", country: "CH", safetyIndex: 82, healthcareIndex: 85, climateComfort: 52, pollutionIndex: 18, infrastructureQuality: 90, greenSpaceAccess: 80 },
  { city: "Vienna", country: "AT", safetyIndex: 80, healthcareIndex: 82, climateComfort: 52, pollutionIndex: 20, infrastructureQuality: 88, greenSpaceAccess: 82 },
  { city: "Dublin", country: "IE", safetyIndex: 58, healthcareIndex: 72, climateComfort: 42, pollutionIndex: 22, infrastructureQuality: 68, greenSpaceAccess: 72 },

  // Nordic
  { city: "Stockholm", country: "SE", safetyIndex: 62, healthcareIndex: 80, climateComfort: 40, pollutionIndex: 18, infrastructureQuality: 82, greenSpaceAccess: 82 },
  { city: "Oslo", country: "NO", safetyIndex: 68, healthcareIndex: 82, climateComfort: 35, pollutionIndex: 15, infrastructureQuality: 82, greenSpaceAccess: 85 },
  { city: "Copenhagen", country: "DK", safetyIndex: 72, healthcareIndex: 80, climateComfort: 42, pollutionIndex: 18, infrastructureQuality: 85, greenSpaceAccess: 80 },
  { city: "Helsinki", country: "FI", safetyIndex: 78, healthcareIndex: 80, climateComfort: 32, pollutionIndex: 12, infrastructureQuality: 82, greenSpaceAccess: 85 },

  // Southern Europe
  { city: "Rome", country: "IT", safetyIndex: 55, healthcareIndex: 72, climateComfort: 72, pollutionIndex: 45, infrastructureQuality: 58, greenSpaceAccess: 52 },
  { city: "Milan", country: "IT", safetyIndex: 58, healthcareIndex: 78, climateComfort: 55, pollutionIndex: 52, infrastructureQuality: 72, greenSpaceAccess: 50 },
  { city: "Madrid", country: "ES", safetyIndex: 65, healthcareIndex: 78, climateComfort: 68, pollutionIndex: 35, infrastructureQuality: 72, greenSpaceAccess: 62 },
  { city: "Barcelona", country: "ES", safetyIndex: 55, healthcareIndex: 78, climateComfort: 78, pollutionIndex: 38, infrastructureQuality: 75, greenSpaceAccess: 58 },
  { city: "Lisbon", country: "PT", safetyIndex: 72, healthcareIndex: 72, climateComfort: 78, pollutionIndex: 28, infrastructureQuality: 65, greenSpaceAccess: 58 },
  { city: "Athens", country: "GR", safetyIndex: 58, healthcareIndex: 62, climateComfort: 75, pollutionIndex: 48, infrastructureQuality: 55, greenSpaceAccess: 45 },

  // Central & Eastern Europe
  { city: "Prague", country: "CZ", safetyIndex: 72, healthcareIndex: 72, climateComfort: 48, pollutionIndex: 35, infrastructureQuality: 68, greenSpaceAccess: 65 },
  { city: "Warsaw", country: "PL", safetyIndex: 68, healthcareIndex: 58, climateComfort: 48, pollutionIndex: 45, infrastructureQuality: 62, greenSpaceAccess: 55 },
  { city: "Budapest", country: "HU", safetyIndex: 65, healthcareIndex: 55, climateComfort: 52, pollutionIndex: 40, infrastructureQuality: 60, greenSpaceAccess: 55 },
  { city: "Bucharest", country: "RO", safetyIndex: 58, healthcareIndex: 48, climateComfort: 50, pollutionIndex: 50, infrastructureQuality: 48, greenSpaceAccess: 42 },
  { city: "Tallinn", country: "EE", safetyIndex: 72, healthcareIndex: 65, climateComfort: 38, pollutionIndex: 18, infrastructureQuality: 72, greenSpaceAccess: 72 },

  // Asia-Pacific
  { city: "Tokyo", country: "JP", safetyIndex: 85, healthcareIndex: 85, climateComfort: 55, pollutionIndex: 38, infrastructureQuality: 92, greenSpaceAccess: 48 },
  { city: "Osaka", country: "JP", safetyIndex: 82, healthcareIndex: 82, climateComfort: 55, pollutionIndex: 35, infrastructureQuality: 88, greenSpaceAccess: 45 },
  { city: "Seoul", country: "KR", safetyIndex: 75, healthcareIndex: 78, climateComfort: 50, pollutionIndex: 55, infrastructureQuality: 85, greenSpaceAccess: 48 },
  { city: "Singapore", country: "SG", safetyIndex: 85, healthcareIndex: 82, climateComfort: 45, pollutionIndex: 30, infrastructureQuality: 92, greenSpaceAccess: 68 },
  { city: "Hong Kong", country: "HK", safetyIndex: 78, healthcareIndex: 78, climateComfort: 48, pollutionIndex: 42, infrastructureQuality: 88, greenSpaceAccess: 42 },
  { city: "Taipei", country: "TW", safetyIndex: 82, healthcareIndex: 80, climateComfort: 52, pollutionIndex: 35, infrastructureQuality: 82, greenSpaceAccess: 52 },
  { city: "Shanghai", country: "CN", safetyIndex: 70, healthcareIndex: 62, climateComfort: 48, pollutionIndex: 62, infrastructureQuality: 78, greenSpaceAccess: 42 },
  { city: "Beijing", country: "CN", safetyIndex: 72, healthcareIndex: 60, climateComfort: 42, pollutionIndex: 75, infrastructureQuality: 80, greenSpaceAccess: 38 },
  { city: "Bangkok", country: "TH", safetyIndex: 58, healthcareIndex: 55, climateComfort: 42, pollutionIndex: 62, infrastructureQuality: 55, greenSpaceAccess: 32 },
  { city: "Kuala Lumpur", country: "MY", safetyIndex: 55, healthcareIndex: 60, climateComfort: 45, pollutionIndex: 52, infrastructureQuality: 62, greenSpaceAccess: 42 },
  { city: "Ho Chi Minh City", country: "VN", safetyIndex: 52, healthcareIndex: 42, climateComfort: 40, pollutionIndex: 62, infrastructureQuality: 42, greenSpaceAccess: 28 },
  { city: "Jakarta", country: "ID", safetyIndex: 48, healthcareIndex: 42, climateComfort: 38, pollutionIndex: 72, infrastructureQuality: 38, greenSpaceAccess: 22 },
  { city: "Manila", country: "PH", safetyIndex: 42, healthcareIndex: 40, climateComfort: 42, pollutionIndex: 65, infrastructureQuality: 35, greenSpaceAccess: 20 },

  // South Asia
  { city: "Mumbai", country: "IN", safetyIndex: 48, healthcareIndex: 45, climateComfort: 42, pollutionIndex: 72, infrastructureQuality: 38, greenSpaceAccess: 18 },
  { city: "Delhi", country: "IN", safetyIndex: 40, healthcareIndex: 42, climateComfort: 35, pollutionIndex: 85, infrastructureQuality: 40, greenSpaceAccess: 15 },
  { city: "Bangalore", country: "IN", safetyIndex: 52, healthcareIndex: 55, climateComfort: 62, pollutionIndex: 58, infrastructureQuality: 42, greenSpaceAccess: 28 },
  { city: "Colombo", country: "LK", safetyIndex: 55, healthcareIndex: 48, climateComfort: 48, pollutionIndex: 58, infrastructureQuality: 35, greenSpaceAccess: 32 },
  { city: "Dhaka", country: "BD", safetyIndex: 35, healthcareIndex: 28, climateComfort: 32, pollutionIndex: 82, infrastructureQuality: 22, greenSpaceAccess: 10 },

  // Middle East
  { city: "Dubai", country: "AE", safetyIndex: 85, healthcareIndex: 72, climateComfort: 30, pollutionIndex: 42, infrastructureQuality: 88, greenSpaceAccess: 35 },
  { city: "Abu Dhabi", country: "AE", safetyIndex: 88, healthcareIndex: 75, climateComfort: 28, pollutionIndex: 38, infrastructureQuality: 85, greenSpaceAccess: 38 },
  { city: "Riyadh", country: "SA", safetyIndex: 72, healthcareIndex: 62, climateComfort: 22, pollutionIndex: 55, infrastructureQuality: 68, greenSpaceAccess: 18 },
  { city: "Doha", country: "QA", safetyIndex: 82, healthcareIndex: 68, climateComfort: 25, pollutionIndex: 48, infrastructureQuality: 78, greenSpaceAccess: 28 },
  { city: "Tel Aviv", country: "IL", safetyIndex: 62, healthcareIndex: 78, climateComfort: 72, pollutionIndex: 35, infrastructureQuality: 72, greenSpaceAccess: 52 },
  { city: "Istanbul", country: "TR", safetyIndex: 55, healthcareIndex: 58, climateComfort: 62, pollutionIndex: 52, infrastructureQuality: 60, greenSpaceAccess: 38 },
  { city: "Cairo", country: "EG", safetyIndex: 42, healthcareIndex: 38, climateComfort: 42, pollutionIndex: 72, infrastructureQuality: 35, greenSpaceAccess: 15 },

  // Sub-Saharan Africa
  { city: "Cape Town", country: "ZA", safetyIndex: 32, healthcareIndex: 55, climateComfort: 78, pollutionIndex: 28, infrastructureQuality: 55, greenSpaceAccess: 62 },
  { city: "Johannesburg", country: "ZA", safetyIndex: 25, healthcareIndex: 52, climateComfort: 68, pollutionIndex: 40, infrastructureQuality: 52, greenSpaceAccess: 48 },
  { city: "Nairobi", country: "KE", safetyIndex: 30, healthcareIndex: 35, climateComfort: 72, pollutionIndex: 42, infrastructureQuality: 32, greenSpaceAccess: 38 },
  { city: "Lagos", country: "NG", safetyIndex: 22, healthcareIndex: 22, climateComfort: 42, pollutionIndex: 72, infrastructureQuality: 18, greenSpaceAccess: 12 },
  { city: "Accra", country: "GH", safetyIndex: 45, healthcareIndex: 32, climateComfort: 52, pollutionIndex: 52, infrastructureQuality: 28, greenSpaceAccess: 25 },
  { city: "Addis Ababa", country: "ET", safetyIndex: 38, healthcareIndex: 25, climateComfort: 68, pollutionIndex: 45, infrastructureQuality: 22, greenSpaceAccess: 28 },
  { city: "Kigali", country: "RW", safetyIndex: 58, healthcareIndex: 32, climateComfort: 72, pollutionIndex: 25, infrastructureQuality: 35, greenSpaceAccess: 42 },
  { city: "Dar es Salaam", country: "TZ", safetyIndex: 38, healthcareIndex: 28, climateComfort: 45, pollutionIndex: 48, infrastructureQuality: 22, greenSpaceAccess: 22 },

  // Latin America
  { city: "São Paulo", country: "BR", safetyIndex: 30, healthcareIndex: 55, climateComfort: 62, pollutionIndex: 48, infrastructureQuality: 52, greenSpaceAccess: 38 },
  { city: "Rio de Janeiro", country: "BR", safetyIndex: 25, healthcareIndex: 52, climateComfort: 72, pollutionIndex: 42, infrastructureQuality: 45, greenSpaceAccess: 52 },
  { city: "Buenos Aires", country: "AR", safetyIndex: 38, healthcareIndex: 62, climateComfort: 65, pollutionIndex: 35, infrastructureQuality: 55, greenSpaceAccess: 55 },
  { city: "Santiago", country: "CL", safetyIndex: 48, healthcareIndex: 62, climateComfort: 68, pollutionIndex: 42, infrastructureQuality: 62, greenSpaceAccess: 52 },
  { city: "Bogotá", country: "CO", safetyIndex: 35, healthcareIndex: 55, climateComfort: 60, pollutionIndex: 45, infrastructureQuality: 45, greenSpaceAccess: 38 },
  { city: "Lima", country: "PE", safetyIndex: 32, healthcareIndex: 48, climateComfort: 55, pollutionIndex: 52, infrastructureQuality: 38, greenSpaceAccess: 28 },
  { city: "Mexico City", country: "MX", safetyIndex: 32, healthcareIndex: 55, climateComfort: 65, pollutionIndex: 62, infrastructureQuality: 52, greenSpaceAccess: 35 },
  { city: "Montevideo", country: "UY", safetyIndex: 52, healthcareIndex: 65, climateComfort: 62, pollutionIndex: 25, infrastructureQuality: 58, greenSpaceAccess: 58 },
  { city: "San José", country: "CR", safetyIndex: 45, healthcareIndex: 58, climateComfort: 72, pollutionIndex: 32, infrastructureQuality: 45, greenSpaceAccess: 55 },

  // Oceania
  { city: "Sydney", country: "AU", safetyIndex: 62, healthcareIndex: 80, climateComfort: 78, pollutionIndex: 22, infrastructureQuality: 78, greenSpaceAccess: 78 },
  { city: "Melbourne", country: "AU", safetyIndex: 65, healthcareIndex: 82, climateComfort: 62, pollutionIndex: 20, infrastructureQuality: 78, greenSpaceAccess: 82 },
  { city: "Brisbane", country: "AU", safetyIndex: 62, healthcareIndex: 78, climateComfort: 72, pollutionIndex: 18, infrastructureQuality: 72, greenSpaceAccess: 75 },
  { city: "Auckland", country: "NZ", safetyIndex: 60, healthcareIndex: 78, climateComfort: 65, pollutionIndex: 15, infrastructureQuality: 72, greenSpaceAccess: 80 },
  { city: "Wellington", country: "NZ", safetyIndex: 65, healthcareIndex: 78, climateComfort: 52, pollutionIndex: 12, infrastructureQuality: 72, greenSpaceAccess: 82 },

  // Additional cities
  { city: "Reykjavik", country: "IS", safetyIndex: 78, healthcareIndex: 78, climateComfort: 25, pollutionIndex: 10, infrastructureQuality: 75, greenSpaceAccess: 72 },
  { city: "Canberra", country: "AU", safetyIndex: 68, healthcareIndex: 80, climateComfort: 60, pollutionIndex: 15, infrastructureQuality: 75, greenSpaceAccess: 85 },
  { city: "Luxembourg", country: "LU", safetyIndex: 75, healthcareIndex: 80, climateComfort: 48, pollutionIndex: 20, infrastructureQuality: 82, greenSpaceAccess: 75 },
  { city: "Lausanne", country: "CH", safetyIndex: 80, healthcareIndex: 85, climateComfort: 55, pollutionIndex: 15, infrastructureQuality: 88, greenSpaceAccess: 78 },
];
