"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { BackupValidator } from "@/lib/backup/validator";
import { ConflictResolver } from "@/lib/backup/conflict-resolver";
import { gatherBackupData } from "@/actions/backup";
import type {
  ValidationResult,
  ImportResult,
  ConflictResolutionStrategy,
} from "@/schemas/backup";
import type { RestoreDependencies } from "@/lib/backup/types";
import archiver from "archiver";
import { mkdir } from "fs/promises";
import { join } from "path";

// Default dependencies using real implementations
const defaultDependencies: RestoreDependencies = {
  requireAdmin,
  db: db as any,
  getStorageAdapter,
  createValidator: (buffer: Buffer) => new BackupValidator(buffer),
  createConflictResolver: (strategy, importedBy) =>
    new ConflictResolver(strategy, importedBy),
  gatherBackupData,
};

// Core validation logic - testable with injected dependencies
export async function validateBackupCore(
  formData: FormData,
  deps: RestoreDependencies
): Promise<ValidationResult> {
  await deps.requireAdmin();

  try {
    const file = formData.get("file") as File;
    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new Error("File size exceeds 100MB limit");
    }

    // Validate file type
    if (!file.name.endsWith(".zip")) {
      throw new Error("File must be a ZIP archive");
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate backup
    const validator = deps.createValidator(buffer);
    const result = await validator.validate();

    return result;
  } catch (error) {
    console.error("Backup validation error:", error);
    throw new Error(
      `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Core import logic - testable with injected dependencies
export async function importBackupCore(
  formData: FormData,
  strategy: ConflictResolutionStrategy,
  options: {
    createBackupBeforeImport: boolean;
    importPhotos: boolean;
    importAuditLogs: boolean;
  },
  deps: RestoreDependencies
): Promise<ImportResult> {
  const session = await deps.requireAdmin();

  try {
    const file = formData.get("file") as File;
    if (!file) {
      throw new Error("No file provided");
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate backup first
    const validator = deps.createValidator(buffer);
    const validationResult = await validator.validate();

    if (!validationResult.isValid) {
      throw new Error(`Invalid backup: ${validationResult.errors.join(", ")}`);
    }

    let backupCreated: string | undefined;

    // Create backup before import if requested
    if (options.createBackupBeforeImport && deps.gatherBackupData) {
      backupCreated = await createPreImportBackup(deps);
    }

    // Start database transaction for atomic import
    const importResult = await deps.db.$transaction(async (tx: any) => {
      // Create conflict resolver
      const resolver = deps.createConflictResolver(strategy, {
        id: session.id,
        email: session.email,
        name: session.name || null,
      });

      // Import data
      const { statistics, errors, warnings } = await resolver.importData(
        validator.getExtractedFiles(),
        validationResult.conflicts
      );

      // Import photos if requested
      if (options.importPhotos) {
        const photosImported = await importPhotosCore(
          validator.getExtractedFiles(),
          deps
        );
        statistics.photosImported = photosImported;
      }

      // Log the import action
      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE",
          entityType: "BACKUP_IMPORT",
          entityId: null,
          newData: {
            timestamp: new Date().toISOString(),
            strategy,
            statistics: statistics as any,
            backupCreated,
          },
        },
      });

      return {
        success: errors.length === 0,
        importedAt: new Date().toISOString(),
        importedBy: {
          id: session.id,
          email: session.email,
          name: session.name || null,
        },
        strategy,
        statistics,
        backupCreated,
        errors,
        warnings,
      };
    });

    return importResult;
  } catch (error) {
    console.error("Backup import error:", error);

    // Log failed import attempt
    try {
      await deps.db.auditLog.create({
        data: {
          userId: session.id,
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

// Core import history logic - testable with injected dependencies
interface ImportHistoryEntry {
  id: string;
  importedAt: string;
  importedBy: string;
  strategy: string;
  statistics: Record<string, unknown>;
  success: boolean;
}

interface AuditLogWithUser {
  id: string;
  createdAt: Date;
  entityType: string;
  newData: Record<string, unknown>;
  user: {
    email: string;
    name: string | null;
  };
}

export async function getImportHistoryCore(
  deps: RestoreDependencies
): Promise<ImportHistoryEntry[]> {
  await deps.requireAdmin();

  const auditLogs = await deps.db.auditLog.findMany({
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

  return auditLogs.map((log: unknown) => {
    const typedLog = log as AuditLogWithUser;
    const strategy = String(typedLog.newData.strategy || "unknown");
    const statistics =
      typeof typedLog.newData.statistics === "object" &&
      typedLog.newData.statistics !== null
        ? (typedLog.newData.statistics as Record<string, unknown>)
        : {};

    return {
      id: typedLog.id,
      importedAt: typedLog.createdAt.toISOString(),
      importedBy: typedLog.user.name || typedLog.user.email,
      strategy,
      statistics,
      success: typedLog.entityType === "BACKUP_IMPORT",
    };
  });
}

async function createPreImportBackup(
  deps: RestoreDependencies
): Promise<string> {
  if (!deps.gatherBackupData) {
    throw new Error("gatherBackupData not available");
  }

  try {
    // Gather current data for backup
    const { metadata, data, photos } = await deps.gatherBackupData({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `pre-import-backup-${timestamp}.zip`;
    const backupPath = join(
      process.env.STORAGE_LOCAL_PATH || "./data/uploads",
      "backups"
    );

    // Ensure backup directory exists
    await mkdir(backupPath, { recursive: true });

    const fullPath = join(backupPath, filename);

    // Create ZIP archive
    return new Promise((resolve, reject) => {
      const archive = archiver("zip", { zlib: { level: 9 } });
      const output = require("fs").createWriteStream(fullPath);

      output.on("close", () => {
        resolve(filename);
      });

      archive.on("error", (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // Add metadata and data files
      archive.append(JSON.stringify(metadata, null, 2), {
        name: "metadata.json",
      });
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
      archive.append(JSON.stringify(data.settings, null, 2), {
        name: "data/settings.json",
      });

      if (data.auditLogs) {
        archive.append(JSON.stringify(data.auditLogs, null, 2), {
          name: "data/audit-logs.json",
        });
      }

      // Add photos
      if (photos.length > 0) {
        addPhotosToBackupArchive(archive, photos);
      } else {
        archive.finalize();
      }
    });
  } catch (error) {
    console.error("Failed to create pre-import backup:", error);
    throw new Error("Failed to create backup before import");
  }
}

async function addPhotosToBackupArchive(
  archive: archiver.Archiver,
  photos: Array<{ id: string; photoUrl: string | null }>
): Promise<void> {
  for (const person of photos) {
    if (!person.photoUrl) continue;

    try {
      // Extract the file path from the URL
      const urlParts = person.photoUrl.split("/api/uploads/");
      if (urlParts.length !== 2) continue;

      const filePath = urlParts[1];
      const storagePath = process.env.STORAGE_LOCAL_PATH || "./data/uploads";
      const fullPath = join(storagePath, filePath);

      // Read the file
      const fileBuffer = await require("fs/promises").readFile(fullPath);

      // Extract original filename
      const originalName = filePath.split("-").slice(1).join("-");

      // Add to archive
      archive.append(fileBuffer, {
        name: `photos/${person.id}/${originalName}`,
      });
    } catch (error) {
      console.warn(`Failed to add photo for person ${person.id}:`, error);
    }
  }

  archive.finalize();
}

// Exported for testing
export async function importPhotosCore(
  extractedFiles: Map<string, any>,
  deps: RestoreDependencies
): Promise<number> {
  const storage = deps.getStorageAdapter();
  let importedCount = 0;

  for (const [filePath, fileBuffer] of extractedFiles.entries()) {
    if (!filePath.startsWith("photos/") || filePath.endsWith("/")) {
      continue;
    }

    try {
      // Extract person ID and filename from path: photos/{personId}/{filename}
      const pathParts = filePath.split("/");
      if (pathParts.length !== 3) continue;

      const personId = pathParts[1];
      const filename = pathParts[2];

      // Check if person exists
      const person = await deps.db.person.findUnique({
        where: { id: personId },
      });
      if (!person) {
        console.warn(`Skipping photo for non-existent person: ${personId}`);
        continue;
      }

      // Upload photo to storage
      const storedPath = await storage.upload(
        fileBuffer,
        filename,
        "image/jpeg"
      );
      const photoUrl = storage.getUrl(storedPath);

      // Update person with photo URL
      await deps.db.person.update({
        where: { id: personId },
        data: { photoUrl },
      });

      importedCount++;
    } catch (error) {
      console.warn(`Failed to import photo ${filePath}:`, error);
    }
  }

  return importedCount;
}

// Public API - uses default dependencies (for production use)
export async function validateBackup(
  formData: FormData
): Promise<ValidationResult> {
  return validateBackupCore(formData, defaultDependencies);
}

export async function importBackup(
  formData: FormData,
  strategy: ConflictResolutionStrategy,
  options: {
    createBackupBeforeImport: boolean;
    importPhotos: boolean;
    importAuditLogs: boolean;
  }
): Promise<ImportResult> {
  return importBackupCore(formData, strategy, options, defaultDependencies);
}

export async function getImportHistory(): Promise<
  Array<{
    id: string;
    importedAt: string;
    importedBy: string;
    strategy: string;
    statistics: any;
    success: boolean;
  }>
> {
  return getImportHistoryCore(defaultDependencies);
}
