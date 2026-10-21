/**
 * createBackupExportData end to end with a fake db: the archive it produces
 * must pass validateBackupFile (guards the metadata listing a data file that
 * the archive did not write), and the export is recorded in the audit log.
 */

import { describe, expect, it, vi } from "vitest";
import { createBackupExportData, validateBackupFile } from "./backup";
import type { BackupDb } from "./backup";

function fakeDb(people: Array<Record<string, unknown>>) {
  let call = 0;
  // gatherBackupData selects: people, relationships, users, suggestions, settings
  const results = [people, [], [], [], []];
  const select = vi.fn(() => {
    const result = results[call++] ?? [];
    const chain: Record<string, unknown> = {};
    for (const m of ["from", "where", "orderBy", "limit", "offset"]) {
      chain[m] = () => chain;
    }
    chain.then = (resolve: (v: unknown) => void) => resolve(result);
    return chain;
  });
  const values = vi.fn(async (_v: Record<string, unknown>) => undefined);
  return {
    db: { select, insert: vi.fn(() => ({ values })) } as unknown as BackupDb,
    values,
  };
}

const user = { id: "u1", email: "a@example.com", name: "A" };

describe("createBackupExportData", () => {
  it("produces an archive that validates, even with no audit entries", async () => {
    const f = fakeDb([{ id: "p1", firstName: "Asha" }]);
    const res = await createBackupExportData(
      { includePhotos: false, includeAuditLogs: true, auditLogDays: 30 },
      user,
      f.db
    );
    expect(res.filename).toMatch(/^vamsa-backup-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(res.metadata.dataFiles).not.toContain("data/audit-logs.json");

    const validation = await validateBackupFile(
      Buffer.from(res.zipBase64, "base64")
    );
    expect(validation.errors).toEqual([]);
    expect(validation.isValid).toBe(true);
    expect(validation.metadata.statistics.totalPeople).toBe(1);
  });

  it("records the export in the audit log", async () => {
    const f = fakeDb([]);
    await createBackupExportData(
      { includePhotos: false, includeAuditLogs: false, auditLogDays: 1 },
      user,
      f.db
    );
    expect(f.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        action: "CREATE",
        entityType: "BACKUP_EXPORT",
      })
    );
  });
});
