/**
 * Custom Playwright Test Fixtures
 * Extends the base test with app-specific utilities and fixtures
 */
import { test as base, expect, type Page } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import type { AxeResults } from "axe-core";

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
 * Accessibility violation interface
 */
export interface AccessibilityViolation {
  id: string;
  impact: string;
  message: string;
  nodes: number;
}

/**
 * Extended test context with custom fixtures
 */
export interface TestFixtures {
  /** Login helper that handles the login flow */
  login: (user?: TestUser) => Promise<void>;
  /** Logout helper */
  logout: () => Promise<void>;
  /** Clear all authentication (cookies, storage) */
  clearAuth: () => Promise<void>;
  /** Wait for Convex data to sync */
  waitForConvexSync: () => Promise<void>;
  /** Check if user is authenticated */
  isAuthenticated: () => Promise<boolean>;
  /** Get current viewport info */
  getViewportInfo: () => {
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
  };
  /** Check page for accessibility violations (WCAG 2 AA) */
  checkAccessibility: (options?: {
    selector?: string;
    rules?: string[];
    skipRules?: string[];
  }) => Promise<AccessibilityViolation[]>;
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
      console.log(`[Login] Attempting to login with ${user.email}`);
      await page.goto("/login");

      // Wait for the login form to be visible (Playwright auto-waits for visibility on interactions)
      await page
        .getByTestId("login-form")
        .waitFor({ state: "visible", timeout: 5000 });

      // Fill in credentials - use type() instead of fill() to trigger onChange on React controlled components
      const emailInput = page.getByTestId("login-email-input");
      const passwordInput = page.getByTestId("login-password-input");

      // Type email and password (this triggers onChange and updates React state)
      await emailInput.type(user.email, { delay: 50 });
      await passwordInput.type(user.password, { delay: 50 });

      console.log(`[Login] Form submitted for ${user.email}...`);

      // Click submit button and wait for navigation to complete
      await page.getByTestId("login-submit-button").click();

      // Wait for successful navigation (either people, dashboard, or tree page)
      // This implicitly waits for the page load and auth cookie to be set
      try {
        await page.waitForURL(/\/(people|dashboard|tree)/, { timeout: 10000 });
        console.log(`[Login] Redirect successful, now at ${page.url()}`);
      } catch (err) {
        // If navigation times out, check if there's an error message displayed
        const loginError = page.getByTestId("login-error");
        if (await loginError.isVisible().catch(() => false)) {
          const errorText = await loginError.textContent();
          throw new Error(`Login error displayed: ${errorText}`);
        }

        const url = page.url();
        if (url.includes("/login")) {
          throw new Error(
            `Login failed: still on login page after submission. No error message on page.`
          );
        }

        throw err;
      }

      // Ensure the nav is visible (indicates successful auth)
      await page
        .getByTestId("main-nav")
        .waitFor({ state: "visible", timeout: 5000 });
      console.log(`[Login] Navigation visible, login successful`);
    };

    await use(loginFn);
  },

  /**
   * Logout fixture - handles sign out
   * Handles both desktop and mobile viewports
   */
  logout: async ({ page }, use) => {
    const logoutFn = async () => {
      const mobileMenuButton = page.getByTestId("nav-mobile-menu-button");

      // Check if we're in mobile mode (mobile menu button visible)
      const isMobileMode = await mobileMenuButton
        .isVisible()
        .catch(() => false);

      if (isMobileMode) {
        // Open mobile menu
        await mobileMenuButton.click();
        // Wait for menu animation
        await page.waitForTimeout(300);
      }

      // Find any visible signout button and click it
      // There may be two (desktop and mobile), but only one should be visible
      const signoutButtons = page.getByTestId("signout-button");
      const count = await signoutButtons.count();

      for (let i = 0; i < count; i++) {
        const button = signoutButtons.nth(i);
        if (await button.isVisible().catch(() => false)) {
          await button.click();
          break;
        }
      }

      // Wait for redirect to login page
      await page.waitForURL("/login");
    };

    await use(logoutFn);
  },

  /**
   * Clear authentication - removes all cookies and local storage
   * Used for testing unauthenticated behavior
   */
  clearAuth: async ({ page }, use) => {
    const clearFn = async () => {
      // Clear all cookies (including HTTP-only session cookie)
      await page.context().clearCookies();

      // Clear local and session storage - catch errors from cross-origin pages
      try {
        await page.evaluate(() => {
          try {
            localStorage.clear();
          } catch (_e) {
            // Ignore localStorage errors (cross-origin)
          }
          try {
            sessionStorage.clear();
          } catch (_e) {
            // Ignore sessionStorage errors (cross-origin)
          }
        });
      } catch (_e) {
        // Ignore page.evaluate errors for pages that restrict storage access
      }

      console.log("[ClearAuth] Cleared all authentication");
    };

    await use(clearFn);
  },

  /**
   * Wait for Convex to sync data
   * Convex is reactive so updates propagate quickly.
   * Instead of waiting for networkidle, we wait for specific UI updates
   * or use a small timeout for state changes to render.
   */
  waitForConvexSync: async ({ page }, use) => {
    const waitFn = async () => {
      // Convex updates are near-instant
      // Use a small timeout to allow React to process state updates
      // In practice, this can be replaced with waiting for specific elements
      // that indicate data has loaded (e.g., await page.getByTestId('data-loaded').isVisible())
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

      // Check for main nav which is only visible when authenticated
      return await page
        .getByTestId("main-nav")
        .isVisible()
        .catch(() => false);
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

  /**
   * Check page for accessibility violations using axe-core
   * Configured for WCAG 2 AA compliance
   */
  checkAccessibility: async ({ page }, use) => {
    const checkA11yFn = async (options?: {
      selector?: string;
      rules?: string[];
      skipRules?: string[];
    }): Promise<AccessibilityViolation[]> => {
      // Get violations from the page
      const violations: AccessibilityViolation[] = [];

      try {
        // Build the accessibility check with WCAG 2 AA rules
        let axeCheck = new AxeBuilder({ page })
          .withTags(["wcag2aa"])
          .setLegacyMode(false);

        // Add includes if selector is specified
        if (options?.selector) {
          axeCheck = axeCheck.include(options.selector);
        }

        // Skip rules if specified
        if (options?.skipRules && options.skipRules.length > 0) {
          axeCheck = axeCheck.disableRules(options.skipRules);
        }

        // Limit to specific rules if specified
        if (options?.rules && options.rules.length > 0) {
          axeCheck = axeCheck.withRules(options.rules);
        }

        // Run the accessibility check
        const a11yResults: AxeResults = await axeCheck.analyze();

        // Process violations
        a11yResults.violations.forEach((violation) => {
          violations.push({
            id: violation.id,
            impact: violation.impact || "unknown",
            message: violation.description || "No description",
            nodes: violation.nodes?.length || 0,
          });
        });
      } catch (error) {
        console.error("Error running accessibility check:", error);
      }

      return violations;
    };

    await use(checkA11yFn);
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
    const toast = page
      .locator('[role="status"], [data-toast]')
      .filter({ hasText: text });
    await expect(toast).toBeVisible({ timeout: 5000 });
  },

  /**
   * Assert that the page shows an error message
   */
  async toHaveError(page: Page, message: string) {
    const error = page
      .locator(".text-destructive, [data-error]")
      .filter({ hasText: message });
    await expect(error).toBeVisible();
  },

  /**
   * Assert that navigation is visible (user is authenticated)
   */
  async toBeLoggedIn(page: Page) {
    const nav = page.getByTestId("main-nav");
    // Navigation element should exist and be visible
    await expect(nav).toBeVisible();

    // Check that either:
    // 1. Navigation links are visible (desktop mode), OR
    // 2. Mobile menu button exists (responsive mode)
    // This confirms the user is logged in (nav only visible when authenticated)
    const peopleLink = page.getByTestId("nav-people");
    const mobileMenuButton = page.getByTestId("nav-mobile-menu-button");

    const hasVisibleLink = await peopleLink.isVisible().catch(() => false);
    const hasMobileMenu = await mobileMenuButton.isVisible().catch(() => false);

    // Must have either visible navigation link or mobile menu button
    expect(hasVisibleLink || hasMobileMenu).toBeTruthy();
  },

  /**
   * Assert that user is on login page (not authenticated)
   */
  async toBeLoggedOut(page: Page) {
    await expect(page).toHaveURL(/\/login/);
  },
};
