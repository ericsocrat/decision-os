"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

interface CriterionTooltipProps {
  /** The description text to show in the tooltip. */
  readonly description: string;
  /** The criterion name (used for aria-label). */
  readonly criterionName: string;
}

/**
 * Accessible, keyboard-navigable tooltip for criterion descriptions.
 *
 * - Shows on hover, focus, AND touch (tap focuses button → shows tooltip).
 * - Uses `aria-describedby` + `role="tooltip"` for screen readers.
 * - Smooth fade-in/out via CSS transitions.
 * - Auto-dismisses on Escape key or blur.
 */
export function CriterionTooltip({ description, criterionName }: CriterionTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    // Small delay to allow moving from trigger to tooltip
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    },
    [open]
  );

  return (
    <span className="relative inline-flex items-center" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        aria-label={`Description for ${criterionName}`}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onFocus={show}
        onBlur={hide}
        onKeyDown={handleKeyDown}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 w-48 rounded-md bg-gray-900 dark:bg-gray-700 px-3 py-2 text-[11px] font-normal normal-case tracking-normal text-white shadow-lg text-left transition-opacity duration-150 pointer-events-none ${
          open ? "opacity-100" : "opacity-0 invisible"
        }`}
      >
        {description}
      </span>
    </span>
  );
}
