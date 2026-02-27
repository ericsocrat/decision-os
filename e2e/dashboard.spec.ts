/**
 * E2E tests for the Multi-Decision Dashboard (#236).
 */

import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Bypass onboarding, seed 2 decisions so dashboard "Back" link is available
    await page.addInitScript(() => {
      localStorage.setItem("decisionos:onboarded", "true");
      localStorage.removeItem("decisionos:wizard-mode");
      const demo = {
        id: "demo-relocation-decision",
        title: "Best City to Relocate To",
        options: [
          { id: "opt-austin", name: "Austin, TX" },
          { id: "opt-denver", name: "Denver, CO" },
        ],
        criteria: [{ id: "crit-cost", name: "Cost", weight: 50, type: "benefit" }],
        scores: { "opt-austin": { "crit-cost": 8 }, "opt-denver": { "crit-cost": 6 } },
        createdAt: "2026-01-15T10:00:00.000Z",
        updatedAt: "2026-01-15T10:00:00.000Z",
      };
      const second = {
        id: "second-decision",
        title: "Apartment Hunt",
        options: [
          { id: "o1", name: "Place A" },
          { id: "o2", name: "Place B" },
        ],
        criteria: [{ id: "c1", name: "Price", weight: 60, type: "cost" }],
        scores: { o1: { c1: 4 }, o2: { c1: 7 } },
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      };
      localStorage.setItem("decision-os:decisions", JSON.stringify([demo, second]));
    });
  });

  test("shows 'Back to Dashboard' link when multiple decisions exist", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='back-to-dashboard']");
    await expect(page.locator("[data-testid='back-to-dashboard']")).toBeVisible();
  });

  test("navigates to dashboard and back to decision", async ({ page }) => {
    await page.goto("/");

    // Click back to dashboard
    await page.click("[data-testid='back-to-dashboard']");
    await expect(page.locator("[data-testid='dashboard']")).toBeVisible();
    await expect(page.locator("text=Your Decisions")).toBeVisible();

    // Click a card to open a decision
    const cards = page.locator("[data-testid^='decision-card-']");
    await expect(cards).toHaveCount(2);
    await cards.first().click();

    // Should be back in decision view
    await expect(page.locator("[data-testid='dashboard']")).not.toBeVisible();
  });

  test("dashboard search filters decisions", async ({ page }) => {
    await page.goto("/");
    await page.click("[data-testid='back-to-dashboard']");
    await expect(page.locator("[data-testid='dashboard']")).toBeVisible();

    // Type in search
    await page.fill("[data-testid='dashboard-search']", "apartment");

    // Only Apartment Hunt should be visible
    const cards = page.locator("[data-testid^='decision-card-']");
    await expect(cards).toHaveCount(1);
    await expect(page.locator("text=Apartment Hunt")).toBeVisible();
  });

  test("dashboard New Decision button navigates away", async ({ page }) => {
    await page.goto("/");
    await page.click("[data-testid='back-to-dashboard']");
    await expect(page.locator("[data-testid='dashboard']")).toBeVisible();

    await page.click("[data-testid='dashboard-new-decision']");

    // Dashboard should be gone
    await expect(page.locator("[data-testid='dashboard']")).not.toBeVisible();
  });
});
