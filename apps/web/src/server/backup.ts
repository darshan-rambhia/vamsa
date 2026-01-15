import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
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
import archiver from "archiver";
import * as fs from "fs";
import * as path from "path";
import { logger, serializeError } from "@vamsa/lib/logger";
import { requireAuth } from "./middleware/require-auth";

export interface ExportBackupResult {
  success: boolean;
  message: string;
  zipBase64?: string;
  filename?: string;
  metadata?: BackupMetadata;
}

// Export backup server function
export const exportBackup = createServerFn({ method: "POST" })
  .inputValidator((data: BackupExportInput) => backupExportSchema.parse(data))
  .handler(async ({ data }): Promise<ExportBackupResult> => {
    const user = await requireAuth("ADMIN");

    // Calculate audit log cutoff
    const auditLogCutoff = new Date();
    auditLogCutoff.setDate(auditLogCutoff.getDate() - data.auditLogDays);

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
      // People ordered by name
      prisma.person.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),

      // Relationships by creation
      prisma.relationship.findMany({
        orderBy: { createdAt: "asc" },
      }),

      // Users WITHOUT password hashes (SECURITY)
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          personId: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          invitedById: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          preferredLanguage: true,
          // password excluded for security
        },
        orderBy: { createdAt: "asc" },
      }),

      // Suggestions
      prisma.suggestion.findMany({
        orderBy: { submittedAt: "desc" },
      }),

      // Family settings
      prisma.familySettings.findFirst(),

      // Audit logs (filtered)
      data.includeAuditLogs
        ? prisma.auditLog.findMany({
            where: { createdAt: { gte: auditLogCutoff } },
            orderBy: { createdAt: "desc" },
          })
        : [],

      // Media objects for photo collection
      data.includePhotos
        ? prisma.mediaObject.findMany({
            orderBy: { uploadedAt: "asc" },
          })
        : [],
    ]);

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
        totalPeople: people.length,
        totalRelationships: relationships.length,
        totalUsers: users.length,
        totalSuggestions: suggestions.length,
        totalPhotos: mediaObjects.length,
        auditLogDays: data.auditLogDays,
        totalAuditLogs: auditLogs.length,
      },
      dataFiles: [
        "data/people.json",
        "data/relationships.json",
        "data/users.json",
        "data/suggestions.json",
        "data/settings.json",
        ...(data.includeAuditLogs ? ["data/audit-logs.json"] : []),
      ],
      photoDirectories: mediaObjects.map((m) => `photos/${m.id}/`),
    };

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    const chunks: Buffer[] = [];
    archive.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

    // Track archive errors
    let archiveError: Error | null = null;
    archive.on("error", (err) => {
      archiveError = err;
    });

    // Add metadata
    archive.append(JSON.stringify(metadata, null, 2), {
      name: "metadata.json",
    });

    // Add data files
    archive.append(JSON.stringify(people, null, 2), {
      name: "data/people.json",
    });
    archive.append(JSON.stringify(relationships, null, 2), {
      name: "data/relationships.json",
    });
    archive.append(JSON.stringify(users, null, 2), {
      name: "data/users.json",
    });
    archive.append(JSON.stringify(suggestions, null, 2), {
      name: "data/suggestions.json",
    });
    archive.append(JSON.stringify(settings || {}, null, 2), {
      name: "data/settings.json",
    });

    if (auditLogs.length > 0) {
      archive.append(JSON.stringify(auditLogs, null, 2), {
        name: "data/audit-logs.json",
      });
    }

    // Add photos if requested
    if (data.includePhotos && mediaObjects.length > 0) {
      for (const media of mediaObjects) {
        const filePath = media.filePath;
        if (fs.existsSync(filePath)) {
          const fileName = path.basename(filePath);
          try {
            archive.file(filePath, { name: `photos/${media.id}/${fileName}` });
          } catch (err) {
            // Log file addition errors but continue
            logger.error(
              { error: serializeError(err), filePath },
              "Failed to add photo to backup"
            );
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

      archive.on("error", (err) => {
        reject(err);
      });
    });

    // Log audit trail
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entityType: "BACKUP_EXPORT",
          entityId: null,
          newData: {
            timestamp: new Date().toISOString(),
            statistics: metadata.statistics,
          },
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
  });

// List backups with pagination
export const listBackups = createServerFn({ method: "POST" })
  .inputValidator((data: ListBackupsInput) =>
    listBackupsInputSchema.parse(data)
  )
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const [backups, total] = await Promise.all([
      prisma.backup.findMany({
        orderBy: { createdAt: "desc" },
        take: data.limit,
        skip: data.offset,
        where: {
          status: { not: "DELETED" },
        },
      }),
      prisma.backup.count({
        where: {
          status: { not: "DELETED" },
        },
      }),
    ]);

    return {
      items: backups.map((b) => ({
        id: b.id,
        filename: b.filename,
        type: b.type,
        status: b.status,
        size: b.size,
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

// Download a backup
export const downloadBackup = createServerFn({ method: "POST" })
  .inputValidator((data: { backupId: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const backup = await prisma.backup.findUnique({
      where: { id: data.backupId },
    });

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

// Verify a backup
export const verifyBackup = createServerFn({ method: "POST" })
  .inputValidator((data: { backupId: string }) => data)
  .handler(async ({ data }) => {
    await requireAuth("ADMIN");

    const backup = await prisma.backup.findUnique({
      where: { id: data.backupId },
    });

    if (!backup) {
      throw new Error("Backup not found");
    }

    // Placeholder verification logic
    // In a real implementation, this would check file integrity
    const isValid =
      backup.status === "COMPLETED" && backup.size && backup.size > 0n;

    return {
      success: true,
      isValid,
      backupId: backup.id,
      message: isValid ? "Backup is valid" : "Backup verification failed",
    };
  });

// Delete a backup
export const deleteBackup = createServerFn({ method: "POST" })
  .inputValidator((data: { backupId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth("ADMIN");

    const backup = await prisma.backup.findUnique({
      where: { id: data.backupId },
    });

    if (!backup) {
      throw new Error("Backup not found");
    }

    // Soft delete by updating status
    await prisma.backup.update({
      where: { id: data.backupId },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
      },
    });

    // Log the deletion
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          entityType: "BACKUP",
          entityId: data.backupId,
          previousData: {
            filename: backup.filename,
            type: backup.type,
          },
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

// Get backup settings
export const getBackupSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAuth("ADMIN");

    const settings = await prisma.backupSettings.findFirst();

    if (!settings) {
      // Return defaults if no settings exist
      return {
        id: null,
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
        storageBucket: null,
        storageRegion: null,
        storagePath: "backups",
        includePhotos: true,
        includeAuditLogs: false,
        compressLevel: 6,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notificationEmails: null,
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
      notificationEmails: settings.notificationEmails,
    };
  }
);

// Update backup settings
export const updateBackupSettings = createServerFn({ method: "POST" })
  .inputValidator((data: BackupSettings) => backupSettingsSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await requireAuth("ADMIN");

    logger.info({ updatedBy: user.id }, "Updating backup settings");

    const existing = await prisma.backupSettings.findFirst();

    if (existing) {
      const updated = await prisma.backupSettings.update({
        where: { id: existing.id },
        data: {
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
        },
      });

      logger.info({ settingsId: updated.id }, "Backup settings updated");
      return { success: true, id: updated.id };
    } else {
      const created = await prisma.backupSettings.create({
        data: {
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
        },
      });

      logger.info({ settingsId: created.id }, "Backup settings created");
      return { success: true, id: created.id };
    }
  });
