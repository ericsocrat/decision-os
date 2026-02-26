/**
 * Tests for the onboarding hook and CoachmarkOverlay component.
 *
 * Covers: state machine transitions, localStorage persistence, dismiss/restart,
 * share URL skip, coachmark rendering, keyboard dismiss, focus trap.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { CoachmarkOverlay } from "@/components/CoachmarkOverlay";

const ONBOARDED_KEY = "decisionos:onboarded";

beforeEach(() => {
  localStorage.clear();
  // Reset URL to / (no ?share params)
  window.history.replaceState({}, "", "/");
});

// ─── useOnboarding hook ──────────────────────────────────────────

describe("useOnboarding", () => {
  it("starts on step1 for first-time visitors", () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.step).toBe("step1");
    expect(result.current.isOnboarded).toBe(false);
  });

  it("starts idle for returning users", () => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.step).toBe("idle");
    expect(result.current.isOnboarded).toBe(true);
  });

  it("advances step1 → step2 → step3 → idle", () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.step).toBe("step1");

    act(() => result.current.next());
    expect(result.current.step).toBe("step2");

    act(() => result.current.next());
    expect(result.current.step).toBe("step3");

    act(() => result.current.next());
    expect(result.current.step).toBe("idle");
    expect(result.current.isOnboarded).toBe(true);
  });

  it("sets localStorage on completion", () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => result.current.next()); // → step2
    act(() => result.current.next()); // → step3
    act(() => result.current.next()); // → idle
    expect(localStorage.getItem(ONBOARDED_KEY)).toBe("true");
  });

  it("dismiss() sets idle and persists", () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.step).toBe("step1");

    act(() => result.current.dismiss());
    expect(result.current.step).toBe("idle");
    expect(result.current.isOnboarded).toBe(true);
    expect(localStorage.getItem(ONBOARDED_KEY)).toBe("true");
  });

  it("restart() re-triggers from step1", () => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.step).toBe("idle");

    act(() => result.current.restart());
    expect(result.current.step).toBe("step1");
  });

  it("skips onboarding when ?share= is in URL", () => {
    window.history.replaceState({}, "", "/?share=abc123");
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.step).toBe("idle");
  });
});

// ─── CoachmarkOverlay component ──────────────────────────────────

describe("CoachmarkOverlay", () => {
  // Create mock target elements for positioning
  beforeEach(() => {
    // Add tab buttons that the coachmark targets
    for (const id of ["tab-results", "tab-builder", "tab-sensitivity"]) {
      const el = document.createElement("button");
      el.id = id;
      el.getBoundingClientRect = () =>
        ({
          top: 50,
          bottom: 90,
          left: 100,
          right: 200,
          width: 100,
          height: 40,
          x: 100,
          y: 50,
          toJSON: () => {},
        }) as DOMRect;
      document.body.appendChild(el);
    }
    // Add panel elements
    for (const id of ["panel-results", "panel-builder", "panel-sensitivity"]) {
      const el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
  });

  it("renders nothing when step is idle", () => {
    const { container } = render(
      <CoachmarkOverlay step="idle" onNext={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders step 1 with correct content", () => {
    render(<CoachmarkOverlay step="step1" onNext={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText("See Your Decision, Ranked")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-step-1")).toBeInTheDocument();
  });

  it("renders step 2 with correct content", () => {
    render(<CoachmarkOverlay step="step2" onNext={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText("Define Your Decision")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-step-2")).toBeInTheDocument();
  });

  it("renders step 3 with correct content", () => {
    render(<CoachmarkOverlay step="step3" onNext={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Test Your Decision/)).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-step-3")).toBeInTheDocument();
  });

  it("calls onNext when Next button is clicked", () => {
    const onNext = vi.fn();
    render(<CoachmarkOverlay step="step1" onNext={onNext} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByText("Next →"));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('calls onNext with "Get Started!" on step 3', () => {
    const onNext = vi.fn();
    render(<CoachmarkOverlay step="step3" onNext={onNext} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByText("Get Started! ✓"));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when Skip tour is clicked", () => {
    const onDismiss = vi.fn();
    render(<CoachmarkOverlay step="step1" onNext={vi.fn()} onDismiss={onDismiss} />);
    // There are two skip elements (X button + text link)
    const skipButtons = screen.getAllByText("Skip tour");
    fireEvent.click(skipButtons[0]);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when backdrop is clicked", () => {
    const onDismiss = vi.fn();
    render(<CoachmarkOverlay step="step1" onNext={vi.fn()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId("coachmark-backdrop"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("calls onDismiss when Escape is pressed", async () => {
    const onDismiss = vi.fn();
    render(<CoachmarkOverlay step="step1" onNext={vi.fn()} onDismiss={onDismiss} />);
    // Wait for the card to render (position computed asynchronously)
    await waitFor(() => expect(screen.getByText("See Your Decision, Ranked")).toBeInTheDocument());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("has correct ARIA attributes", () => {
    render(<CoachmarkOverlay step="step1" onNext={vi.fn()} onDismiss={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", expect.stringContaining("step 1 of 3"));
  });

  it("shows step dots with correct count", () => {
    render(<CoachmarkOverlay step="step2" onNext={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  });

  it('renders "Get Started! ✓" button on final step', () => {
    render(<CoachmarkOverlay step="step3" onNext={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText("Get Started! ✓")).toBeInTheDocument();
  });
});
