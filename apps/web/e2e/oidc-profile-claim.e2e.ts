/**
 * OIDC Profile Claiming - User Flow Tests
 *
 * Tests the profile claiming workflow for OIDC users.
 *
 * Note: Most OIDC-specific features (modal search, profile claiming, skip functionality)
 * require OIDC users with PENDING status. These tests use regular (non-OIDC) users,
 * so we can only verify that OIDC features are NOT shown to regular users.
 *
 * To test full OIDC profile claiming:
 * - Configure an OIDC provider in test environment
 * - Create test users authenticated via OIDC with PENDING status
 */

import { test, expect } from "./fixtures";

test.describe("OIDC Profile Claiming", () => {
  test.describe("Non-OIDC User Behavior", () => {
    test("profile claim modal does not appear for regular authenticated users", async ({
      page,
    }) => {
      // For regular (non-OIDC) users, the profile claim modal should not appear
      await page.goto("/dashboard");
      await page.waitForTimeout(1000);

      // Check for profile claim modal specifically
      const profileClaimModal = page
        .getByRole("dialog")
        .filter({ hasText: /claim your profile|link your account/i });
      const isVisible = await profileClaimModal.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test("settings profile page loads for authenticated users", async ({
      page,
    }) => {
      await page.goto("/settings/profile");
      await page.waitForTimeout(500);

      // Page should load with main content
      await expect(page.locator("main")).toBeVisible();

      // Non-OIDC users should not see the "Family Tree Profile" section
      // which is only shown for OIDC users who need to claim their profile
      const familyTreeSection = page.locator('text="Family Tree Profile"');
      const hasSection = await familyTreeSection.isVisible().catch(() => false);

      // For regular (non-OIDC) test users, this section should not appear
      expect(hasSection).toBe(false);
    });
  });
});
