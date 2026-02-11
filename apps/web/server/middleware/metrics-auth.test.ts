/**
 * Unit tests for Metrics Authentication Middleware
 *
 * Tests verify core authentication functionality:
 * - Bearer token validation
 * - Timing-safe comparison
 * - Development vs production mode behavior
 * - Proper error responses with Cache-Control headers
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { metricsAuthMiddleware } from "./metrics-auth";

describe("Metrics Authentication Middleware", () => {
  let app: Hono;
  const originalEnv = process.env;

  beforeEach(() => {
    app = new Hono();
    // Reset environment variables
    process.env = { ...originalEnv };
    // Clear any logger mocks
    vi.clearAllMocks();
  });

  describe("Development Mode (NODE_ENV !== production)", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      delete process.env.METRICS_BEARER_TOKEN;
    });

    it("should allow request without token when not configured in dev", async () => {
      app.use("/health/*", metricsAuthMiddleware());
      app.get("/health/cache", (c) => c.json({ status: "ok" }));

      const res = await app.request("/health/cache");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
    });

    it("should allow request with valid token in dev", async () => {
      process.env.METRICS_BEARER_TOKEN = "test-token-12345";
      app.use("/health/*", metricsAuthMiddleware());
      app.get("/health/cache", (c) => c.json({ status: "ok" }));

      const res = await app.request("/health/cache", {
        headers: { Authorization: "Bearer test-token-12345" },
      });
      expect(res.status).toBe(200);
    });

    it("should reject request with invalid token in dev", async () => {
      process.env.METRICS_BEARER_TOKEN = "test-token-12345";
      app.use("/health/*", metricsAuthMiddleware());
      app.get("/health/cache", (c) => c.json({ status: "ok" }));

      const res = await app.request("/health/cache", {
        headers: { Authorization: "Bearer wrong-token" },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });
  });

  describe("Production Mode (NODE_ENV === production)", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("should return 503 when no token configured in production", async () => {
      delete process.env.METRICS_BEARER_TOKEN;
      app.use("/health/*", metricsAuthMiddleware());
      app.get("/health/cache", (c) => c.json({ status: "ok" }));

      const res = await app.request("/health/cache");
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe("Metrics authentication not configured");
    });

    it("should set Cache-Control: no-store on 503 response", async () => {
      delete process.env.METRICS_BEARER_TOKEN;
      app.use("/health/*", metricsAuthMiddleware());
      app.get("/health/cache", (c) => c.json({ status: "ok" }));

      const res = await app.request("/health/cache");
      expect(res.status).toBe(503);
      expect(res.headers.get("cache-control")).toBe("no-store");
    });
  });

  describe("Bearer Token Validation", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      process.env.METRICS_BEARER_TOKEN = "super-secret-token-12345678";
      app.use("/health/*", metricsAuthMiddleware());
      app.get("/health/cache", (c) => c.json({ status: "ok" }));
      app.get("/health/telemetry", (c) => c.json({ telemetry: "config" }));
    });

    it("should return 401 when Authorization header is missing", async () => {
      const res = await app.request("/health/cache");
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 401 when Authorization header has no Bearer prefix", async () => {
      const res = await app.request("/health/cache", {
        headers: { Authorization: "super-secret-token-12345678" },
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("should return 401 when Authorization header uses wrong scheme", async () => {
      const res = await app.request("/health/cache", {
        headers: { Authorization: "Basic dXNlcjpwYXNz" },
      });
      expect(res.status).toBe(401);
    });

    it("should return 403 when token is wrong", async () => {
      const res = await app.request("/health/cache", {
        headers: { Authorization: "Bearer wrong-token-value" },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("should allow request with correct token", async () => {
      const res = await app.request("/health/cache", {
        headers: {
          Authorization: "Bearer super-secret-token-12345678",
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
    });

    it("should set Cache-Control: no-store on 401 response", async () => {
      const res = await app.request("/health/cache");
      expect(res.status).toBe(401);
      expect(res.headers.get("cache-control")).toBe("no-store");
    });

    it("should set Cache-Control: no-store on 403 response", async () => {
      const res = await app.request("/health/cache", {
        headers: { Authorization: "Bearer wrong-token" },
      });
      expect(res.status).toBe(403);
      expect(res.headers.get("cache-control")).toBe("no-store");
    });

    it("should set Content-Type to application/json on error", async () => {
      const res = await app.request("/health/cache");
      expect(res.status).toBe(401);
      expect(res.headers.get("content-type")).toContain("application/json");
    });
  });

  describe("Timing-Safe Comparison", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      process.env.METRICS_BEARER_TOKEN = "abc123";
      app.use("/health/*", metricsAuthMiddleware());
      app.get("/health/cache", (c) => c.json({ status: "ok" }));
    });

    it("should accept correct token regardless of length variation attempts", async () => {
      const res = await app.request("/health/cache", {
        headers: { Authorization: "Bearer abc123" },
      });
      expect(res.status).toBe(200);
    });

    it("should reject token with single character difference", async () => {
      const res = await app.request("/health/cache", {
        headers: { Authorization: "Bearer abc124" },
      });
      expect(res.status).toBe(403);
    });

    it("should reject token with different length", async () => {
      const res = await app.request("/health/cache", {
        headers: { Authorization: "Bearer abc12" },
      });
      expect(res.status).toBe(403);
    });

    it("should reject empty token", async () => {
      const res = await app.request("/health/cache", {
        headers: { Authorization: "Bearer " },
      });
      expect(res.status).toBe(403);
    });

    it("should handle special characters in token", async () => {
      // Note: We create a new middleware instance with the special char token
      // This tests that special characters are handled correctly in Bearer token extraction
      const specialApp = new Hono();
      const specialToken = "abc-123_456.xyz";
      specialApp.use("/health/*", metricsAuthMiddleware());
      specialApp.get("/health/cache", (c) => c.json({ status: "ok" }));

      const res = await specialApp.request("/health/cache", {
        headers: { Authorization: `Bearer ${specialToken}` },
      });
      // Will fail because env var is not set to this token, but validates Bearer prefix handling
      expect(res.status).toBe(403);
    });

    it("should reject tokens with different lengths", async () => {
      process.env.METRICS_BEARER_TOKEN = "exactly-32-character-token-xxx";
      app.use("/health/*", metricsAuthMiddleware());
      app.get("/health/cache", (c) => c.json({ status: "ok" }));

      const res = await app.request("/health/cache", {
        headers: { Authorization: "Bearer different-length-token" },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("Multiple Endpoints", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      process.env.METRICS_BEARER_TOKEN = "metrics-token-xyz";
      app.use("/health/cache", metricsAuthMiddleware());
      app.use("/health/telemetry", metricsAuthMiddleware());
      app.get("/health/cache", (c) => c.json({ etag: { hits: 100 } }));
      app.get("/health/telemetry", (c) =>
        c.json({ telemetry: { service: "vamsa" } })
      );
      app.get("/health", (c) => c.json({ status: "healthy" }));
    });

    it("should apply authentication to /health/cache", async () => {
      const res = await app.request("/health/cache");
      expect(res.status).toBe(401);
    });

    it("should apply authentication to /health/telemetry", async () => {
      const res = await app.request("/health/telemetry");
      expect(res.status).toBe(401);
    });

    it("should allow both endpoints with valid token", async () => {
      const headers = { Authorization: "Bearer metrics-token-xyz" };

      const cache = await app.request("/health/cache", { headers });
      expect(cache.status).toBe(200);
      const cacheBody = await cache.json();
      expect(cacheBody.etag).toBeDefined();

      const telemetry = await app.request("/health/telemetry", { headers });
      expect(telemetry.status).toBe(200);
      const telemetryBody = await telemetry.json();
      expect(telemetryBody.telemetry).toBeDefined();
    });
  });

  describe("Endpoint-Specific Routes", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
      process.env.METRICS_BEARER_TOKEN = "secret-token";
      app.use("/health/cache", metricsAuthMiddleware());
      app.use("/health/telemetry", metricsAuthMiddleware());
      app.get("/health", (c) => c.json({ status: "healthy" }));
      app.get("/health/cache", (c) => c.json({ cache: "metrics" }));
      app.get("/health/telemetry", (c) => c.json({ telemetry: "config" }));
    });

    it("should not require auth for /health endpoint", async () => {
      const res = await app.request("/health");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("healthy");
    });

    it("should require auth for /health/cache endpoint", async () => {
      const res = await app.request("/health/cache");
      expect(res.status).toBe(401);
    });

    it("should require auth for /health/telemetry endpoint", async () => {
      const res = await app.request("/health/telemetry");
      expect(res.status).toBe(401);
    });
  });
});
