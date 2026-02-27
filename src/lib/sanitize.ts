/**
 * Input sanitization utilities for Decision OS.
 *
 * Provides defense-in-depth string sanitization beyond React's built-in
 * JSX escaping. Used for user-supplied text that may originate from
 * untrusted sources (imported files, share links, pasted content).
 *
 * @see docs/SECURITY_AUDIT.md
 */

/** Maximum allowed length for a single-line text field (names, titles). */
export const MAX_TEXT_LENGTH = 500;

/** Maximum allowed length for multi-line text fields (descriptions, notes). */
export const MAX_TEXTAREA_LENGTH = 5_000;

/**
 * Strip characters that have no legitimate use in decision text fields.
 *
 * Removes:
 * - ASCII control characters (U+0000–U+001F) except TAB, LF, CR
 * - Unicode "Other" control characters (U+007F–U+009F)
 * - Zero-width characters that can be used for homograph attacks
 * - Bi-directional override characters (RLO, LRO, etc.)
 *
 * Does NOT strip HTML entities — React's JSX escaping handles those.
 */
export function stripControlChars(input: string): string {
  return input.replaceAll(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\uFEFF]/g,
    ""
  );
}

/**
 * Sanitize a single-line text input (option name, criterion name, title).
 *
 * 1. Strips dangerous control characters
 * 2. Collapses all whitespace to single spaces
 * 3. Trims leading/trailing whitespace
 * 4. Enforces maximum length
 */
export function sanitizeText(input: string, maxLength = MAX_TEXT_LENGTH): string {
  const cleaned = stripControlChars(input).replaceAll(/\s+/g, " ").trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Sanitize a multi-line text input (description, note, reasoning).
 *
 * 1. Strips dangerous control characters
 * 2. Normalises line endings to LF
 * 3. Collapses 3+ consecutive newlines to 2
 * 4. Trims leading/trailing whitespace
 * 5. Enforces maximum length
 */
export function sanitizeMultilineText(input: string, maxLength = MAX_TEXTAREA_LENGTH): string {
  const cleaned = stripControlChars(input)
    .replaceAll(/\r\n?/g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Sanitize a numeric value, clamping it to the given range.
 * Returns `fallback` if the value is NaN or non-finite.
 */
export function sanitizeNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}
