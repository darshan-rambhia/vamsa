import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decode } from "@toon-format/toon";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveConfig } from "../lib/config";
import { json, runCli, tempHome } from "../test-helpers";
import { parseSince } from "./admin-backup";
import type { FetchMock } from "../test-helpers";

let home: string;

beforeEach(() => {
  home = tempHome();
  saveConfig(
    {
      current: "default",
      profiles: {
        default: { url: "http://v.test", token: "t", tokenType: "session" },
      },
    },
    { HOME: home }
  );
});

function api(
  handler: (url: URL, init: RequestInit) => Response | Promise<Response>
): FetchMock {
  return vi.fn(async (input: string, init?: RequestInit) =>
    handler(new URL(input), init ?? {})
  );
}

describe("admin backup", () => {
  it("create sends options and saves the ZIP with stats", async () => {
    const fetch = api(
      () =>
        new Response(new Uint8Array([0x50, 0x4b, 3, 4]), {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": 'attachment; filename="vamsa-backup-x.zip"',
            "X-Vamsa-Backup-Statistics": JSON.stringify({ totalPeople: 32 }),
          },
        })
    );
    const r = await runCli(
      ["admin", "backup", "create", "--no-photos", "--audit-days", "7"],
      { home, fetch }
    );
    expect(r.code).toBe(0);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      includePhotos: false,
      includeAuditLogs: true,
      auditLogDays: 7,
    });
    expect([...readFileSync(join(home, "vamsa-backup-x.zip"))]).toEqual([
      0x50, 0x4b, 3, 4,
    ]);
    expect(decode(r.stdout)).toMatchObject({
      backup: { people: 32, size: "4 B" },
    });
  });

  it("validate uploads raw bytes as application/zip", async () => {
    writeFileSync(join(home, "b.zip"), Buffer.from([1, 2, 3]));
    const fetch = api(() =>
      json({
        isValid: false,
        metadata: { statistics: {} },
        errors: ["Not a valid ZIP archive"],
        warnings: [],
      })
    );
    const r = await runCli(["admin", "backup", "validate", "b.zip"], {
      home,
      fetch,
    });
    const init = fetch.mock.calls[0][1];
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/zip"
    );
    expect([...(init?.body as Uint8Array)]).toEqual([1, 2, 3]);
    expect(decode(r.stdout)).toMatchObject({
      validation: { valid: false },
      errors: ["Not a valid ZIP archive"],
    });
  });

  it("restore needs --yes off a TTY and reports 501 as a structured error", async () => {
    writeFileSync(join(home, "b.zip"), Buffer.from([1]));
    const fetch = api(() =>
      json({ error: "Restore is not implemented yet", details: "valid" }, 501)
    );
    const refused = await runCli(
      ["admin", "backup", "restore", "b.zip", "--strategy", "replace"],
      { home, fetch }
    );
    expect(refused.code).toBe(2);
    expect(refused.stdout).toContain("overwrites existing data");
    expect(fetch).not.toHaveBeenCalled();

    const r = await runCli(
      ["admin", "backup", "restore", "b.zip", "--strategy", "merge", "--yes"],
      { home, fetch }
    );
    expect(String(fetch.mock.calls[0][0])).toContain("strategy=merge");
    expect(r.code).toBe(1);
    expect(decode(r.stdout)).toMatchObject({
      error: { code: "not_implemented", status: 501 },
    });
  });
});

describe("admin audit", () => {
  it("parseSince handles relative spans and ISO", () => {
    const now = Date.parse("2026-01-08T00:00:00Z");
    expect(parseSince("7d", now)).toBe("2026-01-01T00:00:00.000Z");
    expect(parseSince("2h", now)).toBe("2026-01-07T22:00:00.000Z");
    expect(parseSince("2026-01-02", now)).toBe("2026-01-02T00:00:00.000Z");
    expect(() => parseSince("last week", now)).toThrow(/Cannot read/);
  });

  it("resolves --user email to an id and shows compact rows", async () => {
    const fetch = api((url) => {
      if (url.pathname.endsWith("/admin/users"))
        return json({ items: [{ id: "u9", email: "Asha@x.com" }] });
      return json({
        items: [
          {
            id: "a1",
            userId: "u9",
            userEmail: "asha@x.com",
            action: "DELETE",
            entityType: "PERSON",
            entityId: "p1",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        total: 51,
      });
    });
    const r = await runCli(
      [
        "admin",
        "audit",
        "--user",
        "asha@x.com",
        "--action",
        "delete",
        "--limit",
        "1",
      ],
      { home, fetch }
    );
    const auditUrl = new URL(String(fetch.mock.calls[1][0]));
    expect(auditUrl.searchParams.get("userId")).toBe("u9");
    expect(auditUrl.searchParams.get("action")).toBe("DELETE");
    const out = decode(r.stdout) as {
      audit: Array<Record<string, unknown>>;
      total: number;
      help: Array<string>;
    };
    expect(out.audit[0]).toEqual({
      at: "2026-01-01T00:00:00.000Z",
      user: "asha@x.com",
      action: "DELETE",
      entity: "PERSON:p1",
    });
    expect(out.total).toBe(51);
    expect(out.help[0]).toBe("vamsa admin audit --page 2");
  });

  it("unknown email is a not_found error", async () => {
    const fetch = api(() => json({ items: [] }));
    const r = await runCli(["admin", "audit", "--user", "nobody@x.com"], {
      home,
      fetch,
    });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("not_found");
  });
});
