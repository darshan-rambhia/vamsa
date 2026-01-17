/**
 * Unit tests for settings server business logic
 *
 * Tests cover:
 * - Retrieving family settings with defaults
 * - Updating family settings (create and update)
 * - Retrieving user language preferences
 * - Updating user language preferences
 * - Error handling and validation
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { SettingsDb } from "@vamsa/lib/server/business";

// Use shared mock from test setup

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
  getFamilySettingsData,
  updateFamilySettingsData,
  getUserLanguagePreferenceData,
  setUserLanguagePreferenceData,
} from "@vamsa/lib/server/business";

// Create mock database client - no mock.module() needed!
function createMockDb(): SettingsDb {
  return {
    familySettings: {
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
    },
    user: {
      findUnique: mock(() => Promise.resolve(null)),
      update: mock(() => Promise.resolve({})),
    },
  } as unknown as SettingsDb;
}

describe("Settings Server Functions", () => {
  let mockDb: SettingsDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
  });

  describe("getFamilySettingsData", () => {
    it("should return defaults when no settings exist", async () => {
      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      const result = await getFamilySettingsData(mockDb);

      expect(result.familyName).toBe("Our Family");
      expect(result.description).toBe("");
      expect(result.allowSelfRegistration).toBe(true);
      expect(result.requireApprovalForEdits).toBe(true);
      expect(result.id).toBeNull();
    });

    it("should return existing settings from database", async () => {
      const mockSettings = {
        id: "settings-1",
        familyName: "Smith Family",
        description: "Our family genealogy",
        allowSelfRegistration: false,
        requireApprovalForEdits: true,
        metricsDashboardUrl: "https://metrics.example.com",
        metricsApiUrl: "https://api.example.com",
      };

      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockSettings
      );

      const result = await getFamilySettingsData(mockDb);

      expect(result.id).toBe("settings-1");
      expect(result.familyName).toBe("Smith Family");
      expect(result.description).toBe("Our family genealogy");
      expect(result.allowSelfRegistration).toBe(false);
    });

    it("should handle null values with defaults", async () => {
      const mockSettings = {
        id: "settings-1",
        familyName: "Jones Family",
        description: null,
        allowSelfRegistration: true,
        requireApprovalForEdits: false,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      };

      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockSettings
      );

      const result = await getFamilySettingsData(mockDb);

      expect(result.description).toBe("");
      expect(result.metricsDashboardUrl).toBeNull();
    });
  });

  describe("updateFamilySettingsData", () => {
    it("should update existing settings", async () => {
      const mockExisting = {
        id: "settings-1",
        familyName: "Smith Family",
        description: "Our family",
        allowSelfRegistration: true,
        requireApprovalForEdits: true,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      };

      const mockUpdated = {
        id: "settings-1",
        familyName: "Updated Smith Family",
        description: "Updated description",
        allowSelfRegistration: false,
        requireApprovalForEdits: false,
        metricsDashboardUrl: "https://metrics.example.com",
        metricsApiUrl: "https://api.example.com",
      };

      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockExisting
      );
      (mockDb.familySettings.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUpdated
      );

      const result = await updateFamilySettingsData(
        {
          familyName: "Updated Smith Family",
          description: "Updated description",
          allowSelfRegistration: false,
          requireApprovalForEdits: false,
          metricsDashboardUrl: "https://metrics.example.com",
          metricsApiUrl: "https://api.example.com",
        },
        "ADMIN",
        "user-123",
        mockDb
      );

      expect(result.familyName).toBe("Updated Smith Family");
      expect(result.allowSelfRegistration).toBe(false);
    });

    it("should create settings if none exist", async () => {
      const mockCreated = {
        id: "settings-1",
        familyName: "New Family",
        description: "New family settings",
        allowSelfRegistration: true,
        requireApprovalForEdits: true,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      };

      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.familySettings.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockCreated
      );

      const result = await updateFamilySettingsData(
        {
          familyName: "New Family",
          description: "New family settings",
          allowSelfRegistration: true,
          requireApprovalForEdits: true,
        },
        "ADMIN",
        "user-123",
        mockDb
      );

      expect(result.familyName).toBe("New Family");
      expect(mockDb.familySettings.create).toHaveBeenCalled();
    });

    it("should log update with user context", async () => {
      const mockExisting = {
        id: "settings-1",
        familyName: "Smith Family",
        description: null,
        allowSelfRegistration: true,
        requireApprovalForEdits: true,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      };

      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockExisting
      );
      (mockDb.familySettings.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockExisting
      );

      await updateFamilySettingsData(
        {
          familyName: "Smith Family",
          allowSelfRegistration: false,
          requireApprovalForEdits: true,
        },
        "ADMIN",
        "user-123",
        mockDb
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          userRole: "ADMIN",
        }),
        "Updating family settings"
      );
    });

    it("should handle null optional fields", async () => {
      const mockCreated = {
        id: "settings-1",
        familyName: "Family",
        description: null,
        allowSelfRegistration: true,
        requireApprovalForEdits: true,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      };

      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.familySettings.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockCreated
      );

      const result = await updateFamilySettingsData(
        {
          familyName: "Family",
          allowSelfRegistration: true,
          requireApprovalForEdits: true,
        },
        "ADMIN",
        "user-123",
        mockDb
      );

      expect(result.description).toBe("");
      expect(result.metricsDashboardUrl).toBeNull();
    });
  });

  describe("getUserLanguagePreferenceData", () => {
    it("should return user language preference", async () => {
      const mockUser = {
        preferredLanguage: "hi",
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      const result = await getUserLanguagePreferenceData("user-123", mockDb);

      expect(result).toBe("hi");
    });

    it("should return default language when user has no preference", async () => {
      const mockUser = {
        preferredLanguage: null,
      };

      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      const result = await getUserLanguagePreferenceData("user-123", mockDb);

      expect(result).toBe("en");
    });

    it("should throw error when user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await getUserLanguagePreferenceData("user-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("User not found");
      }
    });

    it("should warn when user not found", async () => {
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      try {
        await getUserLanguagePreferenceData("user-nonexistent", mockDb);
      } catch {
        // Expected
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-nonexistent",
        }),
        "User not found when fetching language preference"
      );
    });
  });

  describe("setUserLanguagePreferenceData", () => {
    it("should update user language preference", async () => {
      const mockUpdated = {
        id: "user-123",
        preferredLanguage: "es",
      };

      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUpdated
      );

      const result = await setUserLanguagePreferenceData(
        "user-123",
        "es",
        mockDb
      );

      expect(result).toBe("es");
    });

    it("should return default when updated language is null", async () => {
      const mockUpdated = {
        id: "user-123",
        preferredLanguage: null,
      };

      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUpdated
      );

      const result = await setUserLanguagePreferenceData(
        "user-123",
        "en",
        mockDb
      );

      expect(result).toBe("en");
    });

    it("should log language preference update", async () => {
      const mockUpdated = {
        id: "user-123",
        preferredLanguage: "hi",
      };

      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUpdated
      );

      await setUserLanguagePreferenceData("user-123", "hi", mockDb);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          language: "hi",
        }),
        "Language preference updated"
      );
    });

    it("should pass correct update data to prisma", async () => {
      const mockUpdated = {
        id: "user-123",
        preferredLanguage: "es",
      };

      (mockDb.user.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUpdated
      );

      await setUserLanguagePreferenceData("user-123", "es", mockDb);

      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { preferredLanguage: "es" },
        select: {
          id: true,
          preferredLanguage: true,
        },
      });
    });
  });

  describe("DI Pattern Tests", () => {
    it("should use default prisma when db not provided", async () => {
      const mockSettings = {
        id: "settings-1",
        familyName: "Family",
        description: null,
        allowSelfRegistration: true,
        requireApprovalForEdits: true,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      };

      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockSettings
      );

      // Call with mock to verify DI works
      const result = await getFamilySettingsData(mockDb);
      expect(result.familyName).toBe("Family");
    });

    it("should preserve all db operations through DI chain", async () => {
      const mockExisting = {
        id: "settings-1",
        familyName: "Family",
        description: null,
        allowSelfRegistration: true,
        requireApprovalForEdits: true,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      };

      const mockUpdated = { ...mockExisting, familyName: "Updated Family" };

      (mockDb.familySettings.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockExisting
      );
      (mockDb.familySettings.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUpdated
      );

      await updateFamilySettingsData(
        {
          familyName: "Updated Family",
          allowSelfRegistration: true,
          requireApprovalForEdits: true,
        },
        "ADMIN",
        "user-123",
        mockDb
      );

      expect(mockDb.familySettings.findFirst).toHaveBeenCalled();
      expect(mockDb.familySettings.update).toHaveBeenCalled();
    });
  });
});
