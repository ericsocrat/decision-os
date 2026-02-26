/**
 * E2E smoke tests — verifies the app loads, tabs work, and critical flows function.
 */

import { test, expect } from "@playwright/test";

test.describe("Decision OS — Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for hydration
    await page.waitForSelector('h1:has-text("Decision OS")');
  });

  test("homepage loads with demo decision", async ({ page }) => {
    await expect(page).toHaveTitle(/Decision OS/);
    await expect(page.locator("h1")).toContainText("Decision OS");
    // Demo decision should be selected
    await expect(page.locator('select[aria-label="Select decision"]')).toBeVisible();
  });

  test("tab navigation works", async ({ page }) => {
    // Builder tab should be active by default
    const builderTab = page.locator('button[role="tab"]:has-text("Builder")');
    await expect(builderTab).toHaveAttribute("aria-selected", "true");

    // Switch to Results
    const resultsTab = page.locator('button[role="tab"]:has-text("Results")');
    await resultsTab.click();
    await expect(resultsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-results")).toBeVisible();

    // Switch to Sensitivity
    const sensitivityTab = page.locator('button[role="tab"]:has-text("Sensitivity")');
    await sensitivityTab.click();
    await expect(sensitivityTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-sensitivity")).toBeVisible();
  });

  test("Results tab shows rankings with demo data", async ({ page }) => {
    await page.locator('button[role="tab"]:has-text("Results")').click();
    const resultsPanel = page.locator("#panel-results");
    // Should see rankings heading
    await expect(resultsPanel.locator('text="Rankings"')).toBeVisible();
    // Should see at least one rank badge
    await expect(resultsPanel.locator('text="Winner"')).toBeVisible();
  });

  test("keyboard shortcut switches tabs", async ({ page }) => {
    // Press "2" to go to Results
    await page.keyboard.press("2");
    const resultsTab = page.locator('button[role="tab"]:has-text("Results")');
    await expect(resultsTab).toHaveAttribute("aria-selected", "true");

    // Press "3" to go to Sensitivity
    await page.keyboard.press("3");
    const sensitivityTab = page.locator('button[role="tab"]:has-text("Sensitivity")');
    await expect(sensitivityTab).toHaveAttribute("aria-selected", "true");

    // Press "1" to go back to Builder
    await page.keyboard.press("1");
    const builderTab = page.locator('button[role="tab"]:has-text("Builder")');
    await expect(builderTab).toHaveAttribute("aria-selected", "true");
  });

  test("keyboard shortcut opens help dialog", async ({ page }) => {
    await page.keyboard.press("?");
    await expect(page.locator('text="Keyboard Shortcuts"')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('text="Keyboard Shortcuts"')).not.toBeVisible();
  });

  test("export JSON button downloads file", async ({ page }) => {
    await page.locator('button[role="tab"]:has-text("Results")').click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('button[aria-label="Export results as JSON"]').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/decision-os-.*\.json$/);
  });

  test("New Decision creates empty decision", async ({ page }) => {
    await page.locator('button[aria-label="Create new decision"]').click();
    // The select should now have an "Untitled Decision" option
    await expect(
      page.locator('select[aria-label="Select decision"] option:has-text("Untitled Decision")')
    ).toBeAttached();
  });

  test("404 page renders for unknown route", async ({ page }) => {
    await page.goto("/nonexistent-route");
    await expect(page.locator("text=Page Not Found")).toBeVisible();
  });

  test("dark mode toggle works", async ({ page }) => {
    const toggle = page.locator('button[aria-label*="Switch to"]');
    await toggle.click();
    // html element should have dark class
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Toggle back
    await toggle.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  // Clipboard permissions only supported in Chromium
  test("share link copies to clipboard", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "Clipboard permissions only supported in Chromium");
    // Grant clipboard permission
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.locator('button[role="tab"]:has-text("Results")').click();
    await page.locator('button[aria-label="Copy share link"]').click();
    await expect(page.locator('text="Link copied to clipboard!"')).toBeVisible();
  });
});
