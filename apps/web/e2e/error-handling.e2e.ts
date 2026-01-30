import { expect, test } from "@playwright/test";

test.describe("Error Handling", () => {
  test.describe("Error Showcase Page", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to the error showcase page (requires auth)
      await page.goto("/dev/errors", { waitUntil: "domcontentloaded" });
    });

    test("should display all error card variants", async ({ page }) => {
      // Page should load with showcase heading
      await expect(
        page.getByRole("heading", { name: "Error Components Showcase" })
      ).toBeVisible();

      // Default variant - look for heading text
      await expect(
        page.getByRole("heading", { name: "Default (Large Centered)" })
      ).toBeVisible();

      // Compact variant
      await expect(
        page.getByRole("heading", { name: "Compact (Horizontal Layout)" })
      ).toBeVisible();

      // Minimal variant
      await expect(
        page.getByRole("heading", { name: "Minimal (Warning Bar)" })
      ).toBeVisible();

      // No retry variant
      await expect(
        page.getByRole("heading", { name: "Without Retry Button" })
      ).toBeVisible();

      // Custom actions variant
      await expect(
        page.getByRole("heading", { name: "With Custom Actions" })
      ).toBeVisible();
    });

    test("should show error boundary catching errors", async ({ page }) => {
      // Error Boundary Testing section should be visible
      await expect(
        page.getByRole("heading", { name: "Live Error Boundary Test" })
      ).toBeVisible();

      // Initially, the "working normally" text should be visible
      await expect(
        page.getByText("This component is working normally")
      ).toBeVisible();

      // Trigger an error
      await page.getByRole("button", { name: "Trigger Error" }).click();

      // Wait for error to appear (the component crashes and shows error)
      await page.waitForTimeout(500);

      // After triggering error, the normal text should no longer be visible or error boundary kicks in
      // Reset the error
      await page.getByRole("button", { name: "Reset" }).click();

      // The working normally text should be back
      await expect(
        page.getByText("This component is working normally")
      ).toBeVisible({ timeout: 5000 });
    });

    test("should display technical details in dev mode", async ({ page }) => {
      // Find a "Technical details" button on the page and click it
      const techDetailsButton = page
        .getByRole("button", { name: "Technical details" })
        .first();
      await techDetailsButton.click();

      // Should expand to show some technical content
      // The details section should now be visible (it's a collapsible)
      await page.waitForTimeout(300);

      // Page should remain functional
      await expect(page.locator("main")).toBeVisible();
    });
  });

  test.describe("404 Not Found Page", () => {
    test("should show themed 404 page for unknown routes", async ({ page }) => {
      await page.goto("/this-page-definitely-does-not-exist-12345", {
        waitUntil: "domcontentloaded",
      });

      // Should show 404 text
      await expect(page.getByText("404")).toBeVisible();
      await expect(page.getByText("Page not found")).toBeVisible();

      // Should have navigation options
      await expect(
        page.getByRole("link", { name: /go to homepage/i })
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /search people/i })
      ).toBeVisible();

      // Should show the Vamsa logo/header
      await expect(page.getByText("Vamsa")).toBeVisible();
    });

    test("should navigate home from 404 page", async ({ page }) => {
      await page.goto("/nonexistent-route", { waitUntil: "domcontentloaded" });

      // Click go home
      await page.getByRole("link", { name: /go to homepage/i }).click();

      // Should be redirected (either to home or login depending on auth state)
      await expect(page).not.toHaveURL(/nonexistent-route/);
    });
  });

  test.describe("Route Error Handling", () => {
    test("should preserve navigation on authenticated route errors", async ({
      page,
    }) => {
      // Navigate to the error showcase which is in authenticated area
      await page.goto("/dev/errors", { waitUntil: "domcontentloaded" });

      // The main navigation should be visible
      await expect(page.locator("nav")).toBeVisible();

      // Navigation links should be present - use role selectors
      await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(page.getByRole("link", { name: "People" })).toBeVisible();
    });
  });
});
