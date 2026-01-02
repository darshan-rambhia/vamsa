"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  backupExportSchema,
  type BackupExportInput,
  type BackupMetadata,
} from "@/schemas/backup";

export async function gatherBackupData(input: BackupExportInput) {
  const session = await requireAdmin();
  const validated = backupExportSchema.parse(input);

  // Calculate date cutoff for audit logs
  const auditLogCutoff = new Date();
  auditLogCutoff.setDate(auditLogCutoff.getDate() - validated.auditLogDays);

  // Gather all data in parallel for better performance
  const [
    people,
    relationships,
    users,
    suggestions,
    settings,
    auditLogs,
    peopleWithPhotos,
  ] = await Promise.all([
    // Get all people
    db.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),

    // Get all relationships
    db.relationship.findMany({
      orderBy: { createdAt: "asc" },
    }),

    // Get all users (exclude password hashes for security)
    db.user.findMany({
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
      },
      orderBy: { createdAt: "asc" },
    }),

    // Get all pending suggestions
    db.suggestion.findMany({
      orderBy: { submittedAt: "desc" },
    }),

    // Get family settings
    db.familySettings.findFirst(),

    // Get recent audit logs
    validated.includeAuditLogs
      ? db.auditLog.findMany({
          where: {
            createdAt: {
              gte: auditLogCutoff,
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [],

    // Get people with photos for photo collection
    validated.includePhotos
      ? db.person.findMany({
          where: {
            photoUrl: {
              not: null,
            },
          },
          select: {
            id: true,
            photoUrl: true,
          },
        })
      : [],
  ]);

  // Create metadata
  const metadata: BackupMetadata = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    exportedBy: {
      id: session.id,
      email: session.email,
      name: session.name || null,
    },
    statistics: {
      totalPeople: people.length,
      totalRelationships: relationships.length,
      totalUsers: users.length,
      totalSuggestions: suggestions.length,
      totalPhotos: peopleWithPhotos.length,
      auditLogDays: validated.auditLogDays,
      totalAuditLogs: auditLogs.length,
    },
    dataFiles: [
      "data/people.json",
      "data/relationships.json",
      "data/users.json",
      "data/suggestions.json",
      "data/settings.json",
      ...(validated.includeAuditLogs ? ["data/audit-logs.json"] : []),
    ],
    photoDirectories: peopleWithPhotos.map((p) => `photos/${p.id}/`),
  };

  return {
    metadata,
    data: {
      people,
      relationships,
      users,
      suggestions,
      settings,
      ...(validated.includeAuditLogs && { auditLogs }),
    },
    photos: peopleWithPhotos,
  };
}

export async function logBackupExport() {
  const session = await requireAdmin();

  await db.auditLog.create({
    data: {
      userId: session.id,
      action: "CREATE",
      entityType: "BACKUP_EXPORT",
      entityId: null,
      newData: {
        timestamp: new Date().toISOString(),
        type: "full_export",
      },
    },
  });
}
