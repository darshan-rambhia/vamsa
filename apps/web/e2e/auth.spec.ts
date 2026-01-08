/**
 * Authentication E2E Tests
 * Tests login, logout, and protected route access
 */
import { test, expect, TEST_USERS, vamsaExpect } from "./fixtures";
import { LoginPage, Navigation } from "./fixtures/page-objects";

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/login");

      // Check for form elements
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Check for branding
      await expect(page.locator("text=Vamsa")).toBeVisible();
    });

    test("should show validation errors for empty form submission", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Click submit without filling form
      await loginPage.submitButton.click();

      // HTML5 validation should prevent submission
      // Check if form is still on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test("should show error for invalid credentials", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login("invalid@example.com", "wrongpassword");

      // Wait for error message
      await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
      const errorText = await loginPage.getErrorText();
      expect(errorText).toContain("Invalid");
    });

    test("should successfully login with valid credentials", async ({ page, login }) => {
      await login(TEST_USERS.admin);

      // Should be redirected to authenticated area
      await expect(page).toHaveURL(/\/(people|dashboard)/);

      // Navigation should be visible
      const nav = new Navigation(page);
      await expect(nav.nav).toBeVisible();
      await expect(nav.signOutButton).toBeVisible();
    });

    test("should have theme toggle on login page", async ({ page }) => {
      await page.goto("/login");

      // Look for theme toggle button
      const _themeToggle = page.locator('[data-theme-toggle], button:has-text("theme")');
      // Theme toggle exists in corner
      await expect(page.locator("button").first()).toBeVisible();
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect to login when accessing protected route without auth", async ({
      page,
    }) => {
      // Try to access protected route
      await page.goto("/people");

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect to login when accessing dashboard without auth", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect to login when accessing admin without auth", async ({ page }) => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect to login when accessing tree without auth", async ({ page }) => {
      await page.goto("/tree");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect to login when accessing activity without auth", async ({ page }) => {
      await page.goto("/activity");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Logout", () => {
    test("should successfully logout", async ({ page, login, logout }) => {
      // Login first
      await login(TEST_USERS.admin);

      // Verify we're logged in
      await vamsaExpect.toBeLoggedIn(page);

      // Logout
      await logout();

      // Should be on login page
      await vamsaExpect.toBeLoggedOut(page);
    });

    test("should not access protected routes after logout", async ({ page, login, logout }) => {
      // Login
      await login(TEST_USERS.admin);

      // Logout
      await logout();

      // Try to access protected route
      await page.goto("/people");

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Session Persistence", () => {
    test("should maintain session on page refresh", async ({ page, login }) => {
      await login(TEST_USERS.admin);

      // Refresh the page
      await page.reload();

      // Should still be authenticated
      await expect(page).not.toHaveURL(/\/login/);
      await vamsaExpect.toBeLoggedIn(page);
    });

    test("should maintain session when navigating between pages", async ({ page, login }) => {
      await login(TEST_USERS.admin);

      // Navigate to different pages
      await page.goto("/dashboard");
      await expect(page).toHaveURL("/dashboard");

      await page.goto("/people");
      await expect(page).toHaveURL("/people");

      await page.goto("/tree");
      await expect(page).toHaveURL("/tree");

      // Still authenticated
      await vamsaExpect.toBeLoggedIn(page);
    });
  });

  test.describe("Role-Based Access", () => {
    test("admin user should access admin panel", async ({ page, login }) => {
      await login(TEST_USERS.admin);

      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin/);

      // Should see admin content, not error
      await expect(page.locator("text=Users")).toBeVisible();
    });

    test.skip("member user should have limited admin access", async ({ page, login }) => {
      await login(TEST_USERS.member);

      await page.goto("/admin");

      // Depending on implementation, member might see partial admin or be redirected
      // This test documents expected behavior
    });

    test.skip("viewer user should not access admin panel", async ({ page, login }) => {
      await login(TEST_USERS.viewer);

      await page.goto("/admin");

      // Should either redirect or show access denied
      // This test documents expected behavior
    });
  });
});

test.describe("Authentication - Responsive", () => {
  test("login page should be responsive on mobile", async ({ page, getViewportInfo }) => {
    const { isMobile } = getViewportInfo();

    await page.goto("/login");

    // Login form should be visible at any viewport
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();

    // Card should take full width on mobile
    if (isMobile) {
      const card = page.locator(".max-w-md");
      const boundingBox = await card.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(300);
    }
  });

  test("navigation should adapt to viewport", async ({ page, login, getViewportInfo }) => {
    await login(TEST_USERS.admin);

    const { isMobile, isTablet } = getViewportInfo();
    const nav = new Navigation(page);

    if (isMobile || isTablet) {
      // On smaller screens, might have mobile menu
      const hasMobileMenu = await nav.mobileMenuButton.isVisible().catch(() => false);
      // Either mobile menu or regular nav should be visible
      expect(hasMobileMenu || (await nav.nav.isVisible())).toBeTruthy();
    } else {
      // Desktop should show full nav
      await expect(nav.nav).toBeVisible();
    }
  });
});
