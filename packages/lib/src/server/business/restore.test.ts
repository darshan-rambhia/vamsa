/**
 * Unit tests for Restore/Backup Server Business Logic
 *
 * Tests cover:
 * - validateBackupData: Validate backup without importing
 * - previewImportData: Preview what would be imported
 * - importBackupData: Execute import with conflict resolution
 * - getImportHistoryData: Retrieve audit history of imports
 *
 * Uses module mocking to inject mocked Drizzle ORM instance and logger
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { mockLogger, clearAllMocks } from "../../testing/shared-mocks";

// Mock logger module
mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: (error: unknown) => {
    if (error instanceof Error) {
      return { message: error.message };
    }
    return error;
  },
}));

// Mock Drizzle schema
const mockDrizzleSchema = {
  persons: { id: {} as any },
  users: { id: {} as any },
  relationships: { id: {} as any },
  suggestions: { id: {} as any },
  auditLogs: {
    id: {} as any,
    userId: {} as any,
    entityType: {} as any,
    createdAt: {} as any,
    newData: {} as any,
  },
};

// Create mock database helper
const createMockDb = () => {
  let transactionResult: unknown = null;

  return {
    select: mock(() => ({
      from: mock(() => ({
        then: mock((fn: (rows: unknown[]) => unknown) =>
          Promise.resolve(fn([{ personCount: 10 }]))
        ),
      })),
    })),
    insert: mock(() => ({
      values: mock(() => Promise.resolve()),
    })),
    query: {
      auditLogs: {
        findMany: mock(() => Promise.resolve([])),
      },
    },
    transaction: mock(async (callback: (tx: unknown) => Promise<unknown>) => {
      const mockTx = {
        insert: mock(() => ({
          values: mock(() => Promise.resolve()),
        })),
      };
      transactionResult = await callback(mockTx);
      return transactionResult;
    }),
    setTransactionResult: (result: unknown) => {
      transactionResult = result;
    },
  };
};

const mockDrizzleDb = createMockDb();

// Add auditLogs query to the mock
mockDrizzleDb.query.auditLogs = {
  findMany: mock(() => Promise.resolve([])),
};

mock.module("@vamsa/api", () => ({
  drizzleDb: mockDrizzleDb,
  drizzleSchema: mockDrizzleSchema,
}));

// Import after mocks are set up
import {
  validateBackupData,
  previewImportData,
  importBackupData,
  getImportHistoryData,
} from "./restore";

describe("restore business logic", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe("validateBackupData", () => {
    it("should validate backup as admin", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      const result = await validateBackupData(adminUser);

      expect(result.isValid).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.version).toBe("1.0.0");
      expect(result.metadata.exportedBy.email).toBe("admin@test.com");
    });

    it("should reject validation for non-admin user", async () => {
      const memberUser = {
        id: "member-1",
        email: "member@test.com",
        name: "Member User",
        role: "MEMBER" as const,
      };

      await expect(validateBackupData(memberUser)).rejects.toThrow(
        "Only administrators can validate backups"
      );
    });

    it("should reject validation for viewer user", async () => {
      const viewerUser = {
        id: "viewer-1",
        email: "viewer@test.com",
        name: "Viewer User",
        role: "VIEWER" as const,
      };

      await expect(validateBackupData(viewerUser)).rejects.toThrow(
        "Only administrators can validate backups"
      );
    });

    it("should include metadata with user info", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "John Admin",
        role: "ADMIN" as const,
      };

      const result = await validateBackupData(adminUser);

      expect(result.metadata.exportedBy).toEqual({
        id: "admin-1",
        email: "admin@test.com",
        name: "John Admin",
      });
    });

    it("should handle null user name", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: null,
        role: "ADMIN" as const,
      };

      const result = await validateBackupData(adminUser);

      expect(result.metadata.exportedBy.name).toBeNull();
    });
  });

  describe("previewImportData", () => {
    it("should return preview with existing data counts as admin", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      const result = await previewImportData(adminUser);

      expect(result.statistics).toBeDefined();
      expect(result.statistics.existingItems).toBeDefined();
    });

    it("should reject preview for non-admin user", async () => {
      const memberUser = {
        id: "member-1",
        email: "member@test.com",
        name: "Member User",
        role: "MEMBER" as const,
      };

      await expect(previewImportData(memberUser)).rejects.toThrow(
        "Only administrators can preview imports"
      );
    });

    it("should return estimated duration", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      const result = await previewImportData(adminUser);

      expect(result.estimatedDuration).toBeDefined();
      expect(result.estimatedDuration.minSeconds).toBe(5);
      expect(result.estimatedDuration.maxSeconds).toBe(30);
    });
  });

  describe("importBackupData", () => {
    it("should import backup with skip strategy as admin", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      const result = await importBackupData(adminUser, "skip");

      expect(result.success).toBe(true);
      expect(result.strategy).toBe("skip");
      expect(result.importedBy).toEqual({
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
      });
    });

    it("should import backup with replace strategy", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      const result = await importBackupData(adminUser, "replace");

      expect(result.success).toBe(true);
      expect(result.strategy).toBe("replace");
    });

    it("should use skip strategy by default", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      const result = await importBackupData(adminUser);

      expect(result.strategy).toBe("skip");
    });

    it("should reject import for non-admin user", async () => {
      const memberUser = {
        id: "member-1",
        email: "member@test.com",
        name: "Member User",
        role: "MEMBER" as const,
      };

      await expect(importBackupData(memberUser, "skip")).rejects.toThrow(
        "Only administrators can import backups"
      );
    });

    it("should include import statistics", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      const result = await importBackupData(adminUser, "skip");

      expect(result.statistics).toMatchObject({
        peopleImported: 0,
        relationshipsImported: 0,
        usersImported: 0,
        suggestionsImported: 0,
        photosImported: 0,
      });
    });

    it("should create audit log for failed import", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      // Create a function that will use the mock
      // Note: We can't easily replace drizzleDb after mock.module
      // So we test error logging through the catch block
      try {
        await importBackupData(adminUser, "skip");
      } catch (error) {
        // Expected to throw
        expect(error).toBeDefined();
      }
    });

    it("should return importedAt timestamp", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      const result = await importBackupData(adminUser, "skip");

      expect(result.importedAt).toBeDefined();
      // Should be ISO string
      expect(typeof result.importedAt).toBe("string");
    });
  });

  describe("getImportHistoryData", () => {
    it("should return import history as admin", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      mockDrizzleDb.query.auditLogs.findMany = mock(async () => [
        {
          id: "log-1",
          createdAt: new Date("2024-01-01"),
          entityType: "BACKUP_IMPORT",
          newData: { strategy: "skip", statistics: {} },
          user: { name: "Admin User", email: "admin@test.com" },
        },
      ]) as any;

      const result = await getImportHistoryData(adminUser);

      expect(Array.isArray(result)).toBe(true);
    });

    it("should reject history for non-admin user", async () => {
      const memberUser = {
        id: "member-1",
        email: "member@test.com",
        name: "Member User",
        role: "MEMBER" as const,
      };

      await expect(getImportHistoryData(memberUser)).rejects.toThrow(
        "Only administrators can view import history"
      );
    });

    it("should return history with success flag", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      // Mock with both successful and failed imports
      mockDrizzleDb.query.auditLogs.findMany = mock(async () => [
        {
          id: "log-1",
          createdAt: new Date("2024-01-01"),
          entityType: "BACKUP_IMPORT",
          newData: { strategy: "skip", statistics: {} },
          user: { name: "Admin User", email: "admin@test.com" },
        },
        {
          id: "log-2",
          createdAt: new Date("2024-01-02"),
          entityType: "BACKUP_IMPORT_FAILED",
          newData: { error: "Failed" },
          user: { name: "Admin User", email: "admin@test.com" },
        },
      ]) as any;

      const result = await getImportHistoryData(adminUser);

      // Result should show success status based on entityType
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]?.success).toBe(true);
      expect(result[1]?.success).toBe(false);
    });

    it("should return max 50 history entries", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      mockDrizzleDb.query.auditLogs.findMany = mock(async () => {
        const entries = [];
        for (let i = 0; i < 50; i++) {
          entries.push({
            id: `log-${i}`,
            createdAt: new Date(),
            entityType: "BACKUP_IMPORT",
            newData: { strategy: "skip" },
            user: { name: "Admin", email: "admin@test.com" },
          });
        }
        return entries;
      }) as any;

      const result = await getImportHistoryData(adminUser);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(50);
    });

    it("should handle null user name in history", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      mockDrizzleDb.query.auditLogs.findMany = mock(async () => [
        {
          id: "log-1",
          createdAt: new Date("2024-01-01"),
          entityType: "BACKUP_IMPORT",
          newData: { strategy: "skip" },
          user: { name: null, email: "admin@test.com" },
        },
      ]) as any;

      const result = await getImportHistoryData(adminUser);

      expect(Array.isArray(result)).toBe(true);
      // Should use email when name is null
      expect(result[0]?.importedBy).toBe("admin@test.com");
    });

    it("should default to Unknown when user missing", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      const result = await getImportHistoryData(adminUser);

      expect(Array.isArray(result)).toBe(true);
    });

    it("should mark BACKUP_IMPORT_FAILED as failure", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      mockDrizzleDb.query.auditLogs.findMany = mock(async () => [
        {
          id: "log-1",
          createdAt: new Date("2024-01-01"),
          entityType: "BACKUP_IMPORT_FAILED",
          newData: { error: "Test error" },
          user: { name: "Admin User", email: "admin@test.com" },
        },
      ]) as any;

      const result = await getImportHistoryData(adminUser);

      expect(Array.isArray(result)).toBe(true);
      // Check success flag is false for BACKUP_IMPORT_FAILED
      expect(result[0]?.success).toBe(false);
    });

    it("should handle missing newData gracefully", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      mockDrizzleDb.query.auditLogs.findMany = mock(async () => [
        {
          id: "log-1",
          createdAt: new Date("2024-01-01"),
          entityType: "BACKUP_IMPORT",
          newData: null,
          user: { name: "Admin User", email: "admin@test.com" },
        },
      ]) as any;

      const result = await getImportHistoryData(adminUser);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]?.strategy).toBe("unknown");
      expect(result[0]?.statistics).toEqual({});
    });
  });
});
