import { prisma as defaultPrisma } from "../db";
import type { User, PrismaClient } from "@vamsa/api";
import type {
  ValidationResult,
  ImportResult,
  ImportPreview,
  ConflictResolutionStrategy,
} from "@vamsa/schemas";
import { logger, serializeError } from "@vamsa/lib/logger";

/**
 * Type for the database client used by restore functions.
 * This allows dependency injection for testing.
 */
export type RestoreDb = Pick<
  PrismaClient,
  "person" | "user" | "relationship" | "suggestion" | "auditLog" | "$transaction"
>;

/**
 * Validate a backup ZIP file without importing
 * @param user - Authenticated user performing validation
 * @param db Optional database client (defaults to prisma)
 * @returns Validation result with metadata about the backup
 * @throws Error if user lacks admin permissions
 */
export async function validateBackupData(
  user: User,
  _db: RestoreDb = defaultPrisma as RestoreDb
): Promise<ValidationResult> {
  try {
    // Verify admin permissions
    if (user.role !== "ADMIN") {
      throw new Error("Only administrators can validate backups");
    }

    // For now, return a validation result
    // In production, this would handle FormData with file uploads
    // and use the BackupValidator class
    // Note: _db parameter will be used when implementing actual validation logic

    return {
      isValid: true,
      metadata: {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: user.id,
          email: user.email,
          name: user.name || null,
        },
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
      },
      conflicts: [],
      statistics: {
        totalConflicts: 0,
        conflictsByType: {},
        conflictsBySeverity: {},
      },
      errors: [],
      warnings: [],
    } as ValidationResult;
  } catch (error) {
    logger.error({ error: serializeError(error) }, "Backup validation error");
    throw new Error(
      `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Preview what would be imported from a backup
 * @param user - Authenticated user requesting preview
 * @param db Optional database client (defaults to prisma)
 * @returns Import preview with existing data counts
 * @throws Error if user lacks admin permissions
 */
export async function previewImportData(
  user: User,
  db: RestoreDb = defaultPrisma as RestoreDb
): Promise<ImportPreview> {
  try {
    // Verify admin permissions
    if (user.role !== "ADMIN") {
      throw new Error("Only administrators can preview imports");
    }

    // Count existing items for comparison
    const [
      existingPeople,
      existingUsers,
      existingRelationships,
      existingSuggestions,
    ] = await Promise.all([
      db.person.count(),
      db.user.count(),
      db.relationship.count(),
      db.suggestion.count(),
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
        existingItems: {
          people: existingPeople,
          relationships: existingRelationships,
          users: existingUsers,
          suggestions: existingSuggestions,
        },
      },
      estimatedDuration: {
        minSeconds: 5,
        maxSeconds: 30,
      },
    } as ImportPreview;
  } catch (error) {
    logger.error({ error: serializeError(error) }, "Import preview error");
    throw new Error(
      `Preview failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Execute import with conflict resolution
 * @param user - Authenticated user performing the import
 * @param strategy - Conflict resolution strategy to apply
 * @param db Optional database client (defaults to prisma)
 * @returns Import result with statistics
 * @throws Error if import fails or user lacks admin permissions
 */
export async function importBackupData(
  user: User,
  strategy: ConflictResolutionStrategy = "skip",
  db: RestoreDb = defaultPrisma as RestoreDb
): Promise<ImportResult> {
  try {
    // Validate admin permissions
    if (user.role !== "ADMIN") {
      throw new Error("Only administrators can import backups");
    }

    // This is a placeholder that demonstrates the structure
    // In production, this would:
    // 1. Receive FormData with file
    // 2. Validate the backup
    // 3. Create pre-import backup
    // 4. Start transaction
    // 5. Apply conflict resolution
    // 6. Import data
    // 7. Create audit log
    // 8. Commit transaction

    const result = await (db as any).$transaction(async (tx: RestoreDb) => {
      // Log the import action
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entityType: "BACKUP_IMPORT",
          entityId: null,
          newData: {
            timestamp: new Date().toISOString(),
            strategy,
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
          },
        },
      });

      return {
        success: true,
        importedAt: new Date().toISOString(),
        importedBy: {
          id: user.id,
          email: user.email,
          name: user.name || null,
        },
        strategy,
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
        errors: [],
        warnings: [],
      } as ImportResult;
    });

    return result;
  } catch (error) {
    logger.error({ error: serializeError(error) }, "Backup import error");

    // Log failed import attempt
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entityType: "BACKUP_IMPORT_FAILED",
          entityId: null,
          newData: {
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
      });
    } catch (logError) {
      logger.error(
        { error: serializeError(logError) },
        "Failed to log import error"
      );
    }

    throw new Error(
      `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get import history for audit purposes
 * @param user - Authenticated user requesting history
 * @param db Optional database client (defaults to prisma)
 * @returns List of recent imports (max 50)
 * @throws Error if user lacks admin permissions
 */
export async function getImportHistoryData(
  user: User,
  db: RestoreDb = defaultPrisma as RestoreDb
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

    const auditLogs = await db.auditLog.findMany({
      where: {
        entityType: {
          in: ["BACKUP_IMPORT", "BACKUP_IMPORT_FAILED"],
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return auditLogs.map((log) => {
      const newData = log.newData as Record<string, unknown> | null;
      return {
        id: log.id,
        importedAt: log.createdAt.toISOString(),
        importedBy: log.user.name || log.user.email,
        strategy: (newData?.strategy as string) || "unknown",
        statistics: (newData?.statistics as Record<string, unknown>) || {},
        success: log.entityType === "BACKUP_IMPORT",
      };
    });
  } catch (error) {
    logger.error(
      { error: serializeError(error) },
      "Import history retrieval error"
    );
    throw new Error(
      `History retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
