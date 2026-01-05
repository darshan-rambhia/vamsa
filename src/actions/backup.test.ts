import { describe, it, expect } from "bun:test";
import { gatherBackupDataCore, logBackupExportCore } from "./backup";
import type { BackupDependencies, AuthSession } from "@/lib/backup/types";

// Create mock session
const createMockSession = (): AuthSession => ({
  id: "admin-123",
  email: "admin@example.com",
  name: "Admin User",
  role: "ADMIN",
  personId: null,
  mustChangePassword: false,
});

// Mock data
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

// Create mock dependencies for testing
function createMockDependencies(
  overrides: Partial<BackupDependencies> = {}
): BackupDependencies {
  const mockSession = createMockSession();
  let personFindManyCallCount = 0;

  return {
    requireAdmin: async () => mockSession,
    db: {
      person: {
        findMany: async () => {
          personFindManyCallCount++;
          // First call returns all people, second call returns people with photos
          return personFindManyCallCount === 1
            ? mockPeople
            : mockPeopleWithPhotos;
        },
      },
      relationship: {
        findMany: async () => mockRelationships,
      },
      user: {
        findMany: async () => mockUsers,
      },
      suggestion: {
        findMany: async () => mockSuggestions,
      },
      familySettings: {
        findFirst: async () => mockSettings,
      },
      auditLog: {
        findMany: async () => mockAuditLogs,
        create: async () => ({}),
      },
    } as any,
    ...overrides,
  };
}

describe("gatherBackupDataCore", () => {
  it("should require admin authentication", async () => {
    const deps = createMockDependencies({
      requireAdmin: async () => {
        throw new Error("Unauthorized");
      },
    });

    await expect(
      gatherBackupDataCore(
        {
          includePhotos: true,
          includeAuditLogs: true,
          auditLogDays: 90,
        },
        deps
      )
    ).rejects.toThrow("Unauthorized");
  });

  it("should gather all data with default options", async () => {
    const deps = createMockDependencies();

    const result = await gatherBackupDataCore(
      {
        includePhotos: true,
        includeAuditLogs: true,
        auditLogDays: 90,
      },
      deps
    );

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

    expect(result.data.people).toEqual(mockPeople);
    expect(result.data.relationships).toEqual(mockRelationships);
    expect(result.data.users).toEqual(mockUsers);
    expect(result.data.suggestions).toEqual(mockSuggestions);
    expect(result.data.settings).toEqual(mockSettings);
    expect(result.photos).toEqual(mockPeopleWithPhotos);
  });

  it("should exclude audit logs when includeAuditLogs is false", async () => {
    const deps = createMockDependencies({
      db: {
        person: {
          findMany: async () => mockPeople,
        },
        relationship: {
          findMany: async () => mockRelationships,
        },
        user: {
          findMany: async () => mockUsers,
        },
        suggestion: {
          findMany: async () => mockSuggestions,
        },
        familySettings: {
          findFirst: async () => mockSettings,
        },
        auditLog: {
          findMany: async () => [],
          create: async () => ({}),
        },
      } as any,
    });

    const result = await gatherBackupDataCore(
      {
        includePhotos: false,
        includeAuditLogs: false,
        auditLogDays: 90,
      },
      deps
    );

    expect(result.metadata.dataFiles).not.toContain("data/audit-logs.json");
    expect(result.data.auditLogs).toBeUndefined();
    expect(result.metadata.statistics.totalAuditLogs).toBe(0);
  });

  it("should exclude photos when includePhotos is false", async () => {
    const deps = createMockDependencies({
      db: {
        person: {
          findMany: async () => mockPeople,
        },
        relationship: {
          findMany: async () => mockRelationships,
        },
        user: {
          findMany: async () => mockUsers,
        },
        suggestion: {
          findMany: async () => mockSuggestions,
        },
        familySettings: {
          findFirst: async () => mockSettings,
        },
        auditLog: {
          findMany: async () => mockAuditLogs,
          create: async () => ({}),
        },
      } as any,
    });

    const result = await gatherBackupDataCore(
      {
        includePhotos: false,
        includeAuditLogs: true,
        auditLogDays: 90,
      },
      deps
    );

    expect(result.photos).toEqual([]);
    expect(result.metadata.statistics.totalPhotos).toBe(0);
    expect(result.metadata.photoDirectories).toEqual([]);
  });

  it("should handle null session name", async () => {
    const deps = createMockDependencies({
      requireAdmin: async () => ({ ...createMockSession(), name: null }),
      db: {
        person: {
          findMany: async () => mockPeople,
        },
        relationship: {
          findMany: async () => mockRelationships,
        },
        user: {
          findMany: async () => mockUsers,
        },
        suggestion: {
          findMany: async () => mockSuggestions,
        },
        familySettings: {
          findFirst: async () => mockSettings,
        },
        auditLog: {
          findMany: async () => [],
          create: async () => ({}),
        },
      } as any,
    });

    const result = await gatherBackupDataCore(
      {
        includePhotos: false,
        includeAuditLogs: false,
        auditLogDays: 90,
      },
      deps
    );

    expect(result.metadata.exportedBy.name).toBeNull();
  });

  it("should handle empty database", async () => {
    const deps = createMockDependencies({
      db: {
        person: {
          findMany: async () => [],
        },
        relationship: {
          findMany: async () => [],
        },
        user: {
          findMany: async () => [],
        },
        suggestion: {
          findMany: async () => [],
        },
        familySettings: {
          findFirst: async () => null,
        },
        auditLog: {
          findMany: async () => [],
          create: async () => ({}),
        },
      } as any,
    });

    const result = await gatherBackupDataCore(
      {
        includePhotos: false,
        includeAuditLogs: false,
        auditLogDays: 90,
      },
      deps
    );

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
    const deps = createMockDependencies();

    await expect(
      gatherBackupDataCore(
        {
          includePhotos: true,
          includeAuditLogs: true,
          auditLogDays: 0, // Invalid: below minimum
        },
        deps
      )
    ).rejects.toThrow();

    await expect(
      gatherBackupDataCore(
        {
          includePhotos: true,
          includeAuditLogs: true,
          auditLogDays: 366, // Invalid: above maximum
        },
        deps
      )
    ).rejects.toThrow();
  });
});

describe("logBackupExportCore", () => {
  it("should require admin authentication", async () => {
    const deps = createMockDependencies({
      requireAdmin: async () => {
        throw new Error("Unauthorized");
      },
    });

    await expect(logBackupExportCore(deps)).rejects.toThrow("Unauthorized");
  });

  it("should create audit log entry", async () => {
    let createdData: any = null;
    const deps = createMockDependencies({
      db: {
        auditLog: {
          create: async (args: any) => {
            createdData = args;
            return {};
          },
        },
      } as any,
    });

    await logBackupExportCore(deps);

    expect(createdData).toEqual({
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
    const deps = createMockDependencies({
      db: {
        auditLog: {
          create: async () => {
            throw new Error("Database error");
          },
        },
      } as any,
    });

    await expect(logBackupExportCore(deps)).rejects.toThrow("Database error");
  });
});
