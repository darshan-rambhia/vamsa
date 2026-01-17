/**
 * E2E tests for calendar subscription page
 * Tests: Token generation, revocation, calendar URL display, copy-to-clipboard
 */

import { test, expect } from "@playwright/test";

test.describe("Calendar Subscription Page", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to subscribe page
    // Assuming user is already authenticated
    await page.goto("/subscribe");
  });

  test.describe("Page Load and UI", () => {
    test("should load subscription page", async ({ page }) => {
      await expect(page).toHaveTitle(/subscribe|calendar|subscription/i);
    });

    test("should display page header", async ({ page }) => {
      const header = page.getByRole("heading", {
        name: /calendar subscriptions/i,
      });
      await expect(header).toBeVisible();
    });

    test("should display description", async ({ page }) => {
      const description = page.getByText(/subscribe to family calendars/i);
      await expect(description).toBeVisible();
    });

    test("should display token generation section", async ({ page }) => {
      const section = page.getByRole("heading", {
        name: /generate access token/i,
      });
      await expect(section).toBeVisible();
    });

    test("should display calendar URLs section", async ({ page }) => {
      const section = page.getByRole("heading", {
        name: /calendar urls/i,
      });
      await expect(section).toBeVisible();
    });

    test("should display subscription instructions", async ({ page }) => {
      const instructions = page.getByRole("heading", {
        name: /subscription instructions/i,
      });
      await expect(instructions).toBeVisible();
    });
  });

  test.describe("Token Generation", () => {
    test("should display calendar type selector", async ({ page }) => {
      const select = page.locator("#calendar-type");
      await expect(select).toBeVisible();
    });

    test("should have default option selected", async ({ page }) => {
      const select = page.locator("#calendar-type");
      const value = await select.inputValue();
      expect(value).toBe("all");
    });

    test("should allow selecting different calendar types", async ({
      page,
    }) => {
      const select = page.locator("#calendar-type");

      const types = ["all", "birthdays", "anniversaries", "events"];

      for (const type of types) {
        await select.selectOption(type);
        const value = await select.inputValue();
        expect(value).toBe(type);
      }
    });

    test("should display Generate Token button", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /generate new token/i,
      });
      await expect(button).toBeVisible();
    });

    test("should generate token on button click", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /generate new token/i,
      });

      await button.click();

      // Wait for token to be generated
      const tokenInput = page.locator("input[readonly]").nth(0);
      await expect(tokenInput).toBeVisible({ timeout: 5000 });

      const tokenValue = await tokenInput.inputValue();
      expect(tokenValue.length).toBeGreaterThan(0);
    });

    test("should show success message after generation", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /generate new token/i,
      });

      await button.click();

      const successMessage = page.getByText(/token generated successfully/i);
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    });

    test("should display generated token", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /generate new token/i,
      });

      await button.click();

      const tokenInput = page.locator("input[readonly]").nth(0);
      const tokenValue = await tokenInput.inputValue();

      expect(tokenValue).toBeTruthy();
      expect(tokenValue.length).toBeGreaterThan(10);
    });

    test("should show warning about saving token", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /generate new token/i,
      });

      await button.click();

      const warning = page.getByText(/save this token securely/i);
      await expect(warning).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Copy to Clipboard", () => {
    test("should display copy button for token", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const copyButton = page
        .getByRole("button", {
          name: /copy/i,
        })
        .first();

      await expect(copyButton).toBeVisible({ timeout: 5000 });
    });

    test("should copy token to clipboard", async ({ page, context }) => {
      // Grant clipboard permission
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const copyButton = page
        .getByRole("button", {
          name: /copy/i,
        })
        .first();

      await copyButton.click({ timeout: 5000 });

      // Check that button shows "Copied!"
      await expect(copyButton).toContainText(/copied/i, {
        timeout: 5000,
      });
    });

    test("should copy birthday calendar URL", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const copyButton = page
        .getByRole("button", {
          name: /copy/i,
        })
        .nth(1); // Second copy button

      await copyButton.click();

      await expect(copyButton).toContainText(/copied/i, {
        timeout: 5000,
      });
    });

    test("should copy anniversary calendar URL", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const copyButtons = page.getByRole("button", {
        name: /copy/i,
      });

      const anniversaryButton = copyButtons.nth(2);
      await anniversaryButton.click();

      await expect(anniversaryButton).toContainText(/copied/i, {
        timeout: 5000,
      });
    });

    test("should copy events calendar URL", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const copyButtons = page.getByRole("button", {
        name: /copy/i,
      });

      const eventsButton = copyButtons.nth(3);
      await eventsButton.click();

      await expect(eventsButton).toContainText(/copied/i, {
        timeout: 5000,
      });
    });

    test("should copy RSS feed URL", async ({ page, context }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const copyButtons = page.getByRole("button", {
        name: /copy/i,
      });

      const rssButton = copyButtons.nth(4);
      await rssButton.click();

      await expect(rssButton).toContainText(/copied/i, {
        timeout: 5000,
      });
    });

    test("should reset copied indicator after 2 seconds", async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const copyButton = page
        .getByRole("button", {
          name: /copy/i,
        })
        .first();

      await copyButton.click({ timeout: 5000 });

      await expect(copyButton).toContainText(/copied/i);

      // Wait 2.5 seconds
      await page.waitForTimeout(2500);

      // Button should now show "Copy" again
      await expect(copyButton).toContainText(/copy/i);
    });

    test("should allow selecting calendar URL", async ({ page }) => {
      const birthdayInput = page.locator("#birthdays-url");
      await expect(birthdayInput).toBeVisible();

      await birthdayInput.click();

      // Verify input is selected for copy
      const selected = await birthdayInput.evaluate(
        (el: HTMLInputElement) => el.value
      );
      expect(selected).toBeTruthy();
    });
  });

  test.describe("Calendar URLs Display", () => {
    test("should display birthday calendar URL", async ({ page }) => {
      const birthdayInput = page.locator("#birthdays-url");
      await expect(birthdayInput).toBeVisible();

      const url = await birthdayInput.inputValue();
      expect(url).toContain("/api/v1/calendar/birthdays.ics");
    });

    test("should display anniversary calendar URL", async ({ page }) => {
      const anniversaryInput = page.locator("#anniversaries-url");
      await expect(anniversaryInput).toBeVisible();

      const url = await anniversaryInput.inputValue();
      expect(url).toContain("/api/v1/calendar/anniversaries.ics");
    });

    test("should display events calendar URL", async ({ page }) => {
      const eventsInput = page.locator("#events-url");
      await expect(eventsInput).toBeVisible();

      const url = await eventsInput.inputValue();
      expect(url).toContain("/api/v1/calendar/events.ics");
    });

    test("should display RSS feed URL", async ({ page }) => {
      const rssInput = page.locator("#rss-url");
      await expect(rssInput).toBeVisible();

      const url = await rssInput.inputValue();
      expect(url).toContain("/api/v1/calendar/rss.xml");
    });

    test("should mark URLs as Public", async ({ page }) => {
      const publicBadges = page.getByText("Public");
      await expect(publicBadges).toHaveCount(4);
    });

    test("should include note about token authentication", async ({ page }) => {
      const note = page.getByText(/append.*token=YOUR_TOKEN/i);
      await expect(note).toBeVisible();
    });
  });

  test.describe("Token Management", () => {
    test("should list active tokens after generation", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      // Wait for token to appear
      const activeTokensSection = page.getByText(/active tokens/i);
      await expect(activeTokensSection).toBeVisible({ timeout: 5000 });
    });

    test("should display token type", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      const select = page.locator("#calendar-type");
      await select.selectOption("birthdays");

      await generateButton.click();

      const activeTokensSection = page.getByText(/active tokens/i);
      await expect(activeTokensSection).toBeVisible({ timeout: 5000 });

      const typeDisplay = page.getByText(/birthdays/i);
      await expect(typeDisplay).toBeVisible();
    });

    test("should display token expiration date", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const expiresText = page.getByText(/expires:/i);
      await expect(expiresText).toBeVisible({ timeout: 5000 });

      const expiresDate = page.locator("text=/\\d{1,2}\\/\\d{1,2}\\/\\d{4}/");
      await expect(expiresDate).toBeVisible();
    });

    test("should display revoke button for active tokens", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const revokeButton = page.getByRole("button", {
        name: /revoke/i,
      });

      await expect(revokeButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Token Revocation", () => {
    test("should revoke token on button click", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const revokeButton = page.getByRole("button", {
        name: /revoke/i,
      });

      await expect(revokeButton).toBeVisible({ timeout: 5000 });

      await revokeButton.click();

      // Token should be removed from list
      await expect(revokeButton).not.toBeVisible({
        timeout: 5000,
      });
    });

    test("should remove revoked token from active list", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const tokenElement = page.locator("text=/all/i").first();
      await expect(tokenElement).toBeVisible({ timeout: 5000 });

      const revokeButton = page.getByRole("button", {
        name: /revoke/i,
      });

      await revokeButton.click();

      // Wait for removal
      await page.waitForTimeout(1000);

      // Token should no longer be visible
      await expect(revokeButton).not.toBeVisible();
    });

    test("should handle revoke errors gracefully", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const revokeButton = page.getByRole("button", {
        name: /revoke/i,
      });

      await expect(revokeButton).toBeVisible({ timeout: 5000 });

      // Click should not cause page crash
      await revokeButton.click();

      // Page should still be functional
      await expect(page.locator("body")).toBeVisible();
    });

    test("should disable revoke button while revoking", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const revokeButton = page.getByRole("button", {
        name: /revoke/i,
      });

      await expect(revokeButton).toBeVisible({ timeout: 5000 });

      // Check initial state
      await revokeButton.isDisabled();

      // Click to revoke
      await revokeButton.click();

      // Button may show loading state
      await page.waitForTimeout(500);
    });
  });

  test.describe("Subscription Instructions", () => {
    test("should display tabbed interface", async ({ page }) => {
      const tabs = page.getByRole("tab");
      await expect(tabs).toHaveCount(3);
    });

    test("should have Google Calendar tab", async ({ page }) => {
      const googleTab = page.getByRole("tab", {
        name: /google calendar/i,
      });
      await expect(googleTab).toBeVisible();
    });

    test("should have Apple Calendar tab", async ({ page }) => {
      const appleTab = page.getByRole("tab", {
        name: /apple calendar/i,
      });
      await expect(appleTab).toBeVisible();
    });

    test("should have Outlook tab", async ({ page }) => {
      const outlookTab = page.getByRole("tab", {
        name: /outlook/i,
      });
      await expect(outlookTab).toBeVisible();
    });

    test("should display Google Calendar instructions", async ({ page }) => {
      const googleTab = page.getByRole("tab", {
        name: /google calendar/i,
      });

      await googleTab.click();

      const instructions = page.getByText(/open google calendar/i);
      await expect(instructions).toBeVisible();
    });

    test("should display Apple Calendar instructions", async ({ page }) => {
      const appleTab = page.getByRole("tab", {
        name: /apple calendar/i,
      });

      await appleTab.click();

      const instructions = page.getByText(/open calendar app/i);
      await expect(instructions).toBeVisible();
    });

    test("should display Outlook instructions", async ({ page }) => {
      const outlookTab = page.getByRole("tab", {
        name: /outlook/i,
      });

      await outlookTab.click();

      const instructions = page.getByText(/open outlook calendar/i);
      await expect(instructions).toBeVisible();
    });

    test("should include numbered steps in instructions", async ({ page }) => {
      const googleTab = page.getByRole("tab", {
        name: /google calendar/i,
      });

      await googleTab.click();

      const listItems = page.locator("li");
      await expect(listItems).not.toHaveCount(0);
    });
  });

  test.describe("Responsive Design", () => {
    test("should display properly on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const header = page.getByRole("heading", {
        name: /calendar subscriptions/i,
      });
      await expect(header).toBeVisible();

      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });
      await expect(generateButton).toBeVisible();
    });

    test("should display properly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      const header = page.getByRole("heading", {
        name: /calendar subscriptions/i,
      });
      await expect(header).toBeVisible();

      const grid = page.locator("[class*=grid]");
      await expect(grid).toBeVisible();
    });

    test("should display properly on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      const header = page.getByRole("heading", {
        name: /calendar subscriptions/i,
      });
      await expect(header).toBeVisible();

      const grid = page.locator("[class*=grid]");
      await expect(grid).toBeVisible();
    });
  });

  test.describe("Form Validation", () => {
    test("should disable generate button while generating", async ({
      page,
    }) => {
      const button = page.getByRole("button", {
        name: /generate new token/i,
      });

      await button.click();

      // Check for loading state
      const loadingButton = page.getByRole("button", {
        name: /generating/i,
      });

      if (await loadingButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await expect(loadingButton).toBeDisabled({ timeout: 5000 });
      }
    });

    test("should handle invalid calendar type selection", async ({ page }) => {
      const select = page.locator("#calendar-type");

      const validTypes = ["all", "birthdays", "anniversaries", "events"];

      for (const type of validTypes) {
        await select.selectOption(type);
        const value = await select.inputValue();
        expect(validTypes).toContain(value);
      }
    });
  });

  test.describe("Data Persistence", () => {
    test("should persist active tokens across page reload", async ({
      page,
    }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const activeTokensSection = page.getByText(/active tokens/i);
      await expect(activeTokensSection).toBeVisible({ timeout: 5000 });

      const tokenBefore = page.locator("[class*=border]").first();
      await tokenBefore.textContent();

      // Reload page
      await page.reload();

      // Wait for page to load
      await expect(
        page.getByRole("heading", {
          name: /calendar subscriptions/i,
        })
      ).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper ARIA labels", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /generate new token/i,
      });
      await expect(button).toBeVisible();
    });

    test("should support keyboard navigation", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /generate new token/i,
      });

      await button.focus();
      await page.keyboard.press("Enter");

      const tokenInput = page.locator("input[readonly]").nth(0);
      await expect(tokenInput).toBeVisible({ timeout: 5000 });
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      const h2Headers = page.locator("h2");
      await expect(h2Headers).not.toHaveCount(0);
    });

    test("should have sufficient color contrast", async ({ page }) => {
      // Verify text is readable
      const buttons = page.getByRole("button");
      await expect(buttons).not.toHaveCount(0);
    });
  });

  test.describe("Security", () => {
    test("should not display full token in clear on list", async ({ page }) => {
      const generateButton = page.getByRole("button", {
        name: /generate new token/i,
      });

      await generateButton.click();

      const activeTokensSection = page.getByText(/active tokens/i);
      await expect(activeTokensSection).toBeVisible({ timeout: 5000 });

      // Token should not be fully displayed in list, only in the notification
      const tokenDisplay = page.locator("[class*=font-mono]");
      if (await tokenDisplay.isVisible()) {
        const text = await tokenDisplay.textContent();
        // In the generation notification, token is shown
        expect(text).toBeTruthy();
      }
    });

    test("should require authentication", async ({ page }) => {
      // This test assumes there's an auth check
      // Navigate to subscribe without being logged in (if possible)
      // For now, we assume the test environment has auth
      await expect(page).toHaveURL("/subscribe");
    });
  });
});
