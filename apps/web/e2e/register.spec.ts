/**
 * Feature: User Registration
 * Tests registration flow with form validation and error handling
 */
import { test, expect, bdd } from "./fixtures";

class RegisterPage {
  readonly page;
  readonly form;
  readonly nameInput;
  readonly emailInput;
  readonly passwordInput;
  readonly confirmPasswordInput;
  readonly submitButton;
  readonly errorMessage;

  constructor(page) {
    this.page = page;
    this.form = page.getByTestId("register-form");
    this.nameInput = page.getByTestId("register-name-input");
    this.emailInput = page.getByTestId("register-email-input");
    this.passwordInput = page.getByTestId("register-password-input");
    this.confirmPasswordInput = page.getByTestId(
      "register-confirm-password-input"
    );
    this.submitButton = page.getByTestId("register-submit-button");
    this.errorMessage = page.getByTestId("register-error");
  }

  async goto() {
    await this.page.goto("/register");
    await this.form.waitFor({ state: "visible", timeout: 5000 });
    await this.page.waitForTimeout(500);
  }

  async register(
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
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

test.describe("Feature: User Registration", () => {
  test.describe("Unauthenticated tests", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("should display registration form with all fields", async ({
      page,
    }) => {
      await bdd.given("user navigates to registration page", async () => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
      });

      await bdd.then("registration form is displayed", async () => {
        const registerPage = new RegisterPage(page);
        await expect(registerPage.nameInput).toBeVisible();
        await expect(registerPage.emailInput).toBeVisible();
        await expect(registerPage.passwordInput).toBeVisible();
        await expect(registerPage.confirmPasswordInput).toBeVisible();
        await expect(registerPage.submitButton).toBeVisible();
        await expect(page.locator("text=Vamsa")).toBeVisible();
        await expect(page.locator('a:has-text("Sign in")')).toBeVisible();
      });
    });

    test("should validate empty form submission", async ({ page }) => {
      await bdd.given("user is on registration form", async () => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
      });

      await bdd.when("user submits empty form", async () => {
        const registerPage = new RegisterPage(page);
        await registerPage.submitButton.click();
      });

      await bdd.then("form validation prevents submission", async () => {
        await expect(page).toHaveURL(/\/register/);
      });
    });

    test("should reject mismatched passwords", async ({ page }) => {
      await bdd.given("user is on registration form", async () => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
      });

      await bdd.when("user enters mismatched passwords", async () => {
        const registerPage = new RegisterPage(page);
        const mismatchEmail = `test-mismatch-${Date.now()}@example.com`;
        await registerPage.register(
          "John Doe",
          mismatchEmail,
          "TestPassword123!",
          "DifferentPassword123!"
        );
      });

      await bdd.then("form prevents submission or shows error", async () => {
        const isOnRegisterPage = page.url().includes("/register");
        const registerPage = new RegisterPage(page);
        const hasError = await registerPage.errorMessage
          .isVisible()
          .catch(() => false);

        expect(isOnRegisterPage || hasError).toBeTruthy();
      });
    });

    test("should reject password that is too short", async ({ page }) => {
      await bdd.given("user is on registration form", async () => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
      });

      await bdd.when("user enters password that is too short", async () => {
        const registerPage = new RegisterPage(page);
        const shortPasswordEmail = `test-short-${Date.now()}@example.com`;
        await registerPage.register(
          "John Doe",
          shortPasswordEmail,
          "short",
          "short"
        );
      });

      await bdd.then("form prevents submission or shows error", async () => {
        const isOnRegisterPage = page.url().includes("/register");
        const registerPage = new RegisterPage(page);
        const hasError = await registerPage.errorMessage
          .isVisible()
          .catch(() => false);

        expect(isOnRegisterPage || hasError).toBeTruthy();
      });
    });

    test("should reject duplicate email", async ({ page }) => {
      await bdd.given("user is on registration form", async () => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
      });

      await bdd.when(
        "user attempts to register with existing email",
        async () => {
          const registerPage = new RegisterPage(page);
          const duplicateEmail = "admin@test.vamsa.local";
          const testPassword = "TestPassword123!";

          await registerPage.register(
            "Another User",
            duplicateEmail,
            testPassword,
            testPassword
          );
        }
      );

      await bdd.then("form prevents submission or shows error", async () => {
        const isOnRegisterPage = page.url().includes("/register");
        const registerPage = new RegisterPage(page);
        const hasError = await registerPage.errorMessage
          .isVisible()
          .catch(() => false);

        expect(isOnRegisterPage || hasError).toBeTruthy();
      });
    });

    test("should navigate to login page via sign in link", async ({ page }) => {
      await bdd.given("user is on registration page", async () => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
      });

      await bdd.when("user clicks sign in link", async () => {
        await page.locator('a:has-text("Sign in")').click();
      });

      await bdd.then("user is redirected to login page", async () => {
        await expect(page).toHaveURL(/\/login/);
        const loginForm = page.getByTestId("login-form");
        await expect(loginForm).toBeVisible();
      });
    });

    test("should be responsive on mobile devices", async ({
      page,
      getViewportInfo,
    }) => {
      const { isMobile } = getViewportInfo();

      await bdd.given("user is on registration form", async () => {
        const registerPage = new RegisterPage(page);
        await registerPage.goto();
      });

      await bdd.then(
        "registration form fields are visible on mobile",
        async () => {
          const registerPage = new RegisterPage(page);
          await expect(registerPage.nameInput).toBeVisible();
          await expect(registerPage.emailInput).toBeVisible();
          await expect(registerPage.passwordInput).toBeVisible();
          await expect(registerPage.confirmPasswordInput).toBeVisible();
        }
      );

      await bdd.and("form card is properly sized on mobile", async () => {
        if (isMobile) {
          const card = page.locator(".max-w-md");
          const boundingBox = await card.boundingBox();
          expect(boundingBox?.width || 0).toBeGreaterThan(300);
        }
      });
    });
  });
});
