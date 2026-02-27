/**
 * Tests for LanguageSwitcher component.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it("renders a select element with language label", () => {
    renderWithProviders(<LanguageSwitcher />);
    expect(screen.getByLabelText("Select language")).toBeInTheDocument();
  });

  it("shows all supported locales as options", () => {
    renderWithProviders(<LanguageSwitcher />);
    const select = screen.getByLabelText("Select language");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(3);
    expect(options[0]?.textContent).toBe("English");
    expect(options[1]?.textContent).toBe("Français");
    expect(options[2]?.textContent).toBe("Español");
  });

  it("defaults to English", () => {
    renderWithProviders(<LanguageSwitcher />);
    const select = screen.getByLabelText(
      "Select language",
    ) as HTMLSelectElement;
    expect(select.value).toBe("en");
  });

  it("changes locale when a different language is selected", async () => {
    const { user } = renderWithProviders(<LanguageSwitcher />);
    const select = screen.getByLabelText(
      "Select language",
    ) as HTMLSelectElement;

    await user.selectOptions(select, "fr");
    expect(select.value).toBe("fr");

    // Locale should be persisted to localStorage
    expect(globalThis.localStorage.getItem("decision-os:locale")).toBe("fr");
  });

  it("persists locale preference in localStorage", async () => {
    globalThis.localStorage.setItem("decision-os:locale", "fr");
    renderWithProviders(<LanguageSwitcher />);
    const select = screen.getByLabelText(
      "Select language",
    ) as HTMLSelectElement;
    expect(select.value).toBe("fr");
  });
});
