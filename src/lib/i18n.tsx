/**
 * Internationalization (i18n) System
 *
 * Provides a typed translation layer with interpolation, pluralization,
 * browser language detection, and multi-locale support.
 *
 * Translation files live in `src/lib/i18n/*.json`.
 *
 * Usage:
 *   const t = useT();
 *   <h1>{t.app.title}</h1>
 *
 * Interpolation:
 *   t("header.switchTheme", { mode: "dark" })  →  "Switch to dark mode"
 *
 * Pluralization:
 *   t("quality.completion", { filled: 3, total: 5 })  →  "3/5 scores filled"
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import en from "./i18n/en.json";
import fr from "./i18n/fr.json";
import es from "./i18n/es.json";

// ── Types ──────────────────────────────────────────────────────────

export type Messages = typeof en;
export type Locale = "en" | "fr" | "es";

/** Dot-notation key paths for type-safe lookups (top 2 levels). */
export type TranslationKey = {
  [NS in keyof Messages]: {
    [K in keyof Messages[NS]]: `${NS & string}.${K & string}`;
  }[keyof Messages[NS]];
}[keyof Messages];

/** Map of variable names → values for interpolation. */
export type InterpolationValues = Record<string, string | number>;

// ── Messages registry ──────────────────────────────────────────────

const messages: Record<Locale, Messages> = { en, fr, es };

// ── Interpolation engine ───────────────────────────────────────────

/**
 * Replace `{key}` placeholders with values from the params object.
 *
 * @example interpolate("Hello {name}!", { name: "World" }) → "Hello World!"
 */
export function interpolate(
  template: string,
  params: InterpolationValues,
): string {
  return template.replaceAll(/\{(\w+)\}/g, (match, key: string) => {
    const val = params[key];
    return val === undefined ? match : String(val);
  });
}

// ── Locale detection ───────────────────────────────────────────────

const STORAGE_KEY = "decision-os:locale";

/**
 * Detect the best locale from browser settings, localStorage, or fallback.
 */
export function detectLocale(): Locale {
  // 1. Check localStorage
  if (globalThis.window !== undefined) {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    if (stored && isLocale(stored)) return stored;

    // 2. Check browser language
    const browserLangs = globalThis.navigator.languages ?? [
      globalThis.navigator.language,
    ];
    for (const lang of browserLangs) {
      const code = lang.split("-")[0].toLowerCase();
      if (isLocale(code)) return code;
    }
  }

  // 3. Fallback
  return "en";
}

function isLocale(code: string): code is Locale {
  return code === "en" || code === "fr" || code === "es";
}

// ── Translation lookup ─────────────────────────────────────────────

/**
 * Look up a translation by dot-notation key, with optional interpolation.
 * Falls back to English if the key is empty in the current locale.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: InterpolationValues,
): string {
  const parts = key.split(".");
  if (parts.length !== 2) return key;

  const [ns, k] = parts;
  const msgs = messages[locale];
  const nsObj = msgs[ns as keyof Messages] as Record<string, string> | undefined;
  const value: string | undefined = nsObj?.[k];

  // Fall back to English for empty or missing translations
  const enNsObj = messages.en[ns as keyof Messages] as Record<string, string> | undefined;
  const fallback: string | undefined = enNsObj?.[k];
  const resolved = value || fallback || key;

  return params ? interpolate(resolved, params) : resolved;
}

// ── React Context ──────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Messages;
  /** Translate a dot-notation key with optional interpolation. */
  tf: (key: string, params?: InterpolationValues) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: en,
  tf: (key: string) => key,
});

export function I18nProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [currentLocale, setCurrentLocale] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    setCurrentLocale(l);
    if (globalThis.window !== undefined) {
      globalThis.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
  }, []);

  const t = messages[currentLocale];

  const tf = useCallback(
    (key: string, params?: InterpolationValues) =>
      translate(currentLocale, key, params),
    [currentLocale],
  );

  const value = useMemo(
    () => ({ locale: currentLocale, setLocale, t, tf }),
    [currentLocale, setLocale, t, tf],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

/** Get the full messages object for the current locale (direct property access). */
export function useT(): Messages {
  return useContext(I18nContext).t;
}

/**
 * Get the translate function for interpolation-based lookups.
 *
 * @example const tf = useTf(); tf("header.switchTheme", { mode: "dark" })
 */
export function useTf() {
  return useContext(I18nContext).tf;
}

/** Get and set the current locale. */
export function useLocale() {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
}

// ── Supported locales ──────────────────────────────────────────────

export const SUPPORTED_LOCALES: readonly {
  readonly code: Locale;
  readonly label: string;
  readonly nativeLabel: string;
}[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
];
