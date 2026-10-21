import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getImportHistoryData,
  importBackupData,
  previewImportData,
  validateBackupData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type {
  ImportPreview,
  ImportResult,
  ValidationResult,
} from "@vamsa/schemas";

// Re-export types for use by components
export type { ValidationResult, ImportResult, ImportPreview };

/** Largest accepted backup upload, matching the REST API. */
const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

/** The backup ZIP, base64-encoded by the browser. */
const archiveSchema = z.object({
  backupData: z
    .string()
    .min(1, "Choose a backup file")
    .max(Math.ceil((MAX_BACKUP_BYTES * 4) / 3) + 4, "Backup file too large"),
});

const importOptionsSchema = archiveSchema.extend({
  strategy: z.enum(["skip", "merge", "replace"]).default("skip"),
  createBackupBeforeImport: z.boolean().default(true),
});

const toBuffer = (b64: string) => Buffer.from(b64, "base64");

/**
 * Server function: Validate a backup ZIP file without importing
 * @requires ADMIN role
 */
export const validateBackup = createServerFn({ method: "POST" })
  .validator((data: unknown) => archiveSchema.parse(data))
  .handler(async ({ data }): Promise<ValidationResult> => {
    const user = await requireAuth("ADMIN");
    return validateBackupData(user, toBuffer(data.backupData));
  });

/**
 * Server function: Preview what restoring a backup would do (per-table new,
 * existing and changed rows)
 * @requires ADMIN role
 */
export const previewImport = createServerFn({ method: "POST" })
  .validator((data: unknown) => archiveSchema.parse(data))
  .handler(async ({ data }): Promise<ImportPreview> => {
    const user = await requireAuth("ADMIN");
    return previewImportData(user, toBuffer(data.backupData));
  });

/**
 * Server function: Restore a backup with the chosen strategy
 * @requires ADMIN role
 */
export const importBackup = createServerFn({ method: "POST" })
  .validator((data: unknown) => importOptionsSchema.parse(data))
  .handler(async ({ data }): Promise<ImportResult> => {
    const user = await requireAuth("ADMIN");
    return importBackupData(user, toBuffer(data.backupData), {
      strategy: data.strategy,
      createBackupBeforeImport: data.createBackupBeforeImport,
    });
  });

/**
 * Server function: Get import history for audit purposes
 * @returns List of recent imports (max 50)
 * @requires ADMIN role
 */
export const getImportHistory = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    Array<{
      id: string;
      importedAt: string;
      importedBy: string;
      strategy: string;
      success: boolean;
    }>
  > => {
    const user = await requireAuth("ADMIN");
    const history = await getImportHistoryData(user);
    return history;
  }
);
