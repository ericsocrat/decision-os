/**
 * Tests for useWizardMode hook — mode persistence, URL overrides, first visit.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWizardMode } from "@/hooks/useWizardMode";

let originalLocation: Location;

beforeEach(() => {
  localStorage.clear();
  originalLocation = window.location;
});

afterEach(() => {
  // Restore original location
  Object.defineProperty(window, "location", {
    writable: true,
    value: originalLocation,
  });
});

function setSearchParams(search: string) {
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...originalLocation, search },
  });
}

describe("useWizardMode — default behavior", () => {
  it("returns 'guided' mode by default on first visit", () => {
    const { result } = renderHook(() => useWizardMode());
    expect(result.current.mode).toBe("guided");
  });

  it("reports isFirstVisit when no stored preference exists", () => {
    const { result } = renderHook(() => useWizardMode());
    expect(result.current.isFirstVisit).toBe(true);
  });

  it("exposes setMode function", () => {
    const { result } = renderHook(() => useWizardMode());
    expect(typeof result.current.setMode).toBe("function");
  });
});

describe("useWizardMode — localStorage persistence", () => {
  it("persists mode changes to localStorage", () => {
    const { result } = renderHook(() => useWizardMode());
    act(() => {
      result.current.setMode("advanced");
    });
    expect(result.current.mode).toBe("advanced");
    expect(localStorage.getItem("decisionos:wizard-mode")).toBe("advanced");
  });

  it("reads saved mode from localStorage on mount", () => {
    localStorage.setItem("decisionos:wizard-mode", "advanced");
    const { result } = renderHook(() => useWizardMode());
    expect(result.current.mode).toBe("advanced");
  });

  it("reports not first visit when saved mode exists", () => {
    localStorage.setItem("decisionos:wizard-mode", "guided");
    const { result } = renderHook(() => useWizardMode());
    expect(result.current.isFirstVisit).toBe(false);
  });

  it("setMode to guided persists correctly", () => {
    localStorage.setItem("decisionos:wizard-mode", "advanced");
    const { result } = renderHook(() => useWizardMode());
    act(() => {
      result.current.setMode("guided");
    });
    expect(result.current.mode).toBe("guided");
    expect(localStorage.getItem("decisionos:wizard-mode")).toBe("guided");
  });

  it("persists initial mode on first visit effect", () => {
    const { result } = renderHook(() => useWizardMode());
    // After effect runs, localStorage should have the initial mode
    expect(result.current.isFirstVisit).toBe(true);
    expect(localStorage.getItem("decisionos:wizard-mode")).toBe("guided");
  });
});

describe("useWizardMode — URL overrides", () => {
  it("forces advanced mode when ?share= param is present", () => {
    setSearchParams("?share=abc123");
    const { result } = renderHook(() => useWizardMode());
    expect(result.current.mode).toBe("advanced");
  });

  it("respects ?mode=advanced param", () => {
    setSearchParams("?mode=advanced");
    const { result } = renderHook(() => useWizardMode());
    expect(result.current.mode).toBe("advanced");
  });

  it("respects ?mode=guided param", () => {
    setSearchParams("?mode=guided");
    const { result } = renderHook(() => useWizardMode());
    expect(result.current.mode).toBe("guided");
  });

  it("?share= overrides ?mode=guided", () => {
    setSearchParams("?share=abc123&mode=guided");
    const { result } = renderHook(() => useWizardMode());
    expect(result.current.mode).toBe("advanced");
  });

  it("?mode= overrides localStorage", () => {
    localStorage.setItem("decisionos:wizard-mode", "advanced");
    setSearchParams("?mode=guided");
    const { result } = renderHook(() => useWizardMode());
    expect(result.current.mode).toBe("guided");
  });
});
