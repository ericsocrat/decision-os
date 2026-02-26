/**
 * Supabase client singleton with feature-flag guard.
 *
 * If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
 * are not set, `getSupabase()` returns `null` and the entire app
 * operates in local-only mode (localStorage).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";

let _client: SupabaseClient<Database> | null = null;

/** Whether cloud features are configured (env vars present). */
export function isCloudEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Get the Supabase client singleton.
 * Returns `null` when env vars are missing (local-only mode).
 */
export function getSupabase(): SupabaseClient<Database> | null {
  if (typeof window === "undefined") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!_client) {
    _client = createClient<Database>(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // picks up OAuth redirect tokens
      },
    });
  }

  return _client;
}
