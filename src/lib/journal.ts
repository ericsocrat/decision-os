/**
 * Decision journal — captures structured metadata around each decision.
 *
 * Persists journal entries in localStorage under a separate key from
 * decisions so they can be synced independently. Entries are linked to
 * decisions by `decisionId` and optionally to a point-in-time decision
 * snapshot via `snapshotHash`.
 *
 * @module journal
 */

import type { Decision } from "./types";
import { generateId, safeJsonParse } from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** What kind of journal entry this is */
export type JournalEntryType =
  | "note"
  | "reasoning"
  | "outcome"
  | "retrospective";

/** Emotional context at time of entry */
export type JournalMood = "confident" | "uncertain" | "anxious" | "excited";

/** Structured metadata attached to a journal entry */
export interface JournalEntryMetadata {
  /** How the decision-maker felt at time of entry */
  mood?: JournalMood;
  /** Minutes spent on the decision so far */
  timeSpent?: number;
  /** SHA-256 hex digest linking to decision state at time of entry */
  snapshotHash?: string;
}

/** A single journal entry attached to a decision */
export interface JournalEntry {
  id: string;
  decisionId: string;
  timestamp: string; // ISO 8601
  type: JournalEntryType;
  content: string;
  metadata?: JournalEntryMetadata;
}

/** Aggregated journal for a decision */
export interface DecisionJournal {
  entries: JournalEntry[];
  createdAt: string; // ISO 8601 — when first entry was added
  lastEntryAt: string; // ISO 8601 — most recent entry timestamp
}

/** A point on the decision timeline (journal entry + optional snapshot) */
export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: JournalEntryType;
  content: string;
  metadata?: JournalEntryMetadata;
}

/** Optional filter for retrieving entries */
export interface JournalFilter {
  type?: JournalEntryType;
  after?: string; // ISO 8601 — entries after this timestamp
  before?: string; // ISO 8601 — entries before this timestamp
}

// ---------------------------------------------------------------------------
// Storage key — kept adjacent to but separate from decision storage
// ---------------------------------------------------------------------------

const JOURNAL_STORAGE_KEY = "decision-os:journals";

// ---------------------------------------------------------------------------
// Internal persistence helpers
// ---------------------------------------------------------------------------

type JournalMap = Record<string, DecisionJournal>;

/** Read all journals from localStorage. */
function loadJournals(): JournalMap {
  if (globalThis.window === undefined) return {};
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return {};
    return safeJsonParse<JournalMap>(raw, {});
  } catch {
    return {};
  }
}

/** Persist all journals to localStorage. */
function persistJournals(journals: JournalMap): void {
  if (globalThis.window === undefined) return;
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journals));
  } catch {
    // quota exceeded or private-browsing — fail silently
  }
}

// ---------------------------------------------------------------------------
// Snapshot hashing
// ---------------------------------------------------------------------------

/**
 * Produce a deterministic SHA-256 hex digest of a decision's current state.
 *
 * The hash covers every field that affects scoring results (options,
 * criteria, scores, confidenceStrategy) so two snapshots are equal iff the
 * decision would produce the same results.
 *
 * Falls back to a simpler string-hash when the Web Crypto API is
 * unavailable (e.g. SSR or older test environments).
 */
export async function snapshotDecision(decision: Decision): Promise<string> {
  const payload = JSON.stringify({
    options: decision.options,
    criteria: decision.criteria,
    scores: decision.scores,
    confidenceStrategy: decision.confidenceStrategy ?? "none",
  });

  // Prefer Web Crypto (available in modern browsers & Node ≥ 15)
  if (globalThis.crypto?.subtle !== undefined) {
    const buf = new TextEncoder().encode(payload);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Fallback: simple FNV-1a 32-bit hash (deterministic, not cryptographic)
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.codePointAt(i)!;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Add a journal entry for a decision.
 *
 * Creates the journal if it doesn't exist yet. Returns the full
 * JournalEntry (with generated `id` and `timestamp`).
 */
export function addEntry(
  decisionId: string,
  entry: Pick<JournalEntry, "type" | "content"> & {
    metadata?: JournalEntryMetadata;
  },
): JournalEntry {
  const now = new Date().toISOString();
  const full: JournalEntry = {
    id: generateId(),
    decisionId,
    timestamp: now,
    type: entry.type,
    content: entry.content,
    ...(entry.metadata ? { metadata: entry.metadata } : {}),
  };

  const journals = loadJournals();
  const existing = journals[decisionId];

  if (existing) {
    existing.entries.push(full);
    existing.lastEntryAt = now;
  } else {
    journals[decisionId] = {
      entries: [full],
      createdAt: now,
      lastEntryAt: now,
    };
  }

  persistJournals(journals);
  return full;
}

/**
 * Retrieve journal entries for a decision, optionally filtered.
 */
export function getEntries(
  decisionId: string,
  filter?: JournalFilter,
): JournalEntry[] {
  const journals = loadJournals();
  const journal = journals[decisionId];
  if (!journal) return [];

  let entries = [...journal.entries];

  if (filter?.type) {
    entries = entries.filter((e) => e.type === filter.type);
  }
  if (filter?.after) {
    const afterMs = new Date(filter.after).getTime();
    entries = entries.filter((e) => new Date(e.timestamp).getTime() > afterMs);
  }
  if (filter?.before) {
    const beforeMs = new Date(filter.before).getTime();
    entries = entries.filter(
      (e) => new Date(e.timestamp).getTime() < beforeMs,
    );
  }

  // Chronological order
  return entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

/**
 * Delete a single journal entry by ID.
 * Returns `true` if the entry was found and removed.
 */
export function deleteEntry(
  decisionId: string,
  entryId: string,
): boolean {
  const journals = loadJournals();
  const journal = journals[decisionId];
  if (!journal) return false;

  const idx = journal.entries.findIndex((e) => e.id === entryId);
  if (idx === -1) return false;

  journal.entries.splice(idx, 1);

  if (journal.entries.length === 0) {
    // Remove empty journal entirely
    delete journals[decisionId];
  } else {
    journal.lastEntryAt =
      journal.entries.at(-1)!.timestamp;
  }

  persistJournals(journals);
  return true;
}

/**
 * Get the full journal for a decision (or `undefined` if none exists).
 */
export function getJournal(decisionId: string): DecisionJournal | undefined {
  return loadJournals()[decisionId];
}

/**
 * Build a chronological timeline of all events for a decision.
 */
export function getTimeline(decisionId: string): TimelineEvent[] {
  const entries = getEntries(decisionId);
  return entries.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    type: e.type,
    content: e.content,
    ...(e.metadata ? { metadata: e.metadata } : {}),
  }));
}

/**
 * Delete an entire journal for a decision.
 * Returns `true` if a journal existed and was removed.
 */
export function deleteJournal(decisionId: string): boolean {
  const journals = loadJournals();
  if (!journals[decisionId]) return false;
  delete journals[decisionId];
  persistJournals(journals);
  return true;
}
