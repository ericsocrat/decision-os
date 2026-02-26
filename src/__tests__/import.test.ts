/**
 * Unit tests for the import module (JSON + CSV).
 *
 * @see https://github.com/ericsocrat/decision-os/issues/11
 */

import { describe, it, expect } from "vitest";
import {
  parseCsv,
  importFromJson,
  parseCsvPreview,
  csvToDecision,
  validateFile,
  MAX_FILE_SIZE,
} from "@/lib/import";
import type { Decision } from "@/lib/types";

// ─── Helper: minimal valid Decision JSON ───────────────────────────

function makeDecisionJson(overrides: Partial<Decision> = {}): string {
  const base: Decision = {
    id: "test-id",
    title: "Test Decision",
    options: [
      { id: "opt-1", name: "Option A" },
      { id: "opt-2", name: "Option B" },
    ],
    criteria: [
      { id: "crit-1", name: "Cost", weight: 50, type: "cost" },
      { id: "crit-2", name: "Quality", weight: 50, type: "benefit" },
    ],
    scores: {
      "opt-1": { "crit-1": 3, "crit-2": 8 },
      "opt-2": { "crit-1": 7, "crit-2": 5 },
    },
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  };
  return JSON.stringify({ ...base, ...overrides });
}

// ─── CSV Parser ────────────────────────────────────────────────────

describe("parseCsv", () => {
  it("parses a simple CSV", () => {
    const result = parseCsv("Option,Cost,Quality\nAustin,4,8\nDenver,6,7");
    expect(result).toEqual([
      ["Option", "Cost", "Quality"],
      ["Austin", "4", "8"],
      ["Denver", "6", "7"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    const result = parseCsv('Option,Score\n"New York, NY",8\nLA,6');
    expect(result).toEqual([
      ["Option", "Score"],
      ["New York, NY", "8"],
      ["LA", "6"],
    ]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    const result = parseCsv('Name,Note\n"He said ""hello""",5');
    expect(result).toEqual([
      ["Name", "Note"],
      ['He said "hello"', "5"],
    ]);
  });

  it("handles CRLF line endings", () => {
    const result = parseCsv("A,B\r\n1,2\r\n3,4");
    expect(result).toEqual([
      ["A", "B"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("trims whitespace from cells", () => {
    const result = parseCsv("  A ,  B  \n  1 ,  2  ");
    expect(result).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });

  it("skips empty rows", () => {
    const result = parseCsv("A,B\n\n1,2\n\n3,4\n");
    expect(result).toEqual([
      ["A", "B"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});

// ─── JSON Import ───────────────────────────────────────────────────

describe("importFromJson", () => {
  it("imports a valid Decision JSON", () => {
    const result = importFromJson(makeDecisionJson());
    expect(result.success).toBe(true);
    expect(result.decision).toBeTruthy();
    expect(result.decision!.title).toBe("Test Decision");
    expect(result.decision!.options).toHaveLength(2);
    expect(result.decision!.criteria).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("generates new id and timestamps", () => {
    const result = importFromJson(makeDecisionJson());
    expect(result.decision!.id).not.toBe("test-id");
    expect(result.decision!.createdAt).not.toBe("2025-01-01T00:00:00.000Z");
  });

  it("imports from results export format (with 'decision' key)", () => {
    const decision: Decision = {
      id: "test-id",
      title: "From Export",
      options: [
        { id: "opt-1", name: "A" },
        { id: "opt-2", name: "B" },
      ],
      criteria: [{ id: "crit-1", name: "C", weight: 50, type: "benefit" }],
      scores: { "opt-1": { "crit-1": 5 }, "opt-2": { "crit-1": 7 } },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };
    const exportData = {
      decision,
      results: [],
      exportedAt: "2025-01-01T00:00:00.000Z",
    };
    const result = importFromJson(JSON.stringify(exportData));
    expect(result.success).toBe(true);
    expect(result.decision!.title).toBe("From Export");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("results export format");
  });

  it("rejects invalid JSON", () => {
    const result = importFromJson("{not valid json}");
    expect(result.success).toBe(false);
    expect(result.errors[0].type).toBe("format");
  });

  it("rejects non-object JSON", () => {
    const result = importFromJson('"just a string"');
    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain("object");
  });

  it("gives specific errors for missing fields", () => {
    const result = importFromJson(JSON.stringify({ title: 123 }));
    expect(result.success).toBe(false);
    const fields = result.errors.map((e) => e.field);
    expect(fields).toContain("title");
    expect(fields).toContain("options");
    expect(fields).toContain("criteria");
  });

  it("rejects Decision with missing title", () => {
    const noTitle = JSON.parse(makeDecisionJson());
    delete noTitle.title;
    const result = importFromJson(JSON.stringify(noTitle));
    expect(result.success).toBe(false);
  });

  it("rejects Decision with invalid criteria", () => {
    const badCriteria = JSON.parse(makeDecisionJson());
    badCriteria.criteria = [{ id: "c", name: "X", weight: -10, type: "invalid" }];
    const result = importFromJson(JSON.stringify(badCriteria));
    expect(result.success).toBe(false);
  });
});

// ─── CSV Preview Parsing ───────────────────────────────────────────

describe("parseCsvPreview", () => {
  it("parses a valid CSV into preview data", () => {
    const csv = "Option,Cost,Quality\nAustin,4,8\nDenver,6,7";
    const result = parseCsvPreview(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toBeTruthy();
    expect(result.data!.headers).toEqual(["Cost", "Quality"]);
    expect(result.data!.rows).toHaveLength(2);
    expect(result.data!.rows[0]).toEqual({ option: "Austin", scores: [4, 8] });
    expect(result.data!.rows[1]).toEqual({ option: "Denver", scores: [6, 7] });
  });

  it("rejects CSV with only a header row", () => {
    const result = parseCsvPreview("Option,Cost");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("header row and at least one data row");
  });

  it("rejects CSV with too few columns", () => {
    const result = parseCsvPreview("Option\nAustin");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("at least 2 columns");
  });

  it("handles empty cells as null scores", () => {
    const csv = "Option,A,B\nX,,5";
    const result = parseCsvPreview(csv);
    expect(result.data!.rows[0].scores).toEqual([null, 5]);
  });

  it("errors on non-numeric scores", () => {
    const csv = "Option,Score\nA,abc";
    const result = parseCsvPreview(csv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain("not a valid number");
  });

  it("errors on scores out of range (0–10)", () => {
    const csv = "Option,Score\nA,15";
    const result = parseCsvPreview(csv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain("must be between 0 and 10");
  });

  it("reports mismatched column counts", () => {
    const csv = "Option,A,B\nX,1";
    const result = parseCsvPreview(csv);
    expect(result.errors.some((e) => e.message.includes("columns"))).toBe(true);
  });

  it("handles quoted option names with commas", () => {
    const csv = 'Option,Score\n"New York, NY",8';
    const result = parseCsvPreview(csv);
    expect(result.data!.rows[0].option).toBe("New York, NY");
  });
});

// ─── CSV to Decision ──────────────────────────────────────────────

describe("csvToDecision", () => {
  it("converts preview data to a valid Decision", () => {
    const preview = {
      headers: ["Cost", "Quality"],
      rows: [
        { option: "Austin", scores: [4, 8] as (number | null)[] },
        { option: "Denver", scores: [6, 7] as (number | null)[] },
      ],
      raw: [],
    };
    const decision = csvToDecision(preview, "My Decision", ["cost", "benefit"], [60, 40]);

    expect(decision.title).toBe("My Decision");
    expect(decision.options).toHaveLength(2);
    expect(decision.criteria).toHaveLength(2);
    expect(decision.criteria[0].name).toBe("Cost");
    expect(decision.criteria[0].type).toBe("cost");
    expect(decision.criteria[0].weight).toBe(60);
    expect(decision.criteria[1].type).toBe("benefit");
    expect(decision.criteria[1].weight).toBe(40);
    expect(decision.id).toBeTruthy();
    expect(decision.createdAt).toBeTruthy();

    // Verify scores are mapped correctly
    const opt1Id = decision.options[0].id;
    const crit1Id = decision.criteria[0].id;
    expect(decision.scores[opt1Id][crit1Id]).toBe(4);
  });

  it("preserves null scores from CSV", () => {
    const preview = {
      headers: ["A"],
      rows: [{ option: "X", scores: [null] as (number | null)[] }],
      raw: [],
    };
    const decision = csvToDecision(preview, "Test", ["benefit"], [50]);
    const optId = decision.options[0].id;
    const critId = decision.criteria[0].id;
    expect(decision.scores[optId][critId]).toBeNull();
  });

  it("uses default title when empty", () => {
    const preview = {
      headers: ["A"],
      rows: [{ option: "X", scores: [5] as (number | null)[] }],
      raw: [],
    };
    const decision = csvToDecision(preview, "", ["benefit"], [50]);
    expect(decision.title).toBe("Imported Decision");
  });
});

// ─── File Validation ──────────────────────────────────────────────

describe("validateFile", () => {
  function makeFile(name: string, size: number, type = "application/json"): File {
    const content = new ArrayBuffer(size);
    return new File([content], name, { type });
  }

  it("accepts .json files", () => {
    const errors = validateFile(makeFile("test.json", 100));
    expect(errors).toHaveLength(0);
  });

  it("accepts .csv files", () => {
    const errors = validateFile(makeFile("data.csv", 100, "text/csv"));
    expect(errors).toHaveLength(0);
  });

  it("rejects unsupported file types", () => {
    const errors = validateFile(makeFile("image.png", 100, "image/png"));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Only .json and .csv");
  });

  it("rejects empty files", () => {
    const errors = validateFile(makeFile("empty.json", 0));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("empty");
  });

  it("rejects files exceeding 1 MB", () => {
    const errors = validateFile(makeFile("big.json", MAX_FILE_SIZE + 1));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("1 MB");
  });
});
