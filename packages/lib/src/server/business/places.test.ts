/**
 * Unit tests for place server business logic
 *
 * Tests cover:
 * - Retrieving places with hierarchy and counts
 * - Searching places by name with case-insensitive matching
 * - Creating and updating places with parent validation
 * - Deleting places with usage validation
 * - Managing person-place links
 * - Handling place hierarchies and paths
 * - Formatting place data for API responses
 * - Error handling and validation
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { PlaceDb } from "@vamsa/lib/server/business";

// Mock logger for this test file
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

// Import the functions to test
import {
  formatPlace,
  getPlaceData,
  searchPlacesData,
  getPersonPlacesData,
  createPlaceData,
  updatePlaceData,
  deletePlaceData,
  linkPersonToPlaceData,
  getPlaceHierarchyPathData,
  getPlaceChildrenData,
  updatePlacePersonLinkData,
  unlinkPersonFromPlaceData,
  getPlaceHierarchyData,
} from "@vamsa/lib/server/business";

// Create mock database client
function createMockDb(): PlaceDb {
  return {
    place: {
      findUnique: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    person: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    placePersonLink: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    event: {
      findMany: mock(() => Promise.resolve([])),
    },
  } as unknown as PlaceDb;
}

describe("Place Server Business Logic", () => {
  let mockDb: PlaceDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
  });

  describe("formatPlace", () => {
    it("should format place with all fields", () => {
      const mockPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: 51.5074,
        longitude: -0.1278,
        parentId: "place-2",
        description: "Capital of England",
        alternativeNames: ["The Big Smoke", "Square Mile"],
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-15"),
      };

      const result = formatPlace(mockPlace);

      expect(result.id).toBe("place-1");
      expect(result.name).toBe("London");
      expect(result.placeType).toBe("CITY");
      expect(result.latitude).toBe(51.5074);
      expect(result.longitude).toBe(-0.1278);
      expect(result.description).toBe("Capital of England");
      expect(result.alternativeNames).toEqual(["The Big Smoke", "Square Mile"]);
      expect(typeof result.createdAt).toBe("string");
      expect(typeof result.updatedAt).toBe("string");
    });

    it("should handle null values in alternativeNames", () => {
      const mockPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: 51.5074,
        longitude: -0.1278,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = formatPlace(mockPlace);

      expect(result.alternativeNames).toBeNull();
    });
  });

  describe("getPlaceData", () => {
    it("should get a place with hierarchy and counts", async () => {
      const mockPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: 51.5074,
        longitude: -0.1278,
        parentId: "place-2",
        description: "Capital of England",
        alternativeNames: null,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        parent: {
          id: "place-2",
          name: "England",
          placeType: "COUNTRY",
          latitude: null,
          longitude: null,
          parentId: null,
          description: null,
          alternativeNames: null,
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        children: [{ id: "place-3" }, { id: "place-4" }],
        events: [{ id: "event-1" }, { id: "event-2" }],
        personLinks: [{ id: "link-1" }, { id: "link-2" }, { id: "link-3" }],
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace);

      const result = await getPlaceData("place-1", mockDb);

      expect(result.id).toBe("place-1");
      expect(result.name).toBe("London");
      expect(result.childCount).toBe(2);
      expect(result.eventCount).toBe(2);
      expect(result.personCount).toBe(3);
      expect(result.parent).toBeDefined();
      expect(result.parent?.name).toBe("England");
    });

    it("should handle place with no parent", async () => {
      const mockPlace = {
        id: "place-1",
        name: "United Kingdom",
        placeType: "COUNTRY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
        children: [],
        events: [],
        personLinks: [],
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace);

      const result = await getPlaceData("place-1", mockDb);

      expect(result.parent).toBeNull();
      expect(result.childCount).toBe(0);
    });

    it("should throw error when place not found", async () => {
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getPlaceData("place-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Place not found");
      }
    });
  });

  describe("searchPlacesData", () => {
    it("should search places by name case-insensitively", async () => {
      const mockPlaces = [
        {
          id: "place-1",
          name: "London",
          placeType: "CITY",
          latitude: 51.5074,
          longitude: -0.1278,
          parentId: null,
          description: null,
          alternativeNames: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: null,
        },
      ];

      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPlaces
      );

      const result = await searchPlacesData("london", mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("London");
      // Verify case-insensitive search was used
      const findManyCall = (mockDb.place.findMany as ReturnType<typeof mock>)
        .mock.calls[0][0];
      expect(findManyCall.where.name.mode).toBe("insensitive");
    });

    it("should limit results to 50", async () => {
      const mockPlaces = Array.from({ length: 60 }, (_, i) => ({
        id: `place-${i}`,
        name: `Place ${i}`,
        placeType: "CITY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
      }));

      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPlaces.slice(0, 50)
      );

      const _result = await searchPlacesData("Place", mockDb);

      // Verify take: 50 was used
      const findManyCall = (mockDb.place.findMany as ReturnType<typeof mock>)
        .mock.calls[0][0];
      expect(findManyCall.take).toBe(50);
    });

    it("should include parent name in results", async () => {
      const mockPlaces = [
        {
          id: "place-1",
          name: "London",
          placeType: "CITY",
          latitude: 51.5074,
          longitude: -0.1278,
          parentId: "place-2",
          description: null,
          alternativeNames: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: {
            id: "place-2",
            name: "England",
            placeType: "COUNTRY",
            latitude: null,
            longitude: null,
            parentId: null,
            description: null,
            alternativeNames: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPlaces
      );

      const result = await searchPlacesData("London", mockDb);

      expect(result[0].parentName).toBe("England");
    });

    it("should sort by type then name", async () => {
      const mockPlaces = [
        {
          id: "place-1",
          name: "London",
          placeType: "CITY",
          latitude: null,
          longitude: null,
          parentId: null,
          description: null,
          alternativeNames: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: null,
        },
      ];

      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPlaces
      );

      await searchPlacesData("Place", mockDb);

      const findManyCall = (mockDb.place.findMany as ReturnType<typeof mock>)
        .mock.calls[0][0];
      expect(findManyCall.orderBy).toEqual([
        { placeType: "asc" },
        { name: "asc" },
      ]);
    });
  });

  describe("createPlaceData", () => {
    it("should create a place without parent", async () => {
      const mockCreated = {
        id: "place-1",
        name: "England",
        placeType: "COUNTRY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: "A country",
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockDb.place.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockCreated
      );

      const result = await createPlaceData(
        {
          name: "England",
          placeType: "COUNTRY",
          description: "A country",
        },
        mockDb
      );

      expect(result.id).toBe("place-1");
      expect(result.name).toBe("England");
      expect(result.description).toBe("A country");
    });

    it("should create a place with parent", async () => {
      const mockParent = { id: "place-2" };
      const mockCreated = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: 51.5074,
        longitude: -0.1278,
        parentId: "place-2",
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockParent);
      (mockDb.place.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockCreated
      );

      const result = await createPlaceData(
        {
          name: "London",
          placeType: "CITY",
          latitude: 51.5074,
          longitude: -0.1278,
          parentId: "place-2",
        },
        mockDb
      );

      expect(result.parentId).toBe("place-2");
      expect(mockDb.place.findUnique).toHaveBeenCalledWith({
        where: { id: "place-2" },
      });
    });

    it("should validate parent place exists", async () => {
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await createPlaceData(
          {
            name: "London",
            placeType: "CITY",
            parentId: "place-nonexistent",
          },
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Parent place not found");
      }
    });

    it("should handle alternative names", async () => {
      const mockCreated = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: ["The Big Smoke", "City of London"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockDb.place.create as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockCreated
      );

      const result = await createPlaceData(
        {
          name: "London",
          placeType: "CITY",
          alternativeNames: ["The Big Smoke", "City of London"],
        },
        mockDb
      );

      expect(result.alternativeNames).toEqual([
        "The Big Smoke",
        "City of London",
      ]);
    });
  });

  describe("updatePlaceData", () => {
    it("should update a place name", async () => {
      const mockExisting = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: 51.5074,
        longitude: -0.1278,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = { ...mockExisting, name: "Greater London" };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockExisting);
      (mockDb.place.update as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockUpdated
      );

      const result = await updatePlaceData(
        "place-1",
        { name: "Greater London" },
        mockDb
      );

      expect(result.name).toBe("Greater London");
    });

    it("should prevent circular hierarchy", async () => {
      const mockExisting = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockExisting); // First call to verify existing place
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockExisting); // Second call to verify parent place exists

      try {
        await updatePlaceData("place-1", { parentId: "place-1" }, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("A place cannot be its own parent");
      }
    });

    it("should validate new parent exists", async () => {
      const mockExisting = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockExisting);
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null); // Parent not found

      try {
        await updatePlaceData(
          "place-1",
          { parentId: "place-nonexistent" },
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Parent place not found");
      }
    });

    it("should throw error when place not found", async () => {
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await updatePlaceData(
          "place-nonexistent",
          { name: "New Name" },
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Place not found");
      }
    });
  });

  describe("deletePlaceData", () => {
    it("should delete a place with no usage", async () => {
      const mockPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        children: [],
        events: [],
        personLinks: [],
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace);
      (mockDb.place.delete as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPlace
      );

      const result = await deletePlaceData("place-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.place.delete).toHaveBeenCalledWith({
        where: { id: "place-1" },
      });
    });

    it("should reject deletion if place has events", async () => {
      const mockPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        children: [],
        events: [{ id: "event-1" }],
        personLinks: [],
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace);

      try {
        await deletePlaceData("place-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Cannot delete place: 1 events"
        );
      }
    });

    it("should reject deletion if place has person links", async () => {
      const mockPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        children: [],
        events: [],
        personLinks: [{ id: "link-1" }, { id: "link-2" }],
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace);

      try {
        await deletePlaceData("place-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Cannot delete place: 2 people are linked"
        );
      }
    });

    it("should reject deletion if place has children", async () => {
      const mockPlace = {
        id: "place-1",
        name: "England",
        placeType: "COUNTRY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        children: [{ id: "place-2" }],
        events: [],
        personLinks: [],
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace);

      try {
        await deletePlaceData("place-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "Cannot delete place: 1 child places exist"
        );
      }
    });

    it("should throw error when place not found", async () => {
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await deletePlaceData("place-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Place not found");
      }
    });
  });

  describe("linkPersonToPlaceData", () => {
    it("should link a person to a place with type and years", async () => {
      const mockPerson = { id: "person-1" };
      const mockPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: 51.5074,
        longitude: -0.1278,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
      };
      const mockLink = {
        id: "link-1",
        personId: "person-1",
        placeId: "place-1",
        fromYear: 2000,
        toYear: 2010,
        type: "LIVED",
        createdAt: new Date(),
        place: mockPlace,
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace);
      (
        mockDb.placePersonLink.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null); // No existing link
      (
        mockDb.placePersonLink.create as ReturnType<typeof mock>
      ).mockResolvedValueOnce({ id: "link-1" });
      (
        mockDb.placePersonLink.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockLink);

      const result = await linkPersonToPlaceData(
        {
          personId: "person-1",
          placeId: "place-1",
          type: "LIVED",
          fromYear: 2000,
          toYear: 2010,
        },
        mockDb
      );

      expect(result.id).toBe("link-1");
      expect(result.place.name).toBe("London");
      expect(result.fromYear).toBe(2000);
      expect(result.toYear).toBe(2010);
    });

    it("should throw error when person not found", async () => {
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await linkPersonToPlaceData(
          {
            personId: "person-nonexistent",
            placeId: "place-1",
          },
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Person not found");
      }
    });

    it("should throw error when place not found", async () => {
      const mockPerson = { id: "person-1" };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await linkPersonToPlaceData(
          {
            personId: "person-1",
            placeId: "place-nonexistent",
          },
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Place not found");
      }
    });

    it("should prevent duplicate links with same type", async () => {
      const mockPerson = { id: "person-1" };
      const mockPlace = { id: "place-1" };
      const existingLink = { id: "link-existing" };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace);
      (
        mockDb.placePersonLink.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(existingLink); // Link already exists

      try {
        await linkPersonToPlaceData(
          {
            personId: "person-1",
            placeId: "place-1",
            type: "LIVED",
          },
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain(
          "already linked to this place with this type"
        );
      }
    });
  });

  describe("getPersonPlacesData", () => {
    it("should get all places for a person", async () => {
      const mockPerson = { id: "person-1" };
      const mockPlace1 = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
      };

      const mockLinks = [
        {
          id: "link-1",
          personId: "person-1",
          placeId: "place-1",
          fromYear: 2000,
          toYear: 2010,
          type: "LIVED",
          createdAt: new Date(),
          place: mockPlace1,
        },
      ];

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.placePersonLink.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockLinks);

      const result = await getPersonPlacesData("person-1", mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].place.name).toBe("London");
      expect(result[0].fromYear).toBe(2000);
      expect(result[0].toYear).toBe(2010);
    });

    it("should throw error when person not found", async () => {
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getPersonPlacesData("person-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Person not found");
      }
    });
  });

  describe("getPlaceHierarchyPathData", () => {
    it("should get hierarchy path for nested place", async () => {
      const mockPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: null,
        longitude: null,
        parentId: "place-2",
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: {
          id: "place-2",
          name: "England",
          placeType: "COUNTRY",
          latitude: null,
          longitude: null,
          parentId: "place-3",
          description: null,
          alternativeNames: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockParent = {
        id: "place-2",
        name: "England",
        placeType: "COUNTRY",
        latitude: null,
        longitude: null,
        parentId: "place-3",
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: {
          id: "place-3",
          name: "United Kingdom",
          placeType: "COUNTRY",
          latitude: null,
          longitude: null,
          parentId: null,
          description: null,
          alternativeNames: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mockGrandparent = {
        id: "place-3",
        name: "United Kingdom",
        placeType: "COUNTRY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace);
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockParent);
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockGrandparent);

      const result = await getPlaceHierarchyPathData("place-1", mockDb);

      expect(result).toBe("United Kingdom, England, London");
    });

    it("should throw error when place not found", async () => {
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getPlaceHierarchyPathData("place-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Place not found");
      }
    });
  });

  describe("getPlaceChildrenData", () => {
    it("should get all children of a place", async () => {
      const mockChildren = [
        {
          id: "place-2",
          name: "London",
          placeType: "CITY",
          latitude: null,
          longitude: null,
          parentId: "place-1",
          description: null,
          alternativeNames: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "place-3",
          name: "Manchester",
          placeType: "CITY",
          latitude: null,
          longitude: null,
          parentId: "place-1",
          description: null,
          alternativeNames: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockChildren
      );

      const result = await getPlaceChildrenData("place-1", mockDb);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("London");
      expect(result[1].name).toBe("Manchester");
    });
  });

  describe("updatePlacePersonLinkData", () => {
    it("should update a place-person link", async () => {
      const mockLink = {
        id: "link-1",
        personId: "person-1",
        placeId: "place-1",
        fromYear: 2000,
        toYear: 2010,
        type: "LIVED",
      };

      const mockPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
      };

      const mockUpdatedLink = {
        ...mockLink,
        fromYear: 2005,
        toYear: 2015,
        place: mockPlace,
      };

      (
        mockDb.placePersonLink.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockLink);
      (
        mockDb.placePersonLink.update as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUpdatedLink);
      (
        mockDb.placePersonLink.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockUpdatedLink);

      const result = await updatePlacePersonLinkData(
        "link-1",
        { fromYear: 2005, toYear: 2015 },
        mockDb
      );

      expect(result.fromYear).toBe(2005);
      expect(result.toYear).toBe(2015);
    });

    it("should throw error when link not found", async () => {
      (
        mockDb.placePersonLink.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await updatePlacePersonLinkData(
          "link-nonexistent",
          { fromYear: 2005 },
          mockDb
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Place-person link not found");
      }
    });
  });

  describe("unlinkPersonFromPlaceData", () => {
    it("should unlink a person from a place", async () => {
      const mockLink = { id: "link-1" };

      (
        mockDb.placePersonLink.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockLink);
      (
        mockDb.placePersonLink.delete as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockLink);

      const result = await unlinkPersonFromPlaceData("link-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.placePersonLink.delete).toHaveBeenCalledWith({
        where: { id: "link-1" },
      });
    });

    it("should throw error when link not found", async () => {
      (
        mockDb.placePersonLink.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await unlinkPersonFromPlaceData("link-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Place-person link not found");
      }
    });
  });

  describe("getPlaceHierarchyData", () => {
    it("should get full hierarchy from root to place", async () => {
      const mockPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        parentId: "place-2",
        parent: {
          id: "place-2",
          name: "England",
          placeType: "COUNTRY",
          parentId: "place-3",
          parent: {
            id: "place-3",
            name: "United Kingdom",
            placeType: "COUNTRY",
            parentId: null,
          },
        },
      };

      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace);
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace.parent);
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPlace.parent.parent);

      const result = await getPlaceHierarchyData("place-1", mockDb);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("United Kingdom");
      expect(result[1].name).toBe("England");
      expect(result[2].name).toBe("London");
    });

    it("should throw error when place not found", async () => {
      (
        mockDb.place.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getPlaceHierarchyData("place-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Place not found");
      }
    });
  });
});
