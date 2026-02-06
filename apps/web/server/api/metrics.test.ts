/**
 * Integration tests for Metrics API endpoints
 *
 * These tests use the real API without mocking shared modules
 * to avoid mock leaking issues between test files.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SLOW_QUERY_LOG_THRESHOLD_MS,
  clearSlowQueries,
} from "../metrics/slow-query-logger";
import apiV1 from "./index";

// Note: LOG_LEVEL=error is used in test command to silence logger warnings

describe("Metrics API", () => {
  beforeEach(() => {
    clearSlowQueries();
  });

  afterEach(() => {
    clearSlowQueries();
  });

  it("GET /api/v1/metrics/slow-queries returns list and threshold", async () => {
    const res = await apiV1.request("/metrics/slow-queries?limit=5");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("count");
    expect(body).toHaveProperty("threshold_ms");
    expect(body.threshold_ms).toBe(SLOW_QUERY_LOG_THRESHOLD_MS);
  });

  it("GET /api/v1/metrics/slow-queries/stats returns stats with threshold", async () => {
    const res = await apiV1.request("/metrics/slow-queries/stats");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totalCount");
    expect(body).toHaveProperty("threshold_ms");
    expect(body.threshold_ms).toBe(SLOW_QUERY_LOG_THRESHOLD_MS);
  });

  it("DELETE /api/v1/metrics/slow-queries clears slow queries", async () => {
    const res = await apiV1.request("/metrics/slow-queries", {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body).toHaveProperty("cleared_count");
  });

  it("GET /api/v1/metrics/db/health returns health status", async () => {
    const res = await apiV1.request("/metrics/db/health");
    // Can be 200 (healthy) or 503 (unhealthy) depending on DB state
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(["healthy", "unhealthy"]).toContain(body.status);
  });

  it("GET /api/v1/metrics/db/pool returns pool stats", async () => {
    const res = await apiV1.request("/metrics/db/pool");
    // Can be 200 (healthy) or 500 (when DB unavailable in tests)
    expect([200, 500]).toContain(res.status);
    const body = await res.json();
    if (res.status === 200) {
      expect(body).toHaveProperty("pool");
      expect(body).toHaveProperty("timestamp");
    } else {
      // 500 response has error message
      expect(body).toHaveProperty("error");
    }
  });
});

export {};
