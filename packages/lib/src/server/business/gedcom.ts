/**
 * GEDCOM Server Functions
 *
 * Orchestration functions that coordinate GEDCOM operations with database access,
 * authentication, logging, and metrics recording. These functions handle side effects
 * and interact with the Prisma database.
 */

import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import { logger, serializeError } from "@vamsa/lib/logger";
import {
  recordGedcomImport,
  recordGedcomExport,
  recordGedcomValidation,
} from "../metrics";
import type { VamsaPerson, VamsaRelationship } from "@vamsa/lib";
import archiver from "archiver";
import * as fs from "fs";
import * as path from "path";
import {
  parseGedcomFile,
  validateGedcomImportPrerequisites,
  mapGedcomToEntities,
  generateGedcomOutput,
  formatGedcomFileName,
  calculateGedcomStatistics,
  type GedcomStructureError,
} from "../helpers/gedcom";

/**
 * Type for the database client used by GEDCOM functions.
 * This allows dependency injection for testing.
 */
export type GedcomDb = Pick<
  PrismaClient,
  "person" | "relationship" | "auditLog" | "mediaObject" | "user" | "$transaction"
>;

/**
 * Result type for GEDCOM import operation
 */
export interface ImportResult {
  success: boolean;
  message: string;
  imported?: {
    people: number;
    relationships: number;
  };
  errors?: Array<{
    message: string;
    type: string;
  }>;
}

/**
 * Result type for GEDCOM export operation
 */
export interface ExportResult {
  success: boolean;
  message: string;
  gedcomContent?: string;
}

/**
 * Result type for GEDZip export operation
 */
export interface ExportZipResult {
  success: boolean;
  message: string;
  zipBase64?: string;
  manifest?: {
    gedcomFile: string;
    mediaFiles: string[];
    totalSize: number;
    exportDate: string;
  };
}

/**
 * Validate GEDCOM import prerequisites before actual import.
 *
 * Performs file format check and structural validation.
 * Does not import any data.
 *
 * @param fileName - File name for validation
 * @param fileContent - Raw GEDCOM file content
 * @param _db - Optional database client for consistency with DI pattern (defaults to prisma)
 * @returns Validation result with error details and preview
 *
 * @example
 * const result = await validateGedcomImport("family.ged", fileContent);
 * if (!result.valid) {
 *   console.log("Cannot import:", result.errors);
 * }
 */
export async function validateGedcomImport(
  fileName: string,
  fileContent: string,
  _db: GedcomDb = defaultPrisma
): Promise<{
  valid: boolean;
  message: string;
  preview?: {
    peopleCount: number;
    familiesCount: number;
    errors: GedcomStructureError[];
  };
}> {
  const start = Date.now();

  // Validate file format
  if (!fileName.endsWith(".ged")) {
    recordGedcomValidation(false, 1, Date.now() - start);
    return {
      valid: false,
      message: "File must be .ged format",
    };
  }

  try {
    // Parse GEDCOM content
    const gedcomFile = parseGedcomFile(fileContent);

    // Validate import prerequisites
    const validation = validateGedcomImportPrerequisites(gedcomFile);

    if (!validation.valid) {
      recordGedcomValidation(
        false,
        validation.errors.length,
        Date.now() - start
      );
      return {
        valid: false,
        message: "File has validation issues",
        preview: {
          peopleCount: 0,
          familiesCount: 0,
          errors: validation.errors,
        },
      };
    }

    // Get preview data
    const mapped = mapGedcomToEntities(gedcomFile);
    const stats = calculateGedcomStatistics(mapped);

    recordGedcomValidation(true, 0, Date.now() - start);

    return {
      valid: true,
      message: "File is valid",
      preview: {
        peopleCount: stats.peopleCount,
        familiesCount: Math.round(stats.spousalRelationships / 2),
        errors: mapped.errors.map((e) => ({
          message: e.message,
          type: "mapping_error" as const,
        })),
      },
    };
  } catch (error) {
    logger.error({ error: serializeError(error) }, "GEDCOM validation error");
    recordGedcomValidation(false, 1, Date.now() - start);

    return {
      valid: false,
      message: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

/**
 * Import GEDCOM file data into the database.
 *
 * Performs file validation, GEDCOM parsing, data mapping, and transactional
 * insertion into the database. Logs audit trail and records metrics.
 *
 * @param fileName - File name for audit logging
 * @param fileContent - Raw GEDCOM file content
 * @param userId - User ID performing the import
 * @param db - Optional database client (defaults to prisma)
 * @returns Import result with counts and errors
 *
 * @example
 * const result = await importGedcomData("family.ged", fileContent, userId);
 * if (result.success) {
 *   console.log(`Imported ${result.imported?.people} people`);
 * }
 */
export async function importGedcomData(
  fileName: string,
  fileContent: string,
  userId: string,
  db: GedcomDb = defaultPrisma
): Promise<ImportResult> {
  const start = Date.now();

  // Validate file format
  if (!fileName.endsWith(".ged")) {
    return {
      success: false,
      message: "File must be .ged format",
    };
  }

  try {
    // Parse GEDCOM content
    const gedcomFile = parseGedcomFile(fileContent);

    // Validate import prerequisites
    const validation = validateGedcomImportPrerequisites(gedcomFile);

    if (!validation.valid) {
      return {
        success: false,
        message: "GEDCOM file validation failed",
        errors: validation.errors.map((e) => ({
          message: e.message,
          type: e.type,
        })),
      };
    }

    // Map GEDCOM to Vamsa format
    const mapped = mapGedcomToEntities(gedcomFile);

    // Insert into database using transaction for atomicity
    const result = await db.$transaction(async (tx) => {
      const insertedPeople: VamsaPerson[] = [];
      const insertedRelationships: VamsaRelationship[] = [];

      // Insert persons
      for (const person of mapped.people) {
        const inserted = await tx.person.create({
          data: {
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            maidenName: person.maidenName,
            dateOfBirth: person.dateOfBirth,
            dateOfPassing: person.dateOfPassing,
            birthPlace: person.birthPlace,
            nativePlace: person.nativePlace,
            gender: person.gender,
            bio: person.bio,
            profession: person.profession,
            isLiving: person.isLiving,
          },
        });
        insertedPeople.push(inserted as unknown as VamsaPerson);
      }

      // Insert relationships
      for (const rel of mapped.relationships) {
        const inserted = await tx.relationship.create({
          data: {
            id: rel.id,
            personId: rel.personId,
            relatedPersonId: rel.relatedPersonId,
            type: rel.type,
            marriageDate: rel.marriageDate,
            divorceDate: rel.divorceDate,
            isActive: rel.isActive,
          },
        });
        insertedRelationships.push(inserted as unknown as VamsaRelationship);
      }

      return {
        people: insertedPeople,
        relationships: insertedRelationships,
      };
    });

    // Log audit trail
    await db.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entityType: "GEDCOM_IMPORT",
        entityId: null,
        newData: {
          fileName,
          peopleCount: result.people.length,
          relationshipCount: result.relationships.length,
        },
      },
    });

    // Record metrics
    const duration = Date.now() - start;
    recordGedcomImport(
      result.people.length,
      result.relationships.length,
      duration,
      mapped.errors.length,
      fileContent.length
    );

    return {
      success: true,
      message: `Successfully imported ${result.people.length} people and ${result.relationships.length} relationships`,
      imported: {
        people: result.people.length,
        relationships: result.relationships.length,
      },
      errors: mapped.errors.map((e) => ({
        message: e.message,
        type: "warning",
      })),
    };
  } catch (error) {
    logger.error({ error: serializeError(error) }, "GEDCOM import error");

    // Record failed import
    recordGedcomImport(0, 0, Date.now() - start, 1);

    return {
      success: false,
      message: error instanceof Error ? error.message : "Import failed",
    };
  }
}

/**
 * Export GEDCOM file with all persons and relationships.
 *
 * Fetches all data from the database, maps it to GEDCOM format,
 * and generates GEDCOM text content. Logs audit trail and records metrics.
 *
 * @param userId - User ID performing the export
 * @param db - Optional database client (defaults to prisma)
 * @returns Export result with GEDCOM content
 *
 * @example
 * const result = await exportGedcomData(userId);
 * if (result.success && result.gedcomContent) {
 *   fs.writeFileSync("family.ged", result.gedcomContent);
 * }
 */
export async function exportGedcomData(
  userId: string,
  db: GedcomDb = defaultPrisma
): Promise<ExportResult> {
  const start = Date.now();

  try {
    // Fetch all people and relationships
    const people = await db.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const relationships = await db.relationship.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Generate GEDCOM output
    const gedcomContent = generateGedcomOutput(
      people as unknown as VamsaPerson[],
      relationships as unknown as VamsaRelationship[],
      {
        sourceProgram: "vamsa",
        submitterName:
          (await db.user.findUnique({ where: { id: userId } }))?.name ||
          "Vamsa User",
      }
    );

    // Log audit trail
    await db.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entityType: "GEDCOM_EXPORT",
        entityId: null,
        newData: {
          peopleCount: people.length,
          relationshipCount: relationships.length,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Record metrics
    const duration = Date.now() - start;
    recordGedcomExport(people.length, relationships.length, duration);

    return {
      success: true,
      message: "Export successful",
      gedcomContent,
    };
  } catch (error) {
    logger.error({ error: serializeError(error) }, "GEDCOM export error");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Export failed",
    };
  }
}

/**
 * Export GEDCOM file with optional media files as a zip archive.
 *
 * Fetches all data and media, generates GEDCOM format, creates a zip archive
 * with GEDCOM and media files, and returns base64-encoded zip. Includes manifest
 * with export metadata. Logs audit trail and records metrics.
 *
 * @param userId - User ID performing the export
 * @param includeMedia - Whether to include media files (default: true)
 * @param db - Optional database client (defaults to prisma)
 * @returns Export result with base64-encoded zip and manifest
 *
 * @example
 * const result = await exportGedcomDataZip(userId, true);
 * if (result.success && result.zipBase64) {
 *   const buffer = Buffer.from(result.zipBase64, "base64");
 *   fs.writeFileSync("family-tree.zip", buffer);
 * }
 */
export async function exportGedcomDataZip(
  userId: string,
  includeMedia: boolean = true,
  db: GedcomDb = defaultPrisma
): Promise<ExportZipResult> {
  const start = Date.now();

  try {
    // Fetch all people and relationships
    const people = await db.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const relationships = await db.relationship.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Fetch all media objects if including media
    const mediaObjects = includeMedia
      ? await db.mediaObject.findMany({
          orderBy: { uploadedAt: "asc" },
        })
      : [];

    // Get user info for submitter name
    const user = await db.user.findUnique({ where: { id: userId } });

    // Generate GEDCOM output
    const gedcomContent = generateGedcomOutput(
      people as unknown as VamsaPerson[],
      relationships as unknown as VamsaRelationship[],
      {
        sourceProgram: "vamsa",
        submitterName: user?.name || "Vamsa User",
      }
    );

    // Create the archive
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    const chunks: Buffer[] = [];
    archive.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

    // Add GEDCOM file
    const gedcomFileName = formatGedcomFileName();
    archive.append(gedcomContent, { name: gedcomFileName });

    // Track included media files
    const includedMedia: string[] = [];
    let totalMediaSize = 0;

    // Add media files to the archive
    if (includeMedia && mediaObjects.length > 0) {
      for (const media of mediaObjects) {
        const filePath = media.filePath;

        // Check if file exists
        if (fs.existsSync(filePath)) {
          const fileName = path.basename(filePath);
          const archivePath = `media/${fileName}`;

          archive.file(filePath, { name: archivePath });
          includedMedia.push(archivePath);
          totalMediaSize += media.fileSize;
        } else {
          logger.warn({ filePath }, "Media file not found for GEDZip export");
        }
      }
    }

    // Create manifest
    const manifestContent = JSON.stringify(
      {
        version: "1.0",
        exportDate: new Date().toISOString(),
        gedcomFile: gedcomFileName,
        mediaFiles: includedMedia,
        statistics: {
          peopleCount: people.length,
          relationshipsCount: relationships.length,
          mediaFilesCount: includedMedia.length,
          totalMediaSize,
        },
        exportedBy: user?.name || user?.email,
      },
      null,
      2
    );
    archive.append(manifestContent, { name: "manifest.json" });

    // Finalize the archive
    await archive.finalize();

    // Wait for all chunks to be collected
    await new Promise<void>((resolve, reject) => {
      archive.on("end", resolve);
      archive.on("error", reject);
    });

    const zipBuffer = Buffer.concat(chunks);
    const zipBase64 = zipBuffer.toString("base64");

    // Log audit trail
    await db.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entityType: "GEDZIP_EXPORT",
        entityId: null,
        newData: {
          peopleCount: people.length,
          relationshipCount: relationships.length,
          mediaFilesCount: includedMedia.length,
          totalSize: zipBuffer.length,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Record metrics
    const duration = Date.now() - start;
    recordGedcomExport(people.length, relationships.length, duration);

    return {
      success: true,
      message: `Export successful: ${people.length} people, ${includedMedia.length} media files`,
      zipBase64,
      manifest: {
        gedcomFile: gedcomFileName,
        mediaFiles: includedMedia,
        totalSize: zipBuffer.length,
        exportDate: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error({ error: serializeError(error) }, "GEDZip export error");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Export failed",
    };
  }
}
