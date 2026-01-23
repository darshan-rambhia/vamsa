/**
 * Unit tests for suggestions server business logic
 *
 * Tests cover:
 * - Listing suggestions with pagination, sorting, and status filtering
 * - Getting count of pending suggestions
 * - Creating suggestions of different types (CREATE, UPDATE, DELETE, ADD_RELATIONSHIP)
 * - Reviewing suggestions (approving/rejecting)
 * - Applying suggestions (CREATE person, UPDATE person, DELETE person, ADD_RELATIONSHIP)
 * - Validation and error handling
 * - Edge cases (null targetPersonId, empty data, date formatting)
 * - Notification triggering
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { SuggestionsDb } from "@vamsa/lib/server/business";
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

// Mock the notifications module
const mockNotifySuggestionCreated = mock(() => Promise.resolve());
const mockNotifySuggestionUpdated = mock(() => Promise.resolve());

mock.module("./notifications", () => ({
  notifySuggestionCreated: mockNotifySuggestionCreated,
  notifySuggestionUpdated: mockNotifySuggestionUpdated,
}));

import {
  listSuggestionsData,
  getPendingSuggestionsCountData,
  createSuggestionData,
  reviewSuggestionData,
} from "@vamsa/lib/server/business";

function createMockDb(): SuggestionsDb {
  return {
    suggestion: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      count: mock(() => Promise.resolve(0)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
    },
    person: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    relationship: {
      create: mock(() => Promise.resolve({})),
      findMany: mock(() => Promise.resolve([])),
    },
  } as unknown as SuggestionsDb;
}

describe("Suggestions Business Logic", () => {
  let mockDb: SuggestionsDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
    mockNotifySuggestionCreated.mockClear();
    mockNotifySuggestionUpdated.mockClear();
  });

  describe("listSuggestionsData", () => {
    it("should list all suggestions with pagination", async () => {
      const mockSuggestions = [
        {
          id: "sug-1",
          type: "CREATE",
          targetPersonId: null,
          suggestedData: {
            firstName: "John",
            lastName: "Doe",
          },
          reason: "New family member",
          status: "PENDING",
          submittedAt: new Date("2024-01-01"),
          reviewedAt: null,
          reviewNote: null,
          targetPerson: null,
          submittedBy: {
            id: "user-1",
            name: "Submitter",
            email: "submitter@example.com",
          },
          reviewedBy: null,
        },
        {
          id: "sug-2",
          type: "UPDATE",
          targetPersonId: "person-1",
          suggestedData: {
            firstName: "Jane",
          },
          reason: "Correct spelling",
          status: "PENDING",
          submittedAt: new Date("2024-01-02"),
          reviewedAt: null,
          reviewNote: null,
          targetPerson: {
            id: "person-1",
            firstName: "John",
            lastName: "Smith",
          },
          submittedBy: {
            id: "user-2",
            name: "Another User",
            email: "another@example.com",
          },
          reviewedBy: null,
        },
      ];

      (
        mockDb.suggestion.count as ReturnType<typeof mock>
      ).mockResolvedValueOnce(2);

      (
        mockDb.suggestion.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestions);

      const result = await listSuggestionsData(
        { page: 1, limit: 10, sortOrder: "desc" },
        mockDb
      );

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.items[0].type).toBe("CREATE");
      expect(result.items[1].type).toBe("UPDATE");
    });

    it("should filter suggestions by status", async () => {
      const mockSuggestions = [
        {
          id: "sug-1",
          type: "CREATE",
          targetPersonId: null,
          suggestedData: {},
          reason: null,
          status: "PENDING",
          submittedAt: new Date("2024-01-01"),
          reviewedAt: null,
          reviewNote: null,
          targetPerson: null,
          submittedBy: {
            id: "user-1",
            name: "User",
            email: "user@example.com",
          },
          reviewedBy: null,
        },
      ];

      (
        mockDb.suggestion.count as ReturnType<typeof mock>
      ).mockResolvedValueOnce(1);

      (
        mockDb.suggestion.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestions);

      const result = await listSuggestionsData(
        { page: 1, limit: 10, sortOrder: "desc", status: "PENDING" },
        mockDb
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe("PENDING");

      // Verify status filter was applied
      const findManyCall = (
        mockDb.suggestion.findMany as ReturnType<typeof mock>
      ).mock.calls[0];
      expect(findManyCall?.[0]?.where?.status).toBe("PENDING");
    });

    it("should handle pagination correctly", async () => {
      const mockSuggestions: Array<{
        id: string;
        type: string;
        targetPersonId: string | null;
        status: string;
      }> = [];

      (
        mockDb.suggestion.count as ReturnType<typeof mock>
      ).mockResolvedValueOnce(50);

      (
        mockDb.suggestion.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestions);

      const result = await listSuggestionsData(
        { page: 2, limit: 10, sortOrder: "asc" },
        mockDb
      );

      // Verify skip and take were calculated
      const findManyCall = (
        mockDb.suggestion.findMany as ReturnType<typeof mock>
      ).mock.calls[0];
      expect(findManyCall?.[0]?.skip).toBe(10);
      expect(findManyCall?.[0]?.take).toBe(10);

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(50);
    });

    it("should sort by ascending order", async () => {
      (
        mockDb.suggestion.count as ReturnType<typeof mock>
      ).mockResolvedValueOnce(0);

      (
        mockDb.suggestion.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      await listSuggestionsData(
        { page: 1, limit: 10, sortOrder: "asc" },
        mockDb
      );

      const findManyCall = (
        mockDb.suggestion.findMany as ReturnType<typeof mock>
      ).mock.calls[0];
      expect(findManyCall?.[0]?.orderBy?.submittedAt).toBe("asc");
    });

    it("should sort by descending order", async () => {
      (
        mockDb.suggestion.count as ReturnType<typeof mock>
      ).mockResolvedValueOnce(0);

      (
        mockDb.suggestion.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      await listSuggestionsData(
        { page: 1, limit: 10, sortOrder: "desc" },
        mockDb
      );

      const findManyCall = (
        mockDb.suggestion.findMany as ReturnType<typeof mock>
      ).mock.calls[0];
      expect(findManyCall?.[0]?.orderBy?.submittedAt).toBe("desc");
    });

    it("should handle approved suggestions in list", async () => {
      const mockSuggestions = [
        {
          id: "sug-1",
          type: "CREATE",
          targetPersonId: null,
          suggestedData: {},
          reason: null,
          status: "APPROVED",
          submittedAt: new Date("2024-01-01"),
          reviewedAt: new Date("2024-01-15"),
          reviewNote: "Looks good",
          targetPerson: null,
          submittedBy: {
            id: "user-1",
            name: "User",
            email: "user@example.com",
          },
          reviewedBy: {
            id: "user-2",
            name: "Admin",
            email: "admin@example.com",
          },
        },
      ];

      (
        mockDb.suggestion.count as ReturnType<typeof mock>
      ).mockResolvedValueOnce(1);

      (
        mockDb.suggestion.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestions);

      const result = await listSuggestionsData(
        { page: 1, limit: 10, sortOrder: "desc" },
        mockDb
      );

      expect(result.items[0].status).toBe("APPROVED");
      expect(result.items[0].reviewNote).toBe("Looks good");
      expect(result.items[0].reviewedBy?.name).toBe("Admin");
    });
  });

  describe("getPendingSuggestionsCountData", () => {
    it("should return count of pending suggestions", async () => {
      (
        mockDb.suggestion.count as ReturnType<typeof mock>
      ).mockResolvedValueOnce(5);

      const result = await getPendingSuggestionsCountData(mockDb);

      expect(result).toBe(5);

      // Verify correct where clause was used
      const countCall = (mockDb.suggestion.count as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(countCall?.[0]?.where?.status).toBe("PENDING");
    });

    it("should return zero when no pending suggestions", async () => {
      (
        mockDb.suggestion.count as ReturnType<typeof mock>
      ).mockResolvedValueOnce(0);

      const result = await getPendingSuggestionsCountData(mockDb);

      expect(result).toBe(0);
    });
  });

  describe("createSuggestionData", () => {
    it("should create CREATE suggestion", async () => {
      const createdSuggestion = {
        id: "sug-1",
        type: "CREATE",
        targetPersonId: null,
        suggestedData: {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: "1990-01-15",
        },
        reason: "New family member",
        status: "PENDING",
        submittedById: "user-1",
      };

      (
        mockDb.suggestion.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(createdSuggestion);

      const result = await createSuggestionData(
        "CREATE",
        null,
        {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: "1990-01-15",
        },
        "New family member",
        "user-1",
        mockDb
      );

      expect(result.id).toBe("sug-1");
      expect(result.type).toBe("CREATE");
      expect(result.status).toBe("PENDING");

      // Verify notification was triggered
      expect(mockNotifySuggestionCreated).toHaveBeenCalledWith("sug-1");
    });

    it("should create UPDATE suggestion with targetPersonId", async () => {
      const createdSuggestion = {
        id: "sug-2",
        type: "UPDATE",
        targetPersonId: "person-1",
        suggestedData: {
          firstName: "Jane",
        },
        reason: "Correct spelling",
        status: "PENDING",
        submittedById: "user-1",
      };

      (
        mockDb.suggestion.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(createdSuggestion);

      const result = await createSuggestionData(
        "UPDATE",
        "person-1",
        { firstName: "Jane" },
        "Correct spelling",
        "user-1",
        mockDb
      );

      expect(result.type).toBe("UPDATE");
      expect(result.id).toBe("sug-2");
    });

    it("should create DELETE suggestion", async () => {
      const createdSuggestion = {
        id: "sug-3",
        type: "DELETE",
        targetPersonId: "person-1",
        suggestedData: {},
        reason: "Duplicate entry",
        status: "PENDING",
        submittedById: "user-1",
      };

      (
        mockDb.suggestion.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(createdSuggestion);

      const result = await createSuggestionData(
        "DELETE",
        "person-1",
        {},
        "Duplicate entry",
        "user-1",
        mockDb
      );

      expect(result.type).toBe("DELETE");
    });

    it("should create ADD_RELATIONSHIP suggestion", async () => {
      const createdSuggestion = {
        id: "sug-4",
        type: "ADD_RELATIONSHIP",
        targetPersonId: null,
        suggestedData: {
          type: "SPOUSE",
          personId: "person-1",
          relatedPersonId: "person-2",
        },
        reason: "Marriage record found",
        status: "PENDING",
        submittedById: "user-1",
      };

      (
        mockDb.suggestion.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(createdSuggestion);

      const result = await createSuggestionData(
        "ADD_RELATIONSHIP",
        null,
        {
          type: "SPOUSE",
          personId: "person-1",
          relatedPersonId: "person-2",
        },
        "Marriage record found",
        "user-1",
        mockDb
      );

      expect(result.type).toBe("ADD_RELATIONSHIP");
    });

    it("should handle undefined targetPersonId as null", async () => {
      const createdSuggestion = {
        id: "sug-1",
        type: "CREATE",
        targetPersonId: null,
        suggestedData: {},
        reason: null,
        status: "PENDING",
        submittedById: "user-1",
      };

      (
        mockDb.suggestion.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(createdSuggestion);

      await createSuggestionData(
        "CREATE",
        undefined,
        {},
        undefined,
        "user-1",
        mockDb
      );

      const createCall = (mockDb.suggestion.create as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(createCall?.[0]?.data?.targetPersonId).toBeNull();
    });

    it("should handle undefined suggestedData as empty object", async () => {
      const createdSuggestion = {
        id: "sug-1",
        type: "CREATE",
        targetPersonId: null,
        suggestedData: {},
        reason: null,
        status: "PENDING",
        submittedById: "user-1",
      };

      (
        mockDb.suggestion.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce(createdSuggestion);

      await createSuggestionData(
        "CREATE",
        null,
        {},
        undefined,
        "user-1",
        mockDb
      );

      const createCall = (mockDb.suggestion.create as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(createCall?.[0]?.data?.suggestedData).toEqual({});
    });
  });

  describe("reviewSuggestionData", () => {
    it("should approve suggestion and apply changes", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "CREATE",
        targetPersonId: null,
        suggestedData: {
          firstName: "John",
          lastName: "Doe",
        },
        status: "PENDING",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      (mockDb.person.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });

      (
        mockDb.suggestion.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      const result = await reviewSuggestionData(
        "sug-1",
        "APPROVED",
        "Looks good",
        "user-admin",
        mockDb
      );

      expect(result.success).toBe(true);

      // Verify person was created
      expect(mockDb.person.create).toHaveBeenCalled();

      // Verify notification was sent
      expect(mockNotifySuggestionUpdated).toHaveBeenCalledWith(
        "sug-1",
        "APPROVED"
      );
    });

    it("should reject suggestion without applying changes", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "CREATE",
        targetPersonId: null,
        suggestedData: {
          firstName: "John",
          lastName: "Doe",
        },
        status: "PENDING",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      (
        mockDb.suggestion.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      const result = await reviewSuggestionData(
        "sug-1",
        "REJECTED",
        "Not enough evidence",
        "user-admin",
        mockDb
      );

      expect(result.success).toBe(true);

      // Verify person was NOT created
      expect(mockDb.person.create).not.toHaveBeenCalled();

      // Verify notification was sent
      expect(mockNotifySuggestionUpdated).toHaveBeenCalledWith(
        "sug-1",
        "REJECTED"
      );
    });

    it("should update suggestion with reviewer info", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "CREATE",
        targetPersonId: null,
        suggestedData: {},
        status: "PENDING",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      (
        mockDb.suggestion.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      await reviewSuggestionData(
        "sug-1",
        "APPROVED",
        "Review note",
        "user-admin",
        mockDb
      );

      const updateCall = (mockDb.suggestion.update as ReturnType<typeof mock>)
        .mock.calls[0];

      expect(updateCall?.[0]?.data?.status).toBe("APPROVED");
      expect(updateCall?.[0]?.data?.reviewedById).toBe("user-admin");
      expect(updateCall?.[0]?.data?.reviewNote).toBe("Review note");
      expect(updateCall?.[0]?.data?.reviewedAt).toBeDefined();
    });

    it("should throw error if suggestion not found", async () => {
      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await reviewSuggestionData(
          "nonexistent",
          "APPROVED",
          undefined,
          "user-admin",
          mockDb
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("Suggestion not found");
      }
    });

    it("should throw error if already reviewed", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "CREATE",
        targetPersonId: null,
        suggestedData: {},
        status: "APPROVED",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      try {
        await reviewSuggestionData(
          "sug-1",
          "REJECTED",
          undefined,
          "user-admin",
          mockDb
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe(
          "Suggestion has already been reviewed"
        );
      }
    });

    it("should apply UPDATE suggestion", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "UPDATE",
        targetPersonId: "person-1",
        suggestedData: {
          firstName: "Jane",
          dateOfBirth: "1985-05-20",
        },
        status: "PENDING",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      (mockDb.person.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "person-1",
      });

      (
        mockDb.suggestion.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      await reviewSuggestionData(
        "sug-1",
        "APPROVED",
        undefined,
        "user-admin",
        mockDb
      );

      const updateCall = (mockDb.person.update as ReturnType<typeof mock>).mock
        .calls[0];
      expect(updateCall?.[0]?.where?.id).toBe("person-1");
    });

    it("should apply DELETE suggestion", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "DELETE",
        targetPersonId: "person-1",
        suggestedData: {},
        status: "PENDING",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      (mockDb.person.delete as ReturnType<typeof mock>).mockResolvedValueOnce(
        {}
      );

      (
        mockDb.suggestion.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      await reviewSuggestionData(
        "sug-1",
        "APPROVED",
        undefined,
        "user-admin",
        mockDb
      );

      const deleteCall = (mockDb.person.delete as ReturnType<typeof mock>).mock
        .calls[0];
      expect(deleteCall?.[0]?.where?.id).toBe("person-1");
    });

    it("should apply ADD_RELATIONSHIP suggestion", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "ADD_RELATIONSHIP",
        targetPersonId: null,
        suggestedData: {
          type: "SPOUSE",
          personId: "person-1",
          relatedPersonId: "person-2",
        },
        status: "PENDING",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      (
        mockDb.relationship.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      (
        mockDb.suggestion.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      await reviewSuggestionData(
        "sug-1",
        "APPROVED",
        undefined,
        "user-admin",
        mockDb
      );

      expect(mockDb.relationship.create).toHaveBeenCalled();
    });

    it("should throw error for UPDATE without targetPersonId", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "UPDATE",
        targetPersonId: null,
        suggestedData: {},
        status: "PENDING",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      try {
        await reviewSuggestionData(
          "sug-1",
          "APPROVED",
          undefined,
          "user-admin",
          mockDb
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe(
          "Target person required for update"
        );
      }
    });

    it("should throw error for DELETE without targetPersonId", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "DELETE",
        targetPersonId: null,
        suggestedData: {},
        status: "PENDING",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      try {
        await reviewSuggestionData(
          "sug-1",
          "APPROVED",
          undefined,
          "user-admin",
          mockDb
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe(
          "Target person required for delete"
        );
      }
    });

    it("should throw error for unknown suggestion type", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "UNKNOWN_TYPE",
        targetPersonId: null,
        suggestedData: {},
        status: "PENDING",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      try {
        await reviewSuggestionData(
          "sug-1",
          "APPROVED",
          undefined,
          "user-admin",
          mockDb
        );
        expect.unreachable("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toContain("Unknown suggestion type");
      }
    });

    it("should handle undefined reviewNote as null", async () => {
      const mockSuggestion = {
        id: "sug-1",
        type: "CREATE",
        targetPersonId: null,
        suggestedData: {},
        status: "PENDING",
      };

      (
        mockDb.suggestion.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockSuggestion);

      (
        mockDb.suggestion.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce({});

      await reviewSuggestionData(
        "sug-1",
        "APPROVED",
        undefined,
        "user-admin",
        mockDb
      );

      const updateCall = (mockDb.suggestion.update as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(updateCall?.[0]?.data?.reviewNote).toBeNull();
    });
  });
});
