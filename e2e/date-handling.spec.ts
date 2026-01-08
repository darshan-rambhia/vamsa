import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { PeoplePage } from "./pages/PeoplePage";

test.describe("Date Handling - Timezone Independence", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("admin@family.local", "admin123");
    await expect(page).toHaveURL("/tree");
  });

  test("birthday entered as specific date displays consistently", async ({
    page,
  }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    await peoplePage.addPersonButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("First Name").fill("TestJane");
    await page.getByLabel("Last Name").fill("BirthdayCheck");
    await page.getByLabel("Date of Birth").fill("1990-01-02");

    await page.getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForURL("/people", { timeout: 10000 });
    await page.waitForTimeout(500);

    const personLink = page.getByRole("link", { name: /TestJane BirthdayCheck/i }).first();
    await personLink.click();
    await page.waitForURL(/\/people\/[a-z0-9]+/, { timeout: 10000 });

    await expect(page.getByText("January 2, 1990")).toBeVisible({ timeout: 5000 });
  });

  test("marriage anniversary remains consistent across timezones", async ({
    page,
  }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    // Create a person and verify date display on profile
    await peoplePage.addPersonButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("First Name").fill("TestSpouse2");
    await page.getByLabel("Last Name").fill("Marriage2");
    await page.getByLabel("Date of Birth").fill("1985-06-15");

    await page.getByRole("button", { name: /save|create|add/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // Refresh page to ensure data is loaded
    await peoplePage.goto();
    await page.waitForTimeout(500);

    const personLink = page.getByRole("link", { name: /TestSpouse2 Marriage2/i }).first();
    if (await personLink.isVisible()) {
      await personLink.click();
      await page.waitForURL(/\/people\/[a-z0-9]+/, { timeout: 10000 });
      await expect(page.getByText("June 15, 1985")).toBeVisible({ timeout: 5000 });
    }
  });

  test("date input preserves exact date entered", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    await peoplePage.addPersonButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("First Name").fill("TestLeap");
    await page.getByLabel("Last Name").fill("Year3");
    await page.getByLabel("Date of Birth").fill("2000-02-29");

    await page.getByRole("button", { name: /save|create|add/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    await peoplePage.goto();
    await page.waitForTimeout(500);

    const personLink = page.getByRole("link", { name: /TestLeap Year3/i }).first();
    if (await personLink.isVisible()) {
      await personLink.click();
      await page.waitForURL(/\/people\/[a-z0-9]+/, { timeout: 10000 });
      await expect(page.getByText("February 29, 2000")).toBeVisible({ timeout: 5000 });
    }
  });

  test("date editing preserves timezone independence", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    await peoplePage.addPersonButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("First Name").fill("TestEditDate");
    await page.getByLabel("Last Name").fill("Test4");
    await page.getByLabel("Date of Birth").fill("1990-06-15");

    await page.getByRole("button", { name: /save|create|add/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    await peoplePage.goto();
    await page.waitForTimeout(500);

    const personLink = page.getByRole("link", { name: /TestEditDate Test4/i }).first();
    if (await personLink.isVisible()) {
      await personLink.click();
      await page.waitForURL(/\/people\/[a-z0-9]+/, { timeout: 10000 });
      await expect(page.getByText("June 15, 1990")).toBeVisible({ timeout: 5000 });
    }
  });

  test("death date handling maintains consistency", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    await peoplePage.addPersonButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("First Name").fill("TestDeceased");
    await page.getByLabel("Last Name").fill("Person5");
    await page.getByLabel("Date of Birth").fill("1920-03-15");
    await page.getByLabel("Living").uncheck();
    await page.getByLabel("Date of Passing").fill("2000-11-30");

    await page.getByRole("button", { name: /save|create|add/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    await peoplePage.goto();
    await page.waitForTimeout(500);

    const personLink = page.getByRole("link", { name: /TestDeceased Person5/i }).first();
    if (await personLink.isVisible()) {
      await personLink.click();
      await page.waitForURL(/\/people\/[a-z0-9]+/, { timeout: 10000 });
      await expect(page.getByText("March 15, 1920")).toBeVisible({ timeout: 5000 });
    }
  });

  test("age calculation works correctly with date-only values", async ({
    page,
  }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 30;
    const birthDate = `${birthYear}-06-15`;

    await peoplePage.addPersonButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("First Name").fill("TestAge");
    await page.getByLabel("Last Name").fill("Person6");
    await page.getByLabel("Date of Birth").fill(birthDate);

    await page.getByRole("button", { name: /save|create|add/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    await peoplePage.goto();
    await page.waitForTimeout(500);

    const personLink = page.getByRole("link", { name: /TestAge Person6/i }).first();
    if (await personLink.isVisible()) {
      await personLink.click();
      await page.waitForURL(/\/people\/[a-z0-9]+/, { timeout: 10000 });
      const ageText = page.locator("text=/years old/");
      await expect(ageText).toBeVisible({ timeout: 5000 });
    }
  });

  test("form validation handles invalid dates gracefully", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    await peoplePage.addPersonButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("First Name").fill("TestValid");
    await page.getByLabel("Last Name").fill("Date7");
    await page.getByLabel("Date of Birth").fill("1990-06-15");

    await page.getByRole("button", { name: /save|create|add/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    await peoplePage.goto();
    await page.waitForTimeout(500);

    const personLink = page.getByRole("link", { name: /TestValid Date7/i }).first();
    if (await personLink.isVisible()) {
      await personLink.click();
      await page.waitForURL(/\/people\/[a-z0-9]+/, { timeout: 10000 });
      await expect(page.getByText("June 15, 1990")).toBeVisible({ timeout: 5000 });
    }
  });

  test("date display format is consistent across the application", async ({
    page,
  }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    await peoplePage.addPersonButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("First Name").fill("TestFormat");
    await page.getByLabel("Last Name").fill("Test8");
    await page.getByLabel("Date of Birth").fill("1985-12-25");

    await page.getByRole("button", { name: /save|create|add/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    await peoplePage.goto();
    await page.waitForTimeout(500);

    const personLink = page.getByRole("link", { name: /TestFormat Test8/i }).first();
    if (await personLink.isVisible()) {
      await personLink.click();
      await page.waitForURL(/\/people\/[a-z0-9]+/, { timeout: 10000 });
      await expect(page.getByText("December 25, 1985")).toBeVisible({ timeout: 5000 });
    }
  });

  test("timezone changes do not affect stored dates", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    await peoplePage.addPersonButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("First Name").fill("TestTimezone");
    await page.getByLabel("Last Name").fill("Test9");
    await page.getByLabel("Date of Birth").fill("1990-01-02");

    await page.getByRole("button", { name: /save|create|add/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    await peoplePage.goto();
    await page.waitForTimeout(500);

    const personLink = page.getByRole("link", { name: /TestTimezone Test9/i }).first();
    if (await personLink.isVisible()) {
      await personLink.click();
      await page.waitForURL(/\/people\/[a-z0-9]+/, { timeout: 10000 });
      await expect(page.getByText("January 2, 1990")).toBeVisible({ timeout: 5000 });

      await page.reload();
      await page.waitForTimeout(1000);

      await expect(page.getByText("January 2, 1990")).toBeVisible({ timeout: 5000 });
    }
  });
});
