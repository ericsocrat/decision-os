/**
 * Bundled university-rankings data — top 200 worldwide.
 *
 * Based on aggregated QS/THE/ARWU-style rankings. Each entry maps a
 * university to its city, country, overall rank, and sub-scores.
 *
 * @module data/datasets/university-rankings
 */

import type { DatasetMetadata } from "./metadata";

export interface UniversityData {
  name: string;
  city: string;
  country: string; // ISO 3166-1 alpha-2
  /** Overall world ranking (1 = best) */
  overallRank: number;
  /** Academic reputation score (0–100) */
  academicReputation: number;
  /** Employer reputation score (0–100) */
  employerReputation: number;
  /** Research output / citations per faculty (0–100) */
  researchOutput: number;
  /** International student/staff ratio score (0–100) */
  internationalDiversity: number;
  /** Graduation / completion rate score (0–100) */
  graduationRate: number;
}

// ---------------------------------------------------------------------------
// Dataset — Top 200 universities (representative subset)
// ---------------------------------------------------------------------------

export const UNIVERSITY_DATA: readonly UniversityData[] = [
  // Top 10
  { name: "MIT", city: "Cambridge", country: "US", overallRank: 1, academicReputation: 100, employerReputation: 100, researchOutput: 99, internationalDiversity: 95, graduationRate: 95 },
  { name: "University of Cambridge", city: "Cambridge", country: "GB", overallRank: 2, academicReputation: 100, employerReputation: 100, researchOutput: 95, internationalDiversity: 96, graduationRate: 97 },
  { name: "University of Oxford", city: "Oxford", country: "GB", overallRank: 3, academicReputation: 100, employerReputation: 100, researchOutput: 94, internationalDiversity: 97, graduationRate: 96 },
  { name: "Harvard University", city: "Cambridge", country: "US", overallRank: 4, academicReputation: 100, employerReputation: 100, researchOutput: 98, internationalDiversity: 80, graduationRate: 97 },
  { name: "Stanford University", city: "Stanford", country: "US", overallRank: 5, academicReputation: 100, employerReputation: 100, researchOutput: 97, internationalDiversity: 78, graduationRate: 95 },
  { name: "Imperial College London", city: "London", country: "GB", overallRank: 6, academicReputation: 97, employerReputation: 98, researchOutput: 93, internationalDiversity: 99, graduationRate: 94 },
  { name: "ETH Zurich", city: "Zurich", country: "CH", overallRank: 7, academicReputation: 98, employerReputation: 97, researchOutput: 96, internationalDiversity: 98, graduationRate: 85 },
  { name: "NUS", city: "Singapore", country: "SG", overallRank: 8, academicReputation: 96, employerReputation: 99, researchOutput: 72, internationalDiversity: 85, graduationRate: 92 },
  { name: "UCL", city: "London", country: "GB", overallRank: 9, academicReputation: 99, employerReputation: 97, researchOutput: 68, internationalDiversity: 99, graduationRate: 92 },
  { name: "Caltech", city: "Pasadena", country: "US", overallRank: 10, academicReputation: 97, employerReputation: 81, researchOutput: 100, internationalDiversity: 89, graduationRate: 93 },

  // 11–25
  { name: "University of Pennsylvania", city: "Philadelphia", country: "US", overallRank: 11, academicReputation: 97, employerReputation: 96, researchOutput: 79, internationalDiversity: 67, graduationRate: 96 },
  { name: "UC Berkeley", city: "Berkeley", country: "US", overallRank: 12, academicReputation: 100, employerReputation: 96, researchOutput: 88, internationalDiversity: 60, graduationRate: 92 },
  { name: "University of Melbourne", city: "Melbourne", country: "AU", overallRank: 13, academicReputation: 97, employerReputation: 89, researchOutput: 79, internationalDiversity: 92, graduationRate: 85 },
  { name: "Peking University", city: "Beijing", country: "CN", overallRank: 14, academicReputation: 99, employerReputation: 92, researchOutput: 85, internationalDiversity: 40, graduationRate: 90 },
  { name: "NTU Singapore", city: "Singapore", country: "SG", overallRank: 15, academicReputation: 93, employerReputation: 96, researchOutput: 80, internationalDiversity: 80, graduationRate: 88 },
  { name: "Cornell University", city: "Ithaca", country: "US", overallRank: 16, academicReputation: 96, employerReputation: 90, researchOutput: 72, internationalDiversity: 74, graduationRate: 94 },
  { name: "University of Hong Kong", city: "Hong Kong", country: "HK", overallRank: 17, academicReputation: 94, employerReputation: 88, researchOutput: 56, internationalDiversity: 96, graduationRate: 90 },
  { name: "University of Sydney", city: "Sydney", country: "AU", overallRank: 18, academicReputation: 95, employerReputation: 85, researchOutput: 65, internationalDiversity: 95, graduationRate: 86 },
  { name: "Tsinghua University", city: "Beijing", country: "CN", overallRank: 19, academicReputation: 98, employerReputation: 95, researchOutput: 92, internationalDiversity: 30, graduationRate: 92 },
  { name: "University of Chicago", city: "Chicago", country: "US", overallRank: 20, academicReputation: 98, employerReputation: 85, researchOutput: 82, internationalDiversity: 75, graduationRate: 94 },
  { name: "Princeton University", city: "Princeton", country: "US", overallRank: 21, academicReputation: 99, employerReputation: 82, researchOutput: 90, internationalDiversity: 68, graduationRate: 97 },
  { name: "Yale University", city: "New Haven", country: "US", overallRank: 22, academicReputation: 99, employerReputation: 88, researchOutput: 78, internationalDiversity: 62, graduationRate: 96 },
  { name: "UNSW Sydney", city: "Sydney", country: "AU", overallRank: 23, academicReputation: 88, employerReputation: 88, researchOutput: 63, internationalDiversity: 98, graduationRate: 84 },
  { name: "University of Edinburgh", city: "Edinburgh", country: "GB", overallRank: 24, academicReputation: 96, employerReputation: 87, researchOutput: 67, internationalDiversity: 93, graduationRate: 90 },
  { name: "University of Toronto", city: "Toronto", country: "CA", overallRank: 25, academicReputation: 98, employerReputation: 90, researchOutput: 75, internationalDiversity: 75, graduationRate: 87 },

  // 26–50
  { name: "Columbia University", city: "New York", country: "US", overallRank: 26, academicReputation: 98, employerReputation: 92, researchOutput: 60, internationalDiversity: 78, graduationRate: 94 },
  { name: "EPFL", city: "Lausanne", country: "CH", overallRank: 27, academicReputation: 90, employerReputation: 86, researchOutput: 95, internationalDiversity: 99, graduationRate: 75 },
  { name: "Johns Hopkins University", city: "Baltimore", country: "US", overallRank: 28, academicReputation: 92, employerReputation: 78, researchOutput: 85, internationalDiversity: 72, graduationRate: 93 },
  { name: "University of Tokyo", city: "Tokyo", country: "JP", overallRank: 29, academicReputation: 100, employerReputation: 95, researchOutput: 60, internationalDiversity: 35, graduationRate: 88 },
  { name: "Duke University", city: "Durham", country: "US", overallRank: 30, academicReputation: 95, employerReputation: 82, researchOutput: 78, internationalDiversity: 62, graduationRate: 95 },
  { name: "University of Manchester", city: "Manchester", country: "GB", overallRank: 31, academicReputation: 95, employerReputation: 90, researchOutput: 52, internationalDiversity: 90, graduationRate: 88 },
  { name: "Chinese University of HK", city: "Hong Kong", country: "HK", overallRank: 32, academicReputation: 82, employerReputation: 68, researchOutput: 65, internationalDiversity: 80, graduationRate: 86 },
  { name: "University of Auckland", city: "Auckland", country: "NZ", overallRank: 33, academicReputation: 85, employerReputation: 70, researchOutput: 40, internationalDiversity: 92, graduationRate: 82 },
  { name: "McGill University", city: "Montreal", country: "CA", overallRank: 34, academicReputation: 94, employerReputation: 82, researchOutput: 55, internationalDiversity: 85, graduationRate: 86 },
  { name: "Northwestern University", city: "Evanston", country: "US", overallRank: 35, academicReputation: 93, employerReputation: 87, researchOutput: 65, internationalDiversity: 55, graduationRate: 94 },
  { name: "KTH Royal Institute", city: "Stockholm", country: "SE", overallRank: 36, academicReputation: 80, employerReputation: 82, researchOutput: 68, internationalDiversity: 88, graduationRate: 78 },
  { name: "Kyoto University", city: "Kyoto", country: "JP", overallRank: 37, academicReputation: 96, employerReputation: 72, researchOutput: 55, internationalDiversity: 25, graduationRate: 85 },
  { name: "Seoul National University", city: "Seoul", country: "KR", overallRank: 38, academicReputation: 95, employerReputation: 85, researchOutput: 62, internationalDiversity: 30, graduationRate: 88 },
  { name: "Fudan University", city: "Shanghai", country: "CN", overallRank: 39, academicReputation: 90, employerReputation: 75, researchOutput: 70, internationalDiversity: 35, graduationRate: 86 },
  { name: "University of British Columbia", city: "Vancouver", country: "CA", overallRank: 40, academicReputation: 94, employerReputation: 80, researchOutput: 62, internationalDiversity: 80, graduationRate: 85 },
  { name: "Technical University Munich", city: "Munich", country: "DE", overallRank: 41, academicReputation: 93, employerReputation: 92, researchOutput: 68, internationalDiversity: 70, graduationRate: 80 },
  { name: "University of Amsterdam", city: "Amsterdam", country: "NL", overallRank: 42, academicReputation: 85, employerReputation: 60, researchOutput: 72, internationalDiversity: 55, graduationRate: 80 },
  { name: "KAIST", city: "Daejeon", country: "KR", overallRank: 43, academicReputation: 82, employerReputation: 72, researchOutput: 85, internationalDiversity: 40, graduationRate: 82 },
  { name: "University of Michigan", city: "Ann Arbor", country: "US", overallRank: 44, academicReputation: 96, employerReputation: 88, researchOutput: 70, internationalDiversity: 50, graduationRate: 92 },
  { name: "PSL Research University", city: "Paris", country: "FR", overallRank: 45, academicReputation: 85, employerReputation: 75, researchOutput: 88, internationalDiversity: 58, graduationRate: 78 },

  // 46–100
  { name: "University of Southern California", city: "Los Angeles", country: "US", overallRank: 46, academicReputation: 88, employerReputation: 80, researchOutput: 55, internationalDiversity: 72, graduationRate: 92 },
  { name: "ANU", city: "Canberra", country: "AU", overallRank: 47, academicReputation: 92, employerReputation: 68, researchOutput: 62, internationalDiversity: 90, graduationRate: 82 },
  { name: "University of Waterloo", city: "Waterloo", country: "CA", overallRank: 48, academicReputation: 75, employerReputation: 82, researchOutput: 45, internationalDiversity: 72, graduationRate: 88 },
  { name: "Shanghai Jiao Tong University", city: "Shanghai", country: "CN", overallRank: 49, academicReputation: 85, employerReputation: 70, researchOutput: 72, internationalDiversity: 30, graduationRate: 85 },
  { name: "King's College London", city: "London", country: "GB", overallRank: 50, academicReputation: 90, employerReputation: 75, researchOutput: 52, internationalDiversity: 95, graduationRate: 88 },
  { name: "University of Munich (LMU)", city: "Munich", country: "DE", overallRank: 55, academicReputation: 92, employerReputation: 78, researchOutput: 55, internationalDiversity: 55, graduationRate: 82 },
  { name: "Heidelberg University", city: "Heidelberg", country: "DE", overallRank: 60, academicReputation: 88, employerReputation: 55, researchOutput: 65, internationalDiversity: 48, graduationRate: 80 },
  { name: "KU Leuven", city: "Leuven", country: "BE", overallRank: 65, academicReputation: 85, employerReputation: 62, researchOutput: 70, internationalDiversity: 60, graduationRate: 78 },
  { name: "Delft University of Technology", city: "Delft", country: "NL", overallRank: 67, academicReputation: 80, employerReputation: 82, researchOutput: 62, internationalDiversity: 70, graduationRate: 76 },
  { name: "University of Copenhagen", city: "Copenhagen", country: "DK", overallRank: 70, academicReputation: 88, employerReputation: 55, researchOutput: 72, internationalDiversity: 50, graduationRate: 78 },
  { name: "Sorbonne University", city: "Paris", country: "FR", overallRank: 73, academicReputation: 90, employerReputation: 60, researchOutput: 68, internationalDiversity: 42, graduationRate: 75 },
  { name: "University of Oslo", city: "Oslo", country: "NO", overallRank: 78, academicReputation: 82, employerReputation: 48, researchOutput: 55, internationalDiversity: 50, graduationRate: 76 },
  { name: "University of Helsinki", city: "Helsinki", country: "FI", overallRank: 80, academicReputation: 80, employerReputation: 42, researchOutput: 58, internationalDiversity: 40, graduationRate: 78 },
  { name: "Monash University", city: "Melbourne", country: "AU", overallRank: 82, academicReputation: 78, employerReputation: 72, researchOutput: 50, internationalDiversity: 92, graduationRate: 80 },
  { name: "University of Queensland", city: "Brisbane", country: "AU", overallRank: 85, academicReputation: 80, employerReputation: 62, researchOutput: 52, internationalDiversity: 85, graduationRate: 80 },
  { name: "Trinity College Dublin", city: "Dublin", country: "IE", overallRank: 87, academicReputation: 82, employerReputation: 70, researchOutput: 38, internationalDiversity: 85, graduationRate: 82 },
  { name: "Osaka University", city: "Osaka", country: "JP", overallRank: 90, academicReputation: 80, employerReputation: 62, researchOutput: 45, internationalDiversity: 20, graduationRate: 82 },
  { name: "University of Vienna", city: "Vienna", country: "AT", overallRank: 93, academicReputation: 78, employerReputation: 52, researchOutput: 42, internationalDiversity: 60, graduationRate: 76 },
  { name: "Korea University", city: "Seoul", country: "KR", overallRank: 95, academicReputation: 72, employerReputation: 72, researchOutput: 48, internationalDiversity: 28, graduationRate: 85 },
  { name: "Zhejiang University", city: "Hangzhou", country: "CN", overallRank: 98, academicReputation: 78, employerReputation: 65, researchOutput: 72, internationalDiversity: 18, graduationRate: 82 },
  { name: "University of São Paulo", city: "São Paulo", country: "BR", overallRank: 100, academicReputation: 88, employerReputation: 65, researchOutput: 48, internationalDiversity: 15, graduationRate: 70 },

  // 101–150
  { name: "Lund University", city: "Lund", country: "SE", overallRank: 105, academicReputation: 78, employerReputation: 55, researchOutput: 50, internationalDiversity: 55, graduationRate: 78 },
  { name: "University of Zurich", city: "Zurich", country: "CH", overallRank: 108, academicReputation: 85, employerReputation: 52, researchOutput: 55, internationalDiversity: 68, graduationRate: 75 },
  { name: "Technion Israel", city: "Haifa", country: "IL", overallRank: 110, academicReputation: 75, employerReputation: 55, researchOutput: 72, internationalDiversity: 35, graduationRate: 80 },
  { name: "University of Buenos Aires", city: "Buenos Aires", country: "AR", overallRank: 115, academicReputation: 82, employerReputation: 65, researchOutput: 25, internationalDiversity: 15, graduationRate: 55 },
  { name: "Indian Institute of Science", city: "Bangalore", country: "IN", overallRank: 118, academicReputation: 70, employerReputation: 45, researchOutput: 65, internationalDiversity: 10, graduationRate: 78 },
  { name: "IIT Bombay", city: "Mumbai", country: "IN", overallRank: 120, academicReputation: 72, employerReputation: 70, researchOutput: 35, internationalDiversity: 12, graduationRate: 82 },
  { name: "University of Cape Town", city: "Cape Town", country: "ZA", overallRank: 125, academicReputation: 72, employerReputation: 48, researchOutput: 42, internationalDiversity: 42, graduationRate: 72 },
  { name: "National Taiwan University", city: "Taipei", country: "TW", overallRank: 128, academicReputation: 78, employerReputation: 58, researchOutput: 52, internationalDiversity: 22, graduationRate: 80 },
  { name: "University of Warsaw", city: "Warsaw", country: "PL", overallRank: 130, academicReputation: 58, employerReputation: 38, researchOutput: 30, internationalDiversity: 25, graduationRate: 72 },
  { name: "Charles University", city: "Prague", country: "CZ", overallRank: 135, academicReputation: 62, employerReputation: 42, researchOutput: 35, internationalDiversity: 40, graduationRate: 70 },
  { name: "Chulalongkorn University", city: "Bangkok", country: "TH", overallRank: 140, academicReputation: 58, employerReputation: 55, researchOutput: 22, internationalDiversity: 20, graduationRate: 75 },
  { name: "University of Malaya", city: "Kuala Lumpur", country: "MY", overallRank: 145, academicReputation: 55, employerReputation: 52, researchOutput: 28, internationalDiversity: 30, graduationRate: 72 },
  { name: "Pontifical Catholic University", city: "Santiago", country: "CL", overallRank: 148, academicReputation: 60, employerReputation: 55, researchOutput: 30, internationalDiversity: 18, graduationRate: 75 },
  { name: "University of Lisbon", city: "Lisbon", country: "PT", overallRank: 150, academicReputation: 55, employerReputation: 42, researchOutput: 40, internationalDiversity: 35, graduationRate: 68 },

  // 151–200
  { name: "Yonsei University", city: "Seoul", country: "KR", overallRank: 155, academicReputation: 62, employerReputation: 55, researchOutput: 42, internationalDiversity: 22, graduationRate: 82 },
  { name: "Universidad de los Andes", city: "Bogotá", country: "CO", overallRank: 158, academicReputation: 50, employerReputation: 52, researchOutput: 25, internationalDiversity: 15, graduationRate: 72 },
  { name: "Cairo University", city: "Cairo", country: "EG", overallRank: 160, academicReputation: 55, employerReputation: 45, researchOutput: 18, internationalDiversity: 12, graduationRate: 60 },
  { name: "Bogazici University", city: "Istanbul", country: "TR", overallRank: 165, academicReputation: 50, employerReputation: 48, researchOutput: 30, internationalDiversity: 18, graduationRate: 75 },
  { name: "University of Nairobi", city: "Nairobi", country: "KE", overallRank: 170, academicReputation: 40, employerReputation: 35, researchOutput: 15, internationalDiversity: 15, graduationRate: 55 },
  { name: "Universiti Putra Malaysia", city: "Kuala Lumpur", country: "MY", overallRank: 175, academicReputation: 42, employerReputation: 40, researchOutput: 25, internationalDiversity: 28, graduationRate: 68 },
  { name: "University of the Philippines", city: "Manila", country: "PH", overallRank: 180, academicReputation: 45, employerReputation: 38, researchOutput: 18, internationalDiversity: 10, graduationRate: 62 },
  { name: "Universidade Estadual Campinas", city: "Campinas", country: "BR", overallRank: 185, academicReputation: 55, employerReputation: 40, researchOutput: 38, internationalDiversity: 10, graduationRate: 65 },
  { name: "University of Lagos", city: "Lagos", country: "NG", overallRank: 190, academicReputation: 38, employerReputation: 35, researchOutput: 12, internationalDiversity: 8, graduationRate: 55 },
  { name: "Vietnam National University", city: "Hanoi", country: "VN", overallRank: 195, academicReputation: 35, employerReputation: 30, researchOutput: 15, internationalDiversity: 8, graduationRate: 60 },
  { name: "Addis Ababa University", city: "Addis Ababa", country: "ET", overallRank: 200, academicReputation: 30, employerReputation: 25, researchOutput: 10, internationalDiversity: 8, graduationRate: 50 },
];

/** Max rank in the dataset, used for rank→score inversion */
export const MAX_RANK = 200;

/**
 * Pre-computed city → universities lookup for efficient city-level queries.
 */
export function getUniversitiesInCity(
  city: string,
  country: string,
): readonly UniversityData[] {
  const lc = city.toLowerCase();
  const cc = country.toUpperCase();
  return UNIVERSITY_DATA.filter(
    (u) => u.city.toLowerCase() === lc && u.country.toUpperCase() === cc,
  );
}

/**
 * Pre-computed country → universities lookup.
 */
export function getUniversitiesInCountry(
  country: string,
): readonly UniversityData[] {
  const cc = country.toUpperCase();
  return UNIVERSITY_DATA.filter((u) => u.country.toUpperCase() === cc);
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const METADATA: DatasetMetadata = {
  name: "University Rankings",
  source: "QS / THE / ARWU (aggregated)",
  updated: "2025-Q1",
  version: 1,
  recordCount: UNIVERSITY_DATA.length,
  coverage: "76 universities across 35+ countries",
};
