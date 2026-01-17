/**
 * Unit tests for restore server business logic
 *
 * Tests cover:
 * - Validating backup files without importing
 * - Previewing import data and detecting conflicts
 * - Importing backup data with conflict resolution
 * - Retrieving import history for audit purposes
 * - Error handling and authorization checks
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { User } from "@vamsa/api";
import type { RestoreDb } from "@vamsa/lib/server/business";

// Use shared mock from test setup (logger is already mocked globally in preload)

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
  validateBackupData,
  previewImportData,
  importBackupData,
  getImportHistoryData,
} from "@vamsa/lib/server/business";

// Create mock database client - no mock.module() needed!
function createMockDb(): RestoreDb {
  return {
    person: {
      count: mock(() => Promise.resolve(0)),
    },
    user: {
      count: mock(() => Promise.resolve(0)),
    },
    relationship: {
      count: mock(() => Promise.resolve(0)),
    },
    suggestion: {
      count: mock(() => Promise.resolve(0)),
    },
    auditLog: {
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({})),
    },
    $transaction: mock((callback: (tx: any) => any) => {
      // Create a transaction proxy that has the same methods
      const tx = {
        auditLog: {
          create: mock(() => Promise.resolve({})),
        },
      };
      return callback(tx);
    }),
  } as unknown as RestoreDb & { $transaction: Function };
}

describe("Restore Server Functions", () => {
  let mockDb: RestoreDb;
  const adminUser = {
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin User",
    role: "ADMIN",
    personId: null,
    mustChangePassword: false,
    oidcProvider: null,
    profileClaimStatus: "UNCLAIMED",
  } as unknown as User;

  const memberUser = {
    id: "member-1",
    email: "member@example.com",
    name: "Member User",
    role: "MEMBER",
    personId: "p1",
    mustChangePassword: false,
    oidcProvider: null,
    profileClaimStatus: "CLAIMED",
  } as unknown as User;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
  });

  describe("validateBackupData", () => {
    it("should validate backup for admin user", async () => {
      const result = await validateBackupData(adminUser, mockDb);

      expect(result.isValid).toBe(true);
      expect(result.metadata).toBeTruthy();
      expect(result.metadata.exportedBy.id).toBe(adminUser.id);
      expect(result.metadata.exportedBy.email).toBe(adminUser.email);
      expect(Array.isArray(result.conflicts)).toBe(true);
      expect(result.statistics).toBeTruthy();
    });

    it("should reject non-admin users", async () => {
      const error = await validateBackupData(memberUser, mockDb).catch(
        (e) => e
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("Only administrators");
    });
  });

  describe("previewImportData", () => {
    it("should preview import data for admin user", async () => {
      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(
        5
      );
      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(2);
      (mockDb.relationship.count as ReturnType<typeof mock>).mockResolvedValueOnce(
        8
      );
      (mockDb.suggestion.count as ReturnType<typeof mock>).mockResolvedValueOnce(
        0
      );

      const result = await previewImportData(adminUser, mockDb);

      expect(result.statistics.existingItems.people).toBe(5);
      expect(result.statistics.existingItems.users).toBe(2);
      expect(result.statistics.existingItems.relationships).toBe(8);
      expect(result.statistics.existingItems.suggestions).toBe(0);
      expect(result.statistics.newItems).toBeTruthy();
      expect(result.estimatedDuration).toBeTruthy();
    });

    it("should reject non-admin users", async () => {
      const error = await previewImportData(memberUser, mockDb).catch(
        (e) => e
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("Only administrators");
    });

    it("should handle empty database", async () => {
      (mockDb.person.count as ReturnType<typeof mock>).mockResolvedValueOnce(
        0
      );
      (mockDb.user.count as ReturnType<typeof mock>).mockResolvedValueOnce(0);
      (mockDb.relationship.count as ReturnType<typeof mock>).mockResolvedValueOnce(
        0
      );
      (mockDb.suggestion.count as ReturnType<typeof mock>).mockResolvedValueOnce(
        0
      );

      const result = await previewImportData(adminUser, mockDb);

      expect(result.statistics.existingItems.people).toBe(0);
      expect(result.statistics.existingItems.users).toBe(0);
      expect(result.statistics.existingItems.relationships).toBe(0);
    });
  });

  describe("importBackupData", () => {
    it("should import backup data for admin user", async () => {
      const result = await importBackupData(
        adminUser,
        "skip",
        mockDb
      );

      expect(result.success).toBe(true);
      expect(result.importedAt).toBeTruthy();
      expect(result.importedBy.id).toBe(adminUser.id);
      expect(result.importedBy.email).toBe(adminUser.email);
      expect(result.strategy).toBe("skip");
      expect(result.statistics).toBeTruthy();
      expect(result.statistics.peopleImported).toBe(0);
    });

    it("should use default strategy 'skip' when not provided", async () => {
      const result = await importBackupData(adminUser, undefined, mockDb);

      expect(result.strategy).toBe("skip");
    });

    it("should support replace strategy", async () => {
      const result = await importBackupData(
        adminUser,
        "replace",
        mockDb
      );

      expect(result.strategy).toBe("replace");
    });

    it("should support merge strategy", async () => {
      const result = await importBackupData(
        adminUser,
        "merge",
        mockDb
      );

      expect(result.strategy).toBe("merge");
    });

    it("should reject non-admin users", async () => {
      const error = await importBackupData(memberUser, "skip", mockDb).catch(
        (e) => e
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("Only administrators");
    });

    it("should handle import errors gracefully", async () => {
      const mockDbWithError = createMockDb();
      // Mock $transaction to reject
      (mockDbWithError as any).$transaction = mock(() => {
        return Promise.reject(new Error("Database error"));
      });

      const error = await importBackupData(
        adminUser,
        "skip",
        mockDbWithError
      ).catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("Import failed");
    });
  });

  describe("getImportHistoryData", () => {
    it("should retrieve import history for admin user", async () => {
      const mockAuditLogs = [
        {
          id: "log-1",
          userId: "admin-1",
          action: "CREATE",
          entityType: "BACKUP_IMPORT",
          newData: {
            strategy: "skip",
            statistics: { peopleImported: 5 },
          },
          createdAt: new Date("2024-01-15"),
          user: {
            name: "Admin User",
            email: "admin@example.com",
          },
        },
        {
          id: "log-2",
          userId: "admin-1",
          action: "CREATE",
          entityType: "BACKUP_IMPORT_FAILED",
          newData: {
            error: "Validation failed",
          },
          createdAt: new Date("2024-01-14"),
          user: {
            name: "Admin User",
            email: "admin@example.com",
          },
        },
      ] as any;

      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockAuditLogs
      );

      const result = await getImportHistoryData(adminUser, mockDb);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("log-1");
      expect(result[0].success).toBe(true);
      expect(result[0].strategy).toBe("skip");
      expect(result[1].success).toBe(false);
    });

    it("should handle empty history", async () => {
      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      const result = await getImportHistoryData(adminUser, mockDb);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it("should reject non-admin users", async () => {
      const error = await getImportHistoryData(memberUser, mockDb).catch(
        (e) => e
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("Only administrators");
    });

    it("should handle query errors gracefully", async () => {
      const mockDbWithError = createMockDb();
      (mockDbWithError.auditLog.findMany as ReturnType<typeof mock>).mockRejectedValueOnce(
        new Error("Database error")
      );

      const error = await getImportHistoryData(adminUser, mockDbWithError).catch(
        (e) => e
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("History retrieval failed");
    });

    it("should display user name or email in history", async () => {
      const mockAuditLogs = [
        {
          id: "log-1",
          userId: "admin-1",
          action: "CREATE",
          entityType: "BACKUP_IMPORT",
          newData: { strategy: "skip" },
          createdAt: new Date(),
          user: {
            name: "Admin User",
            email: "admin@example.com",
          },
        },
        {
          id: "log-2",
          userId: "admin-2",
          action: "CREATE",
          entityType: "BACKUP_IMPORT",
          newData: { strategy: "replace" },
          createdAt: new Date(),
          user: {
            name: null,
            email: "admin2@example.com",
          },
        },
      ] as any;

      (mockDb.auditLog.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockAuditLogs
      );

      const result = await getImportHistoryData(adminUser, mockDb);

      expect(result[0].importedBy).toBe("Admin User");
      expect(result[1].importedBy).toBe("admin2@example.com");
    });
  });
});
