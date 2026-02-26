/**
 * Tests for BiasWarnings component.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BiasWarnings } from "@/components/BiasWarnings";
import type { BiasWarning } from "@/lib/bias-detection";

const MOCK_WARNINGS: BiasWarning[] = [
  {
    type: "halo-effect",
    severity: "warning",
    title: "Possible Halo Effect",
    description: "Option A scores highest on most criteria.",
    suggestion: "Re-evaluate each criterion independently.",
    affectedOptions: ["o1"],
  },
  {
    type: "weight-uniformity",
    severity: "info",
    title: "Uniform Weights",
    description: "All criteria weights are nearly equal.",
    suggestion: "Consider prioritizing criteria by importance.",
    affectedCriteria: ["c1", "c2"],
  },
  {
    type: "single-criterion-dominance",
    severity: "critical",
    title: "Single Criterion Dominance",
    description: "Removing one criterion changes the winner.",
    suggestion: "Review if this criterion deserves this weight.",
    affectedCriteria: ["c1"],
  },
];

describe("BiasWarnings", () => {
  it("renders nothing when warnings array is empty", () => {
    const { container } = render(
      <BiasWarnings warnings={[]} onDismiss={vi.fn()} onDismissAll={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders all warnings", () => {
    render(<BiasWarnings warnings={MOCK_WARNINGS} onDismiss={vi.fn()} onDismissAll={vi.fn()} />);
    expect(screen.getByText("Possible Halo Effect")).toBeInTheDocument();
    expect(screen.getByText("Uniform Weights")).toBeInTheDocument();
    expect(screen.getByText("Single Criterion Dominance")).toBeInTheDocument();
  });

  it("shows description and suggestion in normal mode", () => {
    render(<BiasWarnings warnings={MOCK_WARNINGS} onDismiss={vi.fn()} onDismissAll={vi.fn()} />);
    expect(screen.getByText(/Option A scores highest/)).toBeInTheDocument();
    expect(screen.getByText(/Re-evaluate each criterion/)).toBeInTheDocument();
  });

  it("hides description and suggestion in compact mode", () => {
    render(
      <BiasWarnings warnings={MOCK_WARNINGS} onDismiss={vi.fn()} onDismissAll={vi.fn()} compact />
    );
    expect(screen.getByText("Possible Halo Effect")).toBeInTheDocument();
    expect(screen.queryByText(/Option A scores highest/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Re-evaluate each criterion/)).not.toBeInTheDocument();
  });

  it("compact mode shows issue count in header", () => {
    render(
      <BiasWarnings warnings={MOCK_WARNINGS} onDismiss={vi.fn()} onDismissAll={vi.fn()} compact />
    );
    expect(screen.getByText(/Bias Check: 3 issues/)).toBeInTheDocument();
  });

  it("compact mode uses singular for 1 issue", () => {
    render(
      <BiasWarnings
        warnings={[MOCK_WARNINGS[0]]}
        onDismiss={vi.fn()}
        onDismissAll={vi.fn()}
        compact
      />
    );
    expect(screen.getByText(/Bias Check: 1 issue(?!s)/)).toBeInTheDocument();
  });

  it("calls onDismiss with correct type when X is clicked", () => {
    const dismiss = vi.fn();
    render(<BiasWarnings warnings={MOCK_WARNINGS} onDismiss={dismiss} onDismissAll={vi.fn()} />);
    const dismissButton = screen.getByLabelText("Dismiss Possible Halo Effect");
    fireEvent.click(dismissButton);
    expect(dismiss).toHaveBeenCalledWith("halo-effect");
  });

  it("shows 'Dismiss all' button when >1 warning", () => {
    render(<BiasWarnings warnings={MOCK_WARNINGS} onDismiss={vi.fn()} onDismissAll={vi.fn()} />);
    expect(screen.getByLabelText("Dismiss all bias warnings")).toBeInTheDocument();
  });

  it("does not show 'Dismiss all' button for single warning", () => {
    render(
      <BiasWarnings warnings={[MOCK_WARNINGS[0]]} onDismiss={vi.fn()} onDismissAll={vi.fn()} />
    );
    expect(screen.queryByLabelText("Dismiss all bias warnings")).not.toBeInTheDocument();
  });

  it("calls onDismissAll when 'Dismiss all' is clicked", () => {
    const dismissAll = vi.fn();
    render(<BiasWarnings warnings={MOCK_WARNINGS} onDismiss={vi.fn()} onDismissAll={dismissAll} />);
    fireEvent.click(screen.getByLabelText("Dismiss all bias warnings"));
    expect(dismissAll).toHaveBeenCalledOnce();
  });

  it("has role=alert on each warning card", () => {
    render(<BiasWarnings warnings={MOCK_WARNINGS} onDismiss={vi.fn()} onDismissAll={vi.fn()} />);
    expect(screen.getAllByRole("alert")).toHaveLength(3);
  });

  it("has aria-live=polite on container", () => {
    render(<BiasWarnings warnings={MOCK_WARNINGS} onDismiss={vi.fn()} onDismissAll={vi.fn()} />);
    expect(screen.getByTestId("bias-warnings")).toHaveAttribute("aria-live", "polite");
  });

  it("renders header text in normal mode", () => {
    render(<BiasWarnings warnings={MOCK_WARNINGS} onDismiss={vi.fn()} onDismissAll={vi.fn()} />);
    expect(screen.getByText("Decision Quality Insights")).toBeInTheDocument();
  });
});
