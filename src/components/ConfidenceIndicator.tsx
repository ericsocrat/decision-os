/**
 * Data confidence indicator — visual badge showing the reliability
 * tier and confidence level of enriched scores.
 *
 * Three visual states:
 * - **High** (Tier 1, ≥ 0.8): green indicator — live API data
 * - **Medium** (Tier 2, 0.5–0.79): yellow indicator — bundled dataset
 * - **Low** (Tier 3, < 0.5): orange indicator — estimated/regional
 *
 * Includes a tooltip with source, tier, confidence %, and last-updated date.
 * Only renders for enriched or overridden score cells.
 *
 * @module components/ConfidenceIndicator
 */

"use client";

import { ShieldCheck, Database, BarChart3 } from "lucide-react";
import type { ScoreMetadata } from "@/lib/types";

// ---------------------------------------------------------------------------
// Confidence level resolution
// ---------------------------------------------------------------------------

type ConfidenceLevel = "high" | "medium" | "low";

interface LevelConfig {
  readonly level: ConfidenceLevel;
  readonly label: string;
  readonly description: string;
  readonly icon: typeof ShieldCheck;
  readonly colorClasses: string;
}

function buildDescription(prefix: string, source: string | undefined, fallback?: string): string {
  if (source) return `${prefix} from ${source}`;
  return fallback ?? prefix;
}

function resolveLevel(meta: ScoreMetadata): LevelConfig {
  const tier = meta.enrichedTier ?? 3;
  if (tier === 1) {
    return {
      level: "high",
      label: "High confidence",
      description: buildDescription("Live data", meta.enrichedSource),
      icon: ShieldCheck,
      colorClasses: "text-green-600 dark:text-green-400",
    };
  }
  if (tier === 2) {
    return {
      level: "medium",
      label: "Medium confidence",
      description: buildDescription("Bundled data", meta.enrichedSource),
      icon: Database,
      colorClasses: "text-yellow-600 dark:text-yellow-400",
    };
  }
  return {
    level: "low",
    label: "Low confidence",
    description: buildDescription("Estimated", meta.enrichedSource, "Estimated from regional data"),
    icon: BarChart3,
    colorClasses: "text-orange-500 dark:text-orange-400",
  };
}

function buildTooltip(meta: ScoreMetadata, config: LevelConfig): string {
  const parts: string[] = [config.label];
  parts.push(config.description);
  if (meta.enrichedTier) parts.push(`Tier ${meta.enrichedTier}`);
  if (meta.enrichedValue !== undefined) parts.push(`Value: ${meta.enrichedValue}`);
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConfidenceIndicatorProps {
  /** Score metadata (renders nothing if undefined or manual provenance) */
  readonly metadata: ScoreMetadata | undefined;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConfidenceIndicator({ metadata }: ConfidenceIndicatorProps) {
  // Only render for enriched or overridden cells
  if (!metadata || metadata.provenance === "manual") return null;

  const config = resolveLevel(metadata);
  const Icon = config.icon;
  const tooltip = buildTooltip(metadata, config);

  return (
    <span
      className={`inline-flex items-center ${config.colorClasses}`}
      title={tooltip}
      aria-label={tooltip}
      data-confidence={config.level}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}
