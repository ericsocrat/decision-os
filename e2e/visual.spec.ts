/**
 * Visual regression tests — Playwright screenshot comparisons.
 *
 * Uses Playwright's built-in `toHaveScreenshot()` API.
 * Run `npx playwright test e2e/visual.spec.ts --update-snapshots` to generate baselines.
 *
 * Screenshot baselines are stored in `e2e/visual.spec.ts-snapshots/`.
 * Only the Chromium project runs visual tests (font rendering differs per browser).
 *
 * @see https://github.com/ericsocrat/decision-os/issues/46
 */

import { test, expect } from "@playwright/test";

// Only run visual regression on Chromium for consistent rendering
test.describe("Visual Regression", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Visual tests run only on Chromium");

  test.beforeEach(async ({ page }) => {
    // Set onboarding flag before navigating so the tour doesn't interfere with tests
    await page.addInitScript(() => {
      localStorage.setItem("decisionos:onboarded", "true");
    });
    await page.goto("/");
    // Wait for hydration + content to stabilize
    await page.waitForSelector('h1:has-text("Decision OS")');
    // Additional wait for fonts and images to load
    await page.waitForLoadState("networkidle");
  });

  test("builder tab matches snapshot", async ({ page }) => {
    await page.waitForSelector("#panel-builder");

    await expect(page).toHaveScreenshot("builder-tab.png", {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    });
  });

  test("results tab matches snapshot", async ({ page }) => {
    await page.locator('button[role="tab"]:has-text("Results")').click();
    await page.waitForSelector("#panel-results");
    // Wait for charts to render
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("results-tab.png", {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    });
  });

  test("sensitivity tab matches snapshot", async ({ page }) => {
    await page.locator('button[role="tab"]:has-text("Sensitivity")').click();
    await page.waitForSelector("#panel-sensitivity");

    await expect(page).toHaveScreenshot("sensitivity-tab.png", {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    });
  });

  test("dark mode matches snapshot", async ({ page }) => {
    const toggle = page.locator('button[aria-label*="Switch to"]');
    await toggle.click();
    // Wait for theme transition
    await page.waitForTimeout(300);
    await expect(page.locator("html")).toHaveClass(/dark/);

    await expect(page).toHaveScreenshot("dark-mode.png", {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    });
  });

  test("empty state matches snapshot", async ({ page }) => {
    // Create a new minimal decision
    await page.locator('button[aria-label="Create new decision"]').click();
    await page.locator('button[role="tab"]:has-text("Results")').click();
    await page.waitForSelector("#panel-results");

    await expect(page).toHaveScreenshot("empty-results.png", {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });
  });

  test("mobile viewport matches snapshot", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await page.waitForSelector('h1:has-text("Decision OS")');
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("mobile-builder.png", {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    });
  });

  test("import modal matches snapshot", async ({ page }) => {
    await page.locator('button[aria-label="Import decision from file"]').click();
    await page.waitForSelector('[aria-label="Import decision"]');

    await expect(page).toHaveScreenshot("import-modal.png", {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
    });
  });
});
