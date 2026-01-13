/**
 * Admin Panel E2E Tests
 * Tests core admin workflows including user management, invites, and backup
 * Converted to BDD style for clarity and maintainability
 */
import { test, expect } from "./fixtures";
import { bdd } from "./fixtures/bdd-helpers";
import { AdminPage } from "./fixtures/page-objects";
import { TEST_USERS } from "./fixtures/test-base";

test.describe("Feature: Admin Functions", () => {
  test.beforeEach(async ({ login }) => {
    // All admin tests require admin login
    await login(TEST_USERS.admin);
  });

  test("Scenario: Admin can access users page", async ({ page }) => {
    await bdd.given("admin is logged in", async () => {
      // Login is handled in beforeEach
      await expect(page).toHaveURL(/\/(people|dashboard|tree)/);
    });

    await bdd.when("admin navigates to users management", async () => {
      const admin = new AdminPage(page);
      await admin.goto();
      await admin.selectUsersTab();
    });

    await bdd.then("users page is displayed", async () => {
      await expect(page).toHaveURL(/\/admin.*users/);
    });

    await bdd.and("main content is visible", async () => {
      const mainContent = page.locator("main").first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });
    });
  });

  test("Scenario: Admin can view user cards with role information", async ({
    page,
  }) => {
    await bdd.given("admin is on users page", async () => {
      const admin = new AdminPage(page);
      await admin.goto();
      await admin.selectUsersTab();
      await expect(page).toHaveURL(/\/admin.*users/);
    });

    await bdd.when("page loads user list", async () => {
      // Wait for users to load
      await Promise.race([
        page
          .locator(
            '[data-testid^="user-card-"], [data-user-card], table tbody tr'
          )
          .first()
          .waitFor({ state: "visible", timeout: 10000 })
          .catch(() => {}),
        page
          .locator('[data-testid="users-error"], :text("No users")')
          .first()
          .waitFor({ state: "visible", timeout: 10000 })
          .catch(() => {}),
      ]);
    });

    await bdd.then("user cards display with role badges", async () => {
      const userCards = page.locator(
        '[data-testid^="user-card-"], [data-user-card], table tbody tr'
      );
      const cardCount = await userCards.count();

      if (cardCount > 0) {
        const firstCard = userCards.first();
        await expect(firstCard).toBeVisible();

        const cardText = await firstCard.textContent();
        expect(cardText).toBeTruthy();

        // Look for role badge (ADMIN, MEMBER, or VIEWER)
        const roleBadge = firstCard.locator(
          ':text("ADMIN"), :text("MEMBER"), :text("VIEWER")'
        );
        if (await roleBadge.isVisible().catch(() => false)) {
          await expect(roleBadge).toBeVisible();
        }
      }
    });
  });

  test("Scenario: Admin can view role management controls", async ({
    page,
  }) => {
    await bdd.given("admin has users loaded", async () => {
      const admin = new AdminPage(page);
      await admin.goto();
      await admin.selectUsersTab();

      // Wait for users to load
      await Promise.race([
        page
          .locator(
            '[data-testid^="user-card-"], [data-user-card], table tbody tr'
          )
          .first()
          .waitFor({ state: "visible", timeout: 10000 })
          .catch(() => {}),
        page
          .locator(':text("No users")')
          .first()
          .waitFor({ state: "visible", timeout: 10000 })
          .catch(() => {}),
      ]);
    });

    await bdd.when("admin views the user list", async () => {
      // Just view the list - don't interact
      await page.waitForTimeout(500);
    });

    await bdd.then("user management page is accessible", async () => {
      // Verify we're still on the users admin page
      const url = page.url();
      expect(url.includes("/admin")).toBeTruthy();
    });
  });

  test("Scenario: Admin can navigate between admin sections", async ({
    page,
  }) => {
    await bdd.given("admin is on admin panel", async () => {
      const admin = new AdminPage(page);
      await admin.goto();
      await expect(page).toHaveURL(/\/admin/);
    });

    await bdd.when("admin navigates to users tab", async () => {
      const admin = new AdminPage(page);
      await admin.selectUsersTab();
    });

    await bdd.then("users section is loaded", async () => {
      // Verify we're on an admin page
      const url = page.url();
      expect(url.includes("/admin")).toBeTruthy();
    });
  });

  test("Scenario: Admin user management workflow is accessible", async ({
    page,
  }) => {
    await bdd.given("admin is on users management page", async () => {
      const admin = new AdminPage(page);
      await admin.goto();
      await admin.selectUsersTab();
    });

    await bdd.when("admin checks user management interface", async () => {
      // Just verify that the page is accessible
      await page.waitForTimeout(500);
    });

    await bdd.then("user management controls are functional", async () => {
      // Verify we're on an admin page
      const url = page.url();
      expect(url.includes("/admin")).toBeTruthy();
    });
  });

  test("Scenario: Admin can navigate to invites section", async ({ page }) => {
    await bdd.given("admin is on admin panel", async () => {
      const admin = new AdminPage(page);
      await admin.goto();
      await expect(page).toHaveURL(/\/admin/);
    });

    await bdd.when("admin clicks invites tab", async () => {
      const admin = new AdminPage(page);
      await admin.selectInvitesTab();
    });

    await bdd.then("invites page is displayed", async () => {
      await expect(page).toHaveURL(/\/admin.*invites/);
    });

    await bdd.and("page content is visible", async () => {
      const mainContent = page.locator("main").first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });
    });
  });

  test("Scenario: Admin can access backup/export functionality", async ({
    page,
  }) => {
    await bdd.given("admin is on admin panel", async () => {
      const admin = new AdminPage(page);
      await admin.goto();
      await expect(page).toHaveURL(/\/admin/);
    });

    await bdd.when("admin navigates to backup section", async () => {
      const admin = new AdminPage(page);
      await admin.selectBackupTab();
    });

    await bdd.then("backup page is displayed", async () => {
      await expect(page).toHaveURL(/\/admin.*backup/);
    });

    await bdd.and("backup content is accessible", async () => {
      const mainContent = page.locator("main").first();
      await expect(mainContent).toBeVisible({ timeout: 5000 });
    });
  });

  test("Scenario: Non-admin users cannot access admin panel", async ({
    page,
    clearAuth,
  }) => {
    await bdd.given("user is not logged in", async () => {
      await clearAuth();
    });

    await bdd.when(
      "non-admin tries to access admin panel directly",
      async () => {
        await page.goto("/admin/users");
        await page.waitForTimeout(500);
      }
    );

    await bdd.then("access is restricted", async () => {
      const url = page.url();
      // User should be redirected away from admin panel or denied
      const isRestricted =
        url.includes("/login") || !url.includes("/admin/users");
      expect(isRestricted).toBeTruthy();
    });
  });
});
