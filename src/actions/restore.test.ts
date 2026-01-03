import { describe, it, expect } from "bun:test";
import {
  validateBackupCore,
  importBackupCore,
  getImportHistoryCore,
  importPhotosCore,
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
      metadata: {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: { id: "admin-123", email: "admin@example.com", name: "Admin User" },
        statistics: {
          totalPeople: 0,
          totalRelationships: 0,
          totalUsers: 0,
          totalSuggestions: 0,
          totalPhotos: 0,
          auditLogDays: 90,
          totalAuditLogs: 0,
        },
        dataFiles: ["data/people.json"],
        photoDirectories: [],
      },
      data: {
        people: [],
        relationships: [],
        users: [],
        suggestions: [],
        settings: null,
        auditLogs: [],
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

  it("should create backup before import when requested", async () => {
    let gatherBackupDataCalled = false;
    const deps = createMockDependencies({
      gatherBackupData: async () => {
        gatherBackupDataCalled = true;
        return {
          metadata: {
            version: "1.0.0",
            exportedAt: new Date().toISOString(),
            exportedBy: { id: "admin-123", email: "admin@example.com", name: "Admin User" },
            statistics: {
              totalPeople: 0,
              totalRelationships: 0,
              totalUsers: 0,
              totalSuggestions: 0,
              totalPhotos: 0,
              auditLogDays: 90,
              totalAuditLogs: 0,
            },
            dataFiles: ["data/people.json"],
            photoDirectories: [],
          },
          data: {
            people: [],
            relationships: [],
            users: [],
            suggestions: [],
            settings: null,
          },
          photos: [],
        };
      },
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(
      formData,
      "skip",
      { createBackupBeforeImport: true, importPhotos: false, importAuditLogs: false },
      deps
    );

    expect(result.success).toBe(true);
    expect(gatherBackupDataCalled).toBe(true);
    expect(result.backupCreated).toBeDefined();
  });

  it("should handle import with different strategies", async () => {
    const deps = createMockDependencies();

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const resultReplace = await importBackupCore(formData, "replace", defaultOptions, deps);
    expect(resultReplace.strategy).toBe("replace");

    const formData2 = new FormData();
    formData2.append("file", validFile);
    const resultMerge = await importBackupCore(formData2, "merge", defaultOptions, deps);
    expect(resultMerge.strategy).toBe("merge");
  });

  it("should handle import with photo import enabled", async () => {
    const deps = createMockDependencies();

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(
      formData,
      "skip",
      { createBackupBeforeImport: false, importPhotos: true, importAuditLogs: false },
      deps
    );

    expect(result.success).toBe(true);
    expect(result.statistics.photosImported).toBe(0);
  });

  it("should call transaction callback with extracted files", async () => {
    let transactionCallbackExecuted = false;
    const deps = createMockDependencies({
      db: {
        $transaction: async (callback: any) => {
          transactionCallbackExecuted = true;
          return callback({
            auditLog: {
              create: async () => ({}),
            },
          });
        },
        auditLog: {
          create: async () => ({}),
          findMany: async () => [],
        },
        person: {
          findUnique: async () => null,
          update: async () => ({}),
        },
      } as any,
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(formData, "skip", defaultOptions, deps);

    expect(transactionCallbackExecuted).toBe(true);
    expect(result.success).toBe(true);
  });

  it("should create audit log entry for successful import", async () => {
    let auditLogCreated = false;
    const deps = createMockDependencies({
      db: {
        $transaction: async (callback: any) =>
          callback({
            auditLog: {
              create: async () => {
                auditLogCreated = true;
                return {};
              },
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
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(formData, "skip", defaultOptions, deps);

    expect(auditLogCreated).toBe(true);
    expect(result.success).toBe(true);
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

  it("should use email when name is null", async () => {
    const mockAuditLogs = [
      {
        id: "audit-1",
        createdAt: new Date("2024-01-01T12:00:00.000Z"),
        entityType: "BACKUP_IMPORT",
        newData: {
          strategy: "skip",
          statistics: {},
        },
        user: {
          email: "user@example.com",
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

    expect(result[0].importedBy).toBe("user@example.com");
  });

  it("should parse statistics from newData correctly", async () => {
    const mockAuditLogs = [
      {
        id: "audit-1",
        createdAt: new Date("2024-01-01T12:00:00.000Z"),
        entityType: "BACKUP_IMPORT",
        newData: {
          strategy: "merge",
          statistics: {
            peopleImported: 10,
            relationshipsImported: 5,
            photosImported: 3,
          },
        },
        user: {
          email: "admin@example.com",
          name: "Admin",
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

    expect(result[0].statistics).toEqual({
      peopleImported: 10,
      relationshipsImported: 5,
      photosImported: 3,
    });
  });

  it("should handle missing statistics in newData", async () => {
    const mockAuditLogs = [
      {
        id: "audit-1",
        createdAt: new Date("2024-01-01T12:00:00.000Z"),
        entityType: "BACKUP_IMPORT",
        newData: {
          strategy: "skip",
        },
        user: {
          email: "admin@example.com",
          name: "Admin",
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

    expect(result[0].statistics).toEqual({});
  });

  it("should distinguish between BACKUP_IMPORT and BACKUP_IMPORT_FAILED", async () => {
    const mockAuditLogs = [
      {
        id: "audit-1",
        createdAt: new Date("2024-01-01T12:00:00.000Z"),
        entityType: "BACKUP_IMPORT",
        newData: {
          strategy: "skip",
          statistics: {},
        },
        user: {
          email: "admin@example.com",
          name: "Admin",
        },
      },
      {
        id: "audit-2",
        createdAt: new Date("2024-01-02T12:00:00.000Z"),
        entityType: "BACKUP_IMPORT_FAILED",
        newData: {
          strategy: "skip",
          statistics: {},
          error: "Test error",
        },
        user: {
          email: "admin@example.com",
          name: "Admin",
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

    expect(result[0].success).toBe(true);
    expect(result[1].success).toBe(false);
  });
});

describe("importBackupCore - pre-import backup and photo import", () => {
  const defaultOptions = {
    createBackupBeforeImport: false,
    importPhotos: false,
    importAuditLogs: false,
  };

  it("should handle error creating pre-import backup gracefully", async () => {
    const deps = createMockDependencies({
      gatherBackupData: async () => {
        throw new Error("Database error");
      },
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    await expect(
      importBackupCore(
        formData,
        "skip",
        { ...defaultOptions, createBackupBeforeImport: true },
        deps
      )
    ).rejects.toThrow("Import failed");
  });

  it("should pass correct options to gatherBackupData", async () => {
    let capturedOptions: any = null;
    const deps = createMockDependencies({
      gatherBackupData: async (options: any) => {
        capturedOptions = options;
        return {
          metadata: {
            version: "1.0.0",
            exportedAt: new Date().toISOString(),
            exportedBy: { id: "admin-123", email: "admin@example.com", name: "Admin User" },
            statistics: {
              totalPeople: 0,
              totalRelationships: 0,
              totalUsers: 0,
              totalSuggestions: 0,
              totalPhotos: 0,
              auditLogDays: 90,
              totalAuditLogs: 0,
            },
            dataFiles: ["data/people.json"],
            photoDirectories: [],
          },
          data: {
            people: [],
            relationships: [],
            users: [],
            suggestions: [],
            settings: null,
          },
          photos: [],
        };
      },
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(
      formData,
      "skip",
      { ...defaultOptions, createBackupBeforeImport: true },
      deps
    );

    expect(result.success).toBe(true);
    expect(capturedOptions).toEqual({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });
  });

  it("should include backupCreated in result when backup is created", async () => {
    const deps = createMockDependencies();

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(
      formData,
      "skip",
      { ...defaultOptions, createBackupBeforeImport: true },
      deps
    );

    expect(result.backupCreated).toBeDefined();
    expect(typeof result.backupCreated).toBe("string");
  });

  it("should log failed import with error details", async () => {
    let failedImportLogged = false;
    const deps = createMockDependencies({
      createValidator: () => ({
        validate: async (): Promise<ValidationResult> => ({
          isValid: true,
          metadata: {} as any,
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
        importData: async () => {
          throw new Error("Import failed");
        },
      }),
      db: {
        $transaction: async (_callback: any) => {
          throw new Error("Transaction error");
        },
        auditLog: {
          create: async () => {
            failedImportLogged = true;
            return {};
          },
          findMany: async () => [],
        },
        person: {
          findUnique: async () => null,
          update: async () => ({}),
        },
      } as any,
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    await expect(
      importBackupCore(formData, "skip", defaultOptions, deps)
    ).rejects.toThrow("Import failed");

    expect(failedImportLogged).toBe(true);
  });

  it("should handle import with mixed options", async () => {
    const deps = createMockDependencies();

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(
      formData,
      "merge",
      {
        createBackupBeforeImport: true,
        importPhotos: true,
        importAuditLogs: true,
      },
      deps
    );

    expect(result.success).toBe(true);
    expect(result.strategy).toBe("merge");
    expect(result.backupCreated).toBeDefined();
  });

  it("should pass correct importedBy info to conflict resolver", async () => {
    let capturedImportedBy: any = null;
    const deps = createMockDependencies({
      createConflictResolver: (strategy: any, importedBy: any) => {
        capturedImportedBy = importedBy;
        return {
          importData: async () => ({
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
            errors: [],
            warnings: [],
          }),
        };
      },
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    await importBackupCore(formData, "skip", defaultOptions, deps);

    expect(capturedImportedBy).toEqual({
      id: "admin-123",
      email: "admin@example.com",
      name: "Admin User",
    });
  });

  it("should include conflict validation result in import", async () => {
    const deps = createMockDependencies({
      createValidator: () => ({
        validate: async (): Promise<ValidationResult> => ({
          isValid: true,
          metadata: {} as any,
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
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(formData, "skip", defaultOptions, deps);

    expect(result.success).toBe(true);
  });

  it("should pass extracted files to conflict resolver", async () => {
    let capturedExtractedFiles: any = null;
    const extractedFiles = new Map([
      ["data/people.json", Buffer.from("[]")],
      ["data/relationships.json", Buffer.from("[]")],
    ]);

    const deps = createMockDependencies({
      createValidator: () => ({
        validate: async (): Promise<ValidationResult> => ({
          isValid: true,
          metadata: {} as any,
          conflicts: [],
          statistics: {
            totalConflicts: 0,
            conflictsByType: {},
            conflictsBySeverity: {},
          },
          errors: [],
          warnings: [],
        }),
        getExtractedFiles: () => extractedFiles,
      }),
      createConflictResolver: () => ({
        importData: async (files: any) => {
          capturedExtractedFiles = files;
          return {
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
            errors: [],
            warnings: [],
          };
        },
      }),
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(formData, "skip", defaultOptions, deps);

    expect(result.success).toBe(true);
    expect(capturedExtractedFiles).toBe(extractedFiles);
  });

  it("should handle import errors and return import failed result", async () => {
    const deps = createMockDependencies({
      createConflictResolver: () => ({
        importData: async () => ({
          statistics: {
            peopleImported: 2,
            relationshipsImported: 1,
            usersImported: 0,
            suggestionsImported: 0,
            photosImported: 0,
            auditLogsImported: 0,
            conflictsResolved: 0,
            skippedItems: 1,
          },
          errors: ["Failed to import user: duplicate email"],
          warnings: ["Skipped 1 invalid person"],
        }),
      }),
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(formData, "skip", defaultOptions, deps);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("importPhotosCore", () => {
  it("should return 0 when no photos in extracted files", async () => {
    const deps = createMockDependencies();
    const extractedFiles = new Map([
      ["data/people.json", Buffer.from("[]")],
      ["data/relationships.json", Buffer.from("[]")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(0);
  });

  it("should skip directory entries", async () => {
    const deps = createMockDependencies();
    const extractedFiles = new Map([
      ["photos/", Buffer.from("")],
      ["photos/person-1/", Buffer.from("")],
      ["data/people.json", Buffer.from("[]")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(0);
  });

  it("should import photo successfully", async () => {
    let uploadCalled = false;
    let personUpdated = false;

    const deps = createMockDependencies({
      getStorageAdapter: () => ({
        upload: async () => {
          uploadCalled = true;
          return "123456-photo.jpg";
        },
        getUrl: (path: string) => `http://localhost:3000/api/uploads/${path}`,
        delete: async () => {},
      }),
      db: {
        person: {
          findUnique: async () => ({
            id: "person-1",
            name: "John Doe",
          }),
          update: async () => {
            personUpdated = true;
            return {};
          },
        },
      } as any,
    });

    const extractedFiles = new Map([
      ["photos/person-1/photo.jpg", Buffer.from("fake image data")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(1);
    expect(uploadCalled).toBe(true);
    expect(personUpdated).toBe(true);
  });

  it("should skip photos for non-existent persons", async () => {
    let uploadCalled = false;

    const deps = createMockDependencies({
      getStorageAdapter: () => ({
        upload: async () => {
          uploadCalled = true;
          return "123456-photo.jpg";
        },
        getUrl: (path: string) => `http://localhost:3000/api/uploads/${path}`,
        delete: async () => {},
      }),
      db: {
        person: {
          findUnique: async () => null,
          update: async () => ({}),
        },
      } as any,
    });

    const extractedFiles = new Map([
      ["photos/nonexistent-person/photo.jpg", Buffer.from("fake image data")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(0);
    expect(uploadCalled).toBe(false);
  });

  it("should handle invalid photo paths", async () => {
    const deps = createMockDependencies();
    const extractedFiles = new Map([
      ["photos/photo.jpg", Buffer.from("fake image data")], // Missing person ID
      ["photos/person-1/subfolder/photo.jpg", Buffer.from("fake image data")], // Too many parts
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(0);
  });

  it("should handle upload errors gracefully", async () => {
    const deps = createMockDependencies({
      getStorageAdapter: () => ({
        upload: async () => {
          throw new Error("Upload failed");
        },
        getUrl: (path: string) => `http://localhost:3000/api/uploads/${path}`,
        delete: async () => {},
      }),
      db: {
        person: {
          findUnique: async () => ({
            id: "person-1",
            name: "John Doe",
          }),
          update: async () => ({}),
        },
      } as any,
    });

    const extractedFiles = new Map([
      ["photos/person-1/photo.jpg", Buffer.from("fake image data")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(0);
  });

  it("should handle update errors gracefully", async () => {
    const deps = createMockDependencies({
      getStorageAdapter: () => ({
        upload: async () => "123456-photo.jpg",
        getUrl: (path: string) => `http://localhost:3000/api/uploads/${path}`,
        delete: async () => {},
      }),
      db: {
        person: {
          findUnique: async () => ({
            id: "person-1",
            name: "John Doe",
          }),
          update: async () => {
            throw new Error("Update failed");
          },
        },
      } as any,
    });

    const extractedFiles = new Map([
      ["photos/person-1/photo.jpg", Buffer.from("fake image data")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(0);
  });

  it("should import multiple photos", async () => {
    let uploadCount = 0;
    let updateCount = 0;

    const deps = createMockDependencies({
      getStorageAdapter: () => ({
        upload: async () => {
          uploadCount++;
          return `${uploadCount}-photo.jpg`;
        },
        getUrl: (path: string) => `http://localhost:3000/api/uploads/${path}`,
        delete: async () => {},
      }),
      db: {
        person: {
          findUnique: async ({ where }: any) => ({
            id: where.id,
            name: "Person",
          }),
          update: async () => {
            updateCount++;
            return {};
          },
        },
      } as any,
    });

    const extractedFiles = new Map([
      ["photos/person-1/photo1.jpg", Buffer.from("image 1")],
      ["photos/person-2/photo2.jpg", Buffer.from("image 2")],
      ["photos/person-3/photo3.jpg", Buffer.from("image 3")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(3);
    expect(uploadCount).toBe(3);
    expect(updateCount).toBe(3);
  });

  it("should skip non-photo files in photos directory", async () => {
    const deps = createMockDependencies();
    const extractedFiles = new Map([
      ["photos/person-1/README.md", Buffer.from("some text")],
      ["photos/person-2/.DS_Store", Buffer.from("mac file")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(0);
  });

  it("should extract correct person ID and filename from photo path", async () => {
    let capturedPersonId = "";
    let capturedFilename = "";

    const deps = createMockDependencies({
      getStorageAdapter: () => ({
        upload: async (_buffer: any, filename: string) => {
          capturedFilename = filename;
          return "stored-path";
        },
        getUrl: (path: string) => `http://localhost:3000/api/uploads/${path}`,
        delete: async () => {},
      }),
      db: {
        person: {
          findUnique: async ({ where }: any) => {
            capturedPersonId = where.id;
            return {
              id: where.id,
              name: "Person",
            };
          },
          update: async () => ({}),
        },
      } as any,
    });

    const extractedFiles = new Map([
      ["photos/person-123/my-photo.jpg", Buffer.from("image data")],
    ]);

    await importPhotosCore(extractedFiles, deps);

    expect(capturedPersonId).toBe("person-123");
    expect(capturedFilename).toBe("my-photo.jpg");
  });

  it("should pass correct mime type to storage upload", async () => {
    let capturedMimeType = "";

    const deps = createMockDependencies({
      getStorageAdapter: () => ({
        upload: async (_buffer: any, _filename: string, mimeType: string) => {
          capturedMimeType = mimeType;
          return "stored-path";
        },
        getUrl: (path: string) => `http://localhost:3000/api/uploads/${path}`,
        delete: async () => {},
      }),
      db: {
        person: {
          findUnique: async () => ({
            id: "person-1",
            name: "Person",
          }),
          update: async () => ({}),
        },
      } as any,
    });

    const extractedFiles = new Map([
      ["photos/person-1/photo.jpg", Buffer.from("image data")],
    ]);

    await importPhotosCore(extractedFiles, deps);

    expect(capturedMimeType).toBe("image/jpeg");
  });

  it("should continue importing other photos even if one fails", async () => {
    let uploadCount = 0;

    const deps = createMockDependencies({
      getStorageAdapter: () => ({
        upload: async () => {
          uploadCount++;
          if (uploadCount === 2) {
            throw new Error("Upload failed");
          }
          return `${uploadCount}-photo.jpg`;
        },
        getUrl: (path: string) => `http://localhost:3000/api/uploads/${path}`,
        delete: async () => {},
      }),
      db: {
        person: {
          findUnique: async ({ where }: any) => ({
            id: where.id,
            name: "Person",
          }),
          update: async () => ({}),
        },
      } as any,
    });

    const extractedFiles = new Map([
      ["photos/person-1/photo1.jpg", Buffer.from("image 1")],
      ["photos/person-2/photo2.jpg", Buffer.from("image 2")],
      ["photos/person-3/photo3.jpg", Buffer.from("image 3")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(2); // 2 successful, 1 failed
    expect(uploadCount).toBe(3); // All attempted
  });

  it("should not attempt upload if person does not exist", async () => {
    let uploadCalled = false;

    const deps = createMockDependencies({
      getStorageAdapter: () => ({
        upload: async () => {
          uploadCalled = true;
          return "stored.jpg";
        },
        getUrl: (path: string) => `http://localhost:3000/api/uploads/${path}`,
        delete: async () => {},
      }),
      db: {
        person: {
          findUnique: async () => null,
          update: async () => ({}),
        },
      } as any,
    });

    const extractedFiles = new Map([
      ["photos/person-1/photo.jpg", Buffer.from("image")],
      ["photos/person-2/photo.jpg", Buffer.from("image")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(0);
    expect(uploadCalled).toBe(false);
  });

  it("should filter out empty path components", async () => {
    const deps = createMockDependencies();
    const extractedFiles = new Map([
      ["photos//photo.jpg", Buffer.from("image")],
      ["photos/person-1//photo.jpg", Buffer.from("image")],
    ]);

    const count = await importPhotosCore(extractedFiles, deps);

    expect(count).toBe(0);
  });

  it("should handle extractedFiles iteration correctly", async () => {
    let iterationCount = 0;
    const deps = createMockDependencies({
      getStorageAdapter: () => ({
        upload: async () => "stored.jpg",
        getUrl: (path: string) => `http://localhost:3000/api/uploads/${path}`,
        delete: async () => {},
      }),
      db: {
        person: {
          findUnique: async () => {
            iterationCount++;
            return null;
          },
          update: async () => ({}),
        },
      } as any,
    });

    const extractedFiles = new Map([
      ["photos/p1/a.jpg", Buffer.from("1")],
      ["photos/p2/b.jpg", Buffer.from("2")],
      ["photos/p3/c.jpg", Buffer.from("3")],
      ["data/people.json", Buffer.from("[]")],
    ]);

    await importPhotosCore(extractedFiles, deps);

    expect(iterationCount).toBe(3); // Only photos, not data
  });
});

describe("validateBackupCore - file validation edge cases", () => {
  it("should handle file with no extension", async () => {
    const deps = createMockDependencies();
    const formData = new FormData();
    const fileContent = "test content";
    const invalidFile = new File([fileContent], "backup", {
      type: "application/octet-stream",
    });
    formData.append("file", invalidFile);

    await expect(validateBackupCore(formData, deps)).rejects.toThrow(
      "File must be a ZIP archive"
    );
  });

  it("should be case-sensitive for .zip extension", async () => {
    const deps = createMockDependencies();
    const formData = new FormData();
    const fileContent = "test content";
    const invalidFile = new File([fileContent], "backup.ZIP", {
      type: "application/zip",
    });
    formData.append("file", invalidFile);

    await expect(validateBackupCore(formData, deps)).rejects.toThrow(
      "File must be a ZIP archive"
    );
  });

  it("should wrap validator errors with validation context", async () => {
    const deps = createMockDependencies({
      createValidator: () => ({
        validate: async () => {
          throw new Error("Specific validator error message");
        },
        getExtractedFiles: () => new Map(),
      }),
    });

    const formData = new FormData();
    const validFile = new File(["test"], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    await expect(validateBackupCore(formData, deps)).rejects.toThrow(
      "Validation failed: Specific validator error message"
    );
  });
});

describe("importBackupCore - error logging", () => {
  const defaultOptions = {
    createBackupBeforeImport: false,
    importPhotos: false,
    importAuditLogs: false,
  };

  it("should not throw if error logging fails", async () => {
    const deps = createMockDependencies({
      createValidator: () => ({
        validate: async () => {
          throw new Error("Validation failed");
        },
        getExtractedFiles: () => new Map(),
      }),
      db: {
        auditLog: {
          create: async () => {
            throw new Error("Cannot log error");
          },
          findMany: async () => [],
        },
        person: {
          findUnique: async () => null,
          update: async () => ({}),
        },
      } as any,
    });

    const formData = new FormData();
    const validFile = new File(["test"], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    await expect(
      importBackupCore(formData, "skip", defaultOptions, deps)
    ).rejects.toThrow("Import failed: Validation failed");
  });

  it("should log import success with strategy information", async () => {
    let auditLogData: any = null;

    const deps = createMockDependencies({
      db: {
        $transaction: async (callback: any) =>
          callback({
            auditLog: {
              create: async ({ data }: any) => {
                auditLogData = data;
                return {};
              },
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
    });

    const formData = new FormData();
    const validFile = new File(["test"], "backup.zip", {
      type: "application/zip",
    });
    formData.append("file", validFile);

    const result = await importBackupCore(
      formData,
      "merge",
      defaultOptions,
      deps
    );

    expect(result.success).toBe(true);
    expect(auditLogData).toBeDefined();
    expect(auditLogData.action).toBe("CREATE");
    expect(auditLogData.entityType).toBe("BACKUP_IMPORT");
    expect(auditLogData.newData.strategy).toBe("merge");
  });

  it("should handle all three import strategies", async () => {
    const strategies = ["skip", "merge", "replace"] as const;

    for (const strategy of strategies) {
      const deps = createMockDependencies();
      const formData = new FormData();
      const validFile = new File(["test"], "backup.zip", {
        type: "application/zip",
      });
      formData.append("file", validFile);

      const result = await importBackupCore(formData, strategy, defaultOptions, deps);

      expect(result.strategy).toBe(strategy);
      expect(result.success).toBe(true);
    }
  });
});
