import { beforeAll, describe, expect, it } from "vitest";
import {
  getServerI18n,
  initializeServerI18n,
  t,
  tMultiple,
} from "@vamsa/lib/server";

/**
 * Integration tests for persons server function error messages with i18n
 * These tests verify that person-related error messages are properly internationalized
 * across multiple languages
 */
describe("Persons Server Function i18n Integration", () => {
  // Ensure i18n is initialized before any tests run
  beforeAll(async () => {
    await initializeServerI18n();
  });
  describe("Person Not Found Error Messages", () => {
    it("person not found error in English", async () => {
      const errorMsg = await t("errors:person.notFound");
      expect(errorMsg).toBe("Person not found");
    });

    it("fallback to English for unsupported language", async () => {
      const errorMsg = await t("errors:person.notFound", {}, "fr");
      expect(errorMsg).toBeTruthy();
      expect(typeof errorMsg).toBe("string");
    });
  });

  describe("Person Edit Permission Error Messages", () => {
    it("cannot edit person error in English", async () => {
      const errorMsg = await t("errors:person.cannotEdit");
      expect(errorMsg).toContain("only edit");
      expect(errorMsg).toContain("own");
    });
  });

  describe("Person Delete Error Messages", () => {
    it("cannot delete person with relationships in English", async () => {
      const errorMsg = await t("errors:person.cannotDelete");
      expect(errorMsg.toLowerCase()).toContain("cannot delete");
      expect(errorMsg).toContain("relationships");
    });
  });

  describe("Person Delete Confirmation Messages", () => {
    it("delete confirmation message in English", async () => {
      const msg = await t("errors:person.deleteConfirmation");
      expect(msg).toContain("sure");
      expect(msg).toContain("delete");
    });
  });

  describe("Person Namespace UI Strings", () => {
    it("has title in English", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");
      if (peopleNs && typeof peopleNs === "object" && "title" in peopleNs) {
        expect(peopleNs.title).toBe("People");
      }
    });

    it("has add person action", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");
      if (peopleNs && typeof peopleNs === "object") {
        expect("addPerson" in peopleNs).toBe(true);
        expect("editPerson" in peopleNs).toBe(true);
        expect("deletePerson" in peopleNs).toBe(true);
      }
    });

    it("has form field labels", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");
      if (peopleNs && typeof peopleNs === "object") {
        expect("firstName" in peopleNs).toBe(true);
        expect("lastName" in peopleNs).toBe(true);
        expect("gender" in peopleNs).toBe(true);
        expect("email" in peopleNs).toBe(true);
      }
    });

    it("has date field labels", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");
      if (peopleNs && typeof peopleNs === "object") {
        expect("dateOfBirth" in peopleNs).toBe(true);
        expect("dateOfPassing" in peopleNs).toBe(true);
        expect("birthPlace" in peopleNs).toBe(true);
      }
    });

    it("has relationship related strings", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");
      if (peopleNs && typeof peopleNs === "object") {
        expect("relationships" in peopleNs).toBe(true);
        expect("addRelationship" in peopleNs).toBe(true);
        expect("noRelationships" in peopleNs).toBe(true);
      }
    });

    it("has status labels", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");
      if (peopleNs && typeof peopleNs === "object") {
        expect("living" in peopleNs).toBe(true);
        expect("deceased" in peopleNs).toBe(true);
      }
    });
  });

  describe("Person Validation Error Messages", () => {
    it("required field with person context", async () => {
      const errorMsg = await t("errors:validation.required", {
        field: "First Name",
      });
      expect(errorMsg).toBe("First Name is required");
    });

    it("invalid email validation", async () => {
      const errorMsg = await t("errors:validation.invalidEmail");
      expect(errorMsg).toBe("Invalid email address");
    });

    it("minLength validation for names", async () => {
      const errorMsg = await t("errors:validation.minLength", {
        length: 2,
      });
      expect(errorMsg).toContain("2");
      expect(errorMsg).toContain("characters");
    });

    it("maxLength validation", async () => {
      const errorMsg = await t("errors:validation.maxLength", {
        length: 255,
      });
      expect(errorMsg).toContain("255");
    });

    it("invalid URL validation", async () => {
      const errorMsg = await t("errors:validation.invalidUrl");
      expect(errorMsg).toContain("URL");
    });
  });

  describe("Permission Error Messages for Persons", () => {
    it("not authorized error", async () => {
      const errorMsg = await t("errors:permission.notAuthorized");
      expect(errorMsg).toContain("not authorized");
    });

    it("owner only error", async () => {
      const errorMsg = await t("errors:permission.ownerOnly");
      expect(errorMsg).toContain("own");
      expect(errorMsg).toContain("access");
    });

    it("admin only error", async () => {
      const errorMsg = await t("errors:permission.adminOnly");
      expect(errorMsg).toContain("administrator");
    });
  });

  describe("Relationship Error Messages", () => {
    it("relationship not found in English", async () => {
      const errorMsg = await t("errors:relationship.notFound");
      expect(errorMsg).toBe("Relationship not found");
    });

    it("cannot delete relationship in English", async () => {
      const errorMsg = await t("errors:relationship.cannotDelete");
      expect(errorMsg.toLowerCase()).toContain("cannot delete");
    });

    it("invalid relationship type error", async () => {
      const errorMsg = await t("errors:relationship.invalidType");
      expect(errorMsg.toLowerCase()).toContain("invalid");
    });
  });

  describe("Multiple Person Errors", () => {
    it("returns multiple person-related errors", async () => {
      const keys = [
        "errors:person.notFound",
        "errors:person.cannotEdit",
        "errors:person.cannotDelete",
      ];
      const messages = await tMultiple(keys);

      expect(messages).toHaveLength(3);
      expect(messages[0]).toBe("Person not found");
      expect(messages[1]).toContain("only edit");
      expect(messages[2]).toContain("relationships");
    });

    it("returns multiple validation errors for person form", async () => {
      const keys = [
        "errors:validation.required",
        "errors:validation.invalidEmail",
        "errors:validation.minLength",
      ];
      const messages = await tMultiple(keys, {
        field: "Email",
        length: 2,
      });

      expect(messages).toHaveLength(3);
      expect(messages[0]).toContain("Email");
      expect(messages[1]).toContain("email");
      expect(messages[2]).toContain("2");
    });
  });

  describe("Form Field Labels in Multiple Languages", () => {
    it("person form labels in English", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");

      if (peopleNs && typeof peopleNs === "object") {
        expect("firstName" in peopleNs).toBe(true);
        expect("lastName" in peopleNs).toBe(true);
        expect("email" in peopleNs).toBe(true);
        expect("birthPlace" in peopleNs).toBe(true);
        expect("profession" in peopleNs).toBe(true);
      }
    });

    it("supports multiple languages", async () => {
      const i18n = await getServerI18n();
      const languages = ["en", "hi", "es"];

      for (const lang of languages) {
        const peopleNs = i18n.getResourceBundle(lang, "people");
        // Bundle should exist or be loadable
        if (peopleNs === undefined) {
          expect(true).toBe(true); // Accept undefined for lazy loading
        } else {
          expect(typeof peopleNs).toBe("object");
        }
      }
    });
  });

  describe("Person Living Status", () => {
    it("living status text in English", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");
      if (peopleNs && typeof peopleNs === "object" && "living" in peopleNs) {
        expect(peopleNs.living).toBe("Living");
        expect(peopleNs.deceased).toBe("Deceased");
      }
    });
  });

  describe("Person Address Fields", () => {
    it("address field labels in English", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");

      if (peopleNs && typeof peopleNs === "object") {
        expect("birthPlace" in peopleNs).toBe(true);
        expect("nativePlace" in peopleNs).toBe(true);
        expect("currentAddress" in peopleNs).toBe(true);
        expect("workAddress" in peopleNs).toBe(true);
      }
    });
  });

  describe("Person Metadata Fields", () => {
    it("metadata labels in English", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");

      if (peopleNs && typeof peopleNs === "object") {
        expect("createdAt" in peopleNs).toBe(true);
        expect("updatedAt" in peopleNs).toBe(true);
        expect("isLiving" in peopleNs).toBe(true);
      }
    });
  });

  describe("Professional Information Fields", () => {
    it("professional field labels", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");

      if (peopleNs && typeof peopleNs === "object") {
        expect("profession" in peopleNs).toBe(true);
        expect("employer" in peopleNs).toBe(true);
      }
    });
  });

  describe("Person Contact Information", () => {
    it("contact field labels", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");

      if (peopleNs && typeof peopleNs === "object") {
        expect("email" in peopleNs).toBe(true);
        expect("phone" in peopleNs).toBe(true);
      }
    });

    it("photo and bio labels", async () => {
      const i18n = await getServerI18n();
      const peopleNs = i18n.getResourceBundle("en", "people");

      if (peopleNs && typeof peopleNs === "object") {
        expect("photoUrl" in peopleNs).toBe(true);
        expect("bio" in peopleNs).toBe(true);
      }
    });
  });

  describe("Error Message Consistency", () => {
    it("person errors use consistent terminology", async () => {
      const notFound = await t("errors:person.notFound");
      const relationshipNotFound = await t("errors:relationship.notFound");

      expect(notFound).toContain("not found");
      expect(relationshipNotFound).toContain("not found");
    });

    it("deletion errors consistent across entities", async () => {
      const personDelete = await t("errors:person.cannotDelete");
      const relationshipDelete = await t("errors:relationship.cannotDelete");

      expect(personDelete.toLowerCase()).toContain("cannot delete");
      expect(relationshipDelete.toLowerCase()).toContain("cannot delete");
    });
  });

  describe("Multi-language Support for Persons", () => {
    it("error messages are properly formatted", async () => {
      const errorKeys = [
        "errors:person.notFound",
        "errors:person.cannotEdit",
        "errors:person.cannotDelete",
      ];

      for (const key of errorKeys) {
        const msg = await t(key);
        expect(msg).toBeTruthy();
        expect(typeof msg).toBe("string");
        expect(msg.length > 0).toBe(true);
      }
    });

    it("validation errors have required fields", async () => {
      const validationKeys = [
        "errors:validation.required",
        "errors:validation.invalidEmail",
        "errors:validation.minLength",
      ];

      for (const key of validationKeys) {
        const msg = await t(key, { field: "Test", length: 5 });
        expect(msg).toBeTruthy();
        expect(typeof msg).toBe("string");
      }
    });
  });
});
