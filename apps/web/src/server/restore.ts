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
  ConflictResolutionStrategy,
  ImportPreview,
  ImportResult,
  ValidationResult,
} from "@vamsa/schemas";

// Re-export types for use by components
export type { ValidationResult, ImportResult, ImportPreview };

// Input validation schemas
const conflictStrategySchema = z.enum(["skip", "merge", "replace"] as const);

const importOptionsSchema = z.object({
  strategy: conflictStrategySchema
    .optional()
    .default("skip" as ConflictResolutionStrategy),
});

/**
 * Server function: Validate a backup ZIP file without importing
 * @returns Validation result with metadata about the backup
 * @requires ADMIN role
 */
export const validateBackup = createServerFn({ method: "POST" }).handler(
  async (): Promise<ValidationResult> => {
    const user = await requireAuth("ADMIN");
    return validateBackupData(user);
  }
);

/**
 * Server function: Preview what would be imported from a backup
 * @returns Import preview with existing data counts
 * @requires ADMIN role
 */
export const previewImport = createServerFn({ method: "POST" }).handler(
  async (): Promise<ImportPreview> => {
    const user = await requireAuth("ADMIN");
    return previewImportData(user);
  }
);

/**
 * Server function: Execute import with conflict resolution
 * @param strategy - Conflict resolution strategy (skip, merge, replace)
 * @returns Import result with statistics
 * @requires ADMIN role
 */
export const importBackup = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return importOptionsSchema.parse(data);
  })
  .handler(async ({ data }): Promise<ImportResult> => {
    const user = await requireAuth("ADMIN");
    return importBackupData(user, data.strategy);
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
    return history as Array<{
      id: string;
      importedAt: string;
      importedBy: string;
      strategy: string;
      success: boolean;
    }>;
  }
);
