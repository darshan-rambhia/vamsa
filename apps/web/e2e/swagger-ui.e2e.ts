/**
 * Swagger UI Smoke Test
 *
 * Single smoke test to verify API documentation is accessible.
 * Detailed API contract validation should be done in API/integration tests.
 */

import { expect, test } from "@playwright/test";

test.describe("API Documentation", () => {
  test("Swagger UI loads successfully", async ({ page }) => {
    // Navigate to the docs page
    const response = await page.goto("/api/v1/docs", {
      waitUntil: "domcontentloaded",
    });

    // Verify the endpoint returns a successful response
    expect(response?.status()).toBe(200);

    // Verify the page contains the swagger-ui container
    // Note: Swagger UI loads assets from CDN (jsdelivr.net) which may not be
    // accessible in Docker/CI environments. We verify the endpoint works
    // by checking the HTML structure exists.
    const swaggerContainer = page.locator("#swagger-ui");
    await expect(swaggerContainer).toHaveCount(1);

    // Check that the page title indicates Swagger docs
    await expect(page).toHaveTitle(/vamsa api documentation/i);

    // Verify the page has the OpenAPI URL configured
    // This appears in the inline script
    const pageContent = await page.content();
    expect(pageContent).toContain("/api/v1/openapi.json");

    // If Swagger UI fully renders (CDN is accessible), verify content
    // This is optional - we skip if CDN assets don't load
    const swaggerContent = page.locator('.swagger-ui, [class*="swagger"]');
    // Genuine conditional guard - CDN may not be accessible in all environments
    const hasSwaggerContent = await swaggerContent
      .first()
      .isVisible()
      .catch(() => false);

    if (hasSwaggerContent) {
      // CDN loaded successfully - verify the API title
      await expect(page.getByText(/vamsa api/i).first()).toBeVisible({
        timeout: 10000,
      });
    }
    // If CDN didn't load, the test still passes because the endpoint works
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
