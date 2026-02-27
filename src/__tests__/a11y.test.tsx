/**
 * Accessibility tests — validates WCAG 2.1 AA compliance for remediated items.
 *
 * Covers:
 * - Score matrix table structure (scope attributes, row/column headers)
 * - ScoreChart accessible alternatives (role, aria-label, data table)
 * - Form accessibility (aria-required, labels)
 * - Motion preferences (prefers-reduced-motion CSS rule)
 * - ReasoningPopover dialog attributes
 * - Color contrast patterns (text-gray-500 vs text-gray-400)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreChart } from "@/components/ScoreChart";
import type { OptionResult } from "@/lib/types";
import fs from "node:fs";
import path from "node:path";

// ─── ScoreChart Accessibility ──────────────────────────────────────

const mockOptionResults: OptionResult[] = [
  {
    optionId: "opt-1",
    optionName: "Option A",
    totalScore: 7.5,
    rank: 1,
    criterionScores: [
      {
        criterionId: "c1",
        criterionName: "Cost",
        rawScore: 8,
        normalizedWeight: 0.6,
        effectiveScore: 4.8,
        criterionType: "cost" as const,
      },
      {
        criterionId: "c2",
        criterionName: "Quality",
        rawScore: 9,
        normalizedWeight: 0.4,
        effectiveScore: 2.7,
        criterionType: "benefit" as const,
      },
    ],
  },
  {
    optionId: "opt-2",
    optionName: "Option B",
    totalScore: 5.2,
    rank: 2,
    criterionScores: [
      {
        criterionId: "c1",
        criterionName: "Cost",
        rawScore: 5,
        normalizedWeight: 0.6,
        effectiveScore: 3.0,
        criterionType: "cost" as const,
      },
      {
        criterionId: "c2",
        criterionName: "Quality",
        rawScore: 7,
        normalizedWeight: 0.4,
        effectiveScore: 2.2,
        criterionType: "benefit" as const,
      },
    ],
  },
];

describe("ScoreChart accessibility", () => {
  it("renders chart container with role=img and aria-label", () => {
    const { container } = render(<ScoreChart optionResults={mockOptionResults} />);
    const imgElement = container.querySelector('[role="img"]');
    expect(imgElement).toBeTruthy();
    expect(imgElement?.getAttribute("aria-label")).toContain("Option A");
    expect(imgElement?.getAttribute("aria-label")).toContain("7.5");
  });

  it("includes aria-label with top choice information", () => {
    const { container } = render(<ScoreChart optionResults={mockOptionResults} />);
    const imgElement = container.querySelector('[role="img"]');
    const label = imgElement?.getAttribute("aria-label") ?? "";
    expect(label).toContain("Top choice: Option A");
  });

  it("provides a screen-reader-only data table", () => {
    render(<ScoreChart optionResults={mockOptionResults} />);
    const table = screen.getByRole("table", { name: /score breakdown/i });
    expect(table).toBeTruthy();
    expect(table.className).toContain("sr-only");
  });

  it("data table has proper column headers with scope", () => {
    const { container } = render(<ScoreChart optionResults={mockOptionResults} />);
    const table = container.querySelector("table.sr-only");
    const colHeaders = table?.querySelectorAll('th[scope="col"]');
    expect(colHeaders?.length).toBeGreaterThanOrEqual(3); // Option, Total Score, Rank + criteria
  });

  it("data table has proper row headers with scope", () => {
    const { container } = render(<ScoreChart optionResults={mockOptionResults} />);
    const table = container.querySelector("table.sr-only");
    const rowHeaders = table?.querySelectorAll('th[scope="row"]');
    expect(rowHeaders?.length).toBe(2); // Option A, Option B
  });

  it("stacked chart has aria-hidden", () => {
    const { container } = render(<ScoreChart optionResults={mockOptionResults} />);
    const hiddenElements = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenElements.length).toBeGreaterThanOrEqual(1);
  });

  it("returns null for empty results", () => {
    const { container } = render(<ScoreChart optionResults={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

// ─── Prefers-Reduced-Motion ────────────────────────────────────────

describe("prefers-reduced-motion", () => {
  let cssContent: string;

  beforeAll(() => {
    const cssPath = path.resolve(__dirname, "../app/globals.css");
    cssContent = fs.readFileSync(cssPath, "utf8");
  });

  it("includes prefers-reduced-motion media query", () => {
    expect(cssContent).toContain("prefers-reduced-motion: reduce");
  });

  it("sets animation-duration to near-zero", () => {
    expect(cssContent).toContain("animation-duration: 0.01ms !important");
  });

  it("sets transition-duration to near-zero", () => {
    expect(cssContent).toContain("transition-duration: 0.01ms !important");
  });

  it("limits animation-iteration-count to 1", () => {
    expect(cssContent).toContain("animation-iteration-count: 1 !important");
  });

  it("sets scroll-behavior to auto", () => {
    expect(cssContent).toContain("scroll-behavior: auto !important");
  });
});

// ─── Score Matrix Table Structure ──────────────────────────────────

describe("score matrix a11y (CSS file checks)", () => {
  let builderContent: string;

  beforeAll(() => {
    const builderPath = path.resolve(__dirname, "../components/DecisionBuilder.tsx");
    builderContent = fs.readFileSync(builderPath, "utf8");
  });

  it("score matrix uses role=grid", () => {
    expect(builderContent).toContain('role="grid"');
  });

  it("score matrix has aria-label", () => {
    expect(builderContent).toContain('aria-label="Scores matrix"');
  });

  it("column headers use scope=col", () => {
    expect(builderContent).toContain('scope="col"');
  });

  it("row headers use scope=row", () => {
    expect(builderContent).toContain('scope="row"');
  });

  it("title input has aria-required", () => {
    expect(builderContent).toContain('aria-required="true"');
  });

  it("uses text-gray-500 instead of text-gray-400 for option labels", () => {
    // The option row labels (A, B, C) should use gray-500 for contrast
    expect(builderContent).toContain("text-gray-500 dark:text-gray-400");
  });
});

// ─── ReasoningPopover Dialog ───────────────────────────────────────

describe("ReasoningPopover a11y", () => {
  let popoverContent: string;

  beforeAll(() => {
    const popoverPath = path.resolve(__dirname, "../components/ReasoningPopover.tsx");
    popoverContent = fs.readFileSync(popoverPath, "utf8");
  });

  it("includes aria-modal=true", () => {
    expect(popoverContent).toContain('aria-modal="true"');
  });

  it("includes htmlFor on label", () => {
    expect(popoverContent).toContain("htmlFor=");
  });

  it("includes matching id on textarea", () => {
    expect(popoverContent).toContain("id={`reasoning-");
  });
});
