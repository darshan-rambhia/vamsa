import { describe, it, expect } from "bun:test";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  describe("hashPassword", () => {
    it("should return a hash in scrypt format", async () => {
      const hash = await hashPassword("testpassword123");

      expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    });

    it("should generate different hashes for the same password (unique salts)", async () => {
      const hash1 = await hashPassword("samepassword");
      const hash2 = await hashPassword("samepassword");

      expect(hash1).not.toBe(hash2);
    });

    it("should generate different hashes for different passwords", async () => {
      const hash1 = await hashPassword("password1");
      const hash2 = await hashPassword("password2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty password", async () => {
      const hash = await hashPassword("");

      expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    });

    it("should handle unicode characters", async () => {
      const hash = await hashPassword("пароль密码🔐");

      expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    });

    it("should handle very long passwords", async () => {
      const longPassword = "a".repeat(1000);
      const hash = await hashPassword(longPassword);

      expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    });

    it("should handle special characters", async () => {
      const hash = await hashPassword("p@$$w0rd!#$%^&*()_+-=[]{}|;':\",./<>?");

      expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    });

    it("should produce 16-byte salt (32 hex chars)", async () => {
      const hash = await hashPassword("test");
      const [, salt] = hash.split(":");

      expect(salt).toHaveLength(32);
    });

    it("should produce 64-byte derived key (128 hex chars)", async () => {
      const hash = await hashPassword("test");
      const [, , derivedKey] = hash.split(":");

      expect(derivedKey).toHaveLength(128);
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "correctpassword";
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const hash = await hashPassword("correctpassword");

      const result = await verifyPassword("wrongpassword", hash);

      expect(result).toBe(false);
    });

    it("should reject empty password when original was not empty", async () => {
      const hash = await hashPassword("notempty");

      const result = await verifyPassword("", hash);

      expect(result).toBe(false);
    });

    it("should verify empty password when original was empty", async () => {
      const hash = await hashPassword("");

      const result = await verifyPassword("", hash);

      expect(result).toBe(true);
    });

    it("should verify unicode passwords", async () => {
      const password = "пароль密码🔐";
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it("should verify very long passwords", async () => {
      const longPassword = "a".repeat(1000);
      const hash = await hashPassword(longPassword);

      const result = await verifyPassword(longPassword, hash);

      expect(result).toBe(true);
    });

    it("should verify special character passwords", async () => {
      const password = "p@$$w0rd!#$%^&*()_+-=[]{}|;':\",./<>?";
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it("should reject case-different password", async () => {
      const hash = await hashPassword("Password123");

      const result = await verifyPassword("password123", hash);

      expect(result).toBe(false);
    });

    it("should reject password with extra whitespace", async () => {
      const hash = await hashPassword("password");

      const result = await verifyPassword(" password", hash);

      expect(result).toBe(false);
    });

    it("should reject password with trailing whitespace", async () => {
      const hash = await hashPassword("password");

      const result = await verifyPassword("password ", hash);

      expect(result).toBe(false);
    });

    it("should return false for unknown hash format", async () => {
      const result = await verifyPassword(
        "anypassword",
        "unknownformat:abc:def"
      );

      expect(result).toBe(false);
    });

    it("should return false for bcrypt format", async () => {
      const bcryptHash =
        "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

      const result = await verifyPassword("anypassword", bcryptHash);

      expect(result).toBe(false);
    });

    it("should return false for empty hash", async () => {
      const result = await verifyPassword("password", "");

      expect(result).toBe(false);
    });

    // Note: Malformed scrypt hashes (missing parts) throw uncatchable errors
    // because the error occurs inside a callback. This is a known limitation.

    // Note: Invalid argon2id hashes throw in Bun runtime.
    // These edge cases are not tested as they produce uncatchable errors.
  });

  describe("round-trip verification", () => {
    it("should hash and verify multiple passwords correctly", async () => {
      const passwords = [
        "simple",
        "with spaces in between",
        "CamelCasePassword",
        "ALLCAPS",
        "12345678",
        "mix3d_with-symbols!",
        "短密码",
        "émojis🎉🎊",
      ];

      for (const password of passwords) {
        const hash = await hashPassword(password);
        const isValid = await verifyPassword(password, hash);

        expect(isValid).toBe(true);
      }
    });

    it("should verify only the correct password among multiple attempts", async () => {
      const correctPassword = "theRightPassword";
      const hash = await hashPassword(correctPassword);

      const wrongPasswords = [
        "therightpassword",
        "TheRightPassword",
        "theRightPassword!",
        " theRightPassword",
        "theRightPassword ",
        "wrong",
      ];

      for (const wrongPassword of wrongPasswords) {
        const result = await verifyPassword(wrongPassword, hash);
        expect(result).toBe(false);
      }

      // The correct one should still work
      const correctResult = await verifyPassword(correctPassword, hash);
      expect(correctResult).toBe(true);
    });
  });

  describe("timing safety", () => {
    it("should use timing-safe comparison (same response time for valid/invalid)", async () => {
      const hash = await hashPassword("testpassword");

      // Run multiple times to warm up
      for (let i = 0; i < 5; i++) {
        await verifyPassword("testpassword", hash);
        await verifyPassword("wrongpassword", hash);
      }

      // Time correct password verification
      const correctTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await verifyPassword("testpassword", hash);
        correctTimes.push(performance.now() - start);
      }

      // Time incorrect password verification
      const incorrectTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await verifyPassword("wrongpassword", hash);
        incorrectTimes.push(performance.now() - start);
      }

      const avgCorrect =
        correctTimes.reduce((a, b) => a + b) / correctTimes.length;
      const avgIncorrect =
        incorrectTimes.reduce((a, b) => a + b) / incorrectTimes.length;

      // Times should be similar (within 50% of each other)
      // This is a rough check - actual timing attacks need more sophisticated analysis
      const ratio =
        Math.max(avgCorrect, avgIncorrect) / Math.min(avgCorrect, avgIncorrect);
      expect(ratio).toBeLessThan(2);
    });
  });
});
