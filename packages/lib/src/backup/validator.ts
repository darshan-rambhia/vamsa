// Backup validator utility for ZIP extraction and validation
// This utility is designed to be database-agnostic

import { logger, serializeError } from "@vamsa/lib/logger";

export interface BackupMetadata {
  version: string;
  exportedAt: string;
  exportedBy: {
    id: string;
    email: string;
    name: string | null;
  };
  statistics: {
    totalPeople: number;
    totalRelationships: number;
    totalUsers: number;
    totalSuggestions: number;
    totalPhotos: number;
    auditLogDays: number;
    totalAuditLogs: number;
  };
  dataFiles: string[];
  photoDirectories: string[];
}

export interface Conflict {
  type: "person" | "user" | "relationship" | "suggestion" | "settings";
  action: "create" | "update";
  existingId?: string;
  // existingData?: Record<string, any>;
  // newData: Record<string, any>;
  conflictFields: string[];
  severity: "low" | "medium" | "high";
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  metadata: BackupMetadata;
  conflicts: Conflict[];
  statistics: {
    totalConflicts: number;
    conflictsByType: Record<string, number>;
    conflictsBySeverity: Record<string, number>;
  };
  errors: string[];
  warnings: string[];
}

// Supported backup versions
const SUPPORTED_VERSIONS = ["1.0.0"];

export class BackupValidator {
  private zipBuffer: Buffer;
  private extractedFiles: Map<string, unknown> = new Map();
  private metadata: BackupMetadata | null = null;

  constructor(zipBuffer: Buffer) {
    this.zipBuffer = zipBuffer;
  }

  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts: Conflict[] = [];

    try {
      // Validate file size first
      if (this.zipBuffer.length === 0) {
        errors.push("Backup file is empty");
        return this.createValidationResult(false, conflicts, errors, warnings);
      }

      if (this.zipBuffer.length > 100 * 1024 * 1024) {
        errors.push("Backup file exceeds 100MB limit");
        return this.createValidationResult(false, conflicts, errors, warnings);
      }

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

      const isValid = errors.length === 0;
      return this.createValidationResult(isValid, conflicts, errors, warnings);
    } catch (error) {
      logger.error({ error: serializeError(error) }, "Backup validation error");
      errors.push(
        `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      return this.createValidationResult(false, conflicts, errors, warnings);
    }
  }

  private async extractZipContents(): Promise<void> {
    try {
      // For now, this is a simplified version that would need 'unzipper' package in the consuming app
      // The actual ZIP extraction will be handled in the server function
      // that has access to the proper dependencies

      // Try to decode as JSON (for testing purposes)
      const content = this.zipBuffer.toString("utf-8");

      try {
        const data = JSON.parse(content);
        // If directly parseable as JSON, use it
        this.extractedFiles.set("data.json", data);
      } catch {
        // If not JSON, it's likely a real ZIP file
        // This should be handled by the server function with 'unzipper' package
        throw new Error(
          "ZIP extraction requires proper ZIP library. Use BackupValidator in a context with 'unzipper' package available."
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to extract ZIP: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
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

      if (!metadataData || typeof metadataData !== "object") {
        errors.push("Invalid metadata format in metadata.json");
        return { isValid: false, errors };
      }

      const typedMetadata = metadataData as BackupMetadata;

      // Basic validation
      if (!typedMetadata.version) {
        errors.push("Missing version in metadata");
        return { isValid: false, errors };
      }

      if (!typedMetadata.exportedAt) {
        errors.push("Missing exportedAt in metadata");
        return { isValid: false, errors };
      }

      if (!typedMetadata.statistics) {
        errors.push("Missing statistics in metadata");
        return { isValid: false, errors };
      }

      // Check version compatibility
      if (!SUPPORTED_VERSIONS.includes(typedMetadata.version)) {
        errors.push(
          `Unsupported backup version: ${typedMetadata.version}. Supported versions: ${SUPPORTED_VERSIONS.join(", ")}`
        );
      }

      this.metadata = typedMetadata;

      // Validate required data files exist
      if (Array.isArray(typedMetadata.dataFiles)) {
        for (const dataFile of typedMetadata.dataFiles) {
          if (!this.extractedFiles.has(dataFile)) {
            errors.push(`Missing required data file: ${dataFile}`);
          }
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

    // Validate data files are arrays
    const requiredArrays = [
      "data/people.json",
      "data/users.json",
      "data/relationships.json",
      "data/suggestions.json",
    ];

    for (const file of requiredArrays) {
      if (this.extractedFiles.has(file)) {
        const data = this.extractedFiles.get(file);
        if (!Array.isArray(data)) {
          errors.push(`${file} must be an array`);
        }
      }
    }

    // Validate settings is an object
    if (this.extractedFiles.has("data/settings.json")) {
      const settings = this.extractedFiles.get("data/settings.json");
      if (typeof settings !== "object" || Array.isArray(settings)) {
        errors.push("Settings data must be an object");
      }
    }

    // Validate photo file count matches metadata
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
      metadata: this.metadata || {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "",
          email: "",
          name: null,
        },
        statistics: {
          totalPeople: 0,
          totalRelationships: 0,
          totalUsers: 0,
          totalSuggestions: 0,
          totalPhotos: 0,
          auditLogDays: 0,
          totalAuditLogs: 0,
        },
        dataFiles: [],
        photoDirectories: [],
      },
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

  getExtractedFiles(): Map<string, unknown> {
    return this.extractedFiles;
  }

  getMetadata(): BackupMetadata | null {
    return this.metadata;
  }

  // Helper method to count items in extracted data
  countItems(): {
    people: number;
    users: number;
    relationships: number;
    suggestions: number;
  } {
    return {
      people: this.extractedFiles.has("data/people.json")
        ? (this.extractedFiles.get("data/people.json") as unknown[]).length
        : 0,
      users: this.extractedFiles.has("data/users.json")
        ? (this.extractedFiles.get("data/users.json") as unknown[]).length
        : 0,
      relationships: this.extractedFiles.has("data/relationships.json")
        ? (this.extractedFiles.get("data/relationships.json") as unknown[])
            .length
        : 0,
      suggestions: this.extractedFiles.has("data/suggestions.json")
        ? (this.extractedFiles.get("data/suggestions.json") as unknown[]).length
        : 0,
    };
  }
}
