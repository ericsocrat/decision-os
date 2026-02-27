/**
 * CollapsibleSection — reusable expanding/collapsing section wrapper.
 *
 * Features:
 * - Smooth CSS transition via grid-template-rows: 0fr/1fr
 * - Chevron icon rotates on toggle
 * - Expansion state persisted to localStorage
 * - Keyboard accessible (Enter/Space toggle)
 * - ARIA: aria-expanded, aria-controls, role="region"
 * - Print: all sections force-expanded via @media print
 */

"use client";

import { memo, useCallback, useEffect, useId, useState } from "react";
import { ChevronRight } from "lucide-react";

const STORAGE_KEY = "decisionos:section-state";

function loadSectionStates(): Record<string, boolean> {
  if (typeof globalThis.localStorage === "undefined") return {};
  try {
    return JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSectionState(id: string, expanded: boolean): void {
  if (typeof globalThis.localStorage === "undefined") return;
  try {
    const states = loadSectionStates();
    states[id] = expanded;
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch {
    // Quota or security error — ignore silently
  }
}

export interface CollapsibleSectionProps {
  /** Unique key for localStorage persistence */
  readonly sectionId: string;
  /** Section heading text */
  readonly title: React.ReactNode;
  /** Accessible label (falls back to title if title is a string) */
  readonly ariaLabel?: string;
  /** Optional icon to render before the title */
  readonly icon?: React.ReactNode;
  /** Whether the section starts expanded (default: false) */
  readonly defaultExpanded?: boolean;
  /** Optional badge text shown next to the title */
  readonly badge?: string;
  /** Controlled expanded state — overrides internal state */
  readonly expanded?: boolean;
  /** Called when the section is toggled */
  readonly onToggle?: (expanded: boolean) => void;
  /** Section content */
  readonly children: React.ReactNode;
}

export const CollapsibleSection = memo(function CollapsibleSection({
  sectionId,
  title,
  ariaLabel,
  icon,
  defaultExpanded = false,
  badge,
  expanded: controlledExpanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const regionId = useId();

  // Determine initial state: localStorage > defaultExpanded
  const [internalExpanded, setInternalExpanded] = useState(() => {
    const saved = loadSectionStates()[sectionId];
    return saved !== undefined ? saved : defaultExpanded;
  });

  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const toggle = useCallback(() => {
    const next = !isExpanded;
    setInternalExpanded(next);
    saveSectionState(sectionId, next);
    onToggle?.(next);
  }, [isExpanded, sectionId, onToggle]);

  // Sync controlled state to localStorage
  useEffect(() => {
    if (controlledExpanded !== undefined) {
      saveSectionState(sectionId, controlledExpanded);
    }
  }, [controlledExpanded, sectionId]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden print:border-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isExpanded}
        aria-controls={regionId}
        className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset transition-colors"
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            isExpanded ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        />
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="flex-1">{title}</span>
        {badge && (
          <span className="ml-2 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
            {badge}
          </span>
        )}
      </button>

      <div
        id={regionId}
        role="region"
        aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
        className={`grid transition-[grid-template-rows] duration-300 ease-out print:!grid-rows-[1fr] ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// AdvancedSectionsGroup — wraps multiple CollapsibleSections with Expand All
// ---------------------------------------------------------------------------

export interface AdvancedSectionsGroupProps {
  readonly children: React.ReactNode;
  /** IDs of all sections in this group */
  readonly sectionIds: readonly string[];
  /** Called when "Expand All" / "Collapse All" is toggled, with the new state per ID */
  readonly onExpandAll?: (expanded: boolean) => void;
}

export const AdvancedSectionsGroup = memo(function AdvancedSectionsGroup({
  children,
  sectionIds,
  onExpandAll,
}: AdvancedSectionsGroupProps) {
  const [allExpanded, setAllExpanded] = useState(false);

  const handleToggleAll = useCallback(() => {
    const next = !allExpanded;
    setAllExpanded(next);
    for (const id of sectionIds) {
      saveSectionState(id, next);
    }
    onExpandAll?.(next);
  }, [allExpanded, sectionIds, onExpandAll]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Advanced Analysis
        </h3>
        <button
          type="button"
          onClick={handleToggleAll}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition-colors"
        >
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>
      {children}
    </div>
  );
});
