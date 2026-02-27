/**
 * Tests for the winner explanation generator.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/229
 */

import { describe, it, expect } from "vitest";
import { generateWinnerExplanation } from "@/lib/explain-results";
import type { DecisionResults, OptionResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOption(overrides: Partial<OptionResult> & { optionName: string }): OptionResult {
  return {
    optionId: "opt-1",
    optionName: overrides.optionName,
    totalScore: overrides.totalScore ?? 7.5,
    rank: overrides.rank ?? 1,
    criterionScores: overrides.criterionScores ?? [
      {
        criterionId: "c1",
        criterionName: "Performance",
        rawScore: 9,
        normalizedWeight: 0.5,
        effectiveScore: 4.5,
        criterionType: "benefit",
      },
      {
        criterionId: "c2",
        criterionName: "Cost",
        rawScore: 6,
        normalizedWeight: 0.3,
        effectiveScore: 1.8,
        criterionType: "benefit",
      },
      {
        criterionId: "c3",
        criterionName: "Ease of Use",
        rawScore: 5,
        normalizedWeight: 0.2,
        effectiveScore: 1.0,
        criterionType: "benefit",
      },
    ],
  };
}

function makeResults(
  optionResults: OptionResult[],
): DecisionResults {
  return {
    decisionId: "d1",
    optionResults,
    topDrivers: [],
  };
}

const DUMMY_DECISION = {} as unknown;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateWinnerExplanation", () => {
  it("describes the only option when there is 1 option", () => {
    const winner = makeOption({ optionName: "React", totalScore: 8.0 });
    const results = makeResults([winner]);

    const text = generateWinnerExplanation(winner, DUMMY_DECISION, results);

    expect(text).toContain("React");
    expect(text).toContain("8.0/10");
    expect(text).toContain("Performance");
  });

  it("returns simple message for single option with no scored criteria", () => {
    const winner = makeOption({
      optionName: "Solo",
      totalScore: 0,
      criterionScores: [
        {
          criterionId: "c1",
          criterionName: "X",
          rawScore: 0,
          normalizedWeight: 1,
          effectiveScore: 0,
          criterionType: "benefit",
          isNull: true,
        },
      ],
    });
    const results = makeResults([winner]);

    const text = generateWinnerExplanation(winner, DUMMY_DECISION, results);

    expect(text).toBe("Solo is your only option.");
  });

  it("uses 'edges out' phrasing for a tie (margin < 0.5)", () => {
    const winner = makeOption({ optionName: "Alpha", totalScore: 7.5, rank: 1 });
    const runnerUp = makeOption({ optionName: "Beta", totalScore: 7.2, rank: 2, optionId: "opt-2" } as OptionResult & { optionName: string });
    const results = makeResults([winner, runnerUp]);

    const text = generateWinnerExplanation(winner, DUMMY_DECISION, results);

    expect(text).toContain("edges out");
    expect(text).toContain("Beta");
    expect(text).toContain("0.30");
  });

  it("uses 'leads at' phrasing for a close race (0.5-1.5)", () => {
    const winner = makeOption({ optionName: "Alpha", totalScore: 8.0, rank: 1 });
    const runnerUp = makeOption({ optionName: "Beta", totalScore: 7.0, rank: 2, optionId: "opt-2" } as OptionResult & { optionName: string });
    const results = makeResults([winner, runnerUp]);

    const text = generateWinnerExplanation(winner, DUMMY_DECISION, results);

    expect(text).toContain("leads at");
    expect(text).toContain("trails by");
    expect(text).toContain("1.00");
  });

  it("uses 'leads clearly' phrasing for a dominant winner (> 1.5)", () => {
    const winner = makeOption({ optionName: "Alpha", totalScore: 9.0, rank: 1 });
    const runnerUp = makeOption({ optionName: "Beta", totalScore: 5.0, rank: 2, optionId: "opt-2" } as OptionResult & { optionName: string });
    const results = makeResults([winner, runnerUp]);

    const text = generateWinnerExplanation(winner, DUMMY_DECISION, results);

    expect(text).toContain("leads clearly");
    expect(text).toContain("9.0/10");
  });

  it("references the top 2 criteria by name", () => {
    const winner = makeOption({ optionName: "React", totalScore: 8.0 });
    const runnerUp = makeOption({ optionName: "Vue", totalScore: 5.0, rank: 2, optionId: "opt-2" } as OptionResult & { optionName: string });
    const results = makeResults([winner, runnerUp]);

    const text = generateWinnerExplanation(winner, DUMMY_DECISION, results);

    expect(text).toContain("Performance");
    expect(text).toContain("Cost");
  });

  it("uses score labels (e.g. excellent, average)", () => {
    const winner = makeOption({ optionName: "X", totalScore: 8.0 });
    const runnerUp = makeOption({ optionName: "Y", totalScore: 5.0, rank: 2, optionId: "opt-2" } as OptionResult & { optionName: string });
    const results = makeResults([winner, runnerUp]);

    const text = generateWinnerExplanation(winner, DUMMY_DECISION, results);

    // Performance rawScore=9 → "excellent"
    expect(text).toContain("excellent");
    // Cost rawScore=6 → "average"
    expect(text).toContain("average");
  });

  it("handles winner with no scored criteria gracefully", () => {
    const winner = makeOption({
      optionName: "Empty",
      totalScore: 0,
      criterionScores: [],
    });
    const runnerUp = makeOption({ optionName: "Other", totalScore: 0, rank: 2, optionId: "opt-2" } as OptionResult & { optionName: string });
    const results = makeResults([winner, runnerUp]);

    const text = generateWinnerExplanation(winner, DUMMY_DECISION, results);

    expect(text).toContain("Empty");
    expect(text).toContain("0.0/10");
  });
});
