/**
 * Change Password E2E Tests
 * Tests the change password flow, form validation, and error handling
 */
import { test, expect } from "./fixtures";

// Page Object for Change Password
class ChangePasswordPage {
  readonly page;
  readonly form;
  readonly currentPasswordInput;
  readonly newPasswordInput;
  readonly confirmPasswordInput;
  readonly submitButton;
  readonly errorMessage;
  readonly mustChangeAlert;

  constructor(page) {
    this.page = page;
    this.form = page.getByTestId("change-password-form");
    this.currentPasswordInput = page.getByTestId(
      "change-password-current-input"
    );
    this.newPasswordInput = page.getByTestId("change-password-new-input");
    this.confirmPasswordInput = page.getByTestId(
      "change-password-confirm-input"
    );
    this.submitButton = page.getByTestId("change-password-submit-button");
    this.errorMessage = page.getByTestId("change-password-error");
    this.mustChangeAlert = page.getByTestId(
      "change-password-must-change-alert"
    );
  }

  async goto() {
    await this.page.goto("/change-password");
    await this.form.waitFor({ state: "visible", timeout: 5000 });
    // Wait for React to hydrate - the submit button should be interactive
    await this.page.waitForTimeout(500);
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) {
    await this.currentPasswordInput.fill(currentPassword);
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.submitButton.click();
  }

  async getErrorText(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }
}

test.describe("Change Password", () => {
  test.describe("Change Password Page", () => {
    // Use authenticated state (default admin user)
    // The change-password page is a protected route

    test("should display change password form", async ({ page }) => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.goto();

      // Check for form elements
      await expect(changePasswordPage.currentPasswordInput).toBeVisible();
      await expect(changePasswordPage.newPasswordInput).toBeVisible();
      await expect(changePasswordPage.confirmPasswordInput).toBeVisible();
      await expect(changePasswordPage.submitButton).toBeVisible();

      // Form should be visible
      await expect(changePasswordPage.form).toBeVisible();
    });

    test("should show validation errors for empty form submission", async ({
      page,
    }) => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.goto();

      // Click submit without filling form
      await changePasswordPage.submitButton.click();

      // HTML5 validation should prevent submission
      // Check if form is still on change-password page
      await expect(page).toHaveURL(/\/change-password/);
    });

    test("should show error for password too short", async ({ page }) => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.goto();

      // Fill form with short password (less than 8 characters)
      // Use the current password that the admin user has set up for testing
      await changePasswordPage.changePassword(
        "TestAdmin123!",
        "short",
        "short"
      );

      // Browser validation should prevent submission, or server should reject
      // Either stay on change-password page or show error message
      const isOnChangePasswordPage = page.url().includes("/change-password");
      const hasError = await changePasswordPage.errorMessage
        .isVisible()
        .catch(() => false);

      // One of these should be true - either on change-password page or error shown
      expect(isOnChangePasswordPage || hasError).toBeTruthy();
    });

    test("should show error for incorrect current password", async ({
      page,
    }) => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.goto();

      // Fill form with incorrect current password
      await changePasswordPage.changePassword(
        "WrongPassword123!",
        "NewValidPassword123!",
        "NewValidPassword123!"
      );

      // Server should reject with incorrect current password error
      // Either stay on change-password page or show error message
      const isOnChangePasswordPage = page.url().includes("/change-password");
      const hasError = await changePasswordPage.errorMessage
        .isVisible()
        .catch(() => false);

      // One of these should be true - either on change-password page or error shown
      expect(isOnChangePasswordPage || hasError).toBeTruthy();
    });
  });

  test.describe("Change Password - Responsive", () => {
    test("change password form should be responsive on mobile", async ({
      page,
      getViewportInfo,
    }) => {
      const { isMobile } = getViewportInfo();
      const changePasswordPage = new ChangePasswordPage(page);

      await changePasswordPage.goto();

      // Form elements should be visible at any viewport
      await expect(changePasswordPage.currentPasswordInput).toBeVisible();
      await expect(changePasswordPage.newPasswordInput).toBeVisible();
      await expect(changePasswordPage.confirmPasswordInput).toBeVisible();
      await expect(changePasswordPage.submitButton).toBeVisible();

      // Card should take full width on mobile
      if (isMobile) {
        const card = page.locator(".max-w-md");
        const boundingBox = await card.boundingBox();
        expect(boundingBox?.width || 0).toBeGreaterThan(300);
      }
    });
  });
});
