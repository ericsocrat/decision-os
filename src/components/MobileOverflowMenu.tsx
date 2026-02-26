/**
 * MobileOverflowMenu — kebab-triggered dropdown that houses header actions
 * which don't fit on narrow viewports (< 640 px / Tailwind `sm:`).
 *
 * Features:
 * - Focus trap (Tab cycles through items)
 * - Close on outside click, Escape, or action selection
 * - Smooth open/close CSS transition (150ms)
 * - Full ARIA: `role="menu"`, `role="menuitem"`, `aria-expanded`, `aria-haspopup`
 * - Dark mode compatible
 */

"use client";

import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OverflowMenuItem {
  /** Unique key for React reconciliation. */
  key: string;
  /** Icon rendered to the left. */
  icon: ReactNode;
  /** Label text shown next to the icon. */
  label: string;
  /** Click handler — the menu auto‑closes after invocation. */
  onClick: () => void;
  /** When true the item is hidden (e.g. "Delete" when only one decision). */
  hidden?: boolean;
  /** Render a custom element instead of the default button row. */
  custom?: ReactNode;
  /** When true, a separator line is rendered above this item. */
  separator?: boolean;
}

interface MobileOverflowMenuProps {
  items: OverflowMenuItem[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const MobileOverflowMenu = memo(function MobileOverflowMenu({
  items,
}: MobileOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* ---------- Close on outside click ---------- */
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  /* ---------- Close on Escape ---------- */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  /* ---------- Focus trap ---------- */
  useEffect(() => {
    if (!isOpen) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !menuRef.current) return;

      const focusable = menuRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [role="menuitem"], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  /* ---------- Focus first item on open ---------- */
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const first = menuRef.current.querySelector<HTMLElement>('button[role="menuitem"]');
    // Small rAF delay so the DOM has painted
    requestAnimationFrame(() => first?.focus());
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const close = useCallback(() => setIsOpen(false), []);

  const visibleItems = items.filter((i) => !i.hidden);

  return (
    <div ref={menuRef} className="relative sm:hidden">
      {/* Kebab trigger */}
      <button
        ref={triggerRef}
        onClick={toggle}
        className="inline-flex items-center justify-center rounded-md border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label="More actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {/* Dropdown panel */}
      <div
        className={`absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-800 transition-all duration-150 ${
          isOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
        role="menu"
        aria-orientation="vertical"
      >
        <div className="p-1.5">
          {visibleItems.map((item) => {
            if (item.custom) {
              return (
                <div key={item.key} role="none">
                  {item.separator && (
                    <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                  )}
                  {item.custom}
                </div>
              );
            }

            return (
              <div key={item.key} role="none">
                {item.separator && (
                  <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                )}
                <button
                  role="menuitem"
                  tabIndex={isOpen ? 0 : -1}
                  onClick={() => {
                    item.onClick();
                    close();
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
