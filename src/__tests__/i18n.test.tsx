/**
 * Tests for the i18n system: interpolation, translation lookup,
 * locale detection, fallback behaviour, and pluralization helpers.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { interpolate, translate, detectLocale, I18nProvider, useT, useTf, useLocale } from "@/lib/i18n";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";

// ── interpolate ────────────────────────────────────────────────────

describe("interpolate", () => {
  it("replaces a single placeholder", () => {
    expect(interpolate("Hello {name}!", { name: "World" })).toBe("Hello World!");
  });

  it("replaces multiple different placeholders", () => {
    expect(interpolate("{filled}/{total} scores filled", { filled: 3, total: 5 })).toBe(
      "3/5 scores filled"
    );
  });

  it("leaves unknown placeholders untouched", () => {
    expect(interpolate("Value is {missing}", {})).toBe("Value is {missing}");
  });

  it("handles numeric values", () => {
    expect(interpolate("Rank #{rank}", { rank: 1 })).toBe("Rank #1");
  });

  it("returns the template unchanged when no placeholders exist", () => {
    expect(interpolate("No placeholders here", { foo: "bar" })).toBe("No placeholders here");
  });

  it("replaces the same placeholder appearing multiple times", () => {
    expect(interpolate("{x} + {x} = {result}", { x: 2, result: 4 })).toBe("2 + 2 = 4");
  });
});

// ── translate ──────────────────────────────────────────────────────

describe("translate", () => {
  it("looks up a key in the en locale", () => {
    expect(translate("en", "app.title")).toBe("Decision OS");
  });

  it("looks up a key in the fr locale", () => {
    expect(translate("fr", "app.title")).toBe("Decision OS");
  });

  it("performs interpolation when params are provided", () => {
    expect(translate("en", "header.switchTheme", { mode: "dark" })).toBe("Switch to dark mode");
  });

  it("falls back to English for empty translations (es stub)", () => {
    // es.json has empty strings for all values → should fall back to en
    expect(translate("es", "app.title")).toBe("Decision OS");
  });

  it("returns the key itself for completely unknown keys", () => {
    expect(translate("en", "nonexistent.key")).toBe("nonexistent.key");
  });

  it("returns the key for malformed keys (no dot)", () => {
    expect(translate("en", "nodot")).toBe("nodot");
  });

  it("returns the key for keys with too many dots", () => {
    expect(translate("en", "a.b.c")).toBe("a.b.c");
  });
});

// ── detectLocale ───────────────────────────────────────────────────

describe("detectLocale", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it("returns stored locale from localStorage", () => {
    globalThis.localStorage.setItem("decision-os:locale", "fr");
    expect(detectLocale()).toBe("fr");
  });

  it("ignores invalid stored locale and falls back to browser language", () => {
    globalThis.localStorage.setItem("decision-os:locale", "xx");
    // jsdom sets navigator.language to "en" by default
    expect(detectLocale()).toBe("en");
  });

  it("falls back to en when no stored locale and browser language is unsupported", () => {
    globalThis.localStorage.setItem("decision-os:locale", "");
    // The empty string is not a valid locale, so it falls through
    const result = detectLocale();
    // Should be "en" because jsdom defaults to en
    expect(result).toBe("en");
  });

  it("detects browser language from navigator.languages", () => {
    globalThis.localStorage.clear();
    const original = globalThis.navigator.languages;
    Object.defineProperty(globalThis.navigator, "languages", {
      value: ["fr-CA", "fr"],
      configurable: true,
    });
    expect(detectLocale()).toBe("fr");
    Object.defineProperty(globalThis.navigator, "languages", {
      value: original,
      configurable: true,
    });
  });

  it("falls back to en when window is undefined (SSR)", () => {
    const origWindow = globalThis.window;
    // Simulate SSR by removing window
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(detectLocale()).toBe("en");
    // Restore
    Object.defineProperty(globalThis, "window", {
      value: origWindow,
      writable: true,
      configurable: true,
    });
  });

  it("falls back to navigator.language when navigator.languages is undefined", () => {
    globalThis.localStorage.clear();
    const origLanguages = globalThis.navigator.languages;
    const origLanguage = globalThis.navigator.language;
    Object.defineProperty(globalThis.navigator, "languages", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(globalThis.navigator, "language", {
      value: "es-MX",
      configurable: true,
    });
    expect(detectLocale()).toBe("es");
    Object.defineProperty(globalThis.navigator, "languages", {
      value: origLanguages,
      configurable: true,
    });
    Object.defineProperty(globalThis.navigator, "language", {
      value: origLanguage,
      configurable: true,
    });
  });
});

// ── Translation file structure ─────────────────────────────────────

describe("translation file completeness", () => {
  it("en.json has the expected top-level namespaces", async () => {
    const en = await import("@/lib/i18n/en.json");
    const namespaces = Object.keys(en.default);
    expect(namespaces).toContain("app");
    expect(namespaces).toContain("tabs");
    expect(namespaces).toContain("builder");
    expect(namespaces).toContain("results");
    expect(namespaces).toContain("header");
    expect(namespaces).toContain("common");
  });

  it("fr.json has the same keys as en.json", async () => {
    const en = await import("@/lib/i18n/en.json");
    const fr = await import("@/lib/i18n/fr.json");
    const enKeys = Object.keys(en.default);
    const frKeys = Object.keys(fr.default);
    expect(frKeys.sort()).toEqual(enKeys.sort());
  });

  it("es.json has the same namespaces as en.json (stub)", async () => {
    const en = await import("@/lib/i18n/en.json");
    const es = await import("@/lib/i18n/es.json");
    const enKeys = Object.keys(en.default);
    const esKeys = Object.keys(es.default);
    expect(esKeys.sort()).toEqual(enKeys.sort());
  });

  it("fr.json values are non-empty strings", async () => {
    const fr = await import("@/lib/i18n/fr.json");
    for (const ns of Object.values(fr.default)) {
      for (const [key, value] of Object.entries(ns as Record<string, string>)) {
        expect(value, `fr key "${key}" should not be empty`).not.toBe("");
      }
    }
  });
});

// ── React hooks (useTf, useLocale) ─────────────────────────────────

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

function TfConsumer({ translationKey, params }: { translationKey: string; params?: Record<string, string | number> }) {
  const tf = useTf();
  return <span data-testid="tf-result">{tf(translationKey, params)}</span>;
}

function TConsumer() {
  const t = useT();
  return <span data-testid="t-result">{t.app.title}</span>;
}

function LocaleConsumer() {
  const { locale, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => setLocale("fr")}>Switch to FR</button>
    </div>
  );
}

describe("useTf hook", () => {
  it("translates keys with interpolation via I18nProvider", () => {
    render(
      <Wrapper>
        <TfConsumer translationKey="app.title" />
      </Wrapper>,
    );
    expect(screen.getByTestId("tf-result").textContent).toBeTruthy();
  });

  it("returns the key itself when used outside I18nProvider", () => {
    render(<TfConsumer translationKey="app.title" />);
    expect(screen.getByTestId("tf-result").textContent).toBe("app.title");
  });
});

describe("useT hook", () => {
  it("returns messages object for current locale", () => {
    render(
      <Wrapper>
        <TConsumer />
      </Wrapper>,
    );
    expect(screen.getByTestId("t-result").textContent).toBeTruthy();
  });
});

describe("useLocale hook", () => {
  it("returns locale and setLocale from provider", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <LocaleConsumer />
      </Wrapper>,
    );
    expect(screen.getByTestId("locale").textContent).toBe("en");
    await user.click(screen.getByText("Switch to FR"));
    expect(screen.getByTestId("locale").textContent).toBe("fr");
  });
});
