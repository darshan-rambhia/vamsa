import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateBackup, importBackup, getImportHistory } from "./restore";
import { BackupValidator } from "@/lib/backup/validator";
import { ConflictResolver } from "@/lib/backup/conflict-resolver";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    person: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/backup/validator", () => {
  return {
    BackupValidator: vi.fn(function () {
      return {
        validate: vi.fn(),
        extractData: vi.fn(),
        cleanup: vi.fn(),
      };
    }),
  };
});

vi.mock("@/lib/backup/conflict-resolver", () => {
  return {
    ConflictResolver: vi.fn(function () {
      return {
        detectConflicts: vi.fn(),
        resolveConflicts: vi.fn(),
      };
    }),
  };
});
vi.mock("@/actions/backup", () => ({
  gatherBackupData: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getStorageAdapter: vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue("photos/person-1/test.jpg"),
    getUrl: vi
      .fn()
      .mockReturnValue("https://example.com/photos/person-1/test.jpg"),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}));

const { requireAdmin } = await import("@/lib/auth");
const { db } = await import("@/lib/db");
const { gatherBackupData } = await import("@/actions/backup");

// Helper to create a mock BackupValidator instance
function createMockValidator(overrides: any = {}) {
  return {
    validate: vi.fn(),
    extractData: vi.fn(),
    cleanup: vi.fn(),
    ...overrides,
  };
}

describe("validateBackup", () => {
  const mockSession = {
    id: "admin-123",
    email: "admin@example.com",
    name: "Admin User",
    role: "ADMIN" as const,
    personId: null,
    mustChangePassword: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(mockSession);
  });

  it("should require admin authentication", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    const formData = new FormData();
    const testFile = new File(["test"], "backup.zip", {
      type: "application/zip",
    });
    // Mock the arrayBuffer method
    testFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode("test").buffer);
    formData.append("file", testFile);

    await expect(validateBackup(formData)).rejects.toThrow("Unauthorized");
  });

  it("should validate file presence", async () => {
    const formData = new FormData();

    await expect(validateBackup(formData)).rejects.toThrow("No file provided");
  });

  it("should validate file size", async () => {
    const formData = new FormData();
    // Create a large file (over 100MB)
    const largeContent = "x".repeat(101 * 1024 * 1024);
    const largeFile = new File([largeContent], "backup.zip", {
      type: "application/zip",
    });
    // Mock the arrayBuffer method
    largeFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(largeContent).buffer);
    formData.append("file", largeFile);

    await expect(validateBackup(formData)).rejects.toThrow(
      "File size exceeds 100MB limit"
    );
  });

  it("should validate file type", async () => {
    const formData = new FormData();
    const invalidFile = new File(["test"], "backup.txt", {
      type: "text/plain",
    });
    // Mock the arrayBuffer method
    invalidFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode("test").buffer);
    formData.append("file", invalidFile);

    await expect(validateBackup(formData)).rejects.toThrow(
      "File must be a ZIP archive"
    );
  });

  it("should validate backup successfully", async () => {
    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    // Mock the arrayBuffer method
    validFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(fileContent).buffer);
    formData.append("file", validFile);

    const mockValidationResult = {
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

    // Set up the mock to return our validation result
    const mockValidate = vi.fn().mockResolvedValue(mockValidationResult);
    vi.mocked(BackupValidator).mockImplementation(function () {
      return {
        validate: mockValidate,
        extractData: vi.fn(),
        cleanup: vi.fn(),
      };
    });

    const result = await validateBackup(formData);

    expect(result).toEqual(mockValidationResult);
    expect(BackupValidator).toHaveBeenCalledWith(expect.any(Buffer));
    expect(mockValidate).toHaveBeenCalled();
  });

  it("should handle validation errors", async () => {
    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    // Mock the arrayBuffer method
    validFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(fileContent).buffer);
    formData.append("file", validFile);

    // Set up the mock to throw an error
    vi.mocked(BackupValidator).mockImplementation(function () {
      return {
        validate: vi.fn().mockRejectedValue(new Error("Invalid ZIP structure")),
        extractData: vi.fn(),
        cleanup: vi.fn(),
      };
    });

    await expect(validateBackup(formData)).rejects.toThrow(
      "Validation failed: Invalid ZIP structure"
    );
  });
});

describe("importBackup", () => {
  const mockSession = {
    id: "admin-123",
    email: "admin@example.com",
    name: "Admin User",
    role: "ADMIN" as const,
    personId: null,
    mustChangePassword: false,
  };

  const mockValidationResult = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(mockSession);
    vi.mocked(db.$transaction).mockImplementation((callback) => callback(db));
    vi.mocked(db.auditLog.create).mockResolvedValue({} as any);
  });

  it("should require admin authentication", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    const formData = new FormData();
    const testFile = new File(["test"], "backup.zip", {
      type: "application/zip",
    });
    // Mock the arrayBuffer method
    testFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode("test").buffer);
    formData.append("file", testFile);

    await expect(
      importBackup(formData, "skip", {
        createBackupBeforeImport: false,
        importPhotos: false,
        importAuditLogs: false,
      })
    ).rejects.toThrow("Unauthorized");
  });

  it("should validate file presence", async () => {
    const formData = new FormData();

    await expect(
      importBackup(formData, "skip", {
        createBackupBeforeImport: false,
        importPhotos: false,
        importAuditLogs: false,
      })
    ).rejects.toThrow("No file provided");
  });

  it("should validate backup before import", async () => {
    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    validFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(fileContent).buffer);
    formData.append("file", validFile);

    const invalidValidationResult = {
      ...mockValidationResult,
      isValid: false,
      errors: ["Invalid backup format"],
    };

    vi.mocked(BackupValidator).mockImplementation(function () {
      return {
        validate: vi.fn().mockResolvedValue(invalidValidationResult),
        extractData: vi.fn(),
        cleanup: vi.fn(),
      };
    });

    await expect(
      importBackup(formData, "skip", {
        createBackupBeforeImport: false,
        importPhotos: false,
        importAuditLogs: false,
      })
    ).rejects.toThrow("Invalid backup: Invalid backup format");
  });

  it("should import backup successfully with skip strategy", async () => {
    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    validFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(fileContent).buffer);
    formData.append("file", validFile);

    vi.mocked(BackupValidator).mockImplementation(function () {
      return createMockValidator({
        validate: vi.fn().mockResolvedValue(mockValidationResult),
        getExtractedFiles: vi.fn().mockReturnValue(new Map()),
      });
    });

    const mockImportResult = {
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
    };

    vi.mocked(ConflictResolver).mockImplementation(function () {
      return {
        detectConflicts: vi.fn(),
        resolveConflicts: vi.fn(),
        importData: vi.fn().mockResolvedValue(mockImportResult),
      };
    });

    const result = await importBackup(formData, "skip", {
      createBackupBeforeImport: false,
      importPhotos: false,
      importAuditLogs: false,
    });

    expect(result).toMatchObject({
      success: true,
      importedAt: expect.any(String),
      importedBy: {
        id: "admin-123",
        email: "admin@example.com",
        name: "Admin User",
      },
      strategy: "skip",
      statistics: mockImportResult.statistics,
      errors: [],
      warnings: [],
    });

    expect(ConflictResolver).toHaveBeenCalledWith("skip", {
      id: "admin-123",
      email: "admin@example.com",
      name: "Admin User",
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "admin-123",
        action: "CREATE",
        entityType: "BACKUP_IMPORT",
        entityId: null,
        newData: expect.objectContaining({
          timestamp: expect.any(String),
          strategy: "skip",
          statistics: mockImportResult.statistics,
        }),
      },
    });
  });

  it("should create backup before import when requested", async () => {
    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    validFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(fileContent).buffer);
    formData.append("file", validFile);

    vi.mocked(BackupValidator).mockImplementation(function () {
      return createMockValidator({
        validate: vi.fn().mockResolvedValue(mockValidationResult),
        getExtractedFiles: vi.fn().mockReturnValue(new Map()),
      });
    });

    vi.mocked(ConflictResolver).mockImplementation(function () {
      return {
        detectConflicts: vi.fn(),
        resolveConflicts: vi.fn(),
        importData: vi.fn().mockResolvedValue({
          statistics: {},
          errors: [],
          warnings: [],
        }),
      };
    });

    // Mock backup creation
    vi.mocked(gatherBackupData).mockResolvedValue({
      metadata: mockValidationResult.metadata,
      data: {
        people: [],
        relationships: [],
        users: [],
        suggestions: [],
        settings: null,
      },
      photos: [],
    });

    const result = await importBackup(formData, "replace", {
      createBackupBeforeImport: true,
      importPhotos: false,
      importAuditLogs: false,
    });

    expect(result.backupCreated).toMatch(/pre-import-backup-.*\.zip/);
    expect(gatherBackupData).toHaveBeenCalledWith({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });
  });

  it("should handle import errors and log them", async () => {
    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    validFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(fileContent).buffer);
    formData.append("file", validFile);

    vi.mocked(BackupValidator).mockImplementation(function () {
      return createMockValidator({
        validate: vi.fn().mockResolvedValue(mockValidationResult),
        getExtractedFiles: vi.fn().mockReturnValue(new Map()),
      });
    });

    vi.mocked(ConflictResolver).mockImplementation(function () {
      return {
        detectConflicts: vi.fn(),
        resolveConflicts: vi.fn(),
        importData: vi
          .fn()
          .mockRejectedValue(new Error("Database connection failed")),
      };
    });

    await expect(
      importBackup(formData, "replace", {
        createBackupBeforeImport: false,
        importPhotos: false,
        importAuditLogs: false,
      })
    ).rejects.toThrow("Import failed: Database connection failed");

    // Should log failed import attempt
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "admin-123",
        action: "CREATE",
        entityType: "BACKUP_IMPORT_FAILED",
        entityId: null,
        newData: {
          timestamp: expect.any(String),
          error: "Database connection failed",
        },
      },
    });
  });

  it("should handle photo import failure gracefully", async () => {
    const { getStorageAdapter } = await import("@/lib/storage");
    vi.mocked(getStorageAdapter).mockReturnValue({
      upload: vi.fn().mockRejectedValue(new Error("Storage error")),
      delete: vi.fn().mockResolvedValue(undefined),
      getUrl: vi
        .fn()
        .mockReturnValue("https://example.com/photos/person-1/test.jpg"),
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    validFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(fileContent).buffer);
    formData.append("file", validFile);

    vi.mocked(BackupValidator).mockImplementation(function () {
      return createMockValidator({
        validate: vi.fn().mockResolvedValue(mockValidationResult),
        getExtractedFiles: vi
          .fn()
          .mockReturnValue(
            new Map([["photos/person-1/photo.jpg", Buffer.from("photo data")]])
          ),
      });
    });

    vi.mocked(ConflictResolver).mockImplementation(function () {
      return {
        detectConflicts: vi.fn(),
        resolveConflicts: vi.fn(),
        importData: vi.fn().mockResolvedValue({
          statistics: { photosImported: 0 },
          errors: [],
          warnings: [],
        }),
      };
    });

    // Mock person lookup for photo import
    vi.mocked(db.person.findUnique).mockResolvedValue({
      id: "person-1",
    } as any);

    const result = await importBackup(formData, "replace", {
      createBackupBeforeImport: false,
      importPhotos: true,
      importAuditLogs: false,
    });

    // Should still succeed even if photo import fails
    expect(result.success).toBe(true);
    expect(result.statistics.photosImported).toBe(0);
  });

  it("should handle all conflict resolution strategies", async () => {
    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    validFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(fileContent).buffer);
    formData.append("file", validFile);

    vi.mocked(BackupValidator).mockImplementation(function () {
      return createMockValidator({
        validate: vi.fn().mockResolvedValue(mockValidationResult),
        getExtractedFiles: vi.fn().mockReturnValue(new Map()),
      });
    });

    vi.mocked(ConflictResolver).mockImplementation(function () {
      return {
        detectConflicts: vi.fn(),
        resolveConflicts: vi.fn(),
        importData: vi.fn().mockResolvedValue({
          statistics: { conflictsResolved: 5 },
          errors: [],
          warnings: [],
        }),
      };
    });

    // Test merge strategy
    const result = await importBackup(formData, "merge", {
      createBackupBeforeImport: false,
      importPhotos: true,
      importAuditLogs: true,
    });

    expect(ConflictResolver).toHaveBeenCalledWith("merge", expect.any(Object));
    expect(result.strategy).toBe("merge");
  });

  it("should handle photo import when requested", async () => {
    const { getStorageAdapter } = await import("@/lib/storage");
    vi.mocked(getStorageAdapter).mockReturnValue({
      upload: vi.fn().mockResolvedValue("photos/person-1/test.jpg"),
      delete: vi.fn().mockResolvedValue(undefined),
      getUrl: vi
        .fn()
        .mockReturnValue("https://example.com/photos/person-1/test.jpg"),
    });

    const formData = new FormData();
    const fileContent = "test zip content";
    const validFile = new File([fileContent], "backup.zip", {
      type: "application/zip",
    });
    validFile.arrayBuffer = vi
      .fn()
      .mockResolvedValue(new TextEncoder().encode(fileContent).buffer);
    formData.append("file", validFile);

    vi.mocked(BackupValidator).mockImplementation(function () {
      return createMockValidator({
        validate: vi.fn().mockResolvedValue(mockValidationResult),
        getExtractedFiles: vi
          .fn()
          .mockReturnValue(
            new Map([["photos/person-1/photo.jpg", Buffer.from("photo data")]])
          ),
      });
    });

    vi.mocked(ConflictResolver).mockImplementation(function () {
      return {
        detectConflicts: vi.fn(),
        resolveConflicts: vi.fn(),
        importData: vi.fn().mockResolvedValue({
          statistics: { photosImported: 1 },
          errors: [],
          warnings: [],
        }),
      };
    });

    // Mock person lookup for photo import
    vi.mocked(db.person.findUnique).mockResolvedValue({
      id: "person-1",
    } as any);

    // Mock person update for photo import
    vi.mocked(db.person.update).mockResolvedValue({
      id: "person-1",
      photoUrl: "https://example.com/photos/person-1/test.jpg",
    } as any);

    const result = await importBackup(formData, "replace", {
      createBackupBeforeImport: false,
      importPhotos: true,
      importAuditLogs: false,
    });

    expect(result.statistics.photosImported).toBe(1);
  });
});

describe("getImportHistory", () => {
  const mockSession = {
    id: "admin-123",
    email: "admin@example.com",
    name: "Admin User",
    role: "ADMIN" as const,
    personId: null,
    mustChangePassword: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(mockSession);
  });

  it("should require admin authentication", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    await expect(getImportHistory()).rejects.toThrow("Unauthorized");
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

    vi.mocked(db.auditLog.findMany).mockResolvedValue(mockAuditLogs as any);

    const result = await getImportHistory();

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
        importedBy: "admin@example.com", // Falls back to email when name is null
        strategy: "unknown",
        statistics: {},
        success: false,
      },
    ]);

    expect(db.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        entityType: {
          in: ["BACKUP_IMPORT", "BACKUP_IMPORT_FAILED"],
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });
  });

  it("should handle empty history", async () => {
    vi.mocked(db.auditLog.findMany).mockResolvedValue([]);

    const result = await getImportHistory();

    expect(result).toEqual([]);
  });
});
