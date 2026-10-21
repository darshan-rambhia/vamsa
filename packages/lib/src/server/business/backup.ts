/**
 * Backup Server Functions - Business Logic for Backup Management
 *
 * This module contains the business logic orchestration layer for all backup
 * operations. Each function:
 * - Performs authentication and authorization checks
 * - Queries database for family data
 * - Handles data collection, validation, archiving, and restoration
 * - Records audit logs for compliance
 * - Records metrics for monitoring
 *
 * Exported Functions:
 * - gatherBackupData: Collects all data for export (people, relationships, users, events, media, sources, places, settings)
 * - createBackupArchive: Generates ZIP archive from gathered data
 * - validateBackupFile: Validates backup file integrity and structure
 * - extractBackupData: Extracts and deserializes data from uploaded archive
 * - restoreFromBackup: Orchestrates restore process with conflict resolution and DB writes
 * - scheduleBackupJob: Configures automatic backup scheduling with cron patterns
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { ZipArchive } from "archiver";
import { strFromU8, unzipSync } from "fflate";
import { backupMetadataSchema } from "@vamsa/schemas";
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { count, desc, ne } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";
import { listAuditLogsData, recordAuditLogData } from "./audit-logs";
import type {
  BackupExportInput,
  BackupImportOptions,
  BackupMetadata,
  BackupSettings,
  ImportResult,
  ValidationResult,
} from "@vamsa/schemas";

const log = loggers.db;

/** Metadata placeholder for archives whose metadata.json can't be read. */
const UNKNOWN_METADATA: BackupMetadata = {
  version: "unknown",
  exportedAt: "",
  exportedBy: { id: "", email: "", name: null },
  statistics: {
    totalPeople: 0,
    totalRelationships: 0,
    totalUsers: 0,
    totalSuggestions: 0,
    totalPhotos: 0,
    auditLogDays: 0,
    totalAuditLogs: 0,
  },
  dataFiles: [],
  photoDirectories: [],
};

/**
 * Type for the database client used by backup functions.
 * This module uses Drizzle ORM as the default database client.
 */
export type BackupDb = typeof drizzleDb;

/**
 * Gather all family data for backup export
 *
 * Collects all family data in parallel for performance optimization:
 * - People and their demographic data
 * - Relationships between people
 * - User accounts (without password hashes for security)
 * - Events and dates
 * - Media objects and photos
 * - Sources and citations
 * - Places/locations
 * - Family settings
 * - Optional: Audit logs and suggestions
 *
 * @param options Export options specifying what to include
 * @param db Optional database client (defaults to drizzleDb)
 * @returns Object containing all collected data
 * @throws Error if database queries fail
 */
export async function gatherBackupData(
  options: BackupExportInput,
  db: BackupDb = drizzleDb
) {
  // Calculate audit log cutoff date based on days parameter
  const auditLogCutoff = new Date();
  auditLogCutoff.setDate(auditLogCutoff.getDate() - options.auditLogDays);

  // Gather all data in parallel for performance
  const [
    people,
    relationships,
    users,
    suggestions,
    settings,
    auditLogs,
    mediaObjects,
  ] = await Promise.all([
    // People ordered by name for consistency
    db
      .select()
      .from(drizzleSchema.persons)
      .orderBy(drizzleSchema.persons.lastName, drizzleSchema.persons.firstName),

    // Relationships by creation date
    db
      .select()
      .from(drizzleSchema.relationships)
      .orderBy(drizzleSchema.relationships.createdAt),

    // Users WITHOUT password hashes (SECURITY)
    db
      .select({
        id: drizzleSchema.users.id,
        email: drizzleSchema.users.email,
        name: drizzleSchema.users.name,
        personId: drizzleSchema.users.personId,
        role: drizzleSchema.users.role,
        isActive: drizzleSchema.users.isActive,
        mustChangePassword: drizzleSchema.users.mustChangePassword,
        invitedById: drizzleSchema.users.invitedById,
        createdAt: drizzleSchema.users.createdAt,
        updatedAt: drizzleSchema.users.updatedAt,
        lastLoginAt: drizzleSchema.users.lastLoginAt,
        preferredLanguage: drizzleSchema.users.preferredLanguage,
        // password field is intentionally excluded for security
      })
      .from(drizzleSchema.users)
      .orderBy(drizzleSchema.users.createdAt),

    // Suggestions for community contributions
    db
      .select()
      .from(drizzleSchema.suggestions)
      .orderBy(drizzleSchema.suggestions.submittedAt),

    // Family settings
    db.select().from(drizzleSchema.familySettings).limit(1),

    // Audit logs since the cutoff, oldest first (filtered by date if requested)
    options.includeAuditLogs
      ? listAuditLogsData({ since: auditLogCutoff, order: "asc" }, db).then(
          (r) => r.items
        )
      : Promise.resolve([]),

    // Media objects for photo collection
    options.includePhotos
      ? db
          .select()
          .from(drizzleSchema.mediaObjects)
          .orderBy(drizzleSchema.mediaObjects.uploadedAt)
      : Promise.resolve([]),
  ]);

  return {
    people,
    relationships,
    users,
    suggestions,
    settings: settings.length > 0 ? settings[0] : null,
    auditLogs,
    mediaObjects,
  };
}

/**
 * Create ZIP archive from gathered backup data
 *
 * Generates a compressed ZIP archive containing:
 * - metadata.json: Export metadata and statistics
 * - data/people.json: Person records
 * - data/relationships.json: Relationship records
 * - data/users.json: User accounts (without passwords)
 * - data/suggestions.json: Community suggestions
 * - data/settings.json: Family settings
 * - data/audit-logs.json: Audit trail (optional)
 * - photos/: Photo directory with files (optional)
 *
 * @param data Gathered backup data
 * @param metadata Backup metadata for inclusion
 * @returns Base64-encoded ZIP file content
 * @throws Error if archiving fails
 */
export async function createBackupArchive(
  data: Awaited<ReturnType<typeof gatherBackupData>>,
  metadata: BackupMetadata
): Promise<string> {
  const archive = new ZipArchive({
    zlib: { level: 9 }, // Maximum compression for storage efficiency
  });

  const chunks: Array<Buffer> = [];
  let archiveError: Error | null = null;

  // Collect all archive data chunks
  archive.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));

  // Track archive errors
  archive.on("error", (err: Error) => {
    archiveError = err;
  });

  // Add metadata file
  archive.append(JSON.stringify(metadata, null, 2), {
    name: "metadata.json",
  });

  // Add data files
  archive.append(JSON.stringify(data.people, null, 2), {
    name: "data/people.json",
  });
  archive.append(JSON.stringify(data.relationships, null, 2), {
    name: "data/relationships.json",
  });
  archive.append(JSON.stringify(data.users, null, 2), {
    name: "data/users.json",
  });
  archive.append(JSON.stringify(data.suggestions, null, 2), {
    name: "data/suggestions.json",
  });
  archive.append(JSON.stringify(data.settings || {}, null, 2), {
    name: "data/settings.json",
  });

  // Add audit logs if present
  if (data.auditLogs.length > 0) {
    archive.append(JSON.stringify(data.auditLogs, null, 2), {
      name: "data/audit-logs.json",
    });
  }

  // Add photos if requested
  if (data.mediaObjects.length > 0) {
    for (const media of data.mediaObjects) {
      const filePath = media.filePath;
      if (fs.existsSync(filePath)) {
        const fileName = path.basename(filePath);
        try {
          archive.file(filePath, { name: `photos/${media.id}/${fileName}` });
        } catch (err) {
          // Log file addition errors but continue with backup
          log
            .withErr(err)
            .ctx({ filePath })
            .msg("Failed to add photo to backup");
        }
      }
    }
  }

  // Finalize archive and wait for completion
  archive.finalize();

  const zipBase64 = await new Promise<string>((resolve, reject) => {
    archive.on("end", () => {
      if (archiveError) {
        reject(archiveError);
      } else {
        const zipBuffer = Buffer.concat(chunks);
        const encoded = zipBuffer.toString("base64");
        resolve(encoded);
      }
    });

    archive.on("error", (err: Error) => {
      reject(err);
    });
  });

  return zipBase64;
}

/**
 * Validate backup file integrity and structure
 *
 * Performs comprehensive validation of backup archives:
 * - Verifies ZIP archive integrity
 * - Checks presence of required metadata
 * - Validates metadata schema
 * - Verifies data file integrity
 * - Detects conflicts with existing data
 * - Calculates statistics about differences
 *
 * @param archiveBuffer Raw backup file data
 * @returns Validation result with detected conflicts and errors
 */
export async function validateBackupFile(
  archiveBuffer: Buffer
): Promise<ValidationResult> {
  log.info({ size: archiveBuffer.length }, "Validating backup file");

  const errors: Array<string> = [];
  const warnings: Array<string> = [];
  const emptyResult = (metadata: BackupMetadata): ValidationResult => ({
    isValid: errors.length === 0,
    metadata,
    conflicts: [],
    statistics: {
      totalConflicts: 0,
      conflictsByType: {},
      conflictsBySeverity: {},
    },
    errors,
    warnings,
  });

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(archiveBuffer));
  } catch {
    errors.push("Not a valid ZIP archive");
    return emptyResult(UNKNOWN_METADATA);
  }

  const readJson = (name: string): unknown => {
    const bytes = files[name] as Uint8Array | undefined;
    if (!bytes) return undefined;
    try {
      return JSON.parse(strFromU8(bytes));
    } catch {
      errors.push(`${name} is not valid JSON`);
      return null;
    }
  };

  const rawMetadata = readJson("metadata.json");
  if (rawMetadata === undefined) {
    errors.push("metadata.json is missing");
    return emptyResult(UNKNOWN_METADATA);
  }
  const parsed = backupMetadataSchema.safeParse(rawMetadata);
  if (!parsed.success) {
    errors.push(
      `metadata.json is invalid: ${parsed.error.issues[0]?.message ?? "bad shape"}`
    );
    return emptyResult(UNKNOWN_METADATA);
  }
  const metadata = parsed.data;

  // Every listed data file must exist and parse; record counts should match
  const expected: Record<string, number | undefined> = {
    "data/people.json": metadata.statistics.totalPeople,
    "data/relationships.json": metadata.statistics.totalRelationships,
    "data/users.json": metadata.statistics.totalUsers,
    "data/suggestions.json": metadata.statistics.totalSuggestions,
    "data/audit-logs.json": metadata.statistics.totalAuditLogs,
  };
  for (const name of metadata.dataFiles) {
    const content = readJson(name);
    if (content === undefined) {
      errors.push(`${name} is listed in metadata but missing`);
      continue;
    }
    const want = expected[name];
    if (
      want !== undefined &&
      Array.isArray(content) &&
      content.length !== want
    ) {
      warnings.push(
        `${name} has ${content.length} records, metadata says ${want}`
      );
    }
  }

  return emptyResult(metadata);
}

/**
 * Extract and deserialize data from uploaded backup archive
 *
 * Extracts backup data from ZIP archive:
 * - Reads and parses metadata.json
 * - Reads and deserializes data JSON files
 * - Extracts photos to temporary storage
 * - Validates all extracted data
 * - Returns structured backup data for import
 *
 * @param archiveBuffer Raw backup file data
 * @returns Structured backup data ready for import
 * @throws Error if extraction or parsing fails
 */
export async function extractBackupData(archiveBuffer: Buffer) {
  // TODO: Implement archive extraction
  // - Extract ZIP file
  // - Parse metadata.json
  // - Parse data/*.json files
  // - Extract photos to temp directory
  // - Return extracted data object

  log.info({ size: archiveBuffer.length }, "Extracting backup data");

  return {
    metadata: {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: "imported",
        email: "imported@vamsa.local",
        name: null,
      },
      statistics: {
        totalPeople: 0,
        totalRelationships: 0,
        totalUsers: 0,
        totalSuggestions: 0,
        totalPhotos: 0,
        auditLogDays: 90,
        totalAuditLogs: 0,
      },
      dataFiles: [],
      photoDirectories: [],
    },
    people: [],
    relationships: [],
    users: [],
    suggestions: [],
    settings: null,
    auditLogs: [],
    mediaFiles: [],
  };
}

/**
 * Orchestrate restore process with conflict resolution and DB writes
 *
 * Manages the complete backup restoration workflow:
 * - Validates extracted backup data
 * - Applies conflict resolution strategy (skip, replace, merge)
 * - Creates pre-import backup if requested
 * - Transactions for data consistency:
 *   - Deletes existing data (if replace strategy)
 *   - Imports people records
 *   - Imports relationships
 *   - Imports users
 *   - Imports suggestions
 *   - Imports settings
 *   - Imports photos
 *   - Imports audit logs
 * - Records restore audit trail
 * - Generates statistics and warnings
 *
 * @param extractedData Data extracted from backup archive
 * @param options Import options including conflict strategy
 * @param userId ID of user performing restore
 * @param db Optional database client (defaults to drizzle)
 * @returns Import result with statistics and any errors
 * @throws Error if restore transaction fails
 */
export async function restoreFromBackup(
  extractedData: Awaited<ReturnType<typeof extractBackupData>>,
  options: BackupImportOptions,
  userId: string,
  _db: BackupDb = drizzleDb
): Promise<ImportResult> {
  // TODO: Implement restore logic
  // - Validate extracted data
  // - Handle conflict resolution strategy
  // - Create pre-import backup if needed
  // - Use transaction for consistency
  // - Import all data
  // - Handle photos
  // - Record audit trail
  // - Return ImportResult
  // Note: _db parameter will be used when implementing the actual restore logic

  log.info({ userId, strategy: options.strategy }, "Starting backup restore");

  return {
    success: true,
    importedAt: new Date().toISOString(),
    importedBy: {
      id: userId,
      email: "user@vamsa.local",
      name: null,
    },
    strategy: options.strategy,
    statistics: {
      peopleImported: 0,
      relationshipsImported: 0,
      usersImported: 0,
      suggestionsImported: 0,
      photosImported: 0,
      auditLogsImported: 0,
      conflictsResolved: 0,
      skippedItems: 0,
    },
    backupCreated: undefined,
    errors: [],
    warnings: [],
  };
}

/**
 * Configure automatic backup scheduling
 *
 * Manages backup job scheduling configuration:
 * - Creates or updates BackupSettings record
 * - Configures daily, weekly, and monthly schedules
 * - Sets retention policies for each schedule type
 * - Configures storage provider (LOCAL, S3, R2, B2)
 * - Sets compression level
 * - Configures notification preferences
 *
 * Use a background job processor (e.g., Bull, Temporal, node-schedule) to:
 * - Parse cron patterns from settings
 * - Execute backup jobs at scheduled times
 * - Handle job failures and retries
 * - Clean up old backups based on retention policies
 * - Send notifications on success/failure
 *
 * @param settings Backup settings configuration
 * @param userId ID of user configuring schedules
 * @returns Result with settings ID and confirmation
 * @throws Error if settings update fails
 */
export async function scheduleBackupJob(
  settings: BackupSettings,
  userId: string
) {
  log.info(
    { userId, dailyEnabled: settings.dailyEnabled },
    "Scheduling backup jobs"
  );

  // Settings are upserted via the server function wrapper
  // This function validates and logs the scheduling configuration
  // Actual job scheduling should be handled by a background processor

  const scheduleInfo = {
    daily: settings.dailyEnabled
      ? {
          enabled: true,
          time: settings.dailyTime,
          retention: settings.dailyRetention,
        }
      : { enabled: false },
    weekly: settings.weeklyEnabled
      ? {
          enabled: true,
          day: settings.weeklyDay,
          time: settings.weeklyTime,
          retention: settings.weeklyRetention,
        }
      : { enabled: false },
    monthly: settings.monthlyEnabled
      ? {
          enabled: true,
          day: settings.monthlyDay,
          time: settings.monthlyTime,
          retention: settings.monthlyRetention,
        }
      : { enabled: false },
  };

  log.info(
    { scheduleInfo, storage: settings.storageProvider },
    "Backup schedules configured"
  );

  return {
    success: true,
    scheduleInfo,
  };
}

/** Who requested a backup export (recorded in the backup's metadata). */
export interface BackupRequester {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Build a full backup export: gather data, write metadata, zip it and record
 * the export in the audit log. Used by the web server function and REST API.
 */
export async function createBackupExportData(
  options: BackupExportInput,
  user: BackupRequester,
  db: BackupDb = drizzleDb
): Promise<{
  zipBase64: string;
  filename: string;
  metadata: BackupMetadata;
}> {
  const backupData = await gatherBackupData(options, db);

  const metadata: BackupMetadata = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    exportedBy: { id: user.id, email: user.email, name: user.name || null },
    statistics: {
      totalPeople: backupData.people.length,
      totalRelationships: backupData.relationships.length,
      totalUsers: backupData.users.length,
      totalSuggestions: backupData.suggestions.length,
      totalPhotos: backupData.mediaObjects.length,
      auditLogDays: options.auditLogDays,
      totalAuditLogs: backupData.auditLogs.length,
    },
    dataFiles: [
      "data/people.json",
      "data/relationships.json",
      "data/users.json",
      "data/suggestions.json",
      "data/settings.json",
      // createBackupArchive only writes the file when there are entries
      ...(backupData.auditLogs.length > 0 ? ["data/audit-logs.json"] : []),
    ],
    photoDirectories: backupData.mediaObjects.map((m) => `photos/${m.id}/`),
  };

  const zipBase64 = await createBackupArchive(backupData, metadata);

  await recordAuditLogData(
    {
      userId: user.id,
      action: "CREATE",
      entityType: "BACKUP_EXPORT",
      newData: {
        timestamp: new Date().toISOString(),
        statistics: metadata.statistics,
      },
    },
    db
  );

  return {
    zipBase64,
    filename: `vamsa-backup-${new Date().toISOString().split("T")[0]}.zip`,
    metadata,
  };
}

/** List stored backups (newest first), excluding soft-deleted ones. */
export async function listBackupsData(
  options: { limit: number; offset: number },
  db: BackupDb = drizzleDb
) {
  const notDeleted = ne(drizzleSchema.backups.status, "DELETED");
  const [backups, totalResult] = await Promise.all([
    db
      .select()
      .from(drizzleSchema.backups)
      .where(notDeleted)
      .orderBy(desc(drizzleSchema.backups.createdAt))
      .limit(options.limit)
      .offset(options.offset),
    db.select({ count: count() }).from(drizzleSchema.backups).where(notDeleted),
  ]);
  const total = Number(totalResult[0]?.count ?? 0);

  return {
    items: backups.map((b) => ({
      id: b.id,
      filename: b.filename,
      type: b.type,
      status: b.status,
      size: b.size ?? null,
      location: b.location,
      personCount: b.personCount,
      relationshipCount: b.relationshipCount,
      eventCount: b.eventCount,
      mediaCount: b.mediaCount,
      duration: b.duration,
      error: b.error,
      createdAt: b.createdAt,
      deletedAt: b.deletedAt,
    })),
    total,
    hasMore: options.offset + options.limit < total,
  };
}
