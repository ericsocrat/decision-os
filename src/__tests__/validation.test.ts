/**
 * Unit tests for validation utilities.
 */

import { describe, it, expect } from "vitest";
import {
  validateDecision,
  validateOption,
  validateCriterion,
  validateScores,
} from "@/lib/validation";
import type { Decision } from "@/lib/types";
import { DEMO_DECISION } from "@/lib/demo-data";

describe("validateDecision", () => {
  it("returns no errors for a valid decision (demo data)", () => {
    const errors = validateDecision(DEMO_DECISION);
    expect(errors).toHaveLength(0);
  });

  it("requires a title", () => {
    const decision: Decision = {
      ...DEMO_DECISION,
      title: "  ",
    };
    const errors = validateDecision(decision);
    expect(errors.some((e) => e.field === "title")).toBe(true);
  });

  it("requires at least 2 options", () => {
    const decision: Decision = {
      ...DEMO_DECISION,
      options: [{ id: "a", name: "Only one" }],
    };
    const errors = validateDecision(decision);
    expect(errors.some((e) => e.field === "options")).toBe(true);
  });

  it("requires at least 1 criterion", () => {
    const decision: Decision = {
      ...DEMO_DECISION,
      criteria: [],
    };
    const errors = validateDecision(decision);
    expect(errors.some((e) => e.field === "criteria")).toBe(true);
  });

  it("detects duplicate option names", () => {
    const decision: Decision = {
      ...DEMO_DECISION,
      options: [
        { id: "a", name: "Same" },
        { id: "b", name: "Same" },
      ],
    };
    const errors = validateDecision(decision);
    expect(errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });

  it("propagates option-level errors with prefixed field paths", () => {
    const decision: Decision = {
      ...DEMO_DECISION,
      options: [
        { id: "a", name: "" },
        { id: "b", name: "Valid" },
      ],
    };
    const errors = validateDecision(decision);
    // The invalid option at index 0 should produce options[0].name error
    expect(errors.some((e) => e.field === "options[0].name")).toBe(true);
  });

  it("propagates criterion-level errors with prefixed field paths", () => {
    const decision: Decision = {
      ...DEMO_DECISION,
      criteria: [
        { id: "c1", name: "", weight: 50, type: "benefit" },
        { id: "c2", name: "Valid", weight: 50, type: "benefit" },
      ],
    };
    const errors = validateDecision(decision);
    expect(errors.some((e) => e.field === "criteria[0].name")).toBe(true);
  });
});

describe("validateOption", () => {
  it("requires a name", () => {
    expect(validateOption({ id: "x", name: "" })).toHaveLength(1);
  });

  it("passes for valid option", () => {
    expect(validateOption({ id: "x", name: "Valid" })).toHaveLength(0);
  });
});

describe("validateCriterion", () => {
  it("requires a name", () => {
    const errors = validateCriterion({
      id: "c",
      name: "",
      weight: 50,
      type: "benefit",
    });
    expect(errors.some((e) => e.field === "name")).toBe(true);
  });

  it("rejects weight > 100", () => {
    const errors = validateCriterion({
      id: "c",
      name: "A",
      weight: 150,
      type: "benefit",
    });
    expect(errors.some((e) => e.field === "weight")).toBe(true);
  });

  it("rejects negative weight", () => {
    const errors = validateCriterion({
      id: "c",
      name: "A",
      weight: -5,
      type: "benefit",
    });
    expect(errors.some((e) => e.field === "weight")).toBe(true);
  });

  it("rejects invalid type", () => {
    const errors = validateCriterion({
      id: "c",
      name: "A",
      weight: 50,
      type: "invalid" as "benefit",
    });
    expect(errors.some((e) => e.field === "type")).toBe(true);
  });
});

describe("validateScores", () => {
  it("rejects scores out of range", () => {
    const errors = validateScores(
      { opt1: { c1: 15 } },
      [{ id: "opt1", name: "O" }],
      [{ id: "c1", name: "C", weight: 50, type: "benefit" }]
    );
    expect(errors).toHaveLength(1);
  });

  it("accepts valid scores", () => {
    const errors = validateScores(
      { opt1: { c1: 5 } },
      [{ id: "opt1", name: "O" }],
      [{ id: "c1", name: "C", weight: 50, type: "benefit" }]
    );
    expect(errors).toHaveLength(0);
  });
});
