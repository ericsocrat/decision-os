# ADR-005: Data Enrichment Provider Architecture

## Status

Accepted

## Context

DecisionOS currently relies entirely on manual user input for scoring
criteria. For location-based decisions (the primary use-case) much of
this data — cost-of-living indices, tax rates, university rankings,
safety scores — is publicly available.

We need a pluggable system that can:

1. Pull data from **bundled datasets** (Tier 2) and **live APIs** (Tier 1)
2. Fall back to **estimation** when exact data is unavailable (Tier 3)
3. Normalise heterogeneous raw values onto a common 0–100 scale
4. Cache results to avoid redundant lookups
5. Expose source attribution and confidence for transparency

Options considered:

1. Hard-code each data source directly into UI components
2. Create a provider registry with a common `DataProvider` base class
3. Use a single monolithic "data service" without abstraction

## Decision

**Option 2 — abstract `DataProvider` base class with a provider registry.**

Key components:

- `DataProvider` abstract class (`src/lib/data/provider.ts`) defines
  `fetch()`, `supports()`, cache logic, and `normalize()`.
- `DataPoint` interface: `value` (0–100), `rawValue`, `unit`, `source`,
  `confidence` (0–1), `tier` (1 | 2 | 3), `updatedAt`, `citation?`.
- `DataQuery` interface: `country`, `city?`, `category`, `metric`.
- Each concrete provider (cost-of-living, tax, etc.) extends
  `DataProvider` and implements `fetchData()` + `supports()`.
- A provider registry (issue #104) aggregates providers and routes
  queries.

## Rationale

- **Extensibility** — new data sources are added by subclassing, no
  changes to existing code.
- **Testability** — each provider is independently unit-testable;
  base class cache logic is tested once.
- **Tier system** — lets the UI clearly communicate data freshness
  (live → bundled → estimated).
- **Cache-first** — 24-hour in-memory TTL avoids repeated lookups
  during a single session.
- **Normalisation** — linear min-max mapping keeps all scores on the
  same 0–100 scale used by the scoring engine.

## Consequences

- Every new data source requires a new subclass and registration.
- In-memory cache is lost on page reload; this is acceptable for a
  local-first app where sessions are short.
- The `normalize()` function assumes linear scaling; some metrics may
  need logarithmic or percentile-based normalization in the future.
- Confidence values are provider-reported; there is no cross-provider
  calibration mechanism yet.
