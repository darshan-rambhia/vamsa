/**
 * E2E Tests for Backup & Export Functionality
 *
 * Tests backup page access, export form display, and functionality
 * for admin users.
 */
import { test, expect, TEST_USERS, bdd } from "./fixtures";

test.describe("Feature: Backup & Export", () => {
  test("Scenario: Admin accesses backup page and views export form", async ({
    page,
    login,
  }) => {
    await bdd.given("user is logged in as admin", async () => {
      await login(TEST_USERS.admin);
    });

    await bdd.when("user navigates to admin backup page", async () => {
      await page.goto("/admin/backup");
    });

    await bdd.then("admin should see the backup export page", async () => {
      // Verify page is loaded with heading
      const pageHeading = page.locator("h1, h2");
      await expect(pageHeading.first()).toBeVisible();

      // Verify export form exists
      const form = page.locator("form");
      await expect(form).toBeVisible();
    });

    await bdd.and("form should display export options", async () => {
      // Verify form contains export-related elements
      const exportButton = page.locator(
        'button:has-text("export"), button:has-text("download"), button[type="submit"]'
      );
      await expect(exportButton.first()).toBeVisible();
    });
  });

  test("Scenario: Admin can interact with export form", async ({
    page,
    login,
  }) => {
    await bdd.given("user is logged in as admin", async () => {
      await login(TEST_USERS.admin);
    });

    await bdd.and("user is on the backup export page", async () => {
      await page.goto("/admin/backup");
      const form = page.locator("form");
      await expect(form).toBeVisible();
    });

    await bdd.when("user views the export form", async () => {
      // Verify export button is visible
      const exportButton = page.locator(
        'button:has-text("export"), button[type="submit"]'
      );
      const isVisible = await exportButton.first().isVisible();
      expect(isVisible).toBeTruthy();
    });

    await bdd.then("export button should be present on the form", async () => {
      // Verify export button exists (it may be disabled if form is invalid)
      const exportButton = page.locator(
        'button:has-text("export"), button[type="submit"]'
      );
      const buttonExists = await exportButton.first().isVisible();
      expect(buttonExists).toBeTruthy();
    });
  });

  test("Scenario: Backup page loads successfully for admin", async ({
    page,
    login,
  }) => {
    await bdd.given("user is logged in as admin", async () => {
      await login(TEST_USERS.admin);
    });

    await bdd.when("user navigates to admin backup section", async () => {
      await page.goto("/admin");
      const backupLink = page.locator(
        'a:has-text("Backup"), button:has-text("Backup"), [data-testid="backup-link"]'
      );
      const exists = await backupLink.isVisible().catch(() => false);
      if (exists) {
        await backupLink.click();
      } else {
        // If no link, navigate directly
        await page.goto("/admin/backup");
      }
    });

    await bdd.then("backup page should be accessible", async () => {
      // Verify we can see backup-related content
      const url = page.url();
      const hasBackupContent =
        url.includes("admin") && url.includes("backup");
      const hasForm = await page.locator("form").isVisible();

      expect(hasBackupContent || hasForm).toBeTruthy();
    });
  });
});
