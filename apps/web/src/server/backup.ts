import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./db";
import {
  backupExportSchema,
  type BackupExportInput,
  type BackupMetadata,
} from "@vamsa/schemas";
import archiver from "archiver";
import * as fs from "fs";
import * as path from "path";

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
    const [people, relationships, users, suggestions, settings, auditLogs, mediaObjects] =
      await Promise.all([
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
            console.error(
              `[Backup Export] Failed to add photo ${filePath}:`,
              err
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
      console.error("[Backup Export] Failed to create audit log:", err);
    }

    return {
      success: true,
      message: "Backup exported successfully",
      zipBase64,
      filename: `vamsa-backup-${new Date().toISOString().split("T")[0]}.zip`,
      metadata,
    };
  });
