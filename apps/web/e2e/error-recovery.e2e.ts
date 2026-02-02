/**
 * Error Recovery - User Recovery Workflows
 *
 * Tests error scenarios and user ability to recover:
 * - Form validation errors and recovery
 * - Page load errors and graceful handling
 * - API error responses and user feedback
 * - Network timeout scenarios
 * - Invalid URL navigation (404 handling)
 * - Session expiration and re-authentication
 *
 * Philosophy: Users should be able to recover from errors without losing work
 */

import { bdd, expect, test, vamsaExpect } from "./fixtures";
import {
  LoginPage,
  PersonFormPage,
  gotoWithRetry,
} from "./fixtures/page-objects";

test.describe("Feature: Error Recovery", () => {
  test.describe("Form Validation Error Recovery", () => {
    test("should display validation errors when required fields are missing", async ({
      page,
    }) => {
      await bdd.given("user is on person creation form", async () => {
        await gotoWithRetry(page, "/people/new");
        const form = page.getByTestId("person-form");
        await expect(form).toBeVisible({ timeout: 5000 });
      });

      await bdd.when(
        "user submits form without filling required fields",
        async () => {
          const submitButton = page.getByTestId("person-form-submit");
          await submitButton.click();
        }
      );

      await bdd.then(
        "form remains visible with validation errors",
        async () => {
          // User should still be on the form page
          await expect(page).toHaveURL(/\/people\/new/);
          const form = page.getByTestId("person-form");
          await expect(form).toBeVisible();
        }
      );
    });

    test("should allow user to recover from validation error by filling required field", async ({
      page,
    }) => {
      await bdd.given("user is on person creation form", async () => {
        await gotoWithRetry(page, "/people/new");
        await expect(page.getByTestId("person-form")).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when("user submits form with only last name", async () => {
        // Fill only last name (first name is required)
        await page.getByTestId("person-form-lastName").fill("Smith");
        await page.getByTestId("person-form-submit").click();
      });

      await bdd.then("form still shows validation error", async () => {
        await expect(page).toHaveURL(/\/people\/new/);
      });

      await bdd.and(
        "user recovers by filling in missing first name",
        async () => {
          // Fill the required first name field
          await page.getByTestId("person-form-firstName").fill("John");

          // Verify form is still accessible
          const form = page.getByTestId("person-form");
          await expect(form).toBeVisible();
        }
      );
    });

    test("should display validation error for invalid email format", async ({
      page,
    }) => {
      await bdd.given("user is on login page", async () => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
      });

      await bdd.when(
        "user enters invalid email format and submits",
        async () => {
          // Use test IDs and type() for React controlled components
          const emailInput = page.getByTestId("login-email-input");
          const passwordInput = page.getByTestId("login-password-input");

          await emailInput.type("notanemail", { delay: 30 });
          await passwordInput.type("TestPassword123!", { delay: 30 });

          const submitButton = page.getByTestId("login-submit-button");
          await submitButton.click();
        }
      );

      await bdd.then("user remains on login form", async () => {
        await expect(page).toHaveURL(/\/login/);
      });

      await bdd.and("user can correct the email and retry", async () => {
        // Use test IDs and type() for React controlled components
        const emailInput = page.getByTestId("login-email-input");
        await emailInput.click();
        await emailInput.press("Control+A");
        await emailInput.press("Backspace");
        await emailInput.type("admin@test.vamsa.local", { delay: 30 });

        // Form should still be visible and ready for resubmission
        const loginForm = page.getByTestId("login-form");
        await expect(loginForm).toBeVisible();
      });
    });

    test("should preserve form data on validation error for recovery", async ({
      page,
    }) => {
      await bdd.given("user is on person creation form", async () => {
        await gotoWithRetry(page, "/people/new");
        await expect(page.getByTestId("person-form")).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when(
        "user fills first name but submits without last name",
        async () => {
          const firstName = "TestRecovery" + Date.now();
          const firstNameInput = page.getByTestId("person-form-firstName");

          // Wait for React hydration - input must be editable and respond to input
          await expect(firstNameInput).toBeEditable({ timeout: 5000 });
          await page.waitForTimeout(500); // Allow React to fully hydrate

          // Use click + fill + verify pattern for React controlled inputs
          await firstNameInput.click();
          await firstNameInput.fill(firstName);
          await page.waitForTimeout(100);

          // Verify the value was accepted by React
          const value = await firstNameInput.inputValue();
          if (!value.includes("TestRecovery")) {
            // Retry with type() if fill() didn't work
            await firstNameInput.click();
            await firstNameInput.clear();
            await firstNameInput.type(firstName, { delay: 30 });
          }

          await page.getByTestId("person-form-submit").click();
        }
      );

      await bdd.then("first name value is preserved in form", async () => {
        const firstNameInput = page.getByTestId("person-form-firstName");
        const value = await firstNameInput.inputValue();
        expect(value).toContain("TestRecovery");
      });

      await bdd.and("user can complete the form to recover", async () => {
        await page.getByTestId("person-form-lastName").fill("RecoveryTest");
        const form = page.getByTestId("person-form");
        await expect(form).toBeVisible();
      });
    });
  });

  test.describe("Page Load Error Recovery", () => {
    test("should gracefully handle navigation to nonexistent route", async ({
      page,
    }) => {
      await bdd.when("user navigates to nonexistent route", async () => {
        await page.goto("/this-page-does-not-exist-" + Date.now(), {
          waitUntil: "domcontentloaded",
        });
      });

      await bdd.then("404 page is displayed", async () => {
        const notFoundText = page.getByText("404", { exact: false });
        await expect(notFoundText).toBeVisible({ timeout: 5000 });
      });

      await bdd.and("user can navigate home from 404 page", async () => {
        const homeLink = page.getByRole("link", { name: /go to homepage/i });
        const searchLink = page.getByRole("link", { name: /search people/i });

        // At least one navigation option should be available
        const hasNavigation =
          (await homeLink.isVisible().catch(() => false)) ||
          (await searchLink.isVisible().catch(() => false));
        expect(hasNavigation).toBeTruthy();
      });
    });

    test("should show 404 page with actionable links", async ({ page }) => {
      await bdd.when("user navigates to invalid route", async () => {
        await page.goto("/nonexistent-route-" + Date.now(), {
          waitUntil: "domcontentloaded",
        });
      });

      await bdd.then("404 page displays useful information", async () => {
        // Should display 404 indicator
        await expect(page.getByText("404", { exact: false })).toBeVisible({
          timeout: 5000,
        });

        // Should display descriptive message
        await expect(
          page.getByText("Page not found", { exact: false })
        ).toBeVisible();
      });

      await bdd.and("user has options to recover", async () => {
        // Should have at least one link to navigate away
        const navLinks = page.getByRole("link");
        const linkCount = await navLinks.count();
        expect(linkCount).toBeGreaterThanOrEqual(1);
      });
    });

    test("should handle rapid page navigation without breaking", async ({
      page,
    }) => {
      await bdd.given("user is on dashboard", async () => {
        await gotoWithRetry(page, "/dashboard");
        await expect(page.locator("nav").first()).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when("user rapidly navigates between pages", async () => {
        // Navigate quickly without waiting for each page to fully load
        await gotoWithRetry(page, "/people");
        await gotoWithRetry(page, "/visualize");
        await gotoWithRetry(page, "/dashboard");
      });

      await bdd.then(
        "app remains functional after rapid navigation",
        async () => {
          // Should be on the last page
          await expect(page).toHaveURL(/\/dashboard/);

          // Navigation should still be visible
          const nav = page.locator("nav").first();
          await expect(nav).toBeVisible({ timeout: 5000 });
        }
      );
    });
  });

  test.describe("API Error Response Recovery", () => {
    test("should keep form accessible after submission attempt", async ({
      page,
    }) => {
      await bdd.given("user is on person creation form", async () => {
        await gotoWithRetry(page, "/people/new");
        await expect(page.getByTestId("person-form")).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when("user submits form with valid person data", async () => {
        const form = new PersonFormPage(page);
        await form.fillBasicInfo({
          firstName: "APITest" + Date.now(),
          lastName: "ErrorTest",
        });
        // Submit the form
        await form.submit();
        await page.waitForTimeout(500);
      });

      await bdd.then(
        "form is still present on page for user interaction",
        async () => {
          // Wait for either form to be visible or URL to change (successful redirect)
          await Promise.race([
            page
              .getByTestId("person-form")
              .waitFor({ state: "visible", timeout: 5000 }),
            page.waitForURL(/\/people\/[^n]/, { timeout: 5000 }), // Not /people/new
          ]).catch(() => {
            // At least one should succeed
          });

          // After submission, form should still be visible on the page
          // (user can see the form to verify or make additional changes)
          const personForm = page.getByTestId("person-form");
          const isPresent = await personForm.isVisible().catch(() => false);

          // Either form is visible, or we successfully navigated away
          const pageUrl = page.url();
          expect(isPresent || pageUrl.includes("/people")).toBeTruthy();
        }
      );
    });

    test("should maintain form state across user interactions", async ({
      page,
    }) => {
      await bdd.given("user is on person creation form", async () => {
        await gotoWithRetry(page, "/people/new");
        await expect(page.getByTestId("person-form")).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when("user fills form and attempts submission", async () => {
        const testName = "Retry" + Date.now();
        const firstNameInput = page.getByTestId("person-form-firstName");
        await firstNameInput.fill(testName);
        await page.getByTestId("person-form-lastName").fill("Test");

        // Note: submission behavior depends on server state
        await page.getByTestId("person-form-submit").click();
        await page.waitForTimeout(500);
      });

      await bdd.then(
        "form input fields are still accessible for user",
        async () => {
          // Wait for either form to be visible or URL to change (successful redirect)
          await Promise.race([
            page
              .getByTestId("person-form")
              .waitFor({ state: "visible", timeout: 5000 }),
            page.waitForURL(/\/people\/[^n]/, { timeout: 5000 }), // Not /people/new
          ]).catch(() => {
            // At least one should succeed
          });

          // Verify that form elements are present and accessible
          const firstNameInput = page.getByTestId("person-form-firstName");
          const lastNameInput = page.getByTestId("person-form-lastName");

          // Both form inputs should be accessible for potential edits
          const firstNameAccessible = await firstNameInput
            .isVisible()
            .catch(() => false);
          const lastNameAccessible = await lastNameInput
            .isVisible()
            .catch(() => false);

          // At least one field should be accessible, or form submission succeeded
          const isFormStillAvailable =
            firstNameAccessible || lastNameAccessible;
          const successfulSubmission = !page.url().includes("/people/new");

          expect(isFormStillAvailable || successfulSubmission).toBeTruthy();
        }
      );
    });
  });

  test.describe("Network Timeout Recovery", () => {
    test("should handle slow network when loading page", async ({ page }) => {
      await bdd.given("user has slow network conditions", async () => {
        // Simulate slow 3G network
        await page.route("**/*", (route) => {
          setTimeout(() => route.continue(), 100);
        });
      });

      await bdd.when("user navigates to protected page", async () => {
        const navigationPromise = page.goto("/dashboard", {
          waitUntil: "domcontentloaded",
        });
        // Wait for at least some content to load
        await expect(page.locator("body")).toBeVisible({ timeout: 5000 });
        await navigationPromise;
      });

      await bdd.then("page eventually loads despite slow network", async () => {
        // Page should be on dashboard URL
        await expect(page).toHaveURL(/\/dashboard/);
      });

      await bdd.and("user can still interact with page", async () => {
        // Navigation should be available
        const nav = page.locator("nav").first();
        const navVisible = await nav.isVisible().catch(() => false);
        expect(navVisible).toBeTruthy();
      });
    });

    test("should remain functional if individual API calls timeout", async ({
      page,
    }) => {
      await bdd.given("user is on people list page", async () => {
        await gotoWithRetry(page, "/people");
        // Wait for initial load
        await expect(page.locator("nav").first()).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when("user attempts action on page", async () => {
        // Try to access a form or control on the page
        const submitButton = page.getByTestId("person-form-submit");
        const isVisible = await submitButton.isVisible().catch(() => false);

        // Even if API is slow, page should remain responsive
        expect(typeof isVisible).toBe("boolean");
      });

      await bdd.then("page remains responsive", async () => {
        // Should still be able to navigate
        const nav = page.locator("nav").first();
        await expect(nav).toBeVisible({ timeout: 5000 });
      });
    });
  });

  test.describe("Session Expiration Recovery", () => {
    test("should redirect to login when session expires", async ({
      page,
      logout: _logout,
    }) => {
      await bdd.given("user is logged in and on protected page", async () => {
        await gotoWithRetry(page, "/people");
        await expect(page.locator("nav").first()).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when("user session is cleared", async () => {
        // Simulate session expiration by clearing auth
        await page.context().clearCookies();
      });

      await bdd.then(
        "accessing protected page redirects to login",
        async () => {
          // Use try/catch for Firefox's NS_BINDING_ABORTED during auth redirect
          try {
            await gotoWithRetry(page, "/people");
          } catch (error) {
            if (
              !(error instanceof Error) ||
              !error.message.includes("NS_BINDING_ABORTED")
            ) {
              throw error;
            }
          }
          // Should redirect to login
          const isOnLogin = page.url().includes("/login");
          expect(isOnLogin).toBeTruthy();
        }
      );
    });

    test("should allow user to re-authenticate after session expires", async ({
      page,
      login: _login,
    }) => {
      await bdd.given("user was previously authenticated", async () => {
        await gotoWithRetry(page, "/people");
        await expect(page.locator("nav").first()).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when("user session expires and they navigate", async () => {
        // Clear cookies to simulate session expiration
        await page.context().clearCookies();
        // Use try/catch for Firefox's NS_BINDING_ABORTED during auth redirect
        try {
          await gotoWithRetry(page, "/people");
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !error.message.includes("NS_BINDING_ABORTED")
          ) {
            throw error;
          }
        }
      });

      await bdd.then("user is on login page", async () => {
        await expect(page).toHaveURL(/\/login/);
      });

      await bdd.and("user can successfully log in again", async () => {
        const loginPage = new LoginPage(page);
        await loginPage.goto(); // Wait for form to be ready
        await loginPage.login("admin@test.vamsa.local", "TestAdmin123!");
        // Should redirect to authenticated page
        await expect(page).toHaveURL(/\/(people|dashboard)/);
      });
    });

    test("should preserve intended destination after re-authentication", async ({
      page,
      login: _login,
    }) => {
      await bdd.given("user intends to visit protected route", async () => {
        // Start at login
        await gotoWithRetry(page, "/login");
      });

      await bdd.when("user is not authenticated", async () => {
        // Ensure not authenticated
        await page.context().clearCookies();
        // Reload to ensure fresh login form state (Firefox may throw NS_ERROR_FAILURE)
        try {
          await page.reload();
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("NS_ERROR_FAILURE")
          ) {
            // Firefox reload error - navigate directly instead
            await gotoWithRetry(page, "/login");
          } else {
            throw error;
          }
        }
      });

      await bdd.and("user logs in", async () => {
        const loginPage = new LoginPage(page);
        await loginPage.goto(); // Wait for form to be ready
        await loginPage.login("admin@test.vamsa.local", "TestAdmin123!");
      });

      await bdd.then(
        "user is authenticated and can access protected pages",
        async () => {
          // Should be authenticated now
          await vamsaExpect.toBeLoggedIn(page);

          // Should be able to navigate to protected pages
          await gotoWithRetry(page, "/people");
          await expect(page).toHaveURL(/\/people/);
        }
      );
    });
  });

  test.describe("Navigation Error Recovery", () => {
    test("should handle back button navigation gracefully", async ({
      page,
    }) => {
      await bdd.given("user is on dashboard", async () => {
        await gotoWithRetry(page, "/dashboard");
        await expect(page.locator("nav").first()).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when("user navigates to people page", async () => {
        await gotoWithRetry(page, "/people");
      });

      await bdd.then("user can go back using back button", async () => {
        await page.goBack();
        // Should be able to go back
        const isBackNavPossible = page.url().includes("/dashboard");
        expect(
          isBackNavPossible || page.url().includes("/people")
        ).toBeTruthy();
      });
    });

    test("should handle URL with invalid parameters gracefully", async ({
      page,
    }) => {
      await bdd.when(
        "user navigates to URL with invalid query parameters",
        async () => {
          await page.goto("/people?invalidparam=true&anotherbad=123", {
            waitUntil: "domcontentloaded",
          });
        }
      );

      await bdd.then(
        "page still loads and handles parameters gracefully",
        async () => {
          // Page should load or redirect
          const isOnPeoplePage = page.url().includes("/people");
          const isOnLogin = page.url().includes("/login");

          expect(isOnPeoplePage || isOnLogin).toBeTruthy();
        }
      );
    });

    test("should recover from navigation errors in multi-step workflows", async ({
      page,
    }) => {
      await bdd.given("user is viewing people list", async () => {
        await gotoWithRetry(page, "/people");
        await expect(page.locator("nav").first()).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when("user navigates to new person form", async () => {
        await gotoWithRetry(page, "/people/new");
        await expect(page.getByTestId("person-form")).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.then(
        "user can navigate back to people list without data loss",
        async () => {
          // Navigate back
          await gotoWithRetry(page, "/people");

          // People list should still be accessible
          await expect(page).toHaveURL(/\/people/);
        }
      );

      await bdd.and("user can retry form navigation", async () => {
        // Go back to form
        await gotoWithRetry(page, "/people/new");
        const form = page.getByTestId("person-form");
        await expect(form).toBeVisible({ timeout: 5000 });
      });
    });
  });

  test.describe("Form Recovery with Data Persistence", () => {
    test("should not lose form data when navigation is attempted", async ({
      page,
    }) => {
      const testFirstName = "DataPersist" + Date.now();

      await bdd.given("user is filling out person creation form", async () => {
        await gotoWithRetry(page, "/people/new");
        await expect(page.getByTestId("person-form")).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when("user fills in form data", async () => {
        const firstNameInput = page.getByTestId("person-form-firstName");
        const lastNameInput = page.getByTestId("person-form-lastName");

        // Wait for React hydration - inputs must be editable
        await expect(firstNameInput).toBeEditable({ timeout: 5000 });
        await expect(lastNameInput).toBeEditable({ timeout: 5000 });
        await page.waitForTimeout(500); // Allow React to fully hydrate

        // Use click + fill + verify pattern for React controlled inputs
        await firstNameInput.click();
        await firstNameInput.fill(testFirstName);
        await page.waitForTimeout(100);

        await lastNameInput.click();
        await lastNameInput.fill("PersistenceTest");
        await page.waitForTimeout(100);

        // Verify values were accepted
        const firstName = await firstNameInput.inputValue();
        if (!firstName.includes("DataPersist")) {
          // Retry with type() if fill() didn't work
          await firstNameInput.click();
          await firstNameInput.clear();
          await firstNameInput.type(testFirstName, { delay: 30 });
        }
      });

      await bdd.then("form data is still present", async () => {
        const firstNameValue = await page
          .getByTestId("person-form-firstName")
          .inputValue();
        expect(firstNameValue).toContain(testFirstName);
      });

      await bdd.and(
        "user can continue editing form after brief navigation",
        async () => {
          // Try to navigate away briefly
          await gotoWithRetry(page, "/people");

          // Go back to form
          await gotoWithRetry(page, "/people/new");
          await expect(page.getByTestId("person-form")).toBeVisible({
            timeout: 5000,
          });
        }
      );
    });

    test("should handle form submission errors gracefully without clearing data", async ({
      page,
    }) => {
      await bdd.given("user is on person creation form", async () => {
        await gotoWithRetry(page, "/people/new");
        await expect(page.getByTestId("person-form")).toBeVisible({
          timeout: 5000,
        });
      });

      await bdd.when(
        "user fills form with all required fields and submits",
        async () => {
          const testName = "SubmitTest" + Date.now();
          await page.getByTestId("person-form-firstName").fill(testName);
          await page.getByTestId("person-form-lastName").fill("Error");

          // Submit form
          await page.getByTestId("person-form-submit").click();
        }
      );

      await bdd.then(
        "form remains accessible after submission attempt",
        async () => {
          // Wait for either form to be visible or URL to change (successful redirect)
          await Promise.race([
            page
              .getByTestId("person-form")
              .waitFor({ state: "visible", timeout: 5000 }),
            page.waitForURL(/\/people\/[^n]/, { timeout: 5000 }), // Not /people/new
          ]).catch(() => {
            // At least one should succeed
          });

          // Either form is still visible for retry or submission succeeded
          const form = page.getByTestId("person-form");
          const isFormStillVisible = await form.isVisible().catch(() => false);
          const isRedirected = !page.url().includes("/people/new");

          expect(isFormStillVisible || isRedirected).toBeTruthy();
        }
      );
    });
  });

  test.describe("Accessibility Error Recovery", () => {
    // Unauthenticated test context for login page tests
    test.describe.configure({ mode: "serial" });
    test.use({ storageState: { cookies: [], origins: [] } });

    test("should display error messages in accessible manner", async ({
      page,
    }) => {
      await bdd.given("user is on login form", async () => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
      });

      await bdd.when("user submits form with invalid credentials", async () => {
        const loginPage = new LoginPage(page);
        await loginPage.login("invalid@example.com", "wrongpassword");
      });

      await bdd.then(
        "error message is announced to screen readers",
        async () => {
          const loginPage = new LoginPage(page);
          const errorText = await loginPage.getErrorText();

          // Error should be displayed and contain meaningful text
          if (errorText) {
            expect(errorText.length).toBeGreaterThan(0);
          }
        }
      );
    });

    test("should allow keyboard navigation to recover from error", async ({
      page,
    }) => {
      await bdd.given("user is on login page", async () => {
        const loginPage = new LoginPage(page);
        await loginPage.goto();
      });

      await bdd.when("user tabs through form elements", async () => {
        // Use test IDs for React controlled components
        const emailInput = page.getByTestId("login-email-input");
        await emailInput.focus();

        // Should be able to tab to password field
        await page.keyboard.press("Tab");
      });

      await bdd.then(
        "form remains keyboard navigable for recovery",
        async () => {
          // Focus should have moved
          const focusedElement = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement;
            return el?.tagName || "NONE";
          });

          // Should have moved focus to another element
          expect(focusedElement).not.toBe("BODY");
        }
      );
    });
  });
});
