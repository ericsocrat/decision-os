/**
 * RetrospectiveView — displays the full decision lifecycle timeline.
 *
 * Shows: journal entries, outcome milestones, and decision metadata in a
 * vertical timeline. Supports filtering by event type, expandable entries,
 * and markdown export.
 */

"use client";

import { useState, useMemo } from "react";
import {
  Clock,
  FileText,
  Lightbulb,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  BookOpen,
} from "lucide-react";
import type { Decision } from "@/lib/types";
import { getEntries } from "@/lib/journal";
import { getOutcome } from "@/lib/outcome-tracking";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Unified event type across journal + outcome sources */
type EventType = "creation" | "note" | "reasoning" | "outcome" | "retrospective" | "implementation" | "follow-up";

interface TimelineItem {
  id: string;
  date: string;
  type: EventType;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Event type → style mapping
// ---------------------------------------------------------------------------

const EVENT_STYLES: Record<EventType, { icon: typeof Clock; color: string; bg: string; border: string; label: string }> = {
  creation:       { icon: Clock,         color: "text-blue-600",   bg: "bg-blue-100 dark:bg-blue-900/30",   border: "border-blue-400", label: "Created" },
  note:           { icon: FileText,      color: "text-gray-600",   bg: "bg-gray-100 dark:bg-gray-800",      border: "border-gray-400", label: "Note" },
  reasoning:      { icon: Lightbulb,     color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30", border: "border-yellow-400", label: "Reasoning" },
  outcome:        { icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-100 dark:bg-green-900/30",  border: "border-green-400", label: "Outcome" },
  retrospective:  { icon: RotateCcw,     color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-400", label: "Retrospective" },
  implementation: { icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-400", label: "Implemented" },
  "follow-up":    { icon: RotateCcw,     color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", border: "border-indigo-400", label: "Follow-up" },
};

const ALL_EVENT_TYPES: EventType[] = ["creation", "note", "reasoning", "outcome", "retrospective", "implementation", "follow-up"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RetrospectiveViewProps {
  decision: Decision;
}

// ---------------------------------------------------------------------------
// Build unified timeline
// ---------------------------------------------------------------------------

function buildTimeline(decision: Decision): TimelineItem[] {
  const items: TimelineItem[] = [];

  // 1. Decision creation
  items.push({
    id: "creation",
    date: decision.createdAt,
    type: "creation",
    title: "Decision Created",
    content: decision.title + (decision.description ? ` — ${decision.description}` : ""),
  });

  // 2. Journal entries
  const entries = getEntries(decision.id);
  for (const entry of entries) {
    items.push({
      id: entry.id,
      date: entry.timestamp,
      type: entry.type as EventType,
      title: EVENT_STYLES[entry.type as EventType]?.label ?? entry.type,
      content: entry.content,
      metadata: entry.metadata as Record<string, unknown> | undefined,
    });
  }

  // 3. Outcome milestones (implementation, follow-ups — avoid duplicating journal-created outcome entries)
  const outcome = getOutcome(decision.id);
  if (outcome) {
    if (outcome.implementedAt) {
      // Only add if no journal entry already covers this
      const hasImplEntry = entries.some((e) => e.content.includes("Implemented decision"));
      if (!hasImplEntry) {
        items.push({
          id: "impl-milestone",
          date: outcome.implementedAt,
          type: "implementation",
          title: "Implemented",
          content: `Decision implemented on ${new Date(outcome.implementedAt).toLocaleDateString()}.`,
        });
      }
    }
  }

  // Sort chronologically
  return items.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

// ---------------------------------------------------------------------------
// Markdown export
// ---------------------------------------------------------------------------

function timelineToMarkdown(items: TimelineItem[], decision: Decision): string {
  const lines: string[] = [
    `# Decision Retrospective: ${decision.title}`,
    "",
    `**Created:** ${new Date(decision.createdAt).toLocaleDateString()}`,
    "",
    "---",
    "",
    "## Timeline",
    "",
  ];

  for (const item of items) {
    const dateStr = new Date(item.date).toLocaleString();
    const style = EVENT_STYLES[item.type];
    const heading = `### ${style?.label ?? item.type} — ${dateStr}`;
    lines.push(heading, "", item.content);
    if (item.metadata) {
      const meta = item.metadata;
      if (typeof meta.mood === "string") lines.push(`- **Mood:** ${meta.mood}`);
      if (typeof meta.timeSpent === "number") lines.push(`- **Time spent:** ${meta.timeSpent} min`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TimelineContentProps {
  item: TimelineItem;
  expanded: boolean;
  onToggle: () => void;
  isLong: boolean;
}

function TimelineContent({ item, expanded, onToggle, isLong }: Readonly<TimelineContentProps>) {
  if (!isLong) {
    return (
      <p className="text-sm text-gray-700 dark:text-gray-300">
        {item.content}
      </p>
    );
  }

  if (expanded) {
    return (
      <button
        onClick={onToggle}
        className="text-left w-full"
        aria-label="Collapse entry"
      >
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {item.content}
        </p>
        <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-0.5 mt-0.5">
          <ChevronDown className="h-3 w-3" />
          Show less
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      className="text-left w-full"
      aria-label="Expand entry"
    >
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
        {item.content}
      </p>
      <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-0.5 mt-0.5">
        <ChevronRight className="h-3 w-3" />
        Show more
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RetrospectiveView({ decision }: Readonly<RetrospectiveViewProps>) {
  const [activeFilters, setActiveFilters] = useState<Set<EventType>>(new Set(ALL_EVENT_TYPES));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const timeline = useMemo(() => buildTimeline(decision), [decision]);

  const filteredTimeline = useMemo(
    () => timeline.filter((item) => activeFilters.has(item.type)),
    [timeline, activeFilters],
  );

  const toggleFilter = (type: EventType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        // Don't allow removing all filters
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExportMarkdown = () => {
    const md = timelineToMarkdown(filteredTimeline, decision);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `retrospective-${decision.title.replaceAll(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Empty state ─────────────────────────────────────────────────────
  if (timeline.length <= 1) {
    return (
      <section
        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center"
        aria-label="Retrospective View"
        data-testid="retrospective-empty"
      >
        <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
          No History Yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Add journal entries and track outcomes to build your decision story.
        </p>
      </section>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────
  return (
    <section
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4"
      aria-label="Retrospective View"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-purple-600" />
          Decision Retrospective
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((f) => !f)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle filters"
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
          <button
            onClick={handleExportMarkdown}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Export as markdown"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2" data-testid="event-filters">
          {ALL_EVENT_TYPES.map((type) => {
            const style = EVENT_STYLES[type];
            const active = activeFilters.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
                  active
                    ? `${style.bg} ${style.color} border ${style.border}`
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700"
                }`}
                aria-pressed={active}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      <div className="relative space-y-0 pl-6" data-testid="timeline-list">
        {/* Vertical line */}
        <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

        {filteredTimeline.map((item) => {
          const style = EVENT_STYLES[item.type];
          const Icon = style.icon;
          const expanded = expandedIds.has(item.id);
          const isLong = item.content.length > 120;

          return (
            <div
              key={item.id}
              className="relative flex gap-3 py-3 group"
              data-testid="timeline-item"
            >
              {/* Dot */}
              <div
                className={`absolute -left-3.5 top-4 h-3 w-3 rounded-full border-2 ${style.border} ${style.bg}`}
              />

              {/* Content card */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.color}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${style.color}`}>
                        {style.label}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(item.date).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-1">
                      <TimelineContent
                        item={item}
                        expanded={expanded}
                        onToggle={() => toggleExpand(item.id)}
                        isLong={isLong}
                      />
                    </div>

                    {/* Metadata badges */}
                    {item.metadata && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {typeof item.metadata.mood === "string" && (
                          <span className="inline-flex items-center rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                            {item.metadata.mood}
                          </span>
                        )}
                        {typeof item.metadata.timeSpent === "number" && (
                          <span className="inline-flex items-center rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                            {item.metadata.timeSpent} min
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
        {filteredTimeline.length} event{filteredTimeline.length === 1 ? "" : "s"} shown
        {filteredTimeline.length < timeline.length && ` (${timeline.length - filteredTimeline.length} filtered out)`}
      </div>
    </section>
  );
}
