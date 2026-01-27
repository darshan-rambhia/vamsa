/**
 * Unit tests for Maps Business Logic
 *
 * Tests cover geographic calculations and data structure operations:
 * - Distance calculations using Haversine formula
 * - Cluster creation with bounds and center calculation
 * - Time range calculations
 * - Marker type definitions and transformations
 */

import { describe, it, expect } from "bun:test";

// Pure functions for geographic calculations
function calculateDistance(
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLng = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface MapMarker {
  latitude: number;
  longitude: number;
}

interface ClusterBound {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface PlaceCluster {
  bounds: ClusterBound;
  count: number;
  centerLat: number;
  centerLng: number;
}

function createCluster(markers: MapMarker[]): PlaceCluster {
  const lats = markers.map((p) => p.latitude);
  const lngs = markers.map((p) => p.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return {
    bounds: { minLat, maxLat, minLng, maxLng },
    centerLat,
    centerLng,
    count: markers.length,
  };
}

function isPointInBounds(point: MapMarker, bounds: ClusterBound): boolean {
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

function calculateTimeRange(years: (number | null)[]): {
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
      const markers: MapMarker[] = [
        { latitude: 40, longitude: -74 },
        { latitude: 50, longitude: -60 },
      ];

      const cluster = createCluster(markers);

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
      const markers: MapMarker[] = [{ latitude: 40, longitude: -74 }];

      const cluster = createCluster(markers);

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
      const markers: MapMarker[] = [
        { latitude: -10, longitude: -50 },
        { latitude: -30, longitude: -60 },
      ];

      const cluster = createCluster(markers);

      expect(cluster.bounds.minLat).toBe(-30);
      expect(cluster.bounds.maxLat).toBe(-10);
      expect(cluster.bounds.minLng).toBe(-60);
      expect(cluster.bounds.maxLng).toBe(-50);
      expect(cluster.centerLat).toBe(-20);
      expect(cluster.centerLng).toBe(-55);
    });

    it("should handle multiple markers in same cluster", () => {
      const markers: MapMarker[] = [
        { latitude: 40, longitude: -74 },
        { latitude: 40.1, longitude: -73.9 },
        { latitude: 39.9, longitude: -74.1 },
      ];

      const cluster = createCluster(markers);

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
      const years: (number | null)[] = [];
      const range = calculateTimeRange(years);

      expect(range.earliest).toBeNull();
      expect(range.latest).toBeNull();
    });

    it("should return null for all null years", () => {
      const years: (number | null)[] = [null, null, null];
      const range = calculateTimeRange(years);

      expect(range.earliest).toBeNull();
      expect(range.latest).toBeNull();
    });

    it("should filter null values and calculate range", () => {
      const years: (number | null)[] = [null, 1950, null, 2000, null];
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
      const places: MapMarker[] = [
        { latitude: 40.1, longitude: -74.0 },
        { latitude: 40.2, longitude: -74.1 },
        { latitude: 40.3, longitude: -74.2 },
      ];

      const cluster = createCluster(places);

      // All points are within ~20 km of each other
      expect(cluster.count).toBe(3);
      expect(cluster.bounds.minLat).toBe(40.1);
      expect(cluster.bounds.maxLat).toBe(40.3);
    });

    it("should handle cluster with single outlier", () => {
      const places: MapMarker[] = [
        { latitude: 40, longitude: -74 },
        { latitude: 40.1, longitude: -74.1 },
        { latitude: 85, longitude: 170 }, // Outlier
      ];

      const cluster = createCluster(places);

      // Bounds include all points
      expect(cluster.bounds.minLat).toBe(40);
      expect(cluster.bounds.maxLat).toBe(85);
      expect(cluster.count).toBe(3);
    });
  });

  describe("bounds calculations", () => {
    it("should calculate correct bounds for US locations", () => {
      const places: MapMarker[] = [
        { latitude: 47.6, longitude: -122.3 }, // Seattle
        { latitude: 40.7, longitude: -74.0 }, // New York
        { latitude: 34.1, longitude: -118.2 }, // Los Angeles
      ];

      const bounds = createCluster(places).bounds;

      expect(bounds.minLat).toBe(34.1);
      expect(bounds.maxLat).toBe(47.6);
      expect(bounds.minLng).toBe(-122.3);
      expect(bounds.maxLng).toBe(-74.0);
    });

    it("should handle antimeridian edge case", () => {
      const places: MapMarker[] = [
        { latitude: 10, longitude: 179 },
        { latitude: 10, longitude: -179 },
      ];

      const bounds = createCluster(places).bounds;

      // Should include all points
      expect(bounds.minLng).toBe(-179);
      expect(bounds.maxLng).toBe(179);
    });
  });
});
