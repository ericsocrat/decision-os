/**
 * Tests for duplicateDecision and exportAllDecisions storage functions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  duplicateDecision,
  exportAllDecisions,
  saveDecision,
  getDecisions,
} from "@/lib/storage";
import { DEMO_DECISION } from "@/lib/demo-data";

describe("duplicateDecision", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("decision-os:decisions", JSON.stringify([DEMO_DECISION]));
  });

  it("creates a copy with new ID and 'Copy of' prefix", () => {
    const dup = duplicateDecision(DEMO_DECISION.id);

    expect(dup).not.toBeNull();
    expect(dup!.id).not.toBe(DEMO_DECISION.id);
    expect(dup!.title).toBe(`Copy of ${DEMO_DECISION.title}`);
  });

  it("preserves options, criteria, and scores", () => {
    const dup = duplicateDecision(DEMO_DECISION.id);

    expect(dup!.options).toHaveLength(DEMO_DECISION.options.length);
    expect(dup!.criteria).toHaveLength(DEMO_DECISION.criteria.length);
    expect(Object.keys(dup!.scores)).toHaveLength(Object.keys(DEMO_DECISION.scores).length);
  });

  it("saves the duplicate to localStorage", () => {
    duplicateDecision(DEMO_DECISION.id);
    const all = getDecisions();
    expect(all).toHaveLength(2);
  });

  it("returns null for non-existent ID", () => {
    const result = duplicateDecision("non-existent-id");
    expect(result).toBeNull();
  });

  it("handles 'Untitled' title gracefully", () => {
    const untitled = { ...DEMO_DECISION, id: "untitled-dec", title: "" };
    saveDecision(untitled);
    const dup = duplicateDecision("untitled-dec");
    expect(dup!.title).toBe("Copy of Untitled");
  });
});

describe("exportAllDecisions", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("decision-os:decisions", JSON.stringify([DEMO_DECISION]));
  });

  it("returns valid JSON string of all decisions", () => {
    const json = exportAllDecisions();
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(DEMO_DECISION.id);
  });

  it("includes all decisions when multiple exist", () => {
    const second = { ...DEMO_DECISION, id: "second-dec", title: "Second" };
    saveDecision(second);

    const json = exportAllDecisions();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
  });
});
