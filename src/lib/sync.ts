/**
 * Sync engine — merges localStorage and cloud decisions.
 *
 * Strategy: "last-write-wins" by `updatedAt` timestamp.
 *
 * Flows:
 *  1. **Initial migration** — user signs in for the first time:
 *     upload all localStorage decisions to cloud.
 *  2. **Ongoing sync** — on each save:
 *     • write to localStorage (instant, offline-safe)
 *     • write to cloud (async, best-effort)
 *  3. **Pull on load** — when the app mounts (authed):
 *     merge cloud decisions into local, preferring newer `updatedAt`.
 */

import type { Decision } from "./types";
import { getDecisions as localGetDecisions, saveDecision as localSaveDecision } from "./storage";
import { cloudGetDecisions, cloudSaveDecision, cloudSaveAllDecisions } from "./cloud-storage";
import { isChannelActive } from "./realtime";

const MIGRATION_KEY = "decision-os:cloud-migrated";

// ─── Helpers ───────────────────────────────────────────────────────

/** Compare ISO timestamps — returns >0 if a is newer. */
function compareTimestamps(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

/** Has the user already migrated local → cloud? */
export function hasMigrated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MIGRATION_KEY) === "true";
}

/** Mark migration as done. */
function setMigrated(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MIGRATION_KEY, "true");
}

// ─── Core Sync ─────────────────────────────────────────────────────

export type SyncStatus = "idle" | "syncing" | "done" | "error" | "offline";

export interface SyncResult {
  status: SyncStatus;
  uploaded: number;
  downloaded: number;
  merged: number;
  error?: string;
}

/**
 * Perform a full bidirectional sync.
 *
 * 1. Fetch cloud decisions
 * 2. Merge with local (last-write-wins)
 * 3. Upload any local-only or newer-local decisions
 * 4. Save any cloud-only or newer-cloud decisions locally
 */
export async function fullSync(): Promise<SyncResult> {
  // Skip sync pull when a Realtime channel is active — the channel provides
  // live state updates, so a full sync would cause conflicts.
  if (isChannelActive()) {
    return { status: "done", uploaded: 0, downloaded: 0, merged: 0 };
  }

  const result: SyncResult = { status: "syncing", uploaded: 0, downloaded: 0, merged: 0 };

  try {
    const localDecisions = localGetDecisions();
    const cloudDecisions = await cloudGetDecisions();

    // If cloud returned empty and we haven't migrated, do initial upload
    if (cloudDecisions.length === 0 && !hasMigrated()) {
      const ok = await cloudSaveAllDecisions(localDecisions);
      if (ok) {
        setMigrated();
        result.uploaded = localDecisions.length;
        result.status = "done";
      } else {
        result.status = "error";
        result.error = "Initial migration failed";
      }
      return result;
    }

    // Build lookup maps
    const localMap = new Map(localDecisions.map((d) => [d.id, d]));
    const cloudMap = new Map(cloudDecisions.map((d) => [d.id, d]));

    // All unique decision IDs
    const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);

    const toUpload: Decision[] = [];
    const toDownload: Decision[] = [];

    for (const id of allIds) {
      const local = localMap.get(id);
      const cloud = cloudMap.get(id);

      if (local && !cloud) {
        // Local-only → upload
        toUpload.push(local);
      } else if (!local && cloud) {
        // Cloud-only → download
        toDownload.push(cloud);
      } else if (local && cloud) {
        // Both exist → last-write-wins
        const cmp = compareTimestamps(local.updatedAt, cloud.updatedAt);
        if (cmp > 0) {
          toUpload.push(local);
        } else if (cmp < 0) {
          toDownload.push(cloud);
        }
        // cmp === 0: identical timestamps — no action needed
        result.merged++;
      }
    }

    // Upload local-newer decisions to cloud
    for (const d of toUpload) {
      const ok = await cloudSaveDecision(d);
      if (ok) result.uploaded++;
    }

    // Download cloud-newer decisions to local
    for (const d of toDownload) {
      localSaveDecision(d);
      result.downloaded++;
    }

    if (!hasMigrated()) setMigrated();
    result.status = "done";
  } catch (err) {
    result.status = "error";
    result.error = err instanceof Error ? err.message : "Unknown sync error";
  }

  return result;
}

/**
 * Save a decision to both local and cloud (fire-and-forget cloud write).
 * Always writes to localStorage first for instant persistence.
 */
export async function syncSaveDecision(decision: Decision): Promise<void> {
  localSaveDecision(decision);
  // Cloud save is best-effort
  try {
    await cloudSaveDecision(decision);
  } catch {
    // Offline or error — already saved locally
    console.warn("[DecisionOS:sync] cloud save failed, data safe in localStorage");
  }
}

/**
 * Delete a decision from both local and cloud.
 */
export async function syncDeleteDecision(
  id: string,
  localDeleteFn: (id: string) => boolean
): Promise<boolean> {
  const localOk = localDeleteFn(id);
  // Cloud delete is best-effort
  try {
    const { cloudDeleteDecision: cloudDel } = await import("./cloud-storage");
    await cloudDel(id);
  } catch {
    console.warn("[DecisionOS:sync] cloud delete failed");
  }
  return localOk;
}
