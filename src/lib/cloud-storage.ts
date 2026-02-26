/**
 * Cloud storage layer for Decision OS.
 *
 * Provides CRUD operations against the Supabase `decisions` table.
 * Every function is guarded — returns `null` / empty arrays if Supabase
 * is not configured or the user is not authenticated.
 */

import type { Decision } from "./types";
import { isDecision } from "./validation";
import { getSupabase } from "./supabase";

// ─── Helpers ───────────────────────────────────────────────────────

/** Get the current authenticated user ID, or null. */
async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user?.id ?? null;
}

// ─── CRUD ──────────────────────────────────────────────────────────

/**
 * Fetch all decisions for the signed-in user from the cloud.
 * Returns an empty array when not authenticated or on error.
 */
export async function cloudGetDecisions(): Promise<Decision[]> {
  const sb = getSupabase();
  const userId = await currentUserId();
  if (!sb || !userId) return [];

  const { data, error } = await sb
    .from("decisions")
    .select("data")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[DecisionOS:cloud] fetch decisions failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.data as unknown).filter((d): d is Decision => isDecision(d));
}

/**
 * Fetch a single decision by its app-level ID.
 */
export async function cloudGetDecision(decisionId: string): Promise<Decision | null> {
  const sb = getSupabase();
  const userId = await currentUserId();
  if (!sb || !userId) return null;

  const { data, error } = await sb
    .from("decisions")
    .select("data")
    .eq("user_id", userId)
    .eq("decision_id", decisionId)
    .maybeSingle();

  if (error) {
    console.error("[DecisionOS:cloud] fetch decision failed:", error.message);
    return null;
  }

  const parsed = data?.data as unknown;
  return isDecision(parsed) ? parsed : null;
}

/**
 * Upsert a decision to the cloud.
 * Uses the composite (user_id, decision_id) as the conflict target.
 */
export async function cloudSaveDecision(decision: Decision): Promise<boolean> {
  const sb = getSupabase();
  const userId = await currentUserId();
  if (!sb || !userId) return false;

  const { error } = await sb.from("decisions").upsert(
    {
      user_id: userId,
      decision_id: decision.id,
      data: decision as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,decision_id" }
  );

  if (error) {
    console.error("[DecisionOS:cloud] save decision failed:", error.message);
    return false;
  }
  return true;
}

/**
 * Delete a decision from the cloud.
 */
export async function cloudDeleteDecision(decisionId: string): Promise<boolean> {
  const sb = getSupabase();
  const userId = await currentUserId();
  if (!sb || !userId) return false;

  const { error } = await sb
    .from("decisions")
    .delete()
    .eq("user_id", userId)
    .eq("decision_id", decisionId);

  if (error) {
    console.error("[DecisionOS:cloud] delete decision failed:", error.message);
    return false;
  }
  return true;
}

/**
 * Batch-upsert multiple decisions to the cloud.
 * Used during initial migration of localStorage → cloud.
 */
export async function cloudSaveAllDecisions(decisions: Decision[]): Promise<boolean> {
  const sb = getSupabase();
  const userId = await currentUserId();
  if (!sb || !userId || decisions.length === 0) return false;

  const rows = decisions.map((d) => ({
    user_id: userId,
    decision_id: d.id,
    data: d as unknown as Record<string, unknown>,
    updated_at: d.updatedAt ?? new Date().toISOString(),
  }));

  const { error } = await sb.from("decisions").upsert(rows, { onConflict: "user_id,decision_id" });

  if (error) {
    console.error("[DecisionOS:cloud] batch save failed:", error.message);
    return false;
  }
  return true;
}
