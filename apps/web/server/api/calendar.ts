import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "@vamsa/schemas";
import { drizzleDb, drizzleSchema } from "@vamsa/lib/server";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
import { logger } from "@vamsa/lib/logger";
import ical, { ICalEventRepeatingFreq } from "ical-generator";
import RSS from "rss";

const calendarRouter = new OpenAPIHono();

/**
 * GET /api/v1/calendar/rss.xml
 * RSS feed with recent family updates
 */
const rssRoute = createRoute({
  method: "get",
  path: "/rss.xml",
  tags: ["Calendar"],
  summary: "Get family updates RSS feed",
  description:
    "RSS feed with recent family updates including new persons and events. Requires a valid calendar token for authentication.",
  operationId: "getRSSFeed",
  request: {
    query: z
      .object({
        token: z.string().openapi({
          description: "Calendar token for authentication (required)",
          example: "token_abc123",
        }),
      })
      .openapi({
        description: "Query parameters for RSS feed",
      }),
  },
  responses: {
    200: {
      description: "RSS feed generated successfully",
      content: {
        "application/rss+xml": {
          schema: z.string().openapi({
            description: "RSS XML content",
          }),
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or expired token",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

calendarRouter.openapi(rssRoute, async (c) => {
  try {
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const { token } = c.req.valid("query");

    // Validate token - required for RSS feed access
    const [calendarToken] = await drizzleDb
      .select()
      .from(drizzleSchema.calendarTokens)
      .where(eq(drizzleSchema.calendarTokens.token, token))
      .limit(1);
    if (
      !calendarToken ||
      !calendarToken.isActive ||
      calendarToken.expiresAt < new Date()
    ) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update last used timestamp
    await drizzleDb
      .update(drizzleSchema.calendarTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(drizzleSchema.calendarTokens.id, calendarToken.id));

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

    const recentUpdates = await drizzleDb
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
      let title = "";
      let description = "";
      let url = "";
      let guid = "";

      if (update.entityType === "Person") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const person = update.newData as any;
        title = `${update.action === "CREATE" ? "New person added" : "Person updated"}: ${person.firstName} ${person.lastName}`;
        description =
          person.bio ||
          `${person.firstName} ${person.lastName} was ${update.action === "CREATE" ? "added to" : "updated in"} the family tree`;
        url = `${appUrl}/people/${update.entityId}`;
        guid = `person-${update.entityId}-${update.createdAt.getTime()}`;
      } else if (update.entityType === "Event") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event = update.newData as any;
        title = `New event: ${event.type}`;
        description =
          event.description ||
          `${event.type} event on ${new Date(event.date).toLocaleDateString()}`;
        url = `${appUrl}/events/${update.entityId}`;
        guid = `event-${update.entityId}-${update.createdAt.getTime()}`;
      } else if (update.entityType === "MediaObject") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const media = update.newData as any;
        title = `New media uploaded: ${media.title || "Untitled"}`;
        description =
          media.description ||
          `A new ${media.mimeType || "media"} file was added`;
        url = `${appUrl}/media/${update.entityId}`;
        guid = `media-${update.entityId}-${update.createdAt.getTime()}`;
      }

      if (title && description && url) {
        feed.item({
          title,
          description,
          url,
          guid,
          date: update.createdAt,
          author: update.user?.name || update.user?.email || "Unknown",
        });
      }
    }

    const xml = feed.xml({ indent: true });

    return c.text(xml, 200, {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    });
  } catch (error) {
    logger.error({ error }, "Failed to generate RSS feed");
    return c.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

/**
 * GET /api/v1/calendar/birthdays.ics
 * Birthday calendar in iCalendar format
 */
const birthdaysRoute = createRoute({
  method: "get",
  path: "/birthdays.ics",
  tags: ["Calendar"],
  summary: "Get birthday calendar",
  description: "iCalendar format with family member birthdays",
  operationId: "getBirthdayCalendar",
  request: {
    query: z
      .object({
        token: z.string().optional().openapi({
          description: "Optional calendar token for validation",
          example: "token_123",
        }),
      })
      .openapi({
        description: "Query parameters for calendar endpoint",
      }),
  },
  responses: {
    200: {
      description: "Birthday calendar generated successfully",
      content: {
        "text/calendar": {
          schema: z.string().openapi({
            description: "iCalendar (.ics) format content",
          }),
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or expired token",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

calendarRouter.openapi(birthdaysRoute, async (c) => {
  try {
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const { token } = c.req.valid("query");

    if (token) {
      const [calendarToken] = await drizzleDb
        .select()
        .from(drizzleSchema.calendarTokens)
        .where(eq(drizzleSchema.calendarTokens.token, token))
        .limit(1);
      if (
        !calendarToken ||
        !calendarToken.isActive ||
        calendarToken.expiresAt < new Date()
      ) {
        return c.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const calendar = ical({
      name: "Family Birthdays",
      description: "Birthdays of all family members",
      timezone: "America/New_York",
      url: `${appUrl}/api/v1/calendar/birthdays.ics`,
    });

    const people = await drizzleDb
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
        logger.warn(
          { error },
          `Failed to create birthday event for ${person.id}`
        );
      }
    }

    const icsContent = calendar.toString();

    return c.text(icsContent, 200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition":
        "inline; filename=birthdays.ics; filename*=UTF-8''birthdays.ics",
      "Cache-Control": "public, max-age=3600",
    });
  } catch (error) {
    logger.error({ error }, "Failed to generate birthday calendar");
    return c.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

/**
 * GET /api/v1/calendar/anniversaries.ics
 * Anniversary calendar in iCalendar format
 */
const anniversariesRoute = createRoute({
  method: "get",
  path: "/anniversaries.ics",
  tags: ["Calendar"],
  summary: "Get anniversary calendar",
  description: "iCalendar format with wedding and memorial dates",
  operationId: "getAnniversaryCalendar",
  request: {
    query: z
      .object({
        token: z.string().optional().openapi({
          description: "Optional calendar token for validation",
          example: "token_123",
        }),
      })
      .openapi({
        description: "Query parameters for calendar endpoint",
      }),
  },
  responses: {
    200: {
      description: "Anniversary calendar generated successfully",
      content: {
        "text/calendar": {
          schema: z.string().openapi({
            description: "iCalendar (.ics) format content",
          }),
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or expired token",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

calendarRouter.openapi(anniversariesRoute, async (c) => {
  try {
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const { token } = c.req.valid("query");

    if (token) {
      const [calendarToken] = await drizzleDb
        .select()
        .from(drizzleSchema.calendarTokens)
        .where(eq(drizzleSchema.calendarTokens.token, token))
        .limit(1);
      if (
        !calendarToken ||
        !calendarToken.isActive ||
        calendarToken.expiresAt < new Date()
      ) {
        return c.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const calendar = ical({
      name: "Family Anniversaries",
      description: "Wedding anniversaries and memorial dates of family members",
      timezone: "America/New_York",
      url: `${appUrl}/api/v1/calendar/anniversaries.ics`,
    });

    const currentYear = new Date().getFullYear();

    // Alias tables for self-join
    const person = drizzleSchema.persons;
    const relatedPerson = drizzleSchema.persons;

    const marriages = await drizzleDb
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
        logger.warn(
          { error },
          `Failed to create anniversary event for ${marriage.id}`
        );
      }
    }

    const deceased = await drizzleDb
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
        logger.warn(
          { error },
          `Failed to create memorial event for ${person.id}`
        );
      }
    }

    const icsContent = calendar.toString();

    return c.text(icsContent, 200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition":
        "inline; filename=anniversaries.ics; filename*=UTF-8''anniversaries.ics",
      "Cache-Control": "public, max-age=3600",
    });
  } catch (error) {
    logger.error({ error }, "Failed to generate anniversaries calendar");
    return c.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

/**
 * GET /api/v1/calendar/events.ics
 * All family events calendar in iCalendar format
 */
const eventsRoute = createRoute({
  method: "get",
  path: "/events.ics",
  tags: ["Calendar"],
  summary: "Get family events calendar",
  description:
    "iCalendar format with births, deaths, marriages, and other events",
  operationId: "getEventsCalendar",
  request: {
    query: z
      .object({
        token: z.string().optional().openapi({
          description: "Optional calendar token for validation",
          example: "token_123",
        }),
      })
      .openapi({
        description: "Query parameters for calendar endpoint",
      }),
  },
  responses: {
    200: {
      description: "Events calendar generated successfully",
      content: {
        "text/calendar": {
          schema: z.string().openapi({
            description: "iCalendar (.ics) format content",
          }),
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or expired token",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: "Server error",
      content: {
        "application/json": {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

calendarRouter.openapi(eventsRoute, async (c) => {
  try {
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const { token } = c.req.valid("query");

    if (token) {
      const [calendarToken] = await drizzleDb
        .select()
        .from(drizzleSchema.calendarTokens)
        .where(eq(drizzleSchema.calendarTokens.token, token))
        .limit(1);
      if (
        !calendarToken ||
        !calendarToken.isActive ||
        calendarToken.expiresAt < new Date()
      ) {
        return c.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const calendar = ical({
      name: "Family Events",
      description: "Family events including births, deaths, marriages, etc.",
      timezone: "America/New_York",
      url: `${appUrl}/api/v1/calendar/events.ics`,
    });

    const events = await drizzleDb
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
          location: event.place,
          organizer: {
            name: "Vamsa Family Tree",
            email: "noreply@vamsa.app",
          },
          categories: [{ name: "Event" }, { name: event.type }],
        });
      } catch (error) {
        logger.warn({ error }, `Failed to create event for ${event.id}`);
      }
    }

    const icsContent = calendar.toString();

    return c.text(icsContent, 200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition":
        "inline; filename=events.ics; filename*=UTF-8''events.ics",
      "Cache-Control": "public, max-age=3600",
    });
  } catch (error) {
    logger.error({ error }, "Failed to generate events calendar");
    return c.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

export default calendarRouter;
