"use client";

/**
 * HelpTooltip \u2014 Contextual help tooltip with "?" icon.
 *
 * Renders a small "?" badge. On hover/focus shows a floating tooltip
 * with a plain-language explanation from HELP_REGISTRY.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { HELP_REGISTRY, type HelpTopic } from "@/lib/help-content";

// ---------- singleton: only one tooltip open at a time ----------
let closeActive: (() => void) | null = null;

interface TooltipPosition {
  top: number;
  left: number;
  placement: "bottom" | "top";
}

interface HelpTooltipProps {
  /** Key into HELP_REGISTRY */
  topic: HelpTopic;
  /** Optional override for the children (defaults to "?" badge) */
  children?: React.ReactNode;
}

/** Compute tooltip position relative to trigger element. */
function computePosition(trigger: HTMLElement): TooltipPosition {
  const rect = trigger.getBoundingClientRect();
  const GAP = 6;
  const TOOLTIP_H = 80;

  const spaceBelow = window.innerHeight - rect.bottom - GAP - TOOLTIP_H;
  const placement: "bottom" | "top" = spaceBelow < 0 ? "top" : "bottom";

  const top =
    placement === "bottom"
      ? rect.bottom + GAP + window.scrollY
      : rect.top - GAP + window.scrollY;

  const rawLeft = rect.left + rect.width / 2 + window.scrollX;
  const left = Math.max(12, Math.min(rawLeft, window.innerWidth - 12));

  return { top, left, placement };
}

export function HelpTooltip({ topic, children }: HelpTooltipProps) {
  const entry = HELP_REGISTRY[topic];
  const id = useId();
  const tooltipId = `help-tooltip-${id}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Combined state: null = closed, object = open with position
  const [state, setState] = useState<TooltipPosition | null>(null);
  const open = state !== null;

  // ---------- close helper ----------
  const doClose = useCallback(() => {
    setState(null);
    closeActive = null;
  }, []);

  // ---------- open helper ----------
  const doOpen = useCallback(() => {
    if (closeActive) closeActive();
    const pos = triggerRef.current ? computePosition(triggerRef.current) : { top: 0, left: 0, placement: "bottom" as const };
    setState(pos);
    closeActive = doClose;
  }, [doClose]);

  // ---------- keyboard: Escape ----------
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        doClose();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, doClose]);

  // ---------- click-away ----------
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        tooltipRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      doClose();
    };
    document.addEventListener("pointerdown", onClick);
    return () => document.removeEventListener("pointerdown", onClick);
  }, [open, doClose]);

  // ---------- guard ----------
  if (!entry) return null;

  // ---------- render ----------
  const trigger = children ?? (
    <span
      aria-hidden="true"
      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-[9px] font-bold leading-none text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
    >
      ?
    </span>
  );

  const tooltip =
    state &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        data-testid={`help-tooltip-${topic}`}
        className={`
          fixed z-50 max-w-xs rounded-lg bg-gray-900 dark:bg-gray-800
          px-3 py-2.5 text-xs text-white shadow-xl
          ${state.placement === "top" ? "-translate-y-full" : ""}
          -translate-x-1/2
        `}
        style={{ top: state.top, left: state.left }}
      >
        <p className="font-semibold mb-0.5 text-blue-300">{entry.term}</p>
        <p className="leading-relaxed text-gray-200">{entry.short}</p>
      </div>,
      document.body,
    );

  return (
    <span className="inline-flex items-center gap-1">
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-label={`Help: ${entry.term}`}
        data-testid={`help-trigger-${topic}`}
        className="inline-flex cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full"
        onMouseEnter={doOpen}
        onMouseLeave={doClose}
        onFocus={doOpen}
        onBlur={doClose}
        onClick={(e) => {
          e.preventDefault();
          if (open) doClose();
          else doOpen();
        }}
      >
        {trigger}
      </button>
      {tooltip}
    </span>
  );
}
