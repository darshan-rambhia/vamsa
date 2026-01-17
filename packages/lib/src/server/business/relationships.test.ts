/**
 * Unit tests for relationship server business logic
 *
 * Tests cover:
 * - Listing relationships with filtering
 * - Getting individual relationships
 * - Creating relationships with bidirectional syncing
 * - Updating relationships with spouse synchronization
 * - Deleting relationships with bidirectional cleanup
 * - Error handling and validation
 * - Edge cases (self-relationships, duplicates, missing data)
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type {
  RelationshipCreateInput,
  RelationshipUpdateInput,
} from "@vamsa/schemas";
import type { RelationshipDb } from "@vamsa/lib/server/business";

// Use shared mock from test setup (logger is already mocked globally in preload)

// Mock logger for this test file
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../../tests/setup/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));


// Import the functions to test
import {
  listRelationshipsData,
  getRelationshipData,
  createRelationshipData,
  updateRelationshipData,
  deleteRelationshipData,
} from "@vamsa/lib/server/business";

// Create mock database client - no mock.module() needed!
function createMockDb(): RelationshipDb {
  return {
    relationship: {
      findMany: mock(() => Promise.resolve([])),
      findFirst: mock(() => Promise.resolve(null)),
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      updateMany: mock(() => Promise.resolve({ count: 0 })),
      delete: mock(() => Promise.resolve({})),
      deleteMany: mock(() => Promise.resolve({ count: 0 })),
    },
    person: {
      findUnique: mock(() => Promise.resolve(null)),
    },
  } as unknown as RelationshipDb;
}

describe("Relationship Server Functions", () => {
  let mockDb: RelationshipDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
  });

  describe("listRelationshipsData", () => {
    it("should list relationships for a person without filter", async () => {
      const personId = "person-1";
      const mockRelationships = [
        {
          id: "rel-1",
          type: "SPOUSE",
          isActive: true,
          marriageDate: new Date("2010-06-15"),
          divorceDate: null,
          relatedPersonId: "person-2",
          relatedPerson: {
            id: "person-2",
            firstName: "Jane",
            lastName: "Doe",
          },
        },
      ];

      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockRelationships);

      const result = await listRelationshipsData(personId, undefined, mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("SPOUSE");
      expect(result[0].isActive).toBe(true);
      expect(result[0].relatedPerson.firstName).toBe("Jane");
      expect(result[0].marriageDate).toBe("2010-06-15");
      expect(result[0].divorceDate).toBeNull();
    });

    it("should filter relationships by type", async () => {
      const personId = "person-1";
      const type = "PARENT";
      const mockRelationships = [
        {
          id: "rel-2",
          type: "PARENT",
          isActive: true,
          marriageDate: null,
          divorceDate: null,
          relatedPersonId: "person-3",
          relatedPerson: {
            id: "person-3",
            firstName: "Bob",
            lastName: "Smith",
          },
        },
      ];

      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockRelationships);

      const result = await listRelationshipsData(personId, type, mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("PARENT");
      expect(mockDb.relationship.findMany).toHaveBeenCalledWith({
        where: {
          personId,
          type,
        },
        include: {
          relatedPerson: true,
        },
      });
    });

    it("should return empty array when no relationships exist", async () => {
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce([]);

      const result = await listRelationshipsData("person-1", undefined, mockDb);

      expect(result).toHaveLength(0);
    });

    it("should handle multiple relationships", async () => {
      const mockRelationships = [
        {
          id: "rel-1",
          type: "SPOUSE",
          isActive: true,
          marriageDate: new Date("2010-06-15"),
          divorceDate: null,
          relatedPersonId: "person-2",
          relatedPerson: {
            id: "person-2",
            firstName: "Jane",
            lastName: "Doe",
          },
        },
        {
          id: "rel-2",
          type: "CHILD",
          isActive: true,
          marriageDate: null,
          divorceDate: null,
          relatedPersonId: "person-4",
          relatedPerson: {
            id: "person-4",
            firstName: "Alice",
            lastName: "Smith",
          },
        },
        {
          id: "rel-3",
          type: "PARENT",
          isActive: true,
          marriageDate: null,
          divorceDate: null,
          relatedPersonId: "person-5",
          relatedPerson: {
            id: "person-5",
            firstName: "Bob",
            lastName: "Smith",
          },
        },
      ];

      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockRelationships);

      const result = await listRelationshipsData("person-1", undefined, mockDb);

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe("SPOUSE");
      expect(result[1].type).toBe("CHILD");
      expect(result[2].type).toBe("PARENT");
    });

    it("should format dates correctly", async () => {
      const mockRelationships = [
        {
          id: "rel-1",
          type: "SPOUSE",
          isActive: true,
          marriageDate: new Date("2010-06-15"),
          divorceDate: new Date("2020-01-10"),
          relatedPersonId: "person-2",
          relatedPerson: {
            id: "person-2",
            firstName: "Jane",
            lastName: "Doe",
          },
        },
      ];

      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockRelationships);

      const result = await listRelationshipsData("person-1", undefined, mockDb);

      expect(result[0].marriageDate).toBe("2010-06-15");
      expect(result[0].divorceDate).toBe("2020-01-10");
    });

    it("should handle null dates", async () => {
      const mockRelationships = [
        {
          id: "rel-1",
          type: "SIBLING",
          isActive: true,
          marriageDate: null,
          divorceDate: null,
          relatedPersonId: "person-2",
          relatedPerson: {
            id: "person-2",
            firstName: "Jane",
            lastName: "Doe",
          },
        },
      ];

      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(mockRelationships);

      const result = await listRelationshipsData("person-1", undefined, mockDb);

      expect(result[0].marriageDate).toBeNull();
      expect(result[0].divorceDate).toBeNull();
    });

    it("should throw and log error on database failure", async () => {
      const error = new Error("Database error");
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockRejectedValueOnce(error);

      try {
        await listRelationshipsData("person-1", undefined, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe("getRelationshipData", () => {
    it("should get a relationship by id", async () => {
      const relationshipId = "rel-1";
      const mockRelationship = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
        marriageDate: new Date("2010-06-15"),
        divorceDate: null,
        relatedPerson: {
          id: "person-2",
          firstName: "Jane",
          lastName: "Doe",
        },
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockRelationship);

      const result = await getRelationshipData(relationshipId, mockDb);

      expect(result.id).toBe(relationshipId);
      expect(result.personId).toBe("person-1");
      expect(result.relatedPersonId).toBe("person-2");
      expect(result.type).toBe("SPOUSE");
      expect(result.relatedPerson.firstName).toBe("Jane");
    });

    it("should format dates correctly", async () => {
      const mockRelationship = {
        id: "rel-1",
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
        marriageDate: new Date("2010-06-15"),
        divorceDate: new Date("2020-01-10"),
        relatedPerson: {
          id: "person-2",
          firstName: "Jane",
          lastName: "Doe",
        },
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockRelationship);

      const result = await getRelationshipData("rel-1", mockDb);

      expect(result.marriageDate).toBe("2010-06-15");
      expect(result.divorceDate).toBe("2020-01-10");
    });

    it("should throw error when relationship not found", async () => {
      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      try {
        await getRelationshipData("rel-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Relationship not found");
      }
    });

    it("should include related person information", async () => {
      const mockRelationship = {
        id: "rel-1",
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "PARENT",
        isActive: true,
        marriageDate: null,
        divorceDate: null,
        relatedPerson: {
          id: "person-2",
          firstName: "Bob",
          lastName: "Smith",
        },
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockRelationship);

      const result = await getRelationshipData("rel-1", mockDb);

      expect(result.relatedPerson).toBeDefined();
      expect(result.relatedPerson.id).toBe("person-2");
      expect(result.relatedPerson.firstName).toBe("Bob");
      expect(result.relatedPerson.lastName).toBe("Smith");
    });

    it("should throw and log error on database failure", async () => {
      const error = new Error("Database error");
      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockRejectedValueOnce(error);

      try {
        await getRelationshipData("rel-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe("createRelationshipData", () => {
    it("should create a parent-child relationship with bidirectional sync", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "PARENT",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      const mockCreated = {
        id: "rel-1",
        personId: input.personId,
        relatedPersonId: input.relatedPersonId,
        type: input.type,
        marriageDate: null,
        divorceDate: null,
        isActive: true,
      };
      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValue(mockCreated);

      const result = await createRelationshipData(input, mockDb);

      expect(result.id).toBe("rel-1");
      expect(mockDb.relationship.create).toHaveBeenCalledTimes(2);
    });

    it("should create spouse relationship with marriage date", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: "2010-06-15",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      const mockCreated = {
        id: "rel-1",
        personId: input.personId,
        relatedPersonId: input.relatedPersonId,
        type: input.type,
        marriageDate: new Date("2010-06-15"),
        divorceDate: null,
        isActive: true,
      };
      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValue(mockCreated);

      const result = await createRelationshipData(input, mockDb);

      expect(result.id).toBe("rel-1");
    });

    it("should set isActive to false for divorced spouse", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: "2010-06-15",
        divorceDate: "2020-01-10",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      (mockDb.relationship.create as ReturnType<typeof mock>).mockImplementation((args: any) => {
        return Promise.resolve({
          id: "rel-1",
          ...args.data,
        });
      });

      await createRelationshipData(input, mockDb);

      const firstCall = (mockDb.relationship.create as ReturnType<typeof mock>).mock.calls[0];
      expect(firstCall?.[0]?.data?.isActive).toBe(false);
    });

    it("should set isActive to true for non-spouse relationships", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "CHILD",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "rel-1",
        personId: input.personId,
        relatedPersonId: input.relatedPersonId,
        type: input.type,
        marriageDate: null,
        divorceDate: null,
        isActive: true,
      });

      await createRelationshipData(input, mockDb);

      const firstCall = (mockDb.relationship.create as ReturnType<typeof mock>).mock.calls[0];
      expect(firstCall?.[0]?.data?.isActive).toBe(true);
    });

    it("should reject self-relationships", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-1",
        type: "SPOUSE",
      };

      try {
        await createRelationshipData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Cannot create relationship with self"
        );
      }
    });

    it("should verify both persons exist", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce(null);

      try {
        await createRelationshipData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "One or both persons not found"
        );
      }
    });

    it("should check for duplicate relationships", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: "rel-existing",
      });

      try {
        await createRelationshipData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "This relationship already exists"
        );
      }
    });

    it("should create CHILD inverse for PARENT relationship", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "PARENT",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);
      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValue({ id: "rel-1" });

      await createRelationshipData(input, mockDb);

      const calls = (mockDb.relationship.create as ReturnType<typeof mock>).mock.calls;
      expect(calls).toHaveLength(2);

      const inverseCall = calls[1];
      expect(inverseCall?.[0]?.data?.type).toBe("CHILD");
      expect(inverseCall?.[0]?.data?.personId).toBe("person-2");
      expect(inverseCall?.[0]?.data?.relatedPersonId).toBe("person-1");
    });

    it("should create PARENT inverse for CHILD relationship", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "CHILD",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);
      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValue({ id: "rel-1" });

      await createRelationshipData(input, mockDb);

      const calls = (mockDb.relationship.create as ReturnType<typeof mock>).mock.calls;
      const inverseCall = calls[1];
      expect(inverseCall?.[0]?.data?.type).toBe("PARENT");
    });

    it("should create same-type inverse for SPOUSE relationship", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);
      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValue({ id: "rel-1" });

      await createRelationshipData(input, mockDb);

      const calls = (mockDb.relationship.create as ReturnType<typeof mock>).mock.calls;
      const inverseCall = calls[1];
      expect(inverseCall?.[0]?.data?.type).toBe("SPOUSE");
    });

    it("should create same-type inverse for SIBLING relationship", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SIBLING",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);
      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValue({ id: "rel-1" });

      await createRelationshipData(input, mockDb);

      const calls = (mockDb.relationship.create as ReturnType<typeof mock>).mock.calls;
      const inverseCall = calls[1];
      expect(inverseCall?.[0]?.data?.type).toBe("SIBLING");
    });

    it("should throw and log error when bidirectional creation fails", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValueOnce({ id: "rel-1" });
      const error = new Error("Bidirectional sync failed");
      (mockDb.relationship.create as ReturnType<typeof mock>).mockRejectedValueOnce(error);

      try {
        await createRelationshipData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });

    it("should handle date strings in input", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: "2010-06-15",
        divorceDate: "2020-01-10",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);
      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValue({ id: "rel-1" });

      await createRelationshipData(input, mockDb);

      const firstCall = (mockDb.relationship.create as ReturnType<typeof mock>).mock.calls[0];
      expect(firstCall?.[0]?.data?.marriageDate).toBeInstanceOf(Date);
      expect(firstCall?.[0]?.data?.divorceDate).toBeInstanceOf(Date);
    });

    it("should return relationship id on success", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);
      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValue({ id: "rel-abc123" });

      const result = await createRelationshipData(input, mockDb);

      expect(result.id).toBe("rel-abc123");
    });
  });

  describe("updateRelationshipData", () => {
    it("should update relationship dates", async () => {
      const relationshipId = "rel-1";
      const input: RelationshipUpdateInput = {
        marriageDate: new Date("2010-06-15"),
        divorceDate: null,
      };

      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
        marriageDate: null,
        divorceDate: null,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        ...mockExisting,
        id: relationshipId,
        marriageDate: new Date("2010-06-15"),
      });

      const result = await updateRelationshipData(
        relationshipId,
        input,
        mockDb
      );

      expect(result.id).toBe(relationshipId);
      expect(mockDb.relationship.update).toHaveBeenCalled();
    });

    it("should update spouse relationship with bidirectional sync", async () => {
      const relationshipId = "rel-1";
      const input: RelationshipUpdateInput = {
        marriageDate: new Date("2010-06-15"),
      };

      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
        marriageDate: null,
        divorceDate: null,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: relationshipId,
      });
      (mockDb.relationship.updateMany as ReturnType<typeof mock>).mockResolvedValueOnce({ count: 1 });

      await updateRelationshipData(relationshipId, input, mockDb);

      expect(mockDb.relationship.updateMany).toHaveBeenCalledWith({
        where: {
          personId: "person-2",
          relatedPersonId: "person-1",
          type: "SPOUSE",
        },
        data: expect.objectContaining({
          marriageDate: expect.any(Date),
        }),
      });
    });

    it("should set isActive to false when divorce date is set for spouse", async () => {
      const relationshipId = "rel-1";
      const input: RelationshipUpdateInput = {
        divorceDate: new Date("2020-01-10"),
      };

      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
        marriageDate: new Date("2010-06-15"),
        divorceDate: null,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);

      let updateData: any = null;
      (mockDb.relationship.update as ReturnType<typeof mock>).mockImplementation((args: any) => {
        updateData = args.data;
        return Promise.resolve({ id: relationshipId });
      });

      (mockDb.relationship.updateMany as ReturnType<typeof mock>).mockResolvedValueOnce({ count: 1 });

      await updateRelationshipData(relationshipId, input, mockDb);

      expect(updateData?.isActive).toBe(false);
    });

    it("should not sync non-spouse relationships", async () => {
      const relationshipId = "rel-1";
      const input: RelationshipUpdateInput = {
        marriageDate: new Date("2010-06-15"),
      };

      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "PARENT",
        isActive: true,
        marriageDate: null,
        divorceDate: null,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.update as ReturnType<typeof mock>).mockResolvedValueOnce({
        id: relationshipId,
      });

      await updateRelationshipData(relationshipId, input, mockDb);

      expect(mockDb.relationship.updateMany).not.toHaveBeenCalled();
    });

    it("should throw error when relationship not found", async () => {
      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      try {
        await updateRelationshipData("rel-nonexistent", {}, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Relationship not found");
      }
    });

    it("should throw and log error on database failure", async () => {
      const relationshipId = "rel-1";
      const input: RelationshipUpdateInput = {
        marriageDate: new Date("2010-06-15"),
      };

      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      const error = new Error("Database error");
      (mockDb.relationship.update as ReturnType<typeof mock>).mockRejectedValueOnce(error);

      try {
        await updateRelationshipData(relationshipId, input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe("deleteRelationshipData", () => {
    it("should delete a relationship", async () => {
      const relationshipId = "rel-1";
      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
        marriageDate: null,
        divorceDate: null,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.delete as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.deleteMany as ReturnType<typeof mock>).mockResolvedValueOnce({ count: 1 });

      const result = await deleteRelationshipData(relationshipId, mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.relationship.delete).toHaveBeenCalledWith({
        where: { id: relationshipId },
      });
    });

    it("should delete bidirectional relationship for SPOUSE", async () => {
      const relationshipId = "rel-1";
      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
        marriageDate: null,
        divorceDate: null,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.delete as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.deleteMany as ReturnType<typeof mock>).mockResolvedValueOnce({ count: 1 });

      await deleteRelationshipData(relationshipId, mockDb);

      expect(mockDb.relationship.deleteMany).toHaveBeenCalledWith({
        where: {
          personId: "person-2",
          relatedPersonId: "person-1",
          type: "SPOUSE",
        },
      });
    });

    it("should delete CHILD inverse for PARENT relationship", async () => {
      const relationshipId = "rel-1";
      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "PARENT",
        isActive: true,
        marriageDate: null,
        divorceDate: null,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.delete as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.deleteMany as ReturnType<typeof mock>).mockResolvedValueOnce({ count: 1 });

      await deleteRelationshipData(relationshipId, mockDb);

      expect(mockDb.relationship.deleteMany).toHaveBeenCalledWith({
        where: {
          personId: "person-2",
          relatedPersonId: "person-1",
          type: "CHILD",
        },
      });
    });

    it("should throw error when relationship not found", async () => {
      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(null);

      try {
        await deleteRelationshipData("rel-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Relationship not found");
      }
    });

    it("should throw and log error on database failure", async () => {
      const relationshipId = "rel-1";
      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      const error = new Error("Database error");
      (mockDb.relationship.delete as ReturnType<typeof mock>).mockRejectedValueOnce(error);

      try {
        await deleteRelationshipData(relationshipId, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });

    it("should return success indicator", async () => {
      const relationshipId = "rel-1";
      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.delete as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.deleteMany as ReturnType<typeof mock>).mockResolvedValueOnce({ count: 1 });

      const result = await deleteRelationshipData(relationshipId, mockDb);

      expect(result).toEqual({ success: true });
    });
  });

  describe("Error handling across all functions", () => {
    it("should log errors with context", async () => {
      (mockDb.relationship.findMany as ReturnType<typeof mock>).mockRejectedValueOnce(
        new Error("DB error")
      );

      try {
        await listRelationshipsData("person-1", undefined, mockDb);
      } catch {
        // Expected
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          personId: "person-1",
          error: "DB error",
        }),
        "Failed to list relationships"
      );
    });

    it("should preserve original error when throwing", async () => {
      const originalError = new Error("Original error");
      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockRejectedValueOnce(originalError);

      try {
        await getRelationshipData("rel-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(originalError);
      }
    });
  });

  describe("Bidirectional relationship logic", () => {
    it("should maintain bidirectional consistency for PARENT-CHILD", async () => {
      const input: RelationshipCreateInput = {
        personId: "parent",
        relatedPersonId: "child",
        type: "PARENT",
      };

      (mockDb.person.findUnique as ReturnType<typeof mock>)
        .mockResolvedValueOnce({ id: "parent" })
        .mockResolvedValueOnce({ id: "child" });
      (mockDb.relationship.findFirst as ReturnType<typeof mock>).mockResolvedValueOnce(null);
      (mockDb.relationship.create as ReturnType<typeof mock>).mockResolvedValue({ id: "rel-1" });

      await createRelationshipData(input, mockDb);

      const calls = (mockDb.relationship.create as ReturnType<typeof mock>).mock.calls;

      const parentCall = calls[0]?.[0];
      const childCall = calls[1]?.[0];

      expect(parentCall?.data?.personId).toBe("parent");
      expect(parentCall?.data?.relatedPersonId).toBe("child");
      expect(parentCall?.data?.type).toBe("PARENT");

      expect(childCall?.data?.personId).toBe("child");
      expect(childCall?.data?.relatedPersonId).toBe("parent");
      expect(childCall?.data?.type).toBe("CHILD");
    });

    it("should sync marriage dates for spouse relationships", async () => {
      const relationshipId = "rel-1";
      const input: RelationshipUpdateInput = {
        marriageDate: new Date("2010-06-15"),
      };

      const mockExisting = {
        id: relationshipId,
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        isActive: true,
      };

      (mockDb.relationship.findUnique as ReturnType<typeof mock>).mockResolvedValueOnce(mockExisting);
      (mockDb.relationship.update as ReturnType<typeof mock>).mockResolvedValueOnce({ id: relationshipId });
      (mockDb.relationship.updateMany as ReturnType<typeof mock>).mockResolvedValueOnce({ count: 1 });

      await updateRelationshipData(relationshipId, input, mockDb);

      const updateCall = (mockDb.relationship.updateMany as ReturnType<typeof mock>).mock.calls[0];
      expect(updateCall?.[0]?.data?.marriageDate).toBeInstanceOf(Date);
    });
  });
});
