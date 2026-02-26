/**
 * Internationalization (i18n) skeleton.
 *
 * Provides a lightweight typed translation layer. Add new locales by
 * expanding the `messages` record. Components use the `useT()` hook
 * to get the current locale's translations.
 *
 * Usage:
 *   const t = useT();
 *   <h1>{t.app.title}</h1>
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// ── Translation messages ───────────────────────────────────────────

const en = {
  app: {
    title: "Decision OS",
    subtitle: "Structured decision-making",
    loading: "Loading Decision OS...",
    footer: "Open source structured decision-making tool.",
  },
  tabs: {
    builder: "Builder",
    results: "Results",
    sensitivity: "Sensitivity",
    compare: "Compare",
    montecarlo: "Monte Carlo",
  },
  builder: {
    titlePlaceholder: "Decision title",
    descriptionPlaceholder: "Describe the decision you're making...",
    addOption: "Add Option",
    addCriterion: "Add Criterion",
    options: "Options",
    criteria: "Criteria",
    scores: "Scores",
    optionNamePlaceholder: "Option name",
    criterionNamePlaceholder: "Criterion name",
  },
  results: {
    rankings: "Rankings",
    exportJson: "Export JSON",
    exportPdf: "PDF",
    share: "Share",
    winner: "Winner",
    topDrivers: "Top Drivers",
    explain: "Explain This Result",
    visualization: "Score Visualization",
    linkCopied: "Link copied to clipboard!",
    tooLarge: "Decision too large for URL sharing. Use JSON export instead.",
    copyFail: "Failed to copy link.",
    emptyState: "Add at least 2 options and 1 criterion to see results.",
  },
  sensitivity: {
    title: "Sensitivity Analysis",
    swing: "Weight swing",
    robust: "Robust",
    sensitive: "Sensitive",
  },
  header: {
    newDecision: "New",
    deleteDecision: "Delete current decision",
    resetDemo: "Reset Demo",
    selectDecision: "Select decision",
    switchTheme: "Switch to {mode} mode",
    importDecision: "Import",
  },
  shortcuts: {
    title: "Keyboard Shortcuts",
    close: "Close shortcuts",
    builderTab: "Builder tab",
    resultsTab: "Results tab",
    sensitivityTab: "Sensitivity tab",
    toggleDialog: "Toggle this dialog",
    closeDialog: "Close dialog",
  },
  notFound: {
    title: "Page Not Found",
    back: "Go back home",
  },
} as const;

export type Messages = typeof en;
export type Locale = "en";

const messages: Record<Locale, Messages> = { en };

// ── Context ────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Messages;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: messages[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT(): Messages {
  return useContext(I18nContext).t;
}

export function useLocale() {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
}

export const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
];
