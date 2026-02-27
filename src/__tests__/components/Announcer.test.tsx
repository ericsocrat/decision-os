/**
 * Tests for Announcer live-region component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { AnnouncerProvider, useAnnounce } from "@/components/Announcer";
import type { ReactNode } from "react";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function wrapper({ children }: { children: ReactNode }) {
  return <AnnouncerProvider>{children}</AnnouncerProvider>;
}

describe("AnnouncerProvider", () => {
  it("renders children", () => {
    render(
      <AnnouncerProvider>
        <div data-testid="child">Content</div>
      </AnnouncerProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders polite and assertive live regions", () => {
    render(
      <AnnouncerProvider>
        <div />
      </AnnouncerProvider>
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("useAnnounce", () => {
  it("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => useAnnounce());
    }).toThrow("useAnnounce must be used within AnnouncerProvider");
  });

  it("announces polite message", () => {
    const { result } = renderHook(() => useAnnounce(), { wrapper });
    act(() => {
      result.current("Hello polite");
      // Flush requestAnimationFrame queued inside announce()
      vi.advanceTimersByTime(16);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Hello polite");
  });

  it("announces assertive message", () => {
    const { result } = renderHook(() => useAnnounce(), { wrapper });
    act(() => {
      result.current("Alert!", "assertive");
      vi.advanceTimersByTime(16);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Alert!");
  });

  it("clears polite message after 5 seconds", () => {
    const { result } = renderHook(() => useAnnounce(), { wrapper });
    act(() => {
      result.current("Temporary");
      vi.advanceTimersByTime(16);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Temporary");

    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("clears assertive message after 5 seconds", () => {
    const { result } = renderHook(() => useAnnounce(), { wrapper });
    act(() => {
      result.current("Alert!", "assertive");
      vi.advanceTimersByTime(16);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Alert!");

    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("");
  });
});
