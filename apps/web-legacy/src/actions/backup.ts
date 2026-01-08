"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  backupExportSchema,
  type BackupExportInput,
  type BackupMetadata,
} from "@/schemas/backup";
import type { BackupDependencies } from "@/lib/backup/types";

// Default dependencies using real implementations
const defaultDependencies: BackupDependencies = {
  requireAdmin,
  // PrismaClient type is complex; safe to cast here
  db: db as BackupDependencies["db"],
};

// Core gather backup data logic - testable with injected dependencies
export async function gatherBackupDataCore(
  input: BackupExportInput,
  deps: BackupDependencies
) {
  const session = await deps.requireAdmin();
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
    deps.db.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),

    // Get all relationships
    deps.db.relationship.findMany({
      orderBy: { createdAt: "asc" },
    }),

    // Get all users (exclude password hashes for security)
    deps.db.user.findMany({
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
    deps.db.suggestion.findMany({
      orderBy: { submittedAt: "desc" },
    }),

    // Get family settings
    deps.db.familySettings.findFirst(),

    // Get recent audit logs
    validated.includeAuditLogs
      ? deps.db.auditLog.findMany({
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
      ? deps.db.person.findMany({
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
    photoDirectories: peopleWithPhotos.map((p: Record<string, unknown>) => {
      const pId = String(p.id || "");
      return `photos/${pId}/`;
    }),
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

// Core log backup export logic - testable with injected dependencies
export async function logBackupExportCore(deps: BackupDependencies) {
  const session = await deps.requireAdmin();

  await deps.db.auditLog.create({
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

// Public API - uses default dependencies (for production use)
export async function gatherBackupData(input: BackupExportInput) {
  return gatherBackupDataCore(input, defaultDependencies);
}

export async function logBackupExport() {
  return logBackupExportCore(defaultDependencies);
}
