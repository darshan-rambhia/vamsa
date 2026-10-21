/**
 * Integration: backup restore against the real database (SQLite or Postgres).
 * Round trip, merge without duplicates, rollback on failure, traversal.
 */

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { asc, eq } from "drizzle-orm";
import { drizzleDb, drizzleSchema as s } from "@vamsa/api";
import {
  BackupRestoreError,
  createBackupExportData,
  restoreBackupArchive,
} from "@vamsa/lib/server/business";
import apiV1 from "../../server/api/index";
import { loginAs, prepareApiDb } from "./api-helpers";

const mediaDir = mkdtempSync(join(tmpdir(), "vamsa-int-media-"));
const backupDir = mkdtempSync(join(tmpdir(), "vamsa-int-backups-"));
process.env.MEDIA_STORAGE_PATH = mediaDir;
process.env.BACKUP_STORAGE_PATH = backupDir;

let admin: { id: string; email: string; name: string | null };
let token: string;

const GENEALOGY = [
  "PersonMedia",
  "MediaObject",
  "EventParticipant",
  "Event",
  "Relationship",
  "PlacePersonLink",
  "Source",
  "Person",
  "Place",
  "FamilySettings",
];

async function wipeGenealogy() {
  const tables = [
    s.personMedias,
    s.mediaObjects,
    s.eventParticipants,
    s.events,
    s.relationships,
    s.placePersonLinks,
    s.sources,
    s.persons,
    s.places,
    s.familySettings,
  ];
  void GENEALOGY;
  for (const t of tables) await drizzleDb.delete(t);
}

async function seed() {
  const now = new Date("2026-02-01T10:00:00.000Z");
  const p1 = randomUUID();
  const p2 = randomUUID();
  const place = randomUUID();
  const event = randomUUID();
  const media = randomUUID();
  await drizzleDb.insert(s.places).values({
    id: place,
    name: "Pune",
    placeType: "CITY",
    alternativeNames: ["Poona"],
    updatedAt: now,
  });
  await drizzleDb.insert(s.persons).values([
    {
      id: p1,
      firstName: "Asha",
      lastName: "Rao",
      dateOfBirth: new Date("1950-03-04"),
      isLiving: false,
      socialLinks: { site: "x" },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: p2,
      firstName: "Ravi",
      lastName: "Rao",
      isLiving: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  await drizzleDb.insert(s.relationships).values({
    id: randomUUID(),
    personId: p1,
    relatedPersonId: p2,
    type: "PARENT",
    createdAt: now,
    updatedAt: now,
  });
  await drizzleDb.insert(s.events).values({
    id: event,
    personId: p1,
    type: "BIRTH",
    date: new Date("1950-03-04"),
    placeId: place,
    createdAt: now,
    updatedAt: now,
  });
  writeFileSync(join(mediaDir, `${media}.jpg`), "jpeg-bytes");
  await drizzleDb.insert(s.mediaObjects).values({
    id: media,
    filePath: `/data/uploads/media/${media}.jpg`,
    format: "JPEG",
    mimeType: "image/jpeg",
    fileSize: 10,
    uploadedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await drizzleDb.insert(s.personMedias).values({
    id: randomUUID(),
    personId: p1,
    mediaId: media,
    displayOrder: 0,
    createdAt: now,
    updatedAt: now,
  });
  await drizzleDb.insert(s.familySettings).values({
    id: randomUUID(),
    familyName: "Rao Family",
    updatedAt: now,
  });
  return { p1, p2, media };
}

/** Everything a restore should bring back, as comparable JSON. */
async function snapshot() {
  const rows = async (t: typeof s.persons | typeof s.places) =>
    JSON.parse(
      JSON.stringify(await drizzleDb.select().from(t).orderBy(asc(t.id)))
    ) as unknown;
  return {
    persons: await rows(s.persons),
    relationships: await rows(s.relationships as never),
    places: await rows(s.places),
    events: await rows(s.events as never),
    media: await rows(s.mediaObjects as never),
    personMedia: await rows(s.personMedias as never),
    settings: await rows(s.familySettings as never),
  };
}

async function backup(): Promise<Buffer> {
  const { zipBase64 } = await createBackupExportData(
    { includePhotos: true, includeAuditLogs: false, auditLogDays: 1 },
    admin
  );
  return Buffer.from(zipBase64, "base64");
}

/** Rewrite entries of a backup ZIP. */
function edit(
  zip: Buffer,
  fn: (files: Record<string, Uint8Array>) => void
): Buffer {
  const files = unzipSync(new Uint8Array(zip));
  fn(files);
  return Buffer.from(zipSync(files));
}

const counts = async () => ({
  persons: (await drizzleDb.select().from(s.persons)).length,
  relationships: (await drizzleDb.select().from(s.relationships)).length,
  events: (await drizzleDb.select().from(s.events)).length,
});

beforeAll(async () => {
  await prepareApiDb();
  const login = await loginAs("ADMIN");
  token = login.token;
  admin = { id: login.userId, email: "admin@test.local", name: "ADMIN" };
});

beforeEach(async () => {
  await wipeGenealogy();
});

describe("backup restore (unmocked)", () => {
  it("replace round trip: mutate, restore, data equals the original", async () => {
    const { p1, p2, media } = await seed();
    const original = await snapshot();
    const zip = await backup();

    await drizzleDb.delete(s.persons).where(eq(s.persons.id, p2));
    await drizzleDb
      .update(s.persons)
      .set({ firstName: "Changed" })
      .where(eq(s.persons.id, p1));
    await drizzleDb.insert(s.persons).values({
      id: randomUUID(),
      firstName: "Extra",
      lastName: "Person",
      updatedAt: new Date(),
    });
    await drizzleDb.update(s.familySettings).set({ familyName: "Other" });
    const { rmSync } = await import("node:fs");
    rmSync(join(mediaDir, `${media}.jpg`));

    const result = await restoreBackupArchive(
      zip,
      { strategy: "replace" },
      admin
    );

    expect(await snapshot()).toEqual(original);
    expect(result.tables?.people).toMatchObject({ inserted: 2, deleted: 2 });
    expect(result.statistics.photosImported).toBe(1);
    expect(readFileSync(join(mediaDir, `${media}.jpg`), "utf8")).toBe(
      "jpeg-bytes"
    );
    // Safety backup holds the mutated state and is recorded
    expect(result.backupCreated).toBeDefined();
    expect(existsSync(result.backupCreated!)).toBe(true);
    const [row] = await drizzleDb
      .select()
      .from(s.backups)
      .where(eq(s.backups.id, result.backupCreatedId!));
    expect(row).toMatchObject({ status: "COMPLETED", personCount: 2 });
    // Acting admin untouched; import history recorded with actor
    const [me] = await drizzleDb
      .select()
      .from(s.users)
      .where(eq(s.users.id, admin.id));
    expect(me.passwordHash).toBeTruthy();
    const history = await drizzleDb
      .select()
      .from(s.auditLogs)
      .where(eq(s.auditLogs.entityType, "BACKUP_IMPORT"));
    expect(history.some((h) => h.userId === admin.id)).toBe(true);
  });

  it("merge twice adds nothing twice and overwrites edited rows", async () => {
    const { p1 } = await seed();
    const zip = await backup();
    const before = await counts();
    await drizzleDb
      .update(s.persons)
      .set({ firstName: "Edited" })
      .where(eq(s.persons.id, p1));

    const first = await restoreBackupArchive(
      zip,
      { strategy: "merge", createBackupBeforeImport: false },
      admin
    );
    await restoreBackupArchive(
      zip,
      { strategy: "merge", createBackupBeforeImport: false },
      admin
    );
    expect(await counts()).toEqual(before);
    expect(first.tables?.people).toMatchObject({ inserted: 0, updated: 2 });
    const [p] = await drizzleDb
      .select()
      .from(s.persons)
      .where(eq(s.persons.id, p1));
    expect(p.firstName).toBe("Asha");
  });

  it("skip keeps existing rows and only adds missing ones", async () => {
    const { p1, p2 } = await seed();
    const zip = await backup();
    await drizzleDb.delete(s.persons).where(eq(s.persons.id, p2));
    await drizzleDb
      .update(s.persons)
      .set({ firstName: "Kept" })
      .where(eq(s.persons.id, p1));
    const r = await restoreBackupArchive(zip, { strategy: "skip" }, admin);
    expect(r.tables?.people).toMatchObject({ inserted: 1, skipped: 1 });
    expect(r.backupCreated).toBeUndefined();
    const names = (await drizzleDb.select().from(s.persons))
      .map((x) => x.firstName)
      .sort();
    expect(names).toEqual(["Kept", "Ravi"]);
  });

  it("a failing row mid-restore rolls back everything, deletes included", async () => {
    await seed();
    const zip = await backup();
    const before = await snapshot();
    const broken = edit(zip, (f) => {
      const people = JSON.parse(strFromU8(f["data/people.json"])) as Array<
        Record<string, unknown>
      >;
      people.push({ id: randomUUID(), firstName: null, lastName: null });
      f["data/people.json"] = strToU8(JSON.stringify(people));
    });
    await expect(
      restoreBackupArchive(
        broken,
        { strategy: "replace", createBackupBeforeImport: false },
        admin
      )
    ).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
    const failed = await drizzleDb
      .select()
      .from(s.auditLogs)
      .where(eq(s.auditLogs.entityType, "BACKUP_IMPORT_FAILED"));
    expect(failed.length).toBeGreaterThan(0);
  });

  it("rejects traversal entries before touching anything", async () => {
    await seed();
    const zip = await backup();
    const before = await snapshot();
    const evil = edit(zip, (f) => {
      f["photos/x/../../../escape.txt"] = strToU8("pwned");
    });
    await expect(
      restoreBackupArchive(evil, { strategy: "replace" }, admin)
    ).rejects.toBeInstanceOf(BackupRestoreError);
    expect(await snapshot()).toEqual(before);
    expect(existsSync(join(mediaDir, "..", "escape.txt"))).toBe(false);
  });

  it("restores an older 1.0.0 backup without genealogy files or audit logs", async () => {
    const { p2 } = await seed();
    const zip = await backup();
    const old = edit(zip, (f) => {
      for (const k of Object.keys(f)) {
        if (
          k.startsWith("data/") &&
          ![
            "data/people.json",
            "data/relationships.json",
            "data/users.json",
            "data/suggestions.json",
            "data/settings.json",
          ].includes(k)
        ) {
          delete f[k];
        }
      }
      const meta = JSON.parse(strFromU8(f["metadata.json"])) as Record<
        string,
        unknown
      >;
      meta.version = "1.0.0";
      meta.dataFiles = ["data/people.json", "data/audit-logs.json"];
      f["metadata.json"] = strToU8(JSON.stringify(meta));
    });
    await drizzleDb.delete(s.persons).where(eq(s.persons.id, p2));
    const r = await restoreBackupArchive(
      old,
      { strategy: "replace", createBackupBeforeImport: false },
      admin
    );
    expect((await counts()).persons).toBe(2);
    // Events were not in the backup, so replace left them alone
    expect((await counts()).events).toBe(1);
    expect(r.warnings.join(" ")).toMatch(/version 1\.0\.0/);
  });

  it("REST POST /admin/backups/restore restores and reports counts", async () => {
    const { p2 } = await seed();
    const zip = await backup();
    await drizzleDb.delete(s.persons).where(eq(s.persons.id, p2));
    const res = await apiV1.request("/admin/backups/restore?strategy=skip", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: new Uint8Array(zip),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tables: Record<string, { inserted: number }>;
    };
    expect(body.tables.people.inserted).toBe(1);

    const preview = await apiV1.request("/admin/backups/preview", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: new Uint8Array(zip),
    });
    const p = (await preview.json()) as {
      tables: Record<string, { new: number; existing: number }>;
    };
    expect(p.tables.people).toMatchObject({ new: 0, existing: 2 });
  });
});
