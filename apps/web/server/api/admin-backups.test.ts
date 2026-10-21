/**
 * Admin backup and audit routes. Session and business functions are mocked.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { initializeRateLimitStore } from "../../src/server/middleware/rate-limiter";
import { MemoryRateLimitStore } from "../../src/server/middleware/rate-limit-store";
import apiV1 from "./index";

const m = vi.hoisted(() => ({
  session: vi.fn<() => Promise<unknown>>(async () => null),
  createBackupExportData: vi.fn(async () => ({
    zipBase64: Buffer.from("PK\u0003\u0004zip").toString("base64"),
    filename: "vamsa-backup-2026-01-01.zip",
    metadata: { statistics: { totalPeople: 3 } },
  })),
  listBackupsData: vi.fn(async () => ({ items: [], total: 0, hasMore: false })),
  getImportHistoryData: vi.fn(async () => [{ id: "h1" }]),
  previewImportData: vi.fn(async () => ({ statistics: {} })),
  validateBackupFile: vi.fn(
    async (_buf?: unknown): Promise<Record<string, unknown>> => ({
      isValid: true,
      errors: [],
      warnings: [],
    })
  ),
  listAuditLogsData: vi.fn(async () => ({ items: [], total: 0 })),
}));

vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthGetSessionWithUser: m.session,
}));

vi.mock("@vamsa/lib/server/business", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { session: _s, ...fns } = m;
  return { ...actual, ...fns };
});

function signIn(role: "MEMBER" | "ADMIN") {
  m.session.mockResolvedValue({
    id: "admin-1",
    email: "a@example.com",
    name: "A",
    role,
    personId: null,
    mustChangePassword: false,
    profileClaimStatus: "CLAIMED",
    oidcProvider: null,
  });
}

const zipBody = (bytes: Uint8Array) =>
  ({
    method: "POST",
    headers: { "Content-Type": "application/zip" },
    body: bytes,
  }) as RequestInit;

beforeEach(() => {
  vi.clearAllMocks();
  initializeRateLimitStore(new MemoryRateLimitStore());
  signIn("ADMIN");
});

describe("backups", () => {
  test("MEMBER cannot create a backup", async () => {
    signIn("MEMBER");
    expect(
      (await apiV1.request("/admin/backups", { method: "POST" })).status
    ).toBe(403);
    expect(m.createBackupExportData).not.toHaveBeenCalled();
  });

  test("create returns the ZIP with a file name and stats header", async () => {
    const res = await apiV1.request("/admin/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includePhotos: false, auditLogDays: 30 }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toContain(
      'filename="vamsa-backup-2026-01-01.zip"'
    );
    expect(
      JSON.parse(res.headers.get("x-vamsa-backup-statistics") ?? "{}")
    ).toEqual({
      totalPeople: 3,
    });
    expect(Buffer.from(await res.arrayBuffer()).toString("latin1")).toBe(
      "PK\u0003\u0004zip"
    );
    expect(m.createBackupExportData).toHaveBeenCalledWith(
      { includePhotos: false, includeAuditLogs: true, auditLogDays: 30 },
      { id: "admin-1", email: "a@example.com", name: "A" }
    );
  });

  test("create with no body uses defaults; bad options are 400", async () => {
    expect(
      (await apiV1.request("/admin/backups", { method: "POST" })).status
    ).toBe(200);
    const bad = await apiV1.request("/admin/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditLogDays: 9999 }),
    });
    expect(bad.status).toBe(400);
  });

  test("validate passes the uploaded bytes", async () => {
    const res = await apiV1.request(
      "/admin/backups/validate",
      zipBody(new Uint8Array([0x50, 0x4b, 1, 2]))
    );
    expect(res.status).toBe(200);
    const buf = (m.validateBackupFile.mock.calls[0] as unknown as [Buffer])[0];
    expect([...buf]).toEqual([0x50, 0x4b, 1, 2]);
  });

  test("validate with an empty body is 400", async () => {
    expect(
      (
        await apiV1.request(
          "/admin/backups/validate",
          zipBody(new Uint8Array())
        )
      ).status
    ).toBe(400);
  });

  test("restore validates, then answers 501 (pipeline not implemented)", async () => {
    const res = await apiV1.request(
      "/admin/backups/restore?strategy=merge",
      zipBody(new Uint8Array([1]))
    );
    expect(res.status).toBe(501);
    expect((await res.json()).details).toContain("strategy merge");
  });

  test("restore of an invalid backup is 400 with the reasons", async () => {
    m.validateBackupFile.mockResolvedValueOnce({
      isValid: false,
      errors: ["Not a valid ZIP archive"],
      warnings: [],
    });
    const res = await apiV1.request(
      "/admin/backups/restore",
      zipBody(new Uint8Array([1]))
    );
    expect(res.status).toBe(400);
    expect((await res.json()).details).toBe("Not a valid ZIP archive");
  });

  test("list and import history", async () => {
    await apiV1.request("/admin/backups?limit=5&offset=10");
    expect(m.listBackupsData).toHaveBeenCalledWith({ limit: 5, offset: 10 });
    const res = await apiV1.request("/admin/backups/imports");
    expect(await res.json()).toEqual({ items: [{ id: "h1" }], total: 1 });
  });
});

describe("audit", () => {
  test("parses filters and dates", async () => {
    const res = await apiV1.request(
      "/admin/audit?since=2026-01-01T00:00:00Z&action=DELETE&userId=u2&limit=10"
    );
    expect(res.status).toBe(200);
    expect(m.listAuditLogsData).toHaveBeenCalledWith({
      since: new Date("2026-01-01T00:00:00Z"),
      until: undefined,
      userId: "u2",
      action: "DELETE",
      limit: 10,
      offset: 0,
    });
  });

  test("bad action or date is 400", async () => {
    expect((await apiV1.request("/admin/audit?action=EXPLODE")).status).toBe(
      400
    );
    expect((await apiV1.request("/admin/audit?since=yesterday")).status).toBe(
      400
    );
  });
});
