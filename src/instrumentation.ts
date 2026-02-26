/**
 * Next.js instrumentation hook — initialises Sentry on the server.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamically import server-side Sentry config
    await import("../sentry.server.config");
  }
}
