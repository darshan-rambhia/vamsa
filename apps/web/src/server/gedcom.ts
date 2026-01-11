import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./db";
import {
  GedcomParser,
  GedcomMapper,
  GedcomGenerator,
  type VamsaPerson,
  type VamsaRelationship,
} from "@vamsa/lib";
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

export interface ImportGedcomResult {
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

export interface ExportGedcomResult {
  success: boolean;
  message: string;
  gedcomContent?: string;
}

export interface ExportGedZipResult {
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

// Validate GEDCOM file
export const validateGedcom = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; fileContent: string }) => data)
  .handler(async ({ data }): Promise<ValidateGedcomResult> => {
    await requireAuth("ADMIN");

    const { fileName, fileContent } = data;

    // Validate file format
    if (!fileName.endsWith(".ged")) {
      return {
        valid: false,
        message: "File must be .ged format",
      };
    }

    try {
      // Parse the GEDCOM content
      const parser = new GedcomParser();
      const gedcomFile = parser.parse(fileContent);

      // Validate the parsed structure
      const errors = parser.validate(gedcomFile);

      // Map to get preview data
      const mapper = new GedcomMapper();
      const mapped = mapper.mapFromGedcom(gedcomFile);

      // Count families (spouse relationships)
      const familiesCount = Math.round(
        mapped.relationships.filter((r) => r.type === "SPOUSE").length / 2
      );

      const allErrors = [
        ...errors.map((e) => ({
          message: e.message,
          type:
            e.severity === "error" ? "validation_error" : "validation_warning",
        })),
        ...mapped.errors.map((e) => ({
          message: e.message,
          type: "mapping_error",
        })),
      ];

      const isValid = errors.every((e) => e.severity !== "error");

      return {
        valid: isValid,
        message: isValid ? "File is valid" : "File has validation issues",
        preview: {
          peopleCount: mapped.people.length,
          familiesCount,
          errors: allErrors,
        },
      };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : "Validation failed",
      };
    }
  });

// Import GEDCOM file
export const importGedcom = createServerFn({ method: "POST" })
  .inputValidator((data: { fileName: string; fileContent: string }) => data)
  .handler(async ({ data }): Promise<ImportGedcomResult> => {
    const user = await requireAuth("ADMIN");

    const { fileName, fileContent } = data;

    // Validate file format
    if (!fileName.endsWith(".ged")) {
      return {
        success: false,
        message: "File must be .ged format",
      };
    }

    try {
      // Parse the GEDCOM content
      const parser = new GedcomParser();
      const gedcomFile = parser.parse(fileContent);

      // Validate the parsed structure
      const validationErrors = parser.validate(gedcomFile);
      if (validationErrors.some((e) => e.severity === "error")) {
        return {
          success: false,
          message: "GEDCOM file validation failed",
          errors: validationErrors.map((e) => ({
            message: e.message,
            type:
              e.severity === "error"
                ? "validation_error"
                : "validation_warning",
          })),
        };
      }

      // Map GEDCOM to Vamsa format
      const mapper = new GedcomMapper();
      const mapped = mapper.mapFromGedcom(gedcomFile);

      // Return early if there are critical mapping errors
      if (
        mapped.errors.some(
          (e) => e.type === "broken_reference" || e.type === "invalid_format"
        )
      ) {
        return {
          success: false,
          message: "GEDCOM mapping failed due to data errors",
          errors: mapped.errors.map((e) => ({
            message: e.message,
            type: "mapping_error",
          })),
        };
      }

      // Insert into database using transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
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
      await prisma.auditLog.create({
        data: {
          userId: user.id,
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
      console.error("GEDCOM import error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Import failed",
      };
    }
  });

// Export GEDCOM file
export const exportGedcom = createServerFn({ method: "GET" }).handler(
  async (): Promise<ExportGedcomResult> => {
    const user = await requireAuth("ADMIN");

    try {
      // Fetch all people and relationships
      const people = await prisma.person.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });

      const relationships = await prisma.relationship.findMany({
        orderBy: { createdAt: "asc" },
      });

      // Map to GEDCOM format
      const mapper = new GedcomMapper();
      const { individuals, families } = mapper.mapToGedcom(
        people as unknown as VamsaPerson[],
        relationships as unknown as VamsaRelationship[]
      );

      // Generate GEDCOM text
      const generator = new GedcomGenerator({
        sourceProgram: "vamsa",
        submitterName: user.name || "Vamsa User",
      });
      const gedcomContent = generator.generate(individuals, families);

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          userId: user.id,
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

      return {
        success: true,
        message: "Export successful",
        gedcomContent,
      };
    } catch (error) {
      console.error("GEDCOM export error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Export failed",
      };
    }
  }
);

// Export GEDZip file (GEDCOM + media bundle)
export const exportGedZip = createServerFn({ method: "GET" })
  .inputValidator((data: { includeMedia?: boolean }) => data)
  .handler(async ({ data }): Promise<ExportGedZipResult> => {
    const user = await requireAuth("ADMIN");

    const includeMedia = data.includeMedia !== false;

    try {
      // Fetch all people and relationships
      const people = await prisma.person.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });

      const relationships = await prisma.relationship.findMany({
        orderBy: { createdAt: "asc" },
      });

      // Fetch all media objects if including media
      const mediaObjects = includeMedia
        ? await prisma.mediaObject.findMany({
            orderBy: { uploadedAt: "asc" },
          })
        : [];

      // Map to GEDCOM format
      const mapper = new GedcomMapper();
      const { individuals, families } = mapper.mapToGedcom(
        people as unknown as VamsaPerson[],
        relationships as unknown as VamsaRelationship[]
      );

      // Generate GEDCOM text
      const generator = new GedcomGenerator({
        sourceProgram: "vamsa",
        submitterName: user.name || "Vamsa User",
      });
      const gedcomContent = generator.generate(individuals, families);

      // Create the archive
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      const chunks: Buffer[] = [];
      archive.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

      // Add GEDCOM file
      const gedcomFileName = `family-tree-${new Date().toISOString().split("T")[0]}.ged`;
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
            console.warn(`[GEDZip] Media file not found: ${filePath}`);
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
          exportedBy: user.name || user.email,
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
      await prisma.auditLog.create({
        data: {
          userId: user.id,
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
      console.error("GEDZip export error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Export failed",
      };
    }
  });
