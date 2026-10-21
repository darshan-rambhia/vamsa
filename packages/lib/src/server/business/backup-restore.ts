/**
 * Backup restore: read a backup ZIP and write it into the database.
 *
 * Strategies (ids are the identity key for every table):
 * - skip:    insert rows whose id is new; leave existing rows alone
 * - merge:   insert new rows and overwrite existing rows with the backup copy
 * - replace: delete the genealogy tables the backup contains (and family
 *            settings), then insert everything from the backup
 *
 * All database writes run in one transaction on both drivers; any error rolls
 * everything back. Media files are written only after the commit.
 *
 * Users are never deleted or overwritten. Backup users whose id and email are
 * both unknown are created without credentials (backups never carry password
 * hashes), so they cannot sign in until an admin resets their password.
 * Audit log entries are only imported when asked (importAuditLogs) and are
 * never deleted.
 */

import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import {
  and,
  eq,
  getTableColumns,
  isNotNull,
  notInArray,
  sql,
} from "drizzle-orm";
import { drizzleDb, drizzleSchema, getDbDriver } from "@vamsa/api";
import { backupMetadataSchema } from "@vamsa/schemas";
import { loggers } from "@vamsa/lib/logger";
import { getMediaDir } from "@vamsa/lib/media/processor";
import type {
  BackupImportOptions,
  BackupMetadata,
  ImportPreview,
  ImportResult,
} from "@vamsa/schemas";

const log = loggers.db;

export type RestoreDbClient = typeof drizzleDb;
type Row = Record<string, unknown>;
// Drizzle table types differ per dialect; restore works on either generically
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dialect-agnostic table handle
type AnyTable = any;

/** Cap on everything inflated from a backup during restore. */
export const MAX_RESTORE_UNCOMPRESSED_BYTES = 500 * 1024 * 1024;

/** Restorable genealogy tables in insert order (parents before children). */
export const RESTORE_TABLES = [
  { key: "places", file: "data/places.json" },
  { key: "people", file: "data/people.json" },
  { key: "relationships", file: "data/relationships.json" },
  { key: "sources", file: "data/sources.json" },
  { key: "events", file: "data/events.json" },
  { key: "eventParticipants", file: "data/event-participants.json" },
  { key: "eventSources", file: "data/event-sources.json" },
  { key: "placePersonLinks", file: "data/place-person-links.json" },
  { key: "researchNotes", file: "data/research-notes.json" },
  { key: "mediaObjects", file: "data/media-objects.json" },
  { key: "personMedia", file: "data/person-media.json" },
  { key: "eventMedia", file: "data/event-media.json" },
  { key: "suggestions", file: "data/suggestions.json" },
] as const;

export type RestoreTableKey = (typeof RESTORE_TABLES)[number]["key"];

function tableFor(key: RestoreTableKey): AnyTable {
  const s = drizzleSchema;
  const map: Record<RestoreTableKey, AnyTable> = {
    places: s.places,
    people: s.persons,
    relationships: s.relationships,
    sources: s.sources,
    events: s.events,
    eventParticipants: s.eventParticipants,
    eventSources: s.eventSources,
    placePersonLinks: s.placePersonLinks,
    researchNotes: s.researchNotes,
    mediaObjects: s.mediaObjects,
    personMedia: s.personMedias,
    eventMedia: s.eventMedias,
    suggestions: s.suggestions,
  };
  return map[key];
}

export interface BackupMediaFile {
  mediaId: string;
  fileName: string;
  bytes: Uint8Array;
}

export interface ExtractedBackup {
  metadata: BackupMetadata;
  /** Rows per table; absent key = file not in this backup (older version). */
  tables: Partial<Record<RestoreTableKey, Array<Row>>>;
  users: Array<Row>;
  settings: Row | null;
  auditLogs: Array<Row>;
  mediaFiles: Array<BackupMediaFile>;
  warnings: Array<string>;
}

export class BackupRestoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupRestoreError";
  }
}

/**
 * True when a ZIP entry name could escape the extraction root: absolute
 * paths, drive letters, backslashes, NUL bytes or any ".." segment.
 */
export function isUnsafeEntryName(name: string): boolean {
  if (name.includes("\0") || name.includes("\\")) return true;
  if (name.startsWith("/") || /^[a-zA-Z]:/.test(name)) return true;
  return name.split("/").some((seg) => seg === "..");
}

/** Media file names restored to disk: plain names only, no dotfiles. */
const SAFE_FILE_NAME = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,200}$/;

/**
 * Unzip and parse a backup for restore. Throws BackupRestoreError when the
 * archive is unusable: not a ZIP, unsafe entry names, too large, missing or
 * invalid metadata or core files, or data files that are not JSON arrays.
 */
export function extractBackupArchive(
  archive: Buffer | Uint8Array,
  { maxUncompressedBytes = MAX_RESTORE_UNCOMPRESSED_BYTES } = {}
): ExtractedBackup {
  const unsafe: Array<string> = [];
  let declared = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(archive), {
      filter: (f) => {
        if (isUnsafeEntryName(f.name)) {
          unsafe.push(f.name);
          return false;
        }
        if (f.name.endsWith("/")) return false;
        declared += f.originalSize;
        return declared <= maxUncompressedBytes && unsafe.length === 0;
      },
    });
  } catch {
    throw new BackupRestoreError("Not a valid ZIP archive");
  }
  if (unsafe.length > 0) {
    throw new BackupRestoreError(
      `Backup contains unsafe file paths: ${unsafe.slice(0, 3).join(", ")}`
    );
  }
  const inflated = Object.values(files).reduce((n, f) => n + f.length, 0);
  if (declared > maxUncompressedBytes || inflated > maxUncompressedBytes) {
    throw new BackupRestoreError(
      `Backup is larger than ${Math.round(maxUncompressedBytes / 1024 / 1024)} MB uncompressed`
    );
  }

  const readJson = (name: string): unknown => {
    const bytes = files[name] as Uint8Array | undefined;
    if (!bytes) return undefined;
    try {
      return JSON.parse(strFromU8(bytes));
    } catch {
      throw new BackupRestoreError(`${name} is not valid JSON`);
    }
  };
  const readArray = (name: string, required = false) => {
    const v = readJson(name);
    if (v === undefined) {
      if (required) throw new BackupRestoreError(`${name} is missing`);
      return undefined;
    }
    if (!Array.isArray(v) || v.some((r) => !r || typeof r !== "object")) {
      throw new BackupRestoreError(`${name} must be an array of records`);
    }
    return v as Array<Row>;
  };

  const rawMeta = readJson("metadata.json");
  if (rawMeta === undefined) {
    throw new BackupRestoreError("metadata.json is missing");
  }
  const meta = backupMetadataSchema.safeParse(rawMeta);
  if (!meta.success) {
    throw new BackupRestoreError(
      `metadata.json is invalid: ${meta.error.issues[0]?.message ?? "bad shape"}`
    );
  }

  const warnings: Array<string> = [];
  const tables: ExtractedBackup["tables"] = {};
  for (const t of RESTORE_TABLES) {
    const rows = readArray(
      t.file,
      t.key === "people" || t.key === "relationships"
    );
    if (rows === undefined) continue;
    if (rows.some((r) => typeof r.id !== "string" || r.id === "")) {
      throw new BackupRestoreError(`${t.file} has records without an id`);
    }
    tables[t.key] = rows;
  }
  const missing = RESTORE_TABLES.filter((t) => !(t.key in tables));
  if (missing.length > 0) {
    warnings.push(
      `Backup (version ${meta.data.version}) has no ${missing.map((t) => t.key).join(", ")}; those tables are left as they are`
    );
  }

  const users = readArray("data/users.json", true) ?? [];
  const rawSettings = readJson("data/settings.json");
  const settings =
    rawSettings &&
    typeof rawSettings === "object" &&
    !Array.isArray(rawSettings) &&
    Object.keys(rawSettings).length > 0
      ? (rawSettings as Row)
      : null;
  // Older exports may list audit-logs.json without writing it
  const auditLogs = readArray("data/audit-logs.json") ?? [];

  const mediaFiles: Array<BackupMediaFile> = [];
  for (const [name, bytes] of Object.entries(files)) {
    if (!name.startsWith("photos/")) continue;
    const m = /^photos\/([^/]+)\/([^/]+)$/.exec(name);
    if (!m || !SAFE_FILE_NAME.test(m[2])) {
      warnings.push(`Ignored media entry ${name}`);
      continue;
    }
    mediaFiles.push({ mediaId: m[1], fileName: m[2], bytes });
  }

  return {
    metadata: meta.data,
    tables,
    users,
    settings,
    auditLogs,
    mediaFiles,
    warnings,
  };
}

/**
 * Turn a JSON row back into insertable values for `table`: drop unknown keys
 * (newer backups) and revive ISO strings in date/timestamp columns.
 */
export function reviveRow(table: AnyTable, row: Row): Row {
  const columns = getTableColumns(table) as Record<
    string,
    { dataType: string; columnType: string }
  >;
  const out: Row = {};
  for (const [key, col] of Object.entries(columns)) {
    if (!(key in row)) continue;
    let v = row[key];
    const isDate =
      col.dataType === "date" || col.columnType === "SQLiteCustomColumn";
    if (isDate && (typeof v === "string" || typeof v === "number")) {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        throw new BackupRestoreError(`Bad date "${String(v)}" in ${key}`);
      }
      v = d;
    }
    out[key] = v;
  }
  return out;
}

/** Same JSON-level shape a backup stores, for change detection. */
function differs(existing: Row, incoming: Row): boolean {
  for (const [k, v] of Object.entries(incoming)) {
    if (k === "updatedAt") continue;
    if (JSON.stringify(existing[k] ?? null) !== JSON.stringify(v ?? null)) {
      return true;
    }
  }
  return false;
}

/**
 * Run `fn` atomically. drizzle's bun-sqlite transaction() commits as soon as
 * an async callback returns its promise, so SQLite gets an explicit
 * BEGIN IMMEDIATE / COMMIT / ROLLBACK instead.
 */
export async function runAtomically<T>(
  db: RestoreDbClient,
  fn: (tx: RestoreDbClient) => Promise<T>
): Promise<T> {
  if (getDbDriver() === "sqlite") {
    const run = (q: ReturnType<typeof sql>) =>
      (db as unknown as { run: (q: unknown) => unknown }).run(q);
    await run(sql`BEGIN IMMEDIATE`);
    try {
      const result = await fn(db);
      await run(sql`COMMIT`);
      return result;
    } catch (err) {
      await run(sql`ROLLBACK`);
      throw err;
    }
  }
  return db.transaction((tx) => fn(tx as unknown as RestoreDbClient));
}

const CHUNK = 100;
function chunks<T>(items: Array<T>): Array<Array<T>> {
  const out: Array<Array<T>> = [];
  for (let i = 0; i < items.length; i += CHUNK) {
    out.push(items.slice(i, i + CHUNK));
  }
  return out;
}

async function existingRows(
  db: RestoreDbClient,
  table: AnyTable
): Promise<Map<string, Row>> {
  const rows = (await db.select().from(table)) as Array<Row>;
  return new Map(rows.map((r) => [String(r.id), r]));
}

export interface TableCounts {
  inBackup: number;
  new: number;
  existing: number;
  conflicts: number;
}

/** Per-table counts of what a restore would do, read-only. */
export async function computeRestorePreview(
  data: ExtractedBackup,
  db: RestoreDbClient = drizzleDb
): Promise<{
  tables: Record<string, TableCounts>;
  users: TableCounts;
  current: Record<string, number>;
}> {
  const tables: Record<string, TableCounts> = {};
  const current: Record<string, number> = {};
  for (const t of RESTORE_TABLES) {
    const table = tableFor(t.key);
    const existing = await existingRows(db, table);
    current[t.key] = existing.size;
    const rows = data.tables[t.key];
    if (!rows) continue;
    const c: TableCounts = {
      inBackup: rows.length,
      new: 0,
      existing: 0,
      conflicts: 0,
    };
    for (const r of rows) {
      const cur = existing.get(String(r.id));
      if (!cur) c.new++;
      else {
        c.existing++;
        if (differs(JSON.parse(JSON.stringify(cur)) as Row, r)) c.conflicts++;
      }
    }
    tables[t.key] = c;
  }

  const userRows = (await db
    .select({ id: drizzleSchema.users.id, email: drizzleSchema.users.email })
    .from(drizzleSchema.users)) as Array<{ id: string; email: string }>;
  const ids = new Set(userRows.map((u) => u.id));
  const emails = new Map(userRows.map((u) => [u.email.toLowerCase(), u.id]));
  const users: TableCounts = {
    inBackup: data.users.length,
    new: 0,
    existing: 0,
    conflicts: 0,
  };
  for (const u of data.users) {
    const byEmail = emails.get(String(u.email ?? "").toLowerCase());
    if (ids.has(String(u.id)) || byEmail) {
      users.existing++;
      // Same email under a different id: the backup user is skipped
      if (byEmail && byEmail !== u.id) users.conflicts++;
    } else users.new++;
  }
  current.users = userRows.length;
  return { tables, users, current };
}

/** Map computeRestorePreview output onto the shared ImportPreview shape. */
export function toImportPreview(
  data: ExtractedBackup,
  p: Awaited<ReturnType<typeof computeRestorePreview>>
): ImportPreview {
  const t = (k: string) =>
    p.tables[k] ?? { inBackup: 0, new: 0, existing: 0, conflicts: 0 };
  const conflictsByType: Record<string, number> = {};
  for (const [k, c] of Object.entries({ ...p.tables, users: p.users })) {
    if (c.conflicts > 0) conflictsByType[k] = c.conflicts;
  }
  const totalConflicts = Object.values(conflictsByType).reduce(
    (a, b) => a + b,
    0
  );
  const totalRows =
    Object.values(p.tables).reduce((a, c) => a + c.inBackup, 0) +
    p.users.inBackup;
  return {
    conflicts: [],
    statistics: {
      totalConflicts,
      conflictsByType,
      conflictsBySeverity: totalConflicts ? { medium: totalConflicts } : {},
      newItems: {
        people: t("people").new,
        relationships: t("relationships").new,
        users: p.users.new,
        suggestions: t("suggestions").new,
        photos: data.mediaFiles.length,
      },
      existingItems: {
        people: p.current.people ?? 0,
        relationships: p.current.relationships ?? 0,
        users: p.current.users ?? 0,
        suggestions: p.current.suggestions ?? 0,
      },
    },
    tables: { ...p.tables, users: p.users },
    estimatedDuration: {
      minSeconds: 1,
      maxSeconds: Math.max(5, Math.ceil(totalRows / 500)),
    },
  };
}

export interface RestoreActor {
  id: string;
  email: string;
  name: string | null;
}

export interface TableResult {
  inserted: number;
  updated: number;
  skipped: number;
  deleted: number;
}

export interface RestoreOutcome {
  tables: Record<string, TableResult>;
  photosImported: number;
  auditLogsImported: number;
  warnings: Array<string>;
}

const emptyResult = (): TableResult => ({
  inserted: 0,
  updated: 0,
  skipped: 0,
  deleted: 0,
});

async function insertNew(
  tx: RestoreDbClient,
  table: AnyTable,
  rows: Array<Row>
): Promise<number> {
  let inserted = 0;
  for (const part of chunks(rows)) {
    // A row whose id is new can still collide on another unique key (e.g. the
    // same relationship under a different id); such rows are skipped
    const res = (await tx
      .insert(table)
      .values(part)
      .onConflictDoNothing()
      .returning({ id: table.id })) as Array<unknown>;
    inserted += res.length;
  }
  return inserted;
}

/**
 * Write the extracted backup into the database inside the caller's
 * transaction. Returns per-table counts; media files are returned for the
 * caller to write after commit.
 */
export async function applyRestore(
  tx: RestoreDbClient,
  data: ExtractedBackup,
  options: Pick<
    BackupImportOptions,
    "strategy" | "importAuditLogs" | "importPhotos"
  >
): Promise<{ outcome: RestoreOutcome; mediaToWrite: Array<BackupMediaFile> }> {
  const { strategy } = options;
  const tables: Record<string, TableResult> = {};
  const warnings: Array<string> = [];

  if (strategy === "replace") {
    // Children first; only tables the backup actually carries are wiped
    for (const t of [...RESTORE_TABLES].reverse()) {
      if (!data.tables[t.key]) continue;
      const table = tableFor(t.key);
      const res = (await tx
        .delete(table)
        .returning({ id: table.id })) as Array<unknown>;
      tables[t.key] = { ...emptyResult(), deleted: res.length };
    }
  }

  const restoredMediaIds = new Set<string>();
  for (const t of RESTORE_TABLES) {
    const rows = data.tables[t.key];
    if (!rows) continue;
    const table = tableFor(t.key);
    const result = tables[t.key] ?? emptyResult();
    tables[t.key] = result;
    const existing =
      strategy === "replace"
        ? new Map<string, Row>()
        : await existingRows(tx, table);
    const fresh: Array<Row> = [];
    for (const raw of rows) {
      const row = reviveRow(table, raw);
      const id = String(row.id);
      const cur = existing.get(id);
      if (!cur) {
        fresh.push(row);
        continue;
      }
      if (strategy === "merge") {
        const { id: _id, ...rest } = row;
        await tx.update(table).set(rest).where(eq(table.id, id));
        result.updated++;
        if (t.key === "mediaObjects") restoredMediaIds.add(id);
      } else {
        result.skipped++;
      }
    }
    result.inserted = await insertNew(tx, table, fresh);
    result.skipped += fresh.length - result.inserted;
    if (t.key === "mediaObjects") {
      for (const r of fresh) restoredMediaIds.add(String(r.id));
    }
  }

  // Users: never deleted, never overwritten, never given credentials
  const users = emptyResult();
  if (data.users.length > 0) {
    const current = (await tx
      .select({ id: drizzleSchema.users.id, email: drizzleSchema.users.email })
      .from(drizzleSchema.users)) as Array<{ id: string; email: string }>;
    const ids = new Set(current.map((u) => u.id));
    const emails = new Set(current.map((u) => u.email.toLowerCase()));
    const fresh: Array<Row> = [];
    for (const raw of data.users) {
      const email = String(raw.email ?? "").toLowerCase();
      if (!email || ids.has(String(raw.id)) || emails.has(email)) {
        users.skipped++;
        continue;
      }
      const row = reviveRow(drizzleSchema.users, raw);
      delete row.passwordHash;
      fresh.push({
        ...row,
        email,
        passwordHash: null,
        mustChangePassword: true,
        emailVerified: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: row.updatedAt ?? new Date(),
      });
      emails.add(email);
    }
    users.inserted = await insertNew(tx, drizzleSchema.users, fresh);
    users.skipped += fresh.length - users.inserted;
    if (users.inserted > 0) {
      warnings.push(
        `${users.inserted} user(s) were created without passwords; reset their passwords before they can sign in`
      );
    }
  }
  tables.users = users;

  // Family settings: one row; skip keeps an existing row
  if (data.settings) {
    const t = drizzleSchema.familySettings;
    const settings = emptyResult();
    const row = reviveRow(t, data.settings);
    const [cur] = (await tx.select({ id: t.id }).from(t).limit(1)) as Array<{
      id: string;
    }>;
    if (!cur) {
      await tx.insert(t).values({
        ...row,
        id: (row.id as string) ?? crypto.randomUUID(),
        updatedAt: (row.updatedAt as Date) ?? new Date(),
      } as never);
      settings.inserted = 1;
    } else if (strategy === "skip") {
      settings.skipped = 1;
    } else {
      const { id: _id, ...rest } = row;
      await tx.update(t).set(rest).where(eq(t.id, cur.id));
      settings.updated = 1;
    }
    tables.settings = settings;
  }

  let auditLogsImported = 0;
  if (options.importAuditLogs && data.auditLogs.length > 0) {
    const t = drizzleSchema.auditLogs;
    // reviveRow drops non-column keys such as userEmail
    const rows = data.auditLogs.map((r) => reviveRow(t, r));
    auditLogsImported = await insertNew(tx, t, rows);
  }

  // A replace can drop people that users were linked to
  if (strategy === "replace" && data.tables.people) {
    const u = drizzleSchema.users;
    const unlinked = (await tx
      .update(u)
      .set({ personId: null })
      .where(
        and(
          isNotNull(u.personId),
          notInArray(
            u.personId,
            tx
              .select({ id: drizzleSchema.persons.id })
              .from(drizzleSchema.persons)
          )
        )
      )
      .returning({ id: u.id })) as Array<unknown>;
    if (unlinked.length > 0) {
      warnings.push(
        `${unlinked.length} user(s) were unlinked from people that are no longer in the tree`
      );
    }
  }

  const mediaToWrite = options.importPhotos
    ? data.mediaFiles.filter(
        (f) => restoredMediaIds.has(f.mediaId) || !data.tables.mediaObjects
      )
    : [];

  return {
    outcome: { tables, photosImported: 0, auditLogsImported, warnings },
    mediaToWrite,
  };
}

/**
 * Write media binaries into the media directory. Names are already checked
 * against SAFE_FILE_NAME; the resolved path is re-checked to stay inside the
 * directory. skip never overwrites an existing file.
 */
export async function writeMediaFiles(
  files: Array<BackupMediaFile>,
  strategy: BackupImportOptions["strategy"],
  dir: string = getMediaDir()
): Promise<{ written: number; warnings: Array<string> }> {
  const warnings: Array<string> = [];
  if (files.length === 0) return { written: 0, warnings };
  const root = path.resolve(dir);
  await mkdir(root, { recursive: true });
  let written = 0;
  for (const f of files) {
    const target = path.resolve(root, f.fileName);
    if (path.dirname(target) !== root) {
      warnings.push(`Skipped unsafe media file ${f.fileName}`);
      continue;
    }
    try {
      if (strategy === "skip") {
        const exists = await stat(target).then(
          () => true,
          () => false
        );
        if (exists) continue;
      }
      const tmp = `${target}.restore-${process.pid}-${Date.now()}`;
      await writeFile(tmp, f.bytes);
      await rename(tmp, target);
      written++;
    } catch (err) {
      log.withErr(err).ctx({ file: f.fileName }).msg("Media restore failed");
      warnings.push(`Could not write media file ${f.fileName}`);
    }
  }
  return { written, warnings };
}

/** ImportResult statistics from per-table counts. */
export function toImportResult(
  actor: RestoreActor,
  strategy: BackupImportOptions["strategy"],
  outcome: RestoreOutcome,
  extraWarnings: Array<string>,
  backupCreated?: { id: string; path: string }
): ImportResult {
  const n = (k: string) => {
    const r = outcome.tables[k];
    return r ? r.inserted + r.updated : 0;
  };
  const all = Object.values(outcome.tables);
  return {
    success: true,
    importedAt: new Date().toISOString(),
    importedBy: actor,
    strategy,
    statistics: {
      peopleImported: n("people"),
      relationshipsImported: n("relationships"),
      usersImported: n("users"),
      suggestionsImported: n("suggestions"),
      photosImported: outcome.photosImported,
      auditLogsImported: outcome.auditLogsImported,
      conflictsResolved: all.reduce((a, r) => a + r.updated, 0),
      skippedItems: all.reduce((a, r) => a + r.skipped, 0),
    },
    tables: outcome.tables,
    backupCreated: backupCreated?.path,
    backupCreatedId: backupCreated?.id,
    errors: [],
    warnings: [...extraWarnings, ...outcome.warnings],
  };
}
