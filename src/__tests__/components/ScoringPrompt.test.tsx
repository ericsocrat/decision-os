/**
 * Tests for guided scoring prompts (issue #92).
 *
 * Tests the ScoringPrompt component and the buildCalibrationLabel helper.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoringPrompt, buildCalibrationLabel } from "@/components/ScoringPrompt";
import type { CalibrationData } from "@/components/ScoringPrompt";

// ---------------------------------------------------------------------------
// Pure logic tests — buildCalibrationLabel
// ---------------------------------------------------------------------------

describe("buildCalibrationLabel", () => {
  it("returns null when no other scores exist", () => {
    const data: CalibrationData = { allScores: [5], currentScore: 5 };
    expect(buildCalibrationLabel(data)).toBeNull();
  });

  it("returns calibration string with average when other scores exist", () => {
    const data: CalibrationData = { allScores: [3, 7, 9], currentScore: 3 };
    const label = buildCalibrationLabel(data)!;
    expect(label).toContain("Other scores:");
    expect(label).toContain("7, 9");
    expect(label).toContain("avg 8.0");
  });

  it("returns null when allScores is empty", () => {
    const data: CalibrationData = { allScores: [], currentScore: null };
    expect(buildCalibrationLabel(data)).toBeNull();
  });

  it("handles null currentScore (shows all as others)", () => {
    const data: CalibrationData = { allScores: [4, 6], currentScore: null };
    const label = buildCalibrationLabel(data)!;
    expect(label).toContain("4, 6");
    expect(label).toContain("avg 5.0");
  });
});

// ---------------------------------------------------------------------------
// Component tests — ScoringPrompt
// ---------------------------------------------------------------------------

describe("ScoringPrompt", () => {
  it("renders a tooltip with the provided id", () => {
    render(<ScoringPrompt criterionType="benefit" promptId="test-prompt-1" />);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveAttribute("id", "test-prompt-1");
  });

  it("shows benefit-specific question for benefit criteria", () => {
    render(<ScoringPrompt criterionType="benefit" promptId="p1" />);
    expect(screen.getByText(/worst case.*ideal outcome/i)).toBeInTheDocument();
  });

  it("shows cost-specific question for cost criteria", () => {
    render(<ScoringPrompt criterionType="cost" promptId="p2" />);
    expect(screen.getByText(/total cost.*budget/i)).toBeInTheDocument();
  });

  it("shows anchor labels for benefit criteria", () => {
    render(<ScoringPrompt criterionType="benefit" promptId="p3" />);
    expect(screen.getByText(/deal-breaker/i)).toBeInTheDocument();
    expect(screen.getByText(/acceptable/i)).toBeInTheDocument();
    expect(screen.getByText(/exceptional/i)).toBeInTheDocument();
  });

  it("shows anchor labels for cost criteria", () => {
    render(<ScoringPrompt criterionType="cost" promptId="p4" />);
    expect(screen.getByText(/over budget/i)).toBeInTheDocument();
    expect(screen.getByText(/within budget/i)).toBeInTheDocument();
    expect(screen.getByText(/under budget/i)).toBeInTheDocument();
  });

  it("shows calibration data when provided", () => {
    const calibration: CalibrationData = {
      allScores: [2, 5, 8],
      currentScore: 2,
    };
    render(<ScoringPrompt criterionType="benefit" promptId="p5" calibration={calibration} />);
    expect(screen.getByText(/Other scores:.*5, 8.*avg 6\.5/)).toBeInTheDocument();
  });

  it("does not show calibration when no other scores", () => {
    const calibration: CalibrationData = {
      allScores: [5],
      currentScore: 5,
    };
    render(<ScoringPrompt criterionType="benefit" promptId="p6" calibration={calibration} />);
    expect(screen.queryByText(/Other scores/)).not.toBeInTheDocument();
  });

  it("does not show calibration when calibration prop omitted", () => {
    render(<ScoringPrompt criterionType="cost" promptId="p7" />);
    expect(screen.queryByText(/Other scores/)).not.toBeInTheDocument();
  });
});
