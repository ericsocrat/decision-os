/**
 * E2E tests — Wizard Flow (Steps 1-4).
 *
 * Tests the full 4-step guided wizard journey: type selection,
 * options entry, criteria & scoring, and results.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/238
 */

import { test, expect } from "@playwright/test";

test.describe("Wizard Flow — 4-Step Journey", () => {
  test.beforeEach(async ({ page }) => {
    // Seed demo data so isEmpty = false → wizard renders (no wizard-mode = guided)
    await page.addInitScript(() => {
      localStorage.setItem("decisionos:onboarded", "true");
      // Remove any wizard-mode preference → defaults to "guided"
      localStorage.removeItem("decisionos:wizard-mode");
    });
  });

  test("wizard renders on first visit with demo data", async ({ page }) => {
    await page.goto("/");
    // Guided wizard should be visible (not Advanced tabs)
    await expect(page.getByTestId("guided-wizard")).toBeVisible();
    // Should NOT have the Advanced tabbed layout
    await expect(page.locator('button[role="tab"]:has-text("Builder")')).not.toBeVisible();
  });

  test("complete wizard: navigate through all 4 steps", async ({ page }) => {
    await page.goto("/");
    const wizard = page.getByTestId("guided-wizard");
    await expect(wizard).toBeVisible();

    // Step 1 should be visible by default
    await expect(page.getByTestId("wizard-step-1")).toBeVisible();

    // Continue to step 2 (demo data has a title → canAdvance = true)
    await page.getByTestId("wizard-continue").click();
    await expect(page.getByTestId("wizard-step-2")).toBeVisible();

    // Continue to step 3 (demo data has options → canAdvance = true)
    await page.getByTestId("wizard-continue").click();
    await expect(page.getByTestId("wizard-step-3")).toBeVisible();

    // Continue to step 4 (demo data has scores → canAdvance = true)
    await page.getByTestId("wizard-continue").click();
    await expect(page.getByTestId("wizard-step-4")).toBeVisible();

    // Winner card should be visible
    await expect(page.getByTestId("winner-card")).toBeVisible();
    // Confidence checklist should be visible
    await expect(page.getByTestId("confidence-checklist")).toBeVisible();
    // Explore further should be visible
    await expect(page.getByTestId("explore-further")).toBeVisible();
  });

  test("wizard back navigation preserves step content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("wizard-step-1")).toBeVisible();

    // Go to step 2
    await page.getByTestId("wizard-continue").click();
    await expect(page.getByTestId("wizard-step-2")).toBeVisible();

    // Go back to step 1
    await page.getByTestId("wizard-back").click();
    await expect(page.getByTestId("wizard-step-1")).toBeVisible();
  });

  test("skip to advanced preserves data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("guided-wizard")).toBeVisible();

    // Click "Skip to Advanced"
    await page.getByTestId("wizard-skip").click();

    // Advanced mode should now be visible
    await expect(page.locator('button[role="tab"]:has-text("Builder")')).toBeVisible();
    // Decision title should still be there
    await expect(page.locator('input[aria-label="Decision title"]')).toHaveValue(
      /Best City/i,
    );
  });

  test("open in Advanced Mode from step 4", async ({ page }) => {
    await page.goto("/");

    // Navigate to step 4
    await page.getByTestId("wizard-continue").click(); // → step 2
    await page.getByTestId("wizard-continue").click(); // → step 3
    await page.getByTestId("wizard-continue").click(); // → step 4
    await expect(page.getByTestId("wizard-step-4")).toBeVisible();

    // Click "Open in Advanced Mode"
    await page.getByTestId("wizard-open-advanced").click();

    // Should now see the Advanced tabbed layout
    await expect(page.locator('button[role="tab"]:has-text("Builder")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Results")')).toBeVisible();
  });

  test("wizard progress bar advances with steps", async ({ page }) => {
    await page.goto("/");
    const progressBar = page.locator('[role="progressbar"]');

    // Step 1: 25%
    await expect(progressBar).toHaveAttribute("aria-valuenow", "25");

    await page.getByTestId("wizard-continue").click();
    // Step 2: 50%
    await expect(progressBar).toHaveAttribute("aria-valuenow", "50");

    await page.getByTestId("wizard-continue").click();
    // Step 3: 75%
    await expect(progressBar).toHaveAttribute("aria-valuenow", "75");

    await page.getByTestId("wizard-continue").click();
    // Step 4: 100%
    await expect(progressBar).toHaveAttribute("aria-valuenow", "100");
  });

  test("wizard step 4 shows winner explanation", async ({ page }) => {
    await page.goto("/");

    // Navigate to step 4
    await page.getByTestId("wizard-continue").click();
    await page.getByTestId("wizard-continue").click();
    await page.getByTestId("wizard-continue").click();

    const explanation = page.getByTestId("winner-explanation");
    await expect(explanation).toBeVisible();
    // Should have meaningful text
    const text = await explanation.textContent();
    expect(text!.length).toBeGreaterThan(20);
  });

  test("wizard step 4 shows all 4 explore cards", async ({ page }) => {
    await page.goto("/");

    // Navigate to step 4
    await page.getByTestId("wizard-continue").click();
    await page.getByTestId("wizard-continue").click();
    await page.getByTestId("wizard-continue").click();

    await expect(page.getByTestId("explore-what-if-analysis")).toBeVisible();
    await expect(page.getByTestId("explore-compare-methods")).toBeVisible();
    await expect(page.getByTestId("explore-sensitivity")).toBeVisible();
    await expect(page.getByTestId("explore-monte-carlo")).toBeVisible();
  });
});
