/**
 * Request validation failures share one 400 body across routers:
 * `{ error: "Validation error", details, issues: [{ path, message, code }] }`.
 * The shared defaultHook (createRouter) and manual catch blocks both use it.
 */

import { z } from "@hono/zod-openapi";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { initializeRateLimitStore } from "../../src/server/middleware/rate-limiter";
import { MemoryRateLimitStore } from "../../src/server/middleware/rate-limit-store";
import { createRouter, jsonBody, jsonRoute } from "./route-helpers";
import apiV1 from "./index";

const { mockSession } = vi.hoisted(() => ({
  mockSession: vi.fn(async () => ({
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin",
    role: "ADMIN",
    personId: null,
    mustChangePassword: false,
    profileClaimStatus: "CLAIMED",
    oidcProvider: null,
  })),
}));

vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthGetSessionWithUser: mockSession,
}));

beforeEach(() => {
  initializeRateLimitStore(new MemoryRateLimitStore());
});

const send = (method: string, path: string, body: unknown) =>
  apiV1.request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

/** Every issue has exactly path/message/code strings: nothing else leaks. */
function expectValidationBody(body: Record<string, unknown>) {
  expect(Object.keys(body).sort()).toEqual(["details", "error", "issues"]);
  expect(body.error).toBe("Validation error");
  const issues = body.issues as Array<Record<string, unknown>>;
  expect(issues.length).toBeGreaterThan(0);
  expect(body.details).toBe(issues[0].message);
  for (const issue of issues) {
    expect(Object.keys(issue).sort()).toEqual(["code", "message", "path"]);
    for (const v of Object.values(issue)) expect(typeof v).toBe("string");
  }
  return issues;
}

describe("createRouter defaultHook", () => {
  const router = createRouter();
  router.openapi(
    jsonRoute({
      method: "post",
      path: "/things",
      tag: "Test",
      summary: "t",
      operationId: "t",
      request: {
        body: jsonBody(
          z.object({
            name: z.string().min(1, "Name is required"),
            tags: z.array(z.string()),
          })
        ),
      },
    }),
    (c) => c.json({ ok: true }, 200) as never
  );

  test("returns 400 with every issue, dotted paths, no input values", async () => {
    const res = await router.request("/things", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", tags: ["ok", 5], secret: "s3cr3t" }),
    });
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).not.toContain("s3cr3t");
    const issues = expectValidationBody(JSON.parse(text));
    expect(issues).toEqual([
      { path: "name", message: "Name is required", code: "too_small" },
      { path: "tags.1", message: expect.any(String), code: "invalid_type" },
    ]);
  });

  test("valid input reaches the handler", async () => {
    const res = await router.request("/things", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "x", tags: [] }),
    });
    expect(res.status).toBe(200);
  });
});

describe("router 400 bodies", () => {
  test("POST /persons with a bad body", async () => {
    const res = await send("POST", "/persons", { firstName: 123 });
    expect(res.status).toBe(400);
    const issues = expectValidationBody(await res.json());
    expect(issues.map((i) => i.path)).toContain("firstName");
  });

  test("PUT /admin/settings rejects a javascript: URL", async () => {
    const res = await send("PUT", "/admin/settings", {
      metricsDashboardUrl: "javascript:alert(1)",
    });
    expect(res.status).toBe(400);
    const issues = expectValidationBody(await res.json());
    expect(issues[0]).toMatchObject({
      path: "metricsDashboardUrl",
      message: "Must be an http or https URL",
    });
  });

  test("POST /tokens rejects an unknown scope", async () => {
    const res = await send("POST", "/tokens", { name: "x", scope: "root" });
    expect(res.status).toBe(400);
    const issues = expectValidationBody(await res.json());
    expect(issues[0]).toMatchObject({ path: "scope", code: "invalid_value" });
  });
});
