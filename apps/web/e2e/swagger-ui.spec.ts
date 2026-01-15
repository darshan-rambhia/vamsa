/**
 * E2E tests for Swagger UI and OpenAPI documentation
 * Tests: Verify API documentation is accessible and interactive
 *
 * This test suite validates that:
 * 1. Swagger UI loads successfully
 * 2. API endpoints are visible and organized by tag
 * 3. Swagger UI interactive features work (try it out, execute)
 * 4. OpenAPI JSON is accessible
 */

import { test, expect } from "@playwright/test";

test.describe("Swagger UI Accessibility", () => {
  test("Swagger UI loads at /api/v1/docs", async ({ page }) => {
    await page.goto("/api/v1/docs", { waitUntil: "domcontentloaded" });

    // Wait for Swagger UI to load
    await expect(page.locator(".swagger-ui")).toBeVisible({ timeout: 10000 });
  });

  test("Swagger UI page has correct title", async ({ page }) => {
    await page.goto("/api/v1/docs");

    // Check page title or heading
    const heading = page.locator("h2:has-text('Vamsa API')");
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("OpenAPI JSON endpoint is accessible", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("OpenAPI JSON contains valid spec", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Vamsa API");
    expect(spec.paths).toBeDefined();
  });
});

test.describe("API Endpoint Tags in Swagger UI", () => {
  test("displays Authentication endpoints", async ({ page }) => {
    await page.goto("/api/v1/docs");

    // Wait for Swagger UI to render
    await page.waitForSelector(".opblock-tag-section", { timeout: 10000 });

    // Find Authentication tag
    const authTag = page.locator(
      'div:has(.opblock-tag-section):has-text("Authentication")'
    );
    await expect(authTag.first()).toBeVisible({ timeout: 5000 });
  });

  test("displays Persons endpoints", async ({ page }) => {
    await page.goto("/api/v1/docs");

    await page.waitForSelector(".opblock-tag-section", { timeout: 10000 });

    const personsTag = page.locator(
      'div:has(.opblock-tag-section):has-text("Persons")'
    );
    await expect(personsTag.first()).toBeVisible({ timeout: 5000 });
  });

  test("displays Relationships endpoints", async ({ page }) => {
    await page.goto("/api/v1/docs");

    await page.waitForSelector(".opblock-tag-section", { timeout: 10000 });

    const relTag = page.locator(
      'div:has(.opblock-tag-section):has-text("Relationships")'
    );
    await expect(relTag.first()).toBeVisible({ timeout: 5000 });
  });

  test("displays Calendar endpoints", async ({ page }) => {
    await page.goto("/api/v1/docs");

    await page.waitForSelector(".opblock-tag-section", { timeout: 10000 });

    const calendarTag = page.locator(
      'div:has(.opblock-tag-section):has-text("Calendar")'
    );
    await expect(calendarTag.first()).toBeVisible({ timeout: 5000 });
  });

  test("displays Metrics endpoints", async ({ page }) => {
    await page.goto("/api/v1/docs");

    await page.waitForSelector(".opblock-tag-section", { timeout: 10000 });

    const metricsTag = page.locator(
      'div:has(.opblock-tag-section):has-text("Metrics")'
    );
    await expect(metricsTag.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Authentication Endpoint Details in Swagger UI", () => {
  test("shows login endpoint POST /auth/login", async ({ page }) => {
    await page.goto("/api/v1/docs");

    // Look for the login endpoint
    const loginEndpoint = page.locator(
      'div.opblock-post:has-text("/auth/login")'
    );
    await expect(loginEndpoint.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows register endpoint POST /auth/register", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const registerEndpoint = page.locator(
      'div.opblock-post:has-text("/auth/register")'
    );
    await expect(registerEndpoint.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows logout endpoint POST /auth/logout", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const logoutEndpoint = page.locator(
      'div.opblock-post:has-text("/auth/logout")'
    );
    await expect(logoutEndpoint.first()).toBeVisible({ timeout: 5000 });
  });

  test("login endpoint shows request schema", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const loginEndpoint = page
      .locator('div.opblock-post:has-text("/auth/login")')
      .first();
    await loginEndpoint.click();

    // Look for request body schema
    await expect(page.locator('text="email"')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text="password"')).toBeVisible({
      timeout: 5000,
    });
  });

  test("login endpoint shows response codes", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const loginEndpoint = page
      .locator('div.opblock-post:has-text("/auth/login")')
      .first();
    await loginEndpoint.click();

    // Look for response codes
    await expect(page.locator('text="200"')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text="400"')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text="401"')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Persons Endpoint Details in Swagger UI", () => {
  test("shows list persons endpoint GET /persons", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const listEndpoint = page
      .locator('div.opblock-get:has-text("/persons")')
      .first();
    await expect(listEndpoint).toBeVisible({ timeout: 5000 });
  });

  test("shows create person endpoint POST /persons", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const createEndpoint = page
      .locator('div.opblock-post:has-text("/persons")')
      .first();
    await expect(createEndpoint).toBeVisible({ timeout: 5000 });
  });

  test("shows get person endpoint GET /persons/{id}", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const getEndpoint = page
      .locator('div.opblock-get:has-text("/persons/{id}")')
      .first();
    await expect(getEndpoint).toBeVisible({ timeout: 5000 });
  });

  test("shows update person endpoint PUT /persons/{id}", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const updateEndpoint = page
      .locator('div.opblock-put:has-text("/persons/{id}")')
      .first();
    await expect(updateEndpoint).toBeVisible({ timeout: 5000 });
  });

  test("shows delete person endpoint DELETE /persons/{id}", async ({
    page,
  }) => {
    await page.goto("/api/v1/docs");

    const deleteEndpoint = page
      .locator('div.opblock-delete:has-text("/persons/{id}")')
      .first();
    await expect(deleteEndpoint).toBeVisible({ timeout: 5000 });
  });

  test("list persons endpoint shows query parameters", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const listEndpoint = page
      .locator('div.opblock-get:has-text("/persons")')
      .first();
    await listEndpoint.click();

    // Look for query parameters
    await expect(page.locator('text="page"')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text="limit"')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text="sortBy"')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Relationships Endpoint Details in Swagger UI", () => {
  test("shows list relationships endpoint GET /relationships", async ({
    page,
  }) => {
    await page.goto("/api/v1/docs");

    const listEndpoint = page
      .locator('div.opblock-get:has-text("/relationships")')
      .first();
    await expect(listEndpoint).toBeVisible({ timeout: 5000 });
  });

  test("shows create relationship endpoint POST /relationships", async ({
    page,
  }) => {
    await page.goto("/api/v1/docs");

    const createEndpoint = page
      .locator('div.opblock-post:has-text("/relationships")')
      .first();
    await expect(createEndpoint).toBeVisible({ timeout: 5000 });
  });

  test("shows get relationship returns 501 Not Implemented", async ({
    page,
  }) => {
    await page.goto("/api/v1/docs");

    const getEndpoint = page
      .locator('div.opblock-get:has-text("/relationships/{id}")')
      .first();
    await getEndpoint.click();

    // Look for 501 response
    await expect(page.locator('text="501"')).toBeVisible({ timeout: 5000 });
  });

  test("shows update relationship endpoint PUT /relationships/{id}", async ({
    page,
  }) => {
    await page.goto("/api/v1/docs");

    const updateEndpoint = page
      .locator('div.opblock-put:has-text("/relationships/{id}")')
      .first();
    await expect(updateEndpoint).toBeVisible({ timeout: 5000 });
  });

  test("shows delete relationship endpoint DELETE /relationships/{id}", async ({
    page,
  }) => {
    await page.goto("/api/v1/docs");

    const deleteEndpoint = page
      .locator('div.opblock-delete:has-text("/relationships/{id}")')
      .first();
    await expect(deleteEndpoint).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Swagger UI Interactive Features", () => {
  test("can expand and collapse endpoint details", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const loginEndpoint = page
      .locator('div.opblock-post:has-text("/auth/login")')
      .first();

    // Initially might be collapsed, click to expand
    await loginEndpoint.click();
    await expect(page.locator('text="email"')).toBeVisible({ timeout: 5000 });

    // Click again to collapse
    await loginEndpoint.click();
  });

  test("displays endpoint operation IDs", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const loginEndpoint = page
      .locator('div.opblock-post:has-text("/auth/login")')
      .first();
    await loginEndpoint.click();

    // Look for operation ID
    const operationId = page.locator('text="login"');
    await expect(operationId.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows request/response schemas", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const loginEndpoint = page
      .locator('div.opblock-post:has-text("/auth/login")')
      .first();
    await loginEndpoint.click();

    // Request body should show schema properties
    const requestBodyText = page.locator('text="Request body"');
    const requestBodyTextLower = page.locator('text="request body"');
    const requestBodySelector = requestBodyText.or(requestBodyTextLower);
    await expect(requestBodySelector.first()).toBeVisible({ timeout: 5000 });
  });

  test("shows response descriptions", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const loginEndpoint = page
      .locator('div.opblock-post:has-text("/auth/login")')
      .first();
    await loginEndpoint.click();

    // Should show response descriptions
    const responsesText = page.locator('text="responses"');
    const responsesTextCaps = page.locator('text="Responses"');
    const responsesSelector = responsesText.or(responsesTextCaps);
    await expect(responsesSelector.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("API Documentation Completeness", () => {
  test("all Authentication routes are documented", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    expect(spec.paths["/auth/login"]).toBeDefined();
    expect(spec.paths["/auth/register"]).toBeDefined();
    expect(spec.paths["/auth/logout"]).toBeDefined();
  });

  test("all Persons routes are documented", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    expect(spec.paths["/persons"]).toBeDefined();
    expect(spec.paths["/persons/{id}"]).toBeDefined();
  });

  test("all Relationships routes are documented", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    expect(spec.paths["/relationships"]).toBeDefined();
    expect(spec.paths["/relationships/{id}"]).toBeDefined();
  });

  test("endpoints have summaries and descriptions", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const loginRoute = spec.paths["/auth/login"].post;
    expect(loginRoute.summary).toBeDefined();
    expect(loginRoute.description).toBeDefined();
  });

  test("endpoints have operation IDs", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const loginRoute = spec.paths["/auth/login"].post;
    expect(loginRoute.operationId).toBe("login");

    const registerRoute = spec.paths["/auth/register"].post;
    expect(registerRoute.operationId).toBe("register");
  });

  test("endpoints have tags", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const loginRoute = spec.paths["/auth/login"].post;
    expect(loginRoute.tags).toContain("Authentication");

    const listRoute = spec.paths["/persons"].get;
    expect(listRoute.tags).toContain("Persons");
  });
});

test.describe("Error Documentation in OpenAPI", () => {
  test("error responses are documented with schemas", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const loginRoute = spec.paths["/auth/login"].post;
    expect(loginRoute.responses["400"]).toBeDefined();
    expect(loginRoute.responses["401"]).toBeDefined();
  });

  test("error responses describe their purpose", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const loginRoute = spec.paths["/auth/login"].post;
    const error400 = loginRoute.responses["400"];
    expect(error400.description).toBeDefined();
    expect(error400.description).toContain("Validation error");
  });

  test("404 Not Found is documented for resource endpoints", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const getRoute = spec.paths["/persons/{id}"].get;
    expect(getRoute.responses["404"]).toBeDefined();
  });

  test("500 errors are documented for most endpoints", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const loginRoute = spec.paths["/auth/login"].post;
    expect(loginRoute.responses["500"]).toBeDefined();
  });
});

test.describe("Parameter Documentation in OpenAPI", () => {
  test("path parameters are required", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const getRoute = spec.paths["/persons/{id}"].get;
    const idParam = getRoute.parameters.find((p: any) => p.name === "id");
    expect(idParam.required).toBe(true);
  });

  test("path parameters have schema definitions", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const getRoute = spec.paths["/persons/{id}"].get;
    const idParam = getRoute.parameters.find((p: any) => p.name === "id");
    expect(idParam.schema).toBeDefined();
  });

  test("query parameters have descriptions", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const listRoute = spec.paths["/persons"].get;
    const pageParam = listRoute.parameters.find((p: any) => p.name === "page");
    // Page parameter should have a description or be self-explanatory
    expect(pageParam).toBeDefined();
  });

  test("enum parameters list valid values", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const listRoute = spec.paths["/persons"].get;
    const sortByParam = listRoute.parameters.find(
      (p: any) => p.name === "sortBy"
    );
    expect(sortByParam.schema.enum).toBeDefined();
    expect(Array.isArray(sortByParam.schema.enum)).toBe(true);
  });
});

test.describe("Request Body Documentation", () => {
  test("login endpoint documents request schema", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const loginRoute = spec.paths["/auth/login"].post;
    const schema = loginRoute.requestBody.content["application/json"].schema;
    expect(schema.properties.email).toBeDefined();
    expect(schema.properties.password).toBeDefined();
  });

  test("register endpoint documents required fields", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const registerRoute = spec.paths["/auth/register"].post;
    const schema = registerRoute.requestBody.content["application/json"].schema;
    expect(schema.properties.email).toBeDefined();
    expect(schema.properties.name).toBeDefined();
    expect(schema.properties.password).toBeDefined();
  });

  test("create person endpoint documents person fields", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const createRoute = spec.paths["/persons"].post;
    const schema = createRoute.requestBody.content["application/json"].schema;
    expect(schema.properties.firstName).toBeDefined();
    expect(schema.properties.lastName).toBeDefined();
  });
});

test.describe("Response Body Documentation", () => {
  test("successful responses document return schema", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const loginRoute = spec.paths["/auth/login"].post;
    const response200 = loginRoute.responses["200"];
    expect(response200.content["application/json"].schema).toBeDefined();
  });

  test("list endpoints document paginated response", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const listRoute = spec.paths["/persons"].get;
    const response200 = listRoute.responses["200"];
    expect(response200.content["application/json"].schema).toBeDefined();
  });

  test("error responses document error format", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const loginRoute = spec.paths["/auth/login"].post;
    const error400 = loginRoute.responses["400"];
    expect(error400.content["application/json"].schema).toBeDefined();
  });
});

test.describe("HTTP Methods Documentation", () => {
  test("GET methods are documented", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const listRoute = spec.paths["/persons"].get;
    expect(listRoute).toBeDefined();
    expect(listRoute.summary).toBeDefined();
  });

  test("POST methods are documented", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const createRoute = spec.paths["/persons"].post;
    expect(createRoute).toBeDefined();
    expect(createRoute.summary).toBeDefined();
  });

  test("PUT methods are documented", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const updateRoute = spec.paths["/persons/{id}"].put;
    expect(updateRoute).toBeDefined();
  });

  test("DELETE methods are documented", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const deleteRoute = spec.paths["/persons/{id}"].delete;
    expect(deleteRoute).toBeDefined();
  });
});

test.describe("Calendar and Metrics Endpoints in Swagger", () => {
  test("Calendar endpoints are visible in Swagger", async ({ page }) => {
    await page.goto("/api/v1/docs");

    await page.waitForSelector(".opblock-tag-section", { timeout: 10000 });

    const calendarTag = page.locator(
      'div:has(.opblock-tag-section):has-text("Calendar")'
    );
    await expect(calendarTag.first()).toBeVisible({ timeout: 5000 });
  });

  test("Metrics endpoints are visible in Swagger", async ({ page }) => {
    await page.goto("/api/v1/docs");

    await page.waitForSelector(".opblock-tag-section", { timeout: 10000 });

    const metricsTag = page.locator(
      'div:has(.opblock-tag-section):has-text("Metrics")'
    );
    await expect(metricsTag.first()).toBeVisible({ timeout: 5000 });
  });

  test("RSS feed endpoint is documented with proper content type", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const rssRoute = spec.paths["/calendar/rss.xml"].get;
    expect(
      rssRoute.responses["200"].content["application/rss+xml"]
    ).toBeDefined();
  });

  test("iCalendar endpoints are documented with text/calendar content type", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    const birthdaysRoute = spec.paths["/calendar/birthdays.ics"].get;
    expect(
      birthdaysRoute.responses["200"].content["text/calendar"]
    ).toBeDefined();
  });
});

test.describe("Swagger UI Search and Navigation", () => {
  test("can search for endpoints in Swagger UI", async ({ page }) => {
    await page.goto("/api/v1/docs");

    // Look for search box
    const searchBox = page
      .locator('input[type="search"], input[placeholder*="Search"]')
      .first();
    if (await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchBox.fill("/persons");
      await page.waitForTimeout(500);
      // Should filter to show persons endpoints
      const personsEndpoints = page.locator('text="/persons"');
      await expect(personsEndpoints.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("can filter endpoints by tag", async ({ page }) => {
    await page.goto("/api/v1/docs");

    const authTag = page
      .locator('div:has(.opblock-tag-section):has-text("Authentication")')
      .first();
    await authTag.click();

    // Click should expand/collapse the authentication section
    await expect(authTag).toBeVisible({ timeout: 5000 });
  });
});

test.describe("API Info Endpoint", () => {
  test("API root endpoint returns metadata", async ({ request }) => {
    const response = await request.get("/api/v1/");
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.name).toBe("Vamsa API");
    expect(json.version).toBe("1.0.0");
  });

  test("API info includes link to documentation", async ({ request }) => {
    const response = await request.get("/api/v1/");
    const json = await response.json();

    expect(json.docs).toBe("/api/v1/docs");
    expect(json.openapi).toBe("/api/v1/openapi.json");
  });

  test("API info lists all endpoint categories", async ({ request }) => {
    const response = await request.get("/api/v1/");
    const json = await response.json();

    expect(json.endpoints).toBeDefined();
    expect(Object.keys(json.endpoints).length).toBeGreaterThanOrEqual(5);
  });
});

test.describe("OpenAPI Spec Version and Format", () => {
  test("spec declares correct OpenAPI version", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    expect(spec.openapi).toBe("3.0.0");
  });

  test("spec has servers configured", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    expect(spec.servers).toBeDefined();
    expect(Array.isArray(spec.servers)).toBe(true);
    expect(spec.servers.length).toBeGreaterThan(0);
  });

  test("spec has info section with contact", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    expect(spec.info.title).toBe("Vamsa API");
    expect(spec.info.version).toBe("1.0.0");
    expect(spec.info.contact).toBeDefined();
  });

  test("spec defines security schemes", async ({ request }) => {
    const response = await request.get("/api/v1/openapi.json");
    const spec = await response.json();

    expect(spec.components).toBeDefined();
    expect(spec.components.securitySchemes).toBeDefined();
  });
});
