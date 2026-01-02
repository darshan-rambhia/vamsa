import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConflictResolver } from "./conflict-resolver";
import type { Conflict } from "@/schemas/backup";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    familySettings: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    person: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    relationship: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    suggestion: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

const { db } = await import("@/lib/db");

describe("ConflictResolver", () => {
  let resolver: ConflictResolver;
  const mockImportedBy = {
    id: "admin-123",
    email: "admin@example.com",
    name: "Admin User",
  };

  const mockExtractedFiles = new Map([
    [
      "data/settings.json",
      {
        familyName: "Test Family",
        description: "Test description",
        locale: "en",
        customLabels: {},
        defaultPrivacy: "PRIVATE",
        allowSelfRegistration: false,
        requireApprovalForEdits: true,
      },
    ],
    [
      "data/people.json",
      [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          createdAt: "2024-01-01T12:00:00.000Z",
          updatedAt: "2024-01-01T12:00:00.000Z",
        },
        {
          id: "person-2",
          firstName: "Jane",
          lastName: "Smith",
          email: null,
          createdAt: "2024-01-02T12:00:00.000Z",
          updatedAt: "2024-01-02T12:00:00.000Z",
        },
      ],
    ],
    [
      "data/users.json",
      [
        {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin User",
          personId: "person-1",
          role: "ADMIN",
          isActive: true,
          mustChangePassword: false,
          invitedById: null,
          createdAt: "2024-01-01T12:00:00.000Z",
          updatedAt: "2024-01-01T12:00:00.000Z",
          lastLoginAt: "2024-01-01T12:00:00.000Z",
        },
      ],
    ],
    [
      "data/relationships.json",
      [
        {
          id: "rel-1",
          personId: "person-1",
          relatedPersonId: "person-2",
          type: "SPOUSE",
          marriageDate: null,
          divorceDate: null,
          isActive: true,
          createdAt: "2024-01-01T12:00:00.000Z",
          updatedAt: "2024-01-01T12:00:00.000Z",
        },
      ],
    ],
    [
      "data/suggestions.json",
      [
        {
          id: "suggestion-1",
          type: "PERSON_UPDATE",
          targetPersonId: "person-1",
          suggestedData: { bio: "Updated bio" },
          reason: "Missing information",
          status: "PENDING",
          submittedById: "user-1",
          reviewedById: null,
          reviewNote: null,
          submittedAt: "2024-01-01T12:00:00.000Z",
          reviewedAt: null,
        },
      ],
    ],
    [
      "data/audit-logs.json",
      [
        {
          id: "audit-1",
          userId: "user-1",
          action: "CREATE",
          entityType: "PERSON",
          entityId: "person-1",
          previousData: null,
          newData: { firstName: "John", lastName: "Doe" },
          ipAddress: "127.0.0.1",
          userAgent: "test-agent",
          createdAt: "2024-01-01T12:00:00.000Z",
        },
      ],
    ],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful database operations by default
    vi.mocked(db.familySettings.findFirst).mockResolvedValue(null);
    vi.mocked(db.familySettings.create).mockResolvedValue({} as any);
    vi.mocked(db.familySettings.update).mockResolvedValue({} as any);
    vi.mocked(db.person.findUnique).mockResolvedValue(null);
    vi.mocked(db.person.create).mockResolvedValue({} as any);
    vi.mocked(db.person.update).mockResolvedValue({} as any);
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(db.user.create).mockResolvedValue({} as any);
    vi.mocked(db.user.update).mockResolvedValue({} as any);
    vi.mocked(db.relationship.findUnique).mockResolvedValue(null);
    vi.mocked(db.relationship.create).mockResolvedValue({} as any);
    vi.mocked(db.relationship.update).mockResolvedValue({} as any);
    vi.mocked(db.suggestion.create).mockResolvedValue({} as any);
    vi.mocked(db.auditLog.create).mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Skip Strategy", () => {
    beforeEach(() => {
      resolver = new ConflictResolver("skip", mockImportedBy);
    });

    it("should skip importing settings when they already exist", async () => {
      // Mock existing settings
      vi.mocked(db.familySettings.findFirst).mockResolvedValue({
        id: "existing-settings",
        familyName: "Existing Family",
      } as any);

      // Mock user lookup for suggestions and audit logs to succeed
      // Need to mock multiple calls since both suggestions and audit logs check for user
      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce({
          id: "user-1",
          email: "admin@example.com",
        } as any)
        .mockResolvedValueOnce({
          id: "user-1",
          email: "admin@example.com",
        } as any);

      // Mock person lookup for suggestions to succeed
      vi.mocked(db.person.findUnique).mockResolvedValue({
        id: "person-1",
        firstName: "John",
      } as any);

      const result = await resolver.importData(mockExtractedFiles, []);

      expect(result.warnings).toContain(
        "Skipped family settings (already exists)"
      );
      expect(result.statistics.skippedItems).toBe(1);
      expect(db.familySettings.update).not.toHaveBeenCalled();
      expect(db.familySettings.create).not.toHaveBeenCalled();
    });

    it("should skip people with conflicts", async () => {
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "person-1",
          existingData: {},
          newData: { id: "person-1" },
          conflictFields: ["firstName"],
          severity: "medium",
          description: "Person conflict",
        },
      ];

      // Mock user lookup for suggestions and audit logs to succeed
      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce({
          id: "user-1",
          email: "admin@example.com",
        } as any)
        .mockResolvedValueOnce({
          id: "user-1",
          email: "admin@example.com",
        } as any);

      // Mock person lookup for suggestions to succeed
      vi.mocked(db.person.findUnique).mockResolvedValue({
        id: "person-1",
        firstName: "John",
      } as any);

      const result = await resolver.importData(mockExtractedFiles, conflicts);

      expect(result.warnings).toContain(
        "Skipped person John Doe due to conflicts"
      );
      expect(result.statistics.skippedItems).toBe(1);
      expect(result.statistics.peopleImported).toBe(1); // Only person-2 imported
    });

    it("should skip users with conflicts", async () => {
      const conflicts: Conflict[] = [
        {
          type: "user",
          action: "update",
          existingId: "user-1",
          existingData: {},
          newData: { id: "user-1" },
          conflictFields: ["email"],
          severity: "high",
          description: "User conflict",
        },
      ];

      const result = await resolver.importData(mockExtractedFiles, conflicts);

      expect(result.warnings).toContain(
        "Skipped user admin@example.com due to conflicts"
      );
      // When user is skipped, suggestions and audit logs will also be skipped due to missing user reference
      expect(result.statistics.skippedItems).toBe(3); // user + suggestion + audit log
      expect(result.statistics.usersImported).toBe(0);
    });
  });

  describe("Replace Strategy", () => {
    beforeEach(() => {
      resolver = new ConflictResolver("replace", mockImportedBy);
    });

    it("should replace existing settings", async () => {
      // Mock existing settings
      vi.mocked(db.familySettings.findFirst).mockResolvedValue({
        id: "existing-settings",
        familyName: "Existing Family",
      } as any);

      const result = await resolver.importData(mockExtractedFiles, []);

      expect(db.familySettings.update).toHaveBeenCalledWith({
        where: { id: "existing-settings" },
        data: expect.objectContaining({
          familyName: "Test Family",
          description: "Test description",
        }),
      });
      expect(result.statistics.conflictsResolved).toBe(1);
    });

    it("should replace existing people", async () => {
      // Mock existing person
      vi.mocked(db.person.findUnique).mockResolvedValue({
        id: "person-1",
        firstName: "Existing John",
      } as any);

      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "person-1",
          existingData: {},
          newData: { id: "person-1" },
          conflictFields: ["firstName"],
          severity: "medium",
          description: "Person conflict",
        },
      ];

      const result = await resolver.importData(mockExtractedFiles, conflicts);

      expect(db.person.update).toHaveBeenCalledWith({
        where: { id: "person-1" },
        data: expect.objectContaining({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        }),
      });
      expect(result.statistics.conflictsResolved).toBe(1);
      expect(result.statistics.peopleImported).toBe(2);
    });

    it("should create new person when existing not found", async () => {
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "person-1",
          existingData: {},
          newData: { id: "person-1" },
          conflictFields: ["firstName"],
          severity: "medium",
          description: "Person conflict",
        },
      ];

      const result = await resolver.importData(mockExtractedFiles, conflicts);

      expect(db.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
        }),
      });
      expect(result.statistics.peopleImported).toBe(2);
    });
  });

  describe("Merge Strategy", () => {
    beforeEach(() => {
      resolver = new ConflictResolver("merge", mockImportedBy);
    });

    it("should merge settings with existing data", async () => {
      // Mock existing settings
      vi.mocked(db.familySettings.findFirst).mockResolvedValue({
        id: "existing-settings",
        familyName: "Existing Family",
        description: null,
      } as any);

      const result = await resolver.importData(mockExtractedFiles, []);

      expect(db.familySettings.update).toHaveBeenCalledWith({
        where: { id: "existing-settings" },
        data: expect.objectContaining({
          familyName: "Test Family", // Updated
          description: "Test description", // Added
          // Other fields should be included too
        }),
      });
      expect(result.statistics.conflictsResolved).toBe(1);
    });

    it("should merge people data", async () => {
      // Mock existing person
      vi.mocked(db.person.findUnique).mockResolvedValue({
        id: "person-1",
        firstName: "Existing John",
        lastName: "Doe",
        email: null,
        bio: "Existing bio",
      } as any);

      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "person-1",
          existingData: {},
          newData: { id: "person-1" },
          conflictFields: ["firstName", "email"],
          severity: "medium",
          description: "Person conflict",
        },
      ];

      const result = await resolver.importData(mockExtractedFiles, conflicts);

      expect(db.person.update).toHaveBeenCalledWith({
        where: { id: "person-1" },
        data: expect.objectContaining({
          firstName: "John", // Updated
          email: "john@example.com", // Added
          // bio should be preserved from existing
        }),
      });
      expect(result.statistics.conflictsResolved).toBe(1);
    });

    it("should skip high severity conflicts even in merge mode", async () => {
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "create",
          existingId: "existing-person",
          existingData: {},
          newData: { id: "person-1" },
          conflictFields: ["email"],
          severity: "high",
          description: "High severity conflict",
        },
      ];

      // Mock user lookup for suggestions and audit logs to succeed
      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce({
          id: "user-1",
          email: "admin@example.com",
        } as any)
        .mockResolvedValueOnce({
          id: "user-1",
          email: "admin@example.com",
        } as any);

      // Mock person lookup for suggestions to succeed
      vi.mocked(db.person.findUnique).mockResolvedValue({
        id: "person-1",
        firstName: "John",
      } as any);

      const result = await resolver.importData(mockExtractedFiles, conflicts);

      expect(result.warnings).toContain(
        "Skipped person John Doe due to conflicts"
      );
      expect(result.statistics.skippedItems).toBe(1);
    });
  });

  describe("Data Import Order", () => {
    beforeEach(() => {
      resolver = new ConflictResolver("replace", mockImportedBy);
    });

    it("should import data in correct order", async () => {
      // Mock user lookup for suggestions and audit logs to succeed
      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce({
          id: "user-1",
          email: "admin@example.com",
        } as any)
        .mockResolvedValueOnce({
          id: "user-1",
          email: "admin@example.com",
        } as any);

      // Mock person lookup for suggestions to succeed
      vi.mocked(db.person.findUnique).mockResolvedValue({
        id: "person-1",
        firstName: "John",
      } as any);

      const result = await resolver.importData(mockExtractedFiles, []);

      // Verify all data types were imported
      expect(result.statistics.peopleImported).toBe(2);
      expect(result.statistics.usersImported).toBe(1);
      expect(result.statistics.relationshipsImported).toBe(1);
      expect(result.statistics.suggestionsImported).toBe(1);
      expect(result.statistics.auditLogsImported).toBe(1);
    });

    it("should skip suggestions with missing references", async () => {
      // Mock user not found
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      const result = await resolver.importData(mockExtractedFiles, []);

      expect(result.warnings).toContain(
        "Skipped suggestion suggestion-1 - submitter not found"
      );
      expect(result.warnings).toContain(
        "Skipped audit log audit-1 - user not found"
      );
      expect(result.statistics.skippedItems).toBe(2); // suggestion + audit log
      expect(result.statistics.suggestionsImported).toBe(0);
    });

    it("should skip audit logs with missing user references", async () => {
      // Mock user not found for audit log
      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce({ id: "user-1" } as any) // For suggestion check
        .mockResolvedValueOnce(null); // For audit log check

      const result = await resolver.importData(mockExtractedFiles, []);

      expect(result.warnings).toContain(
        "Skipped audit log audit-1 - user not found"
      );
      expect(result.statistics.auditLogsImported).toBe(0);
    });
  });

  describe("Data Preparation", () => {
    beforeEach(() => {
      resolver = new ConflictResolver("replace", mockImportedBy);
    });

    it("should prepare people data correctly", async () => {
      await resolver.importData(mockExtractedFiles, []);

      expect(db.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });
    });

    it("should prepare user data correctly", async () => {
      await resolver.importData(mockExtractedFiles, []);

      expect(db.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: "user-1",
          email: "admin@example.com",
          name: "Admin User",
          personId: "person-1",
          role: "ADMIN",
          isActive: true,
          mustChangePassword: false,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          lastLoginAt: expect.any(Date),
        }),
      });
    });

    it("should prepare relationship data correctly", async () => {
      await resolver.importData(mockExtractedFiles, []);

      expect(db.relationship.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: "rel-1",
          personId: "person-1",
          relatedPersonId: "person-2",
          type: "SPOUSE",
          marriageDate: null,
          divorceDate: null,
          isActive: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      resolver = new ConflictResolver("replace", mockImportedBy);
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(db.person.create).mockRejectedValue(
        new Error("Database error")
      );

      const result = await resolver.importData(mockExtractedFiles, []);

      expect(result.errors).toContain(
        "Failed to import person John Doe: Database error"
      );
    });

    it("should handle missing data files gracefully", async () => {
      const emptyFiles = new Map();

      const result = await resolver.importData(emptyFiles, []);

      expect(result.statistics.peopleImported).toBe(0);
      expect(result.statistics.usersImported).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle invalid data gracefully", async () => {
      const invalidFiles = new Map([["data/people.json", "not an array"]]);

      const result = await resolver.importData(invalidFiles, []);

      expect(result.statistics.peopleImported).toBe(0);
      expect(result.errors).toHaveLength(0); // Should not crash
    });
  });

  describe("Statistics Tracking", () => {
    beforeEach(() => {
      resolver = new ConflictResolver("replace", mockImportedBy);
    });

    it("should track import statistics correctly", async () => {
      const conflicts: Conflict[] = [
        {
          type: "person",
          action: "update",
          existingId: "person-1",
          existingData: {},
          newData: { id: "person-1" },
          conflictFields: ["firstName"],
          severity: "medium",
          description: "Person conflict",
        },
      ];

      // Mock existing person for conflict resolution
      vi.mocked(db.person.findUnique).mockResolvedValue({
        id: "person-1",
        firstName: "Existing",
      } as any);

      // Mock user lookup for suggestions and audit logs to succeed
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
      } as any);

      const result = await resolver.importData(mockExtractedFiles, conflicts);

      expect(result.statistics).toEqual({
        peopleImported: 2,
        relationshipsImported: 1,
        usersImported: 1,
        suggestionsImported: 1,
        photosImported: 0,
        auditLogsImported: 1,
        conflictsResolved: 1,
        skippedItems: 0,
      });
    });
  });
});
