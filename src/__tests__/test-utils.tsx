/**
 * Shared test utilities — custom render that wraps components in providers.
 */

import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { AnnouncerProvider } from "@/components/Announcer";
import { DecisionProvider } from "@/components/DecisionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

/**
 * Render with all providers (DecisionProvider, ThemeProvider, AnnouncerProvider).
 * Returns the render result plus a userEvent instance for realistic interactions.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const user = userEvent.setup();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AnnouncerProvider>
        <DecisionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </DecisionProvider>
      </AnnouncerProvider>
    );
  }

  return {
    user,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}
