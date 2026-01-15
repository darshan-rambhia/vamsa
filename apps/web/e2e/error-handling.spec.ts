import { test, expect } from "@playwright/test";

test.describe("Error Handling", () => {
  test.describe("Error Showcase Page", () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to the error showcase page (requires auth)
      await page.goto("/dev/errors");
    });

    test("should display all error card variants", async ({ page }) => {
      // Default variant
      await expect(page.getByTestId("error-card-default")).toBeVisible();

      // Compact variant
      await expect(page.getByTestId("error-card-compact")).toBeVisible();

      // Minimal variant
      await expect(page.getByTestId("error-card-minimal")).toBeVisible();

      // No retry variant
      await expect(page.getByTestId("error-card-no-retry")).toBeVisible();

      // Custom actions variant
      await expect(page.getByTestId("error-card-custom-actions")).toBeVisible();
    });

    test("should show error boundary catching errors", async ({ page }) => {
      // Initially, the healthy component should be visible
      await expect(page.getByTestId("healthy-component")).toBeVisible();

      // Trigger an error
      await page.getByTestId("trigger-error-button").click();

      // The healthy component should no longer be visible
      await expect(page.getByTestId("healthy-component")).not.toBeVisible();

      // An error card should appear in the boundary container
      const errorBoundaryContainer = page.getByTestId("error-boundary-container");
      await expect(
        errorBoundaryContainer.getByText("This section encountered an error")
      ).toBeVisible();

      // Reset the error
      await page.getByTestId("reset-error-button").click();

      // The healthy component should be back
      await expect(page.getByTestId("healthy-component")).toBeVisible();
    });

    test("should display technical details in dev mode", async ({ page }) => {
      // Find the default error card and look for technical details toggle
      const errorCard = page.getByTestId("error-card-default");

      // Click to show technical details
      await errorCard.getByText("Technical details").click();

      // Should show the error message
      await expect(
        errorCard.getByText("Sample error message for testing")
      ).toBeVisible();
    });
  });

  test.describe("404 Not Found Page", () => {
    test("should show themed 404 page for unknown routes", async ({ page }) => {
      await page.goto("/this-page-definitely-does-not-exist-12345");

      // Should show 404 text
      await expect(page.getByText("404")).toBeVisible();
      await expect(page.getByText("Page not found")).toBeVisible();

      // Should have navigation options
      await expect(page.getByRole("link", { name: /go to homepage/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /search people/i })).toBeVisible();

      // Should show the Vamsa logo/header
      await expect(page.getByText("Vamsa")).toBeVisible();
    });

    test("should navigate home from 404 page", async ({ page }) => {
      await page.goto("/nonexistent-route");

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
      await page.goto("/dev/errors");

      // The main navigation should be visible
      await expect(page.getByTestId("main-nav")).toBeVisible();

      // Navigation links should be present
      await expect(page.getByTestId("nav-dashboard")).toBeVisible();
      await expect(page.getByTestId("nav-people")).toBeVisible();
    });
  });
});
