/**
 * Tests for CSV export utilities.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  escapeCSVField,
  sanitizeFilename,
  exportDecisionMatrixCSV,
  exportResultsSummaryCSV,
  downloadCSV,
} from "@/lib/csv-export";
import type { Decision, DecisionResults } from "@/lib/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: "d1",
    title: "Test Decision",
    description: "desc",
    options: [
      { id: "o1", name: "Option A" },
      { id: "o2", name: "Option B" },
    ],
    criteria: [
      { id: "c1", name: "Salary", weight: 50, type: "benefit" },
      { id: "c2", name: "Commute", weight: 50, type: "cost" },
    ],
    scores: {
      o1: { c1: 8, c2: 3 },
      o2: { c1: 6, c2: 7 },
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeResults(): DecisionResults {
  return {
    decisionId: "d1",
    optionResults: [
      {
        optionId: "o1",
        optionName: "Option A",
        totalScore: 7.5,
        rank: 1,
        criterionScores: [
          {
            criterionId: "c1",
            criterionName: "Salary",
            rawScore: 8,
            normalizedWeight: 0.5,
            effectiveScore: 4.0,
            criterionType: "benefit",
          },
          {
            criterionId: "c2",
            criterionName: "Commute",
            rawScore: 3,
            normalizedWeight: 0.5,
            effectiveScore: 3.5,
            criterionType: "cost",
          },
        ],
      },
      {
        optionId: "o2",
        optionName: "Option B",
        totalScore: 5.0,
        rank: 2,
        criterionScores: [
          {
            criterionId: "c1",
            criterionName: "Salary",
            rawScore: 6,
            normalizedWeight: 0.5,
            effectiveScore: 3.0,
            criterionType: "benefit",
          },
          {
            criterionId: "c2",
            criterionName: "Commute",
            rawScore: 7,
            normalizedWeight: 0.5,
            effectiveScore: 2.0,
            criterionType: "cost",
          },
        ],
      },
    ],
    topDrivers: [],
  };
}

// ---------------------------------------------------------------------------
// escapeCSVField
// ---------------------------------------------------------------------------

describe("escapeCSVField", () => {
  it("returns plain fields unchanged", () => {
    expect(escapeCSVField("hello")).toBe("hello");
    expect(escapeCSVField("123")).toBe("123");
  });

  it("wraps fields with commas in quotes", () => {
    expect(escapeCSVField("a,b")).toBe('"a,b"');
  });

  it("wraps and escapes fields with double-quotes", () => {
    expect(escapeCSVField('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps fields with newlines", () => {
    expect(escapeCSVField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("handles carriage returns", () => {
    expect(escapeCSVField("a\rb")).toBe('"a\rb"');
  });
});

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------

describe("sanitizeFilename", () => {
  it("converts spaces and special chars to hyphens", () => {
    expect(sanitizeFilename("My Decision #1")).toBe("my-decision-1");
  });

  it("collapses consecutive hyphens", () => {
    expect(sanitizeFilename("a -- b")).toBe("a-b");
  });

  it("trims to 50 characters", () => {
    const long = "A".repeat(60);
    expect(sanitizeFilename(long).length).toBe(50);
  });

  it("removes leading and trailing hyphens", () => {
    expect(sanitizeFilename("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("");
  });

  it("preserves existing hyphens", () => {
    expect(sanitizeFilename("job-decision")).toBe("job-decision");
  });
});

// ---------------------------------------------------------------------------
// exportDecisionMatrixCSV
// ---------------------------------------------------------------------------

describe("exportDecisionMatrixCSV", () => {
  it("starts with UTF-8 BOM", () => {
    const csv = exportDecisionMatrixCSV(makeDecision());
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes criterion headers with weight percentages", () => {
    const csv = exportDecisionMatrixCSV(makeDecision());
    expect(csv).toContain("Salary (50%)");
    expect(csv).toContain("Commute (50%) (cost)");
  });

  it("marks cost criteria in headers", () => {
    const csv = exportDecisionMatrixCSV(makeDecision());
    expect(csv).toContain("(cost)");
  });

  it("outputs correct scores for each option", () => {
    const csv = exportDecisionMatrixCSV(makeDecision());
    const lines = csv.split("\r\n");
    // Line 0: comment, Line 1: header, Line 2: Option A, Line 3: Option B
    expect(lines[2]).toBe("Option A,8,3");
    expect(lines[3]).toBe("Option B,6,7");
  });

  it("includes a comment row about zero scores", () => {
    const csv = exportDecisionMatrixCSV(makeDecision());
    expect(csv).toContain("# Scores of 0 may indicate unfilled values");
  });

  it("handles null scores as 0", () => {
    const decision = makeDecision({
      scores: {
        o1: { c1: null, c2: 3 },
        o2: { c1: 6, c2: 7 },
      },
    });
    const csv = exportDecisionMatrixCSV(decision);
    const lines = csv.split("\r\n");
    expect(lines[2]).toBe("Option A,0,3");
  });

  it("handles ScoredCell values", () => {
    const decision = makeDecision({
      scores: {
        o1: { c1: { value: 8, confidence: "high" }, c2: 3 },
        o2: { c1: 6, c2: 7 },
      },
    });
    const csv = exportDecisionMatrixCSV(decision);
    const lines = csv.split("\r\n");
    expect(lines[2]).toBe("Option A,8,3");
  });

  it("escapes option names with special characters", () => {
    const decision = makeDecision({
      options: [
        { id: "o1", name: "O'Brien, Inc." },
        { id: "o2", name: "Option B" },
      ],
    });
    const csv = exportDecisionMatrixCSV(decision);
    expect(csv).toContain('"O\'Brien, Inc."');
  });

  it("uses CRLF line endings", () => {
    const csv = exportDecisionMatrixCSV(makeDecision());
    // Remove BOM for counting
    const body = csv.slice(1);
    const crlfCount = (body.match(/\r\n/g) ?? []).length;
    const lfOnlyCount = (body.replace(/\r\n/g, "").match(/\n/g) ?? []).length;
    expect(crlfCount).toBeGreaterThan(0);
    expect(lfOnlyCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// exportResultsSummaryCSV
// ---------------------------------------------------------------------------

describe("exportResultsSummaryCSV", () => {
  const decision = makeDecision();
  const results = makeResults();

  it("starts with UTF-8 BOM", () => {
    const csv = exportResultsSummaryCSV({
      decision,
      results,
      topsisResults: null,
      regretResults: null,
    });
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes basic columns without TOPSIS/Regret", () => {
    const csv = exportResultsSummaryCSV({
      decision,
      results,
      topsisResults: null,
      regretResults: null,
    });
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("\uFEFFRank,Option,WSM Score,Consensus Rank");
    expect(lines[1]).toContain("Option A");
    expect(lines[1]).toContain("7.50");
  });

  it("includes TOPSIS column when results available", () => {
    const topsis = {
      rankings: [
        {
          optionId: "o1",
          optionName: "Option A",
          closenessCoefficient: 0.72,
          distanceToIdeal: 0.3,
          distanceToAntiIdeal: 0.8,
          rank: 1,
        },
        {
          optionId: "o2",
          optionName: "Option B",
          closenessCoefficient: 0.34,
          distanceToIdeal: 0.7,
          distanceToAntiIdeal: 0.4,
          rank: 2,
        },
      ],
      idealSolution: {},
      antiIdealSolution: {},
      method: "topsis" as const,
    };
    const csv = exportResultsSummaryCSV({
      decision,
      results,
      topsisResults: topsis,
      regretResults: null,
    });
    expect(csv).toContain("TOPSIS Closeness");
    expect(csv).toContain("0.72");
  });

  it("includes Regret column when results available", () => {
    const regret = {
      rankings: [
        {
          optionId: "o1",
          optionName: "Option A",
          maxRegret: 1.2,
          maxRegretCriterion: "c2",
          avgRegret: 0.8,
          rank: 1,
        },
        {
          optionId: "o2",
          optionName: "Option B",
          maxRegret: 2.5,
          maxRegretCriterion: "c1",
          avgRegret: 1.5,
          rank: 2,
        },
      ],
      regretMatrix: {},
      bestPerCriterion: {},
      method: "minimax-regret" as const,
    };
    const csv = exportResultsSummaryCSV({
      decision,
      results,
      topsisResults: null,
      regretResults: regret,
    });
    expect(csv).toContain("Max Regret");
    expect(csv).toContain("1.20");
  });

  it("sorts options by WSM rank", () => {
    const csv = exportResultsSummaryCSV({
      decision,
      results,
      topsisResults: null,
      regretResults: null,
    });
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain("Option A"); // rank 1
    expect(lines[2]).toContain("Option B"); // rank 2
  });
});

// ---------------------------------------------------------------------------
// downloadCSV
// ---------------------------------------------------------------------------

describe("downloadCSV", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates and triggers a download", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL;

    downloadCSV("test,data\r\n", "test.csv");

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("sets the correct filename on the anchor", () => {
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:x");
    globalThis.URL.revokeObjectURL = vi.fn();

    const appendSpy = vi.spyOn(document.body, "appendChild");

    downloadCSV("data", "my-file.csv");

    const anchor = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("my-file.csv");
  });
});