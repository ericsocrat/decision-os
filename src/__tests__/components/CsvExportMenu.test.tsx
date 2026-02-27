/**
 * Tests for CsvExportMenu component.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { CsvExportMenu } from "@/components/CsvExportMenu";
import type { Decision, DecisionResults } from "@/lib/types";
import type { TopsisResults } from "@/lib/topsis";
import type { RegretResults } from "@/lib/regret";

// Mock the csv-export module to avoid triggering actual downloads
vi.mock("@/lib/csv-export", async () => {
  const actual = await vi.importActual<typeof import("@/lib/csv-export")>("@/lib/csv-export");
  return {
    ...actual,
    downloadCSV: vi.fn(),
  };
});

function makeDecision(): Decision {
  return {
    id: "d1",
    title: "Test Decision",
    options: [{ id: "o1", name: "Option A" }],
    criteria: [{ id: "c1", name: "Salary", weight: 100, type: "benefit" }],
    scores: { o1: { c1: 8 } },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

function makeResults(): DecisionResults {
  return {
    decisionId: "d1",
    optionResults: [
      {
        optionId: "o1",
        optionName: "Option A",
        totalScore: 8,
        rank: 1,
        criterionScores: [],
      },
    ],
    topDrivers: [],
  };
}

const defaultProps = {
  decision: makeDecision(),
  results: makeResults(),
  topsisResults: null as TopsisResults | null,
  regretResults: null as RegretResults | null,
};

describe("CsvExportMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Export CSV button", () => {
    renderWithProviders(<CsvExportMenu {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /export csv/i }),
    ).toBeInTheDocument();
  });

  it("does not show dropdown initially", () => {
    renderWithProviders(<CsvExportMenu {...defaultProps} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens dropdown on click", async () => {
    const { user } = renderWithProviders(
      <CsvExportMenu {...defaultProps} />,
    );
    await user.click(screen.getByRole("button", { name: /export csv/i }));
    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(within(menu).getByText("Decision Matrix")).toBeInTheDocument();
    expect(within(menu).getByText("Results Summary")).toBeInTheDocument();
    expect(within(menu).getByText("Export All")).toBeInTheDocument();
  });

  it("closes dropdown on second click", async () => {
    const { user } = renderWithProviders(
      <CsvExportMenu {...defaultProps} />,
    );
    const btn = screen.getByRole("button", { name: /export csv/i });
    await user.click(btn);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.click(btn);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls downloadCSV when Decision Matrix is clicked", async () => {
    const { downloadCSV } = await import("@/lib/csv-export");
    const { user } = renderWithProviders(
      <CsvExportMenu {...defaultProps} />,
    );
    await user.click(screen.getByRole("button", { name: /export csv/i }));
    await user.click(screen.getByText("Decision Matrix"));
    expect(downloadCSV).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls downloadCSV when Results Summary is clicked", async () => {
    const { downloadCSV } = await import("@/lib/csv-export");
    const { user } = renderWithProviders(
      <CsvExportMenu {...defaultProps} />,
    );
    await user.click(screen.getByRole("button", { name: /export csv/i }));
    await user.click(screen.getByText("Results Summary"));
    expect(downloadCSV).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("has correct ARIA attributes", async () => {
    const { user } = renderWithProviders(
      <CsvExportMenu {...defaultProps} />,
    );
    const btn = screen.getByRole("button", { name: /export csv/i });
    expect(btn).toHaveAttribute("aria-haspopup", "true");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });
});
