import { beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { RATE_LIMITS, resetRateLimit } from "./rate-limiter";
import { rateLimitMiddleware } from "./hono-rate-limiter";

describe("Hono Rate Limiter Middleware", () => {
  let app: Hono;

  beforeEach(async () => {
    app = new Hono();

    // Reset rate limits before each test
    await resetRateLimit("login", "127.0.0.1");
    await resetRateLimit("register", "127.0.0.1");
    await resetRateLimit("passwordReset", "127.0.0.1");

    // Setup test route with rate limiting
    app.post("/login", rateLimitMiddleware("login"), (c) => {
      return c.json({ success: true });
    });

    app.post("/register", rateLimitMiddleware("register"), (c) => {
      return c.json({ success: true });
    });

    app.post("/password-reset", rateLimitMiddleware("passwordReset"), (c) => {
      return c.json({ success: true });
    });
  });

  describe("Rate limit headers", () => {
    it("adds X-RateLimit-* headers to successful responses", async () => {
      const req = new Request("http://localhost/login", {
        method: "POST",
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-RateLimit-Limit")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
    });

    it("has correct header values on first request", async () => {
      const req = new Request("http://localhost/login", {
        method: "POST",
        headers: {
          "x-forwarded-for": "192.168.1.100",
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(200);

      const limit = res.headers.get("X-RateLimit-Limit");
      const remaining = res.headers.get("X-RateLimit-Remaining");

      // First request should have limit count as remaining + 1
      expect(parseInt(limit || "0")).toBe(RATE_LIMITS.login.limit);
      expect(parseInt(remaining || "0")).toBe(RATE_LIMITS.login.limit - 1);
    });
  });

  describe("Client IP extraction", () => {
    it("extracts IP from X-Forwarded-For header", async () => {
      const ip = "203.0.113.1";
      let capturedIP: string | undefined;

      const testApp = new Hono();
      testApp.post("/test", rateLimitMiddleware("login"), (c) => {
        capturedIP = c.req.header("x-forwarded-for");
        return c.json({ success: true });
      });

      await testApp.request(
        new Request("http://localhost/test", {
          method: "POST",
          headers: { "x-forwarded-for": ip },
        })
      );

      expect(capturedIP).toBe(ip);
    });

    it("handles X-Forwarded-For with multiple IPs", async () => {
      const ip = "203.0.113.1";
      await resetRateLimit("login", ip);

      const req = new Request("http://localhost/login", {
        method: "POST",
        headers: {
          "x-forwarded-for": `${ip}, 203.0.113.2, 203.0.113.3`,
        },
      });

      // First request should succeed
      let res = await app.request(req);
      expect(res.status).toBe(200);

      // Make requests until we hit the limit
      for (let i = 1; i < RATE_LIMITS.login.limit; i++) {
        res = await app.request(req);
        expect(res.status).toBe(200);
      }

      // Next request should be rate limited
      res = await app.request(req);
      expect(res.status).toBe(429);
    });

    it("extracts IP from X-Real-IP header", async () => {
      const ip = "203.0.113.50";

      const testApp = new Hono();
      testApp.post("/test", rateLimitMiddleware("login"), (c) => {
        return c.json({ success: true });
      });

      await resetRateLimit("login", ip);

      // Make requests with X-Real-IP
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        const res = await testApp.request(
          new Request("http://localhost/test", {
            method: "POST",
            headers: { "x-real-ip": ip },
          })
        );
        expect(res.status).toBe(200);
      }

      // Next should be rate limited
      const res = await testApp.request(
        new Request("http://localhost/test", {
          method: "POST",
          headers: { "x-real-ip": ip },
        })
      );
      expect(res.status).toBe(429);
    });

    it("extracts IP from CF-Connecting-IP header", async () => {
      const ip = "203.0.113.75";

      const testApp = new Hono();
      testApp.post("/test", rateLimitMiddleware("login"), (c) => {
        return c.json({ success: true });
      });

      await resetRateLimit("login", ip);

      // Make requests with CF-Connecting-IP
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        const res = await testApp.request(
          new Request("http://localhost/test", {
            method: "POST",
            headers: { "cf-connecting-ip": ip },
          })
        );
        expect(res.status).toBe(200);
      }

      // Next should be rate limited
      const res = await testApp.request(
        new Request("http://localhost/test", {
          method: "POST",
          headers: { "cf-connecting-ip": ip },
        })
      );
      expect(res.status).toBe(429);
    });
  });

  describe("Rate limit enforcement", () => {
    it("allows requests within limit", async () => {
      const req = new Request("http://localhost/login", {
        method: "POST",
        headers: { "x-forwarded-for": "127.0.0.1" },
      });

      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        const res = await app.request(req);
        expect(res.status).toBe(200);
      }
    });

    it("returns 429 when limit exceeded", async () => {
      const req = new Request("http://localhost/login", {
        method: "POST",
        headers: { "x-forwarded-for": "127.0.0.1" },
      });

      // Use up all attempts
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await app.request(req);
      }

      // Next request should be rate limited
      const res = await app.request(req);
      expect(res.status).toBe(429);
    });

    it("includes Retry-After header in 429 response", async () => {
      const req = new Request("http://localhost/login", {
        method: "POST",
        headers: { "x-forwarded-for": "127.0.0.1" },
      });

      // Use up all attempts
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await app.request(req);
      }

      // Next request should have Retry-After
      const res = await app.request(req);
      expect(res.status).toBe(429);
      const retryAfter = res.headers.get("Retry-After");
      expect(retryAfter).toBeTruthy();
      expect(parseInt(retryAfter || "0")).toBeGreaterThan(0);
    });

    it("includes error details in 429 response body", async () => {
      const req = new Request("http://localhost/login", {
        method: "POST",
        headers: { "x-forwarded-for": "127.0.0.1" },
      });

      // Use up all attempts
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await app.request(req);
      }

      // Next request should have error details
      const res = await app.request(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body).toHaveProperty("error", "Too Many Requests");
      expect(body).toHaveProperty("message");
      expect(body).toHaveProperty("retryAfter");
    });
  });

  describe("Different rate limit actions", () => {
    it("applies different limits to different actions", async () => {
      const loginReq = new Request("http://localhost/login", {
        method: "POST",
        headers: { "x-forwarded-for": "10.0.0.1" },
      });

      const registerReq = new Request("http://localhost/register", {
        method: "POST",
        headers: { "x-forwarded-for": "10.0.0.1" },
      });

      await resetRateLimit("login", "10.0.0.1");
      await resetRateLimit("register", "10.0.0.1");

      // Exhaust login attempts (5)
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        const res = await app.request(loginReq);
        expect(res.status).toBe(200);
      }

      // Login should be blocked
      let res = await app.request(loginReq);
      expect(res.status).toBe(429);

      // Register should still work (only 3 limit)
      for (let i = 0; i < RATE_LIMITS.register.limit; i++) {
        res = await app.request(registerReq);
        expect(res.status).toBe(200);
      }

      // Register should be blocked
      res = await app.request(registerReq);
      expect(res.status).toBe(429);
    });

    it("tracks different IPs separately", async () => {
      const req1 = new Request("http://localhost/login", {
        method: "POST",
        headers: { "x-forwarded-for": "10.1.0.1" },
      });

      const req2 = new Request("http://localhost/login", {
        method: "POST",
        headers: { "x-forwarded-for": "10.1.0.2" },
      });

      await resetRateLimit("login", "10.1.0.1");
      await resetRateLimit("login", "10.1.0.2");

      // Exhaust IP1
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        const res = await app.request(req1);
        expect(res.status).toBe(200);
      }

      // IP1 should be blocked
      let res = await app.request(req1);
      expect(res.status).toBe(429);

      // IP2 should still work
      res = await app.request(req2);
      expect(res.status).toBe(200);
    });
  });

  describe("Rate limit headers in 429 response", () => {
    it("includes all required headers in 429 response", async () => {
      const req = new Request("http://localhost/login", {
        method: "POST",
        headers: { "x-forwarded-for": "127.0.0.2" },
      });

      await resetRateLimit("login", "127.0.0.2");

      // Use up all attempts
      for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
        await app.request(req);
      }

      // Get rate limited response
      const res = await app.request(req);
      expect(res.status).toBe(429);

      // Check all headers present
      expect(res.headers.get("X-RateLimit-Limit")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
      expect(res.headers.get("Retry-After")).toBeTruthy();
    });
  });
});
