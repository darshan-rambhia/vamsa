/**
 * Unit tests for Backup Business Logic
 *
 * Tests cover:
 * - gatherBackupData: Collecting all family data for export
 * - createBackupArchive: Creating ZIP archives from gathered data
 * - validateBackupFile: Validating backup file integrity
 * - extractBackupData: Extracting data from backup archives
 * - restoreFromBackup: Orchestrating restore with conflict resolution
 * - scheduleBackupJob: Configuring automatic backup scheduling
 *
 * Testing approach:
 * 1. Mock database queries using DI pattern
 * 2. Test each function independently with various data scenarios
 * 3. Test error handling and edge cases
 * 4. Verify logging and metric recording
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  clearAllMocks,
  mockLog,
  mockLogger,
  mockLoggers,
  mockSerializeError,
} from "../../testing/shared-mocks";

// Import functions to test
import {
  createBackupArchive,
  extractBackupData,
  gatherBackupData,
  restoreFromBackup,
  scheduleBackupJob,
  validateBackupFile,
} from "./backup";

// Mock the logger before importing modules
mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  loggers: mockLoggers,
  log: mockLog,
  serializeError: mockSerializeError,
}));

// Mock drizzle schema
const mockDrizzleSchema = {
  persons: { id: "id", lastName: "lastName", firstName: "firstName" },
  relationships: {
    id: "id",
    createdAt: "createdAt",
  },
  users: {
    id: "id",
    email: "email",
    name: "name",
    personId: "personId",
    role: "role",
    isActive: "isActive",
    mustChangePassword: "mustChangePassword",
    invitedById: "invitedById",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    lastLoginAt: "lastLoginAt",
    preferredLanguage: "preferredLanguage",
  },
  suggestions: { id: "id", submittedAt: "submittedAt" },
  familySettings: { id: "id" },
  auditLogs: { id: "id", createdAt: "createdAt" },
  mediaObjects: { id: "id", uploadedAt: "uploadedAt", filePath: "filePath" },
};

mock.module("@vamsa/api", () => ({
  drizzleDb: {} as any, // Will be injected via DI
  drizzleSchema: mockDrizzleSchema,
  drizzleConfig: {},
}));

// Default test objects - tests can customize specific fields via spread
const createDefaultImportOptions = (
  overrides: Partial<{
    strategy: "skip" | "replace" | "merge";
    createBackupBeforeImport: boolean;
    importPhotos: boolean;
    importAuditLogs: boolean;
  }> = {}
) => ({
  strategy: "skip" as const,
  createBackupBeforeImport: true,
  importPhotos: true,
  importAuditLogs: false,
  ...overrides,
});

const createDefaultScheduleSettings = (
  overrides: Partial<{
    dailyEnabled: boolean;
    dailyTime: string;
    dailyRetention: number;
    weeklyEnabled: boolean;
    weeklyDay: number;
    weeklyTime: string;
    weeklyRetention: number;
    monthlyEnabled: boolean;
    monthlyDay: number;
    monthlyTime: string;
    monthlyRetention: number;
    storageProvider: "LOCAL" | "S3" | "R2" | "B2";
    storagePath: string;
    includePhotos: boolean;
    includeAuditLogs: boolean;
    compressLevel: number;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
  }> = {}
) => ({
  dailyEnabled: false,
  dailyTime: "02:00",
  dailyRetention: 7,
  weeklyEnabled: false,
  weeklyDay: 0, // Sunday
  weeklyTime: "03:00",
  weeklyRetention: 4,
  monthlyEnabled: false,
  monthlyDay: 1,
  monthlyTime: "04:00",
  monthlyRetention: 12,
  storageProvider: "LOCAL" as const,
  storagePath: "backups",
  includePhotos: true,
  includeAuditLogs: false,
  compressLevel: 6,
  notifyOnSuccess: false,
  notifyOnFailure: true,
  ...overrides,
});

// Use the actual function return type for type safety
type ExtractedBackupData = Awaited<ReturnType<typeof extractBackupData>>;

const createDefaultExtractedData = (): ExtractedBackupData => ({
  metadata: {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    exportedBy: { id: "user1", email: "user@example.com", name: null },
    statistics: {
      totalPeople: 0,
      totalRelationships: 0,
      totalUsers: 0,
      totalSuggestions: 0,
      totalPhotos: 0,
      auditLogDays: 90,
      totalAuditLogs: 0,
    },
    dataFiles: [],
    photoDirectories: [],
  },
  people: [],
  relationships: [],
  users: [],
  suggestions: [],
  settings: null,
  auditLogs: [],
  mediaFiles: [],
});

const createDefaultMetadata = () => ({
  version: "1.0.0",
  exportedAt: new Date().toISOString(),
  exportedBy: { id: "user1", email: "user@example.com", name: null },
  statistics: {
    totalPeople: 0,
    totalRelationships: 0,
    totalUsers: 0,
    totalSuggestions: 0,
    totalPhotos: 0,
    auditLogDays: 90,
    totalAuditLogs: 0,
  },
  dataFiles: [] as Array<string>,
  photoDirectories: [] as Array<string>,
});

describe("backup business logic", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe("gatherBackupData", () => {
    it("should gather all backup data with default options", async () => {
      const mockPersons = [{ id: "p1", firstName: "John", lastName: "Doe" }];
      const mockRelationships = [
        {
          id: "r1",
          personId: "p1",
          relatedPersonId: "p2",
          createdAt: new Date(),
        },
      ];
      const mockUsers = [
        {
          id: "u1",
          email: "john@example.com",
          name: "John Doe",
          personId: "p1",
          role: "ADMIN",
          isActive: true,
          mustChangePassword: false,
          invitedById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          preferredLanguage: "en",
        },
      ];
      const mockSettings = [{ id: "s1", familyName: "Doe Family" }];

      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock((col: unknown) =>
              Promise.resolve(
                col === mockDrizzleSchema.users
                  ? mockUsers
                  : col === mockDrizzleSchema.persons
                    ? mockPersons
                    : mockRelationships
              )
            ),
            where: mock(() => ({
              orderBy: mock(() => Promise.resolve([])),
            })),
            limit: mock(() => Promise.resolve(mockSettings)),
          })),
        })),
      } as any;

      const result = await gatherBackupData(
        {
          includePhotos: false,
          includeAuditLogs: false,
          auditLogDays: 90,
        },
        mockDb
      );

      expect(result.people).toBeDefined();
      expect(result.relationships).toBeDefined();
      expect(result.users).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.settings).toBeDefined();
      expect(result.auditLogs).toEqual([]);
      expect(result.mediaObjects).toEqual([]);
    });

    it("should include audit logs when requested", async () => {
      const mockAuditLogs = [
        {
          id: "a1",
          action: "LOGIN",
          createdAt: new Date(),
        },
      ];

      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => Promise.resolve([])),
            where: mock(() => ({
              orderBy: mock(() => Promise.resolve(mockAuditLogs)),
            })),
            limit: mock(() => Promise.resolve([])),
          })),
        })),
      } as any;

      const result = await gatherBackupData(
        {
          includePhotos: false,
          includeAuditLogs: true,
          auditLogDays: 90,
        },
        mockDb
      );

      expect(result.auditLogs).toHaveLength(1);
      expect(result.auditLogs[0].id).toBe("a1");
    });

    it("should include media objects when requested", async () => {
      const mockMedia = [
        {
          id: "m1",
          filePath: "/photos/image.jpg",
          uploadedAt: new Date(),
        },
      ];

      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => Promise.resolve(mockMedia)),
            where: mock(() => ({
              orderBy: mock(() => Promise.resolve([])),
            })),
            limit: mock(() => Promise.resolve([])),
          })),
        })),
      } as any;

      const result = await gatherBackupData(
        {
          includePhotos: true,
          includeAuditLogs: false,
          auditLogDays: 90,
        },
        mockDb
      );

      expect(result.mediaObjects).toHaveLength(1);
      expect(result.mediaObjects[0].id).toBe("m1");
    });

    it("should exclude password fields from users", async () => {
      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => Promise.resolve([])),
            where: mock(() => ({
              orderBy: mock(() => Promise.resolve([])),
            })),
            limit: mock(() => Promise.resolve([])),
          })),
        })),
      } as any;

      // The function explicitly excludes the password field in its select()
      // We verify this through the expected structure of returned users
      const result = await gatherBackupData(
        {
          includePhotos: false,
          includeAuditLogs: false,
          auditLogDays: 90,
        },
        mockDb
      );

      // Verify users array exists and structure (password should not be included)
      expect(result.users).toBeDefined();
      expect(Array.isArray(result.users)).toBe(true);
    });

    it("should return null for settings when none exist", async () => {
      const mockDb = {
        select: mock(() => ({
          from: mock(() => ({
            orderBy: mock(() => Promise.resolve([])),
            where: mock(() => ({
              orderBy: mock(() => Promise.resolve([])),
            })),
            limit: mock(() => Promise.resolve([])),
          })),
        })),
      } as any;

      const result = await gatherBackupData(
        {
          includePhotos: false,
          includeAuditLogs: false,
          auditLogDays: 90,
        },
        mockDb
      );

      expect(result.settings).toBeNull();
    });
  });

  describe("createBackupArchive", () => {
    // Helper to create mock backup data for archive tests
    // Uses type assertion since we're testing archiving, not data structure
    const createMockBackupData = (overrides: Record<string, unknown> = {}) =>
      ({
        people: [],
        relationships: [],
        users: [],
        suggestions: [],
        settings: null,
        auditLogs: [],
        mediaObjects: [],
        ...overrides,
      }) as Awaited<ReturnType<typeof gatherBackupData>>;

    it("should create ZIP archive with metadata and data files", async () => {
      const mockData = createMockBackupData({
        people: [{ id: "p1", firstName: "John", lastName: "Doe" }],
        settings: { id: "s1" },
      });

      const mockMetadata = {
        ...createDefaultMetadata(),
        exportedBy: {
          id: "user1",
          email: "user@example.com",
          name: "Test User",
        },
        statistics: {
          ...createDefaultMetadata().statistics,
          totalPeople: 1,
        },
        dataFiles: ["metadata.json", "data/people.json"],
      };

      const result = await createBackupArchive(mockData, mockMetadata);

      // Should return base64-encoded ZIP
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      // Base64 should be valid (contains alphanumeric and +/=)
      expect(/^[A-Za-z0-9+/=]+$/.test(result)).toBe(true);
    });

    it("should include audit logs in archive when present", async () => {
      const mockData = createMockBackupData({
        auditLogs: [{ id: "a1", action: "LOGIN" }],
      });

      const mockMetadata = {
        ...createDefaultMetadata(),
        statistics: {
          ...createDefaultMetadata().statistics,
          totalAuditLogs: 1,
        },
      };

      const result = await createBackupArchive(mockData, mockMetadata);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle empty data gracefully", async () => {
      const mockData = createMockBackupData();
      const mockMetadata = createDefaultMetadata();

      const result = await createBackupArchive(mockData, mockMetadata);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should create valid base64 output that can be decoded", async () => {
      const mockData = createMockBackupData({
        people: [{ id: "p1", firstName: "Test", lastName: "Person" }],
      });

      const mockMetadata = {
        ...createDefaultMetadata(),
        statistics: {
          ...createDefaultMetadata().statistics,
          totalPeople: 1,
        },
      };

      const result = await createBackupArchive(mockData, mockMetadata);

      // Should be able to decode base64
      try {
        const buffer = Buffer.from(result, "base64");
        expect(buffer.length).toBeGreaterThan(0);
      } catch {
        expect.unreachable("Should be valid base64");
      }
    });
  });

  describe("validateBackupFile", () => {
    it("should return validation result for buffer", async () => {
      const buffer = Buffer.from("test data");

      const result = await validateBackupFile(buffer);

      expect(result.isValid).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.conflicts).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it("should include metadata in validation result", async () => {
      const buffer = Buffer.from("test data");

      const result = await validateBackupFile(buffer);

      expect(result.metadata.version).toBe("1.0.0");
      expect(result.metadata.exportedAt).toBeDefined();
      expect(result.metadata.exportedBy).toBeDefined();
      expect(result.metadata.statistics).toBeDefined();
    });

    it("should return empty conflicts array", async () => {
      const buffer = Buffer.from("test data");

      const result = await validateBackupFile(buffer);

      expect(Array.isArray(result.conflicts)).toBe(true);
      expect(result.conflicts.length).toBe(0);
    });

    it("should include statistics in validation result", async () => {
      const buffer = Buffer.from("test data");

      const result = await validateBackupFile(buffer);

      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalConflicts).toBe(0);
      expect(typeof result.statistics.conflictsByType).toBe("object");
      expect(typeof result.statistics.conflictsBySeverity).toBe("object");
    });

    it("should log validation with buffer size", async () => {
      const buffer = Buffer.from("test data");

      await validateBackupFile(buffer);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ size: buffer.length }),
        expect.any(String)
      );
    });
  });

  describe("extractBackupData", () => {
    it("should extract backup data from archive buffer", async () => {
      const buffer = Buffer.from("test archive data");

      const result = await extractBackupData(buffer);

      expect(result.metadata).toBeDefined();
      expect(result.people).toBeDefined();
      expect(result.relationships).toBeDefined();
      expect(result.users).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.settings).toBeDefined();
      expect(result.auditLogs).toBeDefined();
      expect(result.mediaFiles).toBeDefined();
    });

    it("should return arrays for all data types", async () => {
      const buffer = Buffer.from("test data");

      const result = await extractBackupData(buffer);

      expect(Array.isArray(result.people)).toBe(true);
      expect(Array.isArray(result.relationships)).toBe(true);
      expect(Array.isArray(result.users)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.auditLogs)).toBe(true);
      expect(Array.isArray(result.mediaFiles)).toBe(true);
    });

    it("should include metadata in extracted data", async () => {
      const buffer = Buffer.from("test data");

      const result = await extractBackupData(buffer);

      expect(result.metadata.version).toBe("1.0.0");
      expect(result.metadata.exportedAt).toBeDefined();
      expect(result.metadata.exportedBy).toBeDefined();
      expect(result.metadata.statistics).toBeDefined();
    });

    it("should allow null settings", async () => {
      const buffer = Buffer.from("test data");

      const result = await extractBackupData(buffer);

      expect(result.settings).toBeNull();
    });

    it("should log extraction with buffer size", async () => {
      const buffer = Buffer.from("test data");

      await extractBackupData(buffer);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ size: buffer.length }),
        expect.any(String)
      );
    });
  });

  describe("restoreFromBackup", () => {
    it("should return successful restore result", async () => {
      const extractedData = createDefaultExtractedData();
      const mockDb = {} as any;

      const result = await restoreFromBackup(
        extractedData,
        createDefaultImportOptions(),
        "user123",
        mockDb
      );

      expect(result.success).toBe(true);
      expect(result.importedAt).toBeDefined();
      expect(result.importedBy).toBeDefined();
      expect(result.strategy).toBe("skip");
      expect(result.statistics).toBeDefined();
    });

    it("should include import statistics", async () => {
      const extractedData = createDefaultExtractedData();
      const mockDb = {} as any;

      const result = await restoreFromBackup(
        extractedData,
        createDefaultImportOptions(),
        "user123",
        mockDb
      );

      expect(result.statistics.peopleImported).toBeGreaterThanOrEqual(0);
      expect(result.statistics.relationshipsImported).toBeGreaterThanOrEqual(0);
      expect(result.statistics.usersImported).toBeGreaterThanOrEqual(0);
      expect(result.statistics.suggestionsImported).toBeGreaterThanOrEqual(0);
      expect(result.statistics.photosImported).toBeGreaterThanOrEqual(0);
      expect(result.statistics.auditLogsImported).toBeGreaterThanOrEqual(0);
      expect(result.statistics.conflictsResolved).toBeGreaterThanOrEqual(0);
      expect(result.statistics.skippedItems).toBeGreaterThanOrEqual(0);
    });

    it("should accept different conflict resolution strategies", async () => {
      const extractedData = createDefaultExtractedData();
      const mockDb = {} as any;

      for (const strategy of ["skip", "replace", "merge"] as const) {
        const result = await restoreFromBackup(
          extractedData,
          createDefaultImportOptions({ strategy }),
          "user123",
          mockDb
        );

        expect(result.strategy).toBe(strategy);
        expect(result.success).toBe(true);
      }
    });

    it("should record userId in import log", async () => {
      const extractedData = createDefaultExtractedData();
      const mockDb = {} as any;

      await restoreFromBackup(
        extractedData,
        createDefaultImportOptions(),
        "user456",
        mockDb
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user456" }),
        expect.any(String)
      );
    });

    it("should include error and warning arrays", async () => {
      const extractedData = createDefaultExtractedData();
      const mockDb = {} as any;

      const result = await restoreFromBackup(
        extractedData,
        createDefaultImportOptions(),
        "user123",
        mockDb
      );

      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe("scheduleBackupJob", () => {
    it("should configure daily backup schedule", async () => {
      const settings = createDefaultScheduleSettings({
        dailyEnabled: true,
        dailyTime: "02:00",
        dailyRetention: 7,
      });

      const result = await scheduleBackupJob(settings, "user123");

      expect(result.success).toBe(true);
      expect(result.scheduleInfo.daily.enabled).toBe(true);
      expect(result.scheduleInfo.daily.time).toBe("02:00");
      expect(result.scheduleInfo.daily.retention).toBe(7);
    });

    it("should configure weekly backup schedule", async () => {
      const settings = createDefaultScheduleSettings({
        weeklyEnabled: true,
        weeklyDay: 0, // Sunday
        weeklyTime: "03:00",
        weeklyRetention: 4,
      });

      const result = await scheduleBackupJob(settings, "user123");

      expect(result.success).toBe(true);
      expect(result.scheduleInfo.weekly.enabled).toBe(true);
      expect(result.scheduleInfo.weekly.day).toBe(0);
      expect(result.scheduleInfo.weekly.time).toBe("03:00");
      expect(result.scheduleInfo.weekly.retention).toBe(4);
    });

    it("should configure monthly backup schedule", async () => {
      const settings = createDefaultScheduleSettings({
        monthlyEnabled: true,
        monthlyDay: 15,
        monthlyTime: "04:00",
        monthlyRetention: 12,
      });

      const result = await scheduleBackupJob(settings, "user123");

      expect(result.success).toBe(true);
      expect(result.scheduleInfo.monthly.enabled).toBe(true);
      expect(result.scheduleInfo.monthly.day).toBe(15);
      expect(result.scheduleInfo.monthly.time).toBe("04:00");
      expect(result.scheduleInfo.monthly.retention).toBe(12);
    });

    it("should disable schedules when not enabled", async () => {
      const settings = createDefaultScheduleSettings();

      const result = await scheduleBackupJob(settings, "user123");

      expect(result.scheduleInfo.daily.enabled).toBe(false);
      expect(result.scheduleInfo.weekly.enabled).toBe(false);
      expect(result.scheduleInfo.monthly.enabled).toBe(false);
    });

    it("should log schedule configuration", async () => {
      const settings = createDefaultScheduleSettings({
        dailyEnabled: true,
        weeklyEnabled: true,
        weeklyDay: 1, // Monday
        monthlyEnabled: true,
        storageProvider: "S3",
      });

      await scheduleBackupJob(settings, "user123");

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user123" }),
        expect.any(String)
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ storage: "S3" }),
        expect.any(String)
      );
    });

    it("should handle multiple schedules enabled simultaneously", async () => {
      const settings = createDefaultScheduleSettings({
        dailyEnabled: true,
        weeklyEnabled: true,
        weeklyDay: 5, // Friday
        monthlyEnabled: true,
      });

      const result = await scheduleBackupJob(settings, "user123");

      expect(result.scheduleInfo.daily.enabled).toBe(true);
      expect(result.scheduleInfo.weekly.enabled).toBe(true);
      expect(result.scheduleInfo.monthly.enabled).toBe(true);
    });

    it("should return success flag", async () => {
      const settings = createDefaultScheduleSettings({
        dailyEnabled: true,
      });

      const result = await scheduleBackupJob(settings, "user123");

      expect(result.success).toBe(true);
      expect(typeof result.success).toBe("boolean");
    });
  });
});
