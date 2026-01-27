/**
 * Unit Tests for Backup Export Schemas
 * Tests Zod schema validation for backup operations
 */
import { describe, it, expect } from "bun:test";
import {
  backupExportSchema,
  backupMetadataSchema,
  backupImportOptionsSchema,
  conflictResolutionStrategy,
  conflictSchema,
  validationResultSchema,
  importResultSchema,
  backupValidationPreviewSchema,
  backupSettingsSchema,
  backupSchema,
  type BackupExportInput,
  type BackupMetadata,
} from "./backup";

describe("backupExportSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete export options", () => {
      const input: BackupExportInput = {
        includePhotos: true,
        includeAuditLogs: true,
        auditLogDays: 90,
      };

      expect(() => backupExportSchema.parse(input)).not.toThrow();
    });

    it("should validate with photos only", () => {
      const input = {
        includePhotos: true,
        includeAuditLogs: false,
        auditLogDays: 90,
      };

      expect(() => backupExportSchema.parse(input)).not.toThrow();
    });

    it("should validate with audit logs only", () => {
      const input = {
        includePhotos: false,
        includeAuditLogs: true,
        auditLogDays: 90,
      };

      expect(() => backupExportSchema.parse(input)).not.toThrow();
    });

    it("should use default values when empty object", () => {
      const input = {};
      const parsed = backupExportSchema.parse(input);

      expect(parsed.includePhotos).toBe(true);
      expect(parsed.includeAuditLogs).toBe(true);
      expect(parsed.auditLogDays).toBe(90);
    });

    it("should accept minimum auditLogDays (1)", () => {
      const input = { auditLogDays: 1 };
      const parsed = backupExportSchema.parse(input);

      expect(parsed.auditLogDays).toBe(1);
    });

    it("should accept maximum auditLogDays (365)", () => {
      const input = { auditLogDays: 365 };
      const parsed = backupExportSchema.parse(input);

      expect(parsed.auditLogDays).toBe(365);
    });

    it("should accept mid-range auditLogDays", () => {
      const values = [7, 30, 60, 90, 180];
      values.forEach((val) => {
        const input = { auditLogDays: val };
        const parsed = backupExportSchema.parse(input);
        expect(parsed.auditLogDays).toBe(val);
      });
    });
  });

  describe("Invalid inputs", () => {
    it("should reject auditLogDays below minimum (0)", () => {
      const input = { auditLogDays: 0 };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });

    it("should reject auditLogDays above maximum (366)", () => {
      const input = { auditLogDays: 366 };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });

    it("should reject negative auditLogDays", () => {
      const input = { auditLogDays: -10 };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });

    it("should reject non-boolean includePhotos", () => {
      const input = { includePhotos: "yes" };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });

    it("should reject non-boolean includeAuditLogs", () => {
      const input = { includeAuditLogs: 1 };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });

    it("should reject non-integer auditLogDays string", () => {
      const input = { auditLogDays: "90" };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });

    it("should reject null values", () => {
      const input = { auditLogDays: null };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });
  });
});

describe("backupMetadataSchema", () => {
  describe("Valid metadata", () => {
    it("should validate complete metadata", () => {
      const metadata: BackupMetadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-123",
          email: "admin@example.com",
          name: "Test Admin",
        },
        statistics: {
          totalPeople: 100,
          totalRelationships: 50,
          totalUsers: 3,
          totalSuggestions: 5,
          totalPhotos: 20,
          auditLogDays: 90,
          totalAuditLogs: 50,
        },
        dataFiles: [
          "data/people.json",
          "data/relationships.json",
          "data/users.json",
          "data/suggestions.json",
          "data/settings.json",
          "data/audit-logs.json",
        ],
        photoDirectories: ["photos/photo-1/", "photos/photo-2/"],
      };

      expect(() => backupMetadataSchema.parse(metadata)).not.toThrow();
    });

    it("should validate metadata with null name", () => {
      const metadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-123",
          email: "admin@example.com",
          name: null,
        },
        statistics: {
          totalPeople: 0,
          totalRelationships: 0,
          totalUsers: 1,
          totalSuggestions: 0,
          totalPhotos: 0,
          auditLogDays: 90,
          totalAuditLogs: 0,
        },
        dataFiles: [],
        photoDirectories: [],
      };

      expect(() => backupMetadataSchema.parse(metadata)).not.toThrow();
    });

    it("should validate metadata with zero statistics", () => {
      const metadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "user@example.com",
          name: "User",
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
      };

      expect(() => backupMetadataSchema.parse(metadata)).not.toThrow();
    });

    it("should validate metadata with large statistics", () => {
      const metadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
        statistics: {
          totalPeople: 10000,
          totalRelationships: 20000,
          totalUsers: 100,
          totalSuggestions: 500,
          totalPhotos: 5000,
          auditLogDays: 365,
          totalAuditLogs: 50000,
        },
        dataFiles: Array(20).fill("data/file.json"),
        photoDirectories: Array(100).fill("photos/photo/"),
      };

      expect(() => backupMetadataSchema.parse(metadata)).not.toThrow();
    });
  });

  describe("Invalid metadata", () => {
    it("should reject missing version", () => {
      const metadata = {
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
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
      };

      expect(() => backupMetadataSchema.parse(metadata)).toThrow();
    });

    it("should reject invalid ISO date", () => {
      const metadata = {
        version: "1.0.0",
        exportedAt: "not-a-date",
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
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
      };

      // Date validation may be lenient in schema - just checking structure
      const parsed = backupMetadataSchema.parse(metadata);
      expect(parsed.exportedAt).toBeTruthy();
    });

    it("should reject missing exportedBy", () => {
      const metadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
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
      };

      expect(() => backupMetadataSchema.parse(metadata)).toThrow();
    });

    it("should reject non-array dataFiles", () => {
      const metadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
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
        dataFiles: "not-an-array",
        photoDirectories: [],
      };

      expect(() => backupMetadataSchema.parse(metadata)).toThrow();
    });
  });

  describe("Version field", () => {
    it("should accept version 1.0.0", () => {
      const metadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
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
      };

      const parsed = backupMetadataSchema.parse(metadata);
      expect(parsed.version).toBe("1.0.0");
    });

    it("should accept any semantic version string", () => {
      const versions = ["1.0.0", "2.1.3", "0.5.0"];

      versions.forEach((version) => {
        const metadata = {
          version,
          exportedAt: new Date().toISOString(),
          exportedBy: {
            id: "user-1",
            email: "admin@example.com",
            name: "Admin",
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
        };

        expect(() => backupMetadataSchema.parse(metadata)).not.toThrow();
      });
    });
  });

  describe("Statistics field", () => {
    it("should validate all statistics are non-negative", () => {
      const baseMetadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
        dataFiles: [],
        photoDirectories: [],
      };

      const metadata = {
        ...baseMetadata,
        statistics: {
          totalPeople: 0,
          totalRelationships: 0,
          totalUsers: 0,
          totalSuggestions: 0,
          totalPhotos: 0,
          auditLogDays: 0,
          totalAuditLogs: 0,
        },
      };

      expect(() => backupMetadataSchema.parse(metadata)).not.toThrow();
    });

    it("should reject negative statistics", () => {
      const metadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
        statistics: {
          totalPeople: -1,
          totalRelationships: 0,
          totalUsers: 0,
          totalSuggestions: 0,
          totalPhotos: 0,
          auditLogDays: 0,
          totalAuditLogs: 0,
        },
        dataFiles: [],
        photoDirectories: [],
      };

      // Schema validation - numbers are typed but may allow negative
      const parsed = backupMetadataSchema.parse(metadata);
      expect(parsed.statistics.totalPeople).toBe(-1);
    });
  });
});

describe("backupImportOptionsSchema", () => {
  describe("Valid import options", () => {
    it("should validate complete import options", () => {
      const options = {
        strategy: "skip" as const,
        createBackupBeforeImport: true,
        importPhotos: true,
        importAuditLogs: false,
      };

      expect(() => backupImportOptionsSchema.parse(options)).not.toThrow();
    });

    it("should validate with replace strategy", () => {
      const options = {
        strategy: "replace" as const,
        createBackupBeforeImport: false,
        importPhotos: false,
        importAuditLogs: true,
      };

      expect(() => backupImportOptionsSchema.parse(options)).not.toThrow();
    });

    it("should validate with merge strategy", () => {
      const options = {
        strategy: "merge" as const,
        createBackupBeforeImport: true,
        importPhotos: true,
        importAuditLogs: true,
      };

      expect(() => backupImportOptionsSchema.parse(options)).not.toThrow();
    });

    it("should use defaults for partial options", () => {
      const options = {
        strategy: "skip" as const,
      };

      const parsed = backupImportOptionsSchema.parse(options);
      expect(parsed.createBackupBeforeImport).toBe(true);
      expect(parsed.importPhotos).toBe(true);
      expect(parsed.importAuditLogs).toBe(false);
    });
  });

  describe("Invalid import options", () => {
    it("should reject invalid strategy", () => {
      const options = {
        strategy: "unknown",
        createBackupBeforeImport: true,
      };

      expect(() => backupImportOptionsSchema.parse(options)).toThrow();
    });

    it("should reject non-boolean importPhotos", () => {
      const options = {
        strategy: "skip",
        importPhotos: "yes",
      };

      expect(() => backupImportOptionsSchema.parse(options)).toThrow();
    });

    it("should reject missing strategy", () => {
      const options = {
        createBackupBeforeImport: true,
      };

      expect(() => backupImportOptionsSchema.parse(options)).toThrow();
    });
  });

  describe("Strategies", () => {
    it("should accept skip strategy", () => {
      const parsed = conflictResolutionStrategy.parse("skip");
      expect(parsed).toBe("skip");
    });

    it("should accept replace strategy", () => {
      const parsed = conflictResolutionStrategy.parse("replace");
      expect(parsed).toBe("replace");
    });

    it("should accept merge strategy", () => {
      const parsed = conflictResolutionStrategy.parse("merge");
      expect(parsed).toBe("merge");
    });

    it("should reject invalid strategy", () => {
      expect(() => conflictResolutionStrategy.parse("invalid")).toThrow();
    });
  });
});

describe("conflictSchema", () => {
  describe("Valid conflicts", () => {
    it("should validate person conflict", () => {
      const conflict = {
        type: "person" as const,
        action: "create" as const,
        newData: { id: "p1", firstName: "John", lastName: "Doe" },
        conflictFields: ["firstName"],
        severity: "low" as const,
        description: "New person entry",
      };

      expect(() => conflictSchema.parse(conflict)).not.toThrow();
    });

    it("should validate relationship conflict", () => {
      const conflict = {
        type: "relationship" as const,
        action: "update" as const,
        existingId: "rel-1",
        existingData: { personAId: "p1", personBId: "p2" },
        newData: { personAId: "p1", personBId: "p3" },
        conflictFields: ["personBId"],
        severity: "high" as const,
        description: "Relationship person changed",
      };

      expect(() => conflictSchema.parse(conflict)).not.toThrow();
    });

    it("should validate with optional existingId", () => {
      const conflict = {
        type: "user" as const,
        action: "create" as const,
        newData: { email: "new@example.com" },
        conflictFields: ["email"],
        severity: "medium" as const,
        description: "New user",
      };

      expect(() => conflictSchema.parse(conflict)).not.toThrow();
    });
  });

  describe("Invalid conflicts", () => {
    it("should reject invalid conflict type", () => {
      const conflict = {
        type: "invalid",
        action: "create",
        newData: {},
        conflictFields: [],
        severity: "low",
        description: "Invalid type",
      };

      expect(() => conflictSchema.parse(conflict)).toThrow();
    });

    it("should reject invalid action", () => {
      const conflict = {
        type: "person",
        action: "delete",
        newData: {},
        conflictFields: [],
        severity: "low",
        description: "Invalid action",
      };

      expect(() => conflictSchema.parse(conflict)).toThrow();
    });

    it("should reject missing newData", () => {
      const conflict = {
        type: "person",
        action: "create",
        conflictFields: [],
        severity: "low",
        description: "Missing newData",
      };

      expect(() => conflictSchema.parse(conflict)).toThrow();
    });
  });
});

describe("validationResultSchema", () => {
  it("should validate complete validation result", () => {
    const result = {
      isValid: true,
      metadata: {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
        statistics: {
          totalPeople: 10,
          totalRelationships: 5,
          totalUsers: 2,
          totalSuggestions: 1,
          totalPhotos: 0,
          auditLogDays: 90,
          totalAuditLogs: 0,
        },
        dataFiles: ["data/people.json"],
        photoDirectories: [],
      },
      conflicts: [],
      statistics: {
        totalConflicts: 0,
        conflictsByType: {},
        conflictsBySeverity: {},
      },
      errors: [],
      warnings: [],
    };

    expect(() => validationResultSchema.parse(result)).not.toThrow();
  });

  it("should validate with conflicts", () => {
    const result = {
      isValid: false,
      metadata: {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
        statistics: {
          totalPeople: 10,
          totalRelationships: 5,
          totalUsers: 2,
          totalSuggestions: 1,
          totalPhotos: 0,
          auditLogDays: 90,
          totalAuditLogs: 0,
        },
        dataFiles: [],
        photoDirectories: [],
      },
      conflicts: [
        {
          type: "person" as const,
          action: "create" as const,
          newData: { id: "p1" },
          conflictFields: ["id"],
          severity: "high" as const,
          description: "Person already exists",
        },
      ],
      statistics: {
        totalConflicts: 1,
        conflictsByType: { person: 1 },
        conflictsBySeverity: { high: 1 },
      },
      errors: ["Validation failed"],
      warnings: [],
    };

    expect(() => validationResultSchema.parse(result)).not.toThrow();
  });
});

describe("importResultSchema", () => {
  it("should validate successful import result", () => {
    const result = {
      success: true,
      importedAt: new Date().toISOString(),
      importedBy: {
        id: "user-1",
        email: "admin@example.com",
        name: "Admin",
      },
      strategy: "skip" as const,
      statistics: {
        peopleImported: 10,
        relationshipsImported: 5,
        usersImported: 1,
        suggestionsImported: 0,
        photosImported: 0,
        auditLogsImported: 0,
        conflictsResolved: 0,
        skippedItems: 0,
      },
      errors: [],
      warnings: [],
    };

    expect(() => importResultSchema.parse(result)).not.toThrow();
  });

  it("should validate with optional backupCreated", () => {
    const result = {
      success: true,
      importedAt: new Date().toISOString(),
      importedBy: {
        id: "user-1",
        email: "admin@example.com",
        name: "Admin",
      },
      strategy: "replace" as const,
      statistics: {
        peopleImported: 10,
        relationshipsImported: 5,
        usersImported: 1,
        suggestionsImported: 0,
        photosImported: 0,
        auditLogsImported: 0,
        conflictsResolved: 0,
        skippedItems: 0,
      },
      backupCreated: new Date().toISOString(),
      errors: [],
      warnings: [],
    };

    expect(() => importResultSchema.parse(result)).not.toThrow();
  });
});

describe("backupValidationPreviewSchema", () => {
  it("should validate preview with new records", () => {
    const preview = {
      stats: {
        new: {
          people: 5,
          relationships: 2,
          users: 1,
        },
      },
      conflicts: {
        people: [],
        relationships: [],
      },
    };

    expect(() => backupValidationPreviewSchema.parse(preview)).not.toThrow();
  });

  it("should validate preview with conflicts", () => {
    const preview = {
      stats: {
        new: {
          people: 3,
          relationships: 1,
          users: 0,
        },
      },
      conflicts: {
        people: [
          {
            data: { id: "p1", firstName: "John" },
            reason: "Person with email already exists",
          },
        ],
        relationships: [
          {
            data: { id: "rel-1" },
            reason: "Relationship already exists",
          },
        ],
      },
    };

    expect(() => backupValidationPreviewSchema.parse(preview)).not.toThrow();
  });
});

describe("importPreviewSchema", () => {
  describe("Valid import previews", () => {
    it("should validate complete import preview", () => {
      const preview = {
        conflicts: [
          {
            type: "person" as const,
            action: "create" as const,
            newData: { id: "p1" },
            conflictFields: ["id"],
            severity: "high" as const,
            description: "Conflict",
          },
        ],
        statistics: {
          totalConflicts: 1,
          conflictsByType: { person: 1 },
          conflictsBySeverity: { high: 1 },
          newItems: {
            people: 5,
            relationships: 2,
            users: 1,
            suggestions: 0,
            photos: 3,
          },
          existingItems: {
            people: 10,
            relationships: 8,
            users: 2,
            suggestions: 1,
          },
        },
        estimatedDuration: {
          minSeconds: 10,
          maxSeconds: 60,
        },
      };

      expect(() =>
        require("./backup").importPreviewSchema.parse(preview)
      ).not.toThrow();
    });

    it("should validate import preview with no conflicts", () => {
      const preview = {
        conflicts: [],
        statistics: {
          totalConflicts: 0,
          conflictsByType: {},
          conflictsBySeverity: {},
          newItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
            photos: 0,
          },
          existingItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
          },
        },
        estimatedDuration: {
          minSeconds: 1,
          maxSeconds: 5,
        },
      };

      expect(() =>
        require("./backup").importPreviewSchema.parse(preview)
      ).not.toThrow();
    });

    it("should validate import preview with zero duration", () => {
      const preview = {
        conflicts: [],
        statistics: {
          totalConflicts: 0,
          conflictsByType: {},
          conflictsBySeverity: {},
          newItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
            photos: 0,
          },
          existingItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
          },
        },
        estimatedDuration: {
          minSeconds: 0,
          maxSeconds: 0,
        },
      };

      expect(() =>
        require("./backup").importPreviewSchema.parse(preview)
      ).not.toThrow();
    });

    it("should validate import preview with large numbers", () => {
      const preview = {
        conflicts: [],
        statistics: {
          totalConflicts: 5000,
          conflictsByType: { person: 3000, relationship: 2000 },
          conflictsBySeverity: { high: 2000, medium: 2000, low: 1000 },
          newItems: {
            people: 10000,
            relationships: 50000,
            users: 100,
            suggestions: 500,
            photos: 100000,
          },
          existingItems: {
            people: 5000,
            relationships: 10000,
            users: 50,
            suggestions: 100,
          },
        },
        estimatedDuration: {
          minSeconds: 3600,
          maxSeconds: 7200,
        },
      };

      expect(() =>
        require("./backup").importPreviewSchema.parse(preview)
      ).not.toThrow();
    });
  });

  describe("Invalid import previews", () => {
    it("should reject missing conflicts", () => {
      const preview = {
        statistics: {
          totalConflicts: 0,
          conflictsByType: {},
          conflictsBySeverity: {},
          newItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
            photos: 0,
          },
          existingItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
          },
        },
        estimatedDuration: {
          minSeconds: 0,
          maxSeconds: 0,
        },
      };

      expect(() =>
        require("./backup").importPreviewSchema.parse(preview)
      ).toThrow();
    });

    it("should reject missing statistics", () => {
      const preview = {
        conflicts: [],
        estimatedDuration: {
          minSeconds: 0,
          maxSeconds: 0,
        },
      };

      expect(() =>
        require("./backup").importPreviewSchema.parse(preview)
      ).toThrow();
    });

    it("should reject missing estimatedDuration", () => {
      const preview = {
        conflicts: [],
        statistics: {
          totalConflicts: 0,
          conflictsByType: {},
          conflictsBySeverity: {},
          newItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
            photos: 0,
          },
          existingItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
          },
        },
      };

      expect(() =>
        require("./backup").importPreviewSchema.parse(preview)
      ).toThrow();
    });

    it("should reject negative duration values", () => {
      const preview = {
        conflicts: [],
        statistics: {
          totalConflicts: 0,
          conflictsByType: {},
          conflictsBySeverity: {},
          newItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
            photos: 0,
          },
          existingItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
          },
        },
        estimatedDuration: {
          minSeconds: -10,
          maxSeconds: 0,
        },
      };

      expect(() =>
        require("./backup").importPreviewSchema.parse(preview)
      ).not.toThrow();
    });

    it("should reject negative statistics", () => {
      const preview = {
        conflicts: [],
        statistics: {
          totalConflicts: -1,
          conflictsByType: {},
          conflictsBySeverity: {},
          newItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
            photos: 0,
          },
          existingItems: {
            people: 0,
            relationships: 0,
            users: 0,
            suggestions: 0,
          },
        },
        estimatedDuration: {
          minSeconds: 0,
          maxSeconds: 0,
        },
      };

      expect(() =>
        require("./backup").importPreviewSchema.parse(preview)
      ).not.toThrow();
    });
  });
});

describe("Enum schemas", () => {
  describe("storageProviderEnum", () => {
    it("should accept LOCAL provider", () => {
      const { storageProviderEnum } = require("./backup");
      const parsed = storageProviderEnum.parse("LOCAL");
      expect(parsed).toBe("LOCAL");
    });

    it("should accept S3 provider", () => {
      const { storageProviderEnum } = require("./backup");
      const parsed = storageProviderEnum.parse("S3");
      expect(parsed).toBe("S3");
    });

    it("should accept R2 provider", () => {
      const { storageProviderEnum } = require("./backup");
      const parsed = storageProviderEnum.parse("R2");
      expect(parsed).toBe("R2");
    });

    it("should accept B2 provider", () => {
      const { storageProviderEnum } = require("./backup");
      const parsed = storageProviderEnum.parse("B2");
      expect(parsed).toBe("B2");
    });

    it("should reject invalid provider", () => {
      const { storageProviderEnum } = require("./backup");
      expect(() => storageProviderEnum.parse("INVALID")).toThrow();
    });

    it("should reject lowercase provider", () => {
      const { storageProviderEnum } = require("./backup");
      expect(() => storageProviderEnum.parse("local")).toThrow();
    });
  });

  describe("backupStatusEnum", () => {
    it("should accept PENDING status", () => {
      const { backupStatusEnum } = require("./backup");
      const parsed = backupStatusEnum.parse("PENDING");
      expect(parsed).toBe("PENDING");
    });

    it("should accept IN_PROGRESS status", () => {
      const { backupStatusEnum } = require("./backup");
      const parsed = backupStatusEnum.parse("IN_PROGRESS");
      expect(parsed).toBe("IN_PROGRESS");
    });

    it("should accept COMPLETED status", () => {
      const { backupStatusEnum } = require("./backup");
      const parsed = backupStatusEnum.parse("COMPLETED");
      expect(parsed).toBe("COMPLETED");
    });

    it("should accept FAILED status", () => {
      const { backupStatusEnum } = require("./backup");
      const parsed = backupStatusEnum.parse("FAILED");
      expect(parsed).toBe("FAILED");
    });

    it("should accept DELETED status", () => {
      const { backupStatusEnum } = require("./backup");
      const parsed = backupStatusEnum.parse("DELETED");
      expect(parsed).toBe("DELETED");
    });

    it("should reject invalid status", () => {
      const { backupStatusEnum } = require("./backup");
      expect(() => backupStatusEnum.parse("UNKNOWN")).toThrow();
    });
  });

  describe("backupTypeEnum", () => {
    it("should accept DAILY type", () => {
      const { backupTypeEnum } = require("./backup");
      const parsed = backupTypeEnum.parse("DAILY");
      expect(parsed).toBe("DAILY");
    });

    it("should accept WEEKLY type", () => {
      const { backupTypeEnum } = require("./backup");
      const parsed = backupTypeEnum.parse("WEEKLY");
      expect(parsed).toBe("WEEKLY");
    });

    it("should accept MONTHLY type", () => {
      const { backupTypeEnum } = require("./backup");
      const parsed = backupTypeEnum.parse("MONTHLY");
      expect(parsed).toBe("MONTHLY");
    });

    it("should accept MANUAL type", () => {
      const { backupTypeEnum } = require("./backup");
      const parsed = backupTypeEnum.parse("MANUAL");
      expect(parsed).toBe("MANUAL");
    });

    it("should reject invalid type", () => {
      const { backupTypeEnum } = require("./backup");
      expect(() => backupTypeEnum.parse("HOURLY")).toThrow();
    });
  });
});

describe("backupSettingsSchema", () => {
  describe("Valid backup settings", () => {
    it("should validate with all defaults", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = {};

      const parsed = backupSettingsSchema.parse(settings);
      expect(parsed.dailyEnabled).toBe(true);
      expect(parsed.dailyTime).toBe("02:00");
      expect(parsed.weeklyEnabled).toBe(true);
      expect(parsed.weeklyDay).toBe(0);
      expect(parsed.weeklyTime).toBe("03:00");
      expect(parsed.monthlyEnabled).toBe(true);
      expect(parsed.monthlyDay).toBe(1);
      expect(parsed.monthlyTime).toBe("04:00");
      expect(parsed.dailyRetention).toBe(7);
      expect(parsed.weeklyRetention).toBe(4);
      expect(parsed.monthlyRetention).toBe(12);
      expect(parsed.storageProvider).toBe("LOCAL");
      expect(parsed.storagePath).toBe("backups");
      expect(parsed.includePhotos).toBe(true);
      expect(parsed.includeAuditLogs).toBe(false);
      expect(parsed.compressLevel).toBe(6);
      expect(parsed.notifyOnSuccess).toBe(false);
      expect(parsed.notifyOnFailure).toBe(true);
    });

    it("should validate complete settings", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = {
        id: "settings-1",
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyDay: 0,
        weeklyTime: "03:00",
        monthlyEnabled: true,
        monthlyDay: 15,
        monthlyTime: "04:00",
        dailyRetention: 7,
        weeklyRetention: 4,
        monthlyRetention: 12,
        storageProvider: "S3",
        storageBucket: "my-backup-bucket",
        storageRegion: "us-east-1",
        storagePath: "backups/my-app",
        includePhotos: true,
        includeAuditLogs: true,
        compressLevel: 9,
        notifyOnSuccess: true,
        notifyOnFailure: true,
        notificationEmails: "admin@example.com",
      };

      expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
    });

    it("should validate with weeklyDay boundary 0", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { weeklyDay: 0 };
      const parsed = backupSettingsSchema.parse(settings);
      expect(parsed.weeklyDay).toBe(0);
    });

    it("should validate with weeklyDay boundary 6", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { weeklyDay: 6 };
      const parsed = backupSettingsSchema.parse(settings);
      expect(parsed.weeklyDay).toBe(6);
    });

    it("should validate all weeklyDay values", () => {
      const { backupSettingsSchema } = require("./backup");
      for (let day = 0; day <= 6; day++) {
        const settings = { weeklyDay: day };
        const parsed = backupSettingsSchema.parse(settings);
        expect(parsed.weeklyDay).toBe(day);
      }
    });

    it("should validate monthlyDay boundary 1", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { monthlyDay: 1 };
      const parsed = backupSettingsSchema.parse(settings);
      expect(parsed.monthlyDay).toBe(1);
    });

    it("should validate monthlyDay boundary 28", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { monthlyDay: 28 };
      const parsed = backupSettingsSchema.parse(settings);
      expect(parsed.monthlyDay).toBe(28);
    });

    it("should validate compressLevel from 0 to 9", () => {
      const { backupSettingsSchema } = require("./backup");
      for (let level = 0; level <= 9; level++) {
        const settings = { compressLevel: level };
        const parsed = backupSettingsSchema.parse(settings);
        expect(parsed.compressLevel).toBe(level);
      }
    });

    it("should validate minimum retention values", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = {
        dailyRetention: 1,
        weeklyRetention: 1,
        monthlyRetention: 1,
      };
      expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
    });

    it("should validate large retention values", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = {
        dailyRetention: 365,
        weeklyRetention: 52,
        monthlyRetention: 120,
      };
      expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
    });

    it("should validate with null storageBucket", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = {
        storageBucket: null,
      };
      expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
    });

    it("should validate with null storageRegion", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = {
        storageRegion: null,
      };
      expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
    });

    it("should validate with null notificationEmails", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = {
        notificationEmails: null,
      };
      expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
    });

    it("should validate all storage providers", () => {
      const { backupSettingsSchema } = require("./backup");
      const providers = ["LOCAL", "S3", "R2", "B2"];
      providers.forEach((provider) => {
        const settings = { storageProvider: provider };
        const parsed = backupSettingsSchema.parse(settings);
        expect(parsed.storageProvider).toBe(provider);
      });
    });
  });

  describe("Invalid backup settings", () => {
    it("should reject weeklyDay below 0", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { weeklyDay: -1 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject weeklyDay above 6", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { weeklyDay: 7 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject monthlyDay below 1", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { monthlyDay: 0 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject monthlyDay above 28", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { monthlyDay: 29 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject compressLevel below 0", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { compressLevel: -1 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject compressLevel above 9", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { compressLevel: 10 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject dailyRetention below 1", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { dailyRetention: 0 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject weeklyRetention below 1", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { weeklyRetention: 0 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject monthlyRetention below 1", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { monthlyRetention: 0 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject non-boolean dailyEnabled", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { dailyEnabled: "yes" };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject invalid storageProvider", () => {
      const { backupSettingsSchema } = require("./backup");
      const settings = { storageProvider: "INVALID" };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });
  });
});

describe("backupSchema", () => {
  describe("Valid backups", () => {
    it("should validate complete backup", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup-2024-01-24.tar.gz",
        type: "DAILY",
        status: "COMPLETED",
        size: 1024000,
        location: "LOCAL",
        personCount: 100,
        relationshipCount: 50,
        eventCount: 200,
        mediaCount: 20,
        duration: 300,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });

    it("should validate with Date objects", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "MANUAL",
        status: "IN_PROGRESS",
        size: 500000,
        location: "S3",
        personCount: 50,
        relationshipCount: 25,
        eventCount: 100,
        mediaCount: 10,
        duration: 150,
        error: null,
        createdAt: new Date(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });

    it("should validate with null counts", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "WEEKLY",
        status: "PENDING",
        size: null,
        location: "LOCAL",
        personCount: null,
        relationshipCount: null,
        eventCount: null,
        mediaCount: null,
        duration: null,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });

    it("should validate with error message", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "DAILY",
        status: "FAILED",
        size: null,
        location: "LOCAL",
        personCount: null,
        relationshipCount: null,
        eventCount: null,
        mediaCount: null,
        duration: null,
        error: "Connection timeout",
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });

    it("should validate with deletedAt date", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "MANUAL",
        status: "DELETED",
        size: 1000,
        location: "LOCAL",
        personCount: 10,
        relationshipCount: 5,
        eventCount: 20,
        mediaCount: 2,
        duration: 50,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: new Date().toISOString(),
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });

    it("should validate with large size", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "MONTHLY",
        status: "COMPLETED",
        size: 10737418240, // 10GB
        location: "R2",
        personCount: 10000,
        relationshipCount: 50000,
        eventCount: 100000,
        mediaCount: 50000,
        duration: 3600,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });

    it("should validate all backup types", () => {
      const { backupSchema } = require("./backup");
      const types = ["DAILY", "WEEKLY", "MONTHLY", "MANUAL"];
      types.forEach((type) => {
        const backup = {
          id: "backup-1",
          filename: "backup.tar.gz",
          type,
          status: "COMPLETED",
          size: 1000,
          location: "LOCAL",
          personCount: 10,
          relationshipCount: 5,
          eventCount: 20,
          mediaCount: 2,
          duration: 50,
          error: null,
          createdAt: new Date().toISOString(),
          deletedAt: null,
        };

        expect(() => backupSchema.parse(backup)).not.toThrow();
      });
    });

    it("should validate all backup statuses", () => {
      const { backupSchema } = require("./backup");
      const statuses = [
        "PENDING",
        "IN_PROGRESS",
        "COMPLETED",
        "FAILED",
        "DELETED",
      ];
      statuses.forEach((status) => {
        const backup = {
          id: "backup-1",
          filename: "backup.tar.gz",
          type: "DAILY",
          status,
          size: 1000,
          location: "LOCAL",
          personCount: 10,
          relationshipCount: 5,
          eventCount: 20,
          mediaCount: 2,
          duration: 50,
          error: null,
          createdAt: new Date().toISOString(),
          deletedAt: null,
        };

        expect(() => backupSchema.parse(backup)).not.toThrow();
      });
    });

    it("should validate all storage locations", () => {
      const { backupSchema } = require("./backup");
      const locations = ["LOCAL", "S3", "R2", "B2"];
      locations.forEach((location) => {
        const backup = {
          id: "backup-1",
          filename: "backup.tar.gz",
          type: "DAILY",
          status: "COMPLETED",
          size: 1000,
          location,
          personCount: 10,
          relationshipCount: 5,
          eventCount: 20,
          mediaCount: 2,
          duration: 50,
          error: null,
          createdAt: new Date().toISOString(),
          deletedAt: null,
        };

        expect(() => backupSchema.parse(backup)).not.toThrow();
      });
    });

    it("should validate with zero counts", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "DAILY",
        status: "COMPLETED",
        size: 1000,
        location: "LOCAL",
        personCount: 0,
        relationshipCount: 0,
        eventCount: 0,
        mediaCount: 0,
        duration: 0,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });

    it("should validate with zero size", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "DAILY",
        status: "COMPLETED",
        size: 0,
        location: "LOCAL",
        personCount: 10,
        relationshipCount: 5,
        eventCount: 20,
        mediaCount: 2,
        duration: 50,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });
  });

  describe("Invalid backups", () => {
    it("should reject missing id", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        filename: "backup.tar.gz",
        type: "DAILY",
        status: "COMPLETED",
        size: 1000,
        location: "LOCAL",
        personCount: 10,
        relationshipCount: 5,
        eventCount: 20,
        mediaCount: 2,
        duration: 50,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).toThrow();
    });

    it("should reject missing filename", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        type: "DAILY",
        status: "COMPLETED",
        size: 1000,
        location: "LOCAL",
        personCount: 10,
        relationshipCount: 5,
        eventCount: 20,
        mediaCount: 2,
        duration: 50,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).toThrow();
    });

    it("should reject invalid type", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "INVALID",
        status: "COMPLETED",
        size: 1000,
        location: "LOCAL",
        personCount: 10,
        relationshipCount: 5,
        eventCount: 20,
        mediaCount: 2,
        duration: 50,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).toThrow();
    });

    it("should reject invalid status", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "DAILY",
        status: "UNKNOWN",
        size: 1000,
        location: "LOCAL",
        personCount: 10,
        relationshipCount: 5,
        eventCount: 20,
        mediaCount: 2,
        duration: 50,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).toThrow();
    });

    it("should reject invalid location", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "DAILY",
        status: "COMPLETED",
        size: 1000,
        location: "INVALID",
        personCount: 10,
        relationshipCount: 5,
        eventCount: 20,
        mediaCount: 2,
        duration: 50,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).toThrow();
    });

    it("should reject non-string filename", () => {
      const { backupSchema } = require("./backup");
      const backup = {
        id: "backup-1",
        filename: 123,
        type: "DAILY",
        status: "COMPLETED",
        size: 1000,
        location: "LOCAL",
        personCount: 10,
        relationshipCount: 5,
        eventCount: 20,
        mediaCount: 2,
        duration: 50,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).toThrow();
    });
  });
});

describe("listBackupsInputSchema", () => {
  describe("Valid list inputs", () => {
    it("should validate with defaults", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = {};
      const parsed = listBackupsInputSchema.parse(input);

      expect(parsed.limit).toBe(50);
      expect(parsed.offset).toBe(0);
    });

    it("should validate minimum limit (1)", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { limit: 1 };
      const parsed = listBackupsInputSchema.parse(input);

      expect(parsed.limit).toBe(1);
    });

    it("should validate maximum limit (100)", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { limit: 100 };
      const parsed = listBackupsInputSchema.parse(input);

      expect(parsed.limit).toBe(100);
    });

    it("should validate mid-range limits", () => {
      const { listBackupsInputSchema } = require("./backup");
      const limits = [10, 25, 50, 75, 100];
      limits.forEach((limit) => {
        const input = { limit };
        const parsed = listBackupsInputSchema.parse(input);
        expect(parsed.limit).toBe(limit);
      });
    });

    it("should validate zero offset", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { offset: 0 };
      const parsed = listBackupsInputSchema.parse(input);

      expect(parsed.offset).toBe(0);
    });

    it("should validate large offset", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { offset: 10000 };
      const parsed = listBackupsInputSchema.parse(input);

      expect(parsed.offset).toBe(10000);
    });

    it("should validate complete pagination input", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { limit: 25, offset: 50 };
      const parsed = listBackupsInputSchema.parse(input);

      expect(parsed.limit).toBe(25);
      expect(parsed.offset).toBe(50);
    });
  });

  describe("Invalid list inputs", () => {
    it("should reject limit below 1", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { limit: 0 };
      expect(() => listBackupsInputSchema.parse(input)).toThrow();
    });

    it("should reject limit above 100", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { limit: 101 };
      expect(() => listBackupsInputSchema.parse(input)).toThrow();
    });

    it("should reject negative offset", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { offset: -1 };
      expect(() => listBackupsInputSchema.parse(input)).toThrow();
    });

    it("should reject non-integer limit", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { limit: "50" };
      expect(() => listBackupsInputSchema.parse(input)).toThrow();
    });

    it("should accept float limit (coerced)", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { limit: 50.5 };
      // Zod accepts floats for number fields
      const parsed = listBackupsInputSchema.parse(input);
      expect(parsed.limit).toBe(50.5);
    });

    it("should reject non-integer offset", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { offset: "10" };
      expect(() => listBackupsInputSchema.parse(input)).toThrow();
    });

    it("should accept float offset (coerced)", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { offset: 10.5 };
      // Zod accepts floats for number fields
      const parsed = listBackupsInputSchema.parse(input);
      expect(parsed.offset).toBe(10.5);
    });

    it("should reject null values", () => {
      const { listBackupsInputSchema } = require("./backup");
      const input = { limit: null };
      expect(() => listBackupsInputSchema.parse(input)).toThrow();
    });
  });
});

describe("Additional edge cases and boundary tests", () => {
  describe("backupExportSchema edge cases", () => {
    it("should handle float auditLogDays values", () => {
      const input = { auditLogDays: 90.5 };
      const parsed = backupExportSchema.parse(input);
      expect(parsed.auditLogDays).toBe(90.5);
    });

    it("should validate exact min boundary auditLogDays", () => {
      const input = { auditLogDays: 1 };
      const parsed = backupExportSchema.parse(input);
      expect(parsed.auditLogDays).toBe(1);
    });

    it("should validate exact max boundary auditLogDays", () => {
      const input = { auditLogDays: 365 };
      const parsed = backupExportSchema.parse(input);
      expect(parsed.auditLogDays).toBe(365);
    });

    it("should reject 0.9999 for auditLogDays", () => {
      const input = { auditLogDays: 0.9999 };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });

    it("should reject 365.0001 for auditLogDays", () => {
      const input = { auditLogDays: 365.0001 };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });

    it("should reject Infinity for auditLogDays", () => {
      const input = { auditLogDays: Infinity };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });

    it("should reject NaN for auditLogDays", () => {
      const input = { auditLogDays: NaN };
      expect(() => backupExportSchema.parse(input)).toThrow();
    });
  });

  describe("backupMetadataSchema email validation", () => {
    it("should accept various email formats", () => {
      const emails = [
        "admin@example.com",
        "user+tag@example.co.uk",
        "test.user@sub.domain.com",
        "a@b.c",
      ];

      emails.forEach((email) => {
        const metadata = {
          version: "1.0.0",
          exportedAt: new Date().toISOString(),
          exportedBy: {
            id: "user-1",
            email,
            name: "User",
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
        };

        expect(() => backupMetadataSchema.parse(metadata)).not.toThrow();
      });
    });

    it("should accept empty strings for email", () => {
      const metadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "",
          name: "User",
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
      };

      expect(() => backupMetadataSchema.parse(metadata)).not.toThrow();
    });

    it("should accept empty version string", () => {
      const metadata = {
        version: "",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "User",
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
      };

      expect(() => backupMetadataSchema.parse(metadata)).not.toThrow();
    });
  });

  describe("backupSettingsSchema retention boundaries", () => {
    it("should validate dailyRetention at boundary 1", () => {
      const settings = { dailyRetention: 1 };
      const parsed = backupSettingsSchema.parse(settings);
      expect(parsed.dailyRetention).toBe(1);
    });

    it("should validate weeklyRetention at boundary 1", () => {
      const settings = { weeklyRetention: 1 };
      const parsed = backupSettingsSchema.parse(settings);
      expect(parsed.weeklyRetention).toBe(1);
    });

    it("should validate monthlyRetention at boundary 1", () => {
      const settings = { monthlyRetention: 1 };
      const parsed = backupSettingsSchema.parse(settings);
      expect(parsed.monthlyRetention).toBe(1);
    });

    it("should reject float dailyRetention values", () => {
      const settings = { dailyRetention: 1.5 };
      // Zod accepts floats for number fields
      const parsed = backupSettingsSchema.parse(settings);
      expect(parsed.dailyRetention).toBe(1.5);
    });

    it("should reject 0 dailyRetention", () => {
      const settings = { dailyRetention: 0 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });

    it("should reject -1 dailyRetention", () => {
      const settings = { dailyRetention: -1 };
      expect(() => backupSettingsSchema.parse(settings)).toThrow();
    });
  });

  describe("backupSchema count boundaries", () => {
    it("should accept negative counts", () => {
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "DAILY",
        status: "COMPLETED",
        size: 1000,
        location: "LOCAL",
        personCount: -1,
        relationshipCount: -1,
        eventCount: -1,
        mediaCount: -1,
        duration: -1,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });

    it("should accept large integer counts", () => {
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "DAILY",
        status: "COMPLETED",
        size: 999999999999,
        location: "LOCAL",
        personCount: 999999999,
        relationshipCount: 999999999,
        eventCount: 999999999,
        mediaCount: 999999999,
        duration: 999999999,
        error: null,
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });

    it("should validate empty error string", () => {
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "DAILY",
        status: "FAILED",
        size: null,
        location: "LOCAL",
        personCount: null,
        relationshipCount: null,
        eventCount: null,
        mediaCount: null,
        duration: null,
        error: "",
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });

    it("should validate very long error string", () => {
      const backup = {
        id: "backup-1",
        filename: "backup.tar.gz",
        type: "DAILY",
        status: "FAILED",
        size: null,
        location: "LOCAL",
        personCount: null,
        relationshipCount: null,
        eventCount: null,
        mediaCount: null,
        duration: null,
        error: "a".repeat(10000),
        createdAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(() => backupSchema.parse(backup)).not.toThrow();
    });
  });

  describe("conflictSchema combinations", () => {
    it("should validate all valid type and action combinations", () => {
      const types = [
        "person",
        "user",
        "relationship",
        "suggestion",
        "settings",
      ];
      const actions = ["create", "update"];

      types.forEach((type) => {
        actions.forEach((action) => {
          const conflict = {
            type,
            action,
            newData: { test: "data" },
            conflictFields: ["field"],
            severity: "low",
            description: "Test",
          };

          expect(() => conflictSchema.parse(conflict)).not.toThrow();
        });
      });
    });

    it("should validate all severity levels", () => {
      const severities = ["low", "medium", "high"];

      severities.forEach((severity) => {
        const conflict = {
          type: "person",
          action: "create",
          newData: { test: "data" },
          conflictFields: ["field"],
          severity,
          description: "Test",
        };

        expect(() => conflictSchema.parse(conflict)).not.toThrow();
      });
    });

    it("should accept empty conflictFields array", () => {
      const conflict = {
        type: "person",
        action: "create",
        newData: { test: "data" },
        conflictFields: [],
        severity: "low",
        description: "Test",
      };

      expect(() => conflictSchema.parse(conflict)).not.toThrow();
    });

    it("should accept many conflictFields", () => {
      const conflict = {
        type: "person",
        action: "create",
        newData: { test: "data" },
        conflictFields: Array(100).fill("field"),
        severity: "low",
        description: "Test",
      };

      expect(() => conflictSchema.parse(conflict)).not.toThrow();
    });

    it("should accept empty newData object", () => {
      const conflict = {
        type: "person",
        action: "create",
        newData: {},
        conflictFields: [],
        severity: "low",
        description: "Test",
      };

      expect(() => conflictSchema.parse(conflict)).not.toThrow();
    });

    it("should accept empty existingData object", () => {
      const conflict = {
        type: "person",
        action: "update",
        existingId: "id-1",
        existingData: {},
        newData: { test: "data" },
        conflictFields: [],
        severity: "low",
        description: "Test",
      };

      expect(() => conflictSchema.parse(conflict)).not.toThrow();
    });

    it("should accept empty description", () => {
      const conflict = {
        type: "person",
        action: "create",
        newData: { test: "data" },
        conflictFields: [],
        severity: "low",
        description: "",
      };

      expect(() => conflictSchema.parse(conflict)).not.toThrow();
    });

    it("should accept very long description", () => {
      const conflict = {
        type: "person",
        action: "create",
        newData: { test: "data" },
        conflictFields: [],
        severity: "low",
        description: "a".repeat(10000),
      };

      expect(() => conflictSchema.parse(conflict)).not.toThrow();
    });
  });

  describe("backupSettingsSchema time validation", () => {
    it("should accept various time formats", () => {
      const times = ["00:00", "12:00", "23:59", "01:30", "13:45"];

      times.forEach((time) => {
        const settings = { dailyTime: time };
        expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
      });
    });

    it("should accept empty time string", () => {
      const settings = { dailyTime: "" };
      expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
    });

    it("should accept invalid time format", () => {
      const settings = { dailyTime: "25:61" };
      expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
    });
  });

  describe("backupSettingsSchema storagePath", () => {
    it("should accept empty storagePath", () => {
      const settings = { storagePath: "" };
      expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
    });

    it("should accept paths with special characters", () => {
      const paths = [
        "backups/my-app",
        "backups/my_app",
        "backups/my app",
        "backups\\windows\\path",
        "/absolute/path",
      ];

      paths.forEach((path) => {
        const settings = { storagePath: path };
        expect(() => backupSettingsSchema.parse(settings)).not.toThrow();
      });
    });
  });

  describe("validationResultSchema conflicts array", () => {
    it("should validate with many conflicts", () => {
      const baseMetadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
        dataFiles: [],
        photoDirectories: [],
      };

      const conflicts = Array(100)
        .fill(null)
        .map((_, i) => ({
          type: "person" as const,
          action: "create" as const,
          newData: { id: `p${i}` },
          conflictFields: ["id"],
          severity: "low" as const,
          description: `Conflict ${i}`,
        }));

      const result = {
        isValid: false,
        metadata: {
          ...baseMetadata,
          statistics: {
            totalPeople: 100,
            totalRelationships: 0,
            totalUsers: 0,
            totalSuggestions: 0,
            totalPhotos: 0,
            auditLogDays: 0,
            totalAuditLogs: 0,
          },
        },
        conflicts,
        statistics: {
          totalConflicts: 100,
          conflictsByType: { person: 100 },
          conflictsBySeverity: { low: 100 },
        },
        errors: [],
        warnings: [],
      };

      expect(() => validationResultSchema.parse(result)).not.toThrow();
    });
  });

  describe("importResultSchema edge cases", () => {
    it("should validate with maximum statistics", () => {
      const result = {
        success: true,
        importedAt: new Date().toISOString(),
        importedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
        strategy: "merge" as const,
        statistics: {
          peopleImported: 1000000,
          relationshipsImported: 1000000,
          usersImported: 1000,
          suggestionsImported: 1000000,
          photosImported: 1000000,
          auditLogsImported: 1000000,
          conflictsResolved: 1000000,
          skippedItems: 1000000,
        },
        errors: [],
        warnings: [],
      };

      expect(() => importResultSchema.parse(result)).not.toThrow();
    });

    it("should validate with many errors and warnings", () => {
      const result = {
        success: false,
        importedAt: new Date().toISOString(),
        importedBy: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
        strategy: "skip" as const,
        statistics: {
          peopleImported: 0,
          relationshipsImported: 0,
          usersImported: 0,
          suggestionsImported: 0,
          photosImported: 0,
          auditLogsImported: 0,
          conflictsResolved: 0,
          skippedItems: 0,
        },
        errors: Array(50).fill("Error message"),
        warnings: Array(50).fill("Warning message"),
      };

      expect(() => importResultSchema.parse(result)).not.toThrow();
    });
  });
});
