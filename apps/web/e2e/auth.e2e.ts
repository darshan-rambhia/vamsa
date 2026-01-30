/**
 * Feature: User Authentication
 * Tests login, logout, and protected route access
 */
import {
  TEST_USERS,
  bdd,
  expect,
  formValidation,
  test,
  vamsaExpect,
} from "./fixtures";
import { LoginPage, gotoWithRetry } from "./fixtures/page-objects";

test.describe("Feature: User Authentication", () => {
  test.describe("Unauthenticated tests", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("should display login form with all fields", async ({ page }) => {
      // Skip pre-authenticated state for login tests
      await bdd.given("user navigates to login page", async () => {
        await page.goto("/login", { waitUntil: "domcontentloaded" });
      });

      await bdd.then("login form is displayed", async () => {
        // Use test IDs for React controlled components
        await expect(page.getByTestId("login-email-input")).toBeVisible();
        await expect(page.getByTestId("login-password-input")).toBeVisible();
        await expect(page.getByTestId("login-submit-button")).toBeVisible();
        await expect(page.locator("text=Vamsa")).toBeVisible();
      });
    });

    test("should validate empty form submission on login", async ({ page }) => {
      await formValidation.testEmptySubmission(page, {
        formUrl: "/login",
        formTestId: "login-form",
        submitButtonTestId: "login-submit-button",
        fields: [
          {
            testId: "login-email-input",
            fieldName: "email",
            testValue: "test@example.com",
          },
          {
            testId: "login-password-input",
            fieldName: "password",
            testValue: "TestPassword123!",
          },
        ],
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
        "/visualize",
        "/activity",
      ];

      for (const route of protectedRoutes) {
        await bdd.when(
          `user navigates to protected route: ${route}`,
          async () => {
            // Use waitUntil: 'commit' to handle Firefox's NS_BINDING_ABORTED
            // This occurs when navigation is interrupted by a redirect
            try {
              await page.goto(route, { waitUntil: "commit" });
            } catch (error) {
              // Firefox may throw NS_BINDING_ABORTED during redirect - this is expected
              if (
                !(error instanceof Error) ||
                !error.message.includes("NS_BINDING_ABORTED")
              ) {
                throw error;
              }
            }
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
        await page.goto("/login", { waitUntil: "domcontentloaded" });
      });

      await bdd.then("login form is visible on mobile", async () => {
        // Use test IDs for React controlled components
        await expect(page.getByTestId("login-email-input")).toBeVisible();
        await expect(page.getByTestId("login-password-input")).toBeVisible();
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
    // Clear pre-authenticated storage state to test actual login flow
    test.use({ storageState: { cookies: [], origins: [] } });

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
        // Use waitUntil: 'commit' to handle Firefox's NS_BINDING_ABORTED
        // This occurs when navigation is interrupted by auth redirect
        try {
          await page.goto("/people", { waitUntil: "commit" });
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !error.message.includes("NS_BINDING_ABORTED")
          ) {
            throw error;
          }
        }
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
        // Use waitUntil: 'domcontentloaded' for Firefox compatibility
        // Firefox can throw NS_BINDING_ABORTED during rapid navigation
        await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL("/dashboard");

        await page.goto("/people", { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL("/people");

        await page.goto("/visualize", { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(/\/visualize/);
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
        await gotoWithRetry(page, "/admin");
      });

      await bdd.then("admin panel is accessible", async () => {
        await expect(page).toHaveURL(/\/admin/);
        await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
      });
    });
  });
});
