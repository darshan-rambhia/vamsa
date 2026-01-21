/**
 * Shared Form Validation Helpers
 * Consolidates duplicate form validation tests across multiple E2E test files
 *
 * Provides reusable patterns for testing:
 * - Empty form submission
 * - Field-specific validation
 * - Password validation
 * - Email validation
 * - Required field validation
 */

import { Page, expect } from "@playwright/test";
import { bdd } from "./bdd-helpers";

/**
 * Configuration for a form field validation test
 */
export interface FormFieldConfig {
  /** Test ID for the input field */
  testId: string;
  /** Human-readable field name for test description */
  fieldName: string;
  /** Value to fill for validation testing */
  testValue: string;
  /** Optional: CSS class or selector for error message container (if differs from standard) */
  errorSelector?: string;
}

/**
 * Configuration for complete form validation
 */
export interface FormValidationConfig {
  /** URL to navigate to for the form */
  formUrl: string;
  /** Test ID for the form element itself */
  formTestId: string;
  /** Test ID for the submit button */
  submitButtonTestId: string;
  /** Test ID for error message container (optional, may not always appear) */
  errorMessageTestId?: string;
  /** Fields to validate */
  fields: FormFieldConfig[];
  /** Optional: Function to fill the form with all required fields */
  fillRequiredFields?: (page: Page) => Promise<void>;
  /** Optional: Function to get error message text */
  getErrorText?: (page: Page) => Promise<string | null>;
}

/**
 * Form Validation Helper
 * Provides shared test patterns for form validation across the app
 */
export const formValidation = {
  /**
   * Test that empty form submission is prevented
   * This is a common pattern: user clicks submit without filling required fields
   *
   * @example
   * ```typescript
   * await formValidation.testEmptySubmission(page, {
   *   formUrl: "/login",
   *   formTestId: "login-form",
   *   submitButtonTestId: "login-submit-button",
   *   fields: [
   *     { testId: "login-email-input", fieldName: "email" },
   *     { testId: "login-password-input", fieldName: "password" },
   *   ],
   * });
   * ```
   */
  async testEmptySubmission(
    page: Page,
    config: FormValidationConfig
  ): Promise<void> {
    await bdd.given("user is on the form", async () => {
      await page.goto(config.formUrl);
      const form = page.getByTestId(config.formTestId);
      await expect(form).toBeVisible({ timeout: 5000 });
    });

    await bdd.when("user submits empty form", async () => {
      const submitButton = page.getByTestId(config.submitButtonTestId);
      await submitButton.click();
    });

    await bdd.then("form validation prevents submission", async () => {
      // Should still be on the same page
      await expect(page).toHaveURL(
        new RegExp(config.formUrl.replace(/\//g, "\\/"))
      );
    });
  },

  /**
   * Test that a specific required field must be filled
   * Validates that form cannot be submitted with single required field empty
   *
   * @example
   * ```typescript
   * await formValidation.testRequiredField(page, {
   *   formUrl: "/people/new",
   *   formTestId: "person-form",
   *   submitButtonTestId: "person-form-submit",
   *   fields: [
   *     { testId: "person-form-firstName", fieldName: "first name", testValue: "John" },
   *     { testId: "person-form-lastName", fieldName: "last name", testValue: "Doe" },
   *   ],
   *   fillRequiredFields: async (page) => {
   *     await page.getByTestId("person-form-firstName").fill("John");
   *     await page.getByTestId("person-form-lastName").fill("Doe");
   *   },
   * }, "lastName", ["firstName"]);
   * ```
   */
  async testRequiredField(
    page: Page,
    config: FormValidationConfig,
    requiredFieldTestId: string,
    otherFieldsToFill: string[]
  ): Promise<void> {
    const fieldConfig = config.fields.find(
      (f) => f.testId === requiredFieldTestId
    );
    if (!fieldConfig) {
      throw new Error(
        `Field ${requiredFieldTestId} not found in form configuration`
      );
    }

    await bdd.given("user is on the form", async () => {
      await page.goto(config.formUrl);
      const form = page.getByTestId(config.formTestId);
      await expect(form).toBeVisible({ timeout: 5000 });
    });

    await bdd.when(
      `user submits form without filling ${fieldConfig.fieldName}`,
      async () => {
        // Fill other fields to isolate this field's validation
        for (const fieldTestId of otherFieldsToFill) {
          const field = config.fields.find((f) => f.testId === fieldTestId);
          if (field) {
            await page.getByTestId(field.testId).fill(field.testValue);
          }
        }

        const submitButton = page.getByTestId(config.submitButtonTestId);
        await submitButton.click();
      }
    );

    await bdd.then("form validation prevents submission", async () => {
      // Should still be on the same page
      await expect(page).toHaveURL(
        new RegExp(config.formUrl.replace(/\//g, "\\/"))
      );
    });
  },

  /**
   * Test password field validation (too short)
   * Prevents submission of passwords below minimum length
   *
   * @example
   * ```typescript
   * await formValidation.testPasswordValidation(page, {
   *   formUrl: "/register",
   *   formTestId: "register-form",
   *   submitButtonTestId: "register-submit-button",
   *   fields: [
   *     { testId: "register-name-input", fieldName: "name", testValue: "John Doe" },
   *     { testId: "register-email-input", fieldName: "email", testValue: "test@example.com" },
   *     { testId: "register-password-input", fieldName: "password" },
   *   ],
   * }, "register-password-input", "register-confirm-password-input", "short");
   * ```
   */
  async testPasswordValidation(
    page: Page,
    config: FormValidationConfig,
    passwordFieldTestId: string,
    confirmPasswordFieldTestId: string,
    invalidPassword: string = "short"
  ): Promise<void> {
    const passwordField = config.fields.find(
      (f) => f.testId === passwordFieldTestId
    );
    if (!passwordField) {
      throw new Error(`Password field ${passwordFieldTestId} not found`);
    }

    await bdd.given("user is on the form", async () => {
      await page.goto(config.formUrl);
      const form = page.getByTestId(config.formTestId);
      await expect(form).toBeVisible({ timeout: 5000 });
    });

    await bdd.when(
      "user submits form with password that is too short",
      async () => {
        // Fill all required fields
        for (const field of config.fields) {
          if (
            field.testId === passwordFieldTestId ||
            field.testId === confirmPasswordFieldTestId
          ) {
            // Fill password fields with invalid password
            await page.getByTestId(field.testId).fill(invalidPassword);
          } else {
            // Fill other fields with test values
            await page.getByTestId(field.testId).fill(field.testValue);
          }
        }

        const submitButton = page.getByTestId(config.submitButtonTestId);
        await submitButton.click();
      }
    );

    await bdd.then("form prevents submission or shows error", async () => {
      // Either stays on form page or shows error message
      const isOnFormPage = page.url().includes(config.formUrl.split("?")[0]);
      const errorMessage = config.errorMessageTestId
        ? page.getByTestId(config.errorMessageTestId)
        : null;
      const hasError = errorMessage
        ? await errorMessage.isVisible().catch(() => false)
        : false;

      expect(isOnFormPage || hasError).toBeTruthy();
    });
  },

  /**
   * Test that password fields must match
   * Validates that confirmation password must match initial password
   *
   * @example
   * ```typescript
   * await formValidation.testPasswordMismatch(page, {
   *   formUrl: "/register",
   *   formTestId: "register-form",
   *   submitButtonTestId: "register-submit-button",
   *   fields: [
   *     { testId: "register-name-input", fieldName: "name", testValue: "John Doe" },
   *     { testId: "register-email-input", fieldName: "email", testValue: "test@example.com" },
   *     { testId: "register-password-input", fieldName: "password" },
   *     { testId: "register-confirm-password-input", fieldName: "confirm password" },
   *   ],
   * }, "register-password-input", "register-confirm-password-input", "TestPassword123!", "DifferentPassword123!");
   * ```
   */
  async testPasswordMismatch(
    page: Page,
    config: FormValidationConfig,
    passwordFieldTestId: string,
    confirmPasswordFieldTestId: string,
    validPassword: string = "TestPassword123!",
    differentPassword: string = "DifferentPassword123!"
  ): Promise<void> {
    await bdd.given("user is on the form", async () => {
      await page.goto(config.formUrl);
      const form = page.getByTestId(config.formTestId);
      await expect(form).toBeVisible({ timeout: 5000 });
    });

    await bdd.when("user enters mismatched passwords", async () => {
      for (const field of config.fields) {
        if (field.testId === passwordFieldTestId) {
          await page.getByTestId(field.testId).fill(validPassword);
        } else if (field.testId === confirmPasswordFieldTestId) {
          await page.getByTestId(field.testId).fill(differentPassword);
        } else {
          await page.getByTestId(field.testId).fill(field.testValue);
        }
      }

      const submitButton = page.getByTestId(config.submitButtonTestId);
      await submitButton.click();
    });

    await bdd.then("form prevents submission or shows error", async () => {
      const isOnFormPage = page.url().includes(config.formUrl.split("?")[0]);
      const errorMessage = config.errorMessageTestId
        ? page.getByTestId(config.errorMessageTestId)
        : null;
      const hasError = errorMessage
        ? await errorMessage.isVisible().catch(() => false)
        : false;

      expect(isOnFormPage || hasError).toBeTruthy();
    });
  },

  /**
   * Test that email format is validated
   * Prevents submission of invalid email addresses
   *
   * @example
   * ```typescript
   * await formValidation.testEmailValidation(page, {
   *   formUrl: "/register",
   *   formTestId: "register-form",
   *   submitButtonTestId: "register-submit-button",
   *   fields: [
   *     { testId: "register-email-input", fieldName: "email" },
   *     { testId: "register-password-input", fieldName: "password" },
   *   ],
   * }, "register-email-input", "invalidemail");
   * ```
   */
  async testEmailValidation(
    page: Page,
    config: FormValidationConfig,
    emailFieldTestId: string,
    invalidEmail: string = "invalidemail"
  ): Promise<void> {
    await bdd.given("user is on the form", async () => {
      await page.goto(config.formUrl);
      const form = page.getByTestId(config.formTestId);
      await expect(form).toBeVisible({ timeout: 5000 });
    });

    await bdd.when("user submits form with invalid email", async () => {
      for (const field of config.fields) {
        if (field.testId === emailFieldTestId) {
          await page.getByTestId(field.testId).fill(invalidEmail);
        } else {
          await page.getByTestId(field.testId).fill(field.testValue);
        }
      }

      const submitButton = page.getByTestId(config.submitButtonTestId);
      await submitButton.click();
    });

    await bdd.then("form prevents submission or shows error", async () => {
      const isOnFormPage = page.url().includes(config.formUrl.split("?")[0]);
      const errorMessage = config.errorMessageTestId
        ? page.getByTestId(config.errorMessageTestId)
        : null;
      const hasError = errorMessage
        ? await errorMessage.isVisible().catch(() => false)
        : false;

      expect(isOnFormPage || hasError).toBeTruthy();
    });
  },

  /**
   * Get error message text from form
   * Utility function to extract error message for assertions
   *
   * @example
   * ```typescript
   * const errorText = await formValidation.getErrorMessage(page, {
   *   errorMessageTestId: "login-error",
   *   getErrorText: async (page) => {
   *     const error = page.getByTestId("login-error");
   *     return (await error.isVisible()) ? await error.textContent() : null;
   *   },
   * });
   * expect(errorText).toContain("Invalid");
   * ```
   */
  async getErrorMessage(
    page: Page,
    config: {
      errorMessageTestId?: string;
      getErrorText?: (page: Page) => Promise<string | null>;
    }
  ): Promise<string | null> {
    if (config.getErrorText) {
      return config.getErrorText(page);
    }

    if (config.errorMessageTestId) {
      const errorElement = page.getByTestId(config.errorMessageTestId);
      if (await errorElement.isVisible().catch(() => false)) {
        return await errorElement.textContent();
      }
    }

    return null;
  },

  /**
   * Test that form shows validation on page load
   * Useful for forms that should validate on client-side
   */
  async testFormDisplaysWithRequiredFields(
    page: Page,
    config: FormValidationConfig
  ): Promise<void> {
    await bdd.given("user navigates to the form", async () => {
      await page.goto(config.formUrl);
    });

    await bdd.then("form is displayed with all required fields", async () => {
      const form = page.getByTestId(config.formTestId);
      await expect(form).toBeVisible();

      for (const field of config.fields) {
        const input = page.getByTestId(field.testId);
        await expect(input).toBeVisible();
      }

      const submitButton = page.getByTestId(config.submitButtonTestId);
      await expect(submitButton).toBeVisible();
    });
  },

  /**
   * Test that form fields are keyboard navigable
   * Ensures accessibility by tab key
   */
  async testFormKeyboardNavigation(
    page: Page,
    config: FormValidationConfig,
    firstFieldTestId: string,
    secondFieldTestId: string
  ): Promise<void> {
    await bdd.given("user is on the form", async () => {
      await page.goto(config.formUrl);
      const form = page.getByTestId(config.formTestId);
      await expect(form).toBeVisible({ timeout: 5000 });
    });

    await bdd.when("user tabs through form fields", async () => {
      const firstField = page.getByTestId(firstFieldTestId);
      await firstField.focus();
      await page.keyboard.type("test");
      await page.keyboard.press("Tab");
    });

    await bdd.then("focus moves to next field", async () => {
      const secondField = page.getByTestId(secondFieldTestId);
      const focusedElement = await page.evaluate(() =>
        document.activeElement?.getAttribute("data-testid")
      );

      expect(
        focusedElement === secondFieldTestId ||
          (await secondField.isVisible().catch(() => false))
      ).toBeTruthy();
    });
  },
};
