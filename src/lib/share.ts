/**
 * Share serialization — compact encoding/decoding for shareable decision links.
 *
 * Produces shorter URLs than the raw Decision JSON by:
 * 1. Stripping non-essential fields (id, timestamps, descriptions)
 * 2. Using single-char keys
 * 3. Representing scores as a compact 2D array (indexed by option/criterion order)
 * 4. Compressing with lz-string's URI-safe encoding
 *
 * Format version 1:
 * {
 *   v: 1,                          // format version
 *   t: "Decision Title",           // title
 *   d: "Description",              // description (optional)
 *   o: ["Option A", "Option B"],   // option names
 *   c: [["Cost", 70, "b"], ...],   // criteria: [name, weight, type-initial]
 *   s: [[8, 5], [6, 9]],           // scores[optionIdx][criterionIdx]
 * }
 *
 * @see https://github.com/ericsocrat/decision-os/issues/4
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { Decision, CriterionType, ScoreValue } from "./types";
import { generateId } from "./utils";
import { readScoreOrZero, resolveConfidence } from "./scoring";
import { sanitizeText, sanitizeMultilineText, sanitizeNumber } from "./sanitize";

/** Compacted share payload — version 1 */
export interface SharePayloadV1 {
  /** Format version */
  v: 1;
  /** Decision title */
  t: string;
  /** Decision description (optional) */
  d?: string;
  /** Option names (indexed) */
  o: string[];
  /** Criteria: [name, weight, typeInitial("b"|"c")] */
  c: [string, number, string][];
  /** Scores grid: scores[optionIdx][criterionIdx]; null = unscored */
  s: (number | null)[][];
  /** Confidence grid (optional): conf[optionIdx][criterionIdx]; 0=high, 1=medium, 2=low, absent=high */
  cf?: (number | null)[][];
}

/**
 * Compress a Decision into a compact URL-safe string for sharing.
 * Uses single-char keys, index-based scores, and lz-string compression.
 *
 * @returns encoded string (empty string on failure)
 */
export function encodeShareUrl(decision: Decision): string {
  try {
    const payload = decisionToSharePayload(decision);
    const json = JSON.stringify(payload);
    return compressToEncodedURIComponent(json);
  } catch {
    return "";
  }
}

/**
 * Decode a share URL string back into a full Decision object.
 *
 * @returns a valid Decision, or null if decoding fails
 */
export function decodeShareUrl(encoded: string): Decision | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const payload = JSON.parse(json) as SharePayloadV1;
    if (payload.v !== 1) return null;
    return sharePayloadToDecision(payload);
  } catch {
    return null;
  }
}

/**
 * Build a full share URL from a Decision.
 *
 * @param decision - the decision to encode
 * @param origin - the site origin (e.g. `window.location.origin`)
 * @returns the full URL string, or null if encoding fails or URL is too long
 */
export function buildShareLink(decision: Decision, origin: string): string | null {
  const encoded = encodeShareUrl(decision);
  if (!encoded) return null;
  const url = `${origin}/share#d=${encoded}`;
  // Browsers generally support URLs up to ~8000 chars; be conservative
  if (url.length > 6000) return null;
  return url;
}

// ---------------------------------------------------------------------------
//  Internal helpers
// ---------------------------------------------------------------------------

const CONF_TO_INT: Record<string, number> = { high: 0, medium: 1, low: 2 };
const INT_TO_CONF = ["high", "medium", "low"] as const;

/** Convert a Decision into a compact share payload. */
export function decisionToSharePayload(decision: Decision): SharePayloadV1 {
  let hasConfidence = false;
  const confGrid: (number | null)[][] = [];

  const scoreGrid = decision.options.map((opt) => {
    const confRow: (number | null)[] = [];
    const row = decision.criteria.map((cri) => {
      const sv = decision.scores[opt.id]?.[cri.id];
      const conf = resolveConfidence(sv);
      if (conf && conf !== "high") hasConfidence = true;
      confRow.push(sv === null || sv === undefined ? null : CONF_TO_INT[conf ?? "high"]);
      return sv === null || sv === undefined
        ? null
        : readScoreOrZero(decision.scores, opt.id, cri.id);
    });
    confGrid.push(confRow);
    return row;
  });

  const payload: SharePayloadV1 = {
    v: 1,
    t: decision.title,
    o: decision.options.map((o) => o.name),
    c: decision.criteria.map((c) => [c.name, c.weight, c.type[0]]),
    s: scoreGrid,
  };
  if (decision.description) {
    payload.d = decision.description;
  }
  // Only include confidence grid if any cell has non-high confidence
  if (hasConfidence) {
    payload.cf = confGrid;
  }
  return payload;
}

/** Reconstruct a Decision from a compact share payload. */
export function sharePayloadToDecision(payload: SharePayloadV1): Decision {
  const now = new Date().toISOString();
  const decisionId = generateId();

  const options = payload.o.map((name) => ({
    id: generateId(),
    name: sanitizeText(name, 80),
  }));

  const typeMap: Record<string, CriterionType> = { b: "benefit", c: "cost" };
  const criteria = payload.c.map(([name, weight, typeInitial]) => ({
    id: generateId(),
    name: sanitizeText(name, 80),
    weight: sanitizeNumber(weight, 0, 100, 50),
    type: typeMap[typeInitial] ?? ("benefit" as CriterionType),
  }));

  const scores: Record<string, Record<string, ScoreValue>> = {};
  for (let oi = 0; oi < options.length; oi++) {
    scores[options[oi].id] = {};
    for (let ci = 0; ci < criteria.length; ci++) {
      const cell = payload.s[oi]?.[ci];
      if (cell === null || cell === undefined) {
        scores[options[oi].id][criteria[ci].id] = null;
      } else {
        const safeScore = sanitizeNumber(cell, 0, 10, 0);
        // Check for confidence data
        const confInt = payload.cf?.[oi]?.[ci];
        if (confInt !== undefined && confInt !== null && confInt > 0) {
          scores[options[oi].id][criteria[ci].id] = {
            value: safeScore,
            confidence: INT_TO_CONF[confInt] ?? "high",
          };
        } else {
          scores[options[oi].id][criteria[ci].id] = safeScore;
        }
      }
    }
  }

  return {
    id: decisionId,
    title: sanitizeText(payload.t, 100),
    description: payload.d ? sanitizeMultilineText(payload.d, 500) : undefined,
    options,
    criteria,
    scores,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Calculate approximate URL savings vs raw encoding.
 * Useful for UI feedback ("37% shorter").
 */
export function compressionRatio(rawEncoded: string, compactEncoded: string): number {
  if (rawEncoded.length === 0) return 0;
  return 1 - compactEncoded.length / rawEncoded.length;
}
