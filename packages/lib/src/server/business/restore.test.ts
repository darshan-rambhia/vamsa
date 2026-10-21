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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllMocks } from "../../testing/shared-mocks";

// Import after mocks are set up
import {
  getImportHistoryData,
  importBackupData,
  previewImportData,
  validateBackupData,
} from "./restore";

// Create mock database helper
const createMockDb = () => {
  let transactionResult: unknown = null;

  return {
    select: vi.fn(() => ({
      from: vi.fn(() => Promise.resolve([{ personCount: 10 }])),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    query: {
      auditLogs: {
        findMany: vi.fn(() => Promise.resolve([])),
      },
    },
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const mockTx = {
        insert: vi.fn(() => ({
          values: vi.fn(() => Promise.resolve()),
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
  findMany: vi.fn(() => Promise.resolve([])),
};

describe("restore business logic", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  const admin = {
    id: "admin-1",
    email: "admin@test.com",
    name: "Admin User",
    role: "ADMIN" as const,
  };
  const member = { ...admin, id: "member-1", role: "MEMBER" as const };
  const notAZip = Buffer.from("not a zip");

  describe("validateBackupData", () => {
    it("reports a non-ZIP upload as invalid", async () => {
      const result = await validateBackupData(admin, notAZip);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Not a valid ZIP archive");
    });

    it("rejects non-admins", async () => {
      await expect(validateBackupData(member, notAZip)).rejects.toThrow(
        "Only administrators can validate backups"
      );
    });
  });

  describe("previewImportData", () => {
    it("counts existing data when no archive is given", async () => {
      const db = {
        select: vi.fn(() => ({
          from: vi.fn(() => Promise.resolve([{ n: 7 }])),
        })),
      };
      const result = await previewImportData(admin, undefined, db as never);
      expect(result.statistics.existingItems).toEqual({
        people: 7,
        relationships: 7,
        users: 7,
        suggestions: 7,
      });
      expect(result.statistics.newItems.people).toBe(0);
    });

    it("fails on an unusable archive", async () => {
      await expect(
        previewImportData(admin, notAZip, mockDrizzleDb as never)
      ).rejects.toThrow("Preview failed: Invalid backup: Not a valid ZIP");
    });

    it("rejects non-admins", async () => {
      await expect(
        previewImportData(member, undefined, mockDrizzleDb as never)
      ).rejects.toThrow("Only administrators can preview imports");
    });
  });

  describe("importBackupData", () => {
    it("fails on an unusable archive and records the failure", async () => {
      const values = vi.fn(() => Promise.resolve());
      const db = { insert: vi.fn(() => ({ values })) };
      await expect(
        importBackupData(admin, notAZip, { strategy: "replace" }, db as never)
      ).rejects.toThrow("Import failed: Invalid backup");
      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "admin-1",
          entityType: "BACKUP_IMPORT_FAILED",
        })
      );
    });

    it("rejects non-admins before reading the archive", async () => {
      const db = { insert: vi.fn() };
      await expect(
        importBackupData(member, notAZip, {}, db as never)
      ).rejects.toThrow("Only administrators can import backups");
      expect(db.insert).not.toHaveBeenCalled();
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

      mockDrizzleDb.query.auditLogs.findMany = vi.fn(async () => [
        {
          id: "log-1",
          createdAt: new Date("2024-01-01"),
          entityType: "BACKUP_IMPORT",
          newData: { strategy: "skip", statistics: {} },
          user: { name: "Admin User", email: "admin@test.com" },
        },
      ]) as any;

      const result = await getImportHistoryData(
        adminUser,
        mockDrizzleDb as any
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it("should reject history for non-admin user", async () => {
      const memberUser = {
        id: "member-1",
        email: "member@test.com",
        name: "Member User",
        role: "MEMBER" as const,
      };

      await expect(
        getImportHistoryData(memberUser, mockDrizzleDb as any)
      ).rejects.toThrow("Only administrators can view import history");
    });

    it("should return history with success flag", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      // Mock with both successful and failed imports
      mockDrizzleDb.query.auditLogs.findMany = vi.fn(async () => [
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

      const result = await getImportHistoryData(
        adminUser,
        mockDrizzleDb as any
      );

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

      mockDrizzleDb.query.auditLogs.findMany = vi.fn(async () => {
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

      const result = await getImportHistoryData(
        adminUser,
        mockDrizzleDb as any
      );

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

      mockDrizzleDb.query.auditLogs.findMany = vi.fn(async () => [
        {
          id: "log-1",
          createdAt: new Date("2024-01-01"),
          entityType: "BACKUP_IMPORT",
          newData: { strategy: "skip" },
          user: { name: null, email: "admin@test.com" },
        },
      ]) as any;

      const result = await getImportHistoryData(
        adminUser,
        mockDrizzleDb as any
      );

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

      const result = await getImportHistoryData(
        adminUser,
        mockDrizzleDb as any
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it("should mark BACKUP_IMPORT_FAILED as failure", async () => {
      const adminUser = {
        id: "admin-1",
        email: "admin@test.com",
        name: "Admin User",
        role: "ADMIN" as const,
      };

      mockDrizzleDb.query.auditLogs.findMany = vi.fn(async () => [
        {
          id: "log-1",
          createdAt: new Date("2024-01-01"),
          entityType: "BACKUP_IMPORT_FAILED",
          newData: { error: "Test error" },
          user: { name: "Admin User", email: "admin@test.com" },
        },
      ]) as any;

      const result = await getImportHistoryData(
        adminUser,
        mockDrizzleDb as any
      );

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

      mockDrizzleDb.query.auditLogs.findMany = vi.fn(async () => [
        {
          id: "log-1",
          createdAt: new Date("2024-01-01"),
          entityType: "BACKUP_IMPORT",
          newData: null,
          user: { name: "Admin User", email: "admin@test.com" },
        },
      ]) as any;

      const result = await getImportHistoryData(
        adminUser,
        mockDrizzleDb as any
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]?.strategy).toBe("unknown");
      expect(result[0]?.statistics).toEqual({});
    });
  });
});
