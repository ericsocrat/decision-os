/**
 * Toast notification component for transient messages.
 *
 * Displays a brief message at the bottom of the screen, auto-dismisses
 * after `duration` ms. Supports an optional action button (e.g. "Undo").
 *
 * @see https://github.com/ericsocrat/decision-os/issues/8
 */

"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export interface ToastMessage {
  id: string;
  text: string;
  action?: { label: string; onClick: () => void };
  duration?: number; // default 3000ms
}

interface ToastProviderProps {
  children: ReactNode;
}

type ShowToast = (msg: Omit<ToastMessage, "id">) => void;

let globalShowToast: ShowToast | null = null;

/**
 * Imperatively show a toast from anywhere.
 * Must be called after ToastProvider mounts.
 */
export function showToast(msg: Omit<ToastMessage, "id">) {
  globalShowToast?.(msg);
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show: ShowToast = useCallback(
    (msg) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = msg.duration ?? 3000;
      setToasts((prev) => [...prev.slice(-4), { ...msg, id }]); // keep max 5
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  // Register the global imperative handle
  useEffect(() => {
    globalShowToast = show;
    return () => {
      globalShowToast = null;
    };
  }, [show]);

  // Cleanup timers on unmount
  useEffect(() => {
    const t = timers.current;
    return () => {
      for (const timer of t.values()) clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {children}

      {/* Toast container — fixed bottom center */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
          aria-atomic="false"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-center gap-3 rounded-lg bg-gray-900 dark:bg-gray-100 px-4 py-3 text-sm text-white dark:text-gray-900 shadow-lg animate-slide-up min-w-[260px] max-w-[420px]"
              role="status"
              onMouseEnter={() => {
                // Pause auto-dismiss on hover
                const timer = timers.current.get(toast.id);
                if (timer) {
                  clearTimeout(timer);
                  timers.current.delete(toast.id);
                }
              }}
              onMouseLeave={() => {
                // Resume auto-dismiss
                const timer = setTimeout(() => dismiss(toast.id), 1500);
                timers.current.set(toast.id, timer);
              }}
            >
              <span className="flex-1">{toast.text}</span>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    dismiss(toast.id);
                  }}
                  className="font-semibold text-blue-400 dark:text-blue-600 hover:underline shrink-0"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                onClick={() => dismiss(toast.id)}
                className="text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-900 shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
