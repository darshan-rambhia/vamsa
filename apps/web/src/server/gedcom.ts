/**
 * GEDCOM Server Functions
 *
 * TanStack React Start server functions that wrap the GEDCOM orchestration layer.
 * These functions handle HTTP requests, input validation, authentication, and
 * delegate to the orchestration layer for business logic.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "./middleware/require-auth";
import {
  validateGedcomImport,
  importGedcomData,
  exportGedcomData,
  exportGedcomDataZip,
  type ImportResult,
  type ExportResult,
  type ExportZipResult,
} from "@vamsa/lib/server/business";

/**
 * GEDCOM validation result type
 */
export interface ValidateGedcomResult {
  valid: boolean;
  message: string;
  preview?: {
    peopleCount: number;
    familiesCount: number;
    errors: Array<{
      message: string;
      type: string;
    }>;
  };
}

// Re-export types for backwards compatibility
export type { ImportResult, ExportResult, ExportZipResult };

/**
 * Validate GEDCOM file before import
 *
 * Server function that validates GEDCOM file format and structure
 * without importing any data. Requires ADMIN role.
 *
 * @returns Validation result with preview data
 *
 * @example
 * const result = await validateGedcom({ fileName, fileContent });
 * if (!result.valid) {
 *   console.log("Cannot import:", result.errors);
 * }
 */
export const validateGedcom = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; fileContent: string }) => data)
  .handler(async ({ data }): Promise<ValidateGedcomResult> => {
    await requireAuth("ADMIN");

    const { fileName, fileContent } = data;

    const validation = await validateGedcomImport(fileName, fileContent);

    return {
      valid: validation.valid,
      message: validation.message,
      preview: validation.preview
        ? {
            peopleCount: validation.preview.peopleCount,
            familiesCount: validation.preview.familiesCount,
            errors: validation.preview.errors,
          }
        : undefined,
    };
  });

/**
 * Import GEDCOM file into database
 *
 * Server function that imports GEDCOM data into the database.
 * Requires ADMIN role. Performs validation, parsing, mapping,
 * and transactional insertion. Returns import statistics.
 *
 * @returns Import result with counts and errors
 *
 * @example
 * const result = await importGedcom({ fileName, fileContent });
 * if (result.success) {
 *   console.log(`Imported ${result.imported?.people} people`);
 * }
 */
export const importGedcom = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; fileContent: string }) => data)
  .handler(async ({ data }): Promise<ImportResult> => {
    const user = await requireAuth("ADMIN");

    const { fileName, fileContent } = data;

    return importGedcomData(fileName, fileContent, user.id);
  });

/**
 * Export GEDCOM file
 *
 * Server function that exports all persons and relationships
 * as GEDCOM text content. Requires ADMIN role.
 *
 * @returns Export result with GEDCOM content
 *
 * @example
 * const result = await exportGedcom();
 * if (result.success && result.gedcomContent) {
 *   // Download or process GEDCOM content
 * }
 */
export const exportGedcom = createServerFn({ method: "GET" }).handler(
  async (): Promise<ExportResult> => {
    const user = await requireAuth("ADMIN");

    return exportGedcomData(user.id);
  }
);

/**
 * Export GEDCOM file with media as zip
 *
 * Server function that exports all persons, relationships, and
 * optionally media files as a zip archive with manifest.
 * Requires ADMIN role.
 *
 * @returns Export result with base64-encoded zip and manifest
 *
 * @example
 * const result = await exportGedZip({ includeMedia: true });
 * if (result.success && result.zipBase64) {
 *   // Decode base64 and download as file
 * }
 */
export const exportGedZip = createServerFn({ method: "GET" })
  .inputValidator((data: { includeMedia?: boolean }) => data)
  .handler(async ({ data }): Promise<ExportZipResult> => {
    const user = await requireAuth("ADMIN");

    const includeMedia = data.includeMedia !== false;

    return exportGedcomDataZip(user.id, includeMedia);
  });
