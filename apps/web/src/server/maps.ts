import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";
import { logger, serializeError } from "@vamsa/lib/logger";

// Type definitions for map responses
interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  placeType: string;
  description: string | null;
  personCount: number;
  eventCount: number;
  eventTypes: string[];
  timeRange: {
    earliest: number | null;
    latest: number | null;
  };
}

interface PersonLocationMarker extends MapMarker {
  personIds: string[];
  people: Array<{
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  }>;
}

interface FamilyLocationMarker extends MapMarker {
  memberCount: number;
  eventDetails: Array<{
    type: string;
    year: number | null;
  }>;
}

interface TimelineMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  placeType: string;
  year: number | null;
  eventType: string;
  personIds: string[];
}

interface ClusterBound {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface PlaceCluster {
  bounds: ClusterBound;
  places: MapMarker[];
  centerLat: number;
  centerLng: number;
  count: number;
}

// Validation schemas
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

// Helper function to calculate time range from events and person links
async function calculateTimeRange(
  placeId: string
): Promise<{ earliest: number | null; latest: number | null }> {
  // Get time range from events
  const eventDates = await prisma.event.findMany({
    where: { placeId },
    select: { date: true },
  });

  // Get time range from person-place links
  const personLinks = await prisma.placePersonLink.findMany({
    where: { placeId },
    select: { fromYear: true, toYear: true },
  });

  const years: number[] = [];

  eventDates.forEach((e) => {
    if (e.date) {
      years.push(e.date.getFullYear());
    }
  });

  personLinks.forEach((l) => {
    if (l.fromYear) years.push(l.fromYear);
    if (l.toYear) years.push(l.toYear);
  });

  if (years.length === 0) {
    return { earliest: null, latest: null };
  }

  return {
    earliest: Math.min(...years),
    latest: Math.max(...years),
  };
}

// Get all places with geographic data for map display
export const getPlacesForMap = createServerFn({ method: "GET" })
  .inputValidator((data) => getPlacesForMapSchema.parse(data))
  .handler(async ({ data }) => {
    const places = await prisma.place.findMany({
      where: {
        ...(data.includeEmpty
          ? {}
          : {
              OR: [{ events: { some: {} } }, { personLinks: { some: {} } }],
            }),
        NOT: {
          latitude: null,
          longitude: null,
        },
      },
      include: {
        events: true,
        personLinks: true,
      },
      orderBy: { name: "asc" },
    });

    const markers: MapMarker[] = [];

    for (const place of places) {
      try {
        // Skip places without coordinates (shouldn't happen due to WHERE clause)
        if (!place.latitude || !place.longitude) continue;

        const eventTypes = place.events
          .map((e) => e.type)
          .filter((v, i, a) => a.indexOf(v) === i);
        const timeRange = await calculateTimeRange(place.id);

        markers.push({
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          placeType: place.placeType,
          description: place.description,
          personCount: place.personLinks.length,
          eventCount: place.events.length,
          eventTypes,
          timeRange,
        });
      } catch (error) {
        logger.error(
          { error: serializeError(error), placeId: place.id },
          "Failed to format place"
        );
      }
    }

    return {
      markers,
      total: markers.length,
    };
  });

// Get all places associated with a person for map visualization
export const getPersonLocations = createServerFn({ method: "GET" })
  .inputValidator((data) => getPersonLocationsSchema.parse(data))
  .handler(async ({ data }) => {
    const person = await prisma.person.findUnique({
      where: { id: data.personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    // Get places from person-place links
    const personPlaceLinks = await prisma.placePersonLink.findMany({
      where: { personId: data.personId },
      include: {
        place: {
          include: {
            events: {
              where: { personId: data.personId },
            },
          },
        },
      },
    });

    // Get places from events
    const eventPlaces = await prisma.event.findMany({
      where: { personId: data.personId },
      include: {
        placeRecord: true,
      },
    });

    // Combine and deduplicate places
    const placeMap = new Map<
      string,
      {
        id: string;
        name: string;
        placeType: string;
        latitude: number;
        longitude: number;
        description: string | null;
        fromYear: number | null;
        toYear: number | null;
        type: string | null;
      }
    >();

    personPlaceLinks.forEach((link) => {
      if (link.place.latitude && link.place.longitude) {
        placeMap.set(link.placeId, {
          id: link.place.id,
          name: link.place.name,
          placeType: link.place.placeType,
          latitude: link.place.latitude,
          longitude: link.place.longitude,
          description: link.place.description,
          fromYear: link.fromYear,
          toYear: link.toYear,
          type: link.type,
        });
      }
    });

    eventPlaces.forEach((event) => {
      if (
        event.placeRecord &&
        event.placeRecord.latitude &&
        event.placeRecord.longitude
      ) {
        if (!placeMap.has(event.placeRecord.id)) {
          placeMap.set(event.placeRecord.id, {
            id: event.placeRecord.id,
            name: event.placeRecord.name,
            placeType: event.placeRecord.placeType,
            latitude: event.placeRecord.latitude,
            longitude: event.placeRecord.longitude,
            description: event.placeRecord.description,
            fromYear: event.date ? event.date.getFullYear() : null,
            toYear: null,
            type: event.type,
          });
        }
      }
    });

    const markers: PersonLocationMarker[] = [];

    for (const place of placeMap.values()) {
      try {
        // Get all people at this place (for clustering)
        const peopleAtPlace = await prisma.placePersonLink.findMany({
          where: { placeId: place.id },
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
              },
            },
          },
        });

        const events = await prisma.event.findMany({
          where: { placeId: place.id },
        });

        const eventTypes = events
          .map((e) => e.type)
          .filter((v, i, a) => a.indexOf(v) === i);
        const timeRange = await calculateTimeRange(place.id);

        markers.push({
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          placeType: place.placeType,
          description: place.description,
          personCount: peopleAtPlace.length,
          eventCount: events.length,
          eventTypes,
          timeRange,
          personIds: peopleAtPlace.map((p) => p.personId),
          people: peopleAtPlace.map((p) => ({
            id: p.person.id,
            firstName: p.person.firstName,
            lastName: p.person.lastName,
            photoUrl: p.person.photoUrl,
          })),
        });
      } catch (error) {
        logger.error(
          { error: serializeError(error), placeId: place.id },
          "Failed to format place"
        );
      }
    }

    return {
      markers,
      total: markers.length,
      person: {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
      },
    };
  });

// Get all places in the family tree for map visualization
export const getFamilyLocations = createServerFn({ method: "GET" })
  .inputValidator((data) => getFamilyLocationsSchema.parse(data))
  .handler(async () => {
    // Get all persons in the family
    const persons = await prisma.person.findMany({
      select: { id: true },
    });

    const personIds = persons.map((p) => p.id);

    // Get all places with coordinates linked to family members
    const places = await prisma.place.findMany({
      where: {
        AND: [
          {
            OR: [
              { personLinks: { some: { personId: { in: personIds } } } },
              { events: { some: { personId: { in: personIds } } } },
            ],
          },
          {
            NOT: {
              latitude: null,
              longitude: null,
            },
          },
        ],
      },
      include: {
        personLinks: {
          where: { personId: { in: personIds } },
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
              },
            },
          },
        },
        events: {
          where: { personId: { in: personIds } },
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const markers: FamilyLocationMarker[] = [];

    for (const place of places) {
      try {
        // Skip places without coordinates
        if (!place.latitude || !place.longitude) continue;

        // Collect unique people at this location
        const uniquePeople = new Map<
          string,
          {
            id: string;
            firstName: string;
            lastName: string;
            photoUrl: string | null;
          }
        >();

        place.personLinks.forEach((link) => {
          uniquePeople.set(link.personId, {
            id: link.person.id,
            firstName: link.person.firstName,
            lastName: link.person.lastName,
            photoUrl: link.person.photoUrl,
          });
        });

        place.events.forEach((event) => {
          uniquePeople.set(event.personId, {
            id: event.person.id,
            firstName: event.person.firstName,
            lastName: event.person.lastName,
            photoUrl: null,
          });
        });

        // Get event details with years
        const eventDetails = place.events.map((event) => ({
          type: event.type,
          year: event.date ? event.date.getFullYear() : null,
        }));

        const eventTypes = [...new Set(place.events.map((e) => e.type))];
        const timeRange = await calculateTimeRange(place.id);

        markers.push({
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          placeType: place.placeType,
          description: place.description,
          personCount: uniquePeople.size,
          eventCount: place.events.length,
          eventTypes,
          timeRange,
          memberCount: uniquePeople.size,
          eventDetails,
        });
      } catch (error) {
        logger.error(
          { error: serializeError(error), placeId: place.id },
          "Failed to format place"
        );
      }
    }

    return {
      markers,
      total: markers.length,
      familySize: personIds.length,
    };
  });

// Get places filtered by date range for timeline visualization
export const getPlacesByTimeRange = createServerFn({ method: "GET" })
  .inputValidator((data) => getPlacesByTimeRangeSchema.parse(data))
  .handler(async ({ data }) => {
    const startDate = new Date(`${data.startYear}-01-01`);
    const endDate = new Date(`${data.endYear}-12-31`);

    // Get places with events in the time range
    const places = await prisma.place.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                events: {
                  some: {
                    date: { gte: startDate, lte: endDate },
                  },
                },
              },
              {
                personLinks: {
                  some: {
                    OR: [
                      { fromYear: { gte: data.startYear, lte: data.endYear } },
                      { toYear: { gte: data.startYear, lte: data.endYear } },
                      {
                        AND: [
                          { fromYear: { lte: data.startYear } },
                          {
                            OR: [
                              { toYear: { gte: data.endYear } },
                              { toYear: null },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          },
          {
            NOT: {
              latitude: null,
              longitude: null,
            },
          },
        ],
      },
      include: {
        events: {
          where: {
            date: { gte: startDate, lte: endDate },
          },
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        personLinks: {
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const timelineMarkers: TimelineMarker[] = [];

    for (const place of places) {
      // Skip places without coordinates (shouldn't happen due to WHERE clause)
      if (!place.latitude || !place.longitude) continue;

      // Create markers for each event in the time range
      for (const event of place.events) {
        if (event.date) {
          const year = event.date.getFullYear();
          timelineMarkers.push({
            id: `${place.id}-${event.id}`,
            name: place.name,
            latitude: place.latitude,
            longitude: place.longitude,
            placeType: place.placeType,
            year,
            eventType: event.type,
            personIds: [event.personId],
          });
        }
      }

      // Create markers for person-place links that overlap with time range
      for (const link of place.personLinks) {
        const linkStart = link.fromYear || data.startYear;
        const linkEnd = link.toYear || data.endYear;

        if (linkStart <= data.endYear && linkEnd >= data.startYear) {
          // Generate a marker for the start of the link (or earliest year in range)
          const markerYear = Math.max(linkStart, data.startYear);
          timelineMarkers.push({
            id: `${place.id}-link-${link.id}`,
            name: place.name,
            latitude: place.latitude,
            longitude: place.longitude,
            placeType: place.placeType,
            year: markerYear,
            eventType: link.type || "RESIDENCE",
            personIds: [link.personId],
          });
        }
      }
    }

    // Deduplicate and sort by year
    const uniqueMarkers = new Map<string, TimelineMarker>();
    for (const marker of timelineMarkers) {
      const key = `${marker.id}-${marker.year}`;
      if (!uniqueMarkers.has(key)) {
        uniqueMarkers.set(key, marker);
      } else {
        // Merge person IDs if marker already exists
        const existing = uniqueMarkers.get(key)!;
        existing.personIds = [
          ...new Set([...existing.personIds, ...marker.personIds]),
        ];
      }
    }

    const sorted = Array.from(uniqueMarkers.values()).sort((a, b) => {
      const aYear = a.year ?? 0;
      const bYear = b.year ?? 0;
      return aYear - bYear;
    });

    return {
      markers: sorted,
      total: sorted.length,
      timeRange: {
        startYear: data.startYear,
        endYear: data.endYear,
      },
    };
  });

// Get clustered places by geographic bounds for efficient map rendering
export const getPlaceClusters = createServerFn({ method: "GET" })
  .inputValidator((data) => getPlaceClusterSchema.parse(data))
  .handler(async ({ data }) => {
    const { bounds, clusterSize } = data;

    // Get all places within the bounds
    const places = await prisma.place.findMany({
      where: {
        AND: [
          { latitude: { gte: bounds.minLat, lte: bounds.maxLat } },
          { longitude: { gte: bounds.minLng, lte: bounds.maxLng } },
          {
            OR: [{ events: { some: {} } }, { personLinks: { some: {} } }],
          },
        ],
      },
      include: {
        events: true,
        personLinks: true,
      },
    });

    // Format places as markers
    const markers: MapMarker[] = [];
    for (const place of places) {
      try {
        // Skip places without coordinates (shouldn't happen due to WHERE clause)
        if (!place.latitude || !place.longitude) continue;

        const eventTypes = place.events
          .map((e) => e.type)
          .filter((v, i, a) => a.indexOf(v) === i);
        const timeRange = await calculateTimeRange(place.id);

        markers.push({
          id: place.id,
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          placeType: place.placeType,
          description: place.description,
          personCount: place.personLinks.length,
          eventCount: place.events.length,
          eventTypes,
          timeRange,
        });
      } catch (error) {
        logger.error(
          { error: serializeError(error), placeId: place.id },
          "Failed to format place"
        );
      }
    }

    // Simple clustering algorithm: sort by latitude, then create clusters
    markers.sort((a, b) => a.latitude - b.latitude);

    const clusters: PlaceCluster[] = [];
    let currentCluster: MapMarker[] = [];

    for (const marker of markers) {
      if (
        currentCluster.length === 0 ||
        currentCluster.length < clusterSize ||
        calculateDistance(marker, currentCluster[0]) < 50000 // ~50km threshold
      ) {
        currentCluster.push(marker);
      } else {
        if (currentCluster.length > 0) {
          clusters.push(createCluster(currentCluster));
        }
        currentCluster = [marker];
      }
    }

    if (currentCluster.length > 0) {
      clusters.push(createCluster(currentCluster));
    }

    return {
      clusters,
      totalClusters: clusters.length,
      totalPlaces: markers.length,
    };
  });

// Helper function to calculate distance between two points (Haversine formula)
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

// Helper function to create a cluster from markers
function createCluster(places: MapMarker[]): PlaceCluster {
  const lats = places.map((p) => p.latitude);
  const lngs = places.map((p) => p.longitude);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return {
    bounds: { minLat, maxLat, minLng, maxLng },
    places,
    centerLat,
    centerLng,
    count: places.length,
  };
}
