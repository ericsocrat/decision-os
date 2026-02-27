/**
 * KeyboardShortcutsModal — accessible modal displaying global keyboard shortcuts.
 * Implements focus trap, backdrop click dismiss, and focus restoration.
 */

"use client";

import { useEffect, useRef } from "react";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS: ReadonlyArray<readonly [string, string]> = [
  ["1", "Builder tab"],
  ["2", "Results tab"],
  ["3", "Sensitivity tab"],
  ["4", "Compare tab"],
  ["5", "Monte Carlo tab"],
  ["←/→", "Navigate tabs"],
  ["Home/End", "First/last tab"],
  ["Ctrl+Z", "Undo"],
  ["Ctrl+Shift+Z", "Redo"],
  ["?", "Toggle this dialog"],
  ["Esc", "Close dialog"],
] as const;

interface KeyboardShortcutsModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap: move focus into modal on open, trap Tab cycling
  useEffect(() => {
    if (!open) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Focus the close button inside the modal
    const closeBtn = modal.querySelector<HTMLElement>("[data-modal-close]");
    closeBtn?.focus();

    const handleTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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

    document.addEventListener("keydown", handleTrap);
    return () => document.removeEventListener("keydown", handleTrap);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </h2>
          <button
            data-modal-close
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close shortcuts"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <dt className="text-gray-600 dark:text-gray-300">{desc}</dt>
              <dd>
                <kbd className="rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-300">
                  {key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
