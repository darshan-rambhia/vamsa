/**
 * Unit tests for maps server business logic
 *
 * Tests cover:
 * - Calculating time ranges from events and person-place links
 * - Getting places for map display with optional filtering
 * - Getting person-specific locations with clustering
 * - Getting family locations across all persons
 * - Getting timeline markers filtered by date range
 * - Getting clustered places by geographic bounds
 * - Distance calculations and cluster creation
 * - Error handling and validation
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { MapsDb } from "@vamsa/lib/server/business";

import {
  calculateTimeRange,
  getPlacesForMapData,
  getPersonLocationsData,
  getFamilyLocationsData,
  getPlacesByTimeRangeData,
  getPlaceClustersData,
} from "@vamsa/lib/server/business";

function createMockDb(): MapsDb {
  return {
    event: {
      findMany: mock(() => Promise.resolve([])),
    },
    placePersonLink: {
      findMany: mock(() => Promise.resolve([])),
    },
    place: {
      findMany: mock(() => Promise.resolve([])),
    },
    person: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mock(() => Promise.resolve(null)),
    },
  } as unknown as MapsDb;
}

describe("Maps Server Functions", () => {
  let mockDb: MapsDb;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe("calculateTimeRange", () => {
    it("should calculate time range from events", async () => {
      const placeId = "place-1";
      const mockEvents = [
        { date: new Date("2010-06-15") },
        { date: new Date("2020-01-10") },
      ];

      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockEvents
      );
      (
        mockDb.placePersonLink.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await calculateTimeRange(placeId, mockDb);

      expect(result.earliest).toBe(2010);
      expect(result.latest).toBe(2020);
    });

    it("should calculate time range from person-place links", async () => {
      const placeId = "place-1";
      const mockLinks = [
        { fromYear: 2005, toYear: 2015 },
        { fromYear: 2012, toYear: 2018 },
      ];

      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (
        mockDb.placePersonLink.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockLinks);

      const result = await calculateTimeRange(placeId, mockDb);

      expect(result.earliest).toBe(2005);
      expect(result.latest).toBe(2018);
    });

    it("should handle null dates", async () => {
      const placeId = "place-1";
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (
        mockDb.placePersonLink.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await calculateTimeRange(placeId, mockDb);

      expect(result.earliest).toBeNull();
      expect(result.latest).toBeNull();
    });

    it("should combine events and links", async () => {
      const mockEvents = [{ date: new Date("2010-06-15") }];
      const mockLinks = [{ fromYear: 2005, toYear: null }];

      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockEvents
      );
      (
        mockDb.placePersonLink.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockLinks);

      const result = await calculateTimeRange("place-1", mockDb);

      expect(result.earliest).toBe(2005);
      expect(result.latest).toBe(2010);
    });
  });

  describe("getPlacesForMapData", () => {
    it("should get all places without filtering", async () => {
      const mockPlaces = [
        {
          id: "place-1",
          name: "New York",
          latitude: 40.7128,
          longitude: -74.006,
          placeType: "CITY",
          description: "The Big Apple",
          events: [{ type: "BIRTH" }],
          personLinks: [],
        },
      ];

      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPlaces
      );
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (
        mockDb.placePersonLink.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await getPlacesForMapData({ includeEmpty: false }, mockDb);

      expect(result.markers).toHaveLength(1);
      expect(result.markers[0].name).toBe("New York");
      expect(result.total).toBe(1);
    });

    it("should include event types", async () => {
      const mockPlaces = [
        {
          id: "place-1",
          name: "Boston",
          latitude: 42.3601,
          longitude: -71.0589,
          placeType: "CITY",
          description: null,
          events: [{ type: "BIRTH" }, { type: "MARRIAGE" }, { type: "BIRTH" }],
          personLinks: [],
        },
      ];

      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPlaces
      );
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );
      (
        mockDb.placePersonLink.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await getPlacesForMapData({ includeEmpty: true }, mockDb);

      expect(result.markers[0].eventTypes).toEqual(["BIRTH", "MARRIAGE"]);
      expect(result.markers[0].eventCount).toBe(3);
    });

    it("should skip places without coordinates", async () => {
      const mockPlaces = [
        {
          id: "place-1",
          name: "Unknown",
          latitude: null,
          longitude: null,
          placeType: "UNKNOWN",
          description: null,
          events: [],
          personLinks: [],
        },
      ];

      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPlaces
      );

      const result = await getPlacesForMapData({ includeEmpty: false }, mockDb);

      expect(result.markers).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("getPersonLocationsData", () => {
    it("should throw error when person not found", async () => {
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getPersonLocationsData("person-nonexistent", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Person not found");
      }
    });

    it("should get person locations", async () => {
      const mockPerson = {
        id: "person-1",
        firstName: "John",
        lastName: "Doe",
      };

      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDb.placePersonLink.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      const result = await getPersonLocationsData("person-1", mockDb);

      expect(result.person.firstName).toBe("John");
      expect(result.person.lastName).toBe("Doe");
      expect(result.markers).toHaveLength(0);
    });
  });

  describe("getFamilyLocationsData", () => {
    it("should get family locations", async () => {
      const mockPersons = [{ id: "person-1" }, { id: "person-2" }];

      (mockDb.person.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        mockPersons
      );
      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      const result = await getFamilyLocationsData(mockDb);

      expect(result.familySize).toBe(2);
      expect(result.markers).toHaveLength(0);
    });
  });

  describe("getPlacesByTimeRangeData", () => {
    it("should filter places by time range", async () => {
      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      const result = await getPlacesByTimeRangeData(
        { startYear: 2010, endYear: 2020 },
        mockDb
      );

      expect(result.markers).toHaveLength(0);
      expect(result.timeRange.startYear).toBe(2010);
      expect(result.timeRange.endYear).toBe(2020);
    });
  });

  describe("getPlaceClustersData", () => {
    it("should cluster places by geographic bounds", async () => {
      (mockDb.place.findMany as ReturnType<typeof mock>).mockResolvedValueOnce(
        []
      );

      const result = await getPlaceClustersData(
        {
          bounds: {
            minLat: 40,
            maxLat: 41,
            minLng: -75,
            maxLng: -74,
          },
          clusterSize: 5,
        },
        mockDb
      );

      expect(result.clusters).toHaveLength(0);
      expect(result.totalPlaces).toBe(0);
    });
  });
});
