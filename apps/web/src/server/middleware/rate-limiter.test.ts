import { requestHandler } from "@tanstack/react-start/server";
import { beforeEach, describe, expect, it } from "vitest";
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIP,
  getRateLimitStatus,
  resetRateLimit,
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
    it("allows requests within the limit", async () => {
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await expect(checkRateLimit("login", testIP)).resolves.toBeUndefined();
      }
    });

    it("throws error when limit is exceeded", async () => {
      // Use up all attempts
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await checkRateLimit("login", testIP);
      }

      // Next attempt should fail
      await expect(checkRateLimit("login", testIP)).rejects.toThrow(
        /Too many requests/
      );
    });

    it("uses correct limit for different actions", async () => {
      // Login limit is 5
      for (let i = 0; i < 5; i++) {
        await expect(checkRateLimit("login", testIP)).resolves.toBeUndefined();
      }
      await expect(checkRateLimit("login", testIP)).rejects.toThrow();

      // Register limit is 3
      const registerIP = "192.168.1.2";
      for (let i = 0; i < 3; i++) {
        await expect(
          checkRateLimit("register", registerIP)
        ).resolves.toBeUndefined();
      }
      await expect(checkRateLimit("register", registerIP)).rejects.toThrow();
    });

    it("tracks different IPs separately", async () => {
      const ip1 = "192.168.1.1";
      const ip2 = "192.168.1.2";

      // Use up all attempts for ip1
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await checkRateLimit("login", ip1);
      }

      // ip1 should be blocked
      await expect(checkRateLimit("login", ip1)).rejects.toThrow();

      // ip2 should still work
      await expect(checkRateLimit("login", ip2)).resolves.toBeUndefined();
    });

    it("includes retry-after information in error", async () => {
      // Exhaust rate limit
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await checkRateLimit("login", testIP);
      }

      try {
        await checkRateLimit("login", testIP);
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
    it("returns full limit for new IPs", async () => {
      const status = await getRateLimitStatus("login", "new-ip");
      expect(status.remaining).toBe(RATE_LIMITS.login.limit);
    });

    it("decrements remaining after requests", async () => {
      await checkRateLimit("login", testIP);
      const status = await getRateLimitStatus("login", testIP);
      expect(status.remaining).toBe(RATE_LIMITS.login.limit - 1);
    });

    it("returns 0 remaining when exhausted", async () => {
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await checkRateLimit("login", testIP);
      }
      const status = await getRateLimitStatus("login", testIP);
      expect(status.remaining).toBe(0);
    });
  });

  describe("resetRateLimit", () => {
    it("resets rate limit for a specific action and IP", async () => {
      // Exhaust limit
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await checkRateLimit("login", testIP);
      }

      // Should be blocked
      await expect(checkRateLimit("login", testIP)).rejects.toThrow();

      // Reset
      await resetRateLimit("login", testIP);

      // Should work again
      await expect(checkRateLimit("login", testIP)).resolves.toBeUndefined();
    });

    it("does not affect other actions", async () => {
      // Use some login attempts
      for (let i = 0; i < 3; i++) {
        await checkRateLimit("login", testIP);
      }

      // Use some register attempts
      for (let i = 0; i < 2; i++) {
        await checkRateLimit("register", testIP);
      }

      // Reset login only
      await resetRateLimit("login", testIP);

      // Login should be fresh
      const loginStatus = await getRateLimitStatus("login", testIP);
      expect(loginStatus.remaining).toBe(RATE_LIMITS.login.limit);

      // Register should still have reduced count
      const registerStatus = await getRateLimitStatus("register", testIP);
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

describe("getClientIP (real request-header API)", () => {
  /**
   * Run `fn` inside a real TanStack request context with the given headers.
   * `fn` returns a Response, which requestHandler hands back to the caller.
   */
  function inRequest(
    headers: Record<string, string>,
    fn: () => Promise<Response> | Response
  ) {
    const handler = requestHandler(fn);
    return handler(new Request("http://localhost/api", { headers }), {});
  }

  it("reads the client IP set by the trusted-proxy middleware", async () => {
    const res = await inRequest(
      { "x-vamsa-client-ip": "203.0.113.7" },
      () => new Response(getClientIP())
    );

    expect(await res.text()).toBe("203.0.113.7");
  });

  it("returns 'unknown' when the trusted-proxy header is absent", async () => {
    const res = await inRequest({}, () => new Response(getClientIP()));

    expect(await res.text()).toBe("unknown");
  });

  it("returns 'unknown' outside a request context instead of throwing", () => {
    expect(getClientIP()).toBe("unknown");
  });

  it("gives each client IP its own rate-limit bucket", async () => {
    const attempt = (ip: string) =>
      inRequest({ "x-vamsa-client-ip": ip }, async () => {
        try {
          await checkRateLimit("login", getClientIP());
          return new Response("ok", { status: 200 });
        } catch {
          return new Response("limited", { status: 429 });
        }
      });

    const attackerIP = "198.51.100.10";
    const otherIP = "198.51.100.11";

    // Exhaust the login budget for one client
    for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
      expect((await attempt(attackerIP)).status).toBe(200);
    }
    expect((await attempt(attackerIP)).status).toBe(429);

    // A second client is unaffected
    expect((await attempt(otherIP)).status).toBe(200);
  });
});
