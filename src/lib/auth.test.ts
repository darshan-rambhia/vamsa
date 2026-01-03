import { describe, it, expect, beforeEach, mock } from "bun:test";

// Mock next-auth
const mockGetServerSession = mock(async () => null);

mock.module("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

// Import after mocking
const { getSession, getCurrentUser, requireAuth, requireAdmin, requireMember } =
  await import("./auth");

const createMockSession = (overrides = {}) => ({
  user: {
    id: "user-123",
    email: "user@example.com",
    name: "Test User",
    role: "ADMIN" as const,
    ...overrides,
  },
});

describe("getSession", () => {
  beforeEach(() => {
    mockGetServerSession.mockClear();
  });

  it("returns null when no session exists", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const session = await getSession();
    expect(session).toBeNull();
  });

  it("returns session object when session exists", async () => {
    const mockSession = createMockSession();
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const session = await getSession();
    expect(session).toEqual(mockSession);
  });

  it("returns session with all user properties", async () => {
    const mockSession = createMockSession();
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const session = await getSession();
    expect(session?.user?.id).toBe("user-123");
    expect(session?.user?.email).toBe("user@example.com");
    expect(session?.user?.name).toBe("Test User");
    expect(session?.user?.role).toBe("ADMIN");
  });
});

describe("getCurrentUser", () => {
  beforeEach(() => {
    mockGetServerSession.mockClear();
  });

  it("returns user when session exists", async () => {
    const mockSession = createMockSession();
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const user = await getCurrentUser();
    expect(user).toEqual(mockSession.user);
  });

  it("returns undefined when no session exists", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const user = await getCurrentUser();
    expect(user).toBeUndefined();
  });

  it("returns undefined when session has no user", async () => {
    mockGetServerSession.mockResolvedValueOnce({});
    const user = await getCurrentUser();
    expect(user).toBeUndefined();
  });

  it("returns user with correct properties", async () => {
    const mockSession = createMockSession({
      role: "MEMBER",
      name: "Alice Smith",
    });
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const user = await getCurrentUser();
    expect(user?.id).toBe("user-123");
    expect(user?.role).toBe("MEMBER");
    expect(user?.name).toBe("Alice Smith");
  });
});

describe("requireAuth", () => {
  beforeEach(() => {
    mockGetServerSession.mockClear();
  });

  it("throws 'Unauthorized' when no session exists", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    try {
      await requireAuth();
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toBe("Unauthorized");
    }
  });

  it("throws 'Unauthorized' when session has no user", async () => {
    mockGetServerSession.mockResolvedValueOnce({});
    try {
      await requireAuth();
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toBe("Unauthorized");
    }
  });

  it("returns user when session exists", async () => {
    const mockSession = createMockSession();
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const user = await requireAuth();
    expect(user).toEqual(mockSession.user);
  });

  it("returns user with correct id", async () => {
    const mockSession = createMockSession({ id: "admin-456" });
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const user = await requireAuth();
    expect(user?.id).toBe("admin-456");
  });
});

describe("requireAdmin", () => {
  beforeEach(() => {
    mockGetServerSession.mockClear();
  });

  it("throws 'Unauthorized' when no session exists", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    try {
      await requireAdmin();
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toBe("Unauthorized");
    }
  });

  it("throws 'Forbidden: Admin access required' when role is MEMBER", async () => {
    const mockSession = createMockSession({ role: "MEMBER" });
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    try {
      await requireAdmin();
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toBe("Forbidden: Admin access required");
    }
  });

  it("throws 'Forbidden: Admin access required' when role is VIEWER", async () => {
    const mockSession = createMockSession({ role: "VIEWER" });
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    try {
      await requireAdmin();
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toBe("Forbidden: Admin access required");
    }
  });

  it("returns user when role is ADMIN", async () => {
    const mockSession = createMockSession({ role: "ADMIN" });
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const user = await requireAdmin();
    expect(user?.role).toBe("ADMIN");
  });

  it("returns user object when authenticated as admin", async () => {
    const mockSession = createMockSession();
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const user = await requireAdmin();
    expect(user).toEqual(mockSession.user);
  });
});

describe("requireMember", () => {
  beforeEach(() => {
    mockGetServerSession.mockClear();
  });

  it("throws 'Unauthorized' when no session exists", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    try {
      await requireMember();
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toBe("Unauthorized");
    }
  });

  it("throws 'Forbidden: Member access required' when role is VIEWER", async () => {
    const mockSession = createMockSession({ role: "VIEWER" });
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    try {
      await requireMember();
      expect.fail("Should have thrown");
    } catch (error) {
      expect((error as Error).message).toBe(
        "Forbidden: Member access required"
      );
    }
  });

  it("returns user when role is ADMIN", async () => {
    const mockSession = createMockSession({ role: "ADMIN" });
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const user = await requireMember();
    expect(user?.role).toBe("ADMIN");
  });

  it("returns user when role is MEMBER", async () => {
    const mockSession = createMockSession({ role: "MEMBER" });
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const user = await requireMember();
    expect(user?.role).toBe("MEMBER");
  });

  it("returns user object for admin accessing member endpoint", async () => {
    const mockSession = createMockSession();
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const user = await requireMember();
    expect(user).toEqual(mockSession.user);
  });

  it("returns user object for member accessing member endpoint", async () => {
    const mockSession = createMockSession({ role: "MEMBER" });
    mockGetServerSession.mockResolvedValueOnce(mockSession);
    const user = await requireMember();
    expect(user).toEqual(mockSession.user);
  });
});
