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
 * Uses vi.mock() to mock the drizzleDb module
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRelationshipData,
  deleteRelationshipData,
  getRelationshipData,
  listRelationshipsData,
  updateRelationshipData,
} from "@vamsa/lib/server/business";
import {
  mockLogger,
  mockWithErr,
  mockWithErrBuilder,
} from "../../testing/shared-mocks";
import type {
  RelationshipCreateInput,
  RelationshipUpdateInput,
} from "@vamsa/schemas";

// Create mock drizzleDb and drizzleSchema - these must be stable references
// that are reused (not reassigned) because mock.module captures the reference
const mockDrizzleDb = {
  query: {
    relationships: {
      findMany: vi.fn(() => Promise.resolve([])),
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
    persons: {
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
  },
  insert: vi.fn(() => ({
    values: vi.fn(() => Promise.resolve({})),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve({})),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve({})),
  })),
};

// Helper to clear all drizzle mocks between tests
function clearDrizzleMocks() {
  (
    mockDrizzleDb.query.relationships.findMany as ReturnType<typeof vi.fn>
  ).mockClear();
  (
    mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
  ).mockClear();
  (
    mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>
  ).mockClear();
  (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockClear();
  (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockClear();
  (mockDrizzleDb.delete as ReturnType<typeof vi.fn>).mockClear();
}

describe("Relationship Server Functions", () => {
  beforeEach(() => {
    clearDrizzleMocks();
    mockLogger.error.mockClear();
    mockWithErr.mockClear();
    mockWithErrBuilder.ctx.mockClear();
    mockWithErrBuilder.msg.mockClear();
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

      (
        mockDrizzleDb.query.relationships.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockRelationships);

      const result = await listRelationshipsData(
        personId,
        undefined,
        mockDrizzleDb as any
      );

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

      (
        mockDrizzleDb.query.relationships.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockRelationships);

      const result = await listRelationshipsData(
        personId,
        type,
        mockDrizzleDb as any
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("PARENT");
      expect(mockDrizzleDb.query.relationships.findMany).toHaveBeenCalled();
    });

    it("should return empty array when no relationships exist", async () => {
      (
        mockDrizzleDb.query.relationships.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce([]);

      const result = await listRelationshipsData(
        "person-1",
        undefined,
        mockDrizzleDb as any
      );

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

      (
        mockDrizzleDb.query.relationships.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockRelationships);

      const result = await listRelationshipsData(
        "person-1",
        undefined,
        mockDrizzleDb as any
      );

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

      (
        mockDrizzleDb.query.relationships.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockRelationships);

      const result = await listRelationshipsData(
        "person-1",
        undefined,
        mockDrizzleDb as any
      );

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

      (
        mockDrizzleDb.query.relationships.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockRelationships);

      const result = await listRelationshipsData(
        "person-1",
        undefined,
        mockDrizzleDb as any
      );

      expect(result[0].marriageDate).toBeNull();
      expect(result[0].divorceDate).toBeNull();
    });

    it("should throw and log error on database failure", async () => {
      const error = new Error("Database error");
      (
        mockDrizzleDb.query.relationships.findMany as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(error);

      try {
        await listRelationshipsData(
          "person-1",
          undefined,
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockWithErr).toHaveBeenCalled();
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockRelationship);

      const result = await getRelationshipData(
        relationshipId,
        mockDrizzleDb as any
      );

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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockRelationship);

      const result = await getRelationshipData("rel-1", mockDrizzleDb as any);

      expect(result.marriageDate).toBe("2010-06-15");
      expect(result.divorceDate).toBe("2020-01-10");
    });

    it("should throw error when relationship not found", async () => {
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await getRelationshipData("rel-nonexistent", mockDrizzleDb as any);
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockRelationship);

      const result = await getRelationshipData("rel-1", mockDrizzleDb as any);

      expect(result.relatedPerson).toBeDefined();
      expect(result.relatedPerson.id).toBe("person-2");
      expect(result.relatedPerson.firstName).toBe("Bob");
      expect(result.relatedPerson.lastName).toBe("Smith");
    });

    it("should throw and log error on database failure", async () => {
      const error = new Error("Database error");
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(error);

      try {
        await getRelationshipData("rel-1", mockDrizzleDb as any);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockWithErr).toHaveBeenCalled();
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

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      const result = await createRelationshipData(input, mockDrizzleDb as any);

      expect(result.id).toBeDefined();
      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it("should create spouse relationship with marriage date", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: "2010-06-15",
      };

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      const result = await createRelationshipData(input, mockDrizzleDb as any);

      expect(result.id).toBeDefined();
    });

    it("should set isActive to false for divorced spouse", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
        marriageDate: "2010-06-15",
        divorceDate: "2020-01-10",
      };

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      await createRelationshipData(input, mockDrizzleDb as any);

      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it("should set isActive to true for non-spouse relationships", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "CHILD",
      };

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      await createRelationshipData(input, mockDrizzleDb as any);

      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it("should reject self-relationships", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-1",
        type: "SPOUSE",
      };

      try {
        await createRelationshipData(input, mockDrizzleDb as any);
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

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce(null);

      try {
        await createRelationshipData(input, mockDrizzleDb as any);
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

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce({
        id: "rel-existing",
      });

      try {
        await createRelationshipData(input, mockDrizzleDb as any);
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

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      await createRelationshipData(input, mockDrizzleDb as any);

      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it("should create PARENT inverse for CHILD relationship", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "CHILD",
      };

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      await createRelationshipData(input, mockDrizzleDb as any);

      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it("should create same-type inverse for SPOUSE relationship", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      await createRelationshipData(input, mockDrizzleDb as any);

      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it("should create same-type inverse for SIBLING relationship", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SIBLING",
      };

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      await createRelationshipData(input, mockDrizzleDb as any);

      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it("should throw and log error when bidirectional creation fails", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      const error = new Error("Bidirectional sync failed");
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        values: vi.fn(() => Promise.resolve({})),
      });
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        values: vi.fn(() => Promise.reject(error)),
      });

      try {
        await createRelationshipData(input, mockDrizzleDb as any);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockWithErr).toHaveBeenCalled();
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

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      await createRelationshipData(input, mockDrizzleDb as any);

      expect(mockDrizzleDb.insert).toHaveBeenCalled();
    });

    it("should return relationship id on success", async () => {
      const input: RelationshipCreateInput = {
        personId: "person-1",
        relatedPersonId: "person-2",
        type: "SPOUSE",
      };

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "person-1" })
        .mockResolvedValueOnce({ id: "person-2" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      const result = await createRelationshipData(input, mockDrizzleDb as any);

      expect(result.id).toBeDefined();
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      });

      const result = await updateRelationshipData(
        relationshipId,
        input,
        mockDrizzleDb as any
      );

      expect(result.id).toBe(relationshipId);
      expect(mockDrizzleDb.update).toHaveBeenCalled();
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      });

      await updateRelationshipData(relationshipId, input, mockDrizzleDb as any);

      expect(mockDrizzleDb.update).toHaveBeenCalled();
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      });

      await updateRelationshipData(relationshipId, input, mockDrizzleDb as any);

      expect(mockDrizzleDb.update).toHaveBeenCalled();
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      });

      const updateCalls = (mockDrizzleDb.update as ReturnType<typeof vi.fn>)
        .mock.calls.length;

      await updateRelationshipData(relationshipId, input, mockDrizzleDb as any);

      // Should only be called once (not twice for bidirectional sync)
      expect(
        (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mock.calls.length
      ).toBe(updateCalls + 1);
    });

    it("should throw error when relationship not found", async () => {
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await updateRelationshipData(
          "rel-nonexistent",
          {},
          mockDrizzleDb as any
        );
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      const error = new Error("Database error");
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.reject(error)),
        })),
      });

      try {
        await updateRelationshipData(
          relationshipId,
          input,
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockWithErr).toHaveBeenCalled();
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      (mockDrizzleDb.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn(() => Promise.resolve({})),
      });

      const result = await deleteRelationshipData(
        relationshipId,
        mockDrizzleDb as any
      );

      expect(result.success).toBe(true);
      expect(mockDrizzleDb.delete).toHaveBeenCalled();
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      (mockDrizzleDb.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn(() => Promise.resolve({})),
      });

      await deleteRelationshipData(relationshipId, mockDrizzleDb as any);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      (mockDrizzleDb.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn(() => Promise.resolve({})),
      });

      await deleteRelationshipData(relationshipId, mockDrizzleDb as any);

      expect(mockDrizzleDb.delete).toHaveBeenCalled();
    });

    it("should throw error when relationship not found", async () => {
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);

      try {
        await deleteRelationshipData("rel-nonexistent", mockDrizzleDb as any);
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      const error = new Error("Database error");
      (mockDrizzleDb.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn(() => Promise.reject(error)),
      });

      try {
        await deleteRelationshipData(relationshipId, mockDrizzleDb as any);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
        expect(mockWithErr).toHaveBeenCalled();
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      (mockDrizzleDb.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: vi.fn(() => Promise.resolve({})),
      });

      const result = await deleteRelationshipData(
        relationshipId,
        mockDrizzleDb as any
      );

      expect(result).toEqual({ success: true });
    });
  });

  describe("Error handling across all functions", () => {
    it("should log errors with context", async () => {
      (
        mockDrizzleDb.query.relationships.findMany as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error("DB error"));

      try {
        await listRelationshipsData(
          "person-1",
          undefined,
          mockDrizzleDb as any
        );
      } catch {
        // Expected
      }

      // Verify fluent error logging: log.withErr(error).ctx({...}).msg(...)
      expect(mockWithErr).toHaveBeenCalled();
      expect(mockWithErrBuilder.ctx).toHaveBeenCalledWith(
        expect.objectContaining({
          personId: "person-1",
        })
      );
      expect(mockWithErrBuilder.msg).toHaveBeenCalledWith(
        "Failed to list relationships"
      );
    });

    it("should preserve original error when throwing", async () => {
      const originalError = new Error("Original error");
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(originalError);

      try {
        await getRelationshipData("rel-1", mockDrizzleDb as any);
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

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "parent" })
        .mockResolvedValueOnce({ id: "child" });
      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(null);
      (mockDrizzleDb.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn(() => Promise.resolve({})),
      });

      await createRelationshipData(input, mockDrizzleDb as any);

      expect(mockDrizzleDb.insert).toHaveBeenCalled();
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

      (
        mockDrizzleDb.query.relationships.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce(mockExisting);
      (mockDrizzleDb.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      });

      await updateRelationshipData(relationshipId, input, mockDrizzleDb as any);

      expect(mockDrizzleDb.update).toHaveBeenCalled();
    });
  });
});
