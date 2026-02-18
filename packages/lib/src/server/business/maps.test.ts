/**
 * Unit tests for Maps Business Logic
 *
 * Tests cover geographic calculations and data structure operations:
 * - Distance calculations using Haversine formula
 * - Cluster creation with bounds and center calculation
 * - Time range calculations
 * - Marker type definitions and transformations
 * - All map data retrieval functions
 */

import { describe, expect, it, vi } from "vitest";
import {
  calculateDistance,
  createCluster,
  getFamilyLocationsData,
  getPersonLocationsData,
  getPlaceClustersData,
  getPlacesByTimeRangeData,
  getPlacesForMapData,
} from "./maps";
import type { MapMarker as SourceMapMarker } from "./maps";

// Mock logger
vi.mock("@vamsa/lib/logger", () => ({
  loggers: {
    db: {
      withErr: vi.fn(() => ({
        ctx: vi.fn(() => ({
          msg: vi.fn(),
        })),
      })),
    },
  },
}));

// Helper interfaces for local pure-function tests
interface ClusterBound {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Create mock database for maps tests
function createMockDb(
  options: {
    places?: Array<any>;
    events?: Array<any>;
    personLinks?: Array<any>;
    persons?: Array<any>;
  } = {}
) {
  return {
    query: {
      places: {
        findFirst: vi.fn(async () => options.places?.[0] || null),
        findMany: vi.fn(async () => options.places || []),
      },
      events: {
        findFirst: vi.fn(async () => options.events?.[0] || null),
        findMany: vi.fn(async () => options.events || []),
      },
      placePersonLinks: {
        findFirst: vi.fn(async () => options.personLinks?.[0] || null),
        findMany: vi.fn(async () => options.personLinks || []),
      },
      persons: {
        findFirst: vi.fn(async (_opts: any) => {
          if (!options.persons) return null;
          // Simple mock - return first person if where clause exists
          return options.persons[0] || null;
        }),
        findMany: vi.fn(async () => options.persons || []),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ count: 0 }]),
      })),
    })),
  } as any;
}

function isPointInBounds(
  point: { latitude: number; longitude: number },
  bounds: ClusterBound
): boolean {
  return (
    point.latitude >= bounds.minLat &&
    point.latitude <= bounds.maxLat &&
    point.longitude >= bounds.minLng &&
    point.longitude <= bounds.maxLng
  );
}

function getYearFromDate(date: Date | null): number | null {
  if (!date) return null;
  return date.getFullYear();
}

function calculateTimeRange(years: Array<number | null>): {
  earliest: number | null;
  latest: number | null;
} {
  const validYears = years.filter((y): y is number => y !== null);
  if (validYears.length === 0) {
    return { earliest: null, latest: null };
  }
  return {
    earliest: Math.min(...validYears),
    latest: Math.max(...validYears),
  };
}

describe("maps business logic - geographic calculations", () => {
  describe("calculateDistance", () => {
    it("should calculate distance between two points using Haversine formula", () => {
      const point1 = { latitude: 0, longitude: 0 };
      const point2 = { latitude: 0, longitude: 1 };

      const distance = calculateDistance(point1, point2);

      // At equator, 1 degree longitude ~= 111,320 meters
      expect(distance).toBeGreaterThan(100000);
      expect(distance).toBeLessThan(120000);
    });

    it("should return zero distance for same point", () => {
      const point = { latitude: 40.7128, longitude: -74.006 };
      const distance = calculateDistance(point, point);
      expect(distance).toBe(0);
    });

    it("should calculate distance between New York and London", () => {
      const nyc = { latitude: 40.7128, longitude: -74.006 };
      const london = { latitude: 51.5074, longitude: -0.1278 };

      const distance = calculateDistance(nyc, london);

      // Approximate distance is ~5,570 km
      expect(distance).toBeGreaterThan(5000000);
      expect(distance).toBeLessThan(6000000);
    });

    it("should be symmetric (distance from A to B equals B to A)", () => {
      const point1 = { latitude: 45.5, longitude: -122.7 };
      const point2 = { latitude: 47.6, longitude: -122.3 };

      const dist1to2 = calculateDistance(point1, point2);
      const dist2to1 = calculateDistance(point2, point1);

      expect(dist1to2).toBe(dist2to1);
    });

    it("should handle southern hemisphere", () => {
      const sydney = { latitude: -33.8688, longitude: 151.2093 };
      const melbourne = { latitude: -37.8136, longitude: 144.9631 };

      const distance = calculateDistance(sydney, melbourne);

      // Distance should be ~800 km
      expect(distance).toBeGreaterThan(700000);
      expect(distance).toBeLessThan(900000);
    });

    it("should handle antimeridian crossing", () => {
      const tokyo = { latitude: 35.6762, longitude: 139.6503 };
      const hawaii = { latitude: 21.3099, longitude: -157.8581 };

      const distance = calculateDistance(tokyo, hawaii);

      // Distance should be significant (>5000km)
      expect(distance).toBeGreaterThan(5000000);
    });
  });

  describe("createCluster", () => {
    it("should create cluster with correct bounds and center", () => {
      const markers: Array<Partial<SourceMapMarker>> = [
        { latitude: 40, longitude: -74 },
        { latitude: 50, longitude: -60 },
      ];

      const cluster = createCluster(markers as Array<SourceMapMarker>);

      expect(cluster.bounds).toEqual({
        minLat: 40,
        maxLat: 50,
        minLng: -74,
        maxLng: -60,
      });
      expect(cluster.centerLat).toBe(45);
      expect(cluster.centerLng).toBe(-67);
      expect(cluster.count).toBe(2);
    });

    it("should handle single marker", () => {
      const markers: Array<Partial<SourceMapMarker>> = [
        { latitude: 40, longitude: -74 },
      ];

      const cluster = createCluster(markers as Array<SourceMapMarker>);

      expect(cluster.bounds).toEqual({
        minLat: 40,
        maxLat: 40,
        minLng: -74,
        maxLng: -74,
      });
      expect(cluster.centerLat).toBe(40);
      expect(cluster.centerLng).toBe(-74);
      expect(cluster.count).toBe(1);
    });

    it("should handle markers with negative coordinates", () => {
      const markers: Array<Partial<SourceMapMarker>> = [
        { latitude: -10, longitude: -50 },
        { latitude: -30, longitude: -60 },
      ];

      const cluster = createCluster(markers as Array<SourceMapMarker>);

      expect(cluster.bounds.minLat).toBe(-30);
      expect(cluster.bounds.maxLat).toBe(-10);
      expect(cluster.bounds.minLng).toBe(-60);
      expect(cluster.bounds.maxLng).toBe(-50);
      expect(cluster.centerLat).toBe(-20);
      expect(cluster.centerLng).toBe(-55);
    });

    it("should handle multiple markers in same cluster", () => {
      const markers: Array<Partial<SourceMapMarker>> = [
        { latitude: 40, longitude: -74 },
        { latitude: 40.1, longitude: -73.9 },
        { latitude: 39.9, longitude: -74.1 },
      ];

      const cluster = createCluster(markers as Array<SourceMapMarker>);

      expect(cluster.count).toBe(3);
      expect(cluster.centerLat).toBeCloseTo(40, 1);
      expect(cluster.centerLng).toBeCloseTo(-74, 1);
    });
  });

  describe("isPointInBounds", () => {
    it("should include point inside bounds", () => {
      const point = { latitude: 45, longitude: -70 };
      const bounds: ClusterBound = {
        minLat: 40,
        maxLat: 50,
        minLng: -75,
        maxLng: -65,
      };

      expect(isPointInBounds(point, bounds)).toBe(true);
    });

    it("should exclude point outside bounds", () => {
      const point = { latitude: 55, longitude: -70 };
      const bounds: ClusterBound = {
        minLat: 40,
        maxLat: 50,
        minLng: -75,
        maxLng: -65,
      };

      expect(isPointInBounds(point, bounds)).toBe(false);
    });

    it("should include point on boundary", () => {
      const point = { latitude: 40, longitude: -75 };
      const bounds: ClusterBound = {
        minLat: 40,
        maxLat: 50,
        minLng: -75,
        maxLng: -65,
      };

      expect(isPointInBounds(point, bounds)).toBe(true);
    });

    it("should handle world bounds", () => {
      const point = { latitude: 0, longitude: 0 };
      const bounds: ClusterBound = {
        minLat: -90,
        maxLat: 90,
        minLng: -180,
        maxLng: 180,
      };

      expect(isPointInBounds(point, bounds)).toBe(true);
    });
  });

  describe("time range calculations", () => {
    it("should calculate time range from years", () => {
      const years = [1980, 1990, 2000, 2010];
      const range = calculateTimeRange(years);

      expect(range.earliest).toBe(1980);
      expect(range.latest).toBe(2010);
    });

    it("should handle single year", () => {
      const years = [1990];
      const range = calculateTimeRange(years);

      expect(range.earliest).toBe(1990);
      expect(range.latest).toBe(1990);
    });

    it("should return null for empty years", () => {
      const years: Array<number | null> = [];
      const range = calculateTimeRange(years);

      expect(range.earliest).toBeNull();
      expect(range.latest).toBeNull();
    });

    it("should return null for all null years", () => {
      const years: Array<number | null> = [null, null, null];
      const range = calculateTimeRange(years);

      expect(range.earliest).toBeNull();
      expect(range.latest).toBeNull();
    });

    it("should filter null values and calculate range", () => {
      const years: Array<number | null> = [null, 1950, null, 2000, null];
      const range = calculateTimeRange(years);

      expect(range.earliest).toBe(1950);
      expect(range.latest).toBe(2000);
    });

    it("should extract year from Date", () => {
      const date = new Date(1990, 5, 15);
      const year = getYearFromDate(date);

      expect(year).toBe(1990);
    });

    it("should handle null date", () => {
      const year = getYearFromDate(null);
      expect(year).toBeNull();
    });
  });

  describe("place clustering logic", () => {
    it("should cluster nearby places", () => {
      const places = [
        { latitude: 40.1, longitude: -74.0 },
        { latitude: 40.2, longitude: -74.1 },
        { latitude: 40.3, longitude: -74.2 },
      ];

      const cluster = createCluster(places as Array<SourceMapMarker>);

      // All points are within ~20 km of each other
      expect(cluster.count).toBe(3);
      expect(cluster.bounds.minLat).toBe(40.1);
      expect(cluster.bounds.maxLat).toBe(40.3);
    });

    it("should handle cluster with single outlier", () => {
      const places = [
        { latitude: 40, longitude: -74 },
        { latitude: 40.1, longitude: -74.1 },
        { latitude: 85, longitude: 170 }, // Outlier
      ];

      const cluster = createCluster(places as Array<SourceMapMarker>);

      // Bounds include all points
      expect(cluster.bounds.minLat).toBe(40);
      expect(cluster.bounds.maxLat).toBe(85);
      expect(cluster.count).toBe(3);
    });
  });

  describe("bounds calculations", () => {
    it("should calculate correct bounds for US locations", () => {
      const places = [
        { latitude: 47.6, longitude: -122.3 }, // Seattle
        { latitude: 40.7, longitude: -74.0 }, // New York
        { latitude: 34.1, longitude: -118.2 }, // Los Angeles
      ];

      const bounds = createCluster(places as Array<SourceMapMarker>).bounds;

      expect(bounds.minLat).toBe(34.1);
      expect(bounds.maxLat).toBe(47.6);
      expect(bounds.minLng).toBe(-122.3);
      expect(bounds.maxLng).toBe(-74.0);
    });

    it("should handle antimeridian edge case", () => {
      const places = [
        { latitude: 10, longitude: 179 },
        { latitude: 10, longitude: -179 },
      ];

      const bounds = createCluster(places as Array<SourceMapMarker>).bounds;

      // Should include all points
      expect(bounds.minLng).toBe(-179);
      expect(bounds.maxLng).toBe(179);
    });
  });

  describe("getPlacesForMapData", () => {
    it("should return places with coordinates", async () => {
      const places = [
        {
          id: "place1",
          name: "New York",
          latitude: 40.7128,
          longitude: -74.006,
          placeType: "CITY",
          description: "NYC",
        },
      ];

      const mockDb = createMockDb({ places, events: [], personLinks: [] });

      const result = await getPlacesForMapData({ includeEmpty: true }, mockDb);

      expect(result.markers).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("should skip places without coordinates", async () => {
      const places = [
        {
          id: "place1",
          name: "Unknown Location",
          latitude: null,
          longitude: null,
          placeType: "CITY",
          description: null,
        },
      ];

      const mockDb = createMockDb({ places });

      const result = await getPlacesForMapData({ includeEmpty: true }, mockDb);

      expect(result.markers).toHaveLength(0);
    });

    it("should exclude empty places when includeEmpty is false", async () => {
      const places = [
        {
          id: "place1",
          name: "Empty Place",
          latitude: 40.7,
          longitude: -74.0,
          placeType: "CITY",
          description: null,
        },
      ];

      const mockDb = createMockDb({ places, events: [], personLinks: [] });

      const result = await getPlacesForMapData({ includeEmpty: false }, mockDb);

      expect(result.markers).toHaveLength(0);
    });
  });

  describe("getPersonLocationsData", () => {
    it("should throw error when person not found", async () => {
      const mockDb = createMockDb({ persons: [] });

      await expect(
        getPersonLocationsData("missing-id", mockDb)
      ).rejects.toThrow("Person not found");
    });

    it("should return locations for valid person", async () => {
      const person = {
        id: "person1",
        firstName: "John",
        lastName: "Doe",
      };

      const mockDb = createMockDb({ persons: [person], personLinks: [] });

      const result = await getPersonLocationsData("person1", mockDb);

      expect(result).toBeDefined();
      expect(result.person.id).toBe("person1");
      expect(result.markers).toBeDefined();
    });

    it("should include person details in response", async () => {
      const person = {
        id: "person1",
        firstName: "Jane",
        lastName: "Smith",
      };

      const mockDb = createMockDb({ persons: [person] });

      const result = await getPersonLocationsData("person1", mockDb);

      expect(result.person.firstName).toBe("Jane");
      expect(result.person.lastName).toBe("Smith");
    });
  });

  describe("getFamilyLocationsData", () => {
    it("should return family locations", async () => {
      const persons = [{ id: "person1" }, { id: "person2" }];

      const places = [
        {
          id: "place1",
          name: "Boston",
          latitude: 42.3601,
          longitude: -71.0589,
          placeType: "CITY",
          description: "Boston, MA",
        },
      ];

      const mockDb = createMockDb({ persons, places });

      const result = await getFamilyLocationsData(mockDb);

      expect(result).toBeDefined();
      expect(result.markers).toBeDefined();
      expect(result.familySize).toBe(2);
    });

    it("should handle empty family", async () => {
      const mockDb = createMockDb({ persons: [], places: [] });

      const result = await getFamilyLocationsData(mockDb);

      expect(result.markers).toBeDefined();
      expect(result.familySize).toBe(0);
    });

    it("should filter out places without coordinates", async () => {
      const persons = [{ id: "person1" }];
      const places = [
        {
          id: "place1",
          name: "Unknown",
          latitude: null,
          longitude: null,
          placeType: "CITY",
          description: null,
        },
      ];

      const mockDb = createMockDb({ persons, places });

      const result = await getFamilyLocationsData(mockDb);

      expect(result.markers).toHaveLength(0);
    });
  });

  describe("getPlacesByTimeRangeData", () => {
    it("should return places within time range", async () => {
      const places = [
        {
          id: "place1",
          name: "Historical Site",
          latitude: 51.5074,
          longitude: -0.1278,
          placeType: "LANDMARK",
          description: "London",
        },
      ];

      const mockDb = createMockDb({ places, events: [], personLinks: [] });

      const result = await getPlacesByTimeRangeData(
        { startYear: 1900, endYear: 2000 },
        mockDb
      );

      expect(result).toBeDefined();
      expect(result.timeRange.startYear).toBe(1900);
      expect(result.timeRange.endYear).toBe(2000);
    });

    it("should filter events by date range", async () => {
      const places = [
        {
          id: "place1",
          name: "Place",
          latitude: 40.0,
          longitude: -74.0,
          placeType: "CITY",
          description: null,
        },
      ];

      const events = [
        {
          id: "event1",
          placeId: "place1",
          personId: "person1",
          type: "BIRTH",
          date: new Date("1950-01-01"),
        },
      ];

      const mockDb = createMockDb({ places, events });

      const result = await getPlacesByTimeRangeData(
        { startYear: 1940, endYear: 1960 },
        mockDb
      );

      expect(result.markers).toBeDefined();
    });

    it("should handle empty time range", async () => {
      const mockDb = createMockDb({ places: [], events: [] });

      const result = await getPlacesByTimeRangeData(
        { startYear: 2000, endYear: 2010 },
        mockDb
      );

      expect(result.markers).toHaveLength(0);
    });
  });

  describe("getPlaceClustersData", () => {
    it("should cluster places within bounds", async () => {
      const places = [
        {
          id: "place1",
          name: "Place 1",
          latitude: 40.5,
          longitude: -74.0,
          placeType: "CITY",
          description: null,
        },
        {
          id: "place2",
          name: "Place 2",
          latitude: 40.6,
          longitude: -74.1,
          placeType: "CITY",
          description: null,
        },
      ];

      const mockDb = createMockDb({ places, events: [] });

      const result = await getPlaceClustersData(
        {
          bounds: {
            minLat: 40.0,
            maxLat: 41.0,
            minLng: -75.0,
            maxLng: -73.0,
          },
          clusterSize: 10,
        },
        mockDb
      );

      expect(result).toBeDefined();
      expect(result.clusters).toBeDefined();
    });

    it("should return empty clusters for no places", async () => {
      const mockDb = createMockDb({ places: [] });

      const result = await getPlaceClustersData(
        {
          bounds: {
            minLat: 0,
            maxLat: 10,
            minLng: 0,
            maxLng: 10,
          },
          clusterSize: 5,
        },
        mockDb
      );

      expect(result.clusters).toHaveLength(0);
      expect(result.totalPlaces).toBe(0);
    });

    it("should respect cluster size parameter", async () => {
      const places = Array.from({ length: 20 }, (_, i) => ({
        id: `place${i}`,
        name: `Place ${i}`,
        latitude: 40 + i * 0.1,
        longitude: -74 - i * 0.1,
        placeType: "CITY",
        description: null,
      }));

      const mockDb = createMockDb({ places });

      const result = await getPlaceClustersData(
        {
          bounds: {
            minLat: 39,
            maxLat: 42,
            minLng: -76,
            maxLng: -72,
          },
          clusterSize: 5,
        },
        mockDb
      );

      expect(result.clusters).toBeDefined();
    });
  });
});
