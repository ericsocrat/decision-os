/**
 * Tests for share serialization — compact encoding/decoding of decisions for URL sharing.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/4
 */

import { describe, test, expect } from "vitest";
import {
  encodeShareUrl,
  decodeShareUrl,
  buildShareLink,
  decisionToSharePayload,
  sharePayloadToDecision,
  compressionRatio,
} from "@/lib/share";
import { encodeDecisionToUrl } from "@/lib/utils";
import type { Decision } from "@/lib/types";

// ---------------------------------------------------------------------------
//  Fixtures
// ---------------------------------------------------------------------------

const sampleDecision: Decision = {
  id: "test-id-1",
  title: "Choose a Framework",
  description: "Evaluating frontend frameworks for the new project",
  options: [
    { id: "opt-react", name: "React" },
    { id: "opt-vue", name: "Vue" },
    { id: "opt-svelte", name: "Svelte" },
  ],
  criteria: [
    { id: "cri-perf", name: "Performance", weight: 80, type: "benefit" },
    { id: "cri-eco", name: "Ecosystem", weight: 60, type: "benefit" },
    { id: "cri-learn", name: "Learning Curve", weight: 40, type: "cost" },
  ],
  scores: {
    "opt-react": { "cri-perf": 7, "cri-eco": 9, "cri-learn": 6 },
    "opt-vue": { "cri-perf": 8, "cri-eco": 7, "cri-learn": 4 },
    "opt-svelte": { "cri-perf": 9, "cri-eco": 5, "cri-learn": 3 },
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T12:00:00.000Z",
};

const minimalDecision: Decision = {
  id: "min-1",
  title: "Minimal",
  options: [{ id: "o1", name: "A" }],
  criteria: [{ id: "c1", name: "X", weight: 100, type: "benefit" }],
  scores: { o1: { c1: 5 } },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

// ---------------------------------------------------------------------------
//  decisionToSharePayload
// ---------------------------------------------------------------------------

describe("decisionToSharePayload", () => {
  test("produces expected compact format", () => {
    const payload = decisionToSharePayload(sampleDecision);

    expect(payload.v).toBe(1);
    expect(payload.t).toBe("Choose a Framework");
    expect(payload.d).toBe("Evaluating frontend frameworks for the new project");
    expect(payload.o).toEqual(["React", "Vue", "Svelte"]);
    expect(payload.c).toEqual([
      ["Performance", 80, "b"],
      ["Ecosystem", 60, "b"],
      ["Learning Curve", 40, "c"],
    ]);
    expect(payload.s).toEqual([
      [7, 9, 6],
      [8, 7, 4],
      [9, 5, 3],
    ]);
  });

  test("omits description when absent", () => {
    const noDesc = { ...sampleDecision, description: undefined };
    const payload = decisionToSharePayload(noDesc);
    expect(payload.d).toBeUndefined();
  });

  test("handles empty description", () => {
    const emptyDesc = { ...sampleDecision, description: "" };
    const payload = decisionToSharePayload(emptyDesc);
    // Empty string is falsy, should be omitted
    expect(payload.d).toBeUndefined();
  });

  test("handles missing scores gracefully", () => {
    const missing = { ...sampleDecision, scores: {} };
    const payload = decisionToSharePayload(missing);
    expect(payload.s).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });
});

// ---------------------------------------------------------------------------
//  sharePayloadToDecision
// ---------------------------------------------------------------------------

describe("sharePayloadToDecision", () => {
  test("round-trips option names", () => {
    const payload = decisionToSharePayload(sampleDecision);
    const restored = sharePayloadToDecision(payload);
    expect(restored.options.map((o) => o.name)).toEqual(["React", "Vue", "Svelte"]);
  });

  test("round-trips criteria names, weights, and types", () => {
    const payload = decisionToSharePayload(sampleDecision);
    const restored = sharePayloadToDecision(payload);
    expect(restored.criteria.map((c) => [c.name, c.weight, c.type])).toEqual([
      ["Performance", 80, "benefit"],
      ["Ecosystem", 60, "benefit"],
      ["Learning Curve", 40, "cost"],
    ]);
  });

  test("round-trips scores correctly", () => {
    const payload = decisionToSharePayload(sampleDecision);
    const restored = sharePayloadToDecision(payload);

    for (let oi = 0; oi < restored.options.length; oi++) {
      for (let ci = 0; ci < restored.criteria.length; ci++) {
        const optId = restored.options[oi].id;
        const criId = restored.criteria[ci].id;
        expect(restored.scores[optId][criId]).toBe(payload.s[oi][ci]);
      }
    }
  });

  test("restores title and description", () => {
    const payload = decisionToSharePayload(sampleDecision);
    const restored = sharePayloadToDecision(payload);
    expect(restored.title).toBe("Choose a Framework");
    expect(restored.description).toBe("Evaluating frontend frameworks for the new project");
  });

  test("generates valid IDs", () => {
    const payload = decisionToSharePayload(sampleDecision);
    const restored = sharePayloadToDecision(payload);
    expect(restored.id).toBeTruthy();
    expect(restored.options.every((o) => o.id.length > 0)).toBe(true);
    expect(restored.criteria.every((c) => c.id.length > 0)).toBe(true);
  });

  test("generates valid timestamps", () => {
    const payload = decisionToSharePayload(sampleDecision);
    const restored = sharePayloadToDecision(payload);
    expect(new Date(restored.createdAt).getTime()).not.toBeNaN();
    expect(new Date(restored.updatedAt).getTime()).not.toBeNaN();
  });
});

// ---------------------------------------------------------------------------
//  encodeShareUrl / decodeShareUrl
// ---------------------------------------------------------------------------

describe("encodeShareUrl / decodeShareUrl", () => {
  test("round-trips a decision losslessly", () => {
    const encoded = encodeShareUrl(sampleDecision);
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeShareUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.title).toBe(sampleDecision.title);
    expect(decoded!.options.map((o) => o.name)).toEqual(sampleDecision.options.map((o) => o.name));
    expect(decoded!.criteria.map((c) => c.name)).toEqual(
      sampleDecision.criteria.map((c) => c.name)
    );
  });

  test("produces shorter URLs than raw encoding", () => {
    const compactEncoded = encodeShareUrl(sampleDecision);
    const rawEncoded = encodeDecisionToUrl(sampleDecision);

    expect(compactEncoded.length).toBeLessThan(rawEncoded.length);
  });

  test("handles minimal decision", () => {
    const encoded = encodeShareUrl(minimalDecision);
    const decoded = decodeShareUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.title).toBe("Minimal");
    expect(decoded!.options).toHaveLength(1);
    expect(decoded!.criteria).toHaveLength(1);
  });

  test("returns null for empty string", () => {
    expect(decodeShareUrl("")).toBeNull();
  });

  test("returns null for invalid data", () => {
    expect(decodeShareUrl("not-valid-compressed-data")).toBeNull();
  });

  test("returns null for wrong version", async () => {
    // Encode a payload with wrong version
    const { compressToEncodedURIComponent } = await import("lz-string");
    const bad = compressToEncodedURIComponent(JSON.stringify({ v: 99 }));
    expect(decodeShareUrl(bad)).toBeNull();
  });

  test("encodeShareUrl returns empty string on failure", () => {
    // Force failure by passing a circular reference (stringify will throw)
    const circular = { ...sampleDecision } as Record<string, unknown>;
    const obj: Record<string, unknown> = {};
    obj.self = obj;
    circular.options = obj as unknown as Decision["options"];
    expect(encodeShareUrl(circular as unknown as Decision)).toBe("");
  });
});

// ---------------------------------------------------------------------------
//  buildShareLink
// ---------------------------------------------------------------------------

describe("buildShareLink", () => {
  test("builds a valid share URL", () => {
    const url = buildShareLink(sampleDecision, "https://example.com");
    expect(url).not.toBeNull();
    expect(url!).toMatch(/^https:\/\/example\.com\/share#d=.+/);
  });

  test("URL contains compressed data", () => {
    const url = buildShareLink(sampleDecision, "https://example.com");
    expect(url).not.toBeNull();
    const hash = url!.split("#d=")[1];
    expect(hash.length).toBeGreaterThan(0);

    // Should be decodable
    const decoded = decodeShareUrl(hash);
    expect(decoded).not.toBeNull();
    expect(decoded!.title).toBe(sampleDecision.title);
  });

  test("returns null for very large decisions", () => {
    // Create a decision that would exceed URL limits
    const large: Decision = {
      ...sampleDecision,
      options: Array.from({ length: 100 }, (_, i) => ({
        id: `opt-${i}`,
        name: `Option with a very long name to increase payload size ${i}`,
        description: "A".repeat(500),
      })),
      criteria: Array.from({ length: 50 }, (_, i) => ({
        id: `cri-${i}`,
        name: `Criterion ${i}`,
        weight: 50,
        type: "benefit" as const,
        description: "B".repeat(500),
      })),
      scores: {},
    };
    // Fill scores
    for (const opt of large.options) {
      large.scores[opt.id] = {};
      for (const cri of large.criteria) {
        large.scores[opt.id][cri.id] = Math.floor(Math.random() * 10);
      }
    }
    const url = buildShareLink(large, "https://example.com");
    expect(url).toBeNull();
  });

  test("handles different origins", () => {
    const url = buildShareLink(minimalDecision, "http://localhost:3000");
    expect(url).toMatch(/^http:\/\/localhost:3000\/share#d=/);
  });
});

// ---------------------------------------------------------------------------
//  compressionRatio
// ---------------------------------------------------------------------------

describe("compressionRatio", () => {
  test("calculates savings correctly", () => {
    const rawEncoded = encodeDecisionToUrl(sampleDecision);
    const compactEncoded = encodeShareUrl(sampleDecision);
    const ratio = compressionRatio(rawEncoded, compactEncoded);

    expect(ratio).toBeGreaterThan(0); // compact should be smaller
    expect(ratio).toBeLessThan(1);
  });

  test("returns 0 for empty raw string", () => {
    expect(compressionRatio("", "abc")).toBe(0);
  });
});
