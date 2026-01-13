/**
 * Feature: User Authentication
 * Tests login, logout, and protected route access
 */
import { test, expect, bdd, TEST_USERS, vamsaExpect } from "./fixtures";
import { LoginPage } from "./fixtures/page-objects";

test.describe("Feature: User Authentication", () => {
  test.describe("Unauthenticated tests", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("should display login form with all fields", async ({ page }) => {
      // Skip pre-authenticated state for login tests
      await bdd.given("user navigates to login page", async () => {
        await page.goto("/login");
      });

      await bdd.then("login form is displayed", async () => {
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
        await expect(page.locator("text=Vamsa")).toBeVisible();
      });
    });

    test("should validate empty form submission on login", async ({ page }) => {
      await bdd.given("user is on login page", async () => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
      });

      await bdd.when("user submits empty form", async () => {
        const loginPage = new LoginPage(page);
        await loginPage.submitButton.click();
      });

      await bdd.then("form validation prevents submission", async () => {
        await expect(page).toHaveURL(/\/login/);
      });
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await bdd.given("user is on login page", async () => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
      });

      await bdd.when("user enters invalid credentials", async () => {
        const loginPage = new LoginPage(page);
        await loginPage.login("invalid@example.com", "wrongpassword");
      });

      await bdd.then("error message is displayed", async () => {
        const loginPage = new LoginPage(page);
        await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
        const errorText = await loginPage.getErrorText();
        expect(errorText).toContain("Invalid");
      });
    });

    test("should redirect to login when accessing protected routes", async ({
      page,
    }) => {
      const protectedRoutes = [
        "/people",
        "/dashboard",
        "/admin",
        "/tree",
        "/activity",
      ];

      for (const route of protectedRoutes) {
        await bdd.when(
          `user navigates to protected route: ${route}`,
          async () => {
            await page.goto(route);
          }
        );

        await bdd.then("user is redirected to login", async () => {
          await expect(page).toHaveURL(/\/login/);
        });
      }
    });

    test("should be responsive on mobile devices", async ({
      page,
      getViewportInfo,
    }) => {
      const { isMobile } = getViewportInfo();

      await bdd.given("user is on login page", async () => {
        await page.goto("/login");
      });

      await bdd.then("login form is visible on mobile", async () => {
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
      });

      await bdd.and("form card has proper width on mobile", async () => {
        if (isMobile) {
          const card = page.locator(".max-w-md");
          const boundingBox = await card.boundingBox();
          expect(boundingBox?.width || 0).toBeGreaterThan(300);
        }
      });
    });
  });

  test.describe("Authenticated tests", () => {
    test("should successfully login with valid credentials", async ({
      page,
      login,
    }) => {
      await bdd.given("user has valid credentials", async () => {
        expect(TEST_USERS.admin.email).toBeTruthy();
      });

      await bdd.when("user submits valid login form", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.then("user is authenticated and redirected", async () => {
        await expect(page).toHaveURL(/\/(people|dashboard)/);
        await vamsaExpect.toBeLoggedIn(page);
      });
    });

    test("should successfully logout and restrict access", async ({
      page,
      login,
      logout,
    }) => {
      await bdd.given("user is logged in", async () => {
        await login(TEST_USERS.admin);
        await vamsaExpect.toBeLoggedIn(page);
      });

      await bdd.when("user logs out", async () => {
        await logout();
      });

      await bdd.then("user is logged out", async () => {
        await vamsaExpect.toBeLoggedOut(page);
      });

      await bdd.and("protected routes are no longer accessible", async () => {
        await page.goto("/people");
        await expect(page).toHaveURL(/\/login/);
      });
    });

    test("should maintain session on page refresh", async ({ page, login }) => {
      await bdd.given("user is logged in", async () => {
        await login(TEST_USERS.admin);
        await expect(page).toHaveURL(/\/(people|dashboard)/);
      });

      await bdd.when("user refreshes page", async () => {
        await page.reload();
      });

      await bdd.then("session is still active", async () => {
        await expect(page).not.toHaveURL(/\/login/);
        await vamsaExpect.toBeLoggedIn(page);
      });
    });

    test("should maintain session across page navigation", async ({
      page,
      login,
    }) => {
      await bdd.given("user is logged in", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("user navigates between pages", async () => {
        await page.goto("/dashboard");
        await expect(page).toHaveURL("/dashboard");

        await page.goto("/people");
        await expect(page).toHaveURL("/people");

        await page.goto("/tree");
        await expect(page).toHaveURL(/\/tree(\?|$)/);
      });

      await bdd.then("session remains active", async () => {
        await vamsaExpect.toBeLoggedIn(page);
      });
    });

    test("should allow admin access to admin panel", async ({
      page,
      login,
    }) => {
      await bdd.given("admin user is logged in", async () => {
        await login(TEST_USERS.admin);
      });

      await bdd.when("admin navigates to admin panel", async () => {
        await page.goto("/admin");
      });

      await bdd.then("admin panel is accessible", async () => {
        await expect(page).toHaveURL(/\/admin/);
        await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
      });
    });
  });
});
