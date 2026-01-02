import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/actions/backup", () => ({
  gatherBackupData: vi.fn(),
  logBackupExport: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getStorageAdapter: vi.fn(),
}));

const { getSession } = await import("@/lib/auth");
const { gatherBackupData, logBackupExport } = await import("@/actions/backup");

describe("/api/admin/backup/export", () => {
  let testCounter = 0;

  const createMockAdminSession = () => ({
    user: {
      id: `admin-${testCounter++}`, // Unique ID for each test
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
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue(createMockAdminSession());
    vi.mocked(gatherBackupData).mockResolvedValue(mockBackupData as any);
    vi.mocked(logBackupExport).mockResolvedValue();

    // Mock console to avoid issues in error handling
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Use fake timers to control time and avoid rate limiting conflicts
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

    // Clear rate limiting state by advancing time far enough
    // This ensures each test starts with a clean rate limiting state
    vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes to be safe
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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
    vi.mocked(getSession).mockResolvedValue(null);

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
    vi.mocked(getSession).mockResolvedValue({
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

  it("should enforce rate limiting", async () => {
    const request1 = createRequest({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    const request2 = createRequest({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    // First request should succeed
    const response1 = await POST(request1);
    expect(response1.status).toBe(200);

    // Second request should be rate limited (no time advancement)
    const response2 = await POST(request2);
    expect(response2.status).toBe(429);

    const data = await response2.json();
    expect(data.error).toContain("Please wait");
    expect(data.remainingTime).toBeGreaterThan(0);
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
    expect(gatherBackupData).toHaveBeenCalledWith({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    // Verify audit log was created
    expect(logBackupExport).toHaveBeenCalled();
  });

  it("should handle backup data gathering errors", async () => {
    vi.mocked(gatherBackupData).mockRejectedValue(
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
    vi.mocked(gatherBackupData).mockRejectedValue("Unknown error");

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

    expect(gatherBackupData).toHaveBeenCalledWith({
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

    expect(gatherBackupData).toHaveBeenCalledWith({
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

    expect(gatherBackupData).toHaveBeenCalledWith({
      includePhotos: true,
      includeAuditLogs: false,
      auditLogDays: 90,
    });
  });

  it("should generate unique filenames", async () => {
    // Use a different user for the second request to avoid rate limiting
    const firstUserSession = createMockAdminSession();
    vi.mocked(getSession).mockResolvedValueOnce(firstUserSession);

    const request1 = createRequest({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    const response1 = await POST(request1);
    expect(response1.status).toBe(200);

    // Advance time to ensure different timestamp for second request
    vi.advanceTimersByTime(1000); // 1 second

    // Use a different user for the second request
    const secondUserSession = createMockAdminSession();
    vi.mocked(getSession).mockResolvedValueOnce(secondUserSession);

    const request2 = createRequest({
      includePhotos: true,
      includeAuditLogs: true,
      auditLogDays: 90,
    });

    const response2 = await POST(request2);
    expect(response2.status).toBe(200);

    const filename1 = response1.headers.get("Content-Disposition");
    const filename2 = response2.headers.get("Content-Disposition");

    expect(filename1).not.toBe(filename2);
  });
});
