import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import {
  placeCreateSchema,
  placeUpdateSchema,
  placePersonLinkCreateSchema,
} from "@vamsa/schemas";

// Type definitions for responses
interface PlaceResponse {
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

interface PlaceWithChildren extends PlaceResponse {
  parent: PlaceResponse | null;
  childCount: number;
  eventCount: number;
  personCount: number;
}

interface PlaceHierarchyItem {
  id: string;
  name: string;
  placeType: string;
}

interface PersonPlace {
  id: string;
  place: PlaceResponse;
  parentName: string | null;
  fromYear: number | null;
  toYear: number | null;
  type: string | null;
}

// Helper function to format place response
const formatPlace = (place: {
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
}): PlaceResponse => ({
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
});

// Get a single place with hierarchy and counts
export const getPlace = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const place = await prisma.place.findUnique({
      where: { id: data.id },
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
    } as PlaceWithChildren;
  });

// Search places by name
export const searchPlaces = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    const places = await prisma.place.findMany({
      where: {
        name: { contains: data.query, mode: "insensitive" },
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
  });

// Get full hierarchy from root to this place
export const getPlaceHierarchy = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const place = await prisma.place.findUnique({
      where: { id: data.id },
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
      const parent = await prisma.place.findUnique({
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
  });

// Get all places associated with a person
export const getPersonPlaces = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }) => {
    const person = await prisma.person.findUnique({
      where: { id: data.personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    const placeLinks = await prisma.placePersonLink.findMany({
      where: { personId: data.personId },
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
    })) as PersonPlace[];
  });

// Create a new place
export const createPlace = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return placeCreateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    // Verify parent place exists if parentId is provided
    if (data.parentId) {
      const parentPlace = await prisma.place.findUnique({
        where: { id: data.parentId },
      });

      if (!parentPlace) {
        throw new Error("Parent place not found");
      }
    }

    const place = await prisma.place.create({
      data: {
        name: data.name,
        placeType: data.placeType,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        parentId: data.parentId || null,
        description: data.description || null,
        alternativeNames: data.alternativeNames || undefined,
      },
    });

    return formatPlace(place);
  });

// Update a place
export const updatePlace = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return placeUpdateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const { id, ...updates } = data;

    // Verify place exists
    const existingPlace = await prisma.place.findUnique({
      where: { id },
    });

    if (!existingPlace) {
      throw new Error("Place not found");
    }

    // Verify parent place exists if parentId is being updated
    if (updates.parentId && updates.parentId !== null) {
      const parentPlace = await prisma.place.findUnique({
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
    if (updates.placeType !== undefined)
      updateData.placeType = updates.placeType;
    if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
    if (updates.longitude !== undefined)
      updateData.longitude = updates.longitude;
    if (updates.parentId !== undefined) updateData.parentId = updates.parentId;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.alternativeNames !== undefined) {
      updateData.alternativeNames = updates.alternativeNames || undefined;
    }

    const place = await prisma.place.update({
      where: { id },
      data: updateData,
    });

    return formatPlace(place);
  });

// Delete a place (only if not in use)
export const deletePlace = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    // Verify place exists
    const place = await prisma.place.findUnique({
      where: { id: data.id },
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

    await prisma.place.delete({
      where: { id: data.id },
    });

    return { success: true };
  });

// Link a person to a place
export const linkPersonToPlace = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return placePersonLinkCreateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    // Verify person exists
    const person = await prisma.person.findUnique({
      where: { id: data.personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    // Verify place exists
    const place = await prisma.place.findUnique({
      where: { id: data.placeId },
    });

    if (!place) {
      throw new Error("Place not found");
    }

    // Check if link already exists with the same type
    if (data.type) {
      const existingLink = await prisma.placePersonLink.findUnique({
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

    const link = await prisma.placePersonLink.create({
      data: {
        personId: data.personId,
        placeId: data.placeId,
        fromYear: data.fromYear || null,
        toYear: data.toYear || null,
        type: data.type || null,
      },
      include: {
        place: {
          include: { parent: true },
        },
      },
    });

    return {
      id: link.id,
      place: formatPlace(link.place),
      fromYear: link.fromYear,
      toYear: link.toYear,
      type: link.type,
      createdAt: link.createdAt.toISOString(),
    };
  });

// Get display path for a place (e.g., "London, England, United Kingdom")
export const getPlaceHierarchyPath = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const place = await prisma.place.findUnique({
      where: { id: data.id },
      include: { parent: true },
    });

    if (!place) {
      throw new Error("Place not found");
    }

    const pathParts: string[] = [place.name];

    let current = place;
    while (current.parentId) {
      const parent = await prisma.place.findUnique({
        where: { id: current.parentId },
        include: { parent: true },
      });

      if (!parent) break;

      pathParts.unshift(parent.name);
      current = parent;
    }

    return pathParts.join(", ");
  });

// Unlink a person from a place
export const unlinkPersonFromPlace = createServerFn({ method: "POST" })
  .inputValidator((data: { linkId: string }) => data)
  .handler(async ({ data }) => {
    // Verify link exists
    const link = await prisma.placePersonLink.findUnique({
      where: { id: data.linkId },
    });

    if (!link) {
      throw new Error("Place-person link not found");
    }

    await prisma.placePersonLink.delete({
      where: { id: data.linkId },
    });

    return { success: true };
  });
