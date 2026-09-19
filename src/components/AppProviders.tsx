"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "./ThemeProvider";

/** Client-only application providers kept behind the server layout boundary. */
export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <I18nProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </I18nProvider>
  );
}
