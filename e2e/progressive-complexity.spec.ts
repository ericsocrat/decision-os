/**
 * E2E tests — Progressive Complexity Tiers in DecisionBuilder.
 *
 * Tests that complexity tiers gate advanced features appropriately,
 * showing more features as the decision grows.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/238
 */

import { test, expect } from "@playwright/test";

test.describe("Progressive Complexity — Builder Tiers", () => {
  test.beforeEach(async ({ page }) => {
    // Set up returning user with demo data in advanced mode
    await page.addInitScript(() => {
      localStorage.setItem("decisionos:onboarded", "true");
      localStorage.setItem("decisionos:wizard-mode", "advanced");
    });
    await page.goto("/");
    // Builder tab should be active by default
    await expect(page.locator('button[role="tab"]:has-text("Builder")')).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("tier indicator is visible in builder", async ({ page }) => {
    const tierIndicator = page.getByTestId("tier-indicator");
    await expect(tierIndicator).toBeVisible();
  });

  test("tier indicator shows a tier name", async ({ page }) => {
    const tierIndicator = page.getByTestId("tier-indicator");
    const text = await tierIndicator.textContent();
    // Should contain one of the tier names
    expect(text).toMatch(/Starter|Structured|Advanced|Expert/i);
  });

  test("demo decision shows higher tier (has options + criteria + scores)", async ({ page }) => {
    const tierIndicator = page.getByTestId("tier-indicator");
    const text = await tierIndicator.textContent();
    // Demo has 3 options, 5 criteria, full scores → should be at least Structured
    expect(text).not.toMatch(/^Starter$/);
  });

  test("builder renders option and criterion inputs", async ({ page }) => {
    // Should have option name inputs
    const optionInputs = page.locator('input[aria-label*="ption"], input[data-testid*="option"]');
    await expect(optionInputs.first()).toBeVisible();

    // Should have criterion name inputs or sections
    const criteriaSection = page.locator('text=/Criteria|criterion/i').first();
    await expect(criteriaSection).toBeVisible();
  });
});
