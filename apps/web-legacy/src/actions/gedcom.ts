"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { GedcomParser } from "@/lib/gedcom/parser";
import { GedcomMapper } from "@/lib/gedcom/mapper";
import { GedcomGenerator } from "@/lib/gedcom/generator";
import type { VamsaPerson, VamsaRelationship } from "@/lib/gedcom/mapper-types";

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

/**
 * Import GEDCOM file and insert data into database
 */
export async function importGedcom(
  formData: FormData
): Promise<ImportGedcomResult> {
  try {
    // 1. Authenticate
    const user = await requireAdmin();

    // 2. Get file from formData
    const file = formData.get("file") as File;
    if (!file) {
      return {
        success: false,
        message: "No file provided",
      };
    }

    // 3. Validate file is .ged
    if (!file.name.endsWith(".ged")) {
      return {
        success: false,
        message: "File must be .ged format",
      };
    }

    // 4. Read and parse file
    const content = await file.text();
    const parser = new GedcomParser();
    const gedcomFile = parser.parse(content);

    // 5. Validate GEDCOM structure
    const validationErrors = parser.validate(gedcomFile);
    if (validationErrors.length > 0) {
      const errors = validationErrors.map((e) => ({
        message: e.message,
        type:
          e.severity === "error" ? "validation_error" : "validation_warning",
      }));

      // Only fail on errors, not warnings
      if (validationErrors.some((e) => e.severity === "error")) {
        return {
          success: false,
          message: "GEDCOM file validation failed",
          errors,
        };
      }
    }

    // 6. Map GEDCOM to Vamsa
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

    // 7. Insert into database using transaction for atomicity
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
        insertedPeople.push(inserted as any);
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
        insertedRelationships.push(inserted as any);
      }

      return {
        people: insertedPeople,
        relationships: insertedRelationships,
      };
    });

    // 8. Log audit trail
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entityType: "GEDCOM_IMPORT",
        entityId: null,
        newData: {
          fileName: file.name,
          fileSize: file.size,
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
}

/**
 * Export GEDCOM file from database
 */
export async function exportGedcom(): Promise<ExportGedcomResult> {
  try {
    // 1. Authenticate
    const user = await requireAdmin();

    // 2. Fetch all people and relationships
    const people = await db.person.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const relationships = await db.relationship.findMany({
      orderBy: { createdAt: "asc" },
    });

    // 3. Map to GEDCOM
    const mapper = new GedcomMapper();
    const { individuals, families } = mapper.mapToGedcom(
      people as any,
      relationships as any
    );

    // 4. Generate GEDCOM text
    const generator = new GedcomGenerator({
      sourceProgram: "vamsa",
      submitterName: user.name || "Vamsa User",
    });
    const gedcomContent = generator.generate(individuals, families);

    // 5. Log audit trail
    await db.auditLog.create({
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

/**
 * Validate GEDCOM file before import
 */
export async function validateGedcomFile(
  formData: FormData
): Promise<ValidateGedcomResult> {
  try {
    // 1. Authenticate
    await requireAdmin();

    // 2. Get file
    const file = formData.get("file") as File;
    if (!file) {
      return {
        valid: false,
        message: "No file provided",
      };
    }

    // 3. Validate file format
    if (!file.name.endsWith(".ged")) {
      return {
        valid: false,
        message: "File must be .ged format",
      };
    }

    // 4. Read and parse
    const content = await file.text();
    const parser = new GedcomParser();
    const gedcomFile = parser.parse(content);

    // 5. Validate
    const errors = parser.validate(gedcomFile);

    // 6. Map to get preview
    const mapper = new GedcomMapper();
    const mapped = mapper.mapFromGedcom(gedcomFile);

    // Count families (spouse relationships)
    const familiesCount =
      mapped.relationships.filter((r) => r.type === "SPOUSE").length / 2; // Divide by 2 since relationships are bidirectional

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
        familiesCount: Math.round(familiesCount),
        errors: allErrors,
      },
    };
  } catch (error) {
    console.error("GEDCOM validation error:", error);

    return {
      valid: false,
      message: error instanceof Error ? error.message : "Validation failed",
    };
  }
}
