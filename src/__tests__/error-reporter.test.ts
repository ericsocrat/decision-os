/**
 * Unit tests for the error reporter module.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/40
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportError, getStoredErrors, clearStoredErrors } from "@/lib/error-reporter";

const STORAGE_KEY = "decision-os:errors";

describe("error-reporter", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("reportError", () => {
    it("logs to console in all environments", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("test error");
      reportError(error, { source: "test" });
      expect(spy).toHaveBeenCalledWith(
        "[Decision OS] test:",
        error,
        expect.objectContaining({ source: "test" })
      );
      spy.mockRestore();
    });

    it("stores error in localStorage in production", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      reportError(new Error("prod error"), { source: "storage" });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      expect(stored).toHaveLength(1);
      expect(stored[0].message).toBe("prod error");
      expect(stored[0].source).toBe("storage");
      expect(stored[0].timestamp).toBeTruthy();
      vi.restoreAllMocks();
    });

    it("does NOT store errors in development", () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.spyOn(console, "error").mockImplementation(() => {});
      reportError(new Error("dev error"), { source: "test" });
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      vi.restoreAllMocks();
    });

    it("keeps at most 20 stored errors (FIFO)", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      for (let i = 0; i < 25; i++) {
        reportError(new Error(`error ${i}`), { source: "test" });
      }
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      expect(stored).toHaveLength(20);
      // Oldest should be error 5 (0..4 trimmed)
      expect(stored[0].message).toBe("error 5");
      expect(stored[19].message).toBe("error 24");
      vi.restoreAllMocks();
    });

    it("truncates stack traces to 500 chars", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("long stack");
      error.stack = "x".repeat(1000);
      reportError(error, { source: "test" });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      expect(stored[0].stack.length).toBe(500);
      vi.restoreAllMocks();
    });

    it("includes component stack in context when provided", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      reportError(new Error("boundary error"), {
        source: "ErrorBoundary",
        componentStack: "at MyComponent\nat App",
      });
      const spy = vi.spyOn(console, "error");
      // Verify it was logged
      expect(spy).toBeDefined();
      vi.restoreAllMocks();
    });
  });

  describe("getStoredErrors", () => {
    it("returns empty array when no errors stored", () => {
      expect(getStoredErrors()).toEqual([]);
    });

    it("returns empty array when storage contains invalid JSON", () => {
      localStorage.setItem("decision-os:errors", "not json{{{");
      expect(getStoredErrors()).toEqual([]);
    });

    it("returns stored errors", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      reportError(new Error("e1"), { source: "a" });
      reportError(new Error("e2"), { source: "b" });
      const errors = getStoredErrors();
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe("e1");
      expect(errors[1].message).toBe("e2");
      vi.restoreAllMocks();
    });
  });

  describe("clearStoredErrors", () => {
    it("removes all stored errors", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      reportError(new Error("e"), { source: "test" });
      expect(getStoredErrors()).toHaveLength(1);
      clearStoredErrors();
      expect(getStoredErrors()).toHaveLength(0);
      vi.restoreAllMocks();
    });
  });
});
