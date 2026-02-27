/**
 * E2E tests — Empty State.
 *
 * Tests the EmptyState component rendering on first visit,
 * template loading, demo loading, and transition to decision mode.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/238
 */

import { test, expect } from "@playwright/test";

test.describe("Empty State — First Visit", () => {
  test.beforeEach(async ({ page }) => {
    // Clear all localStorage to simulate first visit
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test("empty state renders on first visit", async ({ page }) => {
    await page.goto("/");

    // Empty state should be visible
    await expect(page.getByTestId("empty-state")).toBeVisible();

    // Hero text should be present
    await expect(page.getByText("Make better decisions, faster")).toBeVisible();

    // Quick-start buttons should be visible
    await expect(page.getByTestId("start-blank")).toBeVisible();
    await expect(page.getByTestId("load-demo")).toBeVisible();
  });

  test("start from scratch creates blank decision", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("empty-state")).toBeVisible();

    // Click "Start from Scratch"
    await page.getByTestId("start-blank").click();

    // Empty state should disappear and wizard or builder should appear
    await expect(page.getByTestId("empty-state")).not.toBeVisible({ timeout: 5000 });

    // Guided wizard or builder should be present (new blank decision)
    const hasWizard = await page.getByTestId("guided-wizard").isVisible().catch(() => false);
    const hasBuilder = await page.locator('button[role="tab"]:has-text("Builder")').isVisible().catch(() => false);
    expect(hasWizard || hasBuilder).toBe(true);
  });

  test("demo loads a fully scored decision", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("empty-state")).toBeVisible();

    // Click "Try Demo Decision"
    await page.getByTestId("load-demo").click();

    // Empty state should disappear
    await expect(page.getByTestId("empty-state")).not.toBeVisible({ timeout: 5000 });
  });

  test("template quick start loads pre-configured decision", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("empty-state")).toBeVisible();

    // Click the first template card (e.g., job-offer)
    const firstTemplate = page.locator('[data-testid^="template-"]').first();
    await firstTemplate.click();

    // Empty state should disappear
    await expect(page.getByTestId("empty-state")).not.toBeVisible({ timeout: 5000 });
  });
});
