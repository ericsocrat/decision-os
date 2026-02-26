/**
 * Production error telemetry for Decision OS.
 *
 * Provides a unified `reportError()` function that:
 * 1. Always logs to console
 * 2. Stores errors in localStorage for diagnostics (max 20, FIFO)
 * 3. Forwards to Sentry when NEXT_PUBLIC_SENTRY_DSN is configured
 *
 * No user PII is captured — Decision OS has no accounts.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/40
 */

export interface ErrorContext {
  /** Origin of the error (e.g. "ErrorBoundary", "storage", "import") */
  source: string;
  /** React component stack, if available */
  componentStack?: string;
  /** Additional key-value metadata */
  [key: string]: unknown;
}

interface StoredError {
  message: string;
  stack?: string;
  source: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const STORAGE_KEY = "decision-os:errors";
const MAX_STORED_ERRORS = 20;

/**
 * Report a runtime error for telemetry/diagnostics.
 *
 * - In development: console.error only.
 * - In production: logs to console + stores in localStorage.
 * - If Sentry SDK is loaded: also reports to Sentry.
 */
export function reportError(error: Error, context?: ErrorContext): void {
  const source = context?.source ?? "unknown";

  // Always log to console
  console.error(`[Decision OS] ${source}:`, error, context);

  // In dev, don't persist or report externally
  if (process.env.NODE_ENV === "development") return;

  // Store in localStorage for diagnostics
  storeError(error, context);

  // Forward to Sentry if available
  forwardToSentry(error, context);
}

/**
 * Store error in localStorage, keeping at most MAX_STORED_ERRORS (FIFO).
 */
function storeError(error: Error, context?: ErrorContext): void {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    const errors: StoredError[] = raw ? JSON.parse(raw) : [];

    errors.push({
      message: error.message,
      stack: error.stack?.slice(0, 500),
      source: context?.source ?? "unknown",
      timestamp: new Date().toISOString(),
      context: context
        ? Object.fromEntries(
            Object.entries(context).filter(([k]) => k !== "source" && k !== "componentStack")
          )
        : undefined,
    });

    // Keep last N entries
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(-MAX_STORED_ERRORS)));
  } catch {
    // Fire and forget — don't let error reporting cause errors
  }
}

/**
 * Forward to Sentry SDK if it's loaded on the page.
 * Sentry is loaded via @sentry/nextjs when NEXT_PUBLIC_SENTRY_DSN is set.
 */
function forwardToSentry(error: Error, context?: ErrorContext): void {
  try {
    // Dynamic import check — Sentry may not be present
    const Sentry = (globalThis as Record<string, unknown>).__SENTRY__;
    if (Sentry && typeof (Sentry as Record<string, unknown>).captureException === "function") {
      (Sentry as { captureException: (e: Error, ctx?: unknown) => void }).captureException(error, {
        extra: {
          source: context?.source,
          componentStack: context?.componentStack,
        },
      });
    }
  } catch {
    // Fire and forget
  }
}

/**
 * Get stored errors from localStorage (for diagnostics/debugging).
 */
export function getStoredErrors(): StoredError[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear stored errors from localStorage.
 */
export function clearStoredErrors(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Fire and forget
  }
}
