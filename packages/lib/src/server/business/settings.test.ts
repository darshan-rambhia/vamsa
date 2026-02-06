/**
 * Unit tests for settings server business logic
 *
 * Tests cover:
 * - getFamilySettingsData: Retrieving family settings with defaults
 * - updateFamilySettingsData: Creating and updating family settings
 * - getUserLanguagePreferenceData: Retrieving user language preferences
 * - setUserLanguagePreferenceData: Updating user language preferences
 *
 * Uses module mocking for database dependency injection.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllMocks, mockLogger } from "../../testing/shared-mocks";

import {
  getFamilySettingsData,
  getUserLanguagePreferenceData,
  setUserLanguagePreferenceData,
  updateFamilySettingsData,
} from "./settings";
import type { UpdateFamilySettingsInput } from "./settings";

// Create mock drizzle database
const mockDrizzleDb = {
  query: {
    familySettings: {
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
    users: {
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
  },
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
};

describe("Settings Business Logic", () => {
  beforeEach(() => {
    clearAllMocks();
    (
      mockDrizzleDb.query.familySettings.findFirst as ReturnType<typeof vi.fn>
    ).mockClear();
    (
      mockDrizzleDb.query.users.findFirst as ReturnType<typeof vi.fn>
    ).mockClear();
    (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockClear();
    (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockClear();
  });

  describe("getFamilySettingsData", () => {
    it("should return default family settings when none exist", async () => {
      (
        mockDrizzleDb.query.familySettings.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      const result = await getFamilySettingsData(mockDrizzleDb as any);

      expect(result).toEqual({
        id: null,
        familyName: "Our Family",
        description: "",
        allowSelfRegistration: true,
        requireApprovalForEdits: true,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {},
        "No family settings found, returning defaults"
      );
    });

    it("should return existing family settings from database", async () => {
      const mockSettings = {
        id: "settings-1",
        familyName: "Smith Family",
        description: "Our genealogy",
        allowSelfRegistration: false,
        requireApprovalForEdits: true,
        metricsDashboardUrl: "https://metrics.example.com",
        metricsApiUrl: "https://api.metrics.example.com",
      };

      (
        mockDrizzleDb.query.familySettings.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSettings);

      const result = await getFamilySettingsData(mockDrizzleDb as any);

      expect(result).toEqual(mockSettings);
    });

    it("should convert null values to empty string for description", async () => {
      const mockSettings = {
        id: "settings-1",
        familyName: "Test Family",
        description: null,
        allowSelfRegistration: true,
        requireApprovalForEdits: false,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      };

      (
        mockDrizzleDb.query.familySettings.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockSettings);

      const result = await getFamilySettingsData(mockDrizzleDb as any);

      expect(result.description).toBe("");
      expect(result.metricsDashboardUrl).toBeNull();
      expect(result.metricsApiUrl).toBeNull();
    });
  });

  describe("updateFamilySettingsData", () => {
    it("should create new settings when none exist", async () => {
      const updateData: UpdateFamilySettingsInput = {
        familyName: "New Family",
        description: "Our story",
        allowSelfRegistration: false,
        requireApprovalForEdits: true,
        metricsDashboardUrl: "https://dashboard.example.com",
      };

      const createdSettings = {
        id: "new-id",
        familyName: "New Family",
        description: "Our story",
        allowSelfRegistration: false,
        requireApprovalForEdits: true,
        metricsDashboardUrl: "https://dashboard.example.com",
        metricsApiUrl: null,
        updatedAt: new Date(),
      };

      // Mock: first findFirst returns null, insert returns created settings
      (
        mockDrizzleDb.query.familySettings.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      const mockReturning = vi.fn(() => Promise.resolve([createdSettings]));
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        values: vi.fn(() => ({ returning: mockReturning })),
      } as any);

      const result = await updateFamilySettingsData(
        updateData,
        "ADMIN",
        "user-123",
        mockDrizzleDb as any
      );

      expect(result.familyName).toBe("New Family");
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: "user-123", userRole: "ADMIN", updates: expect.any(Array) },
        "Updating family settings"
      );
    });

    it("should update existing settings", async () => {
      const existingSettings = {
        id: "settings-1",
        familyName: "Old Family",
        description: "Old story",
        allowSelfRegistration: true,
        requireApprovalForEdits: false,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      };

      const updateData: UpdateFamilySettingsInput = {
        familyName: "Updated Family",
        description: "Updated story",
        allowSelfRegistration: false,
        requireApprovalForEdits: true,
      };

      const updatedSettings = {
        id: "settings-1",
        familyName: "Updated Family",
        description: "Updated story",
        allowSelfRegistration: false,
        requireApprovalForEdits: true,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
        updatedAt: new Date(),
      };

      (
        mockDrizzleDb.query.familySettings.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(existingSettings);

      const mockReturning = vi.fn(() => Promise.resolve([updatedSettings]));
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: mockReturning })),
        })),
      } as any);

      const result = await updateFamilySettingsData(
        updateData,
        "ADMIN",
        "user-123",
        mockDrizzleDb as any
      );

      expect(result.familyName).toBe("Updated Family");
      expect(mockLogger.info).toHaveBeenCalledWith(
        { settingsId: "settings-1" },
        "Family settings updated"
      );
    });

    it("should handle null values in update data", async () => {
      const existingSettings = {
        id: "settings-1",
        familyName: "Family",
        description: "Description",
        allowSelfRegistration: true,
        requireApprovalForEdits: false,
        metricsDashboardUrl: "https://example.com",
        metricsApiUrl: "https://api.example.com",
      };

      const updateData: UpdateFamilySettingsInput = {
        familyName: "Family",
        description: undefined,
        allowSelfRegistration: true,
        requireApprovalForEdits: false,
        metricsDashboardUrl: null,
        metricsApiUrl: null,
      };

      (
        mockDrizzleDb.query.familySettings.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(existingSettings);

      const mockReturning = vi.fn(() =>
        Promise.resolve([{ ...existingSettings }])
      );
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: mockReturning })),
        })),
      } as any);

      await updateFamilySettingsData(
        updateData,
        "ADMIN",
        "user-123",
        mockDrizzleDb as any
      );

      expect(mockDrizzleDb.update).toHaveBeenCalled();
    });
  });

  describe("getUserLanguagePreferenceData", () => {
    it("should return user's language preference", async () => {
      const mockUser = {
        id: "user-123",
        preferredLanguage: "es",
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockUser);

      const result = await getUserLanguagePreferenceData(
        "user-123",
        mockDrizzleDb as any
      );

      expect(result).toBe("es");
    });

    it("should return default language when user has no preference", async () => {
      const mockUser = {
        id: "user-123",
        preferredLanguage: null,
      };

      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockUser);

      const result = await getUserLanguagePreferenceData(
        "user-123",
        mockDrizzleDb as any
      );

      expect(result).toBe("en");
    });

    it("should throw error when user not found", async () => {
      (
        mockDrizzleDb.query.users.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await getUserLanguagePreferenceData(
          "nonexistent-user",
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("User not found");
        expect(mockLogger.info).toHaveBeenCalledWith(
          { userId: "nonexistent-user" },
          "User not found when fetching language preference"
        );
      }
    });
  });

  describe("setUserLanguagePreferenceData", () => {
    it("should update user's language preference", async () => {
      const updateData = {
        id: "user-123",
        preferredLanguage: "hi",
      };

      const mockReturning = vi.fn(() => Promise.resolve([updateData]));
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: mockReturning })),
        })),
      } as any);

      const result = await setUserLanguagePreferenceData(
        "user-123",
        "hi",
        mockDrizzleDb as any
      );

      expect(result).toBe("hi");
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: "user-123", language: "hi" },
        "Language preference updated"
      );
    });

    it("should return default language when update returns null", async () => {
      const updateData = {
        id: "user-123",
        preferredLanguage: null,
      };

      const mockReturning = vi.fn(() => Promise.resolve([updateData]));
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ returning: mockReturning })),
        })),
      } as any);

      const result = await setUserLanguagePreferenceData(
        "user-123",
        "es",
        mockDrizzleDb as any
      );

      expect(result).toBe("en");
    });

    it("should handle various language codes", async () => {
      const languages = ["en", "hi", "es"];

      for (const lang of languages) {
        (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValueOnce({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() =>
                Promise.resolve([{ id: "user-123", preferredLanguage: lang }])
              ),
            })),
          })),
        } as any);

        const result = await setUserLanguagePreferenceData(
          "user-123",
          lang,
          mockDrizzleDb as any
        );

        expect(result).toBe(lang);
      }
    });
  });
});
