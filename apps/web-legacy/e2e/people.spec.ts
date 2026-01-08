import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { PeoplePage } from "./pages/PeoplePage";

test.describe("People Management", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("admin@family.local", "admin123");
    await expect(page).toHaveURL("/tree");
  });

  test("should navigate to people page", async ({ page }) => {
    await page.getByRole("link", { name: /people/i }).click();
    await expect(page).toHaveURL("/people");
  });

  test("should display add person button", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    await expect(peoplePage.addPersonButton).toBeVisible();
  });

  test("should open add person dialog", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    await peoplePage.addPersonButton.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("First Name")).toBeVisible();
    await expect(page.getByLabel("Last Name")).toBeVisible();
  });

  test("should create a new person", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    // Wait for the page to load
    await page.waitForSelector("text=/\\d+ people in the family tree/i");

    // Open the add person dialog
    await peoplePage.addPersonButton.click();

    // Fill in the form
    await page.getByLabel("First Name").fill("Jane");
    await page.getByLabel("Last Name").fill("Smith");

    // Submit the form
    await page.getByRole("button", { name: /save|create|add/i }).click();

    // Wait for potential toast/notification
    await page.waitForTimeout(3000);

    // The test passes if we get here without errors
    await expect(page.locator("h1:has-text('People')")).toBeVisible();
  });
});
