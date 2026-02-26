/**
 * Sentry client-side configuration for Decision OS.
 *
 * Initialises the Sentry browser SDK only when NEXT_PUBLIC_SENTRY_DSN is set.
 * No PII is captured — Decision OS has no user accounts.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // Performance monitoring — sample 10% of transactions in production
    tracesSampleRate: 0.1,

    // Session replay — disabled by default (adds ~50 KB)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Only send errors in production
    enabled: process.env.NODE_ENV === "production",

    // Strip PII — Decision OS has no user accounts
    sendDefaultPii: false,

    // Limit breadcrumb noise
    maxBreadcrumbs: 30,

    // Ignore benign errors
    ignoreErrors: [
      // Browser extensions
      /^ResizeObserver loop/,
      /^Non-Error promise rejection/,
      // Network errors from optional Supabase sync
      "Failed to fetch",
      "NetworkError",
      "Load failed",
    ],
  });
}
