/**
 * Client-side rate limiter with exponential backoff for Supabase calls.
 *
 * Provides:
 * - Serial write queue (max 1 concurrent write to avoid conflicts)
 * - Exponential backoff on failure: 1 s → 2 s → 4 s → 8 s → cap 30 s
 * - Max 3 retries before surfacing error
 * - Observable status for UI (SyncStatus degradation)
 *
 * Architecture: wraps any `() => Promise<T>` call. Read calls are not queued
 * (they can run concurrently) but still get retry + backoff.
 */

export type RetryStatus = "idle" | "retrying" | "backoff" | "failed";

export interface RetryState {
  status: RetryStatus;
  /** Number of consecutive failures */
  failures: number;
  /** Timestamp (ms) when the next retry is allowed, or 0 if idle */
  retryAfter: number;
}

// ─── Constants ─────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_FACTOR = 2;

// ─── Retry state (module-level singleton) ──────────────────────────

let _state: RetryState = { status: "idle", failures: 0, retryAfter: 0 };
const _listeners = new Set<(s: RetryState) => void>();

export function getRetryState(): RetryState {
  return _state;
}

function setState(next: RetryState) {
  _state = next;
  _listeners.forEach((fn) => fn(next));
}

/** Subscribe to retry state changes. Returns unsubscribe fn. */
export function subscribeRetryState(fn: (s: RetryState) => void): () => void {
  _listeners.add(fn);
  return () => {
    _listeners.delete(fn);
  };
}

/** Reset retry state (e.g. after successful call). */
export function resetRetryState() {
  setState({ status: "idle", failures: 0, retryAfter: 0 });
}

// ─── Backoff calculation ───────────────────────────────────────────

/** Compute backoff delay for the nth failure (0-indexed). */
export function computeBackoff(failureCount: number): number {
  const delay = INITIAL_BACKOFF_MS * Math.pow(BACKOFF_FACTOR, failureCount);
  return Math.min(delay, MAX_BACKOFF_MS);
}

// ─── Serial write queue ────────────────────────────────────────────

let _writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Enqueue a write operation so that writes execute serially.
 * Returns the result of the operation.
 */
export function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const result = _writeQueue.then(() => withRetry(fn));
  // Keep the chain going even if this call fails
  _writeQueue = result.catch(() => {});
  return result;
}

// ─── Retry wrapper ─────────────────────────────────────────────────

/**
 * Execute `fn` with exponential backoff retry.
 * Resolves with the result on success, rejects after MAX_RETRIES failures.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      const result = await fn();
      // Success — reset backoff state
      if (_state.failures > 0) {
        resetRetryState();
      }
      return result;
    } catch (err) {
      attempt++;
      if (attempt > MAX_RETRIES) {
        setState({ status: "failed", failures: attempt, retryAfter: 0 });
        throw err;
      }

      const delay = computeBackoff(attempt - 1);
      const retryAfter = Date.now() + delay;
      setState({ status: "backoff", failures: attempt, retryAfter });

      await sleep(delay);
      setState({ status: "retrying", failures: attempt, retryAfter: 0 });
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Test helpers ──────────────────────────────────────────────────

/** Reset internal state for tests. */
export function _resetForTests() {
  _state = { status: "idle", failures: 0, retryAfter: 0 };
  _listeners.clear();
  _writeQueue = Promise.resolve();
}
