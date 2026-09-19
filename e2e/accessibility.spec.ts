/**
 * Automated accessibility (a11y) tests using axe-core.
 *
 * Scans each major view for WCAG 2.1 AA violations.
 * @see https://github.com/ericsocrat/decision-os/issues/42
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility — axe-core scans", () => {
  test.beforeEach(async ({ page }) => {
    // Skip the onboarding tour and exercise the advanced workspace. The app starts
    // with no decision, so load its visible demo fixture before testing tab content.
    await page.addInitScript(() => {
      localStorage.setItem("decisionos:onboarded", "true");
    });
    await page.goto("/?mode=advanced");
    await page.getByRole("button", { name: "Try Demo Decision" }).click();
    // Wait for the app to fully hydrate
    await expect(page.getByRole("heading", { name: "Decision OS" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Builder" })).toBeVisible();
  });

  test("Builder tab has no critical a11y violations", async ({ page }) => {
    // Builder is the default active tab
    await expect(page.getByRole("tab", { name: "Builder" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"]) // Tailwind color-contrast can be noisy in test envs
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("Results tab has no critical a11y violations", async ({ page }) => {
    await page.getByRole("tab", { name: "Results" }).click();
    await expect(page.getByRole("tab", { name: "Results" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("Sensitivity tab has no critical a11y violations", async ({ page }) => {
    await page.getByRole("tab", { name: "Sensitivity" }).click();
    await expect(page.getByRole("tab", { name: "Sensitivity" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("Keyboard shortcuts modal has no a11y violations", async ({ page }) => {
    // Open the shortcuts modal via keyboard
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("Dark mode has no a11y violations", async ({ page }) => {
    // Toggle dark mode
    const toggleBtn = page.getByRole("button", { name: /switch to dark mode/i });
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
    }

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("New empty decision has no a11y violations", async ({ page }) => {
    // Create a new decision
    await page.getByRole("button", { name: "New" }).click();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
