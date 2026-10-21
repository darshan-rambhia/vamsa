/**
 * validateBackupFile hardening: backward compatibility with older exports,
 * required core files, entry filtering and the uncompressed size cap.
 * Archives are built with fflate so each case controls the exact contents.
 */

import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { validateBackupFile } from "./backup";

const statistics = {
  totalPeople: 1,
  totalRelationships: 0,
  totalUsers: 1,
  totalSuggestions: 0,
  totalPhotos: 0,
  auditLogDays: 90,
  totalAuditLogs: 0,
};

function metadata(over: Record<string, unknown> = {}) {
  return {
    version: "1.0.0",
    exportedAt: "2026-01-01T00:00:00.000Z",
    exportedBy: { id: "u1", email: "a@example.com", name: null },
    statistics,
    dataFiles: [
      "data/people.json",
      "data/relationships.json",
      "data/users.json",
      "data/suggestions.json",
      "data/settings.json",
    ],
    photoDirectories: [],
    ...over,
  };
}

function zip(entries: Record<string, unknown>): Buffer {
  const files: Record<string, Uint8Array> = {};
  for (const [name, value] of Object.entries(entries)) {
    files[name] =
      value instanceof Uint8Array ? value : strToU8(JSON.stringify(value));
  }
  return Buffer.from(zipSync(files));
}

const core = {
  "data/people.json": [{ id: "p1" }],
  "data/relationships.json": [],
  "data/users.json": [{ id: "u1" }],
  "data/suggestions.json": [],
  "data/settings.json": null,
};

describe("validateBackupFile", () => {
  it("accepts an old-style backup that lists audit-logs.json with 0 entries but omits it", async () => {
    const res = await validateBackupFile(
      zip({
        "metadata.json": metadata({
          dataFiles: [...metadata().dataFiles, "data/audit-logs.json"],
        }),
        ...core,
      })
    );
    expect(res.errors).toEqual([]);
    expect(res.isValid).toBe(true);
    expect(res.warnings).toEqual([
      "data/audit-logs.json is listed but absent (no audit entries exported)",
    ]);
  });

  it("still errors when audit-logs.json is listed with entries but missing", async () => {
    const res = await validateBackupFile(
      zip({
        "metadata.json": metadata({
          statistics: { ...statistics, totalAuditLogs: 5 },
          dataFiles: [...metadata().dataFiles, "data/audit-logs.json"],
        }),
        ...core,
      })
    );
    expect(res.isValid).toBe(false);
    expect(res.errors).toEqual([
      "data/audit-logs.json is listed in metadata but missing",
    ]);
  });

  it("requires the core data files even if metadata does not list them", async () => {
    const res = await validateBackupFile(
      zip({
        "metadata.json": metadata({ dataFiles: [] }),
        "data/people.json": [],
      })
    );
    expect(res.isValid).toBe(false);
    expect(res.errors).toEqual([
      "data/relationships.json is missing",
      "data/users.json is missing",
    ]);
  });

  it("ignores entries it does not read (photos, nested paths)", async () => {
    const res = await validateBackupFile(
      zip({
        "metadata.json": metadata(),
        ...core,
        "photos/p1/huge.jpg": new Uint8Array(2048),
        "data/nested/evil.json": "not json at all",
      }),
      { maxUncompressedBytes: 1024 }
    );
    expect(res.errors).toEqual([]);
    expect(res.isValid).toBe(true);
  });

  it("refuses archives whose data inflates beyond the cap", async () => {
    const res = await validateBackupFile(
      zip({
        "metadata.json": metadata(),
        ...core,
        "data/people.json": Array.from({ length: 200 }, (_, i) => ({
          id: `p${i}`,
        })),
      }),
      { maxUncompressedBytes: 512 }
    );
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toMatch(/larger than .* uncompressed/);
  });
});
