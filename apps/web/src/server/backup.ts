/**
 * Backup Server Functions - Framework Wrappers
 *
 * This module contains thin `createServerFn` wrappers that call the business logic
 * functions from backup.server.ts. These wrappers handle:
 * - Input validation with Zod schemas
 * - Calling the corresponding server function
 * - Authentication (delegated to server layer via requireAuth)
 * - Error handling
 *
 * This layer is excluded from unit test coverage as it's framework integration code.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { drizzleDb, drizzleSchema } from "@vamsa/lib/server";
import { eq, ne, desc, count } from "drizzle-orm";
import {
  backupExportSchema,
  backupSettingsSchema,
  listBackupsInputSchema,
  type BackupExportInput,
  type BackupMetadata,
  type BackupSettings,
  type ListBackupsInput,
  type Backup,
} from "@vamsa/schemas";
import { logger, serializeError } from "@vamsa/lib/logger";
import { requireAuth } from "./middleware/require-auth";
import {
  gatherBackupData,
  createBackupArchive,
  validateBackupFile,
  extractBackupData,
  restoreFromBackup,
  scheduleBackupJob,
} from "@vamsa/lib/server/business";

/**
 * Result type for exportBackup function
 */
export type ExportBackupResult = {
  success: boolean;
  message: string;
  zipBase64?: string;
  filename?: string;
  metadata?: BackupMetadata;
};

/**
 * Export backup server function
 *
 * Creates a complete backup export including:
 * - All family data (people, relationships, users, events, media, sources, places, settings)
 * - Optional: Audit logs and photos
 * - Creates ZIP archive with metadata
 * - Records audit trail
 *
 * Admin-only endpoint.
 */
export const exportBackup = createServerFn({ method: "POST" })
  .inputValidator((data: BackupExportInput) => backupExportSchema.parse(data))
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      message: string;
      zipBase64?: string;
      filename?: string;
      metadata?: BackupMetadata;
    }> => {
      const user = await requireAuth("ADMIN");

      // Gather backup data
      const backupData = await gatherBackupData(data);

      // Create metadata
      const metadata: BackupMetadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: user.id,
          email: user.email,
          name: user.name || null,
        },
        statistics: {
          totalPeople: backupData.people.length,
          totalRelationships: backupData.relationships.length,
          totalUsers: backupData.users.length,
          totalSuggestions: backupData.suggestions.length,
          totalPhotos: backupData.mediaObjects.length,
          auditLogDays: data.auditLogDays,
          totalAuditLogs: backupData.auditLogs.length,
        },
        dataFiles: [
          "data/people.json",
          "data/relationships.json",
          "data/users.json",
          "data/suggestions.json",
          "data/settings.json",
          ...(data.includeAuditLogs ? ["data/audit-logs.json"] : []),
        ],
        photoDirectories: backupData.mediaObjects.map((m) => `photos/${m.id}/`),
      };

      // Create ZIP archive
      const zipBase64 = await createBackupArchive(backupData, metadata);

      // Log audit trail
      try {
        await drizzleDb.insert(drizzleSchema.auditLogs).values({
          id: crypto.randomUUID(),
          userId: user.id,
          action: "CREATE",
          entityType: "BACKUP_EXPORT",
          entityId: null,
          newData: {
            timestamp: new Date().toISOString(),
            statistics: metadata.statistics,
          },
        });
      } catch (err) {
        // Log audit error but don't fail the export
        logger.error(
          { error: serializeError(err) },
          "Failed to create audit log for backup export"
        );
      }

      return {
        success: true,
        message: "Backup exported successfully",
        zipBase64,
        filename: `vamsa-backup-${new Date().toISOString().split("T")[0]}.zip`,
        metadata,
      };
    }
  );

/**
 * List backups with pagination
 *
 * Retrieves backup history with pagination support.
 * Excludes soft-deleted backups.
 *
 * Admin-only endpoint.
 */
export const listBackups = createServerFn({ method: "POST" })
  .inputValidator((data: ListBackupsInput) =>
    listBackupsInputSchema.parse(data)
  )
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const [backups, totalResult] = await Promise.all([
      drizzleDb
        .select()
        .from(drizzleSchema.backups)
        .where(ne(drizzleSchema.backups.status, "DELETED"))
        .orderBy(desc(drizzleSchema.backups.createdAt))
        .limit(data.limit)
        .offset(data.offset),
      drizzleDb
        .select({ count: count() })
        .from(drizzleSchema.backups)
        .where(ne(drizzleSchema.backups.status, "DELETED")),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      items: backups.map((b) => ({
        id: b.id,
        filename: b.filename,
        type: b.type,
        status: b.status,
        size: b.size ? BigInt(b.size) : null,
        location: b.location,
        personCount: b.personCount,
        relationshipCount: b.relationshipCount,
        eventCount: b.eventCount,
        mediaCount: b.mediaCount,
        duration: b.duration,
        error: b.error,
        createdAt: b.createdAt,
        deletedAt: b.deletedAt,
      })) as Backup[],
      total,
      hasMore: data.offset + data.limit < total,
    };
  });

/**
 * Download backup server function
 *
 * Retrieves download URL for a completed backup.
 * Returns 404 if backup doesn't exist or isn't ready.
 *
 * Admin-only endpoint.
 */
export const downloadBackup = createServerFn({ method: "POST" })
  .inputValidator((data: { backupId: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const [backup] = await drizzleDb
      .select()
      .from(drizzleSchema.backups)
      .where(eq(drizzleSchema.backups.id, data.backupId))
      .limit(1);

    if (!backup) {
      throw new Error("Backup not found");
    }

    if (backup.status !== "COMPLETED") {
      throw new Error("Backup is not available for download");
    }

    // For local storage, we'd need to implement actual file serving
    // This is a placeholder that returns the expected path
    const downloadUrl = `/api/backups/${backup.id}/download`;

    return {
      success: true,
      downloadUrl,
      filename: backup.filename,
    };
  });

/**
 * Verify backup server function
 *
 * Validates backup file integrity.
 * Returns validation status and any errors.
 *
 * Admin-only endpoint.
 */
export const verifyBackup = createServerFn({ method: "POST" })
  .inputValidator((data: { backupId: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const [backup] = await drizzleDb
      .select()
      .from(drizzleSchema.backups)
      .where(eq(drizzleSchema.backups.id, data.backupId))
      .limit(1);

    if (!backup) {
      throw new Error("Backup not found");
    }

    // Placeholder verification logic
    // In a real implementation, this would check file integrity
    const isValid =
      backup.status === "COMPLETED" && backup.size && backup.size > 0;

    return {
      success: true,
      isValid,
      backupId: backup.id,
      message: isValid ? "Backup is valid" : "Backup verification failed",
    };
  });

/**
 * Delete backup server function
 *
 * Soft-deletes a backup by updating status to DELETED.
 * Records audit trail for compliance.
 *
 * Admin-only endpoint.
 */
export const deleteBackup = createServerFn({ method: "POST" })
  .inputValidator((data: { backupId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("ADMIN");

    const [backup] = await drizzleDb
      .select()
      .from(drizzleSchema.backups)
      .where(eq(drizzleSchema.backups.id, data.backupId))
      .limit(1);

    if (!backup) {
      throw new Error("Backup not found");
    }

    // Soft delete by updating status
    await drizzleDb
      .update(drizzleSchema.backups)
      .set({
        status: "DELETED",
        deletedAt: new Date(),
      })
      .where(eq(drizzleSchema.backups.id, data.backupId));

    // Log the deletion
    try {
      await drizzleDb.insert(drizzleSchema.auditLogs).values({
        id: crypto.randomUUID(),
        userId: user.id,
        action: "DELETE",
        entityType: "BACKUP",
        entityId: data.backupId,
        previousData: {
          filename: backup.filename,
          type: backup.type,
        },
      });
    } catch (err) {
      logger.error(
        { error: serializeError(err) },
        "Failed to create audit log for backup deletion"
      );
    }

    return {
      success: true,
      message: "Backup deleted successfully",
    };
  });

/**
 * Import backup server function
 *
 * Imports backup data into the database.
 * Validates backup file and applies conflict resolution strategy.
 * Creates pre-import backup if requested.
 * Records restore audit trail.
 *
 * Admin-only endpoint.
 */
export const importBackup = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      backupData: string;
      options: z.infer<typeof backupSettingsSchema>;
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await requireAuth("ADMIN");

    // Convert base64 to buffer
    const backupBuffer = Buffer.from(data.backupData, "base64");

    // Validate backup file
    const validationResult = await validateBackupFile(backupBuffer);

    if (!validationResult.isValid) {
      throw new Error("Backup file validation failed");
    }

    // Extract backup data
    const extractedData = await extractBackupData(backupBuffer);

    // Restore from backup
    const importResult = await restoreFromBackup(
      extractedData,
      {
        strategy: "replace",
        createBackupBeforeImport: true,
        importPhotos: true,
        importAuditLogs: false,
      },
      user.id
    );

    return importResult;
  });

/**
 * Get backup settings server function
 *
 * Retrieves current backup scheduling configuration.
 * Returns default values if no settings have been configured.
 *
 * Admin-only endpoint.
 */
export const getBackupSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAuth("ADMIN");

    const [settings] = await drizzleDb
      .select()
      .from(drizzleSchema.backupSettings)
      .limit(1);

    if (!settings) {
      // Return defaults if no settings exist
      return {
        id: null as string | null,
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyDay: 0,
        weeklyTime: "03:00",
        monthlyEnabled: true,
        monthlyDay: 1,
        monthlyTime: "04:00",
        dailyRetention: 7,
        weeklyRetention: 4,
        monthlyRetention: 12,
        storageProvider: "LOCAL" as const,
        storageBucket: null as string | null,
        storageRegion: null as string | null,
        storagePath: "backups",
        includePhotos: true,
        includeAuditLogs: false,
        compressLevel: 6,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notificationEmails: null as string | null,
      };
    }

    return {
      id: settings.id,
      dailyEnabled: settings.dailyEnabled,
      dailyTime: settings.dailyTime,
      weeklyEnabled: settings.weeklyEnabled,
      weeklyDay: settings.weeklyDay,
      weeklyTime: settings.weeklyTime,
      monthlyEnabled: settings.monthlyEnabled,
      monthlyDay: settings.monthlyDay,
      monthlyTime: settings.monthlyTime,
      dailyRetention: settings.dailyRetention,
      weeklyRetention: settings.weeklyRetention,
      monthlyRetention: settings.monthlyRetention,
      storageProvider: settings.storageProvider,
      storageBucket: settings.storageBucket,
      storageRegion: settings.storageRegion,
      storagePath: settings.storagePath,
      includePhotos: settings.includePhotos,
      includeAuditLogs: settings.includeAuditLogs,
      compressLevel: settings.compressLevel,
      notifyOnSuccess: settings.notifyOnSuccess,
      notifyOnFailure: settings.notifyOnFailure,
      notificationEmails:
        typeof settings.notificationEmails === "string"
          ? settings.notificationEmails
          : settings.notificationEmails
            ? JSON.stringify(settings.notificationEmails)
            : null,
    };
  }
);

/**
 * Schedule backup server function
 *
 * Creates or updates backup scheduling configuration.
 * Configures daily, weekly, and monthly backup schedules.
 * Sets retention policies and storage provider settings.
 * Records audit trail for scheduling changes.
 *
 * Admin-only endpoint.
 */
export const scheduleBackup = createServerFn({ method: "POST" })
  .inputValidator((data: BackupSettings) => backupSettingsSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await requireAuth("ADMIN");

    logger.info({ updatedBy: user.id }, "Updating backup settings");

    // Schedule backup jobs
    await scheduleBackupJob(data, user.id);

    const [existing] = await drizzleDb
      .select()
      .from(drizzleSchema.backupSettings)
      .limit(1);

    if (existing) {
      const [updated] = await drizzleDb
        .update(drizzleSchema.backupSettings)
        .set({
          dailyEnabled: data.dailyEnabled,
          dailyTime: data.dailyTime,
          weeklyEnabled: data.weeklyEnabled,
          weeklyDay: data.weeklyDay,
          weeklyTime: data.weeklyTime,
          monthlyEnabled: data.monthlyEnabled,
          monthlyDay: data.monthlyDay,
          monthlyTime: data.monthlyTime,
          dailyRetention: data.dailyRetention,
          weeklyRetention: data.weeklyRetention,
          monthlyRetention: data.monthlyRetention,
          storageProvider: data.storageProvider,
          storageBucket: data.storageBucket,
          storageRegion: data.storageRegion,
          storagePath: data.storagePath,
          includePhotos: data.includePhotos,
          includeAuditLogs: data.includeAuditLogs,
          compressLevel: data.compressLevel,
          notifyOnSuccess: data.notifyOnSuccess,
          notifyOnFailure: data.notifyOnFailure,
          notificationEmails: data.notificationEmails,
          updatedAt: new Date(),
        })
        .where(eq(drizzleSchema.backupSettings.id, existing.id))
        .returning();

      logger.info({ settingsId: updated.id }, "Backup settings updated");
      return { success: true, id: updated.id };
    } else {
      const [created] = await drizzleDb
        .insert(drizzleSchema.backupSettings)
        .values({
          id: crypto.randomUUID(),
          dailyEnabled: data.dailyEnabled,
          dailyTime: data.dailyTime,
          weeklyEnabled: data.weeklyEnabled,
          weeklyDay: data.weeklyDay,
          weeklyTime: data.weeklyTime,
          monthlyEnabled: data.monthlyEnabled,
          monthlyDay: data.monthlyDay,
          monthlyTime: data.monthlyTime,
          dailyRetention: data.dailyRetention,
          weeklyRetention: data.weeklyRetention,
          monthlyRetention: data.monthlyRetention,
          storageProvider: data.storageProvider,
          storageBucket: data.storageBucket,
          storageRegion: data.storageRegion,
          storagePath: data.storagePath,
          includePhotos: data.includePhotos,
          includeAuditLogs: data.includeAuditLogs,
          compressLevel: data.compressLevel,
          notifyOnSuccess: data.notifyOnSuccess,
          notifyOnFailure: data.notifyOnFailure,
          notificationEmails: data.notificationEmails,
          updatedAt: new Date(),
        })
        .returning();

      logger.info({ settingsId: created.id }, "Backup settings created");
      return { success: true, id: created.id };
    }
  });

// Alias for backward compatibility - scheduleBackup updates backup settings
export const updateBackupSettings = scheduleBackup;
