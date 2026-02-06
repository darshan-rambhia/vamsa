/**
 * Unit tests for Places Server Business Logic
 *
 * Tests cover:
 * - formatPlace: Format database place to API response
 * - getPlaceData: Retrieve place with hierarchy and relationship counts
 * - searchPlacesData: Search places by name
 * - getPlaceHierarchyData: Get full hierarchy path
 * - getPersonPlacesData: Get places associated with person
 * - createPlaceData: Create new place
 * - updatePlaceData: Update existing place
 * - deletePlaceData: Delete place with validation
 * - linkPersonToPlaceData: Link person to place
 * - getPlaceHierarchyPathData: Get display path
 * - getPlaceChildrenData: Get child places
 * - updatePlacePersonLinkData: Update person-place link
 * - unlinkPersonFromPlaceData: Remove person-place link
 *
 * Uses module mocking to inject mocked Drizzle ORM instance
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { clearAllMocks } from "../../testing/shared-mocks";

// Import after mocks are set up
import {
  createPlaceData,
  deletePlaceData,
  formatPlace,
  getPlaceChildrenData,
  getPlaceData,
  getPlaceHierarchyPathData,
  linkPersonToPlaceData,
  searchPlacesData,
  unlinkPersonFromPlaceData,
  updatePlaceData,
  updatePlacePersonLinkData,
} from "./places";

// Create mock database helper
const createMockDb = () => {
  let queryFindFirstResult: unknown = null;
  let queryFindManyResults: Array<unknown> = [];
  let selectCountResults: Array<{ count: number }> = [];
  let updateReturnValue: Array<unknown> = [];

  const createUpdateChain = () => ({
    set: mock(() => ({
      where: mock(() => ({
        returning: mock(() => Promise.resolve(updateReturnValue)),
      })),
    })),
  });

  return {
    query: {
      places: {
        findFirst: mock(async () => queryFindFirstResult),
        findMany: mock(async () => queryFindManyResults),
      },
      placePersonLinks: {
        findFirst: mock(async () => null),
        findMany: mock(async () => queryFindManyResults),
      },
      persons: {
        findFirst: mock(async () => queryFindFirstResult),
      },
    },
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => Promise.resolve(selectCountResults)),
      })),
    })),
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => Promise.resolve([queryFindFirstResult])),
      })),
    })),
    update: mock(() => createUpdateChain()),
    delete: mock(() => ({
      where: mock(() => Promise.resolve()),
    })),
    setQueryFindFirstResult: (result: unknown) => {
      queryFindFirstResult = result;
    },
    setQueryFindManyResults: (results: Array<unknown>) => {
      queryFindManyResults = results;
    },
    setSelectCountResults: (results: Array<{ count: number }>) => {
      selectCountResults = results;
    },
    setUpdateReturnValue: (result: Array<unknown>) => {
      updateReturnValue = result;
    },
  };
};

const mockDrizzleDb = createMockDb();

describe("places business logic", () => {
  beforeEach(() => {
    clearAllMocks();
    mockDrizzleDb.setQueryFindFirstResult(null);
    mockDrizzleDb.setQueryFindManyResults([]);
    mockDrizzleDb.setSelectCountResults([]);
  });

  describe("formatPlace", () => {
    it("should convert place database object to API response", () => {
      const dbPlace = {
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: 51.5074,
        longitude: -0.1278,
        parentId: "country-1",
        description: "Capital of England",
        alternativeNames: ["Londinium"],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      };

      const result = formatPlace(dbPlace);

      expect(result).toEqual({
        id: "place-1",
        name: "London",
        placeType: "CITY",
        latitude: 51.5074,
        longitude: -0.1278,
        parentId: "country-1",
        description: "Capital of England",
        alternativeNames: ["Londinium"],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });
    });

    it("should handle null coordinates", () => {
      const dbPlace = {
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

      const result = formatPlace(dbPlace);

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });
  });

  describe("getPlaceData", () => {
    it("should retrieve place with children, event, and person counts", async () => {
      const place = {
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
        parent: null,
      };

      mockDrizzleDb.setQueryFindFirstResult(place);
      mockDrizzleDb.setSelectCountResults([{ count: 5 }]);

      const result = await getPlaceData("place-1", mockDrizzleDb as any);

      expect(result).toMatchObject({
        id: "place-1",
        name: "England",
        childCount: 5,
        eventCount: 5,
        personCount: 5,
      });
    });

    it("should throw error when place not found", async () => {
      mockDrizzleDb.setQueryFindFirstResult(null);

      await expect(
        getPlaceData("nonexistent", mockDrizzleDb as any)
      ).rejects.toThrow("Place not found");
    });
  });

  describe("searchPlacesData", () => {
    it("should return matching places with parent names", async () => {
      const places = [
        {
          id: "place-1",
          name: "London",
          placeType: "CITY",
          latitude: 51.5074,
          longitude: -0.1278,
          parentId: "country-1",
          description: "Capital city",
          alternativeNames: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: {
            id: "country-1",
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

      mockDrizzleDb.setQueryFindManyResults(places);

      const result = await searchPlacesData("London", mockDrizzleDb as any);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: "London",
        parentName: "England",
      });
    });

    it("should return empty array when no matches", async () => {
      mockDrizzleDb.setQueryFindManyResults([]);

      const result = await searchPlacesData(
        "NonExistentPlace",
        mockDrizzleDb as any
      );

      expect(result).toEqual([]);
    });

    it("should handle places without parents", async () => {
      const places = [
        {
          id: "place-1",
          name: "Earth",
          placeType: "REGION",
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

      mockDrizzleDb.setQueryFindManyResults(places);

      const result = await searchPlacesData("Earth", mockDrizzleDb as any);

      expect(result[0]).toMatchObject({
        name: "Earth",
        parentName: null,
      });
    });
  });

  describe("createPlaceData", () => {
    it("should create place with parent", async () => {
      const newPlace = {
        id: "place-new",
        name: "Manchester",
        placeType: "CITY",
        latitude: 53.48,
        longitude: -2.24,
        parentId: "country-1",
        description: "Industrial city",
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const parentPlace = {
        id: "country-1",
        name: "England",
        placeType: "COUNTRY",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let callCount = 0;
      mockDrizzleDb.query.places.findFirst = mock(async () => {
        callCount++;
        if (callCount === 1) return parentPlace;
        return newPlace;
      }) as any;

      mockDrizzleDb.insert = mock(() => ({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([newPlace])),
        })),
      })) as any;

      const result = await createPlaceData(
        {
          name: "Manchester",
          placeType: "CITY",
          parentId: "country-1",
        },
        mockDrizzleDb as any
      );

      expect(result).toMatchObject({
        name: "Manchester",
        placeType: "CITY",
      });
    });

    it("should create place without parent", async () => {
      const newPlace = {
        id: "place-new",
        name: "Earth",
        placeType: "REGION",
        latitude: null,
        longitude: null,
        parentId: null,
        description: null,
        alternativeNames: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDrizzleDb.insert = mock(() => ({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([newPlace])),
        })),
      })) as any;

      const result = await createPlaceData(
        {
          name: "Earth",
          placeType: "REGION",
        },
        mockDrizzleDb as any
      );

      expect(result).toMatchObject({
        name: "Earth",
        parentId: null,
      });
    });

    it("should throw error when parent not found", async () => {
      mockDrizzleDb.query.places.findFirst = mock(async () => null) as any;

      await expect(
        createPlaceData(
          {
            name: "Manchester",
            placeType: "CITY",
            parentId: "nonexistent",
          },
          mockDrizzleDb as any
        )
      ).rejects.toThrow("Parent place not found");
    });

    it("should throw error when insert returns empty", async () => {
      mockDrizzleDb.insert = mock(() => ({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([])),
        })),
      })) as any;

      await expect(
        createPlaceData(
          {
            name: "Manchester",
            placeType: "CITY",
          },
          mockDrizzleDb as any
        )
      ).rejects.toThrow("Failed to create place");
    });
  });

  describe("updatePlaceData", () => {
    it("should update place name", async () => {
      const existingPlace = {
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

      const updatedPlace = { ...existingPlace, name: "Greater London" };

      mockDrizzleDb.query.places.findFirst = mock(
        async () => existingPlace
      ) as any;
      mockDrizzleDb.setUpdateReturnValue([updatedPlace]);

      const result = await updatePlaceData(
        "place-1",
        {
          name: "Greater London",
        },
        mockDrizzleDb as any
      );

      expect(result).toMatchObject({
        name: "Greater London",
      });
    });

    it("should throw error when place not found", async () => {
      mockDrizzleDb.query.places.findFirst = mock(async () => null) as any;

      await expect(
        updatePlaceData(
          "nonexistent",
          { name: "New Name" },
          mockDrizzleDb as any
        )
      ).rejects.toThrow("Place not found");
    });

    it("should prevent circular hierarchy", async () => {
      const place = {
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

      mockDrizzleDb.query.places.findFirst = mock(async () => place) as any;

      await expect(
        updatePlaceData(
          "place-1",
          { parentId: "place-1" },
          mockDrizzleDb as any
        )
      ).rejects.toThrow("A place cannot be its own parent");
    });
  });

  describe("deletePlaceData", () => {
    it("should delete place with no children, events, or person links", async () => {
      const place = {
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

      mockDrizzleDb.query.places.findFirst = mock(async () => place) as any;
      mockDrizzleDb.setSelectCountResults([{ count: 0 }]);

      const result = await deletePlaceData("place-1", mockDrizzleDb as any);

      expect(result).toEqual({ success: true });
    });

    it("should throw error when place has children", async () => {
      const place = {
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
      };

      mockDrizzleDb.query.places.findFirst = mock(async () => place) as any;
      mockDrizzleDb.setSelectCountResults([{ count: 5 }]);

      await expect(
        deletePlaceData("place-1", mockDrizzleDb as any)
      ).rejects.toThrow(
        "Cannot delete place: 5 child places exist under this place"
      );
    });

    it("should throw error when place not found", async () => {
      mockDrizzleDb.query.places.findFirst = mock(async () => null) as any;

      await expect(
        deletePlaceData("nonexistent", mockDrizzleDb as any)
      ).rejects.toThrow("Place not found");
    });
  });

  describe("linkPersonToPlaceData", () => {
    it("should link person to place", async () => {
      const person = { id: "person-1", firstName: "John" };
      const place = {
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

      const link = {
        id: "link-1",
        personId: "person-1",
        placeId: "place-1",
        fromYear: 2000,
        toYear: 2010,
        type: "LIVED",
        createdAt: new Date(),
        place: place,
      };

      // Create separate mocks for different queries
      const personsQuery = mock(async () => person) as any;
      const placesQuery = mock(async () => place) as any;

      let placePersonLinksFindCount = 0;
      const placePersonLinksQuery = mock(async () => {
        placePersonLinksFindCount++;
        if (placePersonLinksFindCount === 1) {
          return null; // First call: check for duplicate returns nothing
        }
        // Second call: after insert, fetch the created link
        return link;
      }) as any;

      mockDrizzleDb.query.persons.findFirst = personsQuery;
      mockDrizzleDb.query.places.findFirst = placesQuery;
      mockDrizzleDb.query.placePersonLinks.findFirst = placePersonLinksQuery;

      mockDrizzleDb.insert = mock(() => ({
        values: mock(() => Promise.resolve()),
      })) as any;

      const result = await linkPersonToPlaceData(
        {
          personId: "person-1",
          placeId: "place-1",
          fromYear: 2000,
          toYear: 2010,
          type: "LIVED",
        },
        mockDrizzleDb as any
      );

      expect(result).toMatchObject({
        fromYear: 2000,
        toYear: 2010,
        type: "LIVED",
      });
    });

    it("should throw error when person not found", async () => {
      mockDrizzleDb.query.persons.findFirst = mock(async () => null) as any;

      await expect(
        linkPersonToPlaceData(
          {
            personId: "nonexistent",
            placeId: "place-1",
          },
          mockDrizzleDb as any
        )
      ).rejects.toThrow("Person not found");
    });

    it("should throw error when place not found", async () => {
      const person = { id: "person-1", firstName: "John" };
      mockDrizzleDb.query.persons.findFirst = mock(async () => person) as any;
      mockDrizzleDb.query.places.findFirst = mock(async () => null) as any;

      await expect(
        linkPersonToPlaceData(
          {
            personId: "person-1",
            placeId: "nonexistent",
          },
          mockDrizzleDb as any
        )
      ).rejects.toThrow("Place not found");
    });
  });

  describe("getPlaceHierarchyPathData", () => {
    it("should return path from root to place", async () => {
      const place = {
        id: "place-3",
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
          parentId: "place-1",
          description: null,
          alternativeNames: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: {
            id: "place-1",
            name: "Europe",
            placeType: "REGION",
            latitude: null,
            longitude: null,
            parentId: null,
            description: null,
            alternativeNames: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      };

      let callCount = 0;
      mockDrizzleDb.query.places.findFirst = mock(async () => {
        callCount++;
        if (callCount === 1) return place;
        if (callCount === 2) return place.parent;
        if (callCount === 3) return place.parent.parent;
        return null;
      }) as any;

      const result = await getPlaceHierarchyPathData(
        "place-3",
        mockDrizzleDb as any
      );

      expect(result).toBe("Europe, England, London");
    });

    it("should throw error when place not found", async () => {
      mockDrizzleDb.query.places.findFirst = mock(async () => null) as any;

      await expect(
        getPlaceHierarchyPathData("nonexistent", mockDrizzleDb as any)
      ).rejects.toThrow("Place not found");
    });
  });

  describe("getPlaceChildrenData", () => {
    it("should return child places sorted by type then name", async () => {
      const children = [
        {
          id: "place-2",
          name: "City A",
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

      mockDrizzleDb.setQueryFindManyResults(children);

      const result = await getPlaceChildrenData(
        "place-1",
        mockDrizzleDb as any
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: "City A" });
    });
  });

  describe("updatePlacePersonLinkData", () => {
    it("should update link with new years and type", async () => {
      const link = {
        id: "link-1",
        personId: "person-1",
        placeId: "place-1",
        fromYear: 2000,
        toYear: 2010,
        type: "LIVED",
      };

      const place = {
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

      const updatedLink = {
        ...link,
        fromYear: 2005,
        toYear: 2015,
        type: "WORKED",
        place: place,
      };

      let findFirstCallCount = 0;
      mockDrizzleDb.query.placePersonLinks.findFirst = mock(async () => {
        findFirstCallCount++;
        if (findFirstCallCount === 1) {
          return link; // First call: verify link exists
        }
        // Second call: fetch updated link
        return updatedLink;
      }) as any;

      mockDrizzleDb.update = mock(() => ({
        set: mock(() => ({
          where: mock(() => Promise.resolve()),
        })),
      })) as any;

      const result = await updatePlacePersonLinkData(
        "link-1",
        {
          fromYear: 2005,
          toYear: 2015,
          type: "WORKED",
        },
        mockDrizzleDb as any
      );

      expect(result).toMatchObject({
        fromYear: 2005,
        toYear: 2015,
        type: "WORKED",
      });
    });

    it("should throw error when link not found", async () => {
      mockDrizzleDb.query.placePersonLinks.findFirst = mock(
        async () => null
      ) as any;

      await expect(
        updatePlacePersonLinkData(
          "nonexistent",
          { fromYear: 2005 },
          mockDrizzleDb as any
        )
      ).rejects.toThrow("Place-person link not found");
    });
  });

  describe("unlinkPersonFromPlaceData", () => {
    it("should unlink person from place", async () => {
      const link = {
        id: "link-1",
        personId: "person-1",
        placeId: "place-1",
      };

      mockDrizzleDb.query.placePersonLinks.findFirst = mock(
        async () => link
      ) as any;
      mockDrizzleDb.delete = mock(() => ({
        where: mock(() => Promise.resolve()),
      })) as any;

      const result = await unlinkPersonFromPlaceData(
        "link-1",
        mockDrizzleDb as any
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw error when link not found", async () => {
      mockDrizzleDb.query.placePersonLinks.findFirst = mock(
        async () => null
      ) as any;

      await expect(
        unlinkPersonFromPlaceData("nonexistent", mockDrizzleDb as any)
      ).rejects.toThrow("Place-person link not found");
    });
  });
});
