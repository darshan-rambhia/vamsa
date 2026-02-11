import { describe, expect, it } from "vitest";
import { getPasswordStrength, passwordSchema } from "./password";

describe("getPasswordStrength", () => {
  it("returns score 0 for empty string", () => {
    const result = getPasswordStrength("");
    expect(result.score).toBe(0);
    expect(result.checks.minLength).toBe(false);
  });

  it("returns score 1 for short password", () => {
    const result = getPasswordStrength("abc");
    expect(result.score).toBe(1);
    expect(result.checks.minLength).toBe(false);
  });

  it("returns score 1 for long password with only 1 class", () => {
    const result = getPasswordStrength("aaaaaaaaaaaaa"); // only lowercase, 13 chars
    expect(result.score).toBe(1);
    expect(result.checks.minLength).toBe(true);
    expect(result.checks.hasLowercase).toBe(true);
    expect(result.checks.hasUppercase).toBe(false);
  });

  it("returns score 2 for 12+ chars with 2 classes", () => {
    const result = getPasswordStrength("abcdefghijkl1"); // lowercase + digit
    expect(result.score).toBe(2);
  });

  it("returns score 3 for 12+ chars with 3 classes", () => {
    const result = getPasswordStrength("Abcdefghijk1"); // upper + lower + digit
    expect(result.score).toBe(3);
  });

  it("returns score 4 for 12+ chars with all 4 classes", () => {
    const result = getPasswordStrength("Abcdefghij1!"); // all 4
    expect(result.score).toBe(4);
  });

  it("detects uppercase letters", () => {
    expect(getPasswordStrength("ABC").checks.hasUppercase).toBe(true);
    expect(getPasswordStrength("abc").checks.hasUppercase).toBe(false);
  });

  it("detects lowercase letters", () => {
    expect(getPasswordStrength("abc").checks.hasLowercase).toBe(true);
    expect(getPasswordStrength("ABC").checks.hasLowercase).toBe(false);
  });

  it("detects digits", () => {
    expect(getPasswordStrength("123").checks.hasDigit).toBe(true);
    expect(getPasswordStrength("abc").checks.hasDigit).toBe(false);
  });

  it("detects special characters", () => {
    expect(getPasswordStrength("!@#").checks.hasSpecial).toBe(true);
    expect(getPasswordStrength("abc").checks.hasSpecial).toBe(false);
  });

  it("treats unicode as special characters", () => {
    expect(getPasswordStrength("üñ🔒").checks.hasSpecial).toBe(true);
  });

  it("treats spaces as special characters", () => {
    expect(getPasswordStrength("hello world").checks.hasSpecial).toBe(true);
  });

  it("provides feedback for each missing requirement", () => {
    const result = getPasswordStrength("abc");
    expect(result.feedback).toContain("Must be at least 12 characters");
    expect(result.feedback).toContain("Add an uppercase letter");
    expect(result.feedback).toContain("Add a number");
    expect(result.feedback).toContain("Add a special character");
  });

  it("provides no feedback for fully compliant password", () => {
    const result = getPasswordStrength("MyPassword1!");
    expect(result.feedback).toHaveLength(0);
  });
});

describe("passwordSchema", () => {
  it("accepts 12+ char password with 3 classes", () => {
    expect(passwordSchema.safeParse("MyPassword12").success).toBe(true); // upper + lower + digit
  });

  it("accepts 12+ char password with all 4 classes", () => {
    expect(passwordSchema.safeParse("MyPassw0rd1!").success).toBe(true);
  });

  it("rejects password shorter than 12 chars", () => {
    const result = passwordSchema.safeParse("Short1!");
    expect(result.success).toBe(false);
  });

  it("rejects password with only 2 classes", () => {
    const result = passwordSchema.safeParse("abcdefghijkl1"); // lower + digit = 2 classes
    expect(result.success).toBe(false);
  });

  it("rejects password longer than 128 chars", () => {
    const result = passwordSchema.safeParse("A".repeat(129));
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = passwordSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("accepts exactly 12 chars with 3 classes", () => {
    expect(passwordSchema.safeParse("Abcdefghij1!").success).toBe(true);
  });

  it("accepts 128 char password with complexity", () => {
    const pw = "Aa1!" + "x".repeat(124);
    expect(passwordSchema.safeParse(pw).success).toBe(true);
  });

  it("accepts passwords with Unicode special chars", () => {
    expect(passwordSchema.safeParse("MyPassword1ü").success).toBe(true); // upper + lower + digit + special(ü)
  });
});
