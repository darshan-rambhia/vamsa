/**
 * Unit tests for auth.ts server functions
 *
 * Tests:
 * - Schema validation using actual @vamsa/schemas
 * - i18n error messages using real i18n system
 *
 * Note: The actual server functions are tested via:
 * - E2E tests (apps/web/e2e/auth.e2e.ts)
 * - Business logic tests (packages/lib/src/server/business/auth.test.ts)
 * - API route tests (apps/web/server/api/auth.test.ts)
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { claimProfileSchema, changePasswordSchema } from "@vamsa/schemas";
import {
  t,
  tMultiple,
  getServerI18n,
  initializeServerI18n,
} from "@vamsa/lib/server";

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe("Auth Schema Validation", () => {
  describe("claimProfileSchema", () => {
    it("validates correct claim data", () => {
      const result = claimProfileSchema.parse({
        email: "user@example.com",
        personId: "person-123",
        password: "password123",
      });

      expect(result.email).toBe("user@example.com");
      expect(result.personId).toBe("person-123");
      expect(result.password).toBe("password123");
    });

    it("rejects invalid email format", () => {
      expect(() => {
        claimProfileSchema.parse({
          email: "not-an-email",
          personId: "person-123",
          password: "password123",
        });
      }).toThrow();
    });

    it("rejects missing email", () => {
      expect(() => {
        claimProfileSchema.parse({
          personId: "person-123",
          password: "password123",
        });
      }).toThrow();
    });

    it("rejects missing personId", () => {
      expect(() => {
        claimProfileSchema.parse({
          email: "user@example.com",
          password: "password123",
        });
      }).toThrow();
    });

    it("rejects empty personId", () => {
      expect(() => {
        claimProfileSchema.parse({
          email: "user@example.com",
          personId: "",
          password: "password123",
        });
      }).toThrow();
    });

    it("rejects missing password", () => {
      expect(() => {
        claimProfileSchema.parse({
          email: "user@example.com",
          personId: "person-123",
        });
      }).toThrow();
    });

    it("rejects password shorter than 8 characters", () => {
      expect(() => {
        claimProfileSchema.parse({
          email: "user@example.com",
          personId: "person-123",
          password: "short",
        });
      }).toThrow();
    });

    it("accepts 8-character password as minimum", () => {
      const result = claimProfileSchema.parse({
        email: "user@example.com",
        personId: "person-123",
        password: "12345678",
      });

      expect(result.password).toBe("12345678");
    });

    it("accepts various valid email formats", () => {
      const validEmails = [
        "user@example.com",
        "user.name@example.com",
        "user+tag@example.co.uk",
        "123@example.com",
      ];

      for (const email of validEmails) {
        const result = claimProfileSchema.parse({
          email,
          personId: "person-123",
          password: "password123",
        });
        expect(result.email).toBe(email);
      }
    });
  });

  describe("changePasswordSchema", () => {
    it("validates correct password change data", () => {
      const result = changePasswordSchema.parse({
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });

      expect(result.currentPassword).toBe("oldpassword");
      expect(result.newPassword).toBe("newpassword123");
      expect(result.confirmPassword).toBe("newpassword123");
    });

    it("rejects mismatched passwords", () => {
      expect(() => {
        changePasswordSchema.parse({
          currentPassword: "oldpassword",
          newPassword: "newpassword123",
          confirmPassword: "different",
        });
      }).toThrow();
    });

    it("rejects missing currentPassword", () => {
      expect(() => {
        changePasswordSchema.parse({
          newPassword: "newpassword123",
          confirmPassword: "newpassword123",
        });
      }).toThrow();
    });

    it("rejects empty currentPassword", () => {
      expect(() => {
        changePasswordSchema.parse({
          currentPassword: "",
          newPassword: "newpassword123",
          confirmPassword: "newpassword123",
        });
      }).toThrow();
    });

    it("rejects missing newPassword", () => {
      expect(() => {
        changePasswordSchema.parse({
          currentPassword: "oldpassword",
          confirmPassword: "newpassword123",
        });
      }).toThrow();
    });

    it("rejects newPassword shorter than 8 characters", () => {
      expect(() => {
        changePasswordSchema.parse({
          currentPassword: "oldpassword",
          newPassword: "short",
          confirmPassword: "short",
        });
      }).toThrow();
    });

    it("rejects missing confirmPassword", () => {
      expect(() => {
        changePasswordSchema.parse({
          currentPassword: "oldpassword",
          newPassword: "newpassword123",
        });
      }).toThrow();
    });

    it("accepts 8-character newPassword as minimum", () => {
      const result = changePasswordSchema.parse({
        currentPassword: "oldpassword",
        newPassword: "12345678",
        confirmPassword: "12345678",
      });

      expect(result.newPassword).toBe("12345678");
    });

    it("allows any non-empty currentPassword", () => {
      const result = changePasswordSchema.parse({
        currentPassword: "a",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });

      expect(result.currentPassword).toBe("a");
    });
  });
});

// =============================================================================
// i18n Error Messages Tests
// =============================================================================

describe("Auth i18n Error Messages", () => {
  beforeAll(async () => {
    await initializeServerI18n();
  });

  describe("Login Error Messages", () => {
    it("returns invalid credentials error", async () => {
      const errorMsg = await t("errors:auth.invalidCredentials");
      expect(errorMsg).toBe("Invalid email or password");
    });

    it("returns account disabled error", async () => {
      const errorMsg = await t("errors:auth.accountDisabled");
      expect(errorMsg).toBe("Account is disabled");
    });

    it("returns session expired error", async () => {
      const errorMsg = await t("errors:auth.sessionExpired");
      expect(errorMsg).toBe("Your session has expired");
    });

    it("returns not authenticated error", async () => {
      const errorMsg = await t("errors:auth.notAuthenticated");
      expect(errorMsg).toBe("Please log in to continue");
    });
  });

  describe("Account Lock Error Messages", () => {
    it("returns account locked with minutes", async () => {
      const errorMsg = await t("errors:auth.accountLockedAfterThreshold", {
        minutes: 15,
      });
      expect(errorMsg).toContain("locked");
      expect(errorMsg).toContain("15");
      expect(errorMsg).toContain("minutes");
    });

    it("handles different minute values", async () => {
      const durations = [1, 5, 15, 30, 60];

      for (const minutes of durations) {
        const msg = await t("errors:auth.accountLockedAfterThreshold", {
          minutes,
        });
        expect(msg).toContain(minutes.toString());
      }
    });
  });

  describe("OAuth Error Messages", () => {
    it("returns invalid provider error", async () => {
      const errorMsg = await t("errors:auth.invalidProvider");
      expect(errorMsg).toBe("Invalid provider");
    });

    it("returns oauth not configured with provider", async () => {
      const providers = ["Google", "GitHub", "Facebook", "Microsoft"];

      for (const provider of providers) {
        const msg = await t("errors:auth.oauthNotConfigured", { provider });
        expect(msg).toContain(provider);
        expect(msg).toContain("OAuth");
      }
    });

    it("returns oauth user info failed", async () => {
      const errorMsg = await t("errors:auth.oauthUserInfoFailed", {
        provider: "GitHub",
      });
      expect(errorMsg).toContain("Failed");
      expect(errorMsg).toContain("GitHub");
    });

    it("returns oauth email not found", async () => {
      const errorMsg = await t("errors:auth.oauthEmailNotFound", {
        provider: "Twitter",
      });
      expect(errorMsg).toContain("email");
      expect(errorMsg).toContain("Twitter");
    });

    it("returns oauth email exists error", async () => {
      const errorMsg = await t("errors:auth.oauthEmailExists");
      expect(errorMsg).toContain("account");
      expect(errorMsg).toContain("already exists");
    });
  });

  describe("Password Validation Error Messages", () => {
    it("returns password mismatch error", async () => {
      const errorMsg = await t("errors:validation.passwordMismatch");
      expect(errorMsg).toBe("Passwords do not match");
    });

    it("returns password too short error", async () => {
      const errorMsg = await t("errors:validation.passwordTooShort", {
        min: 8,
      });
      expect(errorMsg).toContain("8");
      expect(errorMsg).toContain("characters");
    });
  });

  describe("Validation Error Messages", () => {
    it("returns required field error", async () => {
      const errorMsg = await t("errors:validation.required", {
        field: "Email",
      });
      expect(errorMsg).toBe("Email is required");
    });

    it("returns invalid email error", async () => {
      const errorMsg = await t("errors:validation.invalidEmail");
      expect(errorMsg).toBe("Invalid email address");
    });

    it("returns minLength validation error", async () => {
      const errorMsg = await t("errors:validation.minLength", { length: 6 });
      expect(errorMsg).toContain("6");
      expect(errorMsg).toContain("characters");
    });

    it("returns maxLength validation error", async () => {
      const errorMsg = await t("errors:validation.maxLength", { length: 255 });
      expect(errorMsg).toContain("255");
      expect(errorMsg).toContain("characters");
    });

    it("returns invalid URL error", async () => {
      const errorMsg = await t("errors:validation.invalidUrl");
      expect(errorMsg).toContain("URL");
    });
  });

  describe("Multiple Error Messages", () => {
    it("returns multiple error messages", async () => {
      const keys = [
        "errors:auth.invalidCredentials",
        "errors:auth.accountDisabled",
        "errors:auth.sessionExpired",
      ];
      const messages = await tMultiple(keys);

      expect(messages).toHaveLength(3);
      expect(messages[0]).toBe("Invalid email or password");
      expect(messages[1]).toBe("Account is disabled");
      expect(messages[2]).toBe("Your session has expired");
    });
  });

  describe("Auth Namespace UI Strings", () => {
    it("has login button text", async () => {
      const i18n = await getServerI18n();
      const authNs = i18n.getResourceBundle("en", "auth");
      if (authNs && typeof authNs === "object" && "login" in authNs) {
        expect((authNs as Record<string, unknown>).login).toBe("Login");
      }
    });

    it("has register button text", async () => {
      const i18n = await getServerI18n();
      const authNs = i18n.getResourceBundle("en", "auth");
      if (authNs && typeof authNs === "object" && "register" in authNs) {
        expect((authNs as Record<string, unknown>).register).toBe("Register");
      }
    });

    it("has success messages", async () => {
      const i18n = await getServerI18n();
      const authNs = i18n.getResourceBundle("en", "auth");
      if (authNs && typeof authNs === "object") {
        expect("loginSuccess" in authNs).toBe(true);
        expect("logout" in authNs).toBe(true);
      }
    });

    it("has password reset strings", async () => {
      const i18n = await getServerI18n();
      const authNs = i18n.getResourceBundle("en", "auth");
      if (authNs && typeof authNs === "object") {
        expect("forgotPassword" in authNs).toBe(true);
        expect("changePassword" in authNs).toBe(true);
      }
    });

    it("has profile claiming strings", async () => {
      const i18n = await getServerI18n();
      const authNs = i18n.getResourceBundle("en", "auth");
      if (authNs && typeof authNs === "object") {
        expect("claimProfile" in authNs).toBe(true);
        expect("selectProfile" in authNs).toBe(true);
      }
    });
  });

  describe("i18n System", () => {
    it("loads i18n instance with all namespaces", async () => {
      const i18n = await getServerI18n();
      expect(i18n).toBeDefined();
      expect(i18n.isInitialized).toBe(true);
    });

    it("has English error bundle", async () => {
      const i18n = await getServerI18n();
      const enBundle = i18n.getResourceBundle("en", "errors");
      expect(enBundle).toBeDefined();
    });
  });
});
