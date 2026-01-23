/**
 * Unit tests for invite server business logic
 *
 * Tests cover:
 * - Getting invites with pagination and status filtering
 * - Creating invites with validation
 * - Accepting invites and creating users
 * - Getting invites by token
 * - Revoking pending invites
 * - Deleting revoked invites
 * - Resending invites with new tokens
 * - Error handling and validation
 * - Edge cases (expiration, duplicate prevention, transaction handling)
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { InvitesDb } from "@vamsa/lib/server/business";
import type { UserRole, InviteStatus } from "@vamsa/api";

// Mock logger
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../testing/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

// Mock crypto
const mockRandomBytes = mock((size: number) => ({
  toString: mock((_encoding: string) => "mock-token-" + size),
}));

mock.module("crypto", () => ({
  randomBytes: mockRandomBytes,
}));

// Import the functions to test
import {
  getInvitesData,
  createInviteData,
  acceptInviteData,
  getInviteByTokenData,
  revokeInviteData,
  deleteInviteData,
  resendInviteData,
} from "@vamsa/lib/server/business";

// Create mock database client
function createMockDb(): InvitesDb {
  return {
    invite: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      count: mock(() => Promise.resolve(0)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    user: {
      findUnique: mock(() => Promise.resolve(null)),
      findFirst: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
    },
    person: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    $transaction: mock(async (callback: (tx: unknown) => Promise<unknown>) => {
      // Call the transaction callback with the mock db
      return callback(createMockDb());
    }),
  } as unknown as InvitesDb;
}

describe("Invite Server Functions", () => {
  let mockDb: InvitesDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
    mockRandomBytes.mockClear();
  });

  describe("getInvitesData", () => {
    it("should list invites with pagination", async () => {
      const mockInvites = [
        {
          id: "invite-1",
          email: "john@example.com",
          role: "MEMBER" as UserRole,
          status: "PENDING" as InviteStatus,
          token: "token-1",
          personId: null,
          expiresAt: new Date("2024-02-01"),
          acceptedAt: null,
          createdAt: new Date("2024-01-25"),
          person: null,
          invitedBy: {
            id: "user-1",
            name: "Admin User",
            email: "admin@example.com",
          },
        },
      ];

      (mockDb.invite.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.invite.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockInvites
      );

      const result = await getInvitesData(1, 10, "desc", undefined, mockDb);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].email).toBe("john@example.com");
      expect(result.pagination.total).toBe(1);
    });

    it("should apply status filter", async () => {
      (mockDb.invite.count as ReturnType<typeof mock>).mockResolvedValueOnce(2);
      (mockDb.invite.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await getInvitesData(1, 10, "desc", "PENDING", mockDb);

      const findManyCall = (mockDb.invite.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.where?.status).toBe("PENDING");
    });

    it("should apply pagination skip/take", async () => {
      (mockDb.invite.count as ReturnType<typeof mock>).mockResolvedValueOnce(
        50
      );
      (mockDb.invite.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await getInvitesData(3, 15, "asc", undefined, mockDb);

      const findManyCall = (mockDb.invite.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.skip).toBe(30); // (3 - 1) * 15
      expect(findManyCall?.[0]?.take).toBe(15);
    });

    it("should sort ascending", async () => {
      (mockDb.invite.count as ReturnType<typeof mock>).mockResolvedValueOnce(0);
      (mockDb.invite.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await getInvitesData(1, 10, "asc", undefined, mockDb);

      const findManyCall = (mockDb.invite.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.orderBy?.createdAt).toBe("asc");
    });

    it("should sort descending", async () => {
      (mockDb.invite.count as ReturnType<typeof mock>).mockResolvedValueOnce(0);
      (mockDb.invite.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      await getInvitesData(1, 10, "desc", undefined, mockDb);

      const findManyCall = (mockDb.invite.findMany as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(findManyCall?.[0]?.orderBy?.createdAt).toBe("desc");
    });

    it("should format dates correctly", async () => {
      const mockInvites = [
        {
          id: "invite-1",
          email: "john@example.com",
          role: "MEMBER" as UserRole,
          status: "PENDING" as InviteStatus,
          token: "token-1",
          personId: null,
          expiresAt: new Date("2024-02-01T10:00:00Z"),
          acceptedAt: new Date("2024-01-28T15:30:00Z"),
          createdAt: new Date("2024-01-25T09:00:00Z"),
          person: null,
          invitedBy: null,
        },
      ];

      (mockDb.invite.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.invite.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockInvites
      );

      const result = await getInvitesData(1, 10, "asc", undefined, mockDb);

      expect(result.items[0].expiresAt).toContain("2024-02-01");
      expect(result.items[0].acceptedAt).toContain("2024-01-28");
      expect(result.items[0].createdAt).toContain("2024-01-25");
    });

    it("should handle null acceptedAt", async () => {
      const mockInvites = [
        {
          id: "invite-1",
          email: "john@example.com",
          role: "MEMBER" as UserRole,
          status: "PENDING" as InviteStatus,
          token: "token-1",
          personId: null,
          expiresAt: new Date("2024-02-01"),
          acceptedAt: null,
          createdAt: new Date("2024-01-25"),
          person: null,
          invitedBy: null,
        },
      ];

      (mockDb.invite.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.invite.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockInvites
      );

      const result = await getInvitesData(1, 10, "asc", undefined, mockDb);

      expect(result.items[0].acceptedAt).toBeNull();
    });

    it("should include person relationship", async () => {
      const mockInvites = [
        {
          id: "invite-1",
          email: "john@example.com",
          role: "MEMBER" as UserRole,
          status: "PENDING" as InviteStatus,
          token: "token-1",
          personId: "person-1",
          expiresAt: new Date("2024-02-01"),
          acceptedAt: null,
          createdAt: new Date("2024-01-25"),
          person: {
            id: "person-1",
            firstName: "John",
            lastName: "Doe",
          },
          invitedBy: null,
        },
      ];

      (mockDb.invite.count as ReturnType<typeof mock>).mockResolvedValueOnce(1);
      (mockDb.invite.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockInvites
      );

      const result = await getInvitesData(1, 10, "asc", undefined, mockDb);

      expect(result.items[0].person).toBeDefined();
      expect(result.items[0].person?.firstName).toBe("John");
    });
  });

  describe("createInviteData", () => {
    it("should create invite with valid data", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        token: "mock-token-32",
        personId: null,
        invitedById: "user-1",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "PENDING" as InviteStatus,
        person: null,
      };

      (
        mockDb.invite.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.invite.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockInvite
      );

      const result = await createInviteData(
        "john@example.com",
        "MEMBER",
        null,
        "user-1",
        mockDb
      );

      expect(result.email).toBe("john@example.com");
      expect(result.role).toBe("MEMBER");
      expect(result.token).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should normalize email to lowercase", async () => {
      (
        mockDb.invite.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.invite.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER",
        token: "test-token",
        personId: null,
        person: null,
        expiresAt: new Date(),
        status: "PENDING",
      });

      await createInviteData(
        "JOHN@EXAMPLE.COM",
        "MEMBER",
        null,
        "user-1",
        mockDb
      );

      const createCall = (mockDb.invite.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(createCall?.[0]?.data?.email).toBe("john@example.com");
    });

    it("should throw error if active invite exists for email", async () => {
      const existing = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
      };

      (
        mockDb.invite.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(existing);

      try {
        await createInviteData(
          "john@example.com",
          "MEMBER",
          null,
          "user-1",
          mockDb
        );
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe(
          "An active invite already exists for this email"
        );
      }
    });

    it("should throw error if user already exists with email", async () => {
      const existingUser = { id: "user-1", email: "john@example.com" };

      (
        mockDb.invite.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existingUser
      );

      try {
        await createInviteData(
          "john@example.com",
          "MEMBER",
          null,
          "user-2",
          mockDb
        );
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe(
          "A user already exists with this email"
        );
      }
    });

    it("should throw error if person not found", async () => {
      (
        mockDb.invite.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await createInviteData(
          "john@example.com",
          "MEMBER",
          "nonexistent",
          "user-1",
          mockDb
        );
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Person not found");
      }
    });

    it("should throw error if person already linked to user", async () => {
      const person = { id: "person-1", firstName: "John", lastName: "Doe" };
      const existingUser = { id: "user-1", personId: "person-1" };

      (
        mockDb.invite.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(person);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        existingUser
      );

      try {
        await createInviteData(
          "john@example.com",
          "MEMBER",
          "person-1",
          "user-2",
          mockDb
        );
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe(
          "This person is already linked to a user"
        );
      }
    });

    it("should link to person if personId provided", async () => {
      const person = { id: "person-1", firstName: "John", lastName: "Doe" };
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        token: "mock-token-32",
        personId: "person-1",
        invitedById: "user-1",
        expiresAt: new Date(),
        status: "PENDING" as InviteStatus,
        person,
      };

      (
        mockDb.invite.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(person);
      (mockDb.user.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.invite.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockInvite
      );

      const result = await createInviteData(
        "john@example.com",
        "MEMBER",
        "person-1",
        "user-1",
        mockDb
      );

      expect(result.personId).toBe("person-1");
      expect(result.person?.firstName).toBe("John");
    });

    it("should set expiration to 7 days from creation", async () => {
      const now = Date.now();
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        token: "mock-token-32",
        personId: null,
        invitedById: "user-1",
        expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
        status: "PENDING" as InviteStatus,
        person: null,
      };

      (
        mockDb.invite.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.invite.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockInvite
      );

      await createInviteData(
        "john@example.com",
        "MEMBER",
        null,
        "user-1",
        mockDb
      );

      const createCall = (mockDb.invite.create as ReturnType<typeof mock>).mock
        .calls[0];
      const expiresAt = createCall?.[0]?.data?.expiresAt as Date;
      const diff = expiresAt.getTime() - now;
      const expectedDiff = 7 * 24 * 60 * 60 * 1000;

      // Allow 1 second difference for test execution time
      expect(Math.abs(diff - expectedDiff)).toBeLessThan(1000);
    });

    it("should generate unique token", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        token: "mock-token-32",
        personId: null,
        invitedById: "user-1",
        expiresAt: new Date(),
        status: "PENDING" as InviteStatus,
        person: null,
      };

      (
        mockDb.invite.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.invite.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockInvite
      );

      await createInviteData(
        "john@example.com",
        "MEMBER",
        null,
        "user-1",
        mockDb
      );

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
    });
  });

  describe("getInviteByTokenData", () => {
    it("should return valid invite by token", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "PENDING" as InviteStatus,
        token: "token-1",
        personId: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        person: null,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);

      const result = await getInviteByTokenData("token-1", mockDb);

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.invite?.email).toBe("john@example.com");
    });

    it("should return error if invite not found", async () => {
      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      const result = await getInviteByTokenData("invalid-token", mockDb);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invite not found");
      expect(result.invite).toBeNull();
    });

    it("should return error if invite already accepted", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "ACCEPTED" as InviteStatus,
        token: "token-1",
        personId: null,
        expiresAt: new Date(),
        person: null,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);

      const result = await getInviteByTokenData("token-1", mockDb);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invite already accepted");
    });

    it("should return error if invite revoked", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "REVOKED" as InviteStatus,
        token: "token-1",
        personId: null,
        expiresAt: new Date(),
        person: null,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);

      const result = await getInviteByTokenData("token-1", mockDb);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invite has been revoked");
    });

    it("should return error if invite expired", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "PENDING" as InviteStatus,
        token: "token-1",
        personId: null,
        expiresAt: new Date(Date.now() - 1000),
        person: null,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        {}
      );

      const result = await getInviteByTokenData("token-1", mockDb);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invite has expired");
    });

    it("should update status to EXPIRED if pending but expired", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "PENDING" as InviteStatus,
        token: "token-1",
        personId: null,
        expiresAt: new Date(Date.now() - 1000),
        person: null,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        {}
      );

      await getInviteByTokenData("token-1", mockDb);

      const updateCall = (mockDb.invite.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(updateCall?.[0]?.data?.status).toBe("EXPIRED");
    });

    it("should return error if status is already EXPIRED", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "EXPIRED" as InviteStatus,
        token: "token-1",
        personId: null,
        expiresAt: new Date(Date.now() - 1000),
        person: null,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);

      const result = await getInviteByTokenData("token-1", mockDb);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invite has expired");
    });
  });

  describe("acceptInviteData", () => {
    it("should accept invite and create user", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "PENDING" as InviteStatus,
        token: "token-1",
        personId: null,
        invitedById: "user-1",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const mockUser = {
        id: "user-2",
        email: "john@example.com",
        name: "John Doe",
        role: "MEMBER" as UserRole,
        personId: null,
        invitedById: "user-1",
        isActive: true,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );
      (mockDb.$transaction as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUser
      );

      const result = await acceptInviteData(
        "token-1",
        "John Doe",
        "password123",
        mockDb
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe("user-2");
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should throw error if invite not found", async () => {
      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await acceptInviteData(
          "invalid-token",
          "John Doe",
          "password123",
          mockDb
        );
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Invite not found");
      }
    });

    it("should throw error if invite status is not PENDING", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "ACCEPTED" as InviteStatus,
        token: "token-1",
        personId: null,
        invitedById: "user-1",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);

      try {
        await acceptInviteData("token-1", "John Doe", "password123", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain("Invite is accepted");
      }
    });

    it("should throw error if invite is expired", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "PENDING" as InviteStatus,
        token: "token-1",
        personId: null,
        invitedById: "user-1",
        expiresAt: new Date(Date.now() - 1000),
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        {}
      );

      try {
        await acceptInviteData("token-1", "John Doe", "password123", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Invite has expired");
      }
    });

    it("should throw error if email already taken", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "PENDING" as InviteStatus,
        token: "token-1",
        personId: null,
        invitedById: "user-1",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const existingUser = { id: "user-1", email: "john@example.com" };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        existingUser
      );

      try {
        await acceptInviteData("token-1", "John Doe", "password123", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe(
          "An account already exists with this email"
        );
      }
    });

    it("should hash password with Bun.password (argon2id)", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        role: "MEMBER" as UserRole,
        status: "PENDING" as InviteStatus,
        token: "token-1",
        personId: null,
        invitedById: "user-1",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const mockUser = { id: "user-2" };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.user.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(
        null
      );

      // Capture the password hash from the transaction callback
      let capturedPasswordHash: string | undefined;
      (mockDb.$transaction as ReturnType<typeof mock>).mockImplementationOnce(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const txMock = {
            user: {
              create: mock((args: { data: { passwordHash: string } }) => {
                capturedPasswordHash = args.data.passwordHash;
                return Promise.resolve(mockUser);
              }),
            },
            invite: {
              update: mock(() => Promise.resolve({})),
            },
          };
          return callback(txMock);
        }
      );

      await acceptInviteData("token-1", "John Doe", "password123", mockDb);

      // Verify password was hashed (Bun.password produces argon2id hashes starting with $argon2id$)
      expect(capturedPasswordHash).toBeDefined();
      expect(capturedPasswordHash).toContain("$argon2id$");
      // Verify hash is different from plain password
      expect(capturedPasswordHash).not.toBe("password123");
    });
  });

  describe("revokeInviteData", () => {
    it("should revoke pending invite", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        {}
      );

      const result = await revokeInviteData("invite-1", "user-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should throw error if invite not found", async () => {
      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await revokeInviteData("nonexistent", "user-1", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Invite not found");
      }
    });

    it("should throw error if invite is not pending", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "ACCEPTED" as InviteStatus,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);

      try {
        await revokeInviteData("invite-1", "user-1", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe(
          "Can only revoke pending invites"
        );
      }
    });

    it("should update status to REVOKED", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        {}
      );

      await revokeInviteData("invite-1", "user-1", mockDb);

      const updateCall = (mockDb.invite.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(updateCall?.[0]?.data?.status).toBe("REVOKED");
    });
  });

  describe("deleteInviteData", () => {
    it("should delete revoked invite", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "REVOKED" as InviteStatus,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.delete as ReturnType<typeof mock>).mockResolvedValueOnce(
        {}
      );

      const result = await deleteInviteData("invite-1", "user-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should throw error if invite not found", async () => {
      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await deleteInviteData("nonexistent", "user-1", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Invite not found");
      }
    });

    it("should throw error if invite is not revoked", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);

      try {
        await deleteInviteData("invite-1", "user-1", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe(
          "Only revoked invites can be deleted"
        );
      }
    });
  });

  describe("resendInviteData", () => {
    it("should resend pending invite with new token", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
      };

      const updated = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
        token: "mock-token-32",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      const result = await resendInviteData("invite-1", mockDb);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should throw error if invite not found", async () => {
      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await resendInviteData("nonexistent", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Invite not found");
      }
    });

    it("should throw error if invite already accepted", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "ACCEPTED" as InviteStatus,
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);

      try {
        await resendInviteData("invite-1", mockDb);
        expect.unreachable();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe(
          "Cannot resend an accepted invite"
        );
      }
    });

    it("should allow resending expired invite", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "EXPIRED" as InviteStatus,
      };

      const updated = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
        token: "mock-token-32",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      const result = await resendInviteData("invite-1", mockDb);

      expect(result.success).toBe(true);
    });

    it("should allow resending revoked invite", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "REVOKED" as InviteStatus,
      };

      const updated = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
        token: "mock-token-32",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      const result = await resendInviteData("invite-1", mockDb);

      expect(result.success).toBe(true);
    });

    it("should set status to PENDING", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "EXPIRED" as InviteStatus,
      };

      const updated = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
        token: "mock-token-32",
        expiresAt: new Date(),
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      await resendInviteData("invite-1", mockDb);

      const updateCall = (mockDb.invite.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(updateCall?.[0]?.data?.status).toBe("PENDING");
    });

    it("should extend expiration to 7 days from now", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
      };

      const now = Date.now();
      const updated = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
        token: "mock-token-32",
        expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      await resendInviteData("invite-1", mockDb);

      const updateCall = (mockDb.invite.update as ReturnType<typeof mock>).mock
        .calls[0];
      const expiresAt = updateCall?.[0]?.data?.expiresAt as Date;
      const diff = expiresAt.getTime() - now;
      const expectedDiff = 7 * 24 * 60 * 60 * 1000;

      // Allow 1 second difference for test execution time
      expect(Math.abs(diff - expectedDiff)).toBeLessThan(1000);
    });

    it("should generate new token", async () => {
      const mockInvite = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
      };

      const updated = {
        id: "invite-1",
        email: "john@example.com",
        status: "PENDING" as InviteStatus,
        token: "mock-token-32",
        expiresAt: new Date(),
      };

      (
        mockDb.invite.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockInvite);
      (mockDb.invite.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        updated
      );

      await resendInviteData("invite-1", mockDb);

      expect(mockRandomBytes).toHaveBeenCalledWith(32);
    });
  });
});
