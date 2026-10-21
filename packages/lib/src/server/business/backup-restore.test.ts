/**
 * Unit tests for the backup restore engine's pure parts: archive extraction
 * (path safety, size caps, older formats), row revival and media writes.
 * Database behaviour is covered by apps/web/tests/integration/backup-restore.int.ts.
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { date, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import {
  BackupRestoreError,
  extractBackupArchive,
  isUnsafeEntryName,
  reviveRow,
  writeMediaFiles,
} from "./backup-restore";

const metadata = (version = "1.1.0") => ({
  version,
  exportedAt: "2026-01-01T00:00:00.000Z",
  exportedBy: { id: "u1", email: "a@b.c", name: null },
  statistics: {
    totalPeople: 1,
    totalRelationships: 0,
    totalUsers: 1,
    totalSuggestions: 0,
    totalPhotos: 1,
    auditLogDays: 90,
    totalAuditLogs: 0,
  },
  dataFiles: ["data/people.json"],
  photoDirectories: [],
});

function zip(entries: Record<string, unknown>): Buffer {
  const files: Record<string, Uint8Array> = {};
  for (const [name, v] of Object.entries(entries)) {
    files[name] = v instanceof Uint8Array ? v : strToU8(JSON.stringify(v));
  }
  return Buffer.from(zipSync(files));
}

const core = {
  "metadata.json": metadata(),
  "data/people.json": [{ id: "p1", firstName: "A", lastName: "B" }],
  "data/relationships.json": [],
  "data/users.json": [{ id: "u1", email: "a@b.c" }],
  "data/settings.json": {},
};

describe("isUnsafeEntryName", () => {
  it.each([
    ["../evil", true],
    ["photos/../../etc/passwd", true],
    ["/etc/passwd", true],
    ["C:/x", true],
    ["photos\\x", true],
    ["data/people.json", false],
    ["photos/m1/a..b.jpg", false],
  ])("%s -> %s", (name, unsafe) => {
    expect(isUnsafeEntryName(name)).toBe(unsafe);
  });
});

describe("extractBackupArchive", () => {
  it("reads tables, users, settings and media files", () => {
    const data = extractBackupArchive(
      zip({
        ...core,
        "data/settings.json": { id: "s1", familyName: "Rao" },
        "data/events.json": [{ id: "e1", personId: "p1", type: "BIRTH" }],
        "photos/m1/abc.jpg": new Uint8Array([1, 2, 3]),
      })
    );
    expect(data.tables.people).toHaveLength(1);
    expect(data.tables.events).toEqual([
      { id: "e1", personId: "p1", type: "BIRTH" },
    ]);
    expect(data.users).toHaveLength(1);
    expect(data.settings).toEqual({ id: "s1", familyName: "Rao" });
    expect(data.mediaFiles).toEqual([
      { mediaId: "m1", fileName: "abc.jpg", bytes: new Uint8Array([1, 2, 3]) },
    ]);
  });

  it("treats tables missing from older backups as absent, not empty", () => {
    const data = extractBackupArchive(
      zip({ ...core, "metadata.json": metadata("1.0.0") })
    );
    expect("events" in data.tables).toBe(false);
    expect(data.tables.relationships).toEqual([]);
    expect(data.auditLogs).toEqual([]);
    expect(data.settings).toBeNull();
    expect(data.warnings[0]).toMatch(/version 1\.0\.0.*left as they are/);
  });

  it("rejects archives with path traversal entries", () => {
    expect(() =>
      extractBackupArchive(zip({ ...core, "../../evil.sh": "x" }))
    ).toThrow(/unsafe file paths: \.\.\/\.\.\/evil\.sh/);
    expect(() =>
      extractBackupArchive(zip({ ...core, "photos/m1/../../../x.jpg": "x" }))
    ).toThrow(BackupRestoreError);
  });

  it("ignores media entries with odd names", () => {
    const data = extractBackupArchive(
      zip({ ...core, "photos/m1/.htaccess": "x", "photos/a/b/c.jpg": "x" })
    );
    expect(data.mediaFiles).toEqual([]);
    expect(data.warnings).toContain("Ignored media entry photos/m1/.htaccess");
  });

  it("enforces the uncompressed size cap", () => {
    expect(() =>
      extractBackupArchive(
        zip({ ...core, "photos/m1/big.jpg": new Uint8Array(4096) }),
        { maxUncompressedBytes: 1024 }
      )
    ).toThrow(/larger than/);
  });

  it("rejects missing core files, non-arrays and rows without ids", () => {
    const { "data/people.json": _p, ...noPeople } = core;
    expect(() => extractBackupArchive(zip(noPeople))).toThrow(
      "data/people.json is missing"
    );
    expect(() =>
      extractBackupArchive(zip({ ...core, "data/events.json": { id: 1 } }))
    ).toThrow("data/events.json must be an array of records");
    expect(() =>
      extractBackupArchive(zip({ ...core, "data/places.json": [{ x: 1 }] }))
    ).toThrow("data/places.json has records without an id");
    expect(() => extractBackupArchive(Buffer.from("nope"))).toThrow(
      "Not a valid ZIP archive"
    );
  });
});

const pgSchema = {
  persons: pgTable("Person", {
    id: text("id").primaryKey(),
    firstName: text("firstName"),
    dateOfBirth: date("dateOfBirth", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }),
    socialLinks: jsonb("socialLinks"),
  }),
};

describe("reviveRow", () => {
  it("turns ISO strings into Dates for date columns and drops unknown keys", () => {
    const row = reviveRow(pgSchema.persons, {
      id: "p1",
      firstName: "A",
      dateOfBirth: "1990-04-12T00:00:00.000Z",
      createdAt: "2026-01-01T10:00:00.000Z",
      socialLinks: { x: "y" },
      notAColumn: 1,
    });
    expect(row.dateOfBirth).toEqual(new Date("1990-04-12T00:00:00.000Z"));
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.socialLinks).toEqual({ x: "y" });
    expect(row).not.toHaveProperty("notAColumn");
  });

  it("rejects unparseable dates", () => {
    expect(() =>
      reviveRow(pgSchema.persons, { id: "p", createdAt: "yesterday" })
    ).toThrow(/Bad date/);
  });
});

describe("writeMediaFiles", () => {
  const file = (name: string, byte: number) => ({
    mediaId: "m",
    fileName: name,
    bytes: new Uint8Array([byte]),
  });

  it("writes into the media dir; skip keeps existing files, merge overwrites", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vamsa-media-"));
    writeFileSync(join(dir, "old.jpg"), "keep");

    const skip = await writeMediaFiles(
      [file("new.jpg", 1), file("old.jpg", 2)],
      "skip",
      dir
    );
    expect(skip.written).toBe(1);
    expect(readFileSync(join(dir, "old.jpg"), "utf8")).toBe("keep");
    expect([...readFileSync(join(dir, "new.jpg"))]).toEqual([1]);

    const merge = await writeMediaFiles([file("old.jpg", 9)], "merge", dir);
    expect(merge.written).toBe(1);
    expect([...readFileSync(join(dir, "old.jpg"))]).toEqual([9]);
  });

  it("refuses names that resolve outside the media dir", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vamsa-media-"));
    const r = await writeMediaFiles([file("../x.jpg", 1)], "merge", dir);
    expect(r.written).toBe(0);
    expect(r.warnings[0]).toMatch(/unsafe/);
  });
});
