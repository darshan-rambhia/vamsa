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

export const backupImportOptionsSchema = z.object({
  strategy: conflictResolutionStrategy,
  createBackupBeforeImport: z.boolean().default(true),
  importPhotos: z.boolean().default(true),
  importAuditLogs: z.boolean().default(false),
});

export const conflictSchema = z.object({
  type: z.enum(["person", "user", "relationship", "suggestion", "settings"]),
  action: z.enum(["create", "update"]),
  existingId: z.string().optional(),
  existingData: z.record(z.string(), z.any()).optional(),
  newData: z.record(z.string(), z.any()),
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
    conflictsByType: z.record(z.string(), z.number()),
    conflictsBySeverity: z.record(z.string(), z.number()),
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
        data: z.record(z.string(), z.any()),
        reason: z.string(),
      })
    ),
    relationships: z.array(
      z.object({
        data: z.record(z.string(), z.any()),
        reason: z.string(),
      })
    ),
  }),
});

// Import preview schema
export const importPreviewSchema = z.object({
  conflicts: z.array(conflictSchema),
  statistics: z.object({
    totalConflicts: z.number(),
    conflictsByType: z.record(z.string(), z.number()),
    conflictsBySeverity: z.record(z.string(), z.number()),
    newItems: z.object({
      people: z.number(),
      relationships: z.number(),
      users: z.number(),
      suggestions: z.number(),
      photos: z.number(),
    }),
    existingItems: z.object({
      people: z.number(),
      relationships: z.number(),
      users: z.number(),
      suggestions: z.number(),
    }),
  }),
  estimatedDuration: z.object({
    minSeconds: z.number(),
    maxSeconds: z.number(),
  }),
});

export type BackupExportInput = z.infer<typeof backupExportSchema>;
export type BackupMetadata = z.infer<typeof backupMetadataSchema>;
export type ConflictResolutionStrategy = z.infer<
  typeof conflictResolutionStrategy
>;
export type BackupImportOptions = z.infer<typeof backupImportOptionsSchema>;
export type Conflict = z.infer<typeof conflictSchema>;
export type ValidationResult = z.infer<typeof validationResultSchema>;
export type ImportResult = z.infer<typeof importResultSchema>;
export type BackupValidationPreview = z.infer<
  typeof backupValidationPreviewSchema
>;
export type ImportPreview = z.infer<typeof importPreviewSchema>;

// Backup Settings schema (matches Prisma BackupSettings model)
export const storageProviderEnum = z.enum(["LOCAL", "S3", "R2", "B2"]);
export const backupStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "DELETED"]);
export const backupTypeEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY", "MANUAL"]);

export const backupSettingsSchema = z.object({
  id: z.string().optional(),
  dailyEnabled: z.boolean().default(true),
  dailyTime: z.string().default("02:00"),
  weeklyEnabled: z.boolean().default(true),
  weeklyDay: z.number().min(0).max(6).default(0),
  weeklyTime: z.string().default("03:00"),
  monthlyEnabled: z.boolean().default(true),
  monthlyDay: z.number().min(1).max(28).default(1),
  monthlyTime: z.string().default("04:00"),
  dailyRetention: z.number().min(1).default(7),
  weeklyRetention: z.number().min(1).default(4),
  monthlyRetention: z.number().min(1).default(12),
  storageProvider: storageProviderEnum.default("LOCAL"),
  storageBucket: z.string().nullable().optional(),
  storageRegion: z.string().nullable().optional(),
  storagePath: z.string().default("backups"),
  includePhotos: z.boolean().default(true),
  includeAuditLogs: z.boolean().default(false),
  compressLevel: z.number().min(0).max(9).default(6),
  notifyOnSuccess: z.boolean().default(false),
  notifyOnFailure: z.boolean().default(true),
  notificationEmails: z.string().nullable().optional(),
});

export const backupSchema = z.object({
  id: z.string(),
  filename: z.string(),
  type: backupTypeEnum,
  status: backupStatusEnum,
  size: z.union([z.bigint(), z.number()]).nullable(),
  location: storageProviderEnum,
  personCount: z.number().nullable(),
  relationshipCount: z.number().nullable(),
  eventCount: z.number().nullable(),
  mediaCount: z.number().nullable(),
  duration: z.number().nullable(),
  error: z.string().nullable(),
  createdAt: z.union([z.date(), z.string()]),
  deletedAt: z.union([z.date(), z.string()]).nullable(),
});

export const listBackupsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export type StorageProvider = z.infer<typeof storageProviderEnum>;
export type BackupStatus = z.infer<typeof backupStatusEnum>;
export type BackupType = z.infer<typeof backupTypeEnum>;
export type BackupSettings = z.infer<typeof backupSettingsSchema>;
export type Backup = z.infer<typeof backupSchema>;
export type ListBackupsInput = z.infer<typeof listBackupsInputSchema>;
