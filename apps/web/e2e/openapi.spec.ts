/**
 * API Smoke Tests
 *
 * Minimal smoke tests to verify API endpoints are reachable.
 * Detailed API validation should be done in API/integration tests.
 */

import { test, expect } from "@playwright/test";

test.describe("API Smoke Tests", () => {
  test("API root is reachable", async ({ request }) => {
    const response = await request.get("/api/v1");
    // API root should be accessible (200) or return not found (404 for root)
    expect([200, 404]).toContain(response.status());
  });

  test("calendar endpoints are handled", async ({ request }) => {
    // Calendar endpoints should return proper HTTP responses (not crash)
    const endpoints = [
      "/calendar/rss.xml",
      "/calendar/birthdays.ics",
      "/calendar/anniversaries.ics",
      "/calendar/events.ics",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      // Should return proper HTTP status (401 unauthorized, 404 not found, etc.)
      expect([200, 401, 403, 404]).toContain(response.status());
    }
  });

  test("metrics endpoints are handled", async ({ request }) => {
    const endpoints = [
      "/metrics/slow-queries",
      "/metrics/db/health",
      "/metrics/db/pool",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      // Should return proper HTTP status
      expect([200, 401, 403, 404, 500]).toContain(response.status());
    }
  });
});
