/**
 * Unit tests for score provenance tracking logic (Issue #109).
 *
 * Validates:
 * - Metadata factory helpers (manual, enriched, overridden)
 * - Query helpers (getProvenance, getMetadata, canRestoreEnriched)
 * - Matrix mutation helpers (set, removeOption, removeCriterion)
 * - Display label generation
 */

import { describe, it, expect } from "vitest";
import {
  createManualMetadata,
  createEnrichedMetadata,
  createOverrideMetadata,
  getProvenance,
  getMetadata,
  canRestoreEnriched,
  setMetadataCell,
  removeOptionMetadata,
  removeCriterionMetadata,
  provenanceLabel,
} from "@/lib/provenance";
import type { Decision, ScoreMetadata } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDecision(
  scoreMetadata?: Decision["scoreMetadata"],
): Decision {
  return {
    id: "test",
    title: "Test",
    description: "",
    options: [{ id: "o1", name: "A" }],
    criteria: [{ id: "c1", name: "X", weight: 50, type: "benefit" }],
    scores: {},
    scoreMetadata,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Provenance — factory helpers", () => {
  it("createManualMetadata returns manual provenance", () => {
    const meta = createManualMetadata();
    expect(meta.provenance).toBe("manual");
    expect(meta.enrichedValue).toBeUndefined();
  });

  it("createEnrichedMetadata stores value, source, and tier", () => {
    const meta = createEnrichedMetadata(7.5, "CostOfLivingProvider", 2);
    expect(meta.provenance).toBe("enriched");
    expect(meta.enrichedValue).toBe(7.5);
    expect(meta.enrichedSource).toBe("CostOfLivingProvider");
    expect(meta.enrichedTier).toBe(2);
  });

  it("createOverrideMetadata preserves enrichment info", () => {
    const enriched = createEnrichedMetadata(6, "Numbeo", 2);
    const override = createOverrideMetadata(enriched, "Local knowledge");
    expect(override.provenance).toBe("overridden");
    expect(override.enrichedValue).toBe(6);
    expect(override.enrichedSource).toBe("Numbeo");
    expect(override.enrichedTier).toBe(2);
    expect(override.overrideReason).toBe("Local knowledge");
    expect(override.overriddenAt).toBeTruthy();
  });

  it("createOverrideMetadata sets ISO timestamp", () => {
    const enriched = createEnrichedMetadata(5, "src", 1);
    const before = Date.now();
    const override = createOverrideMetadata(enriched);
    const after = Date.now();
    const ts = new Date(override.overriddenAt!).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe("Provenance — query helpers", () => {
  it("getProvenance returns manual for cells without metadata", () => {
    const decision = makeDecision();
    expect(getProvenance(decision, "o1", "c1")).toBe("manual");
  });

  it("getProvenance returns enriched when metadata is set", () => {
    const decision = makeDecision({
      o1: { c1: createEnrichedMetadata(8, "src", 2) },
    });
    expect(getProvenance(decision, "o1", "c1")).toBe("enriched");
  });

  it("getMetadata returns undefined for missing cells", () => {
    const decision = makeDecision();
    expect(getMetadata(decision, "o1", "c1")).toBeUndefined();
  });

  it("getMetadata returns the metadata object when present", () => {
    const meta = createEnrichedMetadata(5, "src", 3);
    const decision = makeDecision({ o1: { c1: meta } });
    expect(getMetadata(decision, "o1", "c1")).toEqual(meta);
  });

  it("canRestoreEnriched returns false for manual cells", () => {
    const decision = makeDecision();
    expect(canRestoreEnriched(decision, "o1", "c1")).toBe(false);
  });

  it("canRestoreEnriched returns false for enriched (not overridden) cells", () => {
    const decision = makeDecision({
      o1: { c1: createEnrichedMetadata(7, "src", 2) },
    });
    expect(canRestoreEnriched(decision, "o1", "c1")).toBe(false);
  });

  it("canRestoreEnriched returns true for overridden cells with enrichedValue", () => {
    const enriched = createEnrichedMetadata(7, "src", 2);
    const overridden = createOverrideMetadata(enriched);
    const decision = makeDecision({ o1: { c1: overridden } });
    expect(canRestoreEnriched(decision, "o1", "c1")).toBe(true);
  });
});

describe("Provenance — matrix helpers", () => {
  it("setMetadataCell creates matrix from undefined", () => {
    const meta = createManualMetadata();
    const result = setMetadataCell(undefined, "o1", "c1", meta);
    expect(result.o1.c1).toEqual(meta);
  });

  it("setMetadataCell adds to existing matrix", () => {
    const existing: Record<string, Record<string, ScoreMetadata>> = {
      o1: { c1: createManualMetadata() },
    };
    const enriched = createEnrichedMetadata(5, "src", 2);
    const result = setMetadataCell(existing, "o1", "c2", enriched);
    expect(result.o1.c1.provenance).toBe("manual");
    expect(result.o1.c2.provenance).toBe("enriched");
  });

  it("removeOptionMetadata removes the option row", () => {
    const matrix = {
      o1: { c1: createManualMetadata() },
      o2: { c1: createManualMetadata() },
    };
    const result = removeOptionMetadata(matrix, "o1");
    expect(result).toBeDefined();
    expect(result!.o1).toBeUndefined();
    expect(result!.o2).toBeDefined();
  });

  it("removeOptionMetadata returns undefined when last option removed", () => {
    const matrix = { o1: { c1: createManualMetadata() } };
    const result = removeOptionMetadata(matrix, "o1");
    expect(result).toBeUndefined();
  });

  it("removeCriterionMetadata removes criterion from all options", () => {
    const matrix = {
      o1: { c1: createManualMetadata(), c2: createManualMetadata() },
      o2: { c1: createManualMetadata() },
    };
    const result = removeCriterionMetadata(matrix, "c1");
    expect(result).toBeDefined();
    expect(result!.o1.c1).toBeUndefined();
    expect(result!.o1.c2).toBeDefined();
    expect(result!.o2).toBeUndefined(); // o2 had only c1
  });

  it("removeCriterionMetadata returns undefined when empty", () => {
    const matrix = { o1: { c1: createManualMetadata() } };
    const result = removeCriterionMetadata(matrix, "c1");
    expect(result).toBeUndefined();
  });
});

describe("Provenance — provenanceLabel", () => {
  it("returns 'Manually entered' for undefined", () => {
    expect(provenanceLabel(undefined)).toBe("Manually entered");
  });

  it("returns 'Manually entered' for manual provenance", () => {
    expect(provenanceLabel(createManualMetadata())).toBe("Manually entered");
  });

  it("returns enrichment details for enriched provenance", () => {
    const label = provenanceLabel(createEnrichedMetadata(7, "Numbeo", 2));
    expect(label).toContain("Enriched");
    expect(label).toContain("Numbeo");
    expect(label).toContain("Tier 2");
  });

  it("returns override details for overridden provenance", () => {
    const enriched = createEnrichedMetadata(6, "Provider", 3);
    const overridden = createOverrideMetadata(enriched);
    const label = provenanceLabel(overridden);
    expect(label).toContain("Overridden");
    expect(label).toContain("6");
    expect(label).toContain("Provider");
  });
});
