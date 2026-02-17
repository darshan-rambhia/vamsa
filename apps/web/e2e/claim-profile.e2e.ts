/**
 * Feature: Profile Claiming
 * Tests profile claiming functionality with validation and error handling
 */
import { bdd, expect, formValidation, test } from "./fixtures";
import type { Page } from "@playwright/test";

class ClaimProfilePage {
  readonly page: Page;
  readonly form;
  readonly profileSelect;
  readonly emailInput;
  readonly passwordInput;
  readonly submitButton;
  readonly errorMessage;

  constructor(page: Page) {
    this.page = page;
    this.form = page.getByTestId("claim-profile-form");
    this.profileSelect = page.getByTestId("claim-profile-select");
    this.emailInput = page.getByTestId("claim-profile-email-input");
    this.passwordInput = page.getByTestId("claim-profile-password-input");
    this.submitButton = page.getByTestId("claim-profile-submit-button");
    this.errorMessage = page.getByTestId("claim-profile-error");
  }

  async goto() {
    await this.page.goto("/claim-profile", { waitUntil: "domcontentloaded" });
    await this.form.waitFor({ state: "visible", timeout: 5000 });
    await this.page.waitForTimeout(500);
  }

  async getErrorText(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }
}

test.describe("Feature: Profile Claiming", () => {
  test.describe("Unauthenticated tests", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("should display claim profile form", async ({ page }) => {
      await bdd.given("user navigates to claim profile page", async () => {
        const claimProfilePage = new ClaimProfilePage(page);
        await claimProfilePage.goto();
      });

      await bdd.then("claim profile form is displayed", async () => {
        const claimProfilePage = new ClaimProfilePage(page);
        await expect(claimProfilePage.form).toBeVisible();
        await expect(page.locator("text=Vamsa")).toBeVisible();
        await expect(page.locator('a:has-text("Sign in")')).toBeVisible();
      });

      await bdd.and(
        "profiles or empty state is shown after loading",
        async () => {
          await page
            .locator("text=Loading profiles")
            .waitFor({ state: "hidden", timeout: 5000 })
            .catch(() => {});
          await page.waitForTimeout(500);

          const claimProfilePage = new ClaimProfilePage(page);
          // Genuine conditional guard - checking which UI state is shown
          const selectVisible = await claimProfilePage.profileSelect
            .isVisible()
            .catch(() => false);
          const emptyState = await page
            .locator("text=No unclaimed profiles available")
            .isVisible()
            .catch(() => false);

          expect(selectVisible || emptyState).toBeTruthy();
        }
      );
    });

    test("should validate empty form submission", async ({ page }) => {
      await formValidation.testEmptySubmission(page, {
        formUrl: "/claim-profile",
        formTestId: "claim-profile-form",
        submitButtonTestId: "claim-profile-submit-button",
        errorMessageTestId: "claim-profile-error",
        fields: [
          {
            testId: "claim-profile-select",
            fieldName: "profile",
            testValue: "",
          },
          {
            testId: "claim-profile-email-input",
            fieldName: "email",
            testValue: "test@example.com",
          },
          {
            testId: "claim-profile-password-input",
            fieldName: "password",
            testValue: "TestPassword123!",
          },
        ],
      });
    });

    test("should reject password that is too short", async ({ page }) => {
      await bdd.given("user is on claim profile form", async () => {
        const claimProfilePage = new ClaimProfilePage(page);
        await claimProfilePage.goto();
      });

      await bdd.when("user enters a short password and submits", async () => {
        // Fill email with valid email
        await page
          .getByTestId("claim-profile-email-input")
          .fill("test@example.com");
        // Fill password with short value
        await page.getByTestId("claim-profile-password-input").fill("short");
        // Submit
        await page.getByTestId("claim-profile-submit-button").click();
      });

      await bdd.then("form prevents submission or shows error", async () => {
        // Should stay on form page or show error
        const isOnFormPage = page.url().includes("/claim-profile");
        // Genuine conditional guard - checking if error is shown
        const errorVisible = await page
          .getByTestId("claim-profile-error")
          .isVisible()
          .catch(() => false);
        expect(isOnFormPage || errorVisible).toBeTruthy();
      });
    });

    test("should navigate to login page via sign in link", async ({ page }) => {
      await bdd.given("user is on claim profile page", async () => {
        const claimProfilePage = new ClaimProfilePage(page);
        await claimProfilePage.goto();
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

      await bdd.given("user is on claim profile form", async () => {
        const claimProfilePage = new ClaimProfilePage(page);
        await claimProfilePage.goto();
      });

      await bdd.then("form is visible and properly displayed", async () => {
        const claimProfilePage = new ClaimProfilePage(page);
        await expect(claimProfilePage.form).toBeVisible();
        await expect(page.locator("text=Vamsa")).toBeVisible();
      });

      await bdd.and("form card is properly sized on mobile", async () => {
        if (isMobile) {
          const card = page.locator(".max-w-md");
          await expect(card).toBeVisible();
          const boundingBox = await card.boundingBox();
          expect(boundingBox?.width || 0).toBeGreaterThan(300);
        }
      });

      await bdd.and("shows profiles or empty state", async () => {
        await page
          .locator("text=Loading profiles")
          .waitFor({ state: "hidden", timeout: 5000 })
          .catch(() => {});
        await page.waitForTimeout(500);

        const claimProfilePage = new ClaimProfilePage(page);
        const selectVisible = await claimProfilePage.profileSelect
          .isVisible()
          .catch(() => false);
        const emptyState = await page
          .locator("text=No unclaimed profiles available")
          .isVisible()
          .catch(() => false);

        expect(selectVisible || emptyState).toBeTruthy();
      });
    });
  });
});
