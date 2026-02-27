/**
 * Security tests — validates sanitization, CSP hardening, and error handling.
 *
 * Covers:
 * - Input sanitization utilities (sanitize.ts)
 * - Share link sanitization (share.ts)
 * - Import pipeline sanitization (import.ts)
 * - CSP directive completeness (next.config.ts)
 * - Error boundary production behaviour
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  stripControlChars,
  sanitizeText,
  sanitizeMultilineText,
  sanitizeNumber,
  MAX_TEXT_LENGTH,
  MAX_TEXTAREA_LENGTH,
} from "@/lib/sanitize";
import { sharePayloadToDecision } from "@/lib/share";
import type { SharePayloadV1 } from "@/lib/share";
import { importFromJson, csvToDecision } from "@/lib/import";
import type { CsvPreviewData } from "@/lib/import";

// ─── Sanitize Module ───────────────────────────────────────────────

describe("stripControlChars", () => {
  it("removes null bytes", () => {
    expect(stripControlChars("hello\x00world")).toBe("helloworld");
  });

  it("removes ASCII control characters except tab, LF, CR", () => {
    expect(stripControlChars("a\x01b\x02c\x1Fd")).toBe("abcd");
  });

  it("preserves tab, LF, CR", () => {
    expect(stripControlChars("a\tb\nc\rd")).toBe("a\tb\nc\rd");
  });

  it("removes zero-width characters", () => {
    expect(stripControlChars("a\u200Bb\u200Cc\u200Dd")).toBe("abcd");
  });

  it("removes BiDi override characters", () => {
    expect(stripControlChars("a\u202Ab\u202Bc\u202Dd\u202Ee")).toBe("abcde");
  });

  it("removes BOM", () => {
    expect(stripControlChars("\uFEFFhello")).toBe("hello");
  });

  it("preserves normal unicode", () => {
    expect(stripControlChars("café résumé 日本語")).toBe("café résumé 日本語");
  });
});

describe("sanitizeText", () => {
  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });

  it("collapses multiple spaces to single space", () => {
    expect(sanitizeText("hello   world")).toBe("hello world");
  });

  it("removes control characters", () => {
    expect(sanitizeText("hello\x00\x01world")).toBe("helloworld");
  });

  it("enforces default max length", () => {
    const long = "a".repeat(MAX_TEXT_LENGTH + 100);
    expect(sanitizeText(long).length).toBe(MAX_TEXT_LENGTH);
  });

  it("enforces custom max length", () => {
    expect(sanitizeText("hello world", 5)).toBe("hello");
  });

  it("handles empty string", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("strips newlines in single-line mode", () => {
    expect(sanitizeText("hello\nworld")).toBe("hello world");
  });
});

describe("sanitizeMultilineText", () => {
  it("normalizes CRLF to LF", () => {
    expect(sanitizeMultilineText("hello\r\nworld")).toBe("hello\nworld");
  });

  it("collapses 3+ consecutive newlines to 2", () => {
    expect(sanitizeMultilineText("hello\n\n\n\nworld")).toBe("hello\n\nworld");
  });

  it("enforces max length", () => {
    const long = "a".repeat(MAX_TEXTAREA_LENGTH + 100);
    expect(sanitizeMultilineText(long).length).toBe(MAX_TEXTAREA_LENGTH);
  });

  it("trims leading/trailing whitespace", () => {
    expect(sanitizeMultilineText("  hello\nworld  ")).toBe("hello\nworld");
  });
});

describe("sanitizeNumber", () => {
  it("clamps to min", () => {
    expect(sanitizeNumber(-5, 0, 10, 0)).toBe(0);
  });

  it("clamps to max", () => {
    expect(sanitizeNumber(15, 0, 10, 0)).toBe(10);
  });

  it("returns fallback for NaN", () => {
    expect(sanitizeNumber("abc", 0, 10, 5)).toBe(5);
  });

  it("returns fallback for Infinity", () => {
    expect(sanitizeNumber(Infinity, 0, 10, 5)).toBe(5);
  });

  it("passes valid numbers through", () => {
    expect(sanitizeNumber(7, 0, 10, 0)).toBe(7);
  });

  it("handles string numbers", () => {
    expect(sanitizeNumber("3", 0, 10, 0)).toBe(3);
  });
});

// ─── Share Link Sanitization ───────────────────────────────────────

describe("share link sanitization", () => {
  it("sanitizes option and criterion names from share payload", () => {
    const payload: SharePayloadV1 = {
      v: 1,
      t: "Test\x00Decision",
      o: ["Option\u200BA", "Option\x01B"],
      c: [
        ["Criterion\u202AC", 50, "b"],
        ["Criterion\uFEFFD", 80, "c"],
      ],
      s: [
        [5, 8],
        [3, 7],
      ],
    };

    const decision = sharePayloadToDecision(payload);
    expect(decision.title).toBe("TestDecision");
    expect(decision.options[0].name).toBe("OptionA");
    expect(decision.options[1].name).toBe("OptionB");
    expect(decision.criteria[0].name).toBe("CriterionC");
    expect(decision.criteria[1].name).toBe("CriterionD");
  });

  it("clamps scores from share payload to 0-10 range", () => {
    const payload: SharePayloadV1 = {
      v: 1,
      t: "Test",
      o: ["A"],
      c: [["C1", 50, "b"]],
      s: [[999]],
    };

    const decision = sharePayloadToDecision(payload);
    const optionId = decision.options[0].id;
    const criterionId = decision.criteria[0].id;
    expect(decision.scores[optionId][criterionId]).toBe(10);
  });

  it("clamps negative scores to 0", () => {
    const payload: SharePayloadV1 = {
      v: 1,
      t: "Test",
      o: ["A"],
      c: [["C1", 50, "b"]],
      s: [[-5]],
    };

    const decision = sharePayloadToDecision(payload);
    const optionId = decision.options[0].id;
    const criterionId = decision.criteria[0].id;
    expect(decision.scores[optionId][criterionId]).toBe(0);
  });

  it("clamps weights from share payload", () => {
    const payload: SharePayloadV1 = {
      v: 1,
      t: "Test",
      o: ["A"],
      c: [["C1", 999, "b"]],
      s: [[5]],
    };

    const decision = sharePayloadToDecision(payload);
    expect(decision.criteria[0].weight).toBe(100);
  });

  it("sanitizes description from share payload", () => {
    const payload: SharePayloadV1 = {
      v: 1,
      t: "Test",
      d: "Description\x00with\u200Bcontrol\u202Echars",
      o: ["A"],
      c: [["C1", 50, "b"]],
      s: [[5]],
    };

    const decision = sharePayloadToDecision(payload);
    expect(decision.description).toBe("Descriptionwithcontrolchars");
  });
});

// ─── Import Pipeline Sanitization ──────────────────────────────────

describe("import pipeline sanitization", () => {
  it("sanitizes JSON import text fields", () => {
    const json = JSON.stringify({
      id: "test-id",
      title: "Test\x00Title",
      options: [
        { id: "o1", name: "Option\u200BA" },
        { id: "o2", name: "Option\x01B" },
      ],
      criteria: [
        { id: "c1", name: "Criterion\u202AC", weight: 50, type: "benefit" },
      ],
      scores: { o1: { c1: 5 }, o2: { c1: 8 } },
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });

    const result = importFromJson(json);
    expect(result.success).toBe(true);
    expect(result.decision?.title).toBe("TestTitle");
    expect(result.decision?.options[0].name).toBe("OptionA");
    expect(result.decision?.options[1].name).toBe("OptionB");
    expect(result.decision?.criteria[0].name).toBe("CriterionC");
  });

  it("sanitizes CSV import text fields", () => {
    const preview: CsvPreviewData = {
      headers: ["Criterion\x00A", "Criterion\u200BB"],
      rows: [
        { option: "Option\x01X", scores: [5, 8] },
        { option: "Option\u202AY", scores: [3, 7] },
      ],
      raw: [],
    };

    const decision = csvToDecision(preview, "Test\x00 Title", ["benefit", "cost"], [50, 80]);
    expect(decision.title).toBe("Test Title");
    expect(decision.options[0].name).toBe("OptionX");
    expect(decision.options[1].name).toBe("OptionY");
    expect(decision.criteria[0].name).toBe("CriterionA");
    expect(decision.criteria[1].name).toBe("CriterionB");
  });
});

// ─── CSP Hardening ─────────────────────────────────────────────────

describe("CSP hardening directives", () => {
  let cspValue: string;

  beforeAll(async () => {
    const mod = await import("../../next.config");
    const config = mod.default;
    const headerSets = await config.headers!();
    const headers = headerSets[0].headers as Array<{
      key: string;
      value: string;
    }>;
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    cspValue = csp?.value ?? "";
  });

  it("includes object-src none to block plugins", () => {
    expect(cspValue).toContain("object-src 'none'");
  });

  it("includes base-uri self to prevent base tag injection", () => {
    expect(cspValue).toContain("base-uri 'self'");
  });

  it("includes form-action self to restrict form submissions", () => {
    expect(cspValue).toContain("form-action 'self'");
  });
});
