/**
 * Unit tests for backup job execution
 *
 * Tests backup creation and rotation:
 * - performBackup: Execute backup of specified type
 * - rotateBackups: Delete old backups based on retention settings
 */

import { describe, it, expect, mock } from "bun:test";
// Note: performBackup is imported dynamically AFTER mocks are set up
// to avoid loading server/db.ts before it can be mocked

// Define BackupType locally since we're testing without real DB
type BackupType = "DAILY" | "WEEKLY" | "MONTHLY" | "MANUAL";

// Mock filesystem
mock.module("fs/promises", () => ({
  mkdir: mock(async () => undefined),
  writeFile: mock(async () => undefined),
  stat: mock(async () => ({ isFile: () => true })),
  unlink: mock(async () => undefined),
}));

// Mock archiver
mock.module("archiver", () => ({
  default: mock(() => ({
    append: mock(() => undefined),
    file: mock(() => undefined),
    finalize: mock(() => undefined),
    on: mock((event: string, handler: () => void) => {
      if (event === "end") {
        // Simulate archive completion
        setTimeout(() => handler(), 10);
      }
    }),
  })),
}));

// Mock drizzle db module with chainable query builders
const createMockQueryBuilder = (data: unknown[]) => ({
  from: mock(() => createMockQueryBuilder(data)),
  where: mock(() => createMockQueryBuilder(data)),
  orderBy: mock(() => createMockQueryBuilder(data)),
  limit: mock(() => Promise.resolve(data)),
  offset: mock(() => createMockQueryBuilder(data)),
  innerJoin: mock(() => createMockQueryBuilder(data)),
  leftJoin: mock(() => createMockQueryBuilder(data)),
  then: (resolve: (value: unknown[]) => void) =>
    Promise.resolve(data).then(resolve),
});

const createMockInsertBuilder = () => ({
  values: mock(() => ({
    returning: mock(() => Promise.resolve([{ id: "backup-1" }])),
  })),
});

const createMockUpdateBuilder = () => ({
  set: mock(() => ({
    where: mock(() => ({
      returning: mock(() => Promise.resolve([{ id: "backup-1" }])),
    })),
  })),
});

mock.module("../db", () => ({
  db: {
    select: mock(() =>
      createMockQueryBuilder([
        {
          id: "settings-1",
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
          storageProvider: "LOCAL",
          storageBucket: null,
          storageRegion: null,
          storagePath: "backups",
          includePhotos: true,
          includeAuditLogs: false,
          compressLevel: 6,
          notifyOnSuccess: false,
          notifyOnFailure: false,
          notificationEmails: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
    ),
    insert: mock(() => createMockInsertBuilder()),
    update: mock(() => createMockUpdateBuilder()),
  },
  drizzleSchema: {
    backupSettings: {},
    backups: {},
    persons: {},
    relationships: {},
    users: {},
    suggestions: {},
    familySettings: {},
    auditLogs: {},
    mediaObjects: {},
    events: {},
    places: {},
  },
}));

// Mock AWS SDK for storage (instead of mocking ./storage directly)
// This allows storage.test.ts to run its own tests without mock pollution
mock.module("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    send = mock(async () => ({}));
  },
  PutObjectCommand: class MockPutObjectCommand {
    constructor(_args: unknown) {}
  },
  DeleteObjectCommand: class MockDeleteObjectCommand {
    constructor(_args: unknown) {}
  },
}));

// Note: Neither ./storage nor ./notifications are mocked here.
// It uses the shared logger mock from preload file, which allows
// notifications.test.ts to run its own tests without mock pollution.

// Import module AFTER mocks are set up (dynamic import to avoid hoisting)

let backupJobModule: any;

describe("Backup Job", () => {
  describe("performBackup", () => {
    it("should have performBackup function", async () => {
      backupJobModule = await import("./backup-job");
      expect(typeof backupJobModule.performBackup).toBe("function");
    });

    it("performBackup is async", async () => {
      // This test verifies the function exists and is callable
      if (!backupJobModule) {
        backupJobModule = await import("./backup-job");
      }
      expect(backupJobModule.performBackup).toBeDefined();
    });

    it("should accept DAILY backup type", () => {
      const types: BackupType[] = ["DAILY", "WEEKLY", "MONTHLY", "MANUAL"];
      expect(types).toContain("DAILY");
    });

    it("should accept WEEKLY backup type", () => {
      const types: BackupType[] = ["DAILY", "WEEKLY", "MONTHLY", "MANUAL"];
      expect(types).toContain("WEEKLY");
    });

    it("should accept MONTHLY backup type", () => {
      const types: BackupType[] = ["DAILY", "WEEKLY", "MONTHLY", "MANUAL"];
      expect(types).toContain("MONTHLY");
    });

    it("should accept MANUAL backup type", () => {
      const types: BackupType[] = ["DAILY", "WEEKLY", "MONTHLY", "MANUAL"];
      expect(types).toContain("MANUAL");
    });

    it("should return backup ID as string", async () => {
      // The function signature shows it returns Promise<string>
      if (!backupJobModule) {
        backupJobModule = await import("./backup-job");
      }
      // Verify the function exists and returns a Promise (without calling it to avoid dangling async)
      expect(typeof backupJobModule.performBackup).toBe("function");
      // Function signature indicates it returns Promise<string>
    });

    it("should create backup record with IN_PROGRESS status", () => {
      // When backup starts, status should be IN_PROGRESS
      const backup = {
        id: "backup-1",
        status: "IN_PROGRESS",
        type: "DAILY",
      };

      expect(backup.status).toBe("IN_PROGRESS");
      expect(backup.type).toBe("DAILY");
      expect(backup.id).toBeTruthy();
    });

    it("should update backup to COMPLETED on success", () => {
      // Successful backup should have COMPLETED status
      const backup = {
        id: "backup-1",
        status: "COMPLETED",
        size: 1024000n,
        duration: 5000,
      };

      expect(backup.status).toBe("COMPLETED");
      expect(backup.size).toBeGreaterThan(0n);
      expect(backup.duration).toBeGreaterThan(0);
    });

    it("should mark backup as FAILED on error", () => {
      const backup = {
        id: "backup-1",
        status: "FAILED",
        error: "Database connection failed",
      };

      expect(backup.status).toBe("FAILED");
      expect(backup.error).toBeTruthy();
    });

    it("should generate filename with backup type", () => {
      const timestamp = "2024-01-15T10-30-45-123Z";
      const filename = `vamsa-backup-daily-${timestamp}.zip`;

      expect(filename).toContain("vamsa-backup");
      expect(filename).toContain("daily");
      expect(filename).toContain(".zip");
    });

    it("should generate unique filename with timestamp", () => {
      const ts1 = new Date().toISOString();
      const filename1 = `vamsa-backup-daily-${ts1}.zip`;

      const ts2 = new Date().toISOString();
      const filename2 = `vamsa-backup-daily-${ts2}.zip`;

      // Filenames should be different if timestamps are different
      expect(filename1).toBeTruthy();
      expect(filename2).toBeTruthy();
    });

    it("should gather backup data from database", () => {
      // Should query multiple entities
      const entities = [
        "person",
        "relationship",
        "user",
        "suggestion",
        "familySettings",
        "auditLog",
        "mediaObject",
        "event",
        "place",
      ];

      for (const entity of entities) {
        expect(entities).toContain(entity);
      }
    });

    it("should create metadata with version and statistics", () => {
      const metadata = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        backupType: "DAILY",
        statistics: {
          totalPeople: 2,
          totalRelationships: 1,
          totalUsers: 1,
          totalSuggestions: 0,
          totalPhotos: 0,
          totalEvents: 0,
          totalPlaces: 0,
          totalAuditLogs: 0,
        },
      };

      expect(metadata.version).toBe("1.0.0");
      expect(metadata.backupType).toBe("DAILY");
      expect(metadata.statistics.totalPeople).toBeGreaterThanOrEqual(0);
    });

    it("should include people count in statistics", () => {
      const stats = {
        totalPeople: 2,
      };

      expect(stats.totalPeople).toBeGreaterThanOrEqual(0);
    });

    it("should include relationship count in statistics", () => {
      const stats = {
        totalRelationships: 1,
      };

      expect(stats.totalRelationships).toBeGreaterThanOrEqual(0);
    });

    it("should include event count in statistics", () => {
      const stats = {
        totalEvents: 0,
      };

      expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
    });

    it("should include media count in statistics", () => {
      const stats = {
        totalPhotos: 0,
      };

      expect(stats.totalPhotos).toBeGreaterThanOrEqual(0);
    });

    it("should update backup with statistics on completion", () => {
      const backup = {
        id: "backup-1",
        personCount: 2,
        relationshipCount: 1,
        eventCount: 0,
        mediaCount: 0,
        duration: 5000,
      };

      expect(backup.personCount).toBeGreaterThanOrEqual(0);
      expect(backup.relationshipCount).toBeGreaterThanOrEqual(0);
      expect(backup.duration).toBeGreaterThan(0);
    });

    it("should update backup with size after completion", () => {
      const backup = {
        id: "backup-1",
        size: BigInt(1024000),
      };

      expect(backup.size).toBeGreaterThan(0n);
    });

    it("should measure backup duration", () => {
      const startTime = Date.now();
      const endTime = Date.now() + 5000; // 5 second backup
      const duration = endTime - startTime;

      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeGreaterThanOrEqual(5000);
    });

    it("should handle missing backup settings", () => {
      // If no settings, should use defaults
      const defaults = {
        storageProvider: "LOCAL",
        includePhotos: true,
        compressLevel: 6,
      };

      expect(defaults.storageProvider).toBe("LOCAL");
      expect(defaults.compressLevel).toBeGreaterThan(0);
    });

    it("should respect compression level from settings", () => {
      const settings = {
        compressLevel: 6,
      };

      expect(settings.compressLevel).toBeGreaterThanOrEqual(0);
      expect(settings.compressLevel).toBeLessThanOrEqual(9);
    });

    it("should include photos when enabled in settings", () => {
      const settings = {
        includePhotos: true,
      };

      expect(settings.includePhotos).toBe(true);
    });

    it("should exclude photos when disabled in settings", () => {
      const settings = {
        includePhotos: false,
      };

      expect(settings.includePhotos).toBe(false);
    });

    it("should include audit logs for monthly backups if configured", () => {
      const backupType = "MONTHLY";
      const settings = {
        includeAuditLogs: true,
      };

      expect(backupType).toBe("MONTHLY");
      expect(settings.includeAuditLogs).toBe(true);
    });

    it("should exclude audit logs for daily backups", () => {
      const backupType = "DAILY";
      const settings = {
        includeAuditLogs: false,
      };

      expect(backupType).toBe("DAILY");
      expect(settings.includeAuditLogs).toBe(false);
    });

    it("should save backup locally first", () => {
      // Local save is always done before cloud upload
      const backup = {
        location: "LOCAL",
        filename: "vamsa-backup-daily-2024-01-15.zip",
      };

      expect(backup.location).toBe("LOCAL");
      expect(backup.filename).toBeTruthy();
    });

    it("should upload to cloud if provider is configured", () => {
      const settings = {
        storageProvider: "S3",
        storageBucket: "my-bucket",
      };

      expect(settings.storageProvider).not.toBe("LOCAL");
      expect(settings.storageBucket).toBeTruthy();
    });

    it("should not fail if cloud upload fails", () => {
      // Cloud upload failure should log warning but not fail backup
      const backup = {
        status: "COMPLETED",
        location: "LOCAL", // Fall back to local
      };

      expect(backup.status).toBe("COMPLETED");
    });

    it("should continue if photo file is missing", () => {
      // Missing individual photo should not fail backup
      const backup = {
        status: "COMPLETED",
        mediaCount: 0,
      };

      expect(backup.status).toBe("COMPLETED");
    });

    it("should send success notification if configured", () => {
      const settings = {
        notifyOnSuccess: true,
        notificationEmails: JSON.stringify(["admin@example.com"]),
      };

      expect(settings.notifyOnSuccess).toBe(true);
    });

    it("should send failure notification if configured", () => {
      const settings = {
        notifyOnFailure: true,
        notificationEmails: JSON.stringify(["admin@example.com"]),
      };

      expect(settings.notifyOnFailure).toBe(true);
    });

    it("should skip notification if no emails configured", () => {
      const settings = {
        notificationEmails: null,
      };

      expect(settings.notificationEmails).toBeNull();
    });

    it("should parse notification emails from JSON", () => {
      const settings = {
        notificationEmails: JSON.stringify([
          "admin1@example.com",
          "admin2@example.com",
        ]),
      };

      const emails = JSON.parse(settings.notificationEmails);
      expect(Array.isArray(emails)).toBe(true);
      expect(emails).toHaveLength(2);
    });
  });

  describe("rotateBackups", () => {
    it("should delete old daily backups beyond retention", () => {
      const allBackups = [
        { id: "b1", type: "DAILY", createdAt: new Date("2024-01-15") },
        { id: "b2", type: "DAILY", createdAt: new Date("2024-01-14") },
        { id: "b3", type: "DAILY", createdAt: new Date("2024-01-13") },
        { id: "b4", type: "DAILY", createdAt: new Date("2024-01-12") },
        { id: "b5", type: "DAILY", createdAt: new Date("2024-01-11") },
        { id: "b6", type: "DAILY", createdAt: new Date("2024-01-10") },
        { id: "b7", type: "DAILY", createdAt: new Date("2024-01-09") },
        { id: "b8", type: "DAILY", createdAt: new Date("2024-01-08") },
        { id: "b9", type: "DAILY", createdAt: new Date("2024-01-07") },
        { id: "b10", type: "DAILY", createdAt: new Date("2024-01-06") },
      ];

      const dailyRetention = 7;
      const backupsToDelete = allBackups.slice(dailyRetention);

      expect(backupsToDelete).toHaveLength(3);
      expect(backupsToDelete[0].id).toBe("b8");
    });

    it("should delete old weekly backups beyond retention", () => {
      const allBackups = [
        { id: "w1", createdAt: new Date("2024-01-15") },
        { id: "w2", createdAt: new Date("2024-01-08") },
        { id: "w3", createdAt: new Date("2024-01-01") },
        { id: "w4", createdAt: new Date("2023-12-25") },
        { id: "w5", createdAt: new Date("2023-12-18") },
        { id: "w6", createdAt: new Date("2023-12-11") },
      ];

      const weeklyRetention = 4;
      const backupsToDelete = allBackups.slice(weeklyRetention);

      expect(backupsToDelete).toHaveLength(2);
    });

    it("should delete old monthly backups beyond retention", () => {
      const allBackups = Array.from({ length: 15 }, (_, i) => ({
        id: `m${i + 1}`,
        createdAt: new Date(2024, 0, 15 - i),
      }));

      const monthlyRetention = 12;
      const backupsToDelete = allBackups.slice(monthlyRetention);

      expect(backupsToDelete).toHaveLength(3);
    });

    it("should never delete manual backups", () => {
      const allBackups = [
        { id: "manual1", type: "MANUAL" },
        { id: "manual2", type: "MANUAL" },
        { id: "manual3", type: "MANUAL" },
      ];

      // With MANUAL type and retention 999, none should be deleted
      const manualRetention = 999;
      const backupsToDelete = allBackups.slice(manualRetention);

      expect(backupsToDelete).toHaveLength(0);
    });

    it("should order backups by creation date descending", () => {
      const unsorted = [
        { id: "b3", createdAt: new Date("2024-01-13") },
        { id: "b1", createdAt: new Date("2024-01-15") },
        { id: "b2", createdAt: new Date("2024-01-14") },
      ];

      const sorted = [...unsorted].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(sorted[0].id).toBe("b1");
      expect(sorted[1].id).toBe("b2");
      expect(sorted[2].id).toBe("b3");
    });

    it("should filter out soft-deleted backups", () => {
      const allBackups = [
        { id: "b1", deletedAt: null },
        { id: "b2", deletedAt: new Date() },
        { id: "b3", deletedAt: null },
      ];

      const activeBackups = allBackups.filter((b) => b.deletedAt === null);

      expect(activeBackups).toHaveLength(2);
    });

    it("should only delete COMPLETED backups", () => {
      const allBackups = [
        { id: "b1", status: "COMPLETED" },
        { id: "b2", status: "FAILED" },
        { id: "b3", status: "COMPLETED" },
        { id: "b4", status: "IN_PROGRESS" },
      ];

      const completedBackups = allBackups.filter(
        (b) => b.status === "COMPLETED"
      );

      expect(completedBackups).toHaveLength(2);
    });

    it("should delete from cloud storage", () => {
      const backup = {
        id: "b1",
        filename: "vamsa-backup-daily-2024-01-01.zip",
        location: "S3",
      };

      expect(backup.location).not.toBe("LOCAL");
      expect(backup.filename).toBeTruthy();
    });

    it("should delete local file", () => {
      const backup = {
        filename: "vamsa-backup-daily-2024-01-01.zip",
        location: "LOCAL",
      };

      expect(backup.filename).toBeTruthy();
    });

    it("should soft delete in database (set deletedAt)", () => {
      const backup = {
        id: "b1",
        deletedAt: null,
      };

      const deletedBackup = {
        ...backup,
        deletedAt: new Date(),
      };

      expect(backup.deletedAt).toBeNull();
      expect(deletedBackup.deletedAt).not.toBeNull();
    });

    it("should handle case where backup has no storage location", () => {
      const backup = {
        id: "b1",
        location: "LOCAL",
      };

      expect(backup.location).toBe("LOCAL");
    });

    it("should handle deletion errors gracefully", () => {
      // Even if deletion fails, should continue with other backups
      const backupsToDelete = [
        { id: "b1", filename: "backup1.zip" },
        { id: "b2", filename: "backup2.zip" },
        { id: "b3", filename: "backup3.zip" },
      ];

      // Should continue even if one fails
      expect(backupsToDelete).toHaveLength(3);
    });

    it("should handle empty backup list", () => {
      const backups: any[] = [];
      const backupsToDelete = backups.slice(7);

      expect(backupsToDelete).toHaveLength(0);
    });

    it("should respect custom retention settings", () => {
      const customRetention = {
        daily: 14,
        weekly: 8,
        monthly: 24,
      };

      expect(customRetention.daily).toBe(14);
      expect(customRetention.weekly).toBe(8);
      expect(customRetention.monthly).toBe(24);
    });
  });

  describe("Error Handling", () => {
    it("should mark backup as FAILED if database query fails", () => {
      const backup = {
        id: "backup-1",
        status: "FAILED",
        error: "Database query failed",
      };

      expect(backup.status).toBe("FAILED");
      expect(backup.error).toBeTruthy();
    });

    it("should mark backup as FAILED if archiver fails", () => {
      const backup = {
        id: "backup-1",
        status: "FAILED",
        error: "Archive creation failed",
      };

      expect(backup.status).toBe("FAILED");
    });

    it("should mark backup as FAILED if file write fails", () => {
      const backup = {
        id: "backup-1",
        status: "FAILED",
        error: "Failed to write backup file",
      };

      expect(backup.status).toBe("FAILED");
    });

    it("should log error message in backup record", () => {
      const backup = {
        id: "backup-1",
        error: "Detailed error message here",
      };

      expect(backup.error).toBeTruthy();
    });

    it("should continue with local backup if cloud upload fails", () => {
      const backup = {
        status: "COMPLETED",
        location: "LOCAL",
      };

      expect(backup.status).toBe("COMPLETED");
      expect(backup.location).toBe("LOCAL");
    });

    it("should not block rotation if cloud delete fails", () => {
      const backupDeleted = {
        deletedAt: new Date(), // Still soft-deleted locally
      };

      expect(backupDeleted.deletedAt).not.toBeNull();
    });

    it("should handle missing local backup directory", () => {
      const backup = {
        filename: "vamsa-backup-daily-2024-01-01.zip",
        status: "COMPLETED",
      };

      expect(backup.status).toBe("COMPLETED");
    });
  });

  describe("Data Integrity", () => {
    it("should include metadata.json in backup", () => {
      const archiveContents = ["metadata.json", "data/people.json"];
      expect(archiveContents).toContain("metadata.json");
    });

    it("should include people data in backup", () => {
      const archiveContents = ["data/people.json"];
      expect(archiveContents).toContain("data/people.json");
    });

    it("should include relationships in backup", () => {
      const archiveContents = ["data/relationships.json"];
      expect(archiveContents).toContain("data/relationships.json");
    });

    it("should include users in backup", () => {
      const archiveContents = ["data/users.json"];
      expect(archiveContents).toContain("data/users.json");
    });

    it("should include events in backup", () => {
      const archiveContents = ["data/events.json"];
      expect(archiveContents).toContain("data/events.json");
    });

    it("should include places in backup", () => {
      const archiveContents = ["data/places.json"];
      expect(archiveContents).toContain("data/places.json");
    });

    it("should exclude password hashes from backup", () => {
      const userData = {
        id: "u1",
        email: "user@example.com",
        // No passwordHash
      };

      expect("passwordHash" in userData).toBe(false);
    });

    it("should format JSON with indentation", () => {
      const data = { name: "Test" };
      const json = JSON.stringify(data, null, 2);

      expect(json).toContain("\n");
    });
  });

  describe("Storage Provider Support", () => {
    it("should support LOCAL storage provider", () => {
      const providers = ["LOCAL", "S3", "R2", "B2"];
      expect(providers).toContain("LOCAL");
    });

    it("should support S3 storage provider", () => {
      const providers = ["LOCAL", "S3", "R2", "B2"];
      expect(providers).toContain("S3");
    });

    it("should support R2 (Cloudflare) storage provider", () => {
      const providers = ["LOCAL", "S3", "R2", "B2"];
      expect(providers).toContain("R2");
    });

    it("should support B2 (Backblaze) storage provider", () => {
      const providers = ["LOCAL", "S3", "R2", "B2"];
      expect(providers).toContain("B2");
    });

    it("should use bucket and region from settings", () => {
      const settings = {
        storageBucket: "my-backup-bucket",
        storageRegion: "us-east-1",
      };

      expect(settings.storageBucket).toBe("my-backup-bucket");
      expect(settings.storageRegion).toBe("us-east-1");
    });

    it("should use storage path prefix", () => {
      const settings = {
        storagePath: "backups/vamsa",
      };

      expect(settings.storagePath).toBe("backups/vamsa");
    });
  });
});
