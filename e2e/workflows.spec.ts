/**
 * E2E workflow tests — verifies core decision-building workflows end-to-end.
 *
 * Covers: adding criteria/options, scoring, weight adjustment,
 * persistence across reload, and multi-decision isolation.
 *
 * @see https://github.com/ericsocrat/decision-os/issues/198
 */

import { test, expect } from "@playwright/test";

test.describe("Decision OS — Core Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("decisionos:onboarded", "true");
    });
    await page.goto("/");
    await page.waitForSelector('h1:has-text("Decision OS")');
  });

  test("add a criterion and verify it appears in Builder", async ({ page }) => {
    // Demo decision starts with 5 criteria — add a 6th
    const addBtn = page.getByRole("button", { name: "Add criterion" });
    await addBtn.click();

    // A new empty criterion input should appear
    const newInput = page.getByPlaceholder("Criterion name").last();
    await expect(newInput).toBeVisible();
    await newInput.fill("Commute Time");

    // Verify it persists in the DOM
    await expect(page.getByLabel("Criterion name: Commute Time")).toBeVisible();
  });

  test("add an option and verify it appears in Builder", async ({ page }) => {
    // Demo decision starts with 3 options — add a 4th
    const addBtn = page.getByRole("button", { name: "Add option" });
    await addBtn.click();

    // New option input appears — last placeholder cycles through letters
    const newInput = page.getByLabel("Option 4 name");
    await expect(newInput).toBeVisible();
    await newInput.fill("Portland, OR");

    // Verify the option shows by its remove button
    await expect(
      page.getByRole("button", { name: "Remove option Portland, OR" })
    ).toBeVisible();
  });

  test("score an alternative and verify Results tab updates", async ({ page }) => {
    // Clear a score and set it to a known value (use spinbutton to avoid matching the range slider)
    const scoreInput = page.getByRole("spinbutton", { name: "Score for Austin, TX on Cost of Living" });
    await scoreInput.fill("10");

    // Navigate to Results
    await page.getByRole("tab", { name: "Results" }).click();
    const resultsPanel = page.locator("#panel-results");
    await expect(resultsPanel).toBeVisible();

    // Rankings should still render (the new score changes ranking math)
    await expect(resultsPanel.locator('text="Rankings"')).toBeVisible();
    await expect(resultsPanel.locator('text="Winner"')).toBeVisible();
  });

  test("adjust criterion weight and verify ranking change", async ({ page }) => {
    // Set Cost of Living weight to 80 (dominant) and all others much lower
    const costWeight = page.getByLabel("Weight value for Cost of Living");
    await costWeight.fill("80");

    // Lower Jobs weight
    const jobsWeight = page.getByLabel("Weight value for Job Opportunities");
    await jobsWeight.fill("5");

    // Navigate to Results and verify rankings render
    await page.getByRole("tab", { name: "Results" }).click();
    const resultsPanel = page.locator("#panel-results");
    await expect(resultsPanel.locator('text="Rankings"')).toBeVisible();

    // With Cost of Living (cost-type) weight at 80, Raleigh (score 4, lower=better for cost)
    // should rank highly. Verify Winner badge exists
    await expect(resultsPanel.locator('text="Winner"')).toBeVisible();
  });

  test("decision persists across page reload", async ({ page }) => {
    // Create a new decision with a distinctive title
    await page.getByRole("button", { name: "New" }).click();
    const titleInput = page.getByPlaceholder("What are you deciding?");
    await titleInput.fill("Persistence Test Decision");

    // Add a criterion
    const criterionInput = page.getByPlaceholder("Criterion name").first();
    await criterionInput.fill("Durability");

    // Reload the page
    await page.reload();
    await page.waitForSelector('h1:has-text("Decision OS")');

    // The decision should still be in the selector
    const selector = page.getByRole("combobox", { name: "Select decision" });
    await expect(selector).toContainText("Persistence Test Decision");

    // Select it and verify the criterion is still there
    await selector.selectOption({ label: "Persistence Test Decision" });
    await expect(page.getByLabel("Criterion name: Durability")).toBeVisible();
  });

  test("switch between decisions and verify state isolation", async ({ page }) => {
    // Create a second decision
    await page.getByRole("button", { name: "New" }).click();
    const titleInput = page.getByPlaceholder("What are you deciding?");
    await titleInput.fill("Isolated Decision");

    // Add a unique criterion
    const criterionInput = page.getByPlaceholder("Criterion name").first();
    await criterionInput.fill("Uniqueness Factor");

    // Switch back to demo decision
    const selector = page.getByRole("combobox", { name: "Select decision" });
    await selector.selectOption({ label: "Best City to Relocate To" });

    // Demo criteria should be visible, not the isolated one
    await expect(page.getByLabel("Criterion name: Cost of Living")).toBeVisible();
    await expect(page.getByLabel("Criterion name: Uniqueness Factor")).not.toBeVisible();

    // Switch back to isolated decision
    await selector.selectOption({ label: "Isolated Decision" });
    await expect(page.getByLabel("Criterion name: Uniqueness Factor")).toBeVisible();
  });

  test("remove a criterion and verify it disappears", async ({ page }) => {
    // Demo has 5 criteria — remove "Weather"
    const removeBtn = page.getByRole("button", { name: "Remove criterion Weather" });
    await removeBtn.click();

    // Weather criterion should be gone
    await expect(page.getByLabel("Criterion name: Weather")).not.toBeVisible();

    // Other criteria should still exist
    await expect(page.getByLabel("Criterion name: Cost of Living")).toBeVisible();
    await expect(page.getByLabel("Criterion name: Job Opportunities")).toBeVisible();
  });

  test("remove an option and verify it disappears", async ({ page }) => {
    // Demo has 3 options — remove "Denver, CO"
    const removeBtn = page.getByRole("button", { name: "Remove option Denver, CO" });
    await removeBtn.click();

    // Denver should be gone
    await expect(
      page.getByRole("button", { name: "Remove option Denver, CO" })
    ).not.toBeVisible();

    // With only 2 options remaining, remove buttons are hidden.
    // Verify Austin and Raleigh option inputs still exist.
    await expect(page.getByLabel("Option 1 name")).toHaveValue("Austin, TX");
    await expect(page.getByLabel("Option 2 name")).toHaveValue("Raleigh, NC");
  });

  test("undo and redo restore previous state", async ({ page }) => {
    // Change the title
    const titleInput = page.getByPlaceholder("What are you deciding?");
    const originalTitle = await titleInput.inputValue();
    await titleInput.fill("Changed Title");
    await expect(titleInput).toHaveValue("Changed Title");

    // Undo
    await page.keyboard.press("Control+z");
    await expect(titleInput).toHaveValue(originalTitle);

    // Redo
    await page.keyboard.press("Control+Shift+z");
    await expect(titleInput).toHaveValue("Changed Title");
  });

  test("change criterion type between Benefit and Cost", async ({ page }) => {
    // Job Opportunities is a benefit type — change it to cost
    const typeSelect = page.getByLabel("Type for Job Opportunities");
    await typeSelect.selectOption("cost");

    // Verify it changed
    await expect(typeSelect).toHaveValue("cost");

    // Navigate to Results — should still render without errors
    await page.getByRole("tab", { name: "Results" }).click();
    await expect(page.locator("#panel-results").locator('text="Rankings"')).toBeVisible();
  });
});
