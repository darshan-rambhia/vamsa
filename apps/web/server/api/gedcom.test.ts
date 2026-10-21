/**
 * GEDCOM REST routes: ADMIN-only, argument passing, text and zip downloads.
 * Session and business functions are mocked.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { initializeRateLimitStore } from "../../src/server/middleware/rate-limiter";
import { MemoryRateLimitStore } from "../../src/server/middleware/rate-limit-store";
import apiV1 from "./index";

const m = vi.hoisted(() => ({
  session: vi.fn<() => Promise<unknown>>(async () => null),
  validateGedcomImport: vi.fn(async () => ({
    valid: true,
    message: "ok",
    preview: { peopleCount: 2, familiesCount: 1, errors: [] },
  })),
  importGedcomData: vi.fn(async () => ({
    success: true,
    message: "Imported",
    imported: { people: 2, relationships: 1 },
  })),
  exportGedcomData: vi.fn(async () => ({
    success: true,
    message: "ok",
    gedcomContent: "0 HEAD\n0 TRLR\n",
  })),
  exportGedcomDataZip: vi.fn(async () => ({
    success: true,
    message: "ok",
    zipBase64: Buffer.from([0x50, 0x4b, 3, 4]).toString("base64"),
  })),
}));

vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthGetSessionWithUser: m.session,
}));

vi.mock("@vamsa/lib/server/business", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { session: _s, ...fns } = m;
  return { ...actual, ...fns };
});

function signIn(role: "VIEWER" | "MEMBER" | "ADMIN") {
  m.session.mockResolvedValue({
    id: `u-${role}`,
    email: "x@example.com",
    name: role,
    role,
    personId: null,
    mustChangePassword: false,
    profileClaimStatus: "CLAIMED",
    oidcProvider: null,
  });
}

const file = { fileName: "family.ged", content: "0 HEAD\n0 TRLR\n" };
const post = (path: string, body: unknown) =>
  apiV1.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  initializeRateLimitStore(new MemoryRateLimitStore());
  m.session.mockResolvedValue(null);
});

describe("GEDCOM access", () => {
  test("signed out is 401", async () => {
    expect((await apiV1.request("/gedcom/export")).status).toBe(401);
  });

  test.each(["VIEWER", "MEMBER"] as const)(
    "%s is 403 everywhere",
    async (role) => {
      signIn(role);
      expect((await apiV1.request("/gedcom/export")).status).toBe(403);
      expect((await post("/gedcom/import", file)).status).toBe(403);
      expect(m.importGedcomData).not.toHaveBeenCalled();
    }
  );
});

describe("GEDCOM routes (ADMIN)", () => {
  beforeEach(() => signIn("ADMIN"));

  test("validate passes name and content", async () => {
    const res = await post("/gedcom/validate", file);
    expect(res.status).toBe(200);
    expect(m.validateGedcomImport).toHaveBeenCalledWith(
      "family.ged",
      file.content
    );
    expect((await res.json()).preview.peopleCount).toBe(2);
  });

  test("import runs as the calling user", async () => {
    const res = await post("/gedcom/import", file);
    expect(res.status).toBe(200);
    expect(m.importGedcomData).toHaveBeenCalledWith(
      "family.ged",
      file.content,
      "u-ADMIN"
    );
  });

  test("missing content is 400", async () => {
    expect((await post("/gedcom/import", { fileName: "a.ged" })).status).toBe(
      400
    );
  });

  test("export returns GEDCOM text as a download", async () => {
    const res = await apiV1.request("/gedcom/export");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(res.headers.get("content-disposition")).toMatch(
      /attachment; filename="vamsa-\d{4}-\d{2}-\d{2}\.ged"/
    );
    expect(await res.text()).toBe("0 HEAD\n0 TRLR\n");
  });

  test("zip export returns raw bytes and honours media=false", async () => {
    const res = await apiV1.request("/gedcom/export.zip?media=false");
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(
      new Uint8Array([0x50, 0x4b, 3, 4])
    );
    expect(m.exportGedcomDataZip).toHaveBeenCalledWith("u-ADMIN", false);
  });

  test("failed export is a 500 with the message", async () => {
    m.exportGedcomData.mockResolvedValueOnce({
      success: false,
      message: "Export failed",
    } as never);
    const res = await apiV1.request("/gedcom/export");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Export failed" });
  });
});

describe("GEDCOM upload size", () => {
  test("bodies over the limit get 413 before parsing", async () => {
    signIn("ADMIN");
    const { GEDCOM_MAX_BYTES } = await import("./gedcom");
    const big = "x".repeat(GEDCOM_MAX_BYTES + 1);
    const res = await apiV1.request("/gedcom/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(big.length + 40),
      },
      body: JSON.stringify({ fileName: "big.ged", content: big }),
    });
    expect(res.status).toBe(413);
    expect(m.validateGedcomImport).not.toHaveBeenCalled();
  });
});
