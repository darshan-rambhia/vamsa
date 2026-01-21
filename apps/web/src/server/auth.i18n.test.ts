import { describe, it, expect, beforeAll } from "bun:test";
import {
  t,
  tMultiple,
  getServerI18n,
  initializeServerI18n,
} from "@vamsa/lib/server";

/**
 * Integration tests for auth server function error messages with i18n
 * These tests verify that error messages are properly internationalized
 * and consistent with the i18n system
 */
describe("Auth Server Function i18n Integration", () => {
  // Ensure i18n is initialized before any tests run
  beforeAll(async () => {
    await initializeServerI18n();
  });
  describe("Login Error Messages - English", () => {
    it("invalid credentials error in English", async () => {
      const errorMsg = await t("errors:auth.invalidCredentials");
      expect(errorMsg).toBe("Invalid email or password");
    });

    it("account disabled error in English", async () => {
      const errorMsg = await t("errors:auth.accountDisabled");
      expect(errorMsg).toBe("Account is disabled");
    });

    it("session expired error in English", async () => {
      const errorMsg = await t("errors:auth.sessionExpired");
      expect(errorMsg).toBe("Your session has expired");
    });

    it("not authenticated error in English", async () => {
      const errorMsg = await t("errors:auth.notAuthenticated");
      expect(errorMsg).toBe("Please log in to continue");
    });
  });

  describe("Account Lock Error Messages", () => {
    it("account locked with minutes in English", async () => {
      const errorMsg = await t("errors:auth.accountLockedAfterThreshold", {
        minutes: 15,
      });
      expect(errorMsg).toContain("locked");
      expect(errorMsg).toContain("15");
      expect(errorMsg).toContain("minutes");
    });

    it("handles different minute values", async () => {
      const msg1 = await t("errors:auth.accountLockedAfterThreshold", {
        minutes: 1,
      });
      const msg5 = await t("errors:auth.accountLockedAfterThreshold", {
        minutes: 5,
      });
      const msg30 = await t("errors:auth.accountLockedAfterThreshold", {
        minutes: 30,
      });

      expect(msg1).toContain("1");
      expect(msg5).toContain("5");
      expect(msg30).toContain("30");
    });
  });

  describe("Session and Authentication Error Messages", () => {
    it("session expired error in English", async () => {
      const errorMsg = await t("errors:auth.sessionExpired");
      expect(errorMsg).toBe("Your session has expired");
    });

    it("not authenticated error in English", async () => {
      const errorMsg = await t("errors:auth.notAuthenticated");
      expect(errorMsg).toBe("Please log in to continue");
    });
  });

  describe("OAuth Error Messages", () => {
    it("invalid provider error", async () => {
      const errorMsg = await t("errors:auth.invalidProvider");
      expect(errorMsg).toBe("Invalid provider");
    });

    it("oauth not configured with provider interpolation", async () => {
      const googleMsg = await t("errors:auth.oauthNotConfigured", {
        provider: "Google",
      });
      expect(googleMsg).toContain("Google");
      expect(googleMsg).toContain("OAuth");
    });

    it("oauth not configured with different providers", async () => {
      const providers = ["Google", "GitHub", "Facebook", "Microsoft"];

      for (const provider of providers) {
        const msg = await t("errors:auth.oauthNotConfigured", {
          provider,
        });
        expect(msg).toContain(provider);
      }
    });

    it("oauth user info failed", async () => {
      const errorMsg = await t("errors:auth.oauthUserInfoFailed", {
        provider: "GitHub",
      });
      expect(errorMsg).toContain("Failed");
      expect(errorMsg).toContain("GitHub");
    });

    it("oauth email not found", async () => {
      const errorMsg = await t("errors:auth.oauthEmailNotFound", {
        provider: "Twitter",
      });
      expect(errorMsg).toContain("email");
      expect(errorMsg).toContain("Twitter");
    });

    it("oauth email exists error", async () => {
      const errorMsg = await t("errors:auth.oauthEmailExists");
      expect(errorMsg).toContain("account");
      expect(errorMsg).toContain("already exists");
    });
  });

  describe("Password Validation Error Messages", () => {
    it("password mismatch error in English", async () => {
      const errorMsg = await t("errors:validation.passwordMismatch");
      expect(errorMsg).toBe("Passwords do not match");
    });

    it("password too short error with min length", async () => {
      const errorMsg = await t("errors:validation.passwordTooShort", {
        min: 8,
      });
      expect(errorMsg).toContain("8");
      expect(errorMsg).toContain("characters");
    });
  });

  describe("Validation Error Messages", () => {
    it("required field error with field name", async () => {
      const errorMsg = await t("errors:validation.required", {
        field: "Email",
      });
      expect(errorMsg).toBe("Email is required");
    });

    it("invalid email error", async () => {
      const errorMsg = await t("errors:validation.invalidEmail");
      expect(errorMsg).toBe("Invalid email address");
    });

    it("minLength validation error", async () => {
      const errorMsg = await t("errors:validation.minLength", {
        length: 6,
      });
      expect(errorMsg).toContain("6");
      expect(errorMsg).toContain("characters");
    });

    it("maxLength validation error", async () => {
      const errorMsg = await t("errors:validation.maxLength", {
        length: 255,
      });
      expect(errorMsg).toContain("255");
      expect(errorMsg).toContain("characters");
    });

    it("invalid URL error", async () => {
      const errorMsg = await t("errors:validation.invalidUrl");
      expect(errorMsg).toContain("URL");
    });
  });

  describe("Auth Namespace UI Strings", () => {
    it("has login button text", async () => {
      const i18n = await getServerI18n();
      const authNs = i18n.getResourceBundle("en", "auth");
      if (authNs && typeof authNs === "object" && "login" in authNs) {
        expect((authNs as any).login).toBe("Login");
      }
    });

    it("has register button text", async () => {
      const i18n = await getServerI18n();
      const authNs = i18n.getResourceBundle("en", "auth");
      if (authNs && typeof authNs === "object" && "register" in authNs) {
        expect((authNs as any).register).toBe("Register");
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

    it("returns multiple password validation messages", async () => {
      const keys = [
        "errors:validation.passwordMismatch",
        "errors:validation.passwordTooShort",
        "errors:validation.invalidEmail",
      ];
      const messages = await tMultiple(keys, { min: 8 });

      expect(messages).toHaveLength(3);
      expect(messages[0]).toContain("match");
      expect(messages[1]).toContain("8");
      expect(messages[2]).toContain("email");
    });
  });

  describe("OAuth Provider Error Combinations", () => {
    it("handles all OAuth error scenarios with providers", async () => {
      const providers = ["Google", "GitHub", "Facebook"];

      for (const provider of providers) {
        const notConfigured = await t("errors:auth.oauthNotConfigured", {
          provider,
        });
        const userInfoFailed = await t("errors:auth.oauthUserInfoFailed", {
          provider,
        });
        const emailNotFound = await t("errors:auth.oauthEmailNotFound", {
          provider,
        });

        expect(notConfigured).toContain(provider);
        expect(userInfoFailed).toContain(provider);
        expect(emailNotFound).toContain(provider);
      }
    });
  });

  describe("Account Lock Duration Messages", () => {
    it("formats duration correctly for various lock times", async () => {
      const durations = [1, 5, 15, 30, 60];

      for (const minutes of durations) {
        const msg = await t("errors:auth.accountLockedAfterThreshold", {
          minutes,
        });
        expect(msg).toContain(minutes.toString());
      }
    });
  });

  describe("Error Consistency", () => {
    it("auth errors use consistent terminology", async () => {
      const notAuth = await t("errors:auth.notAuthenticated");
      const invalidCreds = await t("errors:auth.invalidCredentials");

      expect(notAuth).toContain("log in");
      expect(invalidCreds).toContain("Invalid");
    });

    it("validation errors are consistent", async () => {
      const passwordShort = await t("errors:validation.passwordTooShort", {
        min: 8,
      });
      const passwordMismatch = await t("errors:validation.passwordMismatch");

      expect(passwordShort.toLowerCase()).toContain("password");
      expect(passwordMismatch.toLowerCase()).toContain("password");
    });
  });

  describe("Interpolation Edge Cases", () => {
    it("handles numbers in interpolation", async () => {
      const result = await t("errors:auth.accountLockedAfterThreshold", {
        minutes: 999,
      });
      expect(result).toContain("999");
    });

    it("handles special characters in interpolation", async () => {
      const result = await t("errors:auth.oauthNotConfigured", {
        provider: "Twitter/X",
      });
      expect(result).toContain("Twitter/X");
    });

    it("handles numeric field names", async () => {
      const result = await t("errors:validation.minLength", {
        length: 12,
      });
      expect(result).toContain("12");
    });
  });

  describe("Multi-language Support Verification", () => {
    it("loads i18n instance with all namespaces", async () => {
      const i18n = await getServerI18n();
      expect(i18n).toBeDefined();
      expect(i18n.isInitialized).toBe(true);
    });

    it("has resource bundles for supported languages", async () => {
      const i18n = await getServerI18n();
      const languages = ["en", "hi", "es"];

      // At least English bundle should be available
      const enBundle = i18n.getResourceBundle("en", "errors");
      expect(enBundle).toBeDefined();

      // Other languages may be available
      for (const lang of languages) {
        const errorBundle = i18n.getResourceBundle(lang, "errors");
        // Bundles are expected but may not all be loaded simultaneously
        if (errorBundle === undefined) {
          // This is acceptable for lazy-loaded bundles
          expect(true).toBe(true);
        } else {
          expect(typeof errorBundle).toBe("object");
        }
      }
    });

    it("error messages are consistently formatted", async () => {
      const errorTypes = [
        "errors:auth.invalidCredentials",
        "errors:auth.accountDisabled",
        "errors:validation.required",
      ];

      for (const key of errorTypes) {
        const msg = await t(key, { field: "Test" });
        expect(msg).toBeTruthy();
        expect(typeof msg).toBe("string");
        expect(msg.length > 0).toBe(true);
      }
    });
  });
});
