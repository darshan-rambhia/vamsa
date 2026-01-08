import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";

test.describe("Authentication", () => {
  test("should show login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("should display login form elements", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
    await expect(loginPage.claimProfileLink).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login("invalid@email.com", "wrongpassword");

    await loginPage.expectError("Invalid");
    await loginPage.expectToBeOnLoginPage();
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login("admin@family.local", "admin123");

    await expect(page).toHaveURL("/tree");
  });

  test("should redirect to tree page after login", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login("admin@family.local", "admin123");

    await expect(page).toHaveURL("/tree");
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("should navigate to register page", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.registerLink.click();

    await expect(page).toHaveURL("/register");
  });

  test("should navigate to claim profile page", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.claimProfileLink.click();

    await expect(page).toHaveURL("/claim-profile");
  });
});

test.describe("Protected Routes", () => {
  test("should redirect to login when accessing tree without auth", async ({
    page,
  }) => {
    await page.goto("/tree");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect to login when accessing people without auth", async ({
    page,
  }) => {
    await page.goto("/people");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect to login when accessing admin without auth", async ({
    page,
  }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login/);
  });
});
