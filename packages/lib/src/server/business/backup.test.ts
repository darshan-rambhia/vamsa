/**
 * Unit tests for backup server business logic
 *
 * Tests cover:
 * - Gathering backup data from database
 * - Creating ZIP archives with metadata
 * - Validating backup file integrity
 * - Extracting data from backup archives
 * - Restoring data from backups with conflict resolution
 * - Scheduling backup jobs with cron patterns
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { BackupExportInput } from "@vamsa/schemas";
import type { BackupDb } from "@vamsa/lib/server/business";

// Mock logger for this test file
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../../tests/setup/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

// Import the functions to test
import {
  gatherBackupData,
  createBackupArchive,
  validateBackupFile,
  extractBackupData,
  restoreFromBackup,
  scheduleBackupJob,
} from "@vamsa/lib/server/business";

// Create mock database client - no mock.module() needed!
function createMockDb(): BackupDb {
  return {
    person: {
      findMany: mock(() => Promise.resolve([])),
    },
    relationship: {
      findMany: mock(() => Promise.resolve([])),
    },
    user: {
      findMany: mock(() => Promise.resolve([])),
    },
    suggestion: {
      findMany: mock(() => Promise.resolve([])),
    },
    familySettings: {
      findFirst: mock(() => Promise.resolve(null)),
    },
    auditLog: {
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({})),
    },
    mediaObject: {
      findMany: mock(() => Promise.resolve([])),
    },
  } as unknown as BackupDb;
}

describe("Backup Server Functions", () => {
  let mockDb: BackupDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
  });

  describe("gatherBackupData", () => {
    it("should gather all backup data without audit logs or photos", async () => {
      const mockPeople = [
        { id: "p1", firstName: "John", lastName: "Doe" },
        { id: "p2", firstName: "Jane", lastName: "Doe" },
      ] as any;
      const mockRelationships = [
        { id: "r1", personId: "p1", relatedPersonId: "p2", type: "SPOUSE" },
      ] as any;
      const mockUsers = [
        { id: "u1", email: "john@example.com", name: "John Doe" },
      ] as any;
      const mockSettings = { id: "s1", allowSelfRegistration: true } as any;

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPeople
      );
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockRelationships
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUsers
      );
      (mockDb.suggestion.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockSettings
      );

      const options: BackupExportInput = {
        auditLogDays: 90,
        includeAuditLogs: false,
        includePhotos: false,
      };

      const result = await gatherBackupData(options, mockDb);

      expect(result.people).toEqual(mockPeople);
      expect(result.relationships).toEqual(mockRelationships);
      expect(result.users).toEqual(mockUsers);
      expect(result.settings).toEqual(mockSettings);
      expect(result.auditLogs).toEqual([]);
      expect(result.mediaObjects).toEqual([]);
    });

    it("should gather audit logs when requested", async () => {
      const mockAuditLogs = [
        {
          id: "a1",
          userId: "u1",
          action: "CREATE",
          entityType: "PERSON",
          createdAt: new Date(),
        },
      ] as any;

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.suggestion.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockAuditLogs
      );

      const options: BackupExportInput = {
        auditLogDays: 90,
        includeAuditLogs: true,
        includePhotos: false,
      };

      const result = await gatherBackupData(options, mockDb);

      expect(result.auditLogs).toEqual(mockAuditLogs);
    });

    it("should gather media objects when requested", async () => {
      const mockMedia = [
        { id: "m1", filePath: "/path/to/photo.jpg", uploadedAt: new Date() },
      ] as any;

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.suggestion.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.mediaObject.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockMedia
      );

      const options: BackupExportInput = {
        auditLogDays: 90,
        includeAuditLogs: false,
        includePhotos: true,
      };

      const result = await gatherBackupData(options, mockDb);

      expect(result.mediaObjects).toEqual(mockMedia);
    });

    it("should handle empty data gracefully", async () => {
      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.user.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.suggestion.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      const options: BackupExportInput = {
        auditLogDays: 90,
        includeAuditLogs: false,
        includePhotos: false,
      };

      const result = await gatherBackupData(options, mockDb);

      expect(result.people).toEqual([]);
      expect(result.relationships).toEqual([]);
      expect(result.users).toEqual([]);
      expect(result.settings).toBeNull();
      expect(result.auditLogs).toEqual([]);
      expect(result.mediaObjects).toEqual([]);
    });
  });

  describe("createBackupArchive", () => {
    it("should create a valid ZIP archive with metadata", async () => {
      const data = {
        people: [],
        relationships: [],
        users: [],
        suggestions: [],
        settings: null,
        auditLogs: [],
        mediaObjects: [],
      };

      const metadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        exportedBy: { id: "u1", email: "admin@example.com", name: null as string | null },
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
      };

      const result = await createBackupArchive(data, metadata);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      // Base64 strings should match the pattern
      expect(/^[A-Za-z0-9+/=]+$/.test(result)).toBe(true);
    });
  });

  describe("validateBackupFile", () => {
    it("should return validation result for backup file", async () => {
      const buffer = Buffer.from("mock backup data");

      const result = await validateBackupFile(buffer);

      expect(result.isValid).toBe(true);
      expect(result.metadata).toBeTruthy();
      expect(Array.isArray(result.conflicts)).toBe(true);
      expect(result.statistics).toBeTruthy();
    });
  });

  describe("extractBackupData", () => {
    it("should extract backup data from archive", async () => {
      const buffer = Buffer.from("mock backup archive");

      const result = await extractBackupData(buffer);

      expect(result.metadata).toBeTruthy();
      expect(Array.isArray(result.people)).toBe(true);
      expect(Array.isArray(result.relationships)).toBe(true);
      expect(Array.isArray(result.users)).toBe(true);
    });
  });

  describe("restoreFromBackup", () => {
    it("should restore backup data with statistics", async () => {
      const extractedData: any = {
        metadata: {
          version: "1.0.0",
          exportedAt: new Date().toISOString(),
          exportedBy: { id: "u1", email: "admin@example.com", name: null },
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
      };

      const options = {
        strategy: "skip" as const,
        createBackupBeforeImport: false,
        importPhotos: true,
        importAuditLogs: false,
      };

      const result = await restoreFromBackup(extractedData, options, "user-1");

      expect(result.success).toBe(true);
      expect(result.importedAt).toBeTruthy();
      expect(result.importedBy.id).toBe("user-1");
      expect(result.strategy).toBe("skip");
      expect(result.statistics).toBeTruthy();
    });
  });

  describe("scheduleBackupJob", () => {
    it("should schedule backup jobs with daily schedule", async () => {
      const settings = {
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: false,
        weeklyDay: 0,
        weeklyTime: "03:00",
        monthlyEnabled: false,
        monthlyDay: 1,
        monthlyTime: "04:00",
        dailyRetention: 7,
        weeklyRetention: 4,
        monthlyRetention: 12,
        storageProvider: "LOCAL" as const,
        storageBucket: null,
        storageRegion: null,
        storagePath: "backups",
        includePhotos: true,
        includeAuditLogs: false,
        compressLevel: 6,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notificationEmails: null,
      };

      const result = await scheduleBackupJob(settings, "user-1");

      expect(result.success).toBe(true);
      expect((result.scheduleInfo as any).daily.enabled).toBe(true);
      expect((result.scheduleInfo as any).daily.time).toBe("02:00");
      expect((result.scheduleInfo as any).weekly.enabled).toBe(false);
      expect((result.scheduleInfo as any).monthly.enabled).toBe(false);
    });

    it("should schedule backup jobs with all schedules enabled", async () => {
      const settings = {
        dailyEnabled: true,
        dailyTime: "02:00",
        weeklyEnabled: true,
        weeklyDay: 0,
        weeklyTime: "03:00",
        monthlyEnabled: true,
        monthlyDay: 1,
        monthlyTime: "04:00",
        dailyRetention: 7,
        weeklyRetention: 4,
        monthlyRetention: 12,
        storageProvider: "LOCAL" as const,
        storageBucket: null,
        storageRegion: null,
        storagePath: "backups",
        includePhotos: true,
        includeAuditLogs: false,
        compressLevel: 6,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notificationEmails: null,
      };

      const result = await scheduleBackupJob(settings, "user-1");

      expect(result.success).toBe(true);
      expect((result.scheduleInfo as any).daily.enabled).toBe(true);
      expect((result.scheduleInfo as any).weekly.enabled).toBe(true);
      expect((result.scheduleInfo as any).monthly.enabled).toBe(true);
    });
  });
});
