import { z } from "zod";

export const backupExportSchema = z.object({
  includePhotos: z.boolean().default(true),
  includeAuditLogs: z.boolean().default(true),
  auditLogDays: z.number().min(1).max(365).default(90),
});

export const backupMetadataSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  exportedBy: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
  }),
  statistics: z.object({
    totalPeople: z.number(),
    totalRelationships: z.number(),
    totalUsers: z.number(),
    totalSuggestions: z.number(),
    totalPhotos: z.number(),
    auditLogDays: z.number(),
    totalAuditLogs: z.number(),
  }),
  dataFiles: z.array(z.string()),
  photoDirectories: z.array(z.string()),
});

// Import schemas
export const conflictResolutionStrategy = z.enum(["skip", "replace", "merge"]);

export const backupValidationSchema = z.object({
  file: z.instanceof(File),
});

export const backupImportSchema = z.object({
  file: z.instanceof(File),
  strategy: conflictResolutionStrategy,
  createBackupBeforeImport: z.boolean().default(true),
  importPhotos: z.boolean().default(true),
  importAuditLogs: z.boolean().default(false),
});

export const conflictSchema = z.object({
  type: z.enum(["person", "user", "relationship", "suggestion", "settings"]),
  action: z.enum(["create", "update"]),
  existingId: z.string().optional(),
  existingData: z.record(z.any()).optional(),
  newData: z.record(z.any()),
  conflictFields: z.array(z.string()),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string(),
});

export const validationResultSchema = z.object({
  isValid: z.boolean(),
  metadata: backupMetadataSchema,
  conflicts: z.array(conflictSchema),
  statistics: z.object({
    totalConflicts: z.number(),
    conflictsByType: z.record(z.number()),
    conflictsBySeverity: z.record(z.number()),
  }),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const importResultSchema = z.object({
  success: z.boolean(),
  importedAt: z.string(),
  importedBy: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
  }),
  strategy: conflictResolutionStrategy,
  statistics: z.object({
    peopleImported: z.number(),
    relationshipsImported: z.number(),
    usersImported: z.number(),
    suggestionsImported: z.number(),
    photosImported: z.number(),
    auditLogsImported: z.number(),
    conflictsResolved: z.number(),
    skippedItems: z.number(),
  }),
  backupCreated: z.string().optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type BackupExportInput = z.infer<typeof backupExportSchema>;
export type BackupMetadata = z.infer<typeof backupMetadataSchema>;
export type ConflictResolutionStrategy = z.infer<
  typeof conflictResolutionStrategy
>;
export type BackupValidationInput = z.infer<typeof backupValidationSchema>;
export type BackupImportInput = z.infer<typeof backupImportSchema>;
export type Conflict = z.infer<typeof conflictSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ImportResult = z.infer<typeof importResultSchema>;

export const backupValidationPreviewSchema = z.object({
  stats: z.object({
    new: z.object({
      people: z.number(),
      relationships: z.number(),
      users: z.number(),
    }),
  }),
  conflicts: z.object({
    people: z.array(
      z.object({
        data: z.record(z.any()), // simplified for frontend
        reason: z.string(),
      })
    ),
    relationships: z.array(
      z.object({
        data: z.record(z.any()), // simplified
        reason: z.string(),
      })
    ),
  }),
});

export type BackupValidationPreview = z.infer<
  typeof backupValidationPreviewSchema
>;
