/**
 * Tests for Sentry integration in the error reporter.
 *
 * Verifies that reportError correctly forwards to Sentry
 * when the SDK is initialised, and skips when it's not.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/80
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { reportError } from "@/lib/error-reporter";

// Mock @sentry/nextjs
vi.mock("@sentry/nextjs", () => ({
  isInitialized: vi.fn(),
  captureException: vi.fn(),
}));

describe("Sentry integration", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(Sentry.isInitialized).mockReturnValue(false);
    vi.mocked(Sentry.captureException).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("forwards to Sentry.captureException when SDK is initialised", () => {
    vi.mocked(Sentry.isInitialized).mockReturnValue(true);

    const error = new Error("sentry test");
    reportError(error, { source: "ErrorBoundary", componentStack: "at App" });

    expect(Sentry.captureException).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      extra: {
        source: "ErrorBoundary",
        componentStack: "at App",
      },
    });
  });

  it("does NOT forward to Sentry when SDK is not initialised", () => {
    vi.mocked(Sentry.isInitialized).mockReturnValue(false);

    reportError(new Error("no sentry"), { source: "test" });

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("does NOT forward to Sentry in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.mocked(Sentry.isInitialized).mockReturnValue(true);

    reportError(new Error("dev error"), { source: "test" });

    // In dev mode, reportError returns early before forwardToSentry
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("does not send PII — only source and componentStack in extra", () => {
    vi.mocked(Sentry.isInitialized).mockReturnValue(true);

    reportError(new Error("pii check"), {
      source: "import",
      componentStack: "at Widget",
      sensitiveData: "should-not-appear-in-extra",
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: {
          source: "import",
          componentStack: "at Widget",
        },
      })
    );

    // Verify sensitiveData is NOT in the extra payload
    const callArgs = vi.mocked(Sentry.captureException).mock.calls[0];
    const extra = (callArgs[1] as { extra: Record<string, unknown> }).extra;
    expect(extra).not.toHaveProperty("sensitiveData");
  });

  it("handles undefined context gracefully", () => {
    vi.mocked(Sentry.isInitialized).mockReturnValue(true);

    reportError(new Error("no context"));

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        extra: {
          source: undefined,
          componentStack: undefined,
        },
      })
    );
  });

  it("swallows Sentry errors silently (fire and forget)", () => {
    vi.mocked(Sentry.isInitialized).mockReturnValue(true);
    vi.mocked(Sentry.captureException).mockImplementation(() => {
      throw new Error("Sentry SDK crash");
    });

    // Should not throw
    expect(() => reportError(new Error("test"), { source: "test" })).not.toThrow();
  });
});
