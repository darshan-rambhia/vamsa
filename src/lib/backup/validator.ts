import unzipper from "unzipper";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  backupMetadataSchema,
  type BackupMetadata,
  type Conflict,
  type ValidationResult,
} from "@/schemas/backup";

// Supported backup versions
const SUPPORTED_VERSIONS = ["1.0.0"];
const _CURRENT_VERSION = "1.0.0";

// Data schemas for validation
const personDataSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const userDataSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  personId: z.string().nullable().optional(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const relationshipDataSchema = z.object({
  id: z.string(),
  personId: z.string(),
  relatedPersonId: z.string(),
  type: z.enum(["PARENT", "CHILD", "SPOUSE", "SIBLING"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class BackupValidator {
  private zipBuffer: Buffer;
  private extractedFiles: Map<string, Record<string, unknown> | Buffer> =
    new Map();
  private metadata: BackupMetadata | null = null;

  constructor(zipBuffer: Buffer) {
    this.zipBuffer = zipBuffer;
  }

  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts: Conflict[] = [];

    try {
      // Extract and validate ZIP structure
      await this.extractZipContents();

      // Validate metadata
      const metadataValidation = await this.validateMetadata();
      if (!metadataValidation.isValid) {
        errors.push(...metadataValidation.errors);
        return this.createValidationResult(false, conflicts, errors, warnings);
      }

      // Validate data files
      const dataValidation = await this.validateDataFiles();
      if (!dataValidation.isValid) {
        errors.push(...dataValidation.errors);
        warnings.push(...dataValidation.warnings);
      }

      // Detect conflicts with existing data
      const conflictDetection = await this.detectConflicts();
      conflicts.push(...conflictDetection.conflicts);
      warnings.push(...conflictDetection.warnings);

      const isValid = errors.length === 0;
      return this.createValidationResult(isValid, conflicts, errors, warnings);
    } catch (error) {
      console.error("Backup validation error:", error);
      errors.push(
        `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return this.createValidationResult(false, conflicts, errors, warnings);
    }
  }

  private async extractZipContents(): Promise<void> {
    return new Promise((resolve, reject) => {
      const directory = unzipper.Open.buffer(this.zipBuffer);

      directory
        .then(async (dir) => {
          for (const file of dir.files) {
            if (file.type === "File") {
              const content = await file.buffer();

              if (file.path.endsWith(".json")) {
                try {
                  const jsonData = JSON.parse(content.toString());
                  this.extractedFiles.set(file.path, jsonData);
                } catch (error) {
                  throw new Error(
                    `Invalid JSON in file ${file.path}: ${error}`
                  );
                }
              } else {
                // Store binary files (photos) as buffers
                this.extractedFiles.set(file.path, content);
              }
            }
          }
          resolve();
        })
        .catch(reject);
    });
  }

  private async validateMetadata(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!this.extractedFiles.has("metadata.json")) {
      errors.push("Missing metadata.json file");
      return { isValid: false, errors };
    }

    try {
      const metadataData = this.extractedFiles.get("metadata.json");
      this.metadata = backupMetadataSchema.parse(metadataData);

      // Check version compatibility
      if (!SUPPORTED_VERSIONS.includes(this.metadata.version)) {
        errors.push(
          `Unsupported backup version: ${this.metadata.version}. Supported versions: ${SUPPORTED_VERSIONS.join(", ")}`
        );
      }

      // Validate required data files exist
      for (const dataFile of this.metadata.dataFiles) {
        if (!this.extractedFiles.has(dataFile)) {
          errors.push(`Missing required data file: ${dataFile}`);
        }
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      errors.push(
        `Invalid metadata format: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return { isValid: false, errors };
    }
  }

  private async validateDataFiles(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.metadata) {
      errors.push("Metadata not loaded");
      return { isValid: false, errors, warnings };
    }

    // Validate people data
    if (this.extractedFiles.has("data/people.json")) {
      const peopleData = this.extractedFiles.get("data/people.json");
      if (!Array.isArray(peopleData)) {
        errors.push("People data must be an array");
      } else {
        for (let i = 0; i < peopleData.length; i++) {
          try {
            personDataSchema.parse(peopleData[i]);
          } catch (error) {
            errors.push(
              `Invalid person data at index ${i}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }
      }
    }

    // Validate users data
    if (this.extractedFiles.has("data/users.json")) {
      const usersData = this.extractedFiles.get("data/users.json");
      if (!Array.isArray(usersData)) {
        errors.push("Users data must be an array");
      } else {
        for (let i = 0; i < usersData.length; i++) {
          try {
            userDataSchema.parse(usersData[i]);
          } catch (error) {
            errors.push(
              `Invalid user data at index ${i}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }
      }
    }

    // Validate relationships data
    if (this.extractedFiles.has("data/relationships.json")) {
      const relationshipsData = this.extractedFiles.get(
        "data/relationships.json"
      );
      if (!Array.isArray(relationshipsData)) {
        errors.push("Relationships data must be an array");
      } else {
        for (let i = 0; i < relationshipsData.length; i++) {
          try {
            relationshipDataSchema.parse(relationshipsData[i]);
          } catch (error) {
            errors.push(
              `Invalid relationship data at index ${i}: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        }
      }
    }

    // Validate photo files
    const photoCount = this.metadata.statistics.totalPhotos;
    const actualPhotoFiles = Array.from(this.extractedFiles.keys()).filter(
      (path) => path.startsWith("photos/") && !path.endsWith("/")
    );

    if (photoCount > 0 && actualPhotoFiles.length !== photoCount) {
      warnings.push(
        `Expected ${photoCount} photos but found ${actualPhotoFiles.length} photo files`
      );
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private async detectConflicts(): Promise<{
    conflicts: Conflict[];
    warnings: string[];
  }> {
    const conflicts: Conflict[] = [];
    const warnings: string[] = [];

    if (!this.metadata) {
      warnings.push("Cannot detect conflicts without metadata");
      return { conflicts, warnings };
    }

    // Check for existing people conflicts
    if (this.extractedFiles.has("data/people.json")) {
      const peopleData = this.extractedFiles.get("data/people.json");
      if (Array.isArray(peopleData)) {
        const peopleConflicts = await this.detectPeopleConflicts(
          peopleData as Record<string, unknown>[]
        );
        conflicts.push(...peopleConflicts);
      }
    }

    // Check for existing users conflicts
    if (this.extractedFiles.has("data/users.json")) {
      const usersData = this.extractedFiles.get("data/users.json");
      if (Array.isArray(usersData)) {
        const userConflicts = await this.detectUserConflicts(
          usersData as Record<string, unknown>[]
        );
        conflicts.push(...userConflicts);
      }
    }

    // Check for relationship conflicts
    if (this.extractedFiles.has("data/relationships.json")) {
      const relationshipsData = this.extractedFiles.get(
        "data/relationships.json"
      );
      if (Array.isArray(relationshipsData)) {
        const relationshipConflicts = await this.detectRelationshipConflicts(
          relationshipsData as Record<string, unknown>[]
        );
        conflicts.push(...relationshipConflicts);
      }
    }

    return { conflicts, warnings };
  }

  private async detectPeopleConflicts(
    peopleData: Record<string, unknown>[]
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    for (const person of peopleData) {
      // Check for ID conflicts
      const personId = String(person.id || "");
      const existingById = await db.person.findUnique({
        where: { id: personId },
      });

      if (existingById) {
        conflicts.push({
          type: "person",
          action: "update",
          existingId: existingById.id,
          existingData: existingById,
          newData: person,
          conflictFields: this.getChangedFields(existingById, person),
          severity: "medium",
          description: `Person with ID ${personId} already exists`,
        });
        continue;
      }

      // Check for email conflicts
      const personEmail =
        typeof person.email === "string" ? person.email : undefined;
      if (personEmail) {
        const existingByEmail = await db.person.findFirst({
          where: { email: personEmail },
        });

        if (existingByEmail) {
          conflicts.push({
            type: "person",
            action: "create",
            existingId: existingByEmail.id,
            existingData: existingByEmail,
            newData: person,
            conflictFields: ["email"],
            severity: "high",
            description: `Person with email ${personEmail} already exists`,
          });
        }
      }

      // Check for name conflicts (potential duplicates)
      const personFirstName = String(person.firstName || "");
      const personLastName = String(person.lastName || "");
      const existingByName = await db.person.findFirst({
        where: {
          firstName: personFirstName,
          lastName: personLastName,
          dateOfBirth:
            typeof person.dateOfBirth === "string"
              ? new Date(person.dateOfBirth)
              : undefined,
        },
      });

      if (existingByName) {
        conflicts.push({
          type: "person",
          action: "create",
          existingId: existingByName.id,
          existingData: existingByName,
          newData: person,
          conflictFields: ["firstName", "lastName", "dateOfBirth"],
          severity: "low",
          description: `Potential duplicate person: ${personFirstName} ${personLastName}`,
        });
      }
    }

    return conflicts;
  }

  private async detectUserConflicts(
    usersData: Record<string, unknown>[]
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    for (const user of usersData) {
      // Check for ID conflicts
      const userId = String(user.id || "");
      const existingById = await db.user.findUnique({
        where: { id: userId },
      });

      if (existingById) {
        conflicts.push({
          type: "user",
          action: "update",
          existingId: existingById.id,
          existingData: existingById,
          newData: user,
          conflictFields: this.getChangedFields(existingById, user),
          severity: "high",
          description: `User with ID ${userId} already exists`,
        });
        continue;
      }

      // Check for email conflicts
      const userEmail = String(user.email || "");
      const existingByEmail = await db.user.findUnique({
        where: { email: userEmail },
      });

      if (existingByEmail) {
        conflicts.push({
          type: "user",
          action: "create",
          existingId: existingByEmail.id,
          existingData: existingByEmail,
          newData: user,
          conflictFields: ["email"],
          severity: "high",
          description: `User with email ${userEmail} already exists`,
        });
      }
    }

    return conflicts;
  }

  private async detectRelationshipConflicts(
    relationshipsData: Record<string, unknown>[]
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    for (const relationship of relationshipsData) {
      // Check for ID conflicts
      const relationshipId = String(relationship.id || "");
      const existingById = await db.relationship.findUnique({
        where: { id: relationshipId },
      });

      if (existingById) {
        conflicts.push({
          type: "relationship",
          action: "update",
          existingId: existingById.id,
          existingData: existingById,
          newData: relationship,
          conflictFields: this.getChangedFields(existingById, relationship),
          severity: "medium",
          description: `Relationship with ID ${relationshipId} already exists`,
        });
        continue;
      }

      // Check for duplicate relationships
      const relPersonId = String(relationship.personId || "");
      const relRelatedPersonId = String(relationship.relatedPersonId || "");
      const relTypeStr = String(relationship.type || "PARENT");
      const validTypes = ["PARENT", "CHILD", "SPOUSE", "SIBLING"];
      const relType = validTypes.includes(relTypeStr) ? relTypeStr : "PARENT";
      const existingRelationship = await db.relationship.findFirst({
        where: {
          personId: relPersonId,
          relatedPersonId: relRelatedPersonId,
          type: relType as "PARENT" | "CHILD" | "SPOUSE" | "SIBLING",
        },
      });

      if (existingRelationship) {
        conflicts.push({
          type: "relationship",
          action: "create",
          existingId: existingRelationship.id,
          existingData: existingRelationship,
          newData: relationship,
          conflictFields: ["personId", "relatedPersonId", "type"],
          severity: "medium",
          description: `Duplicate relationship between ${relationship.personId} and ${relationship.relatedPersonId}`,
        });
      }
    }

    return conflicts;
  }

  private getChangedFields(
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>
  ): string[] {
    const changedFields: string[] = [];

    for (const key in incoming) {
      if (existing[key] !== incoming[key]) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  private createValidationResult(
    isValid: boolean,
    conflicts: Conflict[],
    errors: string[],
    warnings: string[]
  ): ValidationResult {
    const conflictsByType: Record<string, number> = {};
    const conflictsBySeverity: Record<string, number> = {};

    for (const conflict of conflicts) {
      conflictsByType[conflict.type] =
        (conflictsByType[conflict.type] || 0) + 1;
      conflictsBySeverity[conflict.severity] =
        (conflictsBySeverity[conflict.severity] || 0) + 1;
    }

    return {
      isValid,
      metadata: this.metadata!,
      conflicts,
      statistics: {
        totalConflicts: conflicts.length,
        conflictsByType,
        conflictsBySeverity,
      },
      errors,
      warnings,
    };
  }

  getExtractedFiles(): Map<string, any> {
    return this.extractedFiles;
  }

  getMetadata(): BackupMetadata | null {
    return this.metadata;
  }
}
