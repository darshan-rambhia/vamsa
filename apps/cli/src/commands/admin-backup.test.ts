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
        default: { url: "https://v.test", token: "t", tokenType: "session" },
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
    expect(r.code).toBe(1);
    expect(decode(r.stdout)).toMatchObject({
      error: { code: "invalid_backup", errors: ["Not a valid ZIP archive"] },
    });
  });

  it("restore uploads the ZIP and prints per-table counts", async () => {
    writeFileSync(join(home, "b.zip"), Buffer.from([1]));
    const fetch = api(() =>
      json({
        statistics: { photosImported: 2 },
        tables: { people: { inserted: 3, updated: 0, skipped: 1, deleted: 4 } },
        backupCreated: "/srv/data/backups/pre-restore-x.zip",
        warnings: [],
      })
    );
    const r = await runCli(
      ["admin", "backup", "restore", "b.zip", "--strategy", "replace", "--yes"],
      { home, fetch }
    );
    expect(r.code).toBe(0);
    const url = new URL(String(fetch.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/v1/admin/backups/restore");
    expect(url.searchParams.get("strategy")).toBe("replace");
    expect(decode(r.stdout)).toMatchObject({
      restore: {
        strategy: "replace",
        safetyBackup: "/srv/data/backups/pre-restore-x.zip",
        photos: 2,
      },
      tables: [{ table: "people", inserted: 3, deleted: 4 }],
    });
  });

  it("restore replace/merge needs --yes off a TTY; skip does not", async () => {
    writeFileSync(join(home, "b.zip"), Buffer.from([1]));
    const fetch = api(() => json({ statistics: {}, warnings: [] }));
    const r = await runCli(
      ["admin", "backup", "restore", "b.zip", "--strategy", "merge"],
      { home, fetch }
    );
    expect(r.code).toBe(2);
    expect(fetch).not.toHaveBeenCalled();
    expect(decode(r.stdout)).toMatchObject({
      error: { code: "confirmation_required" },
    });
    const skip = await runCli(["admin", "backup", "restore", "b.zip"], {
      home,
      fetch,
    });
    expect(skip.code).toBe(0);
    const bad = await runCli(
      ["admin", "backup", "restore", "b.zip", "--strategy", "nuke"],
      { home, fetch }
    );
    expect(bad.code).toBe(2);
  });

  it("create never writes outside the working directory", async () => {
    const fetch = api(
      () =>
        new Response(new Uint8Array([0x50, 0x4b]), {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": 'attachment; filename="../escape.zip"',
          },
        })
    );
    const r = await runCli(["admin", "backup", "create"], { home, fetch });
    expect(r.code).toBe(0);
    expect(decode(r.stdout)).toMatchObject({
      backup: { file: join(home, "vamsa-backup.zip") },
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

  it("--user email is sent as an exact userEmail filter", async () => {
    const fetch = api(() =>
      json({
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
      })
    );
    const r = await runCli(
      [
        "admin",
        "audit",
        "--user",
        "Asha@x.com",
        "--action",
        "delete",
        "--limit",
        "1",
      ],
      { home, fetch }
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    const auditUrl = new URL(String(fetch.mock.calls[0][0]));
    expect(auditUrl.searchParams.get("userEmail")).toBe("Asha@x.com");
    expect(auditUrl.searchParams.get("userId")).toBeNull();
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

  it("--user without @ is a user id", async () => {
    const fetch = api(() => json({ items: [], total: 0 }));
    const r = await runCli(["admin", "audit", "--user", "u9"], { home, fetch });
    expect(
      new URL(String(fetch.mock.calls[0][0])).searchParams.get("userId")
    ).toBe("u9");
    expect(decode(r.stdout)).toMatchObject({
      message: "No audit entries match.",
    });
  });
});
