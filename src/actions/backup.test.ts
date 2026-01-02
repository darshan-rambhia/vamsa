import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { gatherBackupData, logBackupExport } from "./backup";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    person: {
      findMany: vi.fn(),
    },
    relationship: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    suggestion: {
      findMany: vi.fn(),
    },
    familySettings: {
      findFirst: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const { requireAdmin } = await import("@/lib/auth");
const { db } = await import("@/lib/db");

describe("gatherBackupData", () => {
  const mockSession = {
    id: "admin-123",
    email: "admin@example.com",
    name: "Admin User",
    role: "ADMIN" as const,
    personId: null,
    mustChangePassword: false,
  };

  const mockPeople = [
    {
      id: "person-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "person-2",
      firstName: "Jane",
      lastName: "Smith",
      email: null,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
  ];

  const mockRelationships = [
    {
      id: "rel-1",
      personId: "person-1",
      relatedPersonId: "person-2",
      type: "SPOUSE",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ];

  const mockUsers = [
    {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin User",
      personId: "person-1",
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
      invitedById: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      lastLoginAt: new Date("2024-01-01"),
    },
  ];

  const mockSuggestions = [
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
      submittedAt: new Date("2024-01-01"),
      reviewedAt: null,
    },
  ];

  const mockSettings = {
    id: "settings-1",
    familyName: "Test Family",
    description: "Test family tree",
    locale: "en",
    customLabels: {},
    defaultPrivacy: "PRIVATE",
    allowSelfRegistration: false,
    requireApprovalForEdits: true,
  };

  const mockAuditLogs = [
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
      createdAt: new Date("2024-01-01"),
    },
  ];

  const mockPeopleWithPhotos = [
    {
      id: "person-1",
      photoUrl: "/api/uploads/123456-photo.jpg",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(mockSession);

    // Mock database queries
    vi.mocked(db.person.findMany)
      .mockResolvedValueOnce(mockPeople as any) // First call for all people
      .mockResolvedValueOnce(mockPeopleWithPhotos as any); // Second call for people with photos

    vi.mocked(db.relationship.findMany).mockResolvedValue(
      mockRelationships as any
    );
    vi.mocked(db.user.findMany).mockResolvedValue(mockUsers as any);
    vi.mocked(db.suggestion.findMany).mockResolvedValue(mockSuggestions as any);
    vi.mocked(db.familySettings.findFirst).mockResolvedValue(
      mockSettings as any
    );
    vi.mocked(db.auditLog.findMany).mockResolvedValue(mockAuditLogs as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should require admin authentication", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    await expect(
      gatherBackupData({
        includePhotos: true,
        includeAuditLogs: true,
        auditLogDays: 90,
      })
    ).rejects.toThrow("Unauthorized");
  });

  it("should gather all data with default options", async () => {
    const result = await gatherBackupData({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    expect(result.metadata).toEqual({
      version: "1.0.0",
      exportedAt: expect.any(String),
      exportedBy: {
        id: "admin-123",
        email: "admin@example.com",
        name: "Admin User",
      },
      statistics: {
        totalPeople: 2,
        totalRelationships: 1,
        totalUsers: 1,
        totalSuggestions: 1,
        totalPhotos: 1,
        auditLogDays: 90,
        totalAuditLogs: 1,
      },
      dataFiles: [
        "data/people.json",
        "data/relationships.json",
        "data/users.json",
        "data/suggestions.json",
        "data/settings.json",
        "data/audit-logs.json",
      ],
      photoDirectories: ["photos/person-1/"],
    });

    expect(result.data).toEqual({
      people: mockPeople,
      relationships: mockRelationships,
      users: mockUsers,
      suggestions: mockSuggestions,
      settings: mockSettings,
      auditLogs: mockAuditLogs,
    });

    expect(result.photos).toEqual(mockPeopleWithPhotos);
  });

  it("should exclude audit logs when includeAuditLogs is false", async () => {
    // Reset mocks for this specific test
    vi.mocked(db.person.findMany)
      .mockResolvedValueOnce(mockPeople as any)
      .mockResolvedValueOnce([]); // No photos

    const result = await gatherBackupData({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    expect(result.metadata.dataFiles).not.toContain("data/audit-logs.json");
    expect(result.data.auditLogs).toBeUndefined();
    expect(result.metadata.statistics.totalAuditLogs).toBe(0);
  });

  it("should exclude photos when includePhotos is false", async () => {
    // Reset mocks for this specific test
    vi.mocked(db.person.findMany).mockResolvedValueOnce(mockPeople as any);

    const result = await gatherBackupData({
      includePhotos: false,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    expect(result.photos).toEqual([]);
    expect(result.metadata.statistics.totalPhotos).toBe(0);
    expect(result.metadata.photoDirectories).toEqual([]);
  });

  it("should filter audit logs by date range", async () => {
    // Reset mocks for this specific test
    vi.mocked(db.person.findMany)
      .mockResolvedValueOnce(mockPeople as any)
      .mockResolvedValueOnce([]);

    await gatherBackupData({
      includePhotos: false,
      includeAuditLogs: true,
      auditLogDays: 30,
    });

    expect(db.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: expect.any(Date),
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should handle null session name", async () => {
    const sessionWithoutName = { ...mockSession, name: null };
    vi.mocked(requireAdmin).mockResolvedValue(sessionWithoutName);

    // Reset mocks for this specific test
    vi.mocked(db.person.findMany)
      .mockResolvedValueOnce(mockPeople as any)
      .mockResolvedValueOnce([]);

    const result = await gatherBackupData({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    expect(result.metadata.exportedBy.name).toBeNull();
  });

  it("should handle empty database", async () => {
    // Reset all mocks to remove the beforeEach setup
    vi.mocked(db.person.findMany).mockReset();
    vi.mocked(db.relationship.findMany).mockReset();
    vi.mocked(db.user.findMany).mockReset();
    vi.mocked(db.suggestion.findMany).mockReset();
    vi.mocked(db.familySettings.findFirst).mockReset();
    vi.mocked(db.auditLog.findMany).mockReset();

    // Re-setup admin auth
    vi.mocked(requireAdmin).mockResolvedValue(mockSession);

    // Setup empty database mocks
    vi.mocked(db.person.findMany).mockResolvedValue([]);
    vi.mocked(db.relationship.findMany).mockResolvedValue([]);
    vi.mocked(db.user.findMany).mockResolvedValue([]);
    vi.mocked(db.suggestion.findMany).mockResolvedValue([]);
    vi.mocked(db.familySettings.findFirst).mockResolvedValue(null);
    vi.mocked(db.auditLog.findMany).mockResolvedValue([]);

    const result = await gatherBackupData({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    expect(result.metadata.statistics).toEqual({
      totalPeople: 0,
      totalRelationships: 0,
      totalUsers: 0,
      totalSuggestions: 0,
      totalPhotos: 0,
      auditLogDays: 90,
      totalAuditLogs: 0,
    });

    expect(result.data.settings).toBeNull();
  });

  it("should validate input parameters", async () => {
    await expect(
      gatherBackupData({
        includePhotos: true,
        includeAuditLogs: true,
        auditLogDays: 0, // Invalid: below minimum
      })
    ).rejects.toThrow();

    await expect(
      gatherBackupData({
        includePhotos: true,
        includeAuditLogs: true,
        auditLogDays: 366, // Invalid: above maximum
      })
    ).rejects.toThrow();
  });
});

describe("logBackupExport", () => {
  const mockSession = {
    id: "admin-123",
    email: "admin@example.com",
    name: "Admin User",
    role: "ADMIN" as const,
    personId: null,
    mustChangePassword: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(mockSession);
    vi.mocked(db.auditLog.create).mockResolvedValue({} as any);
  });

  it("should require admin authentication", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Unauthorized"));

    await expect(logBackupExport()).rejects.toThrow("Unauthorized");
  });

  it("should create audit log entry", async () => {
    await logBackupExport();

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "admin-123",
        action: "CREATE",
        entityType: "BACKUP_EXPORT",
        entityId: null,
        newData: {
          timestamp: expect.any(String),
          type: "full_export",
        },
      },
    });
  });

  it("should handle database errors", async () => {
    vi.mocked(db.auditLog.create).mockRejectedValue(
      new Error("Database error")
    );

    await expect(logBackupExport()).rejects.toThrow("Database error");
  });
});
