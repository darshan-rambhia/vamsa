/**
 * Custom Playwright Test Fixtures
 * Extends the base test with app-specific utilities and fixtures
 */
import { test as base, expect, type Page } from "@playwright/test";

/**
 * Test user credentials for different roles
 */
export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: "admin@test.vamsa.local",
    password: "TestAdmin123!",
    name: "Test Admin",
    role: "ADMIN",
  },
  member: {
    email: "member@test.vamsa.local",
    password: "TestMember123!",
    name: "Test Member",
    role: "MEMBER",
  },
  viewer: {
    email: "viewer@test.vamsa.local",
    password: "TestViewer123!",
    name: "Test Viewer",
    role: "VIEWER",
  },
};

/**
 * Extended test context with custom fixtures
 */
export interface TestFixtures {
  /** Login helper that handles the login flow */
  login: (user?: TestUser) => Promise<void>;
  /** Logout helper */
  logout: () => Promise<void>;
  /** Wait for Convex data to sync */
  waitForConvexSync: () => Promise<void>;
  /** Check if user is authenticated */
  isAuthenticated: () => Promise<boolean>;
  /** Get current viewport info */
  getViewportInfo: () => { width: number; height: number; isMobile: boolean; isTablet: boolean };
}

/**
 * Device breakpoint detection utilities
 */
export function getDeviceType(width: number): "mobile" | "tablet" | "desktop" {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  /**
   * Login fixture - handles authentication
   */
  login: async ({ page }, use) => {
    const loginFn = async (user: TestUser = TEST_USERS.admin) => {
      await page.goto("/login");

      // Wait for the login form to be visible
      await page.waitForSelector('input[name="email"]', { state: "visible" });

      // Fill in credentials
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);

      // Submit the form
      await page.click('button[type="submit"]');

      // Wait for navigation to complete (redirect to /people after login)
      await page.waitForURL(/\/(people|dashboard)/, { timeout: 10000 });

      // Ensure the nav is visible (indicates successful auth)
      await page.waitForSelector('nav', { state: "visible" });
    };

    await use(loginFn);
  },

  /**
   * Logout fixture - handles sign out
   */
  logout: async ({ page }, use) => {
    const logoutFn = async () => {
      // Click sign out button in nav
      await page.click('a[href="/login"]:has-text("Sign out")');

      // Wait for redirect to login page
      await page.waitForURL("/login");
    };

    await use(logoutFn);
  },

  /**
   * Wait for Convex to sync data
   * Convex is reactive so this should be quick, but we add a small buffer
   */
  waitForConvexSync: async ({ page }, use) => {
    const waitFn = async () => {
      // Convex updates are near-instant but we wait for any pending requests
      await page.waitForLoadState("networkidle");
      // Small buffer for UI updates
      await page.waitForTimeout(100);
    };

    await use(waitFn);
  },

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated: async ({ page }, use) => {
    const checkFn = async (): Promise<boolean> => {
      const url = page.url();
      // If we're on login page, not authenticated
      if (url.includes("/login")) return false;

      // Check for nav with sign out button
      const signOutButton = page.locator('a[href="/login"]:has-text("Sign out")');
      return await signOutButton.isVisible();
    };

    await use(checkFn);
  },

  /**
   * Get viewport information for responsive testing
   */
  getViewportInfo: async ({ page }, use) => {
    const getInfoFn = () => {
      const viewportSize = page.viewportSize();
      const width = viewportSize?.width || 1280;
      const height = viewportSize?.height || 720;

      return {
        width,
        height,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
      };
    };

    await use(getInfoFn);
  },
});

// Re-export expect for convenience
export { expect };

/**
 * Custom expect matchers for Vamsa-specific assertions
 */
export const vamsaExpect = {
  /**
   * Assert that a toast notification appears with the given text
   */
  async toHaveToast(page: Page, text: string) {
    const toast = page.locator('[role="status"], [data-toast]').filter({ hasText: text });
    await expect(toast).toBeVisible({ timeout: 5000 });
  },

  /**
   * Assert that the page shows an error message
   */
  async toHaveError(page: Page, message: string) {
    const error = page.locator('.text-destructive, [data-error]').filter({ hasText: message });
    await expect(error).toBeVisible();
  },

  /**
   * Assert that navigation is visible (user is authenticated)
   */
  async toBeLoggedIn(page: Page) {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    const signOut = page.locator('a[href="/login"]:has-text("Sign out")');
    await expect(signOut).toBeVisible();
  },

  /**
   * Assert that user is on login page (not authenticated)
   */
  async toBeLoggedOut(page: Page) {
    await expect(page).toHaveURL(/\/login/);
  },
};
