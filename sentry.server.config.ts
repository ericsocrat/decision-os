/**
 * Sentry server-side configuration for Decision OS.
 *
 * Initialises the Sentry Node SDK only when NEXT_PUBLIC_SENTRY_DSN is set.
 * This file is imported by instrumentation.ts for Next.js App Router.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,

    // Performance monitoring — sample 10% of transactions
    tracesSampleRate: 0.1,

    // Only send errors in production
    enabled: process.env.NODE_ENV === "production",

    // Strip PII
    sendDefaultPii: false,
  });
}
