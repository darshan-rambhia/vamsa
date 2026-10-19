import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getFamilyLocationsData,
  getPersonLocationsData,
  getPlaceClustersData,
  getPlacesByTimeRangeData,
  getPlacesForMapData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type {
  FamilyLocationMarker,
  GetPlaceClusterOptions,
  GetPlacesByTimeRangeOptions,
  GetPlacesForMapOptions,
  MapMarker,
  PersonLocationMarker,
  PlaceCluster,
  TimelineMarker,
} from "@vamsa/lib/server/business";

/**
 * Validation schemas for map operations
 */
const getPlacesForMapSchema = z.object({
  includeEmpty: z.boolean().optional().default(false),
});

const getPersonLocationsSchema = z.object({
  personId: z.string(),
});

const getFamilyLocationsSchema = z.object({
  onlyHeadOfFamily: z.boolean().optional().default(false),
});

const getPlacesByTimeRangeSchema = z.object({
  startYear: z.number().int().min(1000).max(2100),
  endYear: z.number().int().min(1000).max(2100),
});

const getPlaceClusterSchema = z.object({
  bounds: z.object({
    minLat: z.number(),
    maxLat: z.number(),
    minLng: z.number(),
    maxLng: z.number(),
  }),
  clusterSize: z.number().int().positive().optional().default(5),
});

/**
 * Server function: Get all places with geographic data for map display
 * Supports optional filtering of empty places
 * @requires No special auth (public data)
 */
export const getPlacesForMap = createServerFn({ method: "GET" })
  .validator((data) => getPlacesForMapSchema.parse(data))
  .handler(
    async ({ data }): Promise<{ markers: Array<MapMarker>; total: number }> => {
      await requireAuth("VIEWER");
      const options: GetPlacesForMapOptions = {
        includeEmpty: data.includeEmpty,
      };
      return getPlacesForMapData(options);
    }
  );

/**
 * Server function: Get all places associated with a specific person
 * @requires No special auth (public data)
 * @throws Error if person not found
 */
export const getPersonLocations = createServerFn({ method: "GET" })
  .validator((data) => getPersonLocationsSchema.parse(data))
  .handler(
    async ({
      data,
    }): Promise<{
      markers: Array<PersonLocationMarker>;
      total: number;
      person: {
        id: string;
        firstName: string;
        lastName: string;
      };
    }> => {
      await requireAuth("VIEWER");
      return getPersonLocationsData(data.personId);
    }
  );

/**
 * Server function: Get all places in the family tree
 * @requires No special auth (public data)
 */
export const getFamilyLocations = createServerFn({ method: "GET" })
  .validator((data) => getFamilyLocationsSchema.parse(data))
  .handler(
    async (): Promise<{
      markers: Array<FamilyLocationMarker>;
      total: number;
      familySize: number;
    }> => {
      await requireAuth("VIEWER");
      return getFamilyLocationsData();
    }
  );

/**
 * Server function: Get places filtered by date range for timeline visualization
 * @requires No special auth (public data)
 */
export const getPlacesByTimeRange = createServerFn({ method: "GET" })
  .validator((data) => getPlacesByTimeRangeSchema.parse(data))
  .handler(
    async ({
      data,
    }): Promise<{
      markers: Array<TimelineMarker>;
      total: number;
      timeRange: {
        startYear: number;
        endYear: number;
      };
    }> => {
      await requireAuth("VIEWER");
      const options: GetPlacesByTimeRangeOptions = {
        startYear: data.startYear,
        endYear: data.endYear,
      };
      return getPlacesByTimeRangeData(options);
    }
  );

/**
 * Server function: Get clustered places by geographic bounds
 * Useful for efficient rendering of large numbers of markers
 * @requires No special auth (public data)
 */
export const getPlaceClusters = createServerFn({ method: "GET" })
  .validator((data) => getPlaceClusterSchema.parse(data))
  .handler(
    async ({
      data,
    }): Promise<{
      clusters: Array<PlaceCluster>;
      totalClusters: number;
      totalPlaces: number;
    }> => {
      await requireAuth("VIEWER");
      const options: GetPlaceClusterOptions = {
        bounds: data.bounds,
        clusterSize: data.clusterSize,
      };
      return getPlaceClustersData(options);
    }
  );
