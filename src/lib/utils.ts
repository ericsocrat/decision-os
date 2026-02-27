/**
 * Utility functions for Decision OS.
 */

/**
 * Generate a unique ID (simple, no external dependency).
 * Uses crypto.randomUUID when available, falls back to timestamp + random.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

import { decompressFromEncodedURIComponent } from "lz-string";

/**
 * Format a relative time string from an ISO timestamp (e.g. "2 hours ago").
 * Falls back to the absolute date if the timestamp is older than 30 days.
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Safely parse JSON with a fallback value.
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * @deprecated Use `decodeShareUrl` from `@/lib/share` for compact share URLs.
 * Retained for backward compatibility with legacy `#data=` share links.
 *
 * Decode a decision from an lz-string compressed URL component.
 * Falls back to legacy base64 decoding for backward compatibility.
 */
export function decodeDecisionFromUrl<T>(encoded: string, fallback: T): T {
  try {
    // Try lz-string first
    const json = decompressFromEncodedURIComponent(encoded);
    if (json) return JSON.parse(json) as T;
    // Fall back to legacy base64
    const legacyJson = decodeURIComponent(
      Array.from(atob(encoded))
        .map((c) => "%" + ("00" + (c.codePointAt(0) ?? 0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(legacyJson) as T;
  } catch {
    return fallback;
  }
}
