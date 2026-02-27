/**
 * Tests for EmptyState component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "@/components/EmptyState";

// Mock requestAnimationFrame to be synchronous in tests
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});

function renderEmptyState(overrides: Partial<Parameters<typeof EmptyState>[0]> = {}) {
  const props = {
    onLoadTemplate: vi.fn(),
    onLoadDemo: vi.fn(),
    onStartBlank: vi.fn(),
    ...overrides,
  };
  const user = userEvent.setup();
  return { user, ...props, ...render(<EmptyState {...props} />) };
}

describe("EmptyState", () => {
  it("renders the hero section with heading", () => {
    renderEmptyState();
    expect(screen.getByText("Make better decisions, faster")).toBeInTheDocument();
  });

  it("renders Start from Scratch and Try Demo buttons", () => {
    renderEmptyState();
    expect(screen.getByTestId("start-blank")).toHaveTextContent("Start from Scratch");
    expect(screen.getByTestId("load-demo")).toHaveTextContent("Try Demo Decision");
  });

  it("renders template cards", () => {
    renderEmptyState();
    // The first template is "Job Offer Comparison"
    expect(screen.getByTestId("template-job-offer")).toBeInTheDocument();
  });

  it("renders feature highlights", () => {
    renderEmptyState();
    expect(screen.getByText("Multi-Framework Scoring")).toBeInTheDocument();
    expect(screen.getByText("Sensitivity & What-If")).toBeInTheDocument();
    expect(screen.getByText("Private & Local-First")).toBeInTheDocument();
    expect(screen.getByText("Monte Carlo Simulation")).toBeInTheDocument();
  });

  it("calls onStartBlank when Start from Scratch is clicked", async () => {
    const { user, onStartBlank } = renderEmptyState();
    await user.click(screen.getByTestId("start-blank"));
    expect(onStartBlank).toHaveBeenCalledOnce();
  });

  it("calls onLoadDemo when Try Demo is clicked", async () => {
    const { user, onLoadDemo } = renderEmptyState();
    await user.click(screen.getByTestId("load-demo"));
    expect(onLoadDemo).toHaveBeenCalledOnce();
  });

  it("calls onLoadTemplate when a template card is clicked", async () => {
    const { user, onLoadTemplate } = renderEmptyState();
    await user.click(screen.getByTestId("template-job-offer"));
    expect(onLoadTemplate).toHaveBeenCalledOnce();
    // Should receive a full Decision object (instantiated from template)
    const decision = (onLoadTemplate as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(decision).toHaveProperty("id");
    expect(decision).toHaveProperty("title");
    expect(decision).toHaveProperty("options");
    expect(decision).toHaveProperty("criteria");
  });

  it("applies fade-out class after an action", async () => {
    const { user } = renderEmptyState();
    const container = screen.getByTestId("empty-state");
    expect(container.className).toContain("opacity-100");

    await user.click(screen.getByTestId("start-blank"));
    expect(container.className).toContain("opacity-0");
  });

  it("has accessible section labels", () => {
    renderEmptyState();
    expect(screen.getByLabelText("Welcome")).toBeInTheDocument();
    expect(screen.getByLabelText("Quick start")).toBeInTheDocument();
    expect(screen.getByLabelText("Templates")).toBeInTheDocument();
    expect(screen.getByLabelText("Features")).toBeInTheDocument();
  });

  it("renders the template heading", () => {
    renderEmptyState();
    expect(screen.getByText("Or start with a template")).toBeInTheDocument();
  });
});
