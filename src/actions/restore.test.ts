import { describe, it, expect } from "bun:test";
import {
  validateBackupCore,
  importBackupCore,
  getImportHistoryCore,
} from "./restore";
import type { RestoreDependencies, AuthSession } from "@/lib/backup/types";
import type { ValidationResult } from "@/schemas/backup";

// Create mock session
const createMockSession = (): AuthSession => ({
  id: "admin-123",
  email: "admin@example.com",
  name: "Admin User",
  role: "ADMIN",
  personId: null,
  mustChangePassword: false,
});

// Create mock dependencies for testing
function createMockDependencies(
  overrides: Partial<RestoreDependencies> = {}
): RestoreDependencies {
  const mockSession = createMockSession();

  return {
    requireAdmin: async () => mockSession,
    db: {
      $transaction: async (callback: any) =>
        callback({
          auditLog: {
            create: async () => ({}),
          },
        }),
      auditLog: {
        create: async () => ({}),
        findMany: async () => [],
      },
      person: {
        findUnique: async () => null,
        update: async () => ({}),
      },
    } as any,
    getStorageAdapter: () => ({
      upload: async () => "photos/test.jpg",
      getUrl: () => "https://example.com/photos/test.jpg",
      delete: async () => {},
    }),
    createValidator: () => ({
      validate: async (): Promise<ValidationResult> => ({
        isValid: true,
        metadata: {
          version: "1.0.0",
          exportedAt: "2024-01-01T12:00:00.000Z",
          exportedBy: { id: "admin", email: "admin@example.com", name: "Admin" },
          statistics: {
            totalPeople: 5,
            totalRelationships: 3,
            totalUsers: 2,
            totalSuggestions: 0,
            totalPhotos: 1,
            auditLogDays: 90,
            totalAuditLogs: 10,
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
      }),
      getExtractedFiles: () => new Map(),
    }),
    createConflictResolver: () => ({
      importData: async () => ({
        statistics: {
          peopleImported: 5,
          relationshipsImported: 3,
          usersImported: 2,
          suggestionsImported: 0,
          photosImported: 0,
          auditLogsImported: 0,
          conflictsResolved: 0,
          skippedItems: 0,
        },
        errors: [],
        warnings: [],
      }),
    }),
    gatherBackupData: async () => ({
      metadata: {},
      data: {
        people: [],
        relationships: [],
        users: [],
        suggestions: [],
        settings: null,
      },
      photos: [],
    }),
    ...overrides,
  };
}

describe("validateBackupCore", () => {
  it("should require admin authentication", async () => {
    const deps = createMockDependencies({
      requireAdmin: async () => {
        throw new Error("Unauthorized");
      },
    });

    const formData = new FormData();
    const testFile = new File(["test"], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", testFile);

    await expect(validateBackupCore(formData, deps)).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("should validate file presence", async () => {
    const deps = createMockDependencies();
    const formData = new FormData();

    await expect(validateBackupCore(formData, deps)).rejects.toThrow(
      "No file provided"
    );
  });

  it("should validate file size", async () => {
    const deps = createMockDependencies();
    const formData = new FormData();
    // Create a large file (over 100MB)
    const largeContent = "x".repeat(101 * 1024 * 1024);
    const largeFile = new File([largeContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", largeFile);

    await expect(validateBackupCore(formData, deps)).rejects.toThrow(
      "File size exceeds 100MB limit"
    );
  });

  it("should validate file type", async () => {
    const deps = createMockDependencies();
    const formData = new FormData();
    const invalidFile = new File(["test"], "backup.txt", {
      type: "text/plain",
    });
    formData.append("file", invalidFile);

    await expect(validateBackupCore(formData, deps)).rejects.toThrow(
      "File must be a ZIP archive"
    );
  });

  it("should validate backup successfully", async () => {
    const mockValidationResult: ValidationResult = {
      isValid: true,
      metadata: {
        version: "1.0.0",
        exportedAt: "2024-01-01T12:00:00.000Z",
        exportedBy: { id: "admin", email: "admin@example.com", name: "Admin" },
        statistics: {
          totalPeople: 5,
          totalRelationships: 3,
          totalUsers: 2,
          totalSuggestions: 0,
          totalPhotos: 1,
          auditLogDays: 90,
          totalAuditLogs: 10,
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

    const deps = createMockDependencies({
      createValidator: () => ({
        validate: async () => mockValidationResult,
        getExtractedFiles: () => new Map(),
        }),
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await validateBackupCore(formData, deps);

    expect(result).toEqual(mockValidationResult);
  });

  it("should handle validation errors", async () => {
    const deps = createMockDependencies({
      createValidator: () => ({
        validate: async () => {
          throw new Error("Invalid ZIP structure");
        },
        getExtractedFiles: () => new Map(),
        }),
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    await expect(validateBackupCore(formData, deps)).rejects.toThrow(
      "Validation failed: Invalid ZIP structure"
    );
  });
});

describe("importBackupCore", () => {
  const defaultOptions = {
    createBackupBeforeImport: false,
    importPhotos: false,
    importAuditLogs: false,
  };

  it("should require admin authentication", async () => {
    const deps = createMockDependencies({
      requireAdmin: async () => {
        throw new Error("Unauthorized");
      },
    });

    const formData = new FormData();
    const testFile = new File(["test"], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", testFile);

    await expect(
      importBackupCore(formData, "skip", defaultOptions, deps)
    ).rejects.toThrow("Unauthorized");
  });

  it("should validate file presence", async () => {
    const deps = createMockDependencies();
    const formData = new FormData();

    await expect(
      importBackupCore(formData, "skip", defaultOptions, deps)
    ).rejects.toThrow("No file provided");
  });

  it("should validate backup before import", async () => {
    const deps = createMockDependencies({
      createValidator: () => ({
        validate: async (): Promise<ValidationResult> => ({
          isValid: false,
          metadata: {} as any,
          conflicts: [],
          statistics: {
            totalConflicts: 0,
            conflictsByType: {},
            conflictsBySeverity: {},
          },
          errors: ["Invalid backup format"],
          warnings: [],
        }),
        getExtractedFiles: () => new Map(),
        }),
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    await expect(
      importBackupCore(formData, "skip", defaultOptions, deps)
    ).rejects.toThrow("Invalid backup: Invalid backup format");
  });

  it("should import backup successfully with skip strategy", async () => {
    const deps = createMockDependencies();

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(formData, "skip", defaultOptions, deps);

    expect(result).toMatchObject({
      success: true,
      importedAt: expect.any(String),
      importedBy: {
        id: "admin-123",
        email: "admin@example.com",
        name: "Admin User",
      },
      strategy: "skip",
      statistics: {
        peopleImported: 5,
        relationshipsImported: 3,
        usersImported: 2,
        suggestionsImported: 0,
        photosImported: 0,
        auditLogsImported: 0,
        conflictsResolved: 0,
        skippedItems: 0,
      },
      errors: [],
      warnings: [],
    });
  });
});

describe("getImportHistoryCore", () => {
  it("should require admin authentication", async () => {
    const deps = createMockDependencies({
      requireAdmin: async () => {
        throw new Error("Unauthorized");
      },
    });

    await expect(getImportHistoryCore(deps)).rejects.toThrow("Unauthorized");
  });

  it("should return import history", async () => {
    const mockAuditLogs = [
      {
        id: "audit-1",
        createdAt: new Date("2024-01-01T12:00:00.000Z"),
        entityType: "BACKUP_IMPORT",
        newData: {
          strategy: "replace",
          statistics: { peopleImported: 5 },
        },
        user: {
          email: "admin@example.com",
          name: "Admin User",
        },
      },
      {
        id: "audit-2",
        createdAt: new Date("2024-01-02T12:00:00.000Z"),
        entityType: "BACKUP_IMPORT_FAILED",
        newData: {
          error: "Invalid backup format",
        },
        user: {
          email: "admin@example.com",
          name: null,
        },
      },
    ];

    const deps = createMockDependencies({
      db: {
        auditLog: {
          findMany: async () => mockAuditLogs,
        },
      } as any,
    });

    const result = await getImportHistoryCore(deps);

    expect(result).toEqual([
      {
        id: "audit-1",
        importedAt: "2024-01-01T12:00:00.000Z",
        importedBy: "Admin User",
        strategy: "replace",
        statistics: { peopleImported: 5 },
        success: true,
      },
      {
        id: "audit-2",
        importedAt: "2024-01-02T12:00:00.000Z",
        importedBy: "admin@example.com",
        strategy: "unknown",
        statistics: {},
        success: false,
      },
    ]);
  });

  it("should handle empty history", async () => {
    const deps = createMockDependencies({
      db: {
        auditLog: {
          findMany: async () => [],
        },
      } as any,
    });

    const result = await getImportHistoryCore(deps);

    expect(result).toEqual([]);
  });
});
