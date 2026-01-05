import {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
  setSystemTime,
} from "bun:test";
import { NextRequest } from "next/server";

// Mock dependencies - must be defined before mock.module calls
const mockGetSession = mock(() => Promise.resolve(null));
const mockGatherBackupData = mock(() => Promise.resolve({}));
const mockLogBackupExport = mock(() => Promise.resolve());

mock.module("@/lib/auth", () => ({
  getSession: mockGetSession,
}));

mock.module("@/actions/backup", () => ({
  gatherBackupData: mockGatherBackupData,
  logBackupExport: mockLogBackupExport,
}));

mock.module("@/lib/storage", () => ({
  getStorageAdapter: mock(() => ({})),
}));

// Import after mocks are set up
const { POST } = await import("./route");

describe("/api/admin/backup/export", () => {
  let testCounter = 0;

  const createMockAdminSession = () => ({
    user: {
      id: `admin-${testCounter++}`,
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN" as const,
      personId: null,
      mustChangePassword: false,
    },
    expires: "2024-12-31T23:59:59.999Z",
  });

  const mockBackupData = {
    metadata: {
      version: "1.0.0",
      exportedAt: "2024-01-01T12:00:00.000Z",
      exportedBy: {
        id: "admin-123",
        email: "admin@example.com",
        name: "Admin User",
      },
      statistics: {
        totalPeople: 5,
        totalRelationships: 3,
        totalUsers: 2,
        totalSuggestions: 0,
        totalPhotos: 1,
        auditLogDays: 90,
        totalAuditLogs: 10,
      },
      dataFiles: [
        "data/people.json",
        "data/relationships.json",
        "data/users.json",
        "data/suggestions.json",
        "data/settings.json",
      ],
      photoDirectories: ["photos/person-1/"],
    },
    data: {
      people: [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          maidenName: null,
          dateOfBirth: null,
          dateOfPassing: null,
          birthPlace: null,
          nativePlace: null,
          gender: null,
          photoUrl: null,
          bio: null,
          phone: null,
          currentAddress: null,
          workAddress: null,
          profession: null,
          employer: null,
          socialLinks: null,
          isLiving: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          createdById: null,
        },
      ],
      relationships: [],
      users: [
        {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin User",
          personId: null,
          role: "ADMIN" as const,
          isActive: true,
          mustChangePassword: false,
          invitedById: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          lastLoginAt: new Date("2024-01-01"),
        },
      ],
      suggestions: [],
      settings: {
        familyName: "Test Family",
        description: "Test description",
      },
    },
    photos: [
      {
        id: "person-1",
        photoUrl: "/api/uploads/123456-photo.jpg",
      },
    ],
  };

  beforeEach(() => {
    mockGetSession.mockReset();
    mockGatherBackupData.mockReset();
    mockLogBackupExport.mockReset();

    mockGetSession.mockResolvedValue(createMockAdminSession());
    mockGatherBackupData.mockResolvedValue(mockBackupData as any);
    mockLogBackupExport.mockResolvedValue(undefined);

    setSystemTime(new Date("2024-01-01T00:10:00.000Z"));
  });

  afterEach(() => {
    setSystemTime();
  });

  const createRequest = (body: any) => {
    return new NextRequest("http://localhost:3000/api/admin/backup/export", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });
  };

  it("should require authentication", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = createRequest({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe("Forbidden");
  });

  it("should require admin role", async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: `user-${testCounter++}`,
        email: "user@example.com",
        role: "MEMBER" as const,
        personId: null,
        mustChangePassword: false,
      },
      expires: "2024-12-31T23:59:59.999Z",
    });

    const request = createRequest({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe("Forbidden");
  });

  it("should validate input parameters", async () => {
    const request = createRequest({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 0, // Invalid: below minimum
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should create backup export successfully", async () => {
    const request = createRequest({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Check response headers
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /attachment; filename="vamsa-backup-.*\.zip"/
    );
    expect(response.headers.get("Cache-Control")).toBe("no-cache");

    // Verify backup data was gathered
    expect(mockGatherBackupData).toHaveBeenCalledWith({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    // Verify audit log was created
    expect(mockLogBackupExport).toHaveBeenCalled();
  });

  it("should handle backup data gathering errors", async () => {
    mockGatherBackupData.mockRejectedValue(
      new Error("Database connection failed")
    );

    const request = createRequest({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Database connection failed");
  });

  it("should handle unknown errors", async () => {
    mockGatherBackupData.mockRejectedValue("Unknown error");

    const request = createRequest({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to create backup");
  });

  it("should handle missing request body", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/backup/export",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should use default values for optional parameters", async () => {
    const request = createRequest({});

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockGatherBackupData).toHaveBeenCalledWith({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });
  });

  it("should handle backup without photos", async () => {
    const request = createRequest({
      includePhotos: false,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockGatherBackupData).toHaveBeenCalledWith({
      includePhotos: false,
      includeAuditLogs: true,
      auditLogDays: 90,
    });
  });

  it("should handle backup without audit logs", async () => {
    const request = createRequest({
      includePhotos: true,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockGatherBackupData).toHaveBeenCalledWith({
      includePhotos: true,
      includeAuditLogs: false,
      auditLogDays: 90,
    });
  });

  it("should enforce rate limiting between exports", async () => {
    const session = createMockAdminSession();
    mockGetSession.mockResolvedValue(session);

    // First export should succeed
    const request1 = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response1 = await POST(request1);
    expect(response1.status).toBe(200);

    // Second export immediately after should be rate limited
    const request2 = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response2 = await POST(request2);
    expect(response2.status).toBe(429);

    const data = await response2.json();
    expect(data.error).toContain("Please wait");
    expect(data.remainingTime).toBeDefined();
    expect(data.remainingTime).toBeGreaterThan(0);
  });

  it("should allow export after rate limit expires", async () => {
    const session = createMockAdminSession();
    mockGetSession.mockResolvedValue(session);

    // First export at time 00:10:00
    const request1 = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response1 = await POST(request1);
    expect(response1.status).toBe(200);

    // Advance time by 6 minutes (more than 5 minute cooldown)
    setSystemTime(new Date("2024-01-01T00:16:01.000Z"));

    // Second export after cooldown should succeed
    const request2 = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response2 = await POST(request2);
    expect(response2.status).toBe(200);
  });

  it("should handle backup with audit logs included", async () => {
    const backupWithLogs = {
      ...mockBackupData,
      data: {
        ...mockBackupData.data,
        auditLogs: [
          {
            id: "log-1",
            timestamp: "2024-01-01T12:00:00.000Z",
            action: "BACKUP_EXPORT",
          },
        ],
      },
    };

    mockGatherBackupData.mockResolvedValue(backupWithLogs as any);

    const request = createRequest({
      includePhotos: false,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
  });

  it("should set correct response headers for download", async () => {
    const request = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");

    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("vamsa-backup-");
    expect(disposition).toContain(".zip");
  });

  it("should generate filename with ISO timestamp", async () => {
    setSystemTime(new Date("2024-12-25T15:30:45.678Z"));

    const request = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const disposition = response.headers.get("Content-Disposition");
    // Timestamp should be formatted with ISO string (colons replaced with dashes)
    expect(disposition).toContain("vamsa-backup-2024-12-25");
  });

  it("should call logBackupExport after gathering data", async () => {
    const request = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    expect(mockLogBackupExport).not.toHaveBeenCalled();

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockLogBackupExport).toHaveBeenCalled();
  });

  it("should pass correct input to gatherBackupData", async () => {
    const request = createRequest({
      includePhotos: true,
      includeAuditLogs: false,
      auditLogDays: 30,
    });

    await POST(request);

    expect(mockGatherBackupData).toHaveBeenCalledWith({
      includePhotos: true,
      includeAuditLogs: false,
      auditLogDays: 30,
    });
  });

  it("should return Response with stream, not NextResponse", async () => {
    const request = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
  });

  it("should handle error when gathering backup data", async () => {
    mockGatherBackupData.mockRejectedValue(
      new Error("Backup gathering failed")
    );

    const request = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Backup gathering failed");
  });

  it("should validate minimum auditLogDays", async () => {
    const request = createRequest({
      includePhotos: false,
      includeAuditLogs: true,
      auditLogDays: 0,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should handle different admin users independently for rate limiting", async () => {
    // Admin 1 exports
    const admin1 = createMockAdminSession();
    mockGetSession.mockResolvedValue(admin1);

    const request1 = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response1 = await POST(request1);
    expect(response1.status).toBe(200);

    // Admin 2 can export immediately (different user)
    const admin2 = createMockAdminSession();
    mockGetSession.mockResolvedValue(admin2);

    const request2 = createRequest({
      includePhotos: false,
      includeAuditLogs: false,
      auditLogDays: 90,
    });

    const response2 = await POST(request2);
    expect(response2.status).toBe(200);
  });

  it("should handle JSON parse errors", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/admin/backup/export",
      {
        method: "POST",
        body: "invalid json {",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
