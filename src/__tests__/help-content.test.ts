/**
 * Tests for the help-content registry.
 */

import { describe, it, expect } from "vitest";
import { HELP_REGISTRY, type HelpEntry } from "@/lib/help-content";

const entries = Object.entries(HELP_REGISTRY) as [string, HelpEntry][];

describe("HELP_REGISTRY", () => {
  it("contains at least 10 entries", () => {
    expect(entries.length).toBeGreaterThanOrEqual(10);
  });

  it.each(entries)("%s — has a non-empty term", (_key, entry) => {
    expect(entry.term.length).toBeGreaterThan(0);
  });

  it.each(entries)("%s — term is ≤ 60 chars", (_key, entry) => {
    expect(entry.term.length).toBeLessThanOrEqual(60);
  });

  it.each(entries)("%s — short description is non-empty and ≤ 120 chars", (_key, entry) => {
    expect(entry.short.length).toBeGreaterThan(0);
    expect(entry.short.length).toBeLessThanOrEqual(120);
  });

  it("every key is a lowercase kebab-case or simple word", () => {
    for (const key of Object.keys(HELP_REGISTRY)) {
      expect(key).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it("learnMoreUrl, if present, is a valid URL", () => {
    for (const entry of Object.values(HELP_REGISTRY)) {
      if (entry.learnMoreUrl) {
        expect(() => new URL(entry.learnMoreUrl!)).not.toThrow();
      }
    }
  });
});
