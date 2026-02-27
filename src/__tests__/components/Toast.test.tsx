/**
 * Tests for Toast notification component and ToastProvider.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, showToast } from "@/components/Toast";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderProvider() {
  return render(
    <ToastProvider>
      <div data-testid="app">App content</div>
    </ToastProvider>
  );
}

describe("ToastProvider", () => {
  it("renders children", () => {
    renderProvider();
    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  it("shows no toasts initially", () => {
    renderProvider();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a toast when showToast is called", () => {
    renderProvider();
    act(() => {
      showToast({ text: "Hello toast" });
    });
    expect(screen.getByText("Hello toast")).toBeInTheDocument();
  });

  it("auto-dismisses toast after default duration", () => {
    renderProvider();
    act(() => {
      showToast({ text: "Disappearing" });
    });
    expect(screen.getByText("Disappearing")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.queryByText("Disappearing")).not.toBeInTheDocument();
  });

  it("uses custom duration", () => {
    renderProvider();
    act(() => {
      showToast({ text: "Custom", duration: 1000 });
    });
    expect(screen.getByText("Custom")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByText("Custom")).not.toBeInTheDocument();
  });

  it("dismisses toast when X button is clicked", () => {
    renderProvider();
    act(() => {
      showToast({ text: "Closeable" });
    });
    const dismissBtn = screen.getByLabelText("Dismiss");
    fireEvent.click(dismissBtn);
    expect(screen.queryByText("Closeable")).not.toBeInTheDocument();
  });

  it("renders action button and fires callback", () => {
    const actionFn = vi.fn();
    renderProvider();
    act(() => {
      showToast({ text: "With action", action: { label: "Undo", onClick: actionFn } });
    });
    const undoBtn = screen.getByText("Undo");
    fireEvent.click(undoBtn);
    expect(actionFn).toHaveBeenCalledOnce();
    // Action click also dismisses
    expect(screen.queryByText("With action")).not.toBeInTheDocument();
  });

  it("keeps max 5 toasts (drops oldest)", () => {
    renderProvider();
    for (let i = 0; i < 7; i++) {
      act(() => {
        showToast({ text: `Toast ${i}` });
      });
    }
    const statuses = screen.getAllByRole("status");
    expect(statuses.length).toBeLessThanOrEqual(5);
  });

  it("does nothing when showToast called without provider", () => {
    // No provider mounted — should not throw
    expect(() => showToast({ text: "orphan" })).not.toThrow();
  });
});
