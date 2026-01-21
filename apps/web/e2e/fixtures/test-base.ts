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
   * Uses accessible selectors (getByLabel, getByRole) for reliability
   *
   * NOTE: If pre-authenticated storage state is used, calling login() will
   * detect the existing session and skip the login flow.
   */
  login: async ({ page }, use) => {
    const loginFn = async (user: TestUser = TEST_USERS.admin) => {
      console.log(`[Login] Attempting to login with ${user.email}`);

      // First, try navigating to a protected page to check if already authenticated
      // This handles pre-authenticated storage state more reliably than checking /login redirects
      await page.goto("/dashboard");

      // Wait a moment for redirect or page load
      await page.waitForTimeout(500);

      const urlAfterDashboard = page.url();
      const navVisible = await page
        .locator("nav")
        .first()
        .isVisible()
        .catch(() => false);

      // If we're on dashboard (or any protected page) with nav visible, we're authenticated
      if (!urlAfterDashboard.includes("/login") && navVisible) {
        console.log(
          `[Login] Already authenticated (at ${urlAfterDashboard}), skipping login flow`
        );
        return;
      }

      console.log(
        `[Login] Not authenticated, redirected to ${urlAfterDashboard}, proceeding with login`
      );

      // Navigate to login page if not already there
      if (!urlAfterDashboard.includes("/login")) {
        await page.goto("/login");
      }

      // Wait for page to fully load
      await page.waitForLoadState("domcontentloaded");

      // NETWORKIDLE EXCEPTION: Login form requires networkidle for reliable React hydration
      //
      // WHY THIS IS NEEDED:
      // Under parallel test execution, React controlled inputs can be "visible" and "editable"
      // before React attaches onChange handlers. When you type into such an input:
      // 1. Native browser input accepts the text
      // 2. React hydrates and reconciles with empty state
      // 3. React RESETS the input to empty (the state value)
      //
      // The networkidle wait ensures all JS bundles are loaded and executed before we interact.
      // This is particularly critical for login since it's the gateway to all authenticated tests.
      //
      // FUTURE IMPROVEMENT: If we find a deterministic way to detect React hydration completion
      // (e.g., a data attribute set after hydration, or a custom event), we can remove this.
      await page.waitForLoadState("networkidle").catch(() => {});

      // Wait for the login form to be visible using test IDs (same as global setup)
      const loginForm = page.getByTestId("login-form");
      await loginForm.waitFor({ state: "visible", timeout: 10000 });

      // Wait for inputs to be ready
      const emailInput = page.getByTestId("login-email-input");
      const passwordInput = page.getByTestId("login-password-input");

      await emailInput.waitFor({ state: "visible", timeout: 5000 });
      await passwordInput.waitFor({ state: "visible", timeout: 5000 });

      // Wait for inputs to be editable (React hydration complete)
      await expect(emailInput).toBeEditable({ timeout: 5000 });
      await expect(passwordInput).toBeEditable({ timeout: 5000 });

      // Additional hydration buffer for parallel execution
      await page.waitForTimeout(500);

      // Fill email with "poke and verify" pattern - verify React responds before typing rest
      for (let attempt = 1; attempt <= 5; attempt++) {
        await emailInput.click();
        await page.waitForTimeout(50);
        await emailInput.clear();

        // Poke: type first character and wait for React reconciliation
        await emailInput.type(user.email.charAt(0), { delay: 50 });
        // CRITICAL: Wait for React to potentially reset controlled input
        await page.waitForTimeout(200);

        const firstChar = await emailInput.inputValue();
        if (firstChar !== user.email.charAt(0)) {
          // React either not hydrated or reset the value - wait longer
          await page.waitForTimeout(300 * attempt);
          continue;
        }

        // React accepted the character - type the rest
        await emailInput.type(user.email.slice(1), { delay: 20 });
        await page.waitForTimeout(200);

        const emailValue = await emailInput.inputValue();
        if (emailValue === user.email) break;

        // Value mismatch - wait and retry
        await page.waitForTimeout(200 * attempt);
      }

      // Fill password with retry loop
      for (let attempt = 1; attempt <= 3; attempt++) {
        await passwordInput.click();
        await page.waitForTimeout(100);
        await passwordInput.fill(user.password);
        await page.waitForTimeout(150);

        const passwordValue = await passwordInput.inputValue();
        if (passwordValue === user.password) break;

        // Retry with selectText + type
        if (attempt < 3) {
          await passwordInput.click();
          await passwordInput.selectText().catch(() => {});
          await passwordInput.type(user.password, { delay: 30 });
          await page.waitForTimeout(100);

          const retryValue = await passwordInput.inputValue();
          if (retryValue === user.password) break;
        }
      }

      // Verify form was filled
      const filledEmail = await emailInput.inputValue();
      const filledPassword = await passwordInput.inputValue();
      console.log(
        `[Login] Form filled - Email: ${filledEmail}, Password length: ${filledPassword.length}`
      );

      if (filledEmail !== user.email || filledPassword !== user.password) {
        throw new Error(
          `[Login] Form fill failed. Email: "${filledEmail}" (expected "${user.email}"), Password length: ${filledPassword.length}`
        );
      }

      // Click submit button and wait for navigation simultaneously to avoid race condition
      const submitButton = page.getByTestId("login-submit-button");

      try {
        // Use Promise.all to click and wait for URL change simultaneously
        // This prevents race condition where navigation completes before we start waiting
        await Promise.all([
          page.waitForURL(/\/(people|dashboard|visualize)/, { timeout: 15000 }),
          submitButton.click(),
        ]);
        console.log(`[Login] Redirect successful, now at ${page.url()}`);
      } catch (err) {
        // If navigation times out, check if there's an error message displayed
        const errorMessage = page.locator(".text-destructive, [role=alert]");
        if (await errorMessage.isVisible().catch(() => false)) {
          const errorText = await errorMessage.textContent();
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
        .locator("nav")
        .first()
        .waitFor({ state: "visible", timeout: 5000 });
      console.log(`[Login] Navigation visible, login successful`);
    };

    await use(loginFn);
  },

  /**
   * Logout fixture - handles sign out
   * Handles both desktop and mobile viewports
   * Uses accessible selectors for reliability
   */
  logout: async ({ page }, use) => {
    const logoutFn = async () => {
      // Look for sign out button using accessible selector
      const signoutButton = page.getByRole("button", { name: /sign out/i });

      // Check if it's visible (might be in mobile menu)
      if (!(await signoutButton.isVisible().catch(() => false))) {
        // Try to open mobile menu
        const menuButton = page.locator(
          'button[aria-label*="menu"], button:has(svg):not(:has-text(""))'
        );
        if (
          await menuButton
            .first()
            .isVisible()
            .catch(() => false)
        ) {
          await menuButton.first().click();
          await page.waitForTimeout(300);
        }
      }

      // Click sign out button
      await signoutButton.click();

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
   * Uses accessible selectors for reliability
   */
  isAuthenticated: async ({ page }, use) => {
    const checkFn = async (): Promise<boolean> => {
      const url = page.url();
      // If we're on login page, not authenticated
      if (url.includes("/login")) return false;

      // Check for nav or sign out button which is only visible when authenticated
      const signOutVisible = await page
        .getByRole("button", { name: /sign out/i })
        .isVisible()
        .catch(() => false);

      const navVisible = await page
        .locator("nav")
        .first()
        .isVisible()
        .catch(() => false);

      return signOutVisible || navVisible;
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
   * Uses accessible selectors for reliability
   */
  async toBeLoggedIn(page: Page) {
    // Check for nav element
    const nav = page.locator("nav").first();
    await expect(nav).toBeVisible();

    // Check that sign out button exists (indicates authenticated user)
    const signOutButton = page.getByRole("button", { name: /sign out/i });
    const signOutVisible = await signOutButton.isVisible().catch(() => false);

    // Check for navigation links
    const peopleLink = page.getByRole("link", { name: /people/i });
    const hasVisibleLink = await peopleLink.isVisible().catch(() => false);

    // Must have either sign out button or navigation link visible
    expect(signOutVisible || hasVisibleLink).toBeTruthy();
  },

  /**
   * Assert that user is on login page (not authenticated)
   */
  async toBeLoggedOut(page: Page) {
    await expect(page).toHaveURL(/\/login/);
  },
};
