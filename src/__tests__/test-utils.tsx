/**
 * Shared test utilities — custom render that wraps components in providers.
 */

import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { AnnouncerProvider } from "@/components/Announcer";
import { DecisionProvider } from "@/components/DecisionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/lib/i18n";
import { DEMO_DECISION } from "@/lib/demo-data";

/**
 * Render with all providers (DecisionProvider, ThemeProvider, AnnouncerProvider).
 * Seeds localStorage with DEMO_DECISION so the provider starts with data.
 * Returns the render result plus a userEvent instance for realistic interactions.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  // Seed demo data when localStorage is empty so DecisionProvider has data
  if (!localStorage.getItem("decision-os:decisions")) {
    localStorage.setItem("decision-os:decisions", JSON.stringify([DEMO_DECISION]));
  }

  const user = userEvent.setup();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nProvider>
        <AnnouncerProvider>
          <DecisionProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </DecisionProvider>
        </AnnouncerProvider>
      </I18nProvider>
    );
  }

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}
