/**
 * Backup job execution
 *
 * Handles:
 * - Backup generation and ZIP creation
 * - Local and cloud storage
 * - Backup rotation and cleanup
 * - Backup metadata and status tracking
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { and, desc, eq, isNull } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";
import { db, drizzleSchema } from "../db";
import { deleteFromStorage, uploadToStorage } from "./storage";
import { sendBackupNotification } from "./notifications";
import type { StorageProvider } from "./storage";
import type { BackupSettings, BackupType } from "@vamsa/api";

const log = loggers.jobs;

// Local backup directory
const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";

/**
 * Perform a backup of the specified type
 * Returns the backup ID
 */
export async function performBackup(type: BackupType): Promise<string> {
  const startTime = Date.now();
  const [settings] = await db
    .select()
    .from(drizzleSchema.backupSettings)
    .limit(1);

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `vamsa-backup-${type.toLowerCase()}-${timestamp}.zip`;

  // Create pending backup record
  const backupId = crypto.randomUUID();
  const [backup] = await db
    .insert(drizzleSchema.backups)
    .values({
      id: backupId,
      filename,
      type,
      status: "IN_PROGRESS",
      location: settings?.storageProvider || "LOCAL",
    })
    .returning();

  try {
    // Generate backup using existing export function
    log.info({ type, filename }, "Generating backup data");

    // Call the server function to export backup
    // We need to generate the export in a different way since we can't call server functions
    // from server jobs. Instead, we'll gather the data directly.
    const [
      people,
      relationships,
      users,
      suggestions,
      familySettingsArr,
      auditLogs,
      mediaObjects,
      events,
      places,
    ] = await Promise.all([
      db
        .select()
        .from(drizzleSchema.persons)
        .orderBy(
          drizzleSchema.persons.lastName,
          drizzleSchema.persons.firstName
        ),
      db
        .select()
        .from(drizzleSchema.relationships)
        .orderBy(drizzleSchema.relationships.createdAt),
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
        })
        .from(drizzleSchema.users)
        .orderBy(drizzleSchema.users.createdAt),
      db
        .select()
        .from(drizzleSchema.suggestions)
        .orderBy(desc(drizzleSchema.suggestions.submittedAt)),
      db.select().from(drizzleSchema.familySettings).limit(1),
      type === "MONTHLY" && (settings?.includeAuditLogs ?? false)
        ? db
            .select()
            .from(drizzleSchema.auditLogs)
            .orderBy(desc(drizzleSchema.auditLogs.createdAt))
            .limit(10000)
        : Promise.resolve([]),
      (settings?.includePhotos ?? true)
        ? db
            .select()
            .from(drizzleSchema.mediaObjects)
            .orderBy(drizzleSchema.mediaObjects.uploadedAt)
        : Promise.resolve([]),
      db.select().from(drizzleSchema.events).orderBy(drizzleSchema.events.date),
      db.select().from(drizzleSchema.places).orderBy(drizzleSchema.places.name),
    ]);

    const familySettings = familySettingsArr[0] || null;

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

    const chunks: Array<Buffer> = [];
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
          log.warn(
            {
              error: err instanceof Error ? err.message : String(err),
              filePath,
            },
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
    log.info({ localPath, size: zipBuffer.length }, "Backup saved locally");

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
        log.info(
          { provider: settings.storageProvider },
          "Backup uploaded to cloud"
        );
      } catch (uploadError) {
        // Log cloud upload error but don't fail the entire backup
        log.warn(
          {
            error:
              uploadError instanceof Error
                ? uploadError.message
                : String(uploadError),
          },
          "Failed to upload backup to cloud storage, local backup still available"
        );
      }
    }

    // Update backup record with success
    const duration = Date.now() - startTime;
    await db
      .update(drizzleSchema.backups)
      .set({
        status: "COMPLETED",
        size: zipBuffer.length,
        personCount: people.length,
        relationshipCount: relationships.length,
        eventCount: events.length,
        mediaCount: mediaObjects.length,
        duration,
      })
      .where(eq(drizzleSchema.backups.id, backup.id));

    // Rotate old backups
    await rotateBackups(type, settings);

    // Send success notification
    if (settings?.notifyOnSuccess) {
      try {
        const emails =
          typeof settings.notificationEmails === "string"
            ? JSON.parse(settings.notificationEmails)
            : Array.isArray(settings.notificationEmails)
              ? settings.notificationEmails
              : [];
        await sendBackupNotification({
          type: "success",
          filename,
          size: zipBuffer.length,
          duration,
          emails,
        });
      } catch (notificationError) {
        log.warn(
          {
            error:
              notificationError instanceof Error
                ? notificationError.message
                : String(notificationError),
          },
          "Failed to send success notification"
        );
      }
    }

    log.info(
      { filename, duration, size: zipBuffer.length },
      "Backup completed successfully"
    );
    return backup.id;
  } catch (error) {
    // Update backup record with failure
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(drizzleSchema.backups)
      .set({
        status: "FAILED",
        error: errorMessage,
        duration,
      })
      .where(eq(drizzleSchema.backups.id, backup.id));

    // Send failure notification
    if (settings?.notifyOnFailure) {
      try {
        const emails =
          typeof settings.notificationEmails === "string"
            ? JSON.parse(settings.notificationEmails)
            : Array.isArray(settings.notificationEmails)
              ? settings.notificationEmails
              : [];
        await sendBackupNotification({
          type: "failure",
          filename,
          error: errorMessage,
          emails,
        });
      } catch (notificationError) {
        log
          .withErr(notificationError)
          .msg("Failed to send failure notification");
      }
    }

    log.withErr(error).ctx({ filename }).msg("Backup failed");
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
  const allBackups = await db
    .select()
    .from(drizzleSchema.backups)
    .where(
      and(
        eq(drizzleSchema.backups.type, type),
        eq(drizzleSchema.backups.status, "COMPLETED"),
        isNull(drizzleSchema.backups.deletedAt)
      )
    )
    .orderBy(desc(drizzleSchema.backups.createdAt));

  // Skip the first keepCount backups, delete the rest
  const backupsToDelete = allBackups.slice(keepCount);

  for (const backupToDelete of backupsToDelete) {
    log.info({ filename: backupToDelete.filename }, "Deleting old backup");

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
        log.warn(
          { error: error instanceof Error ? error.message : String(error) },
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
    await db
      .update(drizzleSchema.backups)
      .set({ deletedAt: new Date() })
      .where(eq(drizzleSchema.backups.id, backupToDelete.id));
  }

  if (backupsToDelete.length > 0) {
    log.info({ count: backupsToDelete.length, type }, "Rotated old backups");
  }
}
