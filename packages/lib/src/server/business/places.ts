// Drizzle imports - now the default ORM
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { and, asc, count, eq, ilike } from "drizzle-orm";

/** Type for the database instance (for DI) */
export type PlacesDb = typeof drizzleDb;

/**
 * Local type definitions to match Drizzle enum values
 * These types are extracted from the Drizzle schema
 */
export type PlaceType =
  | "COUNTRY"
  | "STATE"
  | "COUNTY"
  | "CITY"
  | "TOWN"
  | "VILLAGE"
  | "PARISH"
  | "DISTRICT"
  | "REGION"
  | "PROVINCE"
  | "TERRITORY"
  | "OTHER";

export type PersonPlaceType =
  | "BIRTH"
  | "MARRIAGE"
  | "DEATH"
  | "LIVED"
  | "WORKED"
  | "STUDIED"
  | "OTHER";

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
  alternativeNames: Array<string> | null;
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
 * Format a place object from database to API response * Converts Date objects to ISO strings and handles unknown types
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
    alternativeNames: place.alternativeNames as Array<string> | null,
    createdAt: place.createdAt.toISOString(),
    updatedAt: place.updatedAt.toISOString(),
  };
}

/**
 * Retrieve a single place with hierarchy and relationship counts
 *
 * @param id - Place ID to retrieve
 * @returns Place with parent reference and counts
 * @throws Error if place not found
 */
export async function getPlaceData(
  id: string,
  db: PlacesDb = drizzleDb
): Promise<PlaceWithChildren> {
  // Get the place
  const place = await db.query.places.findFirst({
    where: eq(drizzleSchema.places.id, id),
    with: {
      parent: true,
    },
  });

  if (!place) {
    throw new Error("Place not found");
  }

  // Get child count
  const childCountResult = await db
    .select({ count: count() })
    .from(drizzleSchema.places)
    .where(eq(drizzleSchema.places.parentId, id));
  const childCount = childCountResult[0]?.count || 0;

  // Get event count
  const eventCountResult = await db
    .select({ count: count() })
    .from(drizzleSchema.events)
    .where(eq(drizzleSchema.events.placeId, id));
  const eventCount = eventCountResult[0]?.count || 0;

  // Get person count (from placePersonLinks)
  const personCountResult = await db
    .select({ count: count() })
    .from(drizzleSchema.placePersonLinks)
    .where(eq(drizzleSchema.placePersonLinks.placeId, id));
  const personCount = personCountResult[0]?.count || 0;

  return {
    ...formatPlace(place),
    parent: place.parent ? formatPlace(place.parent) : null,
    childCount,
    eventCount,
    personCount,
  };
}

/**
 * Search places by name (case-insensitive)
 *
 * @param query - Search query string
 * @returns Array of matching places (max 50 results), sorted by type then name
 */
export async function searchPlacesData(
  query: string,
  db: PlacesDb = drizzleDb
): Promise<
  Array<
    PlaceResponse & {
      parentName: string | null;
    }
  >
> {
  const places = await db.query.places.findMany({
    where: ilike(drizzleSchema.places.name, `%${query}%`),
    with: {
      parent: true,
    },
    orderBy: [
      asc(drizzleSchema.places.placeType),
      asc(drizzleSchema.places.name),
    ],
    limit: 50,
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
 * Get full hierarchy path from root to a specific place * Recursively traverses up the parent chain to build complete hierarchy
 *
 * @param id - Place ID to get hierarchy for
 * @returns Array of place hierarchy items from root to target
 * @throws Error if place not found
 */
export async function getPlaceHierarchyData(
  id: string,
  db: PlacesDb = drizzleDb
): Promise<Array<PlaceHierarchyItem>> {
  const place = await db.query.places.findFirst({
    where: eq(drizzleSchema.places.id, id),
    with: {
      parent: true,
    },
  });

  if (!place) {
    throw new Error("Place not found");
  }

  // Build hierarchy from child to parent
  const hierarchy: Array<PlaceHierarchyItem> = [
    {
      id: place.id,
      name: place.name,
      placeType: place.placeType,
    },
  ];

  let current = place;
  while (current.parentId) {
    const parent = await db.query.places.findFirst({
      where: eq(drizzleSchema.places.id, current.parentId),
      with: {
        parent: true,
      },
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
 * Get all places associated with a person *
 * @param personId - Person ID to get places for
 * @returns Array of person-place relationships sorted by creation date
 * @throws Error if person not found
 */
export async function getPersonPlacesData(
  personId: string,
  db: PlacesDb = drizzleDb
): Promise<Array<PersonPlace>> {
  // Verify person exists
  const person = await db.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, personId),
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const placeLinks = await db.query.placePersonLinks.findMany({
    where: eq(drizzleSchema.placePersonLinks.personId, personId),
    with: {
      place: {
        with: {
          parent: true,
        },
      },
    },
    orderBy: asc(drizzleSchema.placePersonLinks.createdAt),
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
 * Create a new place * Validates parent place exists if parentId is provided
 *
 * @param data - Place creation data (name, type, location, optional parent)
 * @returns Created place with formatted response
 * @throws Error if parent place not found
 */
export async function createPlaceData(data: {
  name: string;
  placeType: PlaceType;
  latitude?: number | null;
  longitude?: number | null;
  parentId?: string | null;
  description?: string | null;
  alternativeNames?: Array<string> | null;
}): Promise<PlaceResponse> {
  // Verify parent place exists if parentId is provided
  if (data.parentId) {
    const parentPlace = await drizzleDb.query.places.findFirst({
      where: eq(drizzleSchema.places.id, data.parentId),
    });

    if (!parentPlace) {
      throw new Error("Parent place not found");
    }
  }

  const result = await drizzleDb
    .insert(drizzleSchema.places)
    .values({
      id: crypto.randomUUID(),
      name: data.name,
      placeType: data.placeType,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      parentId: data.parentId ?? null,
      description: data.description ?? null,
      alternativeNames: data.alternativeNames || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!result[0]) {
    throw new Error("Failed to create place");
  }

  return formatPlace(result[0]);
}

/**
 * Update an existing place * Validates parent place exists if parentId is being updated
 * Prevents circular hierarchies (place cannot be its own parent)
 *
 * @param id - Place ID to update
 * @param updates - Partial place update data
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
    alternativeNames?: Array<string> | null;
  }
): Promise<PlaceResponse> {
  // Verify place exists
  const existingPlace = await drizzleDb.query.places.findFirst({
    where: eq(drizzleSchema.places.id, id),
  });

  if (!existingPlace) {
    throw new Error("Place not found");
  }

  // Verify parent place exists if parentId is being updated
  if (updates.parentId && updates.parentId !== null) {
    const parentPlace = await drizzleDb.query.places.findFirst({
      where: eq(drizzleSchema.places.id, updates.parentId),
    });

    if (!parentPlace) {
      throw new Error("Parent place not found");
    }

    // Prevent circular hierarchy
    if (updates.parentId === id) {
      throw new Error("A place cannot be its own parent");
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
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

  const result = await drizzleDb
    .update(drizzleSchema.places)
    .set(updateData)
    .where(eq(drizzleSchema.places.id, id))
    .returning();

  if (!result[0]) {
    throw new Error("Failed to update place");
  }

  return formatPlace(result[0]);
}

/**
 * Delete a place * Only succeeds if place has no child places, events, or person links
 *
 * @param id - Place ID to delete
 * @returns Success status
 * @throws Error if place not found or is still in use
 */
export async function deletePlaceData(id: string): Promise<{ success: true }> {
  // Verify place exists
  const place = await drizzleDb.query.places.findFirst({
    where: eq(drizzleSchema.places.id, id),
  });

  if (!place) {
    throw new Error("Place not found");
  }

  // Check for child places
  const childCount = await drizzleDb
    .select({ count: count() })
    .from(drizzleSchema.places)
    .where(eq(drizzleSchema.places.parentId, id));

  if ((childCount[0]?.count || 0) > 0) {
    throw new Error(
      `Cannot delete place: ${childCount[0]?.count} child places exist under this place`
    );
  }

  // Check for events
  const eventCount = await drizzleDb
    .select({ count: count() })
    .from(drizzleSchema.events)
    .where(eq(drizzleSchema.events.placeId, id));

  if ((eventCount[0]?.count || 0) > 0) {
    throw new Error(
      `Cannot delete place: ${eventCount[0]?.count} events are linked to this place`
    );
  }

  // Check for person links
  const personLinkCount = await drizzleDb
    .select({ count: count() })
    .from(drizzleSchema.placePersonLinks)
    .where(eq(drizzleSchema.placePersonLinks.placeId, id));

  if ((personLinkCount[0]?.count || 0) > 0) {
    throw new Error(
      `Cannot delete place: ${personLinkCount[0]?.count} people are linked to this place`
    );
  }

  await drizzleDb
    .delete(drizzleSchema.places)
    .where(eq(drizzleSchema.places.id, id));

  return { success: true };
}

/**
 * Link a person to a place * Prevents duplicate links with the same type for the same person-place pair
 *
 * @param data - Link creation data (personId, placeId, optional type and years)
 * @returns Created link with place details
 * @throws Error if person/place not found or duplicate link exists
 */
export async function linkPersonToPlaceData(data: {
  personId: string;
  placeId: string;
  fromYear?: number | null;
  toYear?: number | null;
  type?: PersonPlaceType | null;
}): Promise<{
  id: string;
  place: PlaceResponse;
  fromYear: number | null;
  toYear: number | null;
  type: PersonPlaceType | null;
  createdAt: string;
}> {
  // Verify person exists
  const person = await drizzleDb.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, data.personId),
  });

  if (!person) {
    throw new Error("Person not found");
  }

  // Verify place exists
  const place = await drizzleDb.query.places.findFirst({
    where: eq(drizzleSchema.places.id, data.placeId),
  });

  if (!place) {
    throw new Error("Place not found");
  }

  // Check if link already exists with the same type
  if (data.type) {
    const existingLink = await drizzleDb.query.placePersonLinks.findFirst({
      where: and(
        eq(drizzleSchema.placePersonLinks.personId, data.personId),
        eq(drizzleSchema.placePersonLinks.placeId, data.placeId),
        eq(drizzleSchema.placePersonLinks.type, data.type)
      ),
    });

    if (existingLink) {
      throw new Error(
        "This person is already linked to this place with this type"
      );
    }
  }

  const linkId = crypto.randomUUID();
  await drizzleDb.insert(drizzleSchema.placePersonLinks).values({
    id: linkId,
    personId: data.personId,
    placeId: data.placeId,
    fromYear: data.fromYear ?? null,
    toYear: data.toYear ?? null,
    type: data.type ?? null,
    createdAt: new Date(),
  });

  // Fetch the created link with place details
  const createdLink = await drizzleDb.query.placePersonLinks.findFirst({
    where: eq(drizzleSchema.placePersonLinks.id, linkId),
    with: {
      place: {
        with: {
          parent: true,
        },
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
 * Get display path for a place * Example: "London, England, United Kingdom"
 * Recursively traverses up the parent chain
 *
 * @param id - Place ID to get path for
 * @returns Comma-separated string of place names from root to target
 * @throws Error if place not found
 */
export async function getPlaceHierarchyPathData(id: string): Promise<string> {
  const place = await drizzleDb.query.places.findFirst({
    where: eq(drizzleSchema.places.id, id),
    with: {
      parent: true,
    },
  });

  if (!place) {
    throw new Error("Place not found");
  }

  const pathParts: Array<string> = [place.name];

  let current = place;
  while (current.parentId) {
    const parent = await drizzleDb.query.places.findFirst({
      where: eq(drizzleSchema.places.id, current.parentId),
      with: {
        parent: true,
      },
    });

    if (!parent) break;

    pathParts.unshift(parent.name);
    current = parent;
  }

  return pathParts.join(", ");
}

/**
 * Get all child places of a parent place *
 * @param parentId - Parent place ID
 * @returns Array of child places sorted by type then name
 */
export async function getPlaceChildrenData(
  parentId: string
): Promise<Array<PlaceResponse>> {
  const children = await drizzleDb.query.places.findMany({
    where: eq(drizzleSchema.places.parentId, parentId),
    orderBy: [
      asc(drizzleSchema.places.placeType),
      asc(drizzleSchema.places.name),
    ],
  });

  return children.map(formatPlace);
}

/**
 * Update a place-person link *
 * @param linkId - Link ID to update
 * @param updates - Partial link update data (years, type)
 * @returns Updated link with place details
 * @throws Error if link not found
 */
export async function updatePlacePersonLinkData(
  linkId: string,
  updates: {
    fromYear?: number | null;
    toYear?: number | null;
    type?: PersonPlaceType | null;
  }
): Promise<UpdatedPlacePersonLink> {
  // Verify link exists
  const link = await drizzleDb.query.placePersonLinks.findFirst({
    where: eq(drizzleSchema.placePersonLinks.id, linkId),
  });

  if (!link) {
    throw new Error("Place-person link not found");
  }

  const updateData: Record<string, unknown> = {};
  if (updates.fromYear !== undefined) updateData.fromYear = updates.fromYear;
  if (updates.toYear !== undefined) updateData.toYear = updates.toYear;
  if (updates.type !== undefined) updateData.type = updates.type;

  await drizzleDb
    .update(drizzleSchema.placePersonLinks)
    .set(updateData)
    .where(eq(drizzleSchema.placePersonLinks.id, linkId));

  // Fetch the updated link with place details
  const linkWithPlace = await drizzleDb.query.placePersonLinks.findFirst({
    where: eq(drizzleSchema.placePersonLinks.id, linkId),
    with: {
      place: {
        with: {
          parent: true,
        },
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
 * Remove a person-place link *
 * @param linkId - Link ID to delete
 * @returns Success status
 * @throws Error if link not found
 */
export async function unlinkPersonFromPlaceData(
  linkId: string
): Promise<{ success: true }> {
  // Verify link exists
  const link = await drizzleDb.query.placePersonLinks.findFirst({
    where: eq(drizzleSchema.placePersonLinks.id, linkId),
  });

  if (!link) {
    throw new Error("Place-person link not found");
  }

  await drizzleDb
    .delete(drizzleSchema.placePersonLinks)
    .where(eq(drizzleSchema.placePersonLinks.id, linkId));

  return { success: true };
}
