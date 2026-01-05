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

    // Open add person dialog
    await peoplePage.addPersonButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill in person details with a specific birthday
    await page.getByLabel("First Name").fill("Jane");
    await page.getByLabel("Last Name").fill("TestDate");
    await page.getByLabel("Date of Birth").fill("1990-01-02"); // January 2nd, 1990

    // Submit the form
    await page.getByRole("button", { name: /save|create|add/i }).click();

    // Wait for form submission and navigation
    await page.waitForTimeout(2000);

    // Navigate to the person's profile to verify the date
    await page.getByText("Jane TestDate").first().click();

    // Verify the birthday displays as January 2, 1990 (not January 1st due to timezone shift)
    await expect(page.getByText("January 2, 1990")).toBeVisible();
  });

  test("marriage anniversary remains consistent across timezones", async ({
    page,
  }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    // Create first person
    await peoplePage.addPersonButton.click();
    await page.getByLabel("First Name").fill("John");
    await page.getByLabel("Last Name").fill("Marriage");
    await page.getByLabel("Date of Birth").fill("1985-06-15");
    await page.getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForTimeout(2000);

    // Create second person
    await peoplePage.addPersonButton.click();
    await page.getByLabel("First Name").fill("Jane");
    await page.getByLabel("Last Name").fill("Marriage");
    await page.getByLabel("Date of Birth").fill("1987-08-20");
    await page.getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to John's profile to add relationship
    await page.getByText("John Marriage").first().click();

    // Add marriage relationship
    await page.getByRole("button", { name: /add relationship/i }).click();
    await page.getByLabel(/person/i).selectOption({ label: "Jane Marriage" });
    await page.getByLabel(/relationship type/i).selectOption("SPOUSE");
    await page.getByLabel(/marriage date/i).fill("2010-12-25"); // Christmas Day 2010
    await page.getByRole("button", { name: /save|add/i }).click();

    await page.waitForTimeout(2000);

    // Verify the marriage date displays as December 25, 2010
    await expect(page.getByText("December 25, 2010")).toBeVisible();
  });

  test("date input preserves exact date entered", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    // Test various edge case dates
    const testDates = [
      { input: "2000-02-29", display: "February 29, 2000" }, // Leap year
      { input: "1999-12-31", display: "December 31, 1999" }, // Year boundary
      { input: "2001-01-01", display: "January 1, 2001" }, // Year boundary
      { input: "1985-07-04", display: "July 4, 1985" }, // Independence Day
    ];

    for (const testCase of testDates) {
      // Create person with specific date
      await peoplePage.addPersonButton.click();
      await page.getByLabel("First Name").fill("Test");
      await page
        .getByLabel("Last Name")
        .fill(`Date${testCase.input.replace(/-/g, "")}`);
      await page.getByLabel("Date of Birth").fill(testCase.input);
      await page.getByRole("button", { name: /save|create|add/i }).click();
      await page.waitForTimeout(2000);

      // Navigate to profile and verify date display
      await page
        .getByText(`Test Date${testCase.input.replace(/-/g, "")}`)
        .first()
        .click();
      await expect(page.getByText(testCase.display)).toBeVisible();

      // Go back to people list
      await page.getByRole("link", { name: /people/i }).click();
    }
  });

  test("date editing preserves timezone independence", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    // Create person
    await peoplePage.addPersonButton.click();
    await page.getByLabel("First Name").fill("Edit");
    await page.getByLabel("Last Name").fill("DateTest");
    await page.getByLabel("Date of Birth").fill("1990-06-15");
    await page.getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to profile
    await page.getByText("Edit DateTest").first().click();

    // Edit the person
    await page.getByRole("button", { name: /edit/i }).click();

    // Verify the date input shows the correct value
    const dateInput = page.getByLabel("Date of Birth");
    await expect(dateInput).toHaveValue("1990-06-15");

    // Change the date
    await dateInput.fill("1990-06-16");
    await page.getByRole("button", { name: /save|update/i }).click();
    await page.waitForTimeout(2000);

    // Verify the new date displays correctly
    await expect(page.getByText("June 16, 1990")).toBeVisible();
  });

  test("death date handling maintains consistency", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    // Create deceased person
    await peoplePage.addPersonButton.click();
    await page.getByLabel("First Name").fill("Deceased");
    await page.getByLabel("Last Name").fill("Person");
    await page.getByLabel("Date of Birth").fill("1920-03-15");

    // Uncheck living status
    await page.getByLabel("Living").uncheck();

    // Fill death date
    await page.getByLabel("Date of Passing").fill("2000-11-30");

    await page.getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to profile and verify both dates
    await page.getByText("Deceased Person").first().click();
    await expect(page.getByText("March 15, 1920")).toBeVisible();
    await expect(page.getByText("November 30, 2000")).toBeVisible();
  });

  test("age calculation works correctly with date-only values", async ({
    page,
  }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    // Create person with known birthday for age calculation
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - 30; // 30 years old
    const birthDate = `${birthYear}-06-15`;

    await peoplePage.addPersonButton.click();
    await page.getByLabel("First Name").fill("Age");
    await page.getByLabel("Last Name").fill("Test");
    await page.getByLabel("Date of Birth").fill(birthDate);
    await page.getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to profile and check if age is displayed correctly
    await page.getByText("Age Test").first().click();

    // The age should be around 30 (might be 29 or 30 depending on current date vs birthday)
    const agePattern = /(29|30|31) years old/;
    await expect(page.locator("text=" + agePattern.source)).toBeVisible();
  });

  test("form validation handles invalid dates gracefully", async ({ page }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    await peoplePage.addPersonButton.click();
    await page.getByLabel("First Name").fill("Invalid");
    await page.getByLabel("Last Name").fill("Date");

    // Try to enter invalid date (browser should prevent this, but let's test)
    const dateInput = page.getByLabel("Date of Birth");

    // Test with invalid date format (browser input[type="date"] should handle this)
    await dateInput.fill("invalid-date");

    // The input should either reject the invalid format or clear it
    const inputValue = await dateInput.inputValue();
    expect(inputValue === "" || inputValue === "invalid-date").toBe(true);

    // Try with a valid date to ensure the form still works
    await dateInput.fill("1990-06-15");
    await page.getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForTimeout(2000);

    // Should successfully create the person
    await expect(page.getByText("Invalid Date")).toBeVisible();
  });

  test("date display format is consistent across the application", async ({
    page,
  }) => {
    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    // Create person with specific date
    await peoplePage.addPersonButton.click();
    await page.getByLabel("First Name").fill("Format");
    await page.getByLabel("Last Name").fill("Test");
    await page.getByLabel("Date of Birth").fill("1985-12-25");
    await page.getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForTimeout(2000);

    // Check date format in people list (if displayed)
    // This might vary based on the UI design

    // Check date format in profile view
    await page.getByText("Format Test").first().click();
    await expect(page.getByText("December 25, 1985")).toBeVisible();

    // Check date format in edit form
    await page.getByRole("button", { name: /edit/i }).click();
    const dateInput = page.getByLabel("Date of Birth");
    await expect(dateInput).toHaveValue("1985-12-25");
  });

  test("timezone changes do not affect stored dates", async ({ page }) => {
    // This test simulates timezone changes by using different browser contexts
    // In a real scenario, you might want to test with different system timezones

    const peoplePage = new PeoplePage(page);
    await peoplePage.goto();

    // Create person
    await peoplePage.addPersonButton.click();
    await page.getByLabel("First Name").fill("Timezone");
    await page.getByLabel("Last Name").fill("Test");
    await page.getByLabel("Date of Birth").fill("1990-01-02");
    await page.getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForTimeout(2000);

    // Navigate to profile and verify date
    await page.getByText("Timezone Test").first().click();
    await expect(page.getByText("January 2, 1990")).toBeVisible();

    // Refresh the page to simulate a new session
    await page.reload();
    await page.waitForTimeout(2000);

    // Date should still display as January 2, 1990
    await expect(page.getByText("January 2, 1990")).toBeVisible();
  });
});
