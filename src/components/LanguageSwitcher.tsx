/**
 * Language switcher dropdown.
 *
 * Renders a compact `<select>` that lets users switch between locales.
 * Persists the choice to localStorage via the i18n context.
 */

"use client";

import { memo } from "react";
import { Globe } from "lucide-react";
import { useLocale, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

export const LanguageSwitcher = memo(function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="relative inline-flex items-center">
      <Globe
        className="pointer-events-none absolute left-2.5 h-4 w-4 text-gray-500 dark:text-gray-400"
        aria-hidden="true"
      />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-6 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        aria-label="Select language"
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.nativeLabel}
          </option>
        ))}
      </select>
    </div>
  );
});
