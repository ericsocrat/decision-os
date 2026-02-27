/**
 * Tests for wizard decision type templates.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/226
 */

import { describe, expect, it } from "vitest";
import { DECISION_TYPES, getDecisionType } from "@/lib/wizard-templates";

describe("wizard-templates", () => {
  it("exports exactly 6 decision type cards", () => {
    expect(DECISION_TYPES).toHaveLength(6);
  });

  it("every card has the required shape", () => {
    for (const card of DECISION_TYPES) {
      expect(card).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          iconName: expect.any(String),
          emoji: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          criteria: expect.any(Array),
        })
      );
    }
  });

  it("each non-custom type has criteria whose weights sum to 100", () => {
    const nonCustom = DECISION_TYPES.filter((t) => t.id !== "custom");
    for (const card of nonCustom) {
      const total = card.criteria.reduce((s, c) => s + c.weight, 0);
      expect(total).toBe(100);
    }
  });

  it("custom type has zero criteria", () => {
    const custom = DECISION_TYPES.find((t) => t.id === "custom");
    expect(custom).toBeDefined();
    expect(custom!.criteria).toHaveLength(0);
  });

  it("every criterion has a valid type (benefit | cost)", () => {
    for (const card of DECISION_TYPES) {
      for (const c of card.criteria) {
        expect(["benefit", "cost"]).toContain(c.type);
      }
    }
  });

  it("getDecisionType returns the correct card by ID", () => {
    expect(getDecisionType("housing")?.title).toBe("Housing");
    expect(getDecisionType("job-career")?.title).toBe("Job / Career");
  });

  it("getDecisionType returns undefined for unknown IDs", () => {
    expect(getDecisionType("nonexistent")).toBeUndefined();
  });
});
