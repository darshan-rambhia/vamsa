/**
 * Calendar Feeds Business Logic
 *
 * This module contains pure business logic for generating calendar feeds
 * (RSS, iCalendar) from family tree data. Uses dependency injection for
 * database access to enable easy testing.
 *
 * Exported Functions:
 * - validateCalendarToken: Validate token and update last used timestamp
 * - generateRSSFeedData: Generate RSS feed XML with recent family updates
 * - generateBirthdayCalendarData: Generate iCal with family birthdays
 * - generateAnniversaryCalendarData: Generate iCal with anniversaries/memorials
 * - generateEventsCalendarData: Generate iCal with all family events
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import ical, { ICalEventRepeatingFreq } from "ical-generator";
// @ts-expect-error - rss package lacks type declarations
import RSS from "rss";
import { loggers } from "@vamsa/lib/logger";
import type { ICalCalendar } from "ical-generator";

const log = loggers.db;

/**
 * Type for the database client used by calendar feed functions.
 */
export type CalendarFeedDb = typeof drizzleDb;

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  tokenRecord?: {
    id: string;
    token: string;
    userId: string;
    isActive: boolean;
    expiresAt: Date;
  };
  error?: string;
}

/**
 * Validate a calendar token and update its last used timestamp
 *
 * @param token - The token string to validate
 * @param db - Drizzle database instance (defaults to drizzleDb)
 * @returns Validation result with token record if valid
 */
export async function validateCalendarToken(
  token: string,
  db: CalendarFeedDb = drizzleDb
): Promise<TokenValidationResult> {
  try {
    const [calendarToken] = await db
      .select()
      .from(drizzleSchema.calendarTokens)
      .where(eq(drizzleSchema.calendarTokens.token, token))
      .limit(1);

    if (!calendarToken) {
      return { valid: false, error: "Token not found" };
    }

    if (!calendarToken.isActive) {
      return { valid: false, error: "Token is inactive" };
    }

    if (calendarToken.expiresAt < new Date()) {
      return { valid: false, error: "Token has expired" };
    }

    // Update last used timestamp
    await db
      .update(drizzleSchema.calendarTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(drizzleSchema.calendarTokens.id, calendarToken.id));

    return {
      valid: true,
      tokenRecord: {
        id: calendarToken.id,
        token: calendarToken.token,
        userId: calendarToken.userId,
        isActive: calendarToken.isActive,
        expiresAt: calendarToken.expiresAt,
      },
    };
  } catch (error) {
    log.withErr(error).msg("Failed to validate calendar token");
    return { valid: false, error: "Validation failed" };
  }
}

/**
 * RSS feed item data
 */
interface RSSFeedItem {
  title: string;
  description: string;
  url: string;
  guid: string;
  date: Date;
  author: string;
}

/**
 * Generate RSS feed data with recent family updates
 *
 * Fetches recent audit log entries for persons, events, and media,
 * and generates an RSS XML feed.
 *
 * @param token - Calendar token for authentication
 * @param appUrl - Base application URL for links
 * @param db - Drizzle database instance (defaults to drizzleDb)
 * @returns RSS XML string
 * @throws Error if token is invalid
 */
export async function generateRSSFeedData(
  token: string,
  appUrl: string,
  db: CalendarFeedDb = drizzleDb
): Promise<string> {
  // Validate token
  const validation = await validateCalendarToken(token, db);
  if (!validation.valid) {
    throw new Error(validation.error || "Unauthorized");
  }

  const feed = new RSS({
    title: "Vamsa Family Updates",
    description: "Latest updates from your family tree",
    feed_url: `${appUrl}/api/v1/calendar/rss.xml?token=${token}`,
    site_url: appUrl,
    image_url: `${appUrl}/logo.png`,
    language: "en",
    pubDate: new Date(),
    ttl: 60,
  });

  const recentUpdates = await db
    .select({
      entityType: drizzleSchema.auditLogs.entityType,
      entityId: drizzleSchema.auditLogs.entityId,
      action: drizzleSchema.auditLogs.action,
      newData: drizzleSchema.auditLogs.newData,
      createdAt: drizzleSchema.auditLogs.createdAt,
      user: {
        name: drizzleSchema.users.name,
        email: drizzleSchema.users.email,
      },
    })
    .from(drizzleSchema.auditLogs)
    .leftJoin(
      drizzleSchema.users,
      eq(drizzleSchema.auditLogs.userId, drizzleSchema.users.id)
    )
    .where(
      and(
        inArray(drizzleSchema.auditLogs.action, ["CREATE", "UPDATE"]),
        inArray(drizzleSchema.auditLogs.entityType, [
          "Person",
          "Event",
          "MediaObject",
        ])
      )
    )
    .orderBy(drizzleSchema.auditLogs.createdAt)
    .limit(50);

  for (const update of recentUpdates) {
    const item = buildRSSItemFromUpdate(update, appUrl);
    if (item) {
      feed.item(item);
    }
  }

  return feed.xml({ indent: true });
}

/**
 * Build an RSS item from an audit log update
 */
function buildRSSItemFromUpdate(
  update: {
    entityType: string;
    entityId: string | null;
    action: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newData: any;
    createdAt: Date;
    user: { name: string | null; email: string } | null;
  },
  appUrl: string
): RSSFeedItem | null {
  // Skip entries without entity ID
  if (!update.entityId) {
    return null;
  }
  let title = "";
  let description = "";
  let url = "";
  let guid = "";

  if (update.entityType === "Person") {
    const person = update.newData as {
      firstName?: string;
      lastName?: string;
      bio?: string;
    };
    title = `${update.action === "CREATE" ? "New person added" : "Person updated"}: ${person.firstName || ""} ${person.lastName || ""}`;
    description =
      person.bio ||
      `${person.firstName || ""} ${person.lastName || ""} was ${update.action === "CREATE" ? "added to" : "updated in"} the family tree`;
    url = `${appUrl}/people/${update.entityId}`;
    guid = `person-${update.entityId}-${update.createdAt.getTime()}`;
  } else if (update.entityType === "Event") {
    const event = update.newData as {
      type?: string;
      description?: string;
      date?: string;
    };
    title = `New event: ${event.type || "Unknown"}`;
    description =
      event.description ||
      `${event.type || "Event"} event${event.date ? ` on ${new Date(event.date).toLocaleDateString()}` : ""}`;
    url = `${appUrl}/events/${update.entityId}`;
    guid = `event-${update.entityId}-${update.createdAt.getTime()}`;
  } else if (update.entityType === "MediaObject") {
    const media = update.newData as {
      title?: string;
      description?: string;
      mimeType?: string;
    };
    title = `New media uploaded: ${media.title || "Untitled"}`;
    description =
      media.description || `A new ${media.mimeType || "media"} file was added`;
    url = `${appUrl}/media/${update.entityId}`;
    guid = `media-${update.entityId}-${update.createdAt.getTime()}`;
  }

  if (!title || !description || !url) {
    return null;
  }

  return {
    title,
    description,
    url,
    guid,
    date: update.createdAt,
    author: update.user?.name || update.user?.email || "Unknown",
  };
}

/**
 * Person with birthday data
 */
interface PersonBirthday {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  isLiving: boolean;
}

/**
 * Generate birthday calendar data in iCalendar format
 *
 * Creates an iCal calendar with yearly recurring birthday events
 * for all family members with known birth dates.
 *
 * @param appUrl - Base application URL for links
 * @param db - Drizzle database instance (defaults to drizzleDb)
 * @returns iCalendar (.ics) format string
 */
export async function generateBirthdayCalendarData(
  appUrl: string,
  db: CalendarFeedDb = drizzleDb
): Promise<string> {
  const calendar = ical({
    name: "Family Birthdays",
    description: "Birthdays of all family members",
    timezone: "America/New_York",
    url: `${appUrl}/api/v1/calendar/birthdays.ics`,
  });

  const people = await db
    .select({
      id: drizzleSchema.persons.id,
      firstName: drizzleSchema.persons.firstName,
      lastName: drizzleSchema.persons.lastName,
      dateOfBirth: drizzleSchema.persons.dateOfBirth,
      isLiving: drizzleSchema.persons.isLiving,
    })
    .from(drizzleSchema.persons)
    .where(isNotNull(drizzleSchema.persons.dateOfBirth))
    .orderBy(drizzleSchema.persons.firstName);

  const currentYear = new Date().getFullYear();

  for (const person of people) {
    if (!person.dateOfBirth) continue;
    addBirthdayEvent(calendar, person as PersonBirthday, appUrl, currentYear);
  }

  return calendar.toString();
}

/**
 * Add a birthday event to the calendar
 */
function addBirthdayEvent(
  calendar: ICalCalendar,
  person: PersonBirthday,
  appUrl: string,
  currentYear: number
): void {
  const birthMonth = person.dateOfBirth.getMonth();
  const birthDay = person.dateOfBirth.getDate();
  const birthYear = person.dateOfBirth.getFullYear();
  const age = currentYear - birthYear;

  try {
    calendar.createEvent({
      id: `birthday-${person.id}@${appUrl}`,
      summary: `${person.firstName} ${person.lastName}'s Birthday${person.isLiving ? ` (${age})` : " (Deceased)"}`,
      start: new Date(currentYear, birthMonth, birthDay),
      end: new Date(currentYear, birthMonth, birthDay + 1),
      allDay: true,
      repeating: {
        freq: ICalEventRepeatingFreq.YEARLY,
      },
      url: `${appUrl}/people/${person.id}`,
      organizer: {
        name: "Vamsa Family Tree",
        email: "noreply@vamsa.app",
      },
      categories: [{ name: "Birthday" }],
      description: `${person.firstName} ${person.lastName}${person.isLiving ? `'s birthday. Currently ${age} years old.` : " (Deceased)."}`,
    });
  } catch (error) {
    log.info({ error, personId: person.id }, "Failed to create birthday event");
  }
}

/**
 * Marriage data for anniversary events
 */
interface MarriageData {
  id: string;
  marriageDate: Date;
  person: { id: string; firstName: string; lastName: string };
  relatedPerson: { id: string; firstName: string; lastName: string };
}

/**
 * Deceased person data for memorial events
 */
interface DeceasedPerson {
  id: string;
  firstName: string;
  lastName: string;
  dateOfPassing: Date;
}

/**
 * Generate anniversary and memorial calendar data in iCalendar format
 *
 * Creates an iCal calendar with yearly recurring events for
 * wedding anniversaries and memorial dates.
 *
 * @param appUrl - Base application URL for links
 * @param db - Drizzle database instance (defaults to drizzleDb)
 * @returns iCalendar (.ics) format string
 */
export async function generateAnniversaryCalendarData(
  appUrl: string,
  db: CalendarFeedDb = drizzleDb
): Promise<string> {
  const calendar = ical({
    name: "Family Anniversaries",
    description: "Wedding anniversaries and memorial dates of family members",
    timezone: "America/New_York",
    url: `${appUrl}/api/v1/calendar/anniversaries.ics`,
  });

  const currentYear = new Date().getFullYear();

  // Fetch marriages with spouse relationships
  const person = drizzleSchema.persons;
  const relatedPerson = drizzleSchema.persons;

  const marriages = await db
    .select({
      id: drizzleSchema.relationships.id,
      marriageDate: drizzleSchema.relationships.marriageDate,
      person: {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
      },
      relatedPerson: {
        id: relatedPerson.id,
        firstName: relatedPerson.firstName,
        lastName: relatedPerson.lastName,
      },
    })
    .from(drizzleSchema.relationships)
    .innerJoin(person, eq(drizzleSchema.relationships.personId, person.id))
    .innerJoin(
      relatedPerson,
      eq(drizzleSchema.relationships.relatedPersonId, relatedPerson.id)
    )
    .where(
      and(
        eq(drizzleSchema.relationships.type, "SPOUSE"),
        isNotNull(drizzleSchema.relationships.marriageDate)
      )
    )
    .orderBy(drizzleSchema.relationships.marriageDate);

  for (const marriage of marriages) {
    if (!marriage.marriageDate) continue;
    addAnniversaryEvent(
      calendar,
      marriage as MarriageData,
      appUrl,
      currentYear
    );
  }

  // Fetch deceased persons for memorial dates
  const deceased = await db
    .select({
      id: drizzleSchema.persons.id,
      firstName: drizzleSchema.persons.firstName,
      lastName: drizzleSchema.persons.lastName,
      dateOfPassing: drizzleSchema.persons.dateOfPassing,
    })
    .from(drizzleSchema.persons)
    .where(isNotNull(drizzleSchema.persons.dateOfPassing))
    .orderBy(drizzleSchema.persons.dateOfPassing);

  for (const person of deceased) {
    if (!person.dateOfPassing) continue;
    addMemorialEvent(calendar, person as DeceasedPerson, appUrl, currentYear);
  }

  return calendar.toString();
}

/**
 * Add an anniversary event to the calendar
 */
function addAnniversaryEvent(
  calendar: ICalCalendar,
  marriage: MarriageData,
  appUrl: string,
  currentYear: number
): void {
  const marriageYear = marriage.marriageDate.getFullYear();
  const yearsMarried = currentYear - marriageYear;
  const marriageMonth = marriage.marriageDate.getMonth();
  const marriageDay = marriage.marriageDate.getDate();

  try {
    calendar.createEvent({
      id: `anniversary-${marriage.id}@${appUrl}`,
      summary: `${marriage.person.firstName} & ${marriage.relatedPerson.firstName} Anniversary (${yearsMarried} years)`,
      start: new Date(currentYear, marriageMonth, marriageDay),
      end: new Date(currentYear, marriageMonth, marriageDay + 1),
      allDay: true,
      repeating: {
        freq: ICalEventRepeatingFreq.YEARLY,
      },
      url: `${appUrl}/people/${marriage.person.id}`,
      organizer: {
        name: "Vamsa Family Tree",
        email: "noreply@vamsa.app",
      },
      categories: [{ name: "Anniversary" }],
      description: `${marriage.person.firstName} ${marriage.person.lastName} and ${marriage.relatedPerson.firstName} ${marriage.relatedPerson.lastName}'s wedding anniversary. ${yearsMarried} years together.`,
    });
  } catch (error) {
    log.info(
      { error, marriageId: marriage.id },
      "Failed to create anniversary event"
    );
  }
}

/**
 * Add a memorial event to the calendar
 */
function addMemorialEvent(
  calendar: ICalCalendar,
  person: DeceasedPerson,
  appUrl: string,
  currentYear: number
): void {
  const deathYear = person.dateOfPassing.getFullYear();
  const yearsSince = currentYear - deathYear;
  const deathMonth = person.dateOfPassing.getMonth();
  const deathDay = person.dateOfPassing.getDate();

  try {
    calendar.createEvent({
      id: `memorial-${person.id}@${appUrl}`,
      summary: `Memorial: ${person.firstName} ${person.lastName} (${yearsSince} years)`,
      start: new Date(currentYear, deathMonth, deathDay),
      end: new Date(currentYear, deathMonth, deathDay + 1),
      allDay: true,
      repeating: {
        freq: ICalEventRepeatingFreq.YEARLY,
      },
      url: `${appUrl}/people/${person.id}`,
      organizer: {
        name: "Vamsa Family Tree",
        email: "noreply@vamsa.app",
      },
      categories: [{ name: "Memorial" }],
      description: `Memorial date for ${person.firstName} ${person.lastName}. ${yearsSince} years since passing.`,
    });
  } catch (error) {
    log.info({ error, personId: person.id }, "Failed to create memorial event");
  }
}

/**
 * Event data for the events calendar
 */
interface FamilyEvent {
  id: string;
  type: string;
  date: Date;
  description: string | null;
  place: string | null;
  person: { id: string; firstName: string; lastName: string };
}

/**
 * Generate family events calendar data in iCalendar format
 *
 * Creates an iCal calendar with all family events including
 * births, deaths, marriages, and other life events.
 *
 * @param appUrl - Base application URL for links
 * @param db - Drizzle database instance (defaults to drizzleDb)
 * @returns iCalendar (.ics) format string
 */
export async function generateEventsCalendarData(
  appUrl: string,
  db: CalendarFeedDb = drizzleDb
): Promise<string> {
  const calendar = ical({
    name: "Family Events",
    description: "Family events including births, deaths, marriages, etc.",
    timezone: "America/New_York",
    url: `${appUrl}/api/v1/calendar/events.ics`,
  });

  const events = await db
    .select({
      id: drizzleSchema.events.id,
      type: drizzleSchema.events.type,
      date: drizzleSchema.events.date,
      description: drizzleSchema.events.description,
      place: drizzleSchema.events.place,
      person: {
        id: drizzleSchema.persons.id,
        firstName: drizzleSchema.persons.firstName,
        lastName: drizzleSchema.persons.lastName,
      },
    })
    .from(drizzleSchema.events)
    .innerJoin(
      drizzleSchema.persons,
      eq(drizzleSchema.events.personId, drizzleSchema.persons.id)
    )
    .where(isNotNull(drizzleSchema.events.date))
    .orderBy(drizzleSchema.events.date);

  for (const event of events) {
    if (!event.date) continue;
    addFamilyEvent(calendar, event as FamilyEvent, appUrl);
  }

  return calendar.toString();
}

/**
 * Add a family event to the calendar
 */
function addFamilyEvent(
  calendar: ICalCalendar,
  event: FamilyEvent,
  appUrl: string
): void {
  const eventDate = new Date(event.date);
  const eventTitle = `${event.type}: ${event.person.firstName} ${event.person.lastName}`;

  try {
    calendar.createEvent({
      id: `event-${event.id}@${appUrl}`,
      summary: eventTitle,
      description:
        event.description ||
        `${event.type} event${event.place ? ` at ${event.place}` : ""}`,
      start: eventDate,
      end: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
      allDay: true,
      url: `${appUrl}/people/${event.person.id}`,
      location: event.place ?? undefined,
      organizer: {
        name: "Vamsa Family Tree",
        email: "noreply@vamsa.app",
      },
      categories: [{ name: "Event" }, { name: event.type }],
    });
  } catch (error) {
    log.info({ error, eventId: event.id }, "Failed to create event");
  }
}
