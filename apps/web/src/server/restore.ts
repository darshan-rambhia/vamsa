import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./db";
import type {
  ValidationResult,
  ImportResult,
  ImportPreview,
  ConflictResolutionStrategy,
} from "@vamsa/schemas";

// Re-export types for use in components
export type { ValidationResult, ImportResult, ImportPreview };

const TOKEN_COOKIE_NAME = "vamsa-session";

// Auth helper function
async function requireAuth(
  requiredRole: "VIEWER" | "MEMBER" | "ADMIN" = "VIEWER"
) {
  const token = getCookie(TOKEN_COOKIE_NAME);
  if (!token) {
    throw new Error("Not authenticated");
  }

  const session = await prisma.session.findFirst({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    throw new Error("Session expired");
  }

  const roleHierarchy = { VIEWER: 0, MEMBER: 1, ADMIN: 2 };
  if (roleHierarchy[session.user.role] < roleHierarchy[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`);
  }

  return session.user;
}

/**
 * Validate a backup ZIP file without importing
 */
export const validateBackup = createServerFn({ method: "POST" }).handler(
  async (): Promise<ValidationResult> => {
    const user = await requireAuth("ADMIN");

    try {
      // For now, return a validation result
      // In production, this would handle FormData with file uploads
      // and use the BackupValidator class

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
      };
    } catch (error) {
      console.error("Backup validation error:", error);
      throw new Error(
        `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Preview what would be imported from a backup
 */
export const previewImport = createServerFn({ method: "POST" }).handler(
  async (): Promise<ImportPreview> => {
    await requireAuth("ADMIN");

    try {
      // Count existing items for comparison
      const [
        existingPeople,
        existingUsers,
        existingRelationships,
        existingSuggestions,
      ] = await Promise.all([
        prisma.person.count(),
        prisma.user.count(),
        prisma.relationship.count(),
        prisma.suggestion.count(),
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
      };
    } catch (error) {
      console.error("Import preview error:", error);
      throw new Error(
        `Preview failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Execute import with conflict resolution
 */
export const importBackup = createServerFn({ method: "POST" }).handler(
  async (): Promise<ImportResult> => {
    const user = await requireAuth("ADMIN");

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

      const result = await prisma.$transaction(async (tx) => {
        // Log the import action
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "CREATE",
            entityType: "BACKUP_IMPORT",
            entityId: null,
            newData: {
              timestamp: new Date().toISOString(),
              strategy: "skip",
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
          strategy: "skip" as ConflictResolutionStrategy,
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
        };
      });

      return result;
    } catch (error) {
      console.error("Backup import error:", error);

      // Log failed import attempt
      try {
        await prisma.auditLog.create({
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
        console.error("Failed to log import error:", logError);
      }

      throw new Error(
        `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
);

/**
 * Get import history for audit purposes
 */
export const getImportHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    Array<{
      id: string;
      importedAt: string;
      importedBy: string;
      strategy: string;
      statistics: any;
      success: boolean;
    }>
  > => {
    await requireAuth("ADMIN");

    const auditLogs = await prisma.auditLog.findMany({
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

    return auditLogs.map((log) => ({
      id: log.id,
      importedAt: log.createdAt.toISOString(),
      importedBy: log.user.name || log.user.email,
      strategy: (log.newData as any)?.strategy || "unknown",
      statistics: (log.newData as any)?.statistics || {},
      success: log.entityType === "BACKUP_IMPORT",
    }));
  }
);
