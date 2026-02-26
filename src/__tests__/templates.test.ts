/**
 * Tests for template definitions and instantiation.
 */

import { describe, it, expect } from "vitest";
import { TEMPLATES, getTemplateById, instantiateTemplate } from "@/lib/templates";

describe("TEMPLATES", () => {
  it("contains at least 5 templates", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("every template has a unique templateId", () => {
    const ids = TEMPLATES.map((t) => t.templateId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every template has valid structure", () => {
    for (const t of TEMPLATES) {
      expect(t.templateId).toBeTruthy();
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.options.length).toBeGreaterThanOrEqual(2);
      expect(t.criteria.length).toBeGreaterThanOrEqual(1);
      for (const c of t.criteria) {
        expect(c.weight).toBeGreaterThan(0);
        expect(["benefit", "cost"]).toContain(c.type);
      }
    }
  });

  it("every template weights sum to ~100", () => {
    for (const t of TEMPLATES) {
      const sum = t.criteria.reduce((s, c) => s + c.weight, 0);
      expect(sum).toBe(100);
    }
  });
});

describe("getTemplateById", () => {
  it("finds template by id", () => {
    const t = getTemplateById("job-offer");
    expect(t).toBeDefined();
    expect(t!.name).toBe("Job Offer Comparison");
  });

  it("returns undefined for unknown id", () => {
    expect(getTemplateById("nonexistent")).toBeUndefined();
  });
});

describe("instantiateTemplate", () => {
  it("creates a valid Decision from a template", () => {
    const template = TEMPLATES[0];
    const decision = instantiateTemplate(template);

    expect(decision.id).toBeTruthy();
    expect(decision.title).toBe(template.name);
    expect(decision.description).toBe(template.description);
    expect(decision.options).toHaveLength(template.options.length);
    expect(decision.criteria).toHaveLength(template.criteria.length);
    expect(decision.createdAt).toBeTruthy();
    expect(decision.updatedAt).toBeTruthy();
  });

  it("generates unique IDs for all entities", () => {
    const decision = instantiateTemplate(TEMPLATES[0]);
    const allIds = [
      decision.id,
      ...decision.options.map((o) => o.id),
      ...decision.criteria.map((c) => c.id),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("initializes all scores to null (not yet scored)", () => {
    const decision = instantiateTemplate(TEMPLATES[0]);
    for (const opt of decision.options) {
      for (const crit of decision.criteria) {
        expect(decision.scores[opt.id][crit.id]).toBeNull();
      }
    }
  });

  it("two instantiations produce different IDs", () => {
    const a = instantiateTemplate(TEMPLATES[0]);
    const b = instantiateTemplate(TEMPLATES[0]);
    expect(a.id).not.toBe(b.id);
    expect(a.options[0].id).not.toBe(b.options[0].id);
  });
});
