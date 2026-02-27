/**
 * University-rankings data provider.
 *
 * Tier 2 — Bundled dataset (top 200 universities)
 * Tier 3 — Country-level aggregation / estimation
 *
 * Metrics:
 *  • overall-rank         → rank-to-score inversion (rank 1 = 100)
 *  • academic-reputation  → direct 0–100
 *  • employer-reputation   → direct 0–100
 *  • research-output       → direct 0–100
 *  • international-diversity → direct 0–100
 *  • graduation-rate        → direct 0–100
 *  • city-university-density → count of top-200 universities in the city
 *
 * @module data/providers/university-rankings
 */

import { DataProvider } from "../provider";
import type { DataPoint, DataQuery } from "../provider";
import {
  UNIVERSITY_DATA,
  MAX_RANK,
  getUniversitiesInCity,
  getUniversitiesInCountry,
} from "../datasets/university-rankings";
import type { UniversityData } from "../datasets/university-rankings";

// ---------------------------------------------------------------------------
// Metric keys
// ---------------------------------------------------------------------------

const DIRECT_SCORE_METRICS: ReadonlySet<string> = new Set([
  "academic-reputation",
  "employer-reputation",
  "research-output",
  "international-diversity",
  "graduation-rate",
]);

const ALL_METRICS: readonly string[] = [
  "overall-rank",
  ...DIRECT_SCORE_METRICS,
  "city-university-density",
];

const METRIC_UNITS: Readonly<Record<string, string>> = {
  "overall-rank": "rank",
  "academic-reputation": "score",
  "employer-reputation": "score",
  "research-output": "score",
  "international-diversity": "score",
  "graduation-rate": "percent",
  "city-university-density": "count",
};

const METRIC_TO_FIELD: Readonly<Record<string, keyof UniversityData>> = {
  "academic-reputation": "academicReputation",
  "employer-reputation": "employerReputation",
  "research-output": "researchOutput",
  "international-diversity": "internationalDiversity",
  "graduation-rate": "graduationRate",
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class UniversityRankingsProvider extends DataProvider {
  readonly id = "university-rankings";
  readonly name = "University Rankings";
  readonly categories = ["university"] as const;

  supports(query: DataQuery): boolean {
    return (
      query.category === "university" && ALL_METRICS.includes(query.metric)
    );
  }

  protected async fetchData(query: DataQuery): Promise<DataPoint | null> {
    // Tier 2 — bundled city-level lookup
    const bundled = this.lookupBundled(query);
    if (bundled) return bundled;

    // Tier 3 — country-level estimation
    return this.estimateFromCountry(query);
  }

  // ── Tier 2 — bundled lookup ───────────────────────────────────────

  private lookupBundled(query: DataQuery): DataPoint | null {
    if (!query.city) return null;

    const universities = getUniversitiesInCity(query.city, query.country);
    if (universities.length === 0) return null;

    return this.buildPoint(universities, query.metric, 0.85, 2);
  }

  // ── Tier 3 — country-level estimation ─────────────────────────────

  private estimateFromCountry(query: DataQuery): DataPoint | null {
    const universities = getUniversitiesInCountry(query.country);
    if (universities.length === 0) return null;

    return this.buildPoint(universities, query.metric, 0.45, 3);
  }

  // ── Shared point builder ──────────────────────────────────────────

  private buildPoint(
    universities: readonly UniversityData[],
    metric: string,
    confidence: number,
    tier: 2 | 3,
  ): DataPoint | null {
    const source =
      tier === 2 ? this.name : `${this.name} (country estimate)`;

    // City-university-density: count of universities in dataset
    if (metric === "city-university-density") {
      const count = universities.length;
      // Normalize: max density is 5 in our dataset (e.g. London)
      const maxDensity = this.computeMaxCityDensity();
      return {
        value: this.normalize(count, 0, maxDensity),
        rawValue: count,
        unit: "count",
        source,
        confidence,
        tier,
        updatedAt: "2025-01-01T00:00:00Z",
      };
    }

    // Pick best university (lowest rank)
    const best = this.pickBest(universities);

    // Overall-rank: invert rank to score
    if (metric === "overall-rank") {
      const score = this.rankToScore(best.overallRank);
      return {
        value: score,
        rawValue: best.overallRank,
        unit: "rank",
        source,
        confidence,
        tier,
        updatedAt: "2025-01-01T00:00:00Z",
      };
    }

    // Direct score metrics
    const field = METRIC_TO_FIELD[metric];
    if (field === undefined) return null;

    const rawValue = best[field] as number;
    return {
      value: this.normalize(rawValue, 0, 100),
      rawValue,
      unit: METRIC_UNITS[metric] ?? "score",
      source,
      confidence,
      tier,
      updatedAt: "2025-01-01T00:00:00Z",
    };
  }

  /**
   * Convert rank (1 = best) to a 0–100 score.
   * rank 1 → 100, rank MAX_RANK → ~0.5
   */
  private rankToScore(rank: number): number {
    return Math.round(((MAX_RANK - rank + 1) / MAX_RANK) * 100 * 100) / 100;
  }

  /** Find the highest-ranked (lowest rank number) university. */
  private pickBest(
    universities: readonly UniversityData[],
  ): UniversityData {
    let best = universities[0];
    for (const u of universities) {
      if (u.overallRank < best.overallRank) {
        best = u;
      }
    }
    return best;
  }

  /** Compute max city density across the full dataset. */
  private computeMaxCityDensity(): number {
    const counts = new Map<string, number>();
    for (const u of UNIVERSITY_DATA) {
      const key = `${u.city.toLowerCase()}|${u.country.toUpperCase()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let max = 1;
    for (const count of counts.values()) {
      if (count > max) max = count;
    }
    return max;
  }
}
