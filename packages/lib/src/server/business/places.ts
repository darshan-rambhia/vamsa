import { prisma as defaultPrisma } from "../db";
import type { PrismaClient, PlaceType, PersonPlaceType } from "@vamsa/api";

/**
 * Type for the database client used by place functions.
 * This allows dependency injection for testing.
 */
export type PlaceDb = Pick<
  PrismaClient,
  "place" | "person" | "placePersonLink" | "event"
>;

/**
 * Place response interface for formatted place data
 */
export interface PlaceResponse {
  id: string;
  name: string;
  placeType: string;
  latitude: number | null;
  longitude: number | null;
  parentId: string | null;
  description: string | null;
  alternativeNames: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Place with children and relationships count
 */
export interface PlaceWithChildren extends PlaceResponse {
  parent: PlaceResponse | null;
  childCount: number;
  eventCount: number;
  personCount: number;
}

/**
 * Place hierarchy item for breadcrumb navigation
 */
export interface PlaceHierarchyItem {
  id: string;
  name: string;
  placeType: string;
}

/**
 * Person-place relationship
 */
export interface PersonPlace {
  id: string;
  place: PlaceResponse;
  parentName: string | null;
  fromYear: number | null;
  toYear: number | null;
  type: PersonPlaceType | null;
}

/**
 * Updated place-person link result
 */
export interface UpdatedPlacePersonLink {
  id: string;
  place: PlaceResponse;
  parentName: string | null;
  fromYear: number | null;
  toYear: number | null;
  type: PersonPlaceType | null;
}

/**
 * Format a place object from database to API response
 * Converts Date objects to ISO strings and handles unknown types
 *
 * @param place - Raw place from database
 * @returns Formatted PlaceResponse
 */
export function formatPlace(place: {
  id: string;
  name: string;
  placeType: string;
  latitude: number | null;
  longitude: number | null;
  parentId: string | null;
  description: string | null;
  alternativeNames: unknown;
  createdAt: Date;
  updatedAt: Date;
}): PlaceResponse {
  return {
    id: place.id,
    name: place.name,
    placeType: place.placeType,
    latitude: place.latitude,
    longitude: place.longitude,
    parentId: place.parentId,
    description: place.description,
    alternativeNames: place.alternativeNames as string[] | null,
    createdAt: place.createdAt.toISOString(),
    updatedAt: place.updatedAt.toISOString(),
  };
}

/**
 * Retrieve a single place with hierarchy and relationship counts
 *
 * @param id - Place ID to retrieve
 * @param db - Optional database client (defaults to prisma)
 * @returns Place with parent reference and counts
 * @throws Error if place not found
 */
export async function getPlaceData(
  id: string,
  db: PlaceDb = defaultPrisma
): Promise<PlaceWithChildren> {
  const place = await db.place.findUnique({
    where: { id },
    include: {
      parent: true,
      children: true,
      events: true,
      personLinks: true,
    },
  });

  if (!place) {
    throw new Error("Place not found");
  }

  return {
    ...formatPlace(place),
    parent: place.parent ? formatPlace(place.parent) : null,
    childCount: place.children.length,
    eventCount: place.events.length,
    personCount: place.personLinks.length,
  };
}

/**
 * Search places by name (case-insensitive)
 *
 * @param query - Search query string
 * @param db - Optional database client (defaults to prisma)
 * @returns Array of matching places (max 50 results), sorted by type then name
 */
export async function searchPlacesData(
  query: string,
  db: PlaceDb = defaultPrisma
): Promise<
  Array<
    PlaceResponse & {
      parentName: string | null;
    }
  >
> {
  const places = await db.place.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
    },
    include: {
      parent: true,
    },
    take: 50,
    orderBy: [{ placeType: "asc" }, { name: "asc" }],
  });

  return places.map((place) => {
    const formatted = formatPlace(place);
    return {
      ...formatted,
      parentName: place.parent?.name || null,
    };
  });
}

/**
 * Get full hierarchy path from root to a specific place
 * Recursively traverses up the parent chain to build complete hierarchy
 *
 * @param id - Place ID to get hierarchy for
 * @param db - Optional database client (defaults to prisma)
 * @returns Array of place hierarchy items from root to target
 * @throws Error if place not found
 */
export async function getPlaceHierarchyData(
  id: string,
  db: PlaceDb = defaultPrisma
): Promise<PlaceHierarchyItem[]> {
  const place = await db.place.findUnique({
    where: { id },
    include: { parent: true },
  });

  if (!place) {
    throw new Error("Place not found");
  }

  // Build hierarchy from child to parent
  const hierarchy: PlaceHierarchyItem[] = [
    {
      id: place.id,
      name: place.name,
      placeType: place.placeType,
    },
  ];

  let current = place;
  while (current.parentId) {
    const parent = await db.place.findUnique({
      where: { id: current.parentId },
      include: { parent: true },
    });

    if (!parent) break;

    hierarchy.unshift({
      id: parent.id,
      name: parent.name,
      placeType: parent.placeType,
    });

    current = parent;
  }

  return hierarchy;
}

/**
 * Get all places associated with a person
 *
 * @param personId - Person ID to get places for
 * @param db - Optional database client (defaults to prisma)
 * @returns Array of person-place relationships sorted by creation date
 * @throws Error if person not found
 */
export async function getPersonPlacesData(
  personId: string,
  db: PlaceDb = defaultPrisma
): Promise<PersonPlace[]> {
  const person = await db.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const placeLinks = await db.placePersonLink.findMany({
    where: { personId },
    include: {
      place: {
        include: { parent: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return placeLinks.map((link) => ({
    id: link.id,
    place: formatPlace(link.place),
    parentName: link.place.parent?.name || null,
    fromYear: link.fromYear,
    toYear: link.toYear,
    type: link.type,
  }));
}

/**
 * Create a new place
 * Validates parent place exists if parentId is provided
 *
 * @param data - Place creation data (name, type, location, optional parent)
 * @param db - Optional database client (defaults to prisma)
 * @returns Created place with formatted response
 * @throws Error if parent place not found
 */
export async function createPlaceData(
  data: {
    name: string;
    placeType: PlaceType;
    latitude?: number | null;
    longitude?: number | null;
    parentId?: string | null;
    description?: string | null;
    alternativeNames?: string[] | null;
  },
  db: PlaceDb = defaultPrisma
): Promise<PlaceResponse> {
  // Verify parent place exists if parentId is provided
  if (data.parentId) {
    const parentPlace = await db.place.findUnique({
      where: { id: data.parentId },
    });

    if (!parentPlace) {
      throw new Error("Parent place not found");
    }
  }

  const place = await db.place.create({
    data: {
      name: data.name,
      placeType: data.placeType,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      parentId: data.parentId ?? null,
      description: data.description ?? null,
      alternativeNames: data.alternativeNames || undefined,
    },
  });

  return formatPlace(place);
}

/**
 * Update an existing place
 * Validates parent place exists if parentId is being updated
 * Prevents circular hierarchies (place cannot be its own parent)
 *
 * @param id - Place ID to update
 * @param updates - Partial place update data
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated place with formatted response
 * @throws Error if place not found, parent not found, or circular hierarchy detected
 */
export async function updatePlaceData(
  id: string,
  updates: {
    name?: string;
    placeType?: PlaceType;
    latitude?: number | null;
    longitude?: number | null;
    parentId?: string | null;
    description?: string | null;
    alternativeNames?: string[] | null;
  },
  db: PlaceDb = defaultPrisma
): Promise<PlaceResponse> {
  // Verify place exists
  const existingPlace = await db.place.findUnique({
    where: { id },
  });

  if (!existingPlace) {
    throw new Error("Place not found");
  }

  // Verify parent place exists if parentId is being updated
  if (updates.parentId && updates.parentId !== null) {
    const parentPlace = await db.place.findUnique({
      where: { id: updates.parentId },
    });

    if (!parentPlace) {
      throw new Error("Parent place not found");
    }

    // Prevent circular hierarchy
    if (updates.parentId === id) {
      throw new Error("A place cannot be its own parent");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.placeType !== undefined) updateData.placeType = updates.placeType;
  if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
  if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
  if (updates.parentId !== undefined) updateData.parentId = updates.parentId;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.alternativeNames !== undefined) {
    updateData.alternativeNames = updates.alternativeNames || undefined;
  }

  const place = await db.place.update({
    where: { id },
    data: updateData,
  });

  return formatPlace(place);
}

/**
 * Delete a place
 * Only succeeds if place has no child places, events, or person links
 *
 * @param id - Place ID to delete
 * @param db - Optional database client (defaults to prisma)
 * @returns Success status
 * @throws Error if place not found or is still in use
 */
export async function deletePlaceData(
  id: string,
  db: PlaceDb = defaultPrisma
): Promise<{ success: true }> {
  // Verify place exists and check usage
  const place = await db.place.findUnique({
    where: { id },
    include: {
      events: true,
      personLinks: true,
      children: true,
    },
  });

  if (!place) {
    throw new Error("Place not found");
  }

  // Check if place is in use
  if (place.events.length > 0) {
    throw new Error(
      `Cannot delete place: ${place.events.length} events are linked to this place`
    );
  }

  if (place.personLinks.length > 0) {
    throw new Error(
      `Cannot delete place: ${place.personLinks.length} people are linked to this place`
    );
  }

  if (place.children.length > 0) {
    throw new Error(
      `Cannot delete place: ${place.children.length} child places exist under this place`
    );
  }

  await db.place.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * Link a person to a place
 * Prevents duplicate links with the same type for the same person-place pair
 *
 * @param data - Link creation data (personId, placeId, optional type and years)
 * @param db - Optional database client (defaults to prisma)
 * @returns Created link with place details
 * @throws Error if person/place not found or duplicate link exists
 */
export async function linkPersonToPlaceData(
  data: {
    personId: string;
    placeId: string;
    fromYear?: number | null;
    toYear?: number | null;
    type?: PersonPlaceType | null;
  },
  db: PlaceDb = defaultPrisma
): Promise<{
  id: string;
  place: PlaceResponse;
  fromYear: number | null;
  toYear: number | null;
  type: PersonPlaceType | null;
  createdAt: string;
}> {
  // Verify person exists
  const person = await db.person.findUnique({
    where: { id: data.personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  // Verify place exists
  const place = await db.place.findUnique({
    where: { id: data.placeId },
  });

  if (!place) {
    throw new Error("Place not found");
  }

  // Check if link already exists with the same type
  if (data.type) {
    const existingLink = await db.placePersonLink.findUnique({
      where: {
        personId_placeId_type: {
          personId: data.personId,
          placeId: data.placeId,
          type: data.type,
        },
      },
    });

    if (existingLink) {
      throw new Error(
        "This person is already linked to this place with this type"
      );
    }
  }

  const link = await db.placePersonLink.create({
    data: {
      personId: data.personId,
      placeId: data.placeId,
      fromYear: data.fromYear ?? null,
      toYear: data.toYear ?? null,
      type: data.type ?? null,
    },
  });

  // Fetch the created link with place details
  const createdLink = await db.placePersonLink.findUnique({
    where: { id: link.id },
    include: {
      place: {
        include: { parent: true },
      },
    },
  });

  if (!createdLink) {
    throw new Error("Failed to fetch created link");
  }

  return {
    id: createdLink.id,
    place: formatPlace(createdLink.place),
    fromYear: createdLink.fromYear,
    toYear: createdLink.toYear,
    type: createdLink.type,
    createdAt: createdLink.createdAt.toISOString(),
  };
}

/**
 * Get display path for a place
 * Example: "London, England, United Kingdom"
 * Recursively traverses up the parent chain
 *
 * @param id - Place ID to get path for
 * @param db - Optional database client (defaults to prisma)
 * @returns Comma-separated string of place names from root to target
 * @throws Error if place not found
 */
export async function getPlaceHierarchyPathData(
  id: string,
  db: PlaceDb = defaultPrisma
): Promise<string> {
  const place = await db.place.findUnique({
    where: { id },
    include: { parent: true },
  });

  if (!place) {
    throw new Error("Place not found");
  }

  const pathParts: string[] = [place.name];

  let current = place;
  while (current.parentId) {
    const parent = await db.place.findUnique({
      where: { id: current.parentId },
      include: { parent: true },
    });

    if (!parent) break;

    pathParts.unshift(parent.name);
    current = parent;
  }

  return pathParts.join(", ");
}

/**
 * Get all child places of a parent place
 *
 * @param parentId - Parent place ID
 * @param db - Optional database client (defaults to prisma)
 * @returns Array of child places sorted by type then name
 */
export async function getPlaceChildrenData(
  parentId: string,
  db: PlaceDb = defaultPrisma
): Promise<PlaceResponse[]> {
  const children = await db.place.findMany({
    where: { parentId },
    orderBy: [{ placeType: "asc" }, { name: "asc" }],
  });

  return children.map(formatPlace);
}

/**
 * Update a place-person link
 *
 * @param linkId - Link ID to update
 * @param updates - Partial link update data (years, type)
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated link with place details
 * @throws Error if link not found
 */
export async function updatePlacePersonLinkData(
  linkId: string,
  updates: {
    fromYear?: number | null;
    toYear?: number | null;
    type?: PersonPlaceType | null;
  },
  db: PlaceDb = defaultPrisma
): Promise<UpdatedPlacePersonLink> {
  // Verify link exists
  const link = await db.placePersonLink.findUnique({
    where: { id: linkId },
  });

  if (!link) {
    throw new Error("Place-person link not found");
  }

  const updateData: Record<string, unknown> = {};
  if (updates.fromYear !== undefined) updateData.fromYear = updates.fromYear;
  if (updates.toYear !== undefined) updateData.toYear = updates.toYear;
  if (updates.type !== undefined) updateData.type = updates.type;

  const updatedLink = await db.placePersonLink.update({
    where: { id: linkId },
    data: updateData,
  });

  // Fetch the updated link with place details
  const linkWithPlace = await db.placePersonLink.findUnique({
    where: { id: updatedLink.id },
    include: {
      place: {
        include: { parent: true },
      },
    },
  });

  if (!linkWithPlace) {
    throw new Error("Failed to fetch updated link");
  }

  return {
    id: linkWithPlace.id,
    place: formatPlace(linkWithPlace.place),
    parentName: linkWithPlace.place.parent?.name || null,
    fromYear: linkWithPlace.fromYear,
    toYear: linkWithPlace.toYear,
    type: linkWithPlace.type,
  };
}

/**
 * Remove a person-place link
 *
 * @param linkId - Link ID to delete
 * @param db - Optional database client (defaults to prisma)
 * @returns Success status
 * @throws Error if link not found
 */
export async function unlinkPersonFromPlaceData(
  linkId: string,
  db: PlaceDb = defaultPrisma
): Promise<{ success: true }> {
  // Verify link exists
  const link = await db.placePersonLink.findUnique({
    where: { id: linkId },
  });

  if (!link) {
    throw new Error("Place-person link not found");
  }

  await db.placePersonLink.delete({
    where: { id: linkId },
  });

  return { success: true };
}
