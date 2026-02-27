/**
 * Decision version history — save, browse, restore, and compare decision snapshots.
 *
 * Stores immutable snapshots of decisions in localStorage keyed by decision ID.
 * Uses content-addressable hashing (via journal.ts `snapshotDecision`) to
 * deduplicate — identical versions are not saved twice.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/246
 */

import type { Decision, DecisionVersion, VersionDiff } from "./types";
import { generateId } from "./utils";
import { snapshotDecision } from "./journal";
import { readScoreOrZero } from "./scoring";

// ─── Constants ─────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = "decision-os:versions:";
const MAX_VERSIONS = 100;
const AUTO_VERSION_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

// ─── Internal Helpers ──────────────────────────────────────────────

function storageKey(decisionId: string): string {
  return `${STORAGE_KEY_PREFIX}${decisionId}`;
}

function loadVersions(decisionId: string): DecisionVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(decisionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as DecisionVersion[];
  } catch {
    return [];
  }
}

function persistVersions(decisionId: string, versions: DecisionVersion[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(decisionId), JSON.stringify(versions));
  } catch {
    // localStorage quota exceeded — silently fail
  }
}

// ─── CRUD Operations ──────────────────────────────────────────────

/**
 * Save a version snapshot of a decision.
 * Deduplicates by snapshotHash — if the current hash matches the most
 * recent version, no new version is created.
 *
 * @returns the saved `DecisionVersion`, or `null` if deduplicated (no change)
 */
export async function saveVersion(
  decision: Decision,
  label?: string,
  trigger: "manual" | "auto" = "manual",
): Promise<DecisionVersion | null> {
  const hash = await snapshotDecision(decision);
  const versions = loadVersions(decision.id);

  // Deduplicate: skip if most recent version has the same hash
  if (versions.length > 0 && versions[0].snapshotHash === hash) {
    return null;
  }

  const version: DecisionVersion = {
    id: generateId(),
    decisionId: decision.id,
    label,
    snapshot: structuredClone(decision),
    snapshotHash: hash,
    createdAt: new Date().toISOString(),
    trigger,
  };

  // Prepend (newest first), then prune
  const updated = [version, ...versions].slice(0, MAX_VERSIONS);
  persistVersions(decision.id, updated);

  return version;
}

/**
 * Get all versions for a decision, sorted newest-first.
 */
export function getVersions(decisionId: string): DecisionVersion[] {
  return loadVersions(decisionId);
}

/**
 * Get a specific version by ID.
 */
export function getVersion(decisionId: string, versionId: string): DecisionVersion | null {
  return loadVersions(decisionId).find((v) => v.id === versionId) ?? null;
}

/**
 * Delete a specific version.
 * @returns true if the version was found and deleted
 */
export function deleteVersion(decisionId: string, versionId: string): boolean {
  const versions = loadVersions(decisionId);
  const filtered = versions.filter((v) => v.id !== versionId);
  if (filtered.length === versions.length) return false;
  persistVersions(decisionId, filtered);
  return true;
}

/**
 * Delete all versions for a decision.
 */
export function clearVersions(decisionId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(decisionId));
  } catch {
    // ignore
  }
}

/**
 * Prune versions to stay within the maximum count.
 * Keeps the newest versions and removes the oldest.
 */
export function pruneVersions(decisionId: string, maxCount: number = MAX_VERSIONS): void {
  const versions = loadVersions(decisionId);
  if (versions.length <= maxCount) return;
  persistVersions(decisionId, versions.slice(0, maxCount));
}

// ─── Auto-Versioning ──────────────────────────────────────────────

/** Track the last auto-version timestamp per decision */
const lastAutoVersionMap = new Map<string, number>();

/**
 * Conditionally create an auto-version — throttled to max 1 per 5 minutes per decision.
 * Deduplicates by hash (no-op if decision hasn't changed).
 *
 * @returns the saved version, or `null` if throttled or deduplicated
 */
export async function autoVersion(decision: Decision): Promise<DecisionVersion | null> {
  const now = Date.now();
  const lastTime = lastAutoVersionMap.get(decision.id) ?? 0;

  if (now - lastTime < AUTO_VERSION_THROTTLE_MS) {
    return null; // Throttled
  }

  const version = await saveVersion(decision, undefined, "auto");
  if (version) {
    lastAutoVersionMap.set(decision.id, now);
  }
  return version;
}

/**
 * Reset the auto-version throttle (useful for testing).
 */
export function resetAutoVersionThrottle(decisionId?: string): void {
  if (decisionId) {
    lastAutoVersionMap.delete(decisionId);
  } else {
    lastAutoVersionMap.clear();
  }
}

// ─── Diff ──────────────────────────────────────────────────────────

/**
 * Compute a structural diff between two decision snapshots.
 * `older` is the baseline; `newer` is the comparison.
 */
export function diffVersions(older: Decision, newer: Decision): VersionDiff {
  const oldOptionNames = new Set(older.options.map((o) => o.name));
  const newOptionNames = new Set(newer.options.map((o) => o.name));

  const addedOptions = newer.options.filter((o) => !oldOptionNames.has(o.name)).map((o) => o.name);
  const removedOptions = older.options
    .filter((o) => !newOptionNames.has(o.name))
    .map((o) => o.name);

  const oldCriteriaMap = new Map(older.criteria.map((c) => [c.name, c]));
  const newCriteriaMap = new Map(newer.criteria.map((c) => [c.name, c]));

  const addedCriteria = newer.criteria.filter((c) => !oldCriteriaMap.has(c.name)).map((c) => c.name);
  const removedCriteria = older.criteria
    .filter((c) => !newCriteriaMap.has(c.name))
    .map((c) => c.name);

  // Weight changes (for criteria that exist in both)
  const changedWeights: VersionDiff["changedWeights"] = [];
  for (const [name, newCrit] of newCriteriaMap) {
    const oldCrit = oldCriteriaMap.get(name);
    if (oldCrit && oldCrit.weight !== newCrit.weight) {
      changedWeights.push({ name, oldWeight: oldCrit.weight, newWeight: newCrit.weight });
    }
  }

  // Score changes — compare by option name × criterion name
  let changedScores = 0;
  const oldOptionMap = new Map(older.options.map((o) => [o.name, o.id]));
  const newOptionMap = new Map(newer.options.map((o) => [o.name, o.id]));
  for (const [optName, newOptId] of newOptionMap) {
    const oldOptId = oldOptionMap.get(optName);
    if (!oldOptId) continue; // new option — not a "change"
    for (const [criName, newCrit] of newCriteriaMap) {
      const oldCrit = oldCriteriaMap.get(criName);
      if (!oldCrit) continue; // new criterion — not a "change"
      const oldScore = readScoreOrZero(older.scores, oldOptId, oldCrit.id);
      const newScore = readScoreOrZero(newer.scores, newOptId, newCrit.id);
      if (oldScore !== newScore) changedScores++;
    }
  }

  return {
    addedOptions,
    removedOptions,
    addedCriteria,
    removedCriteria,
    changedScores,
    changedWeights,
    titleChanged: older.title !== newer.title,
    descriptionChanged: (older.description ?? "") !== (newer.description ?? ""),
  };
}
