/**
 * Tests for ParetoChart component.
 *
 * Recharts components are mocked to avoid SVG rendering complexity in jsdom.
 * Tests focus on logic: guard states, axis selectors, same-axis warning,
 * legend text, and dominated-option insights.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Decision, DecisionResults } from "@/lib/types";
import type { ParetoResult } from "@/lib/pareto";

/* ---------- mocks ---------- */
const mockComputePareto = vi.fn<() => ParetoResult>();
const mockDefaultAxes = vi.fn<() => [string, string] | null>();

vi.mock("@/lib/pareto", () => ({
  computeParetoFrontier: (...args: unknown[]) => mockComputePareto(...(args as [])),
  defaultAxes: (...args: unknown[]) => mockDefaultAxes(...(args as [])),
}));

// Mock Recharts — render children as plain divs
vi.mock("recharts", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: passthrough,
    ComposedChart: passthrough,
    Scatter: () => <div data-testid="scatter" />,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Line: () => null,
    Cell: () => null,
  };
});

// Must import AFTER mocks are set up
const { ParetoChart } = await import("@/components/ParetoChart");

/* ---------- helpers ---------- */
function makeDecision(criteriaCount: number, optionCount: number): Decision {
  return {
    id: "d1",
    title: "Test",
    options: Array.from({ length: optionCount }, (_, i) => ({
      id: `o${i}`,
      name: `Option ${i}`,
    })),
    criteria: Array.from({ length: criteriaCount }, (_, i) => ({
      id: `c${i}`,
      name: `Criterion ${i}`,
      weight: 5,
      type: "benefit" as const,
    })),
    scores: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function makeResults(optionCount: number): DecisionResults {
  return {
    decisionId: "test",
    optionResults: Array.from({ length: optionCount }, (_, i) => ({
      optionId: `o${i}`,
      optionName: `Option ${i}`,
      totalScore: 8 - i,
      normalizedScore: 1 - i * 0.1,
      rank: i + 1,
      criterionScores: [],
    })),
    topDrivers: [],
  };
}

function defaultPareto(): ParetoResult {
  return {
    points: [
      { optionId: "o0", optionName: "Option 0", x: 8, y: 7, isPareto: true, dominatedBy: [] },
      { optionId: "o1", optionName: "Option 1", x: 5, y: 4, isPareto: false, dominatedBy: ["o0"] },
    ],
    frontier: ["o0"],
    dominated: ["o1"],
    dominanceMap: { o1: ["o0"] },
    xLabel: "Criterion 0",
    yLabel: "Criterion 1",
  };
}

describe("ParetoChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDefaultAxes.mockReturnValue(["c0", "c1"]);
    mockComputePareto.mockReturnValue(defaultPareto());
  });

  /* ── Guards ─────────────────────────────────────────── */
  it("shows message when fewer than 2 criteria", () => {
    render(<ParetoChart decision={makeDecision(1, 3)} results={makeResults(3)} />);
    expect(screen.getByText(/at least 2 criteria/i)).toBeInTheDocument();
  });

  it("shows message when fewer than 2 options", () => {
    render(<ParetoChart decision={makeDecision(3, 1)} results={makeResults(1)} />);
    expect(screen.getByText(/at least 2 options/i)).toBeInTheDocument();
  });

  /* ── Axis selectors ─────────────────────────────────── */
  it("renders axis selector dropdowns with criteria names", () => {
    render(<ParetoChart decision={makeDecision(3, 3)} results={makeResults(3)} />);
    expect(screen.getByText("X Axis:")).toBeInTheDocument();
    expect(screen.getByText("Y Axis:")).toBeInTheDocument();
    // All criteria should appear in each dropdown (2 selects × 3 options)
    const allOptions = screen.getAllByRole("option");
    expect(allOptions.length).toBe(6); // 3 criteria × 2 selects
  });

  it("changes X axis via dropdown", () => {
    const decision = makeDecision(3, 3);
    render(<ParetoChart decision={decision} results={makeResults(3)} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "c2" } });
    expect(mockComputePareto).toHaveBeenCalled();
  });

  /* ── Same axis warning ──────────────────────────────── */
  it("shows warning when X and Y axes are the same", () => {
    mockDefaultAxes.mockReturnValue(["c0", "c0"]);
    render(<ParetoChart decision={makeDecision(3, 3)} results={makeResults(3)} />);
    expect(screen.getByText(/different criteria for X and Y/i)).toBeInTheDocument();
  });

  /* ── Legend ─────────────────────────────────────────── */
  it("renders legend with Pareto-optimal and dominated counts", () => {
    render(<ParetoChart decision={makeDecision(3, 3)} results={makeResults(3)} />);
    expect(screen.getByText(/Pareto-optimal \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Dominated \(1\)/)).toBeInTheDocument();
  });

  /* ── Dominated insights ─────────────────────────────── */
  it("shows dominated option insight text", () => {
    render(<ParetoChart decision={makeDecision(3, 3)} results={makeResults(3)} />);
    // "Option 0" appears multiple times (as dominator name, in score text, etc.)
    expect(screen.getByText(/is dominated by/i)).toBeInTheDocument();
    // Verify the full insight sentence is present
    expect(screen.getByText(/scores higher on both/i)).toBeInTheDocument();
  });

  /* ── No dominated options ───────────────────────────── */
  it("does not show dominated insights when all are Pareto-optimal", () => {
    mockComputePareto.mockReturnValue({
      ...defaultPareto(),
      dominated: [],
      dominanceMap: {},
      points: [
        { optionId: "o0", optionName: "Option 0", x: 8, y: 7, isPareto: true, dominatedBy: [] },
        { optionId: "o1", optionName: "Option 1", x: 7, y: 8, isPareto: true, dominatedBy: [] },
      ],
      frontier: ["o0", "o1"],
    });
    render(<ParetoChart decision={makeDecision(3, 2)} results={makeResults(2)} />);
    expect(screen.queryByText(/dominated by/i)).not.toBeInTheDocument();
  });

  /* ── Chart ARIA ──────────────────────────────────────── */
  it("renders chart container with proper aria-label", () => {
    render(<ParetoChart decision={makeDecision(3, 3)} results={makeResults(3)} />);
    const chart = screen.getByRole("img");
    expect(chart.getAttribute("aria-label")).toMatch(/Trade-off scatter plot/);
    expect(chart.getAttribute("aria-label")).toMatch(/1 Pareto-optimal/);
    expect(chart.getAttribute("aria-label")).toMatch(/1 dominated/);
  });
});
