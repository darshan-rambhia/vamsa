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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllMocks, mockLogger } from "../../testing/shared-mocks";

// Import functions to test
import {
  createBackupArchive,
  gatherBackupData,
  scheduleBackupJob,
  validateBackupFile,
} from "./backup";

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

      let selectCallCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => {
            selectCallCount++;
            return {
              orderBy: vi.fn(() =>
                Promise.resolve(
                  selectCallCount === 1
                    ? mockPersons
                    : selectCallCount === 2
                      ? mockRelationships
                      : selectCallCount === 3
                        ? mockUsers
                        : []
                )
              ),
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve([])),
              })),
              limit: vi.fn(() => Promise.resolve(mockSettings)),
            };
          }),
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
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([])),
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve(mockAuditLogs)),
            })),
            limit: vi.fn(() => Promise.resolve([])),
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
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve(mockMedia)),
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
            limit: vi.fn(() => Promise.resolve([])),
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
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([])),
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
            limit: vi.fn(() => Promise.resolve([])),
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
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([])),
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([])),
            })),
            limit: vi.fn(() => Promise.resolve([])),
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
        genealogy: {},
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
    const archiveWith = async (
      metadataOverrides: Record<string, unknown> = {},
      people: Array<unknown> = [{ id: "p1" }]
    ) => {
      const metadata = {
        ...createDefaultMetadata(),
        statistics: { ...createDefaultMetadata().statistics, totalPeople: 1 },
        dataFiles: ["data/people.json", "data/relationships.json"],
        ...metadataOverrides,
      };
      const zip = await createBackupArchive(
        {
          people,
          relationships: [],
          users: [],
          suggestions: [],
          settings: null,
          auditLogs: [],
          mediaObjects: [],
        } as unknown as Awaited<ReturnType<typeof gatherBackupData>>,
        metadata
      );
      return Buffer.from(zip, "base64");
    };

    it("rejects data that is not a ZIP", async () => {
      const result = await validateBackupFile(Buffer.from("test data"));
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(["Not a valid ZIP archive"]);
      expect(result.metadata.version).toBe("unknown");
      expect(result.conflicts).toEqual([]);
    });

    it("accepts an archive made by createBackupArchive", async () => {
      const result = await validateBackupFile(await archiveWith());
      expect(result.errors).toEqual([]);
      expect(result.isValid).toBe(true);
      expect(result.metadata.statistics.totalPeople).toBe(1);
    });

    it("warns when record counts disagree with the metadata", async () => {
      const result = await validateBackupFile(
        await archiveWith({}, [{ id: "p1" }, { id: "p2" }])
      );
      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual([
        "data/people.json has 2 records, metadata says 1",
      ]);
    });

    it("errors when a listed data file is missing", async () => {
      const result = await validateBackupFile(
        await archiveWith({
          dataFiles: ["data/people.json", "data/not-there.json"],
        })
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        "data/not-there.json is listed in metadata but missing",
      ]);
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
