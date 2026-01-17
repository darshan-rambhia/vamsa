import { createServerFn } from "@tanstack/react-start";
import {
  placeCreateSchema,
  placeUpdateSchema,
  placePersonLinkCreateSchema,
} from "@vamsa/schemas";
import type { PersonPlaceType } from "@vamsa/api";
import {
  getPlaceData,
  searchPlacesData,
  getPlaceHierarchyData,
  getPersonPlacesData,
  createPlaceData,
  updatePlaceData,
  deletePlaceData,
  linkPersonToPlaceData,
  getPlaceHierarchyPathData,
  getPlaceChildrenData,
  updatePlacePersonLinkData,
  unlinkPersonFromPlaceData,
  type PlaceResponse,
  type PlaceWithChildren,
  type PlaceHierarchyItem,
  type PersonPlace,
} from "@vamsa/lib/server/business";

/**
 * Server function: Get a single place with hierarchy and counts
 * @returns Place with parent reference and relationship counts
 * @requires GET method
 */
export const getPlace = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<PlaceWithChildren> => {
    return getPlaceData(data.id);
  });

/**
 * Server function: Search places by name
 * @returns Array of matching places (max 50 results)
 * @requires GET method
 */
export const searchPlaces = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<
      Array<
        PlaceResponse & {
          parentName: string | null;
        }
      >
    > => {
      return searchPlacesData(data.query);
    }
  );

/**
 * Server function: Get full hierarchy from root to a place
 * @returns Array of place hierarchy items from root to target
 * @requires GET method
 */
export const getPlaceHierarchy = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<PlaceHierarchyItem[]> => {
    return getPlaceHierarchyData(data.id);
  });

/**
 * Server function: Get all places associated with a person
 * @returns Array of person-place relationships
 * @requires GET method
 */
export const getPersonPlaces = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }): Promise<PersonPlace[]> => {
    return getPersonPlacesData(data.personId);
  });

/**
 * Server function: Create a new place
 * @returns Created place with formatted response
 * @requires POST method
 */
export const createPlace = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return placeCreateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<PlaceResponse> => {
    return createPlaceData(data);
  });

/**
 * Server function: Update an existing place
 * @returns Updated place with formatted response
 * @requires POST method
 */
export const updatePlace = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return placeUpdateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<PlaceResponse> => {
    const { id, ...updates } = data;
    return updatePlaceData(id, updates);
  });

/**
 * Server function: Delete a place
 * @returns Success status
 * @requires POST method
 * @throws Error if place not found or is still in use
 */
export const deletePlace = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<{ success: true }> => {
    return deletePlaceData(data.id);
  });

/**
 * Server function: Link a person to a place
 * @returns Created link with place details
 * @requires POST method
 */
export const linkPersonToPlace = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return placePersonLinkCreateSchema.parse(data);
  })
  .handler(
    async ({
      data,
    }): Promise<{
      id: string;
      place: PlaceResponse;
      fromYear: number | null;
      toYear: number | null;
      type: PersonPlaceType | null;
      createdAt: string;
    }> => {
      return linkPersonToPlaceData(data);
    }
  );

/**
 * Server function: Get display path for a place
 * Example: "London, England, United Kingdom"
 * @returns Comma-separated string of place names
 * @requires GET method
 */
export const getPlaceHierarchyPath = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<string> => {
    return getPlaceHierarchyPathData(data.id);
  });

/**
 * Server function: Get all child places of a parent place
 * @returns Array of child places
 * @requires GET method
 */
export const getPlaceChildren = createServerFn({ method: "GET" })
  .inputValidator((data: { parentId: string }) => data)
  .handler(async ({ data }): Promise<PlaceResponse[]> => {
    return getPlaceChildrenData(data.parentId);
  });

/**
 * Server function: Update a place-person link
 * @returns Updated link with place details
 * @requires POST method
 */
export const updatePlacePersonLink = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      linkId: string;
      fromYear?: number | null;
      toYear?: number | null;
      type?: PersonPlaceType | null;
    }) => data
  )
  .handler(
    async ({
      data,
    }): Promise<{
      id: string;
      place: PlaceResponse;
      parentName: string | null;
      fromYear: number | null;
      toYear: number | null;
      type: PersonPlaceType | null;
    }> => {
      const { linkId, ...updates } = data;
      return updatePlacePersonLinkData(linkId, updates);
    }
  );

/**
 * Server function: Unlink a person from a place
 * @returns Success status
 * @requires POST method
 */
export const unlinkPersonFromPlace = createServerFn({ method: "POST" })
  .inputValidator((data: { linkId: string }) => data)
  .handler(async ({ data }): Promise<{ success: true }> => {
    return unlinkPersonFromPlaceData(data.linkId);
  });
