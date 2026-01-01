import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { TreePage } from "./pages/TreePage";

test.describe("Family Tree", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("admin@family.local", "admin123");
    await expect(page).toHaveURL("/tree");
  });

  test("should display tree page after login", async ({ page }) => {
    const treePage = new TreePage(page);
    await treePage.expectToBeOnTreePage();
  });

  test("should show empty state when no people exist", async ({ page }) => {
    const treePage = new TreePage(page);
    await treePage.expectEmptyState();
  });

  test("should have navigation bar", async ({ page }) => {
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("should navigate to people page from nav", async ({ page }) => {
    await page.getByRole("link", { name: /people/i }).click();
    await expect(page).toHaveURL("/people");
  });
});
