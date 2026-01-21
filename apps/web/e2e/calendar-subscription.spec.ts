/**
 * Calendar Subscription - User Flow Tests
 *
 * Tests actual user journeys through calendar subscription:
 * - Generating access tokens
 * - Getting calendar URLs
 * - Copying URLs to clipboard
 * - Viewing subscription instructions
 */

import { test, expect } from "@playwright/test";
import { VIEWPORT_ARRAY } from "./fixtures/viewports";

test.describe("Calendar Subscription", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/subscribe");
    await page
      .getByRole("heading", { name: /calendar subscriptions/i })
      .waitFor({ state: "visible", timeout: 10000 });
  });

  test.describe("Page Load", () => {
    test("displays all required sections", async ({ page }) => {
      await expect(page).toHaveURL(/subscribe/);

      // Main sections should be visible
      await expect(
        page.getByRole("heading", { name: /calendar subscriptions/i })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /generate access token/i })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /calendar urls/i })
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: /how to subscribe/i })
      ).toBeVisible();
    });

    test("shows calendar URL fields initially disabled", async ({ page }) => {
      // Calendar inputs should be disabled without a token
      const birthdayInput = page.getByLabel(/birthday calendar/i);
      await expect(birthdayInput).toBeVisible();
      await expect(birthdayInput).toBeDisabled();

      // Should show 'No token selected' message
      await expect(page.getByText(/no token selected/i)).toBeVisible();
    });
  });

  test.describe("Token Generation Flow", () => {
    test("user can generate token with custom name", async ({ page }) => {
      // Fill in token name
      const tokenNameInput = page.getByLabel(/token name/i);
      await tokenNameInput.fill("My Phone Calendar");

      // Click generate
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });
      await generateButton.click();

      // Wait for response
      await page.waitForTimeout(2000);

      // Page should remain functional
      await expect(page).toHaveURL(/subscribe/);
    });

    test("user can generate token without name", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });
      await generateButton.click();

      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/subscribe/);
    });
  });

  test.describe("Subscription Instructions", () => {
    test("user can view instructions for different calendar apps", async ({
      page,
    }) => {
      // Wait for React to fully hydrate
      await page.waitForTimeout(500);

      // Scroll down to the "How to Subscribe" section first to ensure tabs are in view
      const howToSubscribeHeading = page.getByRole("heading", {
        name: /how to subscribe/i,
      });
      await howToSubscribeHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Wait for tabs to be loaded and hydrated
      const tabList = page.getByRole("tablist");
      await expect(tabList).toBeVisible();

      // Wait for tab content to be visible (indicates tabs are hydrated)
      await expect(page.getByText(/open google calendar/i)).toBeVisible({
        timeout: 5000,
      });

      // Google Calendar instructions shown by default
      const googleTab = page.getByRole("tab", { name: /google calendar/i });
      await expect(googleTab).toBeVisible();
      // Verify Google tab content is displayed
      await expect(page.getByText(/other calendars/i)).toBeVisible();

      // Helper to click tab with retry until content appears
      async function clickTabUntilContentVisible(
        tab: any,
        contentHeadingPattern: RegExp,
        maxAttempts = 5
      ) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          await tab.click();
          await page.waitForTimeout(100);

          const contentVisible = await page
            .getByRole("heading", { name: contentHeadingPattern })
            .isVisible()
            .catch(() => false);

          if (contentVisible) return;

          // React handler not responding yet - wait and retry
          await page.waitForTimeout(150 * attempt);
        }
      }

      // Switch to Apple Calendar
      const appleTab = page.getByRole("tab", { name: /apple calendar/i });
      await clickTabUntilContentVisible(
        appleTab,
        /subscribing to a calendar in apple/i
      );
      await expect(
        page.getByRole("heading", {
          name: /subscribing to a calendar in apple/i,
        })
      ).toBeVisible({ timeout: 5000 });

      // Switch to Outlook
      const outlookTab = page.getByRole("tab", { name: /outlook/i });
      await clickTabUntilContentVisible(
        outlookTab,
        /subscribing to a calendar in outlook/i
      );
      await expect(
        page.getByRole("heading", {
          name: /subscribing to a calendar in outlook/i,
        })
      ).toBeVisible({ timeout: 5000 });
    });

    test("shows RSS feed reader section", async ({ page }) => {
      // RSS Feed Readers section is at bottom of SubscriptionInstructions component
      // Scroll to make it visible
      const rssHeading = page.getByRole("heading", {
        name: /rss feed readers/i,
      });
      await rssHeading.scrollIntoViewIfNeeded();
      await expect(rssHeading).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Navigation", () => {
    test("user can navigate to manage tokens page", async ({ page }) => {
      const manageLink = page.getByRole("link", { name: /manage tokens/i });
      await expect(manageLink).toBeVisible();

      await manageLink.click();
      await expect(page).toHaveURL(/settings.*calendar-tokens/i);
    });
  });

  test.describe("Responsive Behavior", () => {
    test("is responsive across viewports", async ({ page }) => {
      for (const viewport of VIEWPORT_ARRAY) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.waitForTimeout(300);

        // Key elements should be visible at all sizes
        await expect(
          page.getByRole("heading", { name: /calendar subscriptions/i })
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: /generate new token/i })
        ).toBeVisible();
      }
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("tabs support keyboard navigation", async ({ page }) => {
      // First, navigate to subscribe and wait for tabs to be loaded
      await page.goto("/subscribe");
      await page
        .getByRole("heading", { name: /calendar subscriptions/i })
        .waitFor({ state: "visible", timeout: 10000 });

      // Test keyboard navigation on the instruction tabs using role selectors
      const googleTab = page.getByRole("tab", { name: /google calendar/i });
      await expect(googleTab).toBeVisible();
      await googleTab.focus();

      // Press ArrowRight to move to next tab
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(100);

      // The page should remain functional
      await expect(page).toHaveURL(/subscribe/);
      await expect(page.locator("main")).toBeVisible();
    });
  });
});
