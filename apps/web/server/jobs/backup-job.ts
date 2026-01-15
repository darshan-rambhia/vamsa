/**
 * Backup job execution
 *
 * Handles:
 * - Backup generation and ZIP creation
 * - Local and cloud storage
 * - Backup rotation and cleanup
 * - Backup metadata and status tracking
 */

import { prisma } from "../db";
import {
  uploadToStorage,
  deleteFromStorage,
  type StorageProvider,
} from "./storage";
import { sendBackupNotification } from "./notifications";
import { logger, serializeError } from "@vamsa/lib/logger";
import type { BackupType, BackupSettings } from "@vamsa/api";
import * as fs from "fs/promises";
import * as path from "path";

// Local backup directory
const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";

/**
 * Perform a backup of the specified type
 * Returns the backup ID
 */
export async function performBackup(type: BackupType): Promise<string> {
  const startTime = Date.now();
  const settings = await prisma.backupSettings.findFirst();

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `vamsa-backup-${type.toLowerCase()}-${timestamp}.zip`;

  // Create pending backup record
  const backup = await prisma.backup.create({
    data: {
      filename,
      type,
      status: "IN_PROGRESS",
      location: settings?.storageProvider || "LOCAL",
    },
  });

  try {
    // Generate backup using existing export function
    logger.info({ type, filename }, "Generating backup data");

    // Call the server function to export backup
    // We need to generate the export in a different way since we can't call server functions
    // from server jobs. Instead, we'll gather the data directly.
    const [
      people,
      relationships,
      users,
      suggestions,
      familySettings,
      auditLogs,
      mediaObjects,
      events,
      places,
    ] = await Promise.all([
      prisma.person.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.relationship.findMany({
        orderBy: { createdAt: "asc" },
      }),
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
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.suggestion.findMany({
        orderBy: { submittedAt: "desc" },
      }),
      prisma.familySettings.findFirst(),
      type === "MONTHLY" && (settings?.includeAuditLogs ?? false)
        ? prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 10000, // Limit for monthly
          })
        : Promise.resolve([]),
      (settings?.includePhotos ?? true)
        ? prisma.mediaObject.findMany({
            orderBy: { uploadedAt: "asc" },
          })
        : Promise.resolve([]),
      prisma.event.findMany({
        orderBy: { date: "asc" },
      }),
      prisma.place.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    // Create backup metadata
    const metadata = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      backupType: type,
      statistics: {
        totalPeople: people.length,
        totalRelationships: relationships.length,
        totalUsers: users.length,
        totalSuggestions: suggestions.length,
        totalPhotos: mediaObjects.length,
        totalEvents: events.length,
        totalPlaces: places.length,
        totalAuditLogs: auditLogs.length,
      },
    };

    // Import archiver dynamically
    const archiver = (await import("archiver")).default;

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: settings?.compressLevel ?? 6 },
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
    archive.append(JSON.stringify(events, null, 2), {
      name: "data/events.json",
    });
    archive.append(JSON.stringify(places, null, 2), {
      name: "data/places.json",
    });
    archive.append(JSON.stringify(familySettings || {}, null, 2), {
      name: "data/settings.json",
    });

    if (auditLogs.length > 0) {
      archive.append(JSON.stringify(auditLogs, null, 2), {
        name: "data/audit-logs.json",
      });
    }

    // Add photos if requested
    if (settings?.includePhotos && mediaObjects.length > 0) {
      for (const media of mediaObjects) {
        const filePath = media.filePath;
        try {
          const fileStats = await fs.stat(filePath);
          if (fileStats.isFile()) {
            const fileName = path.basename(filePath);
            archive.file(filePath, { name: `photos/${media.id}/${fileName}` });
          }
        } catch (err) {
          // Log file addition errors but continue
          logger.warn(
            { error: serializeError(err), filePath },
            "Failed to add photo to backup"
          );
        }
      }
    }

    // Finalize archive and wait for completion
    archive.finalize();

    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => {
        if (archiveError) {
          reject(archiveError);
        } else {
          resolve(Buffer.concat(chunks));
        }
      });

      archive.on("error", (err) => {
        reject(err);
      });
    });

    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Save locally first
    const localPath = path.join(BACKUP_DIR, filename);
    await fs.writeFile(localPath, zipBuffer);
    logger.info({ localPath, size: zipBuffer.length }, "Backup saved locally");

    // Upload to cloud storage if configured
    if (settings?.storageProvider && settings.storageProvider !== "LOCAL") {
      try {
        await uploadToStorage(
          settings.storageProvider as StorageProvider,
          filename,
          zipBuffer,
          {
            bucket: settings.storageBucket!,
            region: settings.storageRegion || undefined,
            prefix: settings.storagePath || undefined,
          }
        );
        logger.info(
          { provider: settings.storageProvider },
          "Backup uploaded to cloud"
        );
      } catch (uploadError) {
        // Log cloud upload error but don't fail the entire backup
        logger.warn(
          { error: serializeError(uploadError) },
          "Failed to upload backup to cloud storage, local backup still available"
        );
      }
    }

    // Update backup record with success
    const duration = Date.now() - startTime;
    await prisma.backup.update({
      where: { id: backup.id },
      data: {
        status: "COMPLETED",
        size: BigInt(zipBuffer.length),
        personCount: people.length,
        relationshipCount: relationships.length,
        eventCount: events.length,
        mediaCount: mediaObjects.length,
        duration,
      },
    });

    // Rotate old backups
    await rotateBackups(type, settings);

    // Send success notification
    if (settings?.notifyOnSuccess) {
      try {
        const emails = settings.notificationEmails
          ? JSON.parse(settings.notificationEmails)
          : [];
        await sendBackupNotification({
          type: "success",
          filename,
          size: zipBuffer.length,
          duration,
          emails,
        });
      } catch (notificationError) {
        logger.warn(
          { error: serializeError(notificationError) },
          "Failed to send success notification"
        );
      }
    }

    logger.info(
      { filename, duration, size: zipBuffer.length },
      "Backup completed successfully"
    );
    return backup.id;
  } catch (error) {
    // Update backup record with failure
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await prisma.backup.update({
      where: { id: backup.id },
      data: {
        status: "FAILED",
        error: errorMessage,
        duration,
      },
    });

    // Send failure notification
    if (settings?.notifyOnFailure) {
      try {
        const emails = settings.notificationEmails
          ? JSON.parse(settings.notificationEmails)
          : [];
        await sendBackupNotification({
          type: "failure",
          filename,
          error: errorMessage,
          emails,
        });
      } catch (notificationError) {
        logger.warn(
          { error: serializeError(notificationError) },
          "Failed to send failure notification"
        );
      }
    }

    logger.error({ error: serializeError(error), filename }, "Backup failed");
    throw error;
  }
}

/**
 * Rotate old backups based on retention settings
 */
async function rotateBackups(
  type: BackupType,
  settings: BackupSettings | null
): Promise<void> {
  if (!settings) return;

  const retentionMap: Record<BackupType, number> = {
    DAILY: settings.dailyRetention,
    WEEKLY: settings.weeklyRetention,
    MONTHLY: settings.monthlyRetention,
    MANUAL: 999, // Don't auto-delete manual backups
  };

  const keepCount = retentionMap[type];

  // Get all completed backups of this type, ordered newest first
  const allBackups = await prisma.backup.findMany({
    where: {
      type,
      status: "COMPLETED",
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  // Skip the first keepCount backups, delete the rest
  const backupsToDelete = allBackups.slice(keepCount);

  for (const backupToDelete of backupsToDelete) {
    logger.info({ filename: backupToDelete.filename }, "Deleting old backup");

    // Delete from cloud storage
    if (backupToDelete.location !== "LOCAL" && settings.storageBucket) {
      try {
        await deleteFromStorage(
          backupToDelete.location as StorageProvider,
          backupToDelete.filename,
          {
            bucket: settings.storageBucket,
            region: settings.storageRegion || undefined,
            prefix: settings.storagePath || undefined,
          }
        );
      } catch (error) {
        logger.warn(
          { error: serializeError(error) },
          "Failed to delete backup from cloud storage"
        );
      }
    }

    // Delete local file
    const localPath = path.join(BACKUP_DIR, backupToDelete.filename);
    try {
      await fs.unlink(localPath);
    } catch {
      // File may not exist locally or already deleted
    }

    // Soft delete in database
    await prisma.backup.update({
      where: { id: backupToDelete.id },
      data: { deletedAt: new Date() },
    });
  }

  if (backupsToDelete.length > 0) {
    logger.info({ count: backupsToDelete.length, type }, "Rotated old backups");
  }
}
