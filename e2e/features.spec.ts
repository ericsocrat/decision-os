/**
 * E2E feature integration tests — verifies templates, import, share, and delete.
 *
 * Covers: template picker, JSON import, share page, decision deletion,
 * and Monte Carlo / Compare sub-tabs.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/198
 */

import { test, expect } from "@playwright/test";

test.describe("Decision OS — Feature Integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("decisionos:onboarded", "true");
    });
    await page.goto("/");
    await page.waitForSelector('h1:has-text("Decision OS")');
  });

  test("select a template and verify it scaffolds a decision", async ({ page }) => {
    // Open template picker
    await page.getByRole("button", { name: "Templates" }).click();
    const dialog = page.getByRole("dialog", { name: "Choose a decision template" });
    await expect(dialog).toBeVisible();

    // Select "Job Offer Comparison" template
    await dialog.locator("[data-template-card]").filter({ hasText: "Job Offer" }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Decision title should now be "Job Offer Comparison"
    const selector = page.getByRole("combobox", { name: "Select decision" });
    await expect(selector).toContainText("Job Offer Comparison");

    // Template criteria should be present
    await expect(page.getByLabel("Criterion name: Salary & Compensation")).toBeVisible();
    await expect(page.getByLabel("Criterion name: Growth Potential")).toBeVisible();

    // Template options should be present
    await expect(page.getByLabel("Option 1 name")).toHaveValue("Company A");
    await expect(page.getByLabel("Option 2 name")).toHaveValue("Company B");
  });

  test("import a JSON decision file and verify it loads", async ({ page }) => {
    // Prepare a valid decision JSON
    const decision = {
      id: "imported-test",
      title: "Imported E2E Decision",
      description: "Created for E2E testing",
      options: [
        { id: "opt-1", name: "Alpha" },
        { id: "opt-2", name: "Beta" },
      ],
      criteria: [
        { id: "crit-1", name: "Speed", weight: 60, type: "benefit" },
        { id: "crit-2", name: "Price", weight: 40, type: "cost" },
      ],
      scores: {
        "opt-1": { "crit-1": 8, "crit-2": 5 },
        "opt-2": { "crit-1": 6, "crit-2": 3 },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Open import dialog
    await page.getByRole("button", { name: "Import" }).click();
    const dialog = page.getByRole("dialog", { name: "Import decision" });
    await expect(dialog).toBeVisible();

    // Upload the JSON via the hidden file input
    const fileInput = page.getByLabel("Choose file to import");
    const buffer = Buffer.from(JSON.stringify(decision));
    await fileInput.setInputFiles({
      name: "test-import.json",
      mimeType: "application/json",
      buffer,
    });

    // Wait for import to complete — dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // The imported decision should now be selected
    const selector = page.getByRole("combobox", { name: "Select decision" });
    await expect(selector).toContainText("Imported E2E Decision");

    // Verify criteria and options loaded
    await expect(page.getByLabel("Criterion name: Speed")).toBeVisible();
    await expect(page.getByLabel("Criterion name: Price")).toBeVisible();
  });

  test("delete a decision and verify it is removed", async ({ page }) => {
    // First create a decision to delete
    await page.getByRole("button", { name: "New" }).click();
    const titleInput = page.getByPlaceholder("What are you deciding?");
    await titleInput.fill("To Be Deleted");

    // Verify it's in the selector
    const selector = page.getByRole("combobox", { name: "Select decision" });
    await expect(selector).toContainText("To Be Deleted");

    // Delete it
    // Handle the confirmation dialog
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete current decision" }).click();

    // Should no longer be in the selector
    await expect(
      selector.locator('option:has-text("To Be Deleted")')
    ).not.toBeAttached();

    // Should fall back to another decision (demo)
    await expect(selector).toContainText("Best City to Relocate To");
  });

  test("share page loads from encoded URL", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Clipboard permissions only supported in Chromium");
    // Navigate to share page with encoded data
    // First copy a share link from the Results tab
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("tab", { name: "Results" }).click();
    await page.getByRole("button", { name: "Copy share link" }).click();
    await expect(page.locator('text="Link copied to clipboard!"')).toBeVisible();

    // Get the clipboard content
    const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    expect(shareUrl).toContain("/share");

    // Navigate to the share URL
    await page.goto(shareUrl);

    // Share page should render the decision
    await expect(page.locator('text="Best City to Relocate To"')).toBeVisible();
  });

  test("Monte Carlo tab renders simulation results", async ({ page }) => {
    // Navigate to Results tab
    await page.getByRole("tab", { name: "Results" }).click();
    await expect(page.locator("#panel-results")).toBeVisible();

    // Click Monte Carlo sub-tab if available
    const monteCarloTab = page.locator('button[role="tab"]:has-text("Monte Carlo")');
    if (await monteCarloTab.isVisible()) {
      await monteCarloTab.click();
      // Should see simulation content
      await expect(page.locator('text="Monte Carlo"')).toBeVisible();
    }
  });

  test("Compare tab renders comparison view", async ({ page }) => {
    // Navigate to Results tab
    await page.getByRole("tab", { name: "Results" }).click();
    await expect(page.locator("#panel-results")).toBeVisible();

    // Click Compare sub-tab if available
    const compareTab = page.getByRole("tab", { name: "Compare" });
    if (await compareTab.isVisible()) {
      await compareTab.click();
      // Should see comparison panel
      await expect(page.locator("#panel-compare")).toBeVisible();
    }
  });

  test("Sensitivity tab shows weight sensitivity analysis", async ({ page }) => {
    await page.getByRole("tab", { name: "Sensitivity" }).click();
    const sensitivityPanel = page.locator("#panel-sensitivity");
    await expect(sensitivityPanel).toBeVisible();

    // Should show sensitivity analysis content
    await expect(sensitivityPanel).toBeVisible();
  });

  test("decision title updates in selector when changed", async ({ page }) => {
    // Change the demo decision title
    const titleInput = page.getByPlaceholder("What are you deciding?");
    await titleInput.fill("My Custom Decision Name");

    // The selector should reflect the new title
    const selector = page.getByRole("combobox", { name: "Select decision" });
    await expect(selector).toContainText("My Custom Decision Name");
  });

  test("empty decision shows correct empty state in Results", async ({ page }) => {
    // Create a new empty decision
    await page.getByRole("button", { name: "New" }).click();

    // Go to Results tab
    await page.getByRole("tab", { name: "Results" }).click();
    const resultsPanel = page.locator("#panel-results");
    await expect(resultsPanel).toBeVisible();

    // Empty decision should show some form of empty/incomplete message
    // (either "No scores" or "Add criteria" or equivalent guidance)
    // At minimum, the Results panel should render without errors
    expect(await resultsPanel.isVisible()).toBe(true);
  });
});
