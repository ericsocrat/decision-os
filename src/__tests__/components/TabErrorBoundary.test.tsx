/**
 * Tests for TabErrorFallback component and tab-level ErrorBoundary isolation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TabErrorFallback } from "@/components/TabErrorFallback";

// Suppress React error boundary console.error in tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Tab explosion");
  return <div>Tab content works</div>;
}

describe("TabErrorFallback", () => {
  it("renders tab name and reassurance message", () => {
    render(<TabErrorFallback tab="Monte Carlo" />);
    expect(screen.getByText("Monte Carlo encountered an error")).toBeInTheDocument();
    expect(
      screen.getByText("Your decision data is safe. Other tabs are unaffected.")
    ).toBeInTheDocument();
  });

  it("renders Try Again button when onReset is provided", () => {
    const onReset = vi.fn();
    render(<TabErrorFallback tab="Results" onReset={onReset} />);
    const btn = screen.getByRole("button", { name: /try again/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("does not render Try Again button when onReset is omitted", () => {
    render(<TabErrorFallback tab="Sensitivity" />);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("has role=alert for screen readers", () => {
    render(<TabErrorFallback tab="Compare" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("Tab-level ErrorBoundary isolation", () => {
  it("crash in one tab does not affect sibling tabs", () => {
    render(
      <div>
        <ErrorBoundary fallback={(reset) => <TabErrorFallback tab="Results" onReset={reset} />}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
        <ErrorBoundary fallback={(reset) => <TabErrorFallback tab="Sensitivity" onReset={reset} />}>
          <div>Sensitivity works</div>
        </ErrorBoundary>
        <div>Builder always works</div>
      </div>
    );

    // Results crashed
    expect(screen.getByText("Results encountered an error")).toBeInTheDocument();
    // Sensitivity and Builder are unaffected
    expect(screen.getByText("Sensitivity works")).toBeInTheDocument();
    expect(screen.getByText("Builder always works")).toBeInTheDocument();
  });

  it("render-prop fallback receives reset callback that works", () => {
    let shouldThrow = true;
    function Crasher() {
      if (shouldThrow) throw new Error("Boom");
      return <div>Recovered tab</div>;
    }

    const { rerender } = render(
      <ErrorBoundary fallback={(reset) => <TabErrorFallback tab="Monte Carlo" onReset={reset} />}>
        <Crasher />
      </ErrorBoundary>
    );

    expect(screen.getByText("Monte Carlo encountered an error")).toBeInTheDocument();

    // Stop throwing and reset
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    rerender(
      <ErrorBoundary fallback={(reset) => <TabErrorFallback tab="Monte Carlo" onReset={reset} />}>
        <Crasher />
      </ErrorBoundary>
    );

    expect(screen.getByText("Recovered tab")).toBeInTheDocument();
  });

  it("ErrorBoundary calls reportError on tab crash", async () => {
    const errorReporter = await import("@/lib/error-reporter");
    const spy = vi.spyOn(errorReporter, "reportError").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={(reset) => <TabErrorFallback tab="Compare" onReset={reset} />}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Tab explosion" }),
      expect.objectContaining({ source: "ErrorBoundary" })
    );

    spy.mockRestore();
  });
});
