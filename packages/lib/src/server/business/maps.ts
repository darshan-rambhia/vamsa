import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq, and, sql, desc, asc, count, lte, gte, inArray, or } from "drizzle-orm";
import { logger, serializeError } from "@vamsa/lib/logger";

/**
 * Type definitions for map responses
 */
export interface MapMarker {
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

export interface PersonLocationMarker extends MapMarker {
  personIds: string[];
  people: Array<{
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  }>;
}

export interface FamilyLocationMarker extends MapMarker {
  memberCount: number;
  eventDetails: Array<{
    type: string;
    year: number | null;
  }>;
}

export interface TimelineMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  placeType: string;
  year: number | null;
  eventType: string;
  personIds: string[];
}

export interface ClusterBound {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface PlaceCluster {
  bounds: ClusterBound;
  places: MapMarker[];
  centerLat: number;
  centerLng: number;
  count: number;
}

/**
 * Calculate the earliest and latest years from events and person-place links for a place
 * @param placeId - ID of the place
 * @returns Object with earliest and latest years
 */
export async function calculateTimeRange(
  placeId: string
): Promise<{ earliest: number | null; latest: number | null }> {
  // Get time range from events
  const eventDates = await drizzleDb.query.events.findMany({
    where: eq(drizzleSchema.events.placeId, placeId),
    columns: { date: true },
  });

  // Get time range from person-place links
  const personLinks = await drizzleDb.query.placePersonLinks.findMany({
    where: eq(drizzleSchema.placePersonLinks.placeId, placeId),
    columns: { fromYear: true, toYear: true },
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

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param point1 - First point with latitude and longitude
 * @param point2 - Second point with latitude and longitude
 * @returns Distance in meters
 */
export function calculateDistance(
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

/**
 * Create a cluster from an array of markers, calculating bounds and center
 * @param places - Array of map markers to cluster
 * @returns Cluster object with bounds, center, and place data
 */
export function createCluster(places: MapMarker[]): PlaceCluster {
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

/**
 * Options for querying places for map display
 */
export interface GetPlacesForMapOptions {
  includeEmpty: boolean;
}

/**
 * Get all places with geographic data for map display
 * @param options - Query options (includeEmpty flag)
 * @returns Object containing array of map markers and total count
 */
export async function getPlacesForMapData(
  options: GetPlacesForMapOptions
): Promise<{ markers: MapMarker[]; total: number }> {
  // Get all places with coordinates
  const places = await drizzleDb.query.places.findMany({
    where: sql`"Place"."latitude" IS NOT NULL AND "Place"."longitude" IS NOT NULL`,
    orderBy: asc(drizzleSchema.places.name),
  });

  const markers: MapMarker[] = [];

  for (const place of places) {
    try {
      // Skip places without coordinates
      if (!place.latitude || !place.longitude) continue;

      // Get events and person links for this place
      const events = await drizzleDb.query.events.findMany({
        where: eq(drizzleSchema.events.placeId, place.id),
        columns: { type: true },
      });

      const personLinks = await drizzleDb.query.placePersonLinks.findMany({
        where: eq(drizzleSchema.placePersonLinks.placeId, place.id),
      });

      // Skip empty places unless includeEmpty is true
      if (!options.includeEmpty && events.length === 0 && personLinks.length === 0) {
        continue;
      }

      const eventTypes = [...new Set(events.map((e) => e.type))];
      const timeRange = await calculateTimeRange(place.id);

      markers.push({
        id: place.id,
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        placeType: place.placeType,
        description: place.description,
        personCount: personLinks.length,
        eventCount: events.length,
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
}

/**
 * Get all places associated with a specific person for map visualization
 * @param personId - ID of the person to get locations for
 * @returns Object containing person markers and person details
 */
export async function getPersonLocationsData(
  personId: string
): Promise<{
  markers: PersonLocationMarker[];
  total: number;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  };
}> {
  const person = await drizzleDb.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, personId),
  });

  if (!person) {
    throw new Error("Person not found");
  }

  // Get places from person-place links
  const personPlaceLinks = await drizzleDb.query.placePersonLinks.findMany({
    where: eq(drizzleSchema.placePersonLinks.personId, personId),
    with: {
      place: {
        with: {
          events: {
            where: eq(drizzleSchema.events.personId, personId),
          },
        },
      },
    },
  });

  // Get places from events
  const eventPlaces = await drizzleDb.query.events.findMany({
    where: eq(drizzleSchema.events.personId, personId),
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

  personPlaceLinks.forEach((link: typeof personPlaceLinks[0]) => {
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

  // Get place details for event places
  const eventPlaceIds = eventPlaces.map((e) => e.placeId).filter((id): id is string => id !== null);
  const eventPlacesDetails = eventPlaceIds.length > 0
    ? await drizzleDb.query.places.findMany({
        where: inArray(drizzleSchema.places.id, eventPlaceIds),
      })
    : [];

  const eventPlacesMap = new Map(eventPlacesDetails.map((p) => [p.id, p]));

  eventPlaces.forEach((event: typeof eventPlaces[0]) => {
    if (event.placeId) {
      const eventPlace = eventPlacesMap.get(event.placeId);
      if (
        eventPlace &&
        eventPlace.latitude &&
        eventPlace.longitude
      ) {
        if (!placeMap.has(eventPlace.id)) {
          placeMap.set(eventPlace.id, {
            id: eventPlace.id,
            name: eventPlace.name,
            placeType: eventPlace.placeType,
            latitude: eventPlace.latitude,
            longitude: eventPlace.longitude,
            description: eventPlace.description,
            fromYear: event.date ? event.date.getFullYear() : null,
            toYear: null,
            type: event.type,
          });
        }
      }
    }
  });

  const markers: PersonLocationMarker[] = [];

  for (const place of placeMap.values()) {
    try {
      // Get all people at this place (for clustering)
      const peopleAtPlace = await drizzleDb.query.placePersonLinks.findMany({
        where: eq(drizzleSchema.placePersonLinks.placeId, place.id),
        with: {
          person: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
        },
      });

      const events = await drizzleDb.query.events.findMany({
        where: eq(drizzleSchema.events.placeId, place.id),
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
}

/**
 * Get all places in the family tree for map visualization
 * @returns Object containing family location markers and family stats
 */
export async function getFamilyLocationsData(): Promise<{
  markers: FamilyLocationMarker[];
  total: number;
  familySize: number;
}> {
  // Get all persons in the family
  const persons = await drizzleDb.query.persons.findMany({
    columns: { id: true },
  });

  const personIds = persons.map((p) => p.id);

  // Get all places with coordinates linked to family members - use simpler approach
  const allPlaces = await drizzleDb.query.places.findMany({
    where: and(
      sql`"Place"."latitude" IS NOT NULL AND "Place"."longitude" IS NOT NULL`
    ),
    orderBy: asc(drizzleSchema.places.name),
  });

  // Filter to places that have family members
  const placesWithFamily: typeof allPlaces = [];

  for (const place of allPlaces) {
    const hasPersonLink = await drizzleDb.query.placePersonLinks.findFirst({
      where: and(
        eq(drizzleSchema.placePersonLinks.placeId, place.id),
        inArray(drizzleSchema.placePersonLinks.personId, personIds)
      ),
    });

    const hasEvent = await drizzleDb.query.events.findFirst({
      where: and(
        eq(drizzleSchema.events.placeId, place.id),
        inArray(drizzleSchema.events.personId, personIds)
      ),
    });

    if (hasPersonLink || hasEvent) {
      placesWithFamily.push(place);
    }
  }

  const places = placesWithFamily;

  const markers: FamilyLocationMarker[] = [];

  for (const place of places) {
    try {
      // Skip places without coordinates
      if (!place.latitude || !place.longitude) continue;

      // Get place-person links for this place
      const personLinks = await drizzleDb.query.placePersonLinks.findMany({
        where: eq(drizzleSchema.placePersonLinks.placeId, place.id),
        with: {
          person: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
        },
      });

      // Get events for this place
      const events = await drizzleDb.query.events.findMany({
        where: eq(drizzleSchema.events.placeId, place.id),
        with: {
          person: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

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

      personLinks.forEach((link: typeof personLinks[0]) => {
        uniquePeople.set(link.personId, {
          id: link.person.id,
          firstName: link.person.firstName,
          lastName: link.person.lastName,
          photoUrl: link.person.photoUrl,
        });
      });

      events.forEach((event: typeof events[0]) => {
        uniquePeople.set(event.personId, {
          id: event.person.id,
          firstName: event.person.firstName,
          lastName: event.person.lastName,
          photoUrl: null,
        });
      });

      // Get event details with years
      const eventDetails = events.map((event: typeof events[0]) => ({
        type: event.type,
        year: event.date ? event.date.getFullYear() : null,
      }));

      const eventTypes = [...new Set(events.map((e: typeof events[0]) => e.type))];
      const timeRange = await calculateTimeRange(place.id);

      markers.push({
        id: place.id,
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        placeType: place.placeType,
        description: place.description,
        personCount: uniquePeople.size,
        eventCount: events.length,
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
}

/**
 * Options for querying places by time range
 */
export interface GetPlacesByTimeRangeOptions {
  startYear: number;
  endYear: number;
}

/**
 * Get places filtered by date range for timeline visualization
 * @param options - Query options (startYear and endYear)
 * @returns Object containing timeline markers and time range info
 */
export async function getPlacesByTimeRangeData(
  options: GetPlacesByTimeRangeOptions
): Promise<{
  markers: TimelineMarker[];
  total: number;
  timeRange: {
    startYear: number;
    endYear: number;
  };
}> {
  const { startYear, endYear } = options;
  const startDate = new Date(`${startYear}-01-01`);
  const endDate = new Date(`${endYear}-12-31`);

  // Get all places with coordinates
  const allPlaces = await drizzleDb.query.places.findMany({
    where: sql`"Place"."latitude" IS NOT NULL AND "Place"."longitude" IS NOT NULL`,
  });

  // Filter places that have events in the time range
  const places: typeof allPlaces = [];
  for (const place of allPlaces) {
    const eventsInRange = await drizzleDb.query.events.findMany({
      where: and(
        eq(drizzleSchema.events.placeId, place.id),
        gte(drizzleSchema.events.date, startDate),
        lte(drizzleSchema.events.date, endDate)
      ),
      with: {
        person: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const personLinksInRange = await drizzleDb.query.placePersonLinks.findMany({
      where: eq(drizzleSchema.placePersonLinks.placeId, place.id),
      with: {
        person: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (eventsInRange.length > 0 || personLinksInRange.some((link) => {
      const linkStart = link.fromYear || startYear;
      const linkEnd = link.toYear || endYear;
      return linkStart <= endYear && linkEnd >= startYear;
    })) {
      places.push(place);
    }
  }

  const timelineMarkers: TimelineMarker[] = [];

  for (const place of places) {
    // Skip places without coordinates (shouldn't happen due to WHERE clause)
    if (!place.latitude || !place.longitude) continue;

    // Get events in the time range
    const eventsInRange = await drizzleDb.query.events.findMany({
      where: and(
        eq(drizzleSchema.events.placeId, place.id),
        gte(drizzleSchema.events.date, startDate),
        lte(drizzleSchema.events.date, endDate)
      ),
    });

    // Get person links for this place
    const personLinks = await drizzleDb.query.placePersonLinks.findMany({
      where: eq(drizzleSchema.placePersonLinks.placeId, place.id),
    });

    // Create markers for each event in the time range
    for (const event of eventsInRange) {
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
    for (const link of personLinks) {
      const linkStart = link.fromYear || startYear;
      const linkEnd = link.toYear || endYear;

      if (linkStart <= endYear && linkEnd >= startYear) {
        // Generate a marker for the start of the link (or earliest year in range)
        const markerYear = Math.max(linkStart, startYear);
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
      startYear,
      endYear,
    },
  };
}

/**
 * Options for querying place clusters
 */
export interface GetPlaceClusterOptions {
  bounds: ClusterBound;
  clusterSize: number;
}

/**
 * Get clustered places by geographic bounds for efficient map rendering
 * @param options - Query options (bounds and clusterSize)
 * @returns Object containing place clusters with stats
 */
export async function getPlaceClustersData(
  options: GetPlaceClusterOptions
): Promise<{
  clusters: PlaceCluster[];
  totalClusters: number;
  totalPlaces: number;
}> {
  const { bounds, clusterSize } = options;

  // Get all places within the bounds
  const places = await drizzleDb.query.places.findMany({
    where: and(
      gte(drizzleSchema.places.latitude, bounds.minLat),
      lte(drizzleSchema.places.latitude, bounds.maxLat),
      gte(drizzleSchema.places.longitude, bounds.minLng),
      lte(drizzleSchema.places.longitude, bounds.maxLng)
    ),
  });

  // Format places as markers
  const markers: MapMarker[] = [];
  for (const place of places) {
    try {
      // Skip places without coordinates
      if (!place.latitude || !place.longitude) continue;

      // Check if place has events or person links
      const eventCount = await drizzleDb
        .select({ count: count() })
        .from(drizzleSchema.events)
        .where(eq(drizzleSchema.events.placeId, place.id));

      const personLinkCount = await drizzleDb
        .select({ count: count() })
        .from(drizzleSchema.placePersonLinks)
        .where(eq(drizzleSchema.placePersonLinks.placeId, place.id));

      if ((eventCount[0]?.count ?? 0) === 0 && (personLinkCount[0]?.count ?? 0) === 0) {
        continue; // Skip places without events or person links
      }

      // Get event types for this place
      const events = await drizzleDb.query.events.findMany({
        where: eq(drizzleSchema.events.placeId, place.id),
        columns: { type: true },
      });

      const eventTypes = [...new Set(events.map((e) => e.type))];
      const timeRange = await calculateTimeRange(place.id);

      markers.push({
        id: place.id,
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        placeType: place.placeType,
        description: place.description,
        personCount: personLinkCount[0]?.count ?? 0,
        eventCount: eventCount[0]?.count ?? 0,
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
      calculateDistance(marker, currentCluster[0]) < 50000
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
}
