/**
 * Unit tests for person server function handlers
 *
 * Tests the handler implementations in persons.server.ts using
 * withStubbedServerContext for isolated testing.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  withStubbedServerContext,
  testUsers,
  createMockUser,
  getStubbedSession,
} from "@test/server-fn-context";

// Mock business logic BEFORE importing handlers
const mockListPersonsData = mock(async () => ({
  items: [
    { id: "person-1", firstName: "John", lastName: "Doe" },
    { id: "person-2", firstName: "Jane", lastName: "Smith" },
  ],
  pagination: {
    total: 2,
    page: 1,
    limit: 50,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
}));

const mockGetPersonData = mock(async () => ({
  id: "person-1",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  isLiving: true,
  relationships: [],
}));

const mockCreatePersonData = mock(async () => ({
  id: "new-person-id",
}));

const mockUpdatePersonData = mock(async () => ({
  id: "person-1",
}));

const mockDeletePersonData = mock(async () => ({
  success: true,
}));

const mockSearchPersonsData = mock(async () => [
  { id: "person-1", firstName: "John", lastName: "Doe" },
]);

// Mock business logic - MUST include betterAuthGetSessionWithUserFromCookie
// to work with withStubbedServerContext
mock.module("@vamsa/lib/server/business", () => ({
  listPersonsData: mockListPersonsData,
  getPersonData: mockGetPersonData,
  createPersonData: mockCreatePersonData,
  updatePersonData: mockUpdatePersonData,
  deletePersonData: mockDeletePersonData,
  searchPersonsData: mockSearchPersonsData,
  betterAuthGetSessionWithUserFromCookie: getStubbedSession,
}));

// Mock the requireAuth middleware to use our stubbed session directly
// This avoids needing to mock the database and keeps other tests working
mock.module("./middleware/require-auth", () => ({
  requireAuth: async (requiredRole: string = "VIEWER") => {
    const user = await getStubbedSession();
    if (!user) {
      throw new Error("errors:auth.notAuthenticated");
    }

    const roleHierarchy: Record<string, number> = {
      VIEWER: 0,
      MEMBER: 1,
      ADMIN: 2,
    };

    if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
      throw new Error(`Requires ${requiredRole} role or higher`);
    }

    return user;
  },
}));

// Import handlers AFTER setting up mocks
import {
  listPersonsHandler,
  getPersonHandler,
  createPersonHandler,
  updatePersonHandler,
  deletePersonHandler,
  searchPersonsHandler,
} from "./persons.server";

describe("Person Handlers", () => {
  beforeEach(() => {
    mockListPersonsData.mockClear();
    mockGetPersonData.mockClear();
    mockCreatePersonData.mockClear();
    mockUpdatePersonData.mockClear();
    mockDeletePersonData.mockClear();
    mockSearchPersonsData.mockClear();
  });

  // ==========================================================================
  // listPersonsHandler
  // ==========================================================================

  describe("listPersonsHandler", () => {
    it("rejects unauthenticated requests", async () => {
      await expect(
        withStubbedServerContext({}, () =>
          listPersonsHandler({
            page: 1,
            limit: 50,
            sortBy: "lastName",
            sortOrder: "asc",
          })
        )
      ).rejects.toThrow(/notAuthenticated|not authenticated/i);
    });

    it("allows VIEWER to list persons", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.viewer },
        () =>
          listPersonsHandler({
            page: 1,
            limit: 50,
            sortBy: "lastName",
            sortOrder: "asc",
          })
      );

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(mockListPersonsData).toHaveBeenCalledTimes(1);
    });

    it("allows MEMBER to list persons", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.member },
        () =>
          listPersonsHandler({
            page: 1,
            limit: 50,
            sortBy: "lastName",
            sortOrder: "asc",
          })
      );

      expect(result.items).toHaveLength(2);
    });

    it("allows ADMIN to list persons", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.admin },
        () =>
          listPersonsHandler({
            page: 1,
            limit: 50,
            sortBy: "lastName",
            sortOrder: "asc",
          })
      );

      expect(result.items).toHaveLength(2);
    });

    it("passes filter options to business logic", async () => {
      await withStubbedServerContext({ user: testUsers.viewer }, () =>
        listPersonsHandler({
          page: 2,
          limit: 25,
          sortBy: "firstName",
          sortOrder: "desc",
          search: "john",
          isLiving: true,
        })
      );

      expect(mockListPersonsData).toHaveBeenCalledWith({
        page: 2,
        limit: 25,
        sortBy: "firstName",
        sortOrder: "desc",
        search: "john",
        isLiving: true,
      });
    });
  });

  // ==========================================================================
  // getPersonHandler
  // ==========================================================================

  describe("getPersonHandler", () => {
    it("rejects unauthenticated requests", async () => {
      await expect(
        withStubbedServerContext({}, () => getPersonHandler({ id: "person-1" }))
      ).rejects.toThrow(/notAuthenticated|not authenticated/i);
    });

    it("allows VIEWER to get person", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.viewer },
        () => getPersonHandler({ id: "person-1" })
      );

      expect(result.id).toBe("person-1");
      expect(result.firstName).toBe("John");
      expect(mockGetPersonData).toHaveBeenCalledWith("person-1");
    });

    it("allows MEMBER to get person", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.member },
        () => getPersonHandler({ id: "person-1" })
      );

      expect(result.id).toBe("person-1");
    });

    it("allows ADMIN to get person", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.admin },
        () => getPersonHandler({ id: "person-1" })
      );

      expect(result.id).toBe("person-1");
    });
  });

  // ==========================================================================
  // createPersonHandler
  // ==========================================================================

  describe("createPersonHandler", () => {
    const validPersonData = {
      firstName: "New",
      lastName: "Person",
      gender: "MALE" as const,
      isLiving: true,
    };

    it("rejects unauthenticated requests", async () => {
      await expect(
        withStubbedServerContext({}, () => createPersonHandler(validPersonData))
      ).rejects.toThrow(/notAuthenticated|not authenticated/i);
    });

    it("rejects VIEWER (requires MEMBER)", async () => {
      await expect(
        withStubbedServerContext({ user: testUsers.viewer }, () =>
          createPersonHandler(validPersonData)
        )
      ).rejects.toThrow(/requires.*MEMBER/i);
    });

    it("allows MEMBER to create person", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.member },
        () => createPersonHandler(validPersonData)
      );

      expect(result.id).toBe("new-person-id");
      expect(mockCreatePersonData).toHaveBeenCalledWith(
        validPersonData,
        testUsers.member.id
      );
    });

    it("allows ADMIN to create person", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.admin },
        () => createPersonHandler(validPersonData)
      );

      expect(result.id).toBe("new-person-id");
    });
  });

  // ==========================================================================
  // updatePersonHandler
  // ==========================================================================

  describe("updatePersonHandler", () => {
    const validUpdateData = {
      id: "person-1",
      firstName: "Updated",
    };

    it("rejects unauthenticated requests", async () => {
      await expect(
        withStubbedServerContext({}, () => updatePersonHandler(validUpdateData))
      ).rejects.toThrow(/notAuthenticated|not authenticated/i);
    });

    it("rejects VIEWER (requires MEMBER)", async () => {
      await expect(
        withStubbedServerContext({ user: testUsers.viewer }, () =>
          updatePersonHandler(validUpdateData)
        )
      ).rejects.toThrow(/requires.*MEMBER/i);
    });

    it("allows MEMBER to update person", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.member },
        () => updatePersonHandler(validUpdateData)
      );

      expect(result.id).toBe("person-1");
      expect(mockUpdatePersonData).toHaveBeenCalledWith(
        "person-1",
        { firstName: "Updated" },
        testUsers.member.id
      );
    });

    it("allows ADMIN to update person", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.admin },
        () => updatePersonHandler(validUpdateData)
      );

      expect(result.id).toBe("person-1");
    });
  });

  // ==========================================================================
  // deletePersonHandler
  // ==========================================================================

  describe("deletePersonHandler", () => {
    it("rejects unauthenticated requests", async () => {
      await expect(
        withStubbedServerContext({}, () =>
          deletePersonHandler({ id: "person-1" })
        )
      ).rejects.toThrow(/notAuthenticated|not authenticated/i);
    });

    it("rejects VIEWER (requires ADMIN)", async () => {
      await expect(
        withStubbedServerContext({ user: testUsers.viewer }, () =>
          deletePersonHandler({ id: "person-1" })
        )
      ).rejects.toThrow(/requires.*ADMIN/i);
    });

    it("rejects MEMBER (requires ADMIN)", async () => {
      await expect(
        withStubbedServerContext({ user: testUsers.member }, () =>
          deletePersonHandler({ id: "person-1" })
        )
      ).rejects.toThrow(/requires.*ADMIN/i);
    });

    it("allows ADMIN to delete person", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.admin },
        () => deletePersonHandler({ id: "person-1" })
      );

      expect(result.success).toBe(true);
      expect(mockDeletePersonData).toHaveBeenCalledWith(
        "person-1",
        testUsers.admin.id
      );
    });
  });

  // ==========================================================================
  // searchPersonsHandler
  // ==========================================================================

  describe("searchPersonsHandler", () => {
    it("rejects unauthenticated requests", async () => {
      await expect(
        withStubbedServerContext({}, () =>
          searchPersonsHandler({ query: "john" })
        )
      ).rejects.toThrow(/notAuthenticated|not authenticated/i);
    });

    it("allows VIEWER to search persons", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.viewer },
        () => searchPersonsHandler({ query: "john" })
      );

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe("John");
      expect(mockSearchPersonsData).toHaveBeenCalledWith("john", undefined);
    });

    it("allows MEMBER to search persons", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.member },
        () => searchPersonsHandler({ query: "john" })
      );

      expect(result).toHaveLength(1);
    });

    it("allows ADMIN to search persons", async () => {
      const { result } = await withStubbedServerContext(
        { user: testUsers.admin },
        () => searchPersonsHandler({ query: "john" })
      );

      expect(result).toHaveLength(1);
    });

    it("passes excludeId to business logic", async () => {
      await withStubbedServerContext({ user: testUsers.viewer }, () =>
        searchPersonsHandler({ query: "john", excludeId: "person-2" })
      );

      expect(mockSearchPersonsData).toHaveBeenCalledWith("john", "person-2");
    });
  });

  // ==========================================================================
  // Custom User Tests
  // ==========================================================================

  describe("Custom user scenarios", () => {
    it("works with custom user overrides", async () => {
      const customUser = createMockUser(testUsers.member, {
        id: "custom-user-id",
        email: "custom@test.com",
      });

      const { result } = await withStubbedServerContext(
        { user: customUser },
        () =>
          createPersonHandler({
            firstName: "Test",
            lastName: "User",
            gender: "FEMALE" as const,
            isLiving: true,
          })
      );

      expect(result.id).toBe("new-person-id");
      expect(mockCreatePersonData).toHaveBeenCalledWith(
        expect.any(Object),
        "custom-user-id"
      );
    });
  });
});
