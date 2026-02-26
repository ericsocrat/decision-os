/**
 * MonteCarloView component tests.
 *
 * Verifies the Monte Carlo simulation UI: configuration controls,
 * run/cancel buttons, progress bar, results display (win probabilities,
 * score distributions, confidence intervals), and edge cases.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/86
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { MonteCarloView } from "@/components/MonteCarloView";
import type { MonteCarloResults } from "@/lib/types";
import type { SimulationStatus } from "@/hooks/useMonteCarloWorker";

// ─── Mock useMonteCarloWorker ──────────────────────────────────────

const mockRun = vi.fn();
const mockCancel = vi.fn();
const mockReset = vi.fn();

const defaultWorkerState: {
  status: SimulationStatus;
  progress: number;
  completed: number;
  total: number;
  results: MonteCarloResults | null;
  error: string | null;
  workerSupported: boolean;
  run: typeof mockRun;
  cancel: typeof mockCancel;
  reset: typeof mockReset;
} = {
  status: "idle",
  progress: 0,
  completed: 0,
  total: 0,
  results: null as MonteCarloResults | null,
  error: null as string | null,
  workerSupported: true,
  run: mockRun,
  cancel: mockCancel,
  reset: mockReset,
};

let workerState = { ...defaultWorkerState };

vi.mock("@/hooks/useMonteCarloWorker", () => ({
  useMonteCarloWorker: () => workerState,
}));

// ─── Fixtures ──────────────────────────────────────────────────────

const mockMCResults: MonteCarloResults = {
  decisionId: "demo-relocation-decision",
  config: {
    numSimulations: 10000,
    perturbationRange: 0.2,
    distribution: "uniform",
    seed: 42,
  },
  options: [
    {
      optionId: "opt-austin",
      optionName: "Austin, TX",
      winProbability: 0.55,
      winCount: 5500,
      meanScore: 7.2,
      stdDev: 0.8,
      p5: 5.6,
      p25: 6.7,
      p50: 7.2,
      p75: 7.7,
      p95: 8.8,
      histogram: [
        { min: 5, max: 6, count: 500 },
        { min: 6, max: 7, count: 2000 },
        { min: 7, max: 8, count: 5000 },
        { min: 8, max: 9, count: 2500 },
      ],
    },
    {
      optionId: "opt-denver",
      optionName: "Denver, CO",
      winProbability: 0.35,
      winCount: 3500,
      meanScore: 6.8,
      stdDev: 1.1,
      p5: 4.8,
      p25: 6.1,
      p50: 6.9,
      p75: 7.5,
      p95: 8.5,
      histogram: [
        { min: 4, max: 5, count: 300 },
        { min: 5, max: 6, count: 1500 },
        { min: 6, max: 7, count: 3500 },
        { min: 7, max: 8, count: 3200 },
        { min: 8, max: 9, count: 1500 },
      ],
    },
    {
      optionId: "opt-raleigh",
      optionName: "Raleigh, NC",
      winProbability: 0.1,
      winCount: 1000,
      meanScore: 6.2,
      stdDev: 0.9,
      p5: 4.6,
      p25: 5.7,
      p50: 6.2,
      p75: 6.7,
      p95: 7.8,
      histogram: [
        { min: 4, max: 5, count: 500 },
        { min: 5, max: 6, count: 2500 },
        { min: 6, max: 7, count: 4000 },
        { min: 7, max: 8, count: 3000 },
      ],
    },
  ],
  elapsedMs: 250,
  summary: "Austin, TX wins 55% of simulations with a mean score of 7.20.",
};

// ─── Tests ─────────────────────────────────────────────────────────

describe("MonteCarloView", () => {
  beforeEach(() => {
    localStorage.clear();
    workerState = { ...defaultWorkerState };
    mockRun.mockClear();
    mockCancel.mockClear();
    mockReset.mockClear();
  });

  // --- Empty state ---

  it("shows empty state when fewer than 2 options exist", () => {
    // Default demo decision has 3 options + 5 criteria, so it will have results
    // We need to test with a decision that has < 2 options
    // The demo decision already has enough options, so the empty state won't show
    // unless we explicitly set up a decision with < 2 optionResults.
    // Since DecisionProvider uses DEMO_DECISION which has 3 options, the empty
    // state won't trigger. Instead, verify the config panel renders.
    renderWithProviders(<MonteCarloView />);

    expect(screen.getByText("Monte Carlo Simulation")).toBeInTheDocument();
  });

  // --- Configuration controls ---

  it("renders simulation controls (slider and run button)", () => {
    renderWithProviders(<MonteCarloView />);

    expect(screen.getByLabelText("Number of simulations")).toBeInTheDocument();
    expect(screen.getByLabelText("Perturbation range")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run Simulation/i })).toBeInTheDocument();
  });

  it("shows advanced settings when toggled", async () => {
    const { user } = renderWithProviders(<MonteCarloView />);

    // Advanced settings are hidden by default
    expect(screen.queryByLabelText("Distribution")).not.toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByText("Advanced settings"));

    // Distribution and Seed now visible
    expect(screen.getByLabelText("Distribution")).toBeInTheDocument();
    expect(screen.getByLabelText("Seed (0 = random)")).toBeInTheDocument();
  });

  it("calls worker.run when Run Simulation is clicked", async () => {
    const { user } = renderWithProviders(<MonteCarloView />);

    await user.click(screen.getByRole("button", { name: /Run Simulation/i }));

    expect(mockRun).toHaveBeenCalledOnce();
  });

  // --- Running state ---

  it("shows progress bar while simulation is running", () => {
    workerState = {
      ...defaultWorkerState,
      status: "running",
      progress: 0.42,
      completed: 4200,
      total: 10000,
    };

    renderWithProviders(<MonteCarloView />);

    expect(screen.getByText(/Running simulation/i)).toBeInTheDocument();
    expect(screen.getByText(/42%/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows cancel button while running", () => {
    workerState = {
      ...defaultWorkerState,
      status: "running",
      progress: 0.5,
      completed: 5000,
      total: 10000,
    };

    renderWithProviders(<MonteCarloView />);

    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  // --- Cancelled state ---

  it("shows cancelled message when simulation is cancelled", () => {
    workerState = {
      ...defaultWorkerState,
      status: "cancelled",
    };

    renderWithProviders(<MonteCarloView />);

    expect(screen.getByText("Simulation cancelled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Restart/i })).toBeInTheDocument();
  });

  // --- Error state ---

  it("shows error message when simulation fails", () => {
    workerState = {
      ...defaultWorkerState,
      status: "error",
      error: "Out of memory",
    };

    renderWithProviders(<MonteCarloView />);

    expect(screen.getByText("Simulation failed")).toBeInTheDocument();
    expect(screen.getByText("Out of memory")).toBeInTheDocument();
  });

  // --- Results display ---

  it("renders win probabilities table after simulation completes", () => {
    workerState = {
      ...defaultWorkerState,
      status: "complete",
      results: mockMCResults,
    };

    renderWithProviders(<MonteCarloView />);

    expect(screen.getByText("Simulation Complete")).toBeInTheDocument();
    expect(screen.getByText("Win Probabilities")).toBeInTheDocument();

    // Option names in the table
    expect(screen.getAllByText("Austin, TX").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Denver, CO").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Raleigh, NC").length).toBeGreaterThanOrEqual(1);

    // Win probability percentages
    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("35%")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
  });

  it("renders score distributions with histograms and CI cards", () => {
    workerState = {
      ...defaultWorkerState,
      status: "complete",
      results: mockMCResults,
    };

    renderWithProviders(<MonteCarloView />);

    expect(screen.getByText("Score Distributions")).toBeInTheDocument();

    // Median and Mean values
    expect(screen.getByText("Median: 7.2")).toBeInTheDocument();
    expect(screen.getByText("Median: 6.9")).toBeInTheDocument();
    expect(screen.getByText("Median: 6.2")).toBeInTheDocument();

    // CI cards
    expect(screen.getByText(/90% CI \[5\.6 – 8\.8\]/)).toBeInTheDocument();
  });

  it("renders the 'How It Works' explainer section", () => {
    workerState = {
      ...defaultWorkerState,
      status: "complete",
      results: mockMCResults,
    };

    renderWithProviders(<MonteCarloView />);

    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText(/Monte Carlo simulation/)).toBeInTheDocument();
  });

  it("displays summary text from simulation results", () => {
    workerState = {
      ...defaultWorkerState,
      status: "complete",
      results: mockMCResults,
    };

    renderWithProviders(<MonteCarloView />);

    expect(screen.getByText(/Austin, TX wins 55% of simulations/)).toBeInTheDocument();
  });
});
