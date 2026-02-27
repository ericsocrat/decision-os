/**
 * Server-stored shareable decision links.
 *
 * When Supabase is available and the user is authenticated, decisions
 * are stored server-side in the `shared_decisions` table and accessed
 * via short IDs (e.g. `/share?id=X7kq2mPn`).
 *
 * Falls back gracefully to the existing hash-based approach when
 * Supabase is unavailable or the user is not authenticated.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/244
 */

import type { Decision } from "./types";
import { isDecision } from "./validation";
import { getSupabase } from "./supabase";

// ─── Short ID Generation ──────────────────────────────────────────

const SHORT_ID_LENGTH = 8;
const SHORT_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generate a cryptographically random 8-character alphanumeric ID.
 * Uses `crypto.getRandomValues` for uniform distribution.
 *
 * Collision probability: 1 in 62^8 ≈ 218 trillion — effectively zero.
 */
export function generateShortId(): string {
  const bytes = new Uint8Array(SHORT_ID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SHORT_ID_CHARS[b % SHORT_ID_CHARS.length]).join("");
}

// ─── Create Shared Link ───────────────────────────────────────────

/**
 * Store a decision snapshot in Supabase and return the short ID.
 *
 * @returns the 8-char short ID, or `null` if:
 *   - Supabase is not configured
 *   - The user is not authenticated
 *   - The insert fails
 */
export async function createSharedLink(decision: Decision): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;

    const shortId = generateShortId();

    const { error } = await sb.from("shared_decisions").insert({
      id: shortId,
      decision: decision as unknown as Record<string, unknown>,
      created_by: user.id,
    });

    if (error) {
      console.error("[DecisionOS:share] Failed to create shared link:", error.message);
      return null;
    }

    return shortId;
  } catch (err) {
    console.error("[DecisionOS:share] Unexpected error creating shared link:", err);
    return null;
  }
}

// ─── Fetch Shared Decision ────────────────────────────────────────

/**
 * Fetch a shared decision by its short ID.
 * This is a public read — no authentication required.
 *
 * @returns the Decision object, or `null` if not found / expired / invalid
 */
export async function fetchSharedDecision(shortId: string): Promise<Decision | null> {
  const sb = getSupabase();
  if (!sb) return null;

  // Validate short ID format (alphanumeric, expected length)
  if (!shortId || !/^[A-Za-z0-9]+$/.test(shortId)) return null;

  try {
    const { data, error } = await sb
      .from("shared_decisions")
      .select("decision, expires_at")
      .eq("id", shortId)
      .single();

    if (error || !data) return null;

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    const decision = data.decision as unknown;
    if (!isDecision(decision)) return null;

    return decision;
  } catch (err) {
    console.error("[DecisionOS:share] Failed to fetch shared decision:", err);
    return null;
  }
}

/**
 * Build a server-stored share URL.
 *
 * @param shortId - the 8-char short ID
 * @param origin - the site origin (e.g. `window.location.origin`)
 * @returns the full URL string (e.g. `https://example.com/share?id=X7kq2mPn`)
 */
export function buildServerShareUrl(shortId: string, origin: string): string {
  return `${origin}/share?id=${shortId}`;
}
