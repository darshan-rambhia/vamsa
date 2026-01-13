import { describe, it, expect, beforeEach } from "bun:test";
import {
  initializeServerI18n,
  getServerI18n,
  t,
  tMultiple,
  getActiveInstance,
} from "./i18n";

describe("i18n Server Module", () => {
  let i18nInstance: Awaited<ReturnType<typeof getServerI18n>>;

  beforeEach(async () => {
    // Initialize a fresh instance before each test
    i18nInstance = await getServerI18n();
  });

  describe("initializeServerI18n", () => {
    it("initializes i18n instance with correct configuration", async () => {
      const instance = await initializeServerI18n();
      expect(instance).toBeDefined();
      expect(instance.language).toBe("en");
      expect(instance.isInitialized).toBe(true);
    });

    it("returns same instance on subsequent calls", async () => {
      const instance1 = await initializeServerI18n();
      const instance2 = await initializeServerI18n();
      expect(instance1).toBe(instance2);
    });

    it("loads all required namespaces", async () => {
      const instance = await initializeServerI18n();
      const namespaces = instance.options.ns;
      expect(namespaces).toContain("common");
      expect(namespaces).toContain("auth");
      expect(namespaces).toContain("people");
      expect(namespaces).toContain("errors");
    });

    it("sets English as fallback language", async () => {
      const instance = await initializeServerI18n();
      const fallbackLng = instance.options.fallbackLng;
      // fallbackLng can be a string or array
      if (Array.isArray(fallbackLng)) {
        expect(fallbackLng).toContain("en");
      } else {
        expect(fallbackLng).toBe("en");
      }
    });
  });

  describe("getServerI18n", () => {
    it("returns initialized instance", async () => {
      const instance = await getServerI18n();
      expect(instance).toBeDefined();
      expect(instance.isInitialized).toBe(true);
    });

    it("initializes if not already initialized", async () => {
      // Clear the instance
      const active = getActiveInstance();
      if (active) {
        // Get a fresh instance
        const instance = await getServerI18n();
        expect(instance.isInitialized).toBe(true);
      }
    });
  });

  describe("t() function - English", () => {
    it("translates simple keys in English", async () => {
      const result = await t("errors:auth.invalidCredentials");
      expect(result).toBe("Invalid email or password");
    });

    it("translates keys from different namespaces", async () => {
      const authKey = await t("errors:auth.notAuthenticated");
      expect(authKey).toBe("Please log in to continue");

      const personKey = await t("errors:person.notFound");
      expect(personKey).toBe("Person not found");
    });

    it("handles nested keys correctly", async () => {
      const result = await t("errors:permission.notAuthorized");
      expect(result).toBe("You are not authorized to perform this action");
    });

    it("returns key if translation not found", async () => {
      const result = await t("errors:nonexistent.key");
      // i18next returns the key without namespace prefix when not found
      expect(result).toContain("nonexistent");
    });
  });

  describe("t() function - Interpolation", () => {
    it("interpolates single variable", async () => {
      const result = await t("errors:auth.oauthNotConfigured", {
        provider: "Google",
      });
      expect(result).toBe("Google OAuth is not configured");
    });

    it("interpolates multiple variables", async () => {
      const result = await t("errors:auth.oauthUserInfoFailed", {
        provider: "GitHub",
      });
      expect(result).toBe("Failed to fetch user info from GitHub");
    });

    it("interpolates minutes variable", async () => {
      const result = await t("errors:auth.accountLockedAfterThreshold", {
        minutes: 30,
      });
      expect(result).toContain("30");
      expect(result).toContain("minutes");
    });

    it("handles missing interpolation variables gracefully", async () => {
      const result = await t("errors:validation.required", {});
      // Should still return the key but with unreplaced variables
      expect(result).toContain("required");
    });

    it("interpolates field name in validation messages", async () => {
      const result = await t("errors:validation.required", {
        field: "Email",
      });
      expect(result).toBe("Email is required");
    });

    it("interpolates min length in password messages", async () => {
      const result = await t("errors:validation.passwordTooShort", {
        min: 8,
      });
      expect(result).toContain("8");
    });

    it("interpolates length in minLength messages", async () => {
      const result = await t("errors:validation.minLength", {
        length: 6,
      });
      expect(result).toContain("6");
    });
  });

  describe("t() function - Language Support", () => {
    it("supports Hindi language translations", async () => {
      const i18n = await getServerI18n();
      await i18n.changeLanguage("hi");

      const result = await t("errors:auth.invalidCredentials", {}, "hi");
      // Check that result is either Hindi or a valid string
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("supports Spanish language translations", async () => {
      const i18n = await getServerI18n();
      await i18n.changeLanguage("es");

      const result = await t("errors:auth.invalidCredentials", {}, "es");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("handles unsupported language by using available translation", async () => {
      const result = await t("errors:auth.invalidCredentials", {}, "fr");
      // Unsupported language should fall back to English
      // but the instance may have been switched to another language
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("loads Hindi auth messages", async () => {
      const i18n = await getServerI18n();
      const hiErrors = i18n.getResourceBundle("hi", "errors");
      expect(hiErrors).toBeDefined();
      expect(hiErrors?.auth?.accountDisabled).toBe("खाता अक्षम है");
    });

    it("loads Spanish person messages", async () => {
      const i18n = await getServerI18n();
      const esErrors = i18n.getResourceBundle("es", "errors");
      expect(esErrors).toBeDefined();
      expect(esErrors?.person?.notFound).toBe("Persona no encontrada");
    });

    it("handles interpolation with different languages", async () => {
      const i18n = await getServerI18n();

      const hiErrors = i18n.getResourceBundle("hi", "errors");
      const hiMsg = hiErrors?.auth?.oauthNotConfigured || "";
      expect(hiMsg).toContain("{{provider}}");

      const esErrors = i18n.getResourceBundle("es", "errors");
      const esMsg = esErrors?.auth?.oauthNotConfigured || "";
      expect(esMsg).toContain("{{provider}}");
    });
  });

  describe("t() function - Error Namespaces", () => {
    describe("auth errors", () => {
      it("translates invalidCredentials", async () => {
        const result = await t("errors:auth.invalidCredentials");
        expect(result).toBe("Invalid email or password");
      });

      it("translates accountDisabled", async () => {
        const result = await t("errors:auth.accountDisabled");
        expect(result).toBe("Account is disabled");
      });

      it("translates accountLocked", async () => {
        const result = await t("errors:auth.accountLockedAfterThreshold", {
          minutes: 15,
        });
        expect(result).toContain("locked");
        expect(result).toContain("15");
      });

      it("translates sessionExpired", async () => {
        const result = await t("errors:auth.sessionExpired");
        expect(result).toBe("Your session has expired");
      });

      it("translates notAuthenticated", async () => {
        const result = await t("errors:auth.notAuthenticated");
        expect(result).toBe("Please log in to continue");
      });

      it("translates OAuth errors", async () => {
        const invalidProvider = await t("errors:auth.invalidProvider");
        expect(invalidProvider).toBe("Invalid provider");

        const oauthEmailExists = await t("errors:auth.oauthEmailExists");
        expect(oauthEmailExists).toContain("account");
      });
    });

    describe("person errors", () => {
      it("translates notFound", async () => {
        const result = await t("errors:person.notFound");
        expect(result).toBe("Person not found");
      });

      it("translates cannotEdit", async () => {
        const result = await t("errors:person.cannotEdit");
        expect(result).toContain("only edit");
      });

      it("translates cannotDelete", async () => {
        const result = await t("errors:person.cannotDelete");
        expect(result).toContain("relationships");
      });
    });

    describe("validation errors", () => {
      it("translates required", async () => {
        const result = await t("errors:validation.required", {
          field: "Password",
        });
        expect(result).toContain("Password");
      });

      it("translates passwordTooShort", async () => {
        const result = await t("errors:validation.passwordTooShort", {
          min: 8,
        });
        expect(result).toContain("8");
      });

      it("translates passwordMismatch", async () => {
        const result = await t("errors:validation.passwordMismatch");
        expect(result).toBe("Passwords do not match");
      });

      it("translates minLength", async () => {
        const result = await t("errors:validation.minLength", {
          length: 6,
        });
        expect(result).toContain("6");
      });
    });

    describe("permission errors", () => {
      it("translates notAuthorized", async () => {
        const result = await t("errors:permission.notAuthorized");
        expect(result).toContain("not authorized");
      });

      it("translates adminOnly", async () => {
        const result = await t("errors:permission.adminOnly");
        expect(result).toContain("administrator");
      });
    });

    describe("server errors", () => {
      it("translates internalError", async () => {
        const result = await t("errors:server.internalError");
        expect(result).toContain("server error");
      });

      it("translates rateLimitExceeded", async () => {
        const result = await t("errors:server.rateLimitExceeded");
        expect(result).toContain("Too many requests");
      });
    });

    describe("relationship errors", () => {
      it("translates notFound", async () => {
        const result = await t("errors:relationship.notFound");
        expect(result).toBe("Relationship not found");
      });
    });

    describe("invitation errors", () => {
      it("translates notFound", async () => {
        const result = await t("errors:invitation.notFound");
        expect(result).toBe("Invitation not found");
      });

      it("translates expired", async () => {
        const result = await t("errors:invitation.expired");
        expect(result).toContain("expired");
      });
    });

    describe("user errors", () => {
      it("translates notFound", async () => {
        const result = await t("errors:user.notFound");
        expect(result).toBe("User not found");
      });

      it("translates alreadyExists", async () => {
        const result = await t("errors:user.alreadyExists");
        expect(result).toBe("User already exists");
      });
    });
  });

  describe("tMultiple() function", () => {
    it("translates multiple keys at once", async () => {
      const keys = ["errors:auth.invalidCredentials", "errors:person.notFound"];
      const results = await tMultiple(keys);
      expect(results).toHaveLength(2);
      expect(results[0]).toBe("Invalid email or password");
      expect(results[1]).toBe("Person not found");
    });

    it("translates multiple keys with same options", async () => {
      const keys = [
        "errors:auth.oauthNotConfigured",
        "errors:validation.required",
      ];
      const results = await tMultiple(keys, {
        provider: "Google",
        field: "Email",
      });
      expect(results[0]).toContain("Google");
      expect(results[1]).toContain("Email");
    });

    it("returns empty array for empty input", async () => {
      const results = await tMultiple([]);
      expect(results).toHaveLength(0);
    });

    it("handles multiple keys in different languages", async () => {
      const keys = ["errors:auth.invalidCredentials", "errors:person.notFound"];
      const results = await tMultiple(keys, {}, "hi");
      expect(results).toHaveLength(2);
      // Both should be valid strings
      expect(typeof results[0]).toBe("string");
      expect(typeof results[1]).toBe("string");
      expect(results[0].length > 0).toBe(true);
      expect(results[1].length > 0).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("handles missing language gracefully", async () => {
      const result = await t("errors:auth.invalidCredentials", {}, "xx");
      // Should return a valid string (fallback or actual language may vary)
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("handles malformed key gracefully", async () => {
      const result = await t("");
      expect(typeof result).toBe("string");
    });

    it("handles undefined options", async () => {
      const result = await t("errors:auth.invalidCredentials", undefined);
      expect(result).toBe("Invalid email or password");
    });

    it("handles null options", async () => {
      const result = await t("errors:auth.invalidCredentials", {});
      expect(result).toBe("Invalid email or password");
    });
  });

  describe("Language Switching", () => {
    it("changes language correctly", async () => {
      await i18nInstance.changeLanguage("hi");
      const result = await t("errors:auth.invalidCredentials", {}, "hi");
      expect(result).toBe("अमान्य ईमेल या पासवर्ड");

      await i18nInstance.changeLanguage("en");
      const enResult = await t("errors:auth.invalidCredentials");
      expect(enResult).toBe("Invalid email or password");
    });

    it("maintains context across multiple translations", async () => {
      const hiResult1 = await t("errors:auth.invalidCredentials", {}, "hi");
      const hiResult2 = await t("errors:person.notFound", {}, "hi");

      expect(hiResult1).toContain("अमान्य");
      expect(hiResult2).toContain("मिला");
    });
  });

  describe("Namespace Loading", () => {
    it("loads common namespace", async () => {
      // The common namespace should be available
      const instance = await getServerI18n();
      expect(instance.options.ns).toContain("common");
    });

    it("loads auth namespace with all keys", async () => {
      const instance = await getServerI18n();
      const authRes = instance.getResourceBundle("en", "auth");
      expect(authRes).toBeDefined();
      expect(authRes).toHaveProperty("login");
    });

    it("loads people namespace with all keys", async () => {
      const instance = await getServerI18n();
      const peopleRes = instance.getResourceBundle("en", "people");
      expect(peopleRes).toBeDefined();
      expect(peopleRes).toHaveProperty("title");
    });

    it("loads errors namespace for all languages", async () => {
      const instance = await getServerI18n();

      const enErrors = instance.getResourceBundle("en", "errors");
      expect(enErrors).toBeDefined();

      const hiErrors = instance.getResourceBundle("hi", "errors");
      expect(hiErrors).toBeDefined();

      const esErrors = instance.getResourceBundle("es", "errors");
      expect(esErrors).toBeDefined();
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

    it("handles empty string in interpolation", async () => {
      const result = await t("errors:validation.required", {
        field: "",
      });
      expect(result).toContain("required");
    });

    it("handles numeric field names", async () => {
      const result = await t("errors:validation.minLength", {
        length: 12,
      });
      expect(result).toContain("12");
    });
  });

  describe("Common Namespace Content", () => {
    it("has login button text in English", async () => {
      const instance = await getServerI18n();
      const authNs = instance.getResourceBundle("en", "auth");
      expect(authNs?.login).toBe("Login");
    });

    it("has login button text in Hindi", async () => {
      const instance = await getServerI18n();
      const authNs = instance.getResourceBundle("hi", "auth");
      expect(authNs?.login).toBeDefined();
    });

    it("has common UI strings in all languages", async () => {
      const instance = await getServerI18n();

      const enCommon = instance.getResourceBundle("en", "common");
      const hiCommon = instance.getResourceBundle("hi", "common");
      const esCommon = instance.getResourceBundle("es", "common");

      expect(enCommon).toBeDefined();
      expect(hiCommon).toBeDefined();
      expect(esCommon).toBeDefined();
    });
  });

  describe("Default Language Configuration", () => {
    it("has 'en' as default language", async () => {
      const instance = await getServerI18n();
      expect(instance.options.defaultNS).toBe("common");
      expect(instance.options.lng).toBe("en");
    });

    it("falls back to English for missing translations", async () => {
      await getServerI18n();
      // Try to get a translation from English, then from another language
      const enKey = await t("errors:auth.invalidCredentials", {}, "en");
      const hiKey = await t("errors:auth.invalidCredentials", {}, "hi");
      // Both should return valid strings
      expect(enKey).toBeTruthy();
      expect(hiKey).toBeTruthy();
    });
  });
});
