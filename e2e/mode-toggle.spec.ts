/**
 * E2E tests — Mode Toggle (Guided ↔ Advanced switching).
 *
 * Tests the ModeToggle pill, mode persistence across reloads,
 * share link behavior, and data preservation across mode switches.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/238
 */

import { test, expect } from "@playwright/test";

test.describe("Mode Toggle — Guided ↔ Advanced", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("decisionos:onboarded", "true");
      localStorage.removeItem("decisionos:wizard-mode");
    });
  });

  test("mode toggle switches between guided and advanced", async ({ page }) => {
    await page.goto("/");

    // Starts in guided mode
    await expect(page.getByTestId("guided-wizard")).toBeVisible();
    await expect(page.getByTestId("mode-toggle")).toBeVisible();

    // Click "Advanced" in mode toggle
    await page.getByTestId("mode-advanced").click();

    // Should switch to Advanced tabs
    await expect(page.locator('button[role="tab"]:has-text("Builder")')).toBeVisible();
    await expect(page.getByTestId("guided-wizard")).not.toBeVisible();

    // Click "Guided" to switch back
    await page.getByTestId("mode-guided").click();
    await expect(page.getByTestId("guided-wizard")).toBeVisible();
  });

  test("mode persists across page reload", async ({ page }) => {
    await page.goto("/");

    // Switch to Advanced mode
    await page.getByTestId("mode-advanced").click();
    await expect(page.locator('button[role="tab"]:has-text("Builder")')).toBeVisible();

    // Reload
    await page.reload();

    // Should still be in Advanced mode
    await expect(page.locator('button[role="tab"]:has-text("Builder")')).toBeVisible();
    await expect(page.getByTestId("guided-wizard")).not.toBeVisible();
  });

  test("mode toggle has correct ARIA attributes", async ({ page }) => {
    await page.goto("/");

    const toggle = page.getByTestId("mode-toggle");
    await expect(toggle).toHaveAttribute("role", "radiogroup");
    await expect(toggle).toHaveAttribute("aria-label", "Interface mode");

    // Guided should be checked
    const guidedBtn = page.getByTestId("mode-guided");
    await expect(guidedBtn).toHaveAttribute("aria-checked", "true");

    // Advanced should not be checked
    const advancedBtn = page.getByTestId("mode-advanced");
    await expect(advancedBtn).toHaveAttribute("aria-checked", "false");
  });

  test("data preservation across mode switch", async ({ page }) => {
    await page.goto("/");

    // In guided mode, decision data is from demo
    await expect(page.getByTestId("guided-wizard")).toBeVisible();

    // Switch to advanced
    await page.getByTestId("mode-advanced").click();
    await expect(page.locator('button[role="tab"]:has-text("Builder")')).toBeVisible();

    // Decision title should still show demo data
    await expect(page.locator('input[aria-label="Decision title"]')).toHaveValue(
      /Best City/i,
    );

    // Switch back to guided
    await page.getByTestId("mode-guided").click();
    await expect(page.getByTestId("guided-wizard")).toBeVisible();
  });

  test("share link forces advanced mode", async ({ page }) => {
    // Pre-set guided mode
    await page.addInitScript(() => {
      localStorage.setItem("decisionos:wizard-mode", "guided");
    });

    // Navigate with a share param (any value)
    await page.goto("/?share=test-share-id");

    // Should be in Advanced mode regardless of localStorage
    await expect(page.locator('button[role="tab"]:has-text("Builder")')).toBeVisible({ timeout: 10000 });
  });
});
