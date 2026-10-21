import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { count, desc, eq, or } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";
import {
  extractBackupData,
  restoreBackupArchive,
  validateBackupFile,
} from "./backup";
import { computeRestorePreview, toImportPreview } from "./backup-restore";
import type {
  BackupImportOptions,
  ImportPreview,
  ImportResult,
  ValidationResult,
} from "@vamsa/schemas";

const log = loggers.db;

/** Type for the database instance (for DI) */
export type RestoreDb = typeof drizzleDb;

/**
 * User type for restore functions
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "MEMBER" | "VIEWER";
}

function requireAdmin(user: User, what: string): void {
  if (user.role !== "ADMIN") {
    throw new Error(`Only administrators can ${what}`);
  }
}

/**
 * Validate a backup ZIP without importing
 * @throws Error if user lacks admin permissions
 */
export async function validateBackupData(
  user: User,
  archive: Buffer
): Promise<ValidationResult> {
  requireAdmin(user, "validate backups");
  return validateBackupFile(archive);
}

/**
 * Preview a restore. With an archive: per-table counts of rows that are new,
 * already present (by id) and present but different. Without one: counts of
 * existing data only.
 * @throws Error if user lacks admin permissions or the archive is unusable
 */
export async function previewImportData(
  user: User,
  archive?: Buffer,
  db: RestoreDb = drizzleDb
): Promise<ImportPreview> {
  try {
    requireAdmin(user, "preview imports");

    if (archive) {
      const validation = await validateBackupFile(archive);
      if (!validation.isValid) {
        throw new Error(`Invalid backup: ${validation.errors.join("; ")}`);
      }
      const data = await extractBackupData(archive);
      return toImportPreview(data, await computeRestorePreview(data, db));
    }

    const counted = (
      t: Parameters<ReturnType<RestoreDb["select"]>["from"]>[0]
    ) =>
      db
        .select({ n: count() })
        .from(t)
        .then((r) => Number(r[0]?.n ?? 0));
    const [people, users, relationships, suggestions] = await Promise.all([
      counted(drizzleSchema.persons),
      counted(drizzleSchema.users),
      counted(drizzleSchema.relationships),
      counted(drizzleSchema.suggestions),
    ]);

    return {
      conflicts: [],
      statistics: {
        totalConflicts: 0,
        conflictsByType: {},
        conflictsBySeverity: {},
        newItems: {
          people: 0,
          relationships: 0,
          users: 0,
          suggestions: 0,
          photos: 0,
        },
        existingItems: { people, relationships, users, suggestions },
      },
      estimatedDuration: { minSeconds: 1, maxSeconds: 30 },
    };
  } catch (error) {
    log.withErr(error).msg("Import preview error");
    throw new Error(
      `Preview failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Restore a backup ZIP (see restoreBackupArchive for strategies and safety).
 * @throws Error if the import fails (nothing is changed) or the user is not
 *   an admin
 */
export async function importBackupData(
  user: User,
  archive: Buffer,
  options: Partial<BackupImportOptions> = {},
  db: RestoreDb = drizzleDb
): Promise<ImportResult> {
  requireAdmin(user, "import backups");
  try {
    return await restoreBackupArchive(
      archive,
      { ...options, strategy: options.strategy ?? "skip" },
      { id: user.id, email: user.email, name: user.name || null },
      db
    );
  } catch (error) {
    throw new Error(
      `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get import history for audit purposes
 * @param user - Authenticated user requesting history
 * @returns List of recent imports (max 50)
 * @throws Error if user lacks admin permissions
 */
export async function getImportHistoryData(
  user: User,
  db: RestoreDb = drizzleDb
): Promise<
  Array<{
    id: string;
    importedAt: string;
    importedBy: string;
    strategy: string;
    statistics: Record<string, unknown>;
    success: boolean;
  }>
> {
  try {
    // Verify admin permissions
    if (user.role !== "ADMIN") {
      throw new Error("Only administrators can view import history");
    }

    const auditLogs = await db.query.auditLogs.findMany({
      where: (auditLogsTable) =>
        or(
          eq(auditLogsTable.entityType, "BACKUP_IMPORT"),
          eq(auditLogsTable.entityType, "BACKUP_IMPORT_FAILED")
        ),
      with: {
        user: {
          columns: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: (auditLogsTable) => [desc(auditLogsTable.createdAt)],
      limit: 50,
    });

    return auditLogs.map((log) => {
      const newData = log.newData as Record<string, unknown> | null;
      return {
        id: log.id,
        importedAt: log.createdAt.toISOString(),
        importedBy: log.user?.name || log.user?.email || "Unknown",
        strategy: (newData?.strategy as string) || "unknown",
        statistics: (newData?.statistics as Record<string, unknown>) || {},
        success: log.entityType === "BACKUP_IMPORT",
      };
    });
  } catch (error) {
    log.withErr(error).msg("Import history retrieval error");
    throw new Error(
      `History retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
