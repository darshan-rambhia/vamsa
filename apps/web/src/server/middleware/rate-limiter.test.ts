import { describe, it, expect, beforeEach } from "bun:test";
import {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  RATE_LIMITS,
} from "./rate-limiter";

describe("Rate Limiter", () => {
  const testIP = "192.168.1.1";

  beforeEach(() => {
    // Reset rate limit before each test
    resetRateLimit("login", testIP);
    resetRateLimit("register", testIP);
    resetRateLimit("claimProfile", testIP);
  });

  describe("checkRateLimit", () => {
    it("allows requests within the limit", () => {
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        expect(() => checkRateLimit("login", testIP)).not.toThrow();
      }
    });

    it("throws error when limit is exceeded", () => {
      // Use up all attempts
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        checkRateLimit("login", testIP);
      }

      // Next attempt should fail
      expect(() => checkRateLimit("login", testIP)).toThrow(
        /Too many requests/
      );
    });

    it("uses correct limit for different actions", () => {
      // Login limit is 5
      for (let i = 0; i < 5; i++) {
        expect(() => checkRateLimit("login", testIP)).not.toThrow();
      }
      expect(() => checkRateLimit("login", testIP)).toThrow();

      // Register limit is 3
      const registerIP = "192.168.1.2";
      for (let i = 0; i < 3; i++) {
        expect(() => checkRateLimit("register", registerIP)).not.toThrow();
      }
      expect(() => checkRateLimit("register", registerIP)).toThrow();
    });

    it("tracks different IPs separately", () => {
      const ip1 = "192.168.1.1";
      const ip2 = "192.168.1.2";

      // Use up all attempts for ip1
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        checkRateLimit("login", ip1);
      }

      // ip1 should be blocked
      expect(() => checkRateLimit("login", ip1)).toThrow();

      // ip2 should still work
      expect(() => checkRateLimit("login", ip2)).not.toThrow();
    });

    it("includes retry-after information in error", () => {
      // Exhaust rate limit
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        checkRateLimit("login", testIP);
      }

      try {
        checkRateLimit("login", testIP);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/try again in \d+ seconds/);
        expect((error as Error & { statusCode?: number }).statusCode).toBe(429);
        expect(
          (error as Error & { retryAfter?: number }).retryAfter
        ).toBeGreaterThan(0);
      }
    });
  });

  describe("getRateLimitStatus", () => {
    it("returns full limit for new IPs", () => {
      const status = getRateLimitStatus("login", "new-ip");
      expect(status.remaining).toBe(RATE_LIMITS.login.limit);
    });

    it("decrements remaining after requests", () => {
      checkRateLimit("login", testIP);
      const status = getRateLimitStatus("login", testIP);
      expect(status.remaining).toBe(RATE_LIMITS.login.limit - 1);
    });

    it("returns 0 remaining when exhausted", () => {
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        checkRateLimit("login", testIP);
      }
      const status = getRateLimitStatus("login", testIP);
      expect(status.remaining).toBe(0);
    });
  });

  describe("resetRateLimit", () => {
    it("resets rate limit for a specific action and IP", () => {
      // Exhaust limit
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        checkRateLimit("login", testIP);
      }

      // Should be blocked
      expect(() => checkRateLimit("login", testIP)).toThrow();

      // Reset
      resetRateLimit("login", testIP);

      // Should work again
      expect(() => checkRateLimit("login", testIP)).not.toThrow();
    });

    it("does not affect other actions", () => {
      // Use some login attempts
      for (let i = 0; i < 3; i++) {
        checkRateLimit("login", testIP);
      }

      // Use some register attempts
      for (let i = 0; i < 2; i++) {
        checkRateLimit("register", testIP);
      }

      // Reset login only
      resetRateLimit("login", testIP);

      // Login should be fresh
      const loginStatus = getRateLimitStatus("login", testIP);
      expect(loginStatus.remaining).toBe(RATE_LIMITS.login.limit);

      // Register should still have reduced count
      const registerStatus = getRateLimitStatus("register", testIP);
      expect(registerStatus.remaining).toBe(RATE_LIMITS.register.limit - 2);
    });
  });

  describe("RATE_LIMITS configuration", () => {
    it("has correct login limits", () => {
      expect(RATE_LIMITS.login.limit).toBe(5);
      expect(RATE_LIMITS.login.windowMs).toBe(60 * 1000); // 1 minute
    });

    it("has correct register limits", () => {
      expect(RATE_LIMITS.register.limit).toBe(3);
      expect(RATE_LIMITS.register.windowMs).toBe(60 * 60 * 1000); // 1 hour
    });

    it("has correct claimProfile limits", () => {
      expect(RATE_LIMITS.claimProfile.limit).toBe(10);
      expect(RATE_LIMITS.claimProfile.windowMs).toBe(60 * 60 * 1000); // 1 hour
    });

    it("has correct search limits", () => {
      expect(RATE_LIMITS.search.limit).toBe(30);
      expect(RATE_LIMITS.search.windowMs).toBe(60 * 1000); // 1 minute
    });

    it("has correct api limits", () => {
      expect(RATE_LIMITS.api.limit).toBe(100);
      expect(RATE_LIMITS.api.windowMs).toBe(60 * 1000); // 1 minute
    });
  });
});
