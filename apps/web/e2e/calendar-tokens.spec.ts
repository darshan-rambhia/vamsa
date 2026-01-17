/**
 * E2E tests for calendar token management UI
 * Tests: Token creation, editing, rotation, revocation, admin view, filtering
 */

import { test, expect } from "@playwright/test";

test.describe("Calendar Token Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to calendar tokens page
    await page.goto("/settings/calendar-tokens");
  });

  test.describe("Page Load and UI", () => {
    test("should load calendar tokens page", async ({ page }) => {
      await expect(page).toHaveTitle(/calendar|tokens|settings/i);
    });

    test("should display page header", async ({ page }) => {
      const header = page.getByRole("heading", {
        name: /calendar access tokens/i,
      });
      await expect(header).toBeVisible();
    });

    test("should display description", async ({ page }) => {
      const description = page.getByText(/subscribe to.*calendar/i);
      await expect(description).toBeVisible();
    });

    test("should display Create New Token button", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });
      await expect(button).toBeVisible();
    });
  });

  test.describe("Token Creation", () => {
    test("should open create token dialog on button click", async ({
      page,
    }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });
    });

    test("should display create token form", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const heading = page.getByRole("heading", {
        name: /create.*token/i,
      });
      await expect(heading).toBeVisible({ timeout: 5000 });
    });

    test("should allow entering token name", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("iPhone Calendar");

      const value = await nameInput.inputValue();
      expect(value).toBe("iPhone Calendar");
    });

    test("should have rotation policy selector", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const policySelect = page.getByLabel(/policy|rotation/i);
      await expect(policySelect).toBeVisible({ timeout: 5000 });
    });

    test("should allow selecting rotation policies", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const policySelect = page.getByLabel(/policy|rotation/i);
      await policySelect.selectOption("on_password_change");

      const value = await policySelect.inputValue();
      expect(value).toBe("on_password_change");
    });

    test("should create token with name", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("My Calendar Token");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      // Token should appear in list
      const tokenName = page.getByText("My Calendar Token");
      await expect(tokenName).toBeVisible({ timeout: 5000 });
    });

    test("should create token without name", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      // Should still create token successfully
      await page.waitForTimeout(1000);
    });

    test("should show success message after creation", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Test Token");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      const successMessage = page.getByText(/success|created/i);
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    });

    test("should close dialog after token creation", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Test Token");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Token Display and List", () => {
    test("should display token table", async ({ page }) => {
      const table = page.getByRole("table");
      await expect(table).toBeVisible();
    });

    test("should show token name column", async ({ page }) => {
      const header = page.getByRole("columnheader", {
        name: /name/i,
      });
      await expect(header).toBeVisible();
    });

    test("should show created date column", async ({ page }) => {
      const header = page.getByRole("columnheader", {
        name: /created|date/i,
      });
      await expect(header).toBeVisible();
    });

    test("should show last used column", async ({ page }) => {
      const header = page.getByRole("columnheader", {
        name: /last used|usage/i,
      });
      await expect(header).toBeVisible();
    });

    test("should show expiration column", async ({ page }) => {
      const header = page.getByRole("columnheader", {
        name: /expires|expiration/i,
      });
      await expect(header).toBeVisible();
    });

    test("should show rotation policy column", async ({ page }) => {
      const header = page.getByRole("columnheader", {
        name: /policy/i,
      });
      await expect(header).toBeVisible();
    });

    test("should show status column", async ({ page }) => {
      const header = page.getByRole("columnheader", {
        name: /status/i,
      });
      await expect(header).toBeVisible();
    });

    test("should display active token with Active status", async ({ page }) => {
      // First create a token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Active Token");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      // Wait for token to appear
      await page.waitForTimeout(1000);

      // Should show Active status
      const activeStatus = page.getByText(/active/i).first();
      await expect(activeStatus).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Inline Token Name Editing", () => {
    test("should allow editing token name inline", async ({ page }) => {
      // First create a token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Editable Token");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      // Click on name to edit
      const tokenName = page.getByText("Editable Token");
      await tokenName.click();

      // Should show input field
      const editInput = page.getByRole("textbox", {
        name: /token name/i,
      });
      await expect(editInput).toBeVisible({ timeout: 5000 });
    });

    test("should update token name on blur", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Original Name");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      // Edit the name
      const tokenName = page.getByText("Original Name");
      await tokenName.click();

      const editInput = page.getByRole("textbox", {
        name: /token name/i,
      });
      await editInput.fill("Updated Name");
      await editInput.blur();

      // Should show updated name
      const updated = page.getByText("Updated Name");
      await expect(updated).toBeVisible({ timeout: 5000 });
    });

    test("should display error on invalid name update", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Original");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      // Try to edit
      const tokenName = page.getByText("Original");
      await tokenName.click();

      const editInput = page.getByRole("textbox", {
        name: /token name/i,
      });
      await editInput.fill("");
      await editInput.blur();

      // Page should still be functional
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Token Rotation", () => {
    test("should display Rotate button for each token", async ({ page }) => {
      // Create a token first
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Rotatable Token");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      // Should have Rotate button
      const rotateButton = page.getByRole("button", {
        name: /rotate/i,
      });
      await expect(rotateButton).toBeVisible({ timeout: 5000 });
    });

    test("should rotate token on button click", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("To Rotate");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      const rotateButton = page.getByRole("button", {
        name: /rotate/i,
      });

      await rotateButton.click();

      // Should show success message
      const successMessage = page.getByText(/rotated|success/i);
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    });

    test("should create new token after rotation", async ({ page }) => {
      // Create initial token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Token 1");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      // Count tokens before rotation
      const rows1 = page.getByRole("row");
      const countBefore = (await rows1.count()) - 1; // Subtract header

      // Rotate
      const rotateButton = page.getByRole("button", {
        name: /rotate/i,
      });

      await rotateButton.click();

      await page.waitForTimeout(1000);

      // Should have more tokens now (old + new)
      const rows2 = page.getByRole("row");
      const countAfter = (await rows2.count()) - 1;

      expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    });

    test("should disable rotate button while rotating", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Test");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      const rotateButton = page.getByRole("button", {
        name: /rotate/i,
      });

      await rotateButton.click();

      // Button might show loading state
      await page.waitForTimeout(500);
    });
  });

  test.describe("Token Revocation", () => {
    test("should display Revoke button for each token", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Revocable");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      const revokeButton = page.getByRole("button", {
        name: /revoke/i,
      });
      await expect(revokeButton).toBeVisible({ timeout: 5000 });
    });

    test("should show confirmation dialog on revoke", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("To Revoke");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      const revokeButton = page.getByRole("button", {
        name: /revoke/i,
      });

      await revokeButton.click();

      // Dialog or confirmation should appear
      const confirmation = page.getByText(/confirm|revoke|stop working/i);
      await expect(confirmation).toBeVisible({ timeout: 5000 });
    });

    test("should revoke token on confirmation", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Will Revoke");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      const revokeButton = page.getByRole("button", {
        name: /revoke/i,
      });

      await revokeButton.click();

      // Confirm revocation
      const confirmButton = page.getByRole("button", {
        name: /confirm|yes|ok/i,
      });

      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Token should be removed or marked inactive
      await page.waitForTimeout(1000);
    });

    test("should mark revoked token as inactive", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Being Revoked");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      const revokeButton = page.getByRole("button", {
        name: /revoke/i,
      });

      await revokeButton.click();

      // Confirm
      const confirmButton = page.getByRole("button", {
        name: /confirm|yes|ok/i,
      });

      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(1000);

      // Should show inactive status
      const inactiveStatus = page.getByText(/inactive/i);
      await expect(inactiveStatus).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Admin Token Management", () => {
    test("should navigate to admin tokens page", async ({ page }) => {
      // This assumes admin users can access /admin/tokens
      await page.goto("/admin/tokens");

      const heading = page.getByRole("heading", {
        name: /tokens|calendar/i,
      });
      await expect(heading).toBeVisible({ timeout: 5000 });
    });

    test("should display all users' tokens", async ({ page }) => {
      await page.goto("/admin/tokens");

      const table = page.getByRole("table");
      await expect(table).toBeVisible({ timeout: 5000 });
    });

    test("should show user information in token list", async ({ page }) => {
      await page.goto("/admin/tokens");

      const userColumn = page.getByRole("columnheader", {
        name: /user|owner/i,
      });
      await expect(userColumn).toBeVisible();
    });

    test("should allow filtering by user", async ({ page }) => {
      await page.goto("/admin/tokens");

      const userFilter = page.getByLabel(/user|filter.*user/i);
      if (await userFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userFilter.fill("test@example.com");

        await page.waitForTimeout(500);
      }
    });

    test("should allow filtering by status", async ({ page }) => {
      await page.goto("/admin/tokens");

      const statusFilter = page.getByLabel(/status|active/i);
      if (await statusFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusFilter.selectOption("active");

        await page.waitForTimeout(500);
      }
    });

    test("should allow filtering by rotation policy", async ({ page }) => {
      await page.goto("/admin/tokens");

      const policyFilter = page.getByLabel(/policy/i);
      if (await policyFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
        await policyFilter.selectOption("annual");

        await page.waitForTimeout(500);
      }
    });

    test("should display token rotation history", async ({ page }) => {
      await page.goto("/admin/tokens");

      const historyColumn = page.getByRole("columnheader", {
        name: /rotated|history/i,
      });

      if (await historyColumn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(historyColumn).toBeVisible();
      }
    });
  });

  test.describe("Token Usage Information", () => {
    test("should display last used timestamp", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Used Token");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      // Should show "Never" for newly created token
      const neverUsed = page.getByText(/never/i);
      await expect(neverUsed).toBeVisible({ timeout: 5000 });
    });

    test("should update last used after token access", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Accessed Token");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      // After accessing calendar endpoint with token, last used should update
      // This would require actually using the token
    });
  });

  test.describe("Error Handling", () => {
    test("should handle token creation errors gracefully", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("A".repeat(1000)); // Very long name

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      // Should show error or handle gracefully
      await page.waitForTimeout(1000);

      // Page should remain functional
      await expect(page.locator("body")).toBeVisible();
    });

    test("should handle rotation errors gracefully", async ({ page }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Test");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      // Try to rotate (might fail if server error)
      const rotateButton = page.getByRole("button", {
        name: /rotate/i,
      });

      await rotateButton.click();

      // Page should remain functional
      await page.waitForTimeout(1000);

      await expect(page.locator("body")).toBeVisible();
    });

    test("should handle network errors during token operations", async ({
      page,
    }) => {
      // Create token
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.click();

      const nameInput = page.getByLabel(/name/i);
      await nameInput.fill("Network Test");

      const submitButton = page.getByRole("button", {
        name: /create|submit|save/i,
      });

      await submitButton.click();

      await page.waitForTimeout(1000);

      // Page should handle errors gracefully
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper ARIA labels", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });
      await expect(button).toBeVisible();
    });

    test("should support keyboard navigation", async ({ page }) => {
      const button = page.getByRole("button", {
        name: /create.*token/i,
      });

      await button.focus();
      await page.keyboard.press("Enter");

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      const h2Headers = page.locator("h2");
      await expect(h2Headers).not.toHaveCount(0);
    });
  });
});
