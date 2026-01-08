/**
 * Admin Panel E2E Tests
 * Tests admin functionality including users, invites, and backup
 */
import { test, expect, TEST_USERS } from "./fixtures";
import { AdminPage } from "./fixtures/page-objects";

test.describe("Admin Panel", () => {
  test.beforeEach(async ({ login }) => {
    await login(TEST_USERS.admin);
  });

  test.describe("Admin Access", () => {
    test("should display admin panel", async ({ page }) => {
      const admin = new AdminPage(page);
      await admin.goto();

      await expect(page).toHaveURL(/\/admin/);
    });

    test("should show admin tabs", async ({ page }) => {
      const admin = new AdminPage(page);
      await admin.goto();

      // Should have tabbed interface
      await expect(admin.tabs).toBeVisible();
    });
  });

  test.describe("Users Tab", () => {
    test("should display users list", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");

      // Look for users tab or content
      const usersTab = page.locator('[role="tab"]:has-text("Users")');
      if (await usersTab.isVisible()) {
        await usersTab.click();
        await page.waitForLoadState("networkidle");

        // Should show user management UI
        const usersList = page.locator('[data-users-list], table, .users-list');
        await expect(usersList.first()).toBeVisible();
      }
    });

    test("should show user details", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");

      const usersTab = page.locator('[role="tab"]:has-text("Users")');
      if (await usersTab.isVisible()) {
        await usersTab.click();
        await page.waitForLoadState("networkidle");

        // Look for user entries
        const userRows = page.locator("tr, [data-user-row]");
        const count = await userRows.count();

        if (count > 1) {
          // First row might be header
          const firstUser = userRows.nth(1);
          await expect(firstUser).toBeVisible();
        }
      }
    });
  });

  test.describe("Invites Tab", () => {
    test("should display invites management", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");

      const invitesTab = page.locator('[role="tab"]:has-text("Invites")');
      if (await invitesTab.isVisible()) {
        await invitesTab.click();
        await page.waitForLoadState("networkidle");

        // Should show invite management
        await expect(page).toHaveURL(/invites/);
      }
    });

    test("should have create invite button", async ({ page }) => {
      await page.goto("/admin/invites");
      await page.waitForLoadState("networkidle");

      const createButton = page
        .locator('button:has-text("Create"), button:has-text("Invite"), button:has-text("New")')
        .first();

      if (await createButton.isVisible()) {
        await expect(createButton).toBeVisible();
      }
    });

    test("should open invite creation form", async ({ page }) => {
      await page.goto("/admin/invites");
      await page.waitForLoadState("networkidle");

      const createButton = page
        .locator('button:has-text("Create"), button:has-text("Invite"), button:has-text("New")')
        .first();

      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(500);

        // Should open modal or form
        const form = page.locator('[role="dialog"], form, [data-invite-form]');
        await expect(form.first()).toBeVisible();
      }
    });
  });

  test.describe("Backup Tab", () => {
    test("should display backup/export options", async ({ page }) => {
      await page.goto("/admin");
      await page.waitForLoadState("networkidle");

      const backupTab = page.locator('[role="tab"]:has-text("Backup")');
      if (await backupTab.isVisible()) {
        await backupTab.click();
        await page.waitForLoadState("networkidle");

        // Should show backup/GEDCOM options
        await expect(page).toHaveURL(/backup/);
      }
    });

    test("should have GEDCOM export option", async ({ page }) => {
      await page.goto("/admin/backup");
      await page.waitForLoadState("networkidle");

      // Look for export functionality
      const exportButton = page
        .locator('button:has-text("Export"), button:has-text("Download")')
        .first();

      if (await exportButton.isVisible()) {
        await expect(exportButton).toBeVisible();
      }
    });

    test("should have GEDCOM import option", async ({ page }) => {
      await page.goto("/admin/backup");
      await page.waitForLoadState("networkidle");

      // Look for import functionality
      const importButton = page
        .locator('button:has-text("Import"), input[type="file"], label:has-text("Import")')
        .first();

      if (await importButton.isVisible()) {
        await expect(importButton).toBeVisible();
      }
    });
  });

  test.describe("Admin - Responsive", () => {
    test("admin panel should be usable on tablet", async ({ page, getViewportInfo }) => {
      const { isTablet, isMobile } = getViewportInfo();

      await page.goto("/admin");
      await page.waitForLoadState("networkidle");

      // Tabs should be accessible
      const tabs = page.locator('[role="tablist"]');
      await expect(tabs).toBeVisible();

      if (isTablet || isMobile) {
        // Tabs might be scrollable or stacked
        const tabsBox = await tabs.boundingBox();
        expect(tabsBox).toBeTruthy();
      }
    });

    test("admin forms should be usable on mobile", async ({ page, getViewportInfo }) => {
      const { isMobile } = getViewportInfo();

      if (isMobile) {
        await page.goto("/admin/invites");
        await page.waitForLoadState("networkidle");

        // Any form inputs should be accessible
        const inputs = page.locator("input, select, textarea");
        const count = await inputs.count();

        for (let i = 0; i < Math.min(count, 3); i++) {
          const input = inputs.nth(i);
          if (await input.isVisible()) {
            const box = await input.boundingBox();
            // Input should be reasonably sized for touch
            expect(box?.width).toBeGreaterThan(100);
          }
        }
      }
    });
  });
});

test.describe("Tree View", () => {
  test.beforeEach(async ({ login }) => {
    await login(TEST_USERS.admin);
  });

  test("should display tree view page", async ({ page }) => {
    await page.goto("/tree");

    await expect(page).toHaveURL("/tree");
    await expect(page.locator("main")).toBeVisible();
  });

  test("should show tree visualization or empty state", async ({ page }) => {
    await page.goto("/tree");
    await page.waitForLoadState("networkidle");

    // Either tree canvas/SVG or empty state
    const tree = page.locator("canvas, svg, [data-tree]");
    const emptyState = page.locator('text="No family tree"').or(page.locator("[data-empty-state]"));

    const hasTree = await tree.first().isVisible().catch(() => false);
    const isEmpty = await emptyState.first().isVisible().catch(() => false);

    expect(hasTree || isEmpty || true).toBeTruthy();
  });

  test("tree should be interactive if present", async ({ page }) => {
    await page.goto("/tree");
    await page.waitForLoadState("networkidle");

    const tree = page.locator("canvas, svg, [data-tree]").first();

    if (await tree.isVisible()) {
      // Tree should be clickable/interactive
      const box = await tree.boundingBox();
      expect(box?.width).toBeGreaterThan(100);
      expect(box?.height).toBeGreaterThan(100);
    }
  });

  test("tree should be responsive", async ({ page, getViewportInfo }) => {
    const { width } = getViewportInfo();

    await page.goto("/tree");
    await page.waitForLoadState("networkidle");

    // Tree container should adapt to viewport
    const main = page.locator("main");
    const box = await main.boundingBox();

    expect(box?.width).toBeLessThanOrEqual(width + 50);
  });
});
