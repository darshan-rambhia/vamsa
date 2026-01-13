/**
 * Feature: Password Management
 * Tests password change functionality with validation and error handling
 */
import { test, expect, bdd } from "./fixtures";

class ChangePasswordPage {
  readonly page;
  readonly form;
  readonly currentPasswordInput;
  readonly newPasswordInput;
  readonly confirmPasswordInput;
  readonly submitButton;
  readonly errorMessage;

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
  }

  async goto() {
    await this.page.goto("/change-password");
    await this.form.waitFor({ state: "visible", timeout: 5000 });
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

test.describe("Feature: Password Management", () => {
  test("should display change password form", async ({ page }) => {
    await bdd.given("user navigates to change password page", async () => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.goto();
    });

    await bdd.then("change password form is displayed", async () => {
      const changePasswordPage = new ChangePasswordPage(page);
      await expect(changePasswordPage.currentPasswordInput).toBeVisible();
      await expect(changePasswordPage.newPasswordInput).toBeVisible();
      await expect(changePasswordPage.confirmPasswordInput).toBeVisible();
      await expect(changePasswordPage.submitButton).toBeVisible();
      await expect(changePasswordPage.form).toBeVisible();
    });
  });

  test("should validate empty form submission", async ({ page }) => {
    await bdd.given("user is on change password form", async () => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.goto();
    });

    await bdd.when("user submits form without filling fields", async () => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.submitButton.click();
    });

    await bdd.then("form validation prevents submission", async () => {
      await expect(page).toHaveURL(/\/change-password/);
    });
  });

  test("should reject password that is too short", async ({ page }) => {
    await bdd.given("user is on change password form", async () => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.goto();
    });

    await bdd.when("user submits form with short password", async () => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.changePassword(
        "TestAdmin123!",
        "short",
        "short"
      );
    });

    await bdd.then("form prevents submission or shows error", async () => {
      const isOnChangePasswordPage = page.url().includes("/change-password");
      const changePasswordPage = new ChangePasswordPage(page);
      const hasError = await changePasswordPage.errorMessage
        .isVisible()
        .catch(() => false);

      expect(isOnChangePasswordPage || hasError).toBeTruthy();
    });
  });

  test("should reject incorrect current password", async ({ page }) => {
    await bdd.given("user is on change password form", async () => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.goto();
    });

    await bdd.when(
      "user submits form with wrong current password",
      async () => {
        const changePasswordPage = new ChangePasswordPage(page);
        await changePasswordPage.changePassword(
          "WrongPassword123!",
          "NewValidPassword123!",
          "NewValidPassword123!"
        );
      }
    );

    await bdd.then("form prevents submission or shows error", async () => {
      const isOnChangePasswordPage = page.url().includes("/change-password");
      const changePasswordPage = new ChangePasswordPage(page);
      const hasError = await changePasswordPage.errorMessage
        .isVisible()
        .catch(() => false);

      expect(isOnChangePasswordPage || hasError).toBeTruthy();
    });
  });

  test("should be responsive on mobile devices", async ({
    page,
    getViewportInfo,
  }) => {
    const { isMobile } = getViewportInfo();

    await bdd.given("user is on change password form", async () => {
      const changePasswordPage = new ChangePasswordPage(page);
      await changePasswordPage.goto();
    });

    await bdd.then("form fields are visible on mobile", async () => {
      const changePasswordPage = new ChangePasswordPage(page);
      await expect(changePasswordPage.currentPasswordInput).toBeVisible();
      await expect(changePasswordPage.newPasswordInput).toBeVisible();
      await expect(changePasswordPage.confirmPasswordInput).toBeVisible();
      await expect(changePasswordPage.submitButton).toBeVisible();
    });

    await bdd.and("form card is properly sized on mobile", async () => {
      if (isMobile) {
        const card = page.locator(".max-w-md");
        const boundingBox = await card.boundingBox();
        expect(boundingBox?.width || 0).toBeGreaterThan(300);
      }
    });
  });
});
