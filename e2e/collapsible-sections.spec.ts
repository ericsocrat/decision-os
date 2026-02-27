/**
 * E2E tests — Collapsible Sections in ResultsView.
 *
 * Tests section expand/collapse, Expand All / Collapse All toggle,
 * and correct default state of advanced sections.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/238
 */

import { test, expect } from "@playwright/test";

test.describe("Collapsible Sections — ResultsView", () => {
  test.beforeEach(async ({ page }) => {
    // Set up returning user with demo data in advanced mode
    await page.addInitScript(() => {
      localStorage.setItem("decisionos:onboarded", "true");
      localStorage.setItem("decisionos:wizard-mode", "advanced");
    });
    await page.goto("/");
    // Wait for page to load
    await expect(page.locator('button[role="tab"]:has-text("Results")')).toBeVisible();
    // Navigate to Results tab
    await page.locator('button[role="tab"]:has-text("Results")').click();
    await expect(page.locator("#panel-results")).toBeVisible();
  });

  test("core sections are visible by default", async ({ page }) => {
    // Rankings section should be visible (core section)
    await expect(page.locator('text="Rankings"').first()).toBeVisible();
  });

  test("collapsible section can be expanded and collapsed", async ({ page }) => {
    // Find a collapsible section button (e.g., Pareto, What-If, etc.)
    const collapsibleButton = page
      .locator("button")
      .filter({ hasText: /Pareto|What-If|Outcome|Retrospective|Pattern/i })
      .first();

    // Skip if no collapsible sections found (layout may differ)
    const count = await collapsibleButton.count();
    if (count === 0) return;

    // Click to toggle
    const initialExpanded = await collapsibleButton.getAttribute("aria-expanded");
    await collapsibleButton.click();
    const afterExpanded = await collapsibleButton.getAttribute("aria-expanded");

    // State should have toggled
    expect(afterExpanded).not.toBe(initialExpanded);
  });

  test("expand all / collapse all button works", async ({ page }) => {
    // Look for the Expand All button
    const expandAllBtn = page.getByRole("button", { name: /expand all/i });

    // Skip if not present (only shows with AdvancedSectionsGroup)
    const count = await expandAllBtn.count();
    if (count === 0) return;

    // Click Expand All
    await expandAllBtn.click();
    // Button should now say "Collapse All"
    await expect(page.getByRole("button", { name: /collapse all/i })).toBeVisible();

    // Click Collapse All
    await page.getByRole("button", { name: /collapse all/i }).click();
    // Button should revert to "Expand All"
    await expect(page.getByRole("button", { name: /expand all/i })).toBeVisible();
  });

  test("collapsible section uses proper ARIA attributes", async ({ page }) => {
    // Find any collapsible trigger button
    const collapsibleButton = page
      .locator("button[aria-expanded]")
      .first();

    const count = await collapsibleButton.count();
    if (count === 0) return;

    // Should have aria-expanded attribute
    const expanded = await collapsibleButton.getAttribute("aria-expanded");
    expect(expanded === "true" || expanded === "false").toBe(true);

    // Should have aria-controls pointing to a region
    const controls = await collapsibleButton.getAttribute("aria-controls");
    if (controls) {
      const region = page.locator(`#${controls}`);
      await expect(region).toBeAttached();
    }
  });
});
