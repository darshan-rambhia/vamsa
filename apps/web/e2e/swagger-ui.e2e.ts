/**
 * Swagger UI Smoke Test
 *
 * Single smoke test to verify API documentation is accessible.
 * Detailed API contract validation should be done in API/integration tests.
 */

import { expect, test } from "@playwright/test";

test.describe("API Documentation", () => {
  test("Swagger UI loads successfully", async ({ page }) => {
    await page.goto("/api/v1/docs", { waitUntil: "domcontentloaded" });

    // Wait for Swagger UI to load
    await expect(page.getByRole("heading", { name: /vamsa api/i })).toBeVisible(
      { timeout: 10000 }
    );

    // Verify key sections are present
    await expect(page.getByText(/authentication/i).first()).toBeVisible();
    await expect(page.getByText(/persons/i).first()).toBeVisible();
  });

  test("OpenAPI JSON endpoint returns valid spec", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    expect(response.status()).toBe(200);

    const spec = await response.json();
    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Vamsa API");
    expect(spec.paths).toBeDefined();
  });
});
