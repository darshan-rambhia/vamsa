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

export type BackupExportInput = z.infer<typeof backupExportSchema>;
export type BackupMetadata = z.infer<typeof backupMetadataSchema>;
