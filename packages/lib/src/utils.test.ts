/**
 * Unit Tests for Utility Functions
 */
import { describe, expect, test } from "bun:test";
import { generateRandomPassword, getInitials } from "./utils";

describe("generateRandomPassword", () => {
  test("generates password with default length", () => {
    const password = generateRandomPassword();
    expect(password.length).toBe(16);
  });

  test("generates password with custom length", () => {
    const password = generateRandomPassword(8);
    expect(password.length).toBe(8);
  });

  test("generates password with long length", () => {
    const password = generateRandomPassword(64);
    expect(password.length).toBe(64);
  });

  test("generates password with minimum length", () => {
    const password = generateRandomPassword(1);
    expect(password.length).toBe(1);
  });

  test("generates different passwords each time", () => {
    const password1 = generateRandomPassword();
    const password2 = generateRandomPassword();
    expect(password1).not.toBe(password2);
  });

  test("contains only valid characters", () => {
    const validChars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const password = generateRandomPassword(100);

    for (const char of password) {
      expect(validChars).toContain(char);
    }
  });

  test("includes variety of character types over multiple generations", () => {
    // Generate many passwords and check we get variety
    const allPasswords = Array.from({ length: 100 }, () =>
      generateRandomPassword(32)
    ).join("");

    // Should have lowercase
    expect(allPasswords).toMatch(/[a-z]/);
    // Should have uppercase
    expect(allPasswords).toMatch(/[A-Z]/);
    // Should have numbers
    expect(allPasswords).toMatch(/[0-9]/);
    // Should have special characters
    expect(allPasswords).toMatch(/[!@#$%^&*]/);
  });
});

describe("getInitials", () => {
  test("returns initials from first and last name", () => {
    expect(getInitials("John", "Doe")).toBe("JD");
  });

  test("returns uppercase initials", () => {
    expect(getInitials("john", "doe")).toBe("JD");
  });

  test("handles mixed case", () => {
    expect(getInitials("jOHN", "dOE")).toBe("JD");
  });

  test("handles single character names", () => {
    expect(getInitials("A", "B")).toBe("AB");
  });

  test("handles names with multiple words", () => {
    // Only takes first character of each parameter
    expect(getInitials("Mary Jane", "Watson")).toBe("MW");
  });

  test("handles names with leading spaces", () => {
    // Spaces at start are treated as first character
    expect(getInitials(" Alice ", " Smith ")).toBe("  "); // Both have leading space
  });

  test("handles accented characters", () => {
    expect(getInitials("Émile", "Müller")).toBe("ÉM");
  });

  test("handles empty first name", () => {
    expect(getInitials("", "Smith")).toBe("S");
  });

  test("handles empty last name", () => {
    expect(getInitials("John", "")).toBe("J");
  });
});
