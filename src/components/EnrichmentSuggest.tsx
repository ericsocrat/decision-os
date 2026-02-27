/**
 * Enrichment suggestion flow — connects the data enrichment engine to the
 * decision builder.
 *
 * Analyses criterion names and option names to propose auto-fill data
 * queries. Users can accept, dismiss, or override enriched scores.
 *
 * @module components/EnrichmentSuggest
 */

"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { Sparkles, Check, X, Loader2, AlertCircle, Database, Globe, BarChart3 } from "lucide-react";
import { useDecision } from "./DecisionProvider";
import { ProviderRegistry } from "@/lib/data/registry";
import { EnrichmentEngine } from "@/lib/data/engine";
import type { DataPoint, DataQuery } from "@/lib/data/provider";
import { CostOfLivingProvider } from "@/lib/data/providers/cost-of-living";
import { TaxEfficiencyProvider } from "@/lib/data/providers/tax-efficiency";
import { QualityOfLifeProvider } from "@/lib/data/providers/quality-of-life";
import { CountryRiskProvider } from "@/lib/data/providers/country-risk";
import { UniversityRankingsProvider } from "@/lib/data/providers/university-rankings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single enrichment suggestion for one criterion */
export interface EnrichmentSuggestion {
  criterionId: string;
  criterionName: string;
  category: string;
  metric: string;
  /** Number of options that can be enriched */
  matchCount: number;
  /** Queries for each option, keyed by optionId */
  queries: ReadonlyMap<string, DataQuery>;
}

/** Result of applying an enrichment suggestion */
interface EnrichmentResult {
  optionId: string;
  optionName: string;
  dataPoint: DataPoint | null;
  error?: string;
}

/** State of an enrichment operation */
type EnrichState = "idle" | "loading" | "done" | "error";

// ---------------------------------------------------------------------------
// Keyword matching (mirrors engine.ts KEYWORD_MAP for criterion detection)
// ---------------------------------------------------------------------------

const KEYWORD_MAP: ReadonlyArray<{
  pattern: RegExp;
  category: string;
  metric: string;
  label: string;
}> = [
  { pattern: /cost.?of.?living|col\b|living.?cost/i, category: "cost-of-living", metric: "overall", label: "Cost of Living" },
  { pattern: /rent|housing/i, category: "cost-of-living", metric: "rent-1br-center", label: "Rent" },
  { pattern: /groceries|food/i, category: "cost-of-living", metric: "groceries-index", label: "Groceries" },
  { pattern: /\btax\b|income.?tax/i, category: "tax", metric: "income-tax-rate", label: "Tax Rate" },
  { pattern: /corporate.?tax|business.?tax/i, category: "tax", metric: "corporate-tax-rate", label: "Corporate Tax" },
  { pattern: /universit|higher.?ed|college/i, category: "university", metric: "overall-rank", label: "University Rankings" },
  { pattern: /safe|crime|security/i, category: "safety", metric: "safety-index", label: "Safety" },
  { pattern: /climate|weather|temperature/i, category: "climate", metric: "climate-comfort", label: "Climate" },
  { pattern: /health|healthcare/i, category: "healthcare", metric: "healthcare-index", label: "Healthcare" },
  { pattern: /internet|connectivity|broadband/i, category: "infrastructure", metric: "internet-monthly", label: "Internet" },
  { pattern: /pollution|air.?quality|environment/i, category: "environment", metric: "pollution-index", label: "Pollution" },
  { pattern: /transport|commut/i, category: "infrastructure", metric: "transport-monthly", label: "Transport" },
];

// ---------------------------------------------------------------------------
// Singleton engine (lazy-initialized)
// ---------------------------------------------------------------------------

let cachedEngine: EnrichmentEngine | undefined;

function getEngine(): EnrichmentEngine {
  if (cachedEngine) return cachedEngine;
  const registry = new ProviderRegistry();
  registry.register(new CostOfLivingProvider());
  registry.register(new TaxEfficiencyProvider());
  registry.register(new QualityOfLifeProvider());
  registry.register(new CountryRiskProvider());
  registry.register(new UniversityRankingsProvider());
  cachedEngine = new EnrichmentEngine(registry);
  return cachedEngine;
}

// ---------------------------------------------------------------------------
// Location extraction helper
// ---------------------------------------------------------------------------

interface ParsedLocation {
  country: string;
  city?: string;
}

function parseOptionLocations(
  options: ReadonlyArray<{ id: string; name: string }>,
): ReadonlyMap<string, ParsedLocation> {
  const result = new Map<string, ParsedLocation>();
  for (const opt of options) {
    const parts = opt.name.split(",").map((s) => s.trim());
    if (parts.length >= 2) {
      result.set(opt.id, { city: parts[0], country: parts[1] });
    } else if (parts[0].length > 0) {
      result.set(opt.id, { country: parts[0] });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tier badge component
// ---------------------------------------------------------------------------

function TierBadge({ tier, confidence }: Readonly<{ tier: 1 | 2 | 3; confidence: number }>) {
  const config = {
    1: { label: "Live", icon: Globe, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    2: { label: "Bundled", icon: Database, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    3: { label: "Estimated", icon: BarChart3, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  }[tier];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
      title={`${config.label} data — ${Math.round(confidence * 100)}% confidence`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Suggestion card (one per criterion)
// ---------------------------------------------------------------------------

interface SuggestionCardProps {
  readonly suggestion: EnrichmentSuggestion;
  readonly onAccept: (suggestion: EnrichmentSuggestion) => void;
  readonly onDismiss: (criterionId: string) => void;
  readonly enrichState: EnrichState;
  readonly results: readonly EnrichmentResult[];
}

function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  enrichState,
  results,
}: Readonly<SuggestionCardProps>) {
  const isLoading = enrichState === "loading";
  const isDone = enrichState === "done";
  const isError = enrichState === "error";

  return (
    <section
      className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-950/20"
      aria-label={`Enrichment suggestion for ${suggestion.criterionName}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Auto-fill <strong>{suggestion.criterionName}</strong> scores for{" "}
            {suggestion.matchCount} {suggestion.matchCount === 1 ? "option" : "options"}?
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Category: {suggestion.category} · Metric: {suggestion.metric}
          </p>
        </div>

        {enrichState === "idle" && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onAccept(suggestion)}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label={`Enrich ${suggestion.criterionName}`}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Enrich
            </button>
            <button
              type="button"
              onClick={() => onDismiss(suggestion.criterionId)}
              className="inline-flex items-center rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label={`Dismiss suggestion for ${suggestion.criterionName}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="text-xs">Enriching…</span>
          </div>
        )}

        {isDone && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400" aria-live="polite">
            <Check className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs">Applied</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400" aria-live="polite">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs">Partial failure</span>
          </div>
        )}
      </div>

      {/* Results after enrichment */}
      {(isDone || isError) && results.length > 0 && (
        <div className="mt-2 space-y-1">
          {results.map((r) => (
            <div
              key={r.optionId}
              className="flex items-center justify-between rounded-md bg-white/60 px-2 py-1 text-xs dark:bg-gray-800/60"
            >
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {r.optionName}
              </span>
              {r.dataPoint ? (
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-gray-900 dark:text-gray-100">
                    {Math.round(r.dataPoint.value)}
                  </span>
                  <TierBadge
                    tier={r.dataPoint.tier}
                    confidence={r.dataPoint.confidence}
                  />
                </div>
              ) : (
                <span className="text-gray-400 italic">
                  {r.error ?? "No data"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EnrichmentSuggest() {
  const { decision, updateScore } = useDecision();
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [enrichStates, setEnrichStates] = useState<
    Map<string, EnrichState>
  >(() => new Map());
  const [enrichResults, setEnrichResults] = useState<
    Map<string, EnrichmentResult[]>
  >(() => new Map());
  const abortRef = useRef<Map<string, AbortController>>(new Map());

  // Cleanup abort controllers on unmount
  useEffect(() => {
    const ref = abortRef.current;
    return () => {
      for (const ctrl of ref.values()) {
        ctrl.abort();
      }
    };
  }, []);

  // Parse locations from option names
  const locations = useMemo(
    () => parseOptionLocations(decision.options),
    [decision.options],
  );

  // Generate suggestions from criteria + options
  const suggestions = useMemo<EnrichmentSuggestion[]>(() => {
    if (decision.options.length === 0 || decision.criteria.length === 0) {
      return [];
    }
    if (locations.size === 0) return [];

    const result: EnrichmentSuggestion[] = [];

    for (const criterion of decision.criteria) {
      // Find matching keyword
      const match = KEYWORD_MAP.find((kw) => kw.pattern.test(criterion.name));
      if (!match) continue;

      // Build queries for each option with a parsed location
      const queries = new Map<string, DataQuery>();
      for (const option of decision.options) {
        const loc = locations.get(option.id);
        if (!loc) continue;
        queries.set(option.id, {
          country: loc.country,
          city: loc.city,
          category: match.category,
          metric: match.metric,
        });
      }

      if (queries.size > 0) {
        result.push({
          criterionId: criterion.id,
          criterionName: criterion.name,
          category: match.category,
          metric: match.metric,
          matchCount: queries.size,
          queries,
        });
      }
    }

    return result;
  }, [decision.criteria, decision.options, locations]);

  // Filter out dismissed suggestions and already-enriched ones
  const visibleSuggestions = useMemo(
    () => suggestions.filter((s) => !dismissed.has(s.criterionId)),
    [suggestions, dismissed],
  );

  // Accept handler — run enrichment for a suggestion
  const handleAccept = useCallback(
    async (suggestion: EnrichmentSuggestion) => {
      const { criterionId } = suggestion;
      const controller = new AbortController();
      abortRef.current.set(criterionId, controller);

      setEnrichStates((prev) => new Map(prev).set(criterionId, "loading"));

      try {
        const engine = getEngine();
        const results: EnrichmentResult[] = [];
        let hasError = false;

        // Process each option's query
        const entries = [...suggestion.queries.entries()];
        const settled = await Promise.allSettled(
          entries.map(([, query]) => engine.enrich(query)),
        );

        for (let i = 0; i < entries.length; i++) {
          const [optionId, ] = entries[i];
          const option = decision.options.find((o) => o.id === optionId);
          const outcome = settled[i];

          if (controller.signal.aborted) return;

          if (outcome.status === "fulfilled" && outcome.value) {
            const dp = outcome.value;
            results.push({
              optionId,
              optionName: option?.name ?? optionId,
              dataPoint: dp,
            });
            // Apply score
            updateScore(optionId, criterionId, Math.round(dp.value));
          } else {
            hasError = true;
            results.push({
              optionId,
              optionName: option?.name ?? optionId,
              dataPoint: null,
              error:
                outcome.status === "rejected"
                  ? "Fetch failed"
                  : "No data available",
            });
          }
        }

        if (!controller.signal.aborted) {
          setEnrichResults((prev) => new Map(prev).set(criterionId, results));
          setEnrichStates((prev) =>
            new Map(prev).set(criterionId, hasError ? "error" : "done"),
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setEnrichStates((prev) => new Map(prev).set(criterionId, "error"));
        }
      } finally {
        abortRef.current.delete(criterionId);
      }
    },
    [decision.options, updateScore],
  );

  // Dismiss handler
  const handleDismiss = useCallback((criterionId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(criterionId);
      return next;
    });
  }, []);

  // Don't render if no suggestions
  if (visibleSuggestions.length === 0) return null;

  return (
    <section
      className="space-y-3"
      aria-label="Data enrichment suggestions"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-500" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Suggest Data
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {visibleSuggestions.length}{" "}
          {visibleSuggestions.length === 1 ? "suggestion" : "suggestions"}{" "}
          available
        </span>
      </div>

      <div className="space-y-2">
        {visibleSuggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.criterionId}
            suggestion={suggestion}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
            enrichState={enrichStates.get(suggestion.criterionId) ?? "idle"}
            results={enrichResults.get(suggestion.criterionId) ?? []}
          />
        ))}
      </div>
    </section>
  );
}
