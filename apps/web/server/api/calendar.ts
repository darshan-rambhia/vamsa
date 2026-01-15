import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "@vamsa/schemas";
import { prisma } from "../../src/server/db";
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
    const calendarToken = await prisma.calendarToken.findUnique({
      where: { token },
    });
    if (
      !calendarToken ||
      !calendarToken.isActive ||
      calendarToken.expiresAt < new Date()
    ) {
      return c.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update last used timestamp
    await prisma.calendarToken.update({
      where: { id: calendarToken.id },
      data: { lastUsedAt: new Date() },
    });

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

    const recentUpdates = await prisma.auditLog.findMany({
      where: {
        action: { in: ["CREATE", "UPDATE"] },
        entityType: { in: ["Person", "Event", "MediaObject"] },
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    for (const update of recentUpdates) {
      let title = "";
      let description = "";
      let url = "";
      let guid = "";

      if (update.entityType === "Person") {
        const person = update.newData as any;
        title = `${update.action === "CREATE" ? "New person added" : "Person updated"}: ${person.firstName} ${person.lastName}`;
        description =
          person.bio ||
          `${person.firstName} ${person.lastName} was ${update.action === "CREATE" ? "added to" : "updated in"} the family tree`;
        url = `${appUrl}/people/${update.entityId}`;
        guid = `person-${update.entityId}-${update.createdAt.getTime()}`;
      } else if (update.entityType === "Event") {
        const event = update.newData as any;
        title = `New event: ${event.type}`;
        description =
          event.description ||
          `${event.type} event on ${new Date(event.date).toLocaleDateString()}`;
        url = `${appUrl}/events/${update.entityId}`;
        guid = `event-${update.entityId}-${update.createdAt.getTime()}`;
      } else if (update.entityType === "MediaObject") {
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
          author: update.user.name || update.user.email,
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
      const calendarToken = await prisma.calendarToken.findUnique({
        where: { token },
      });
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

    const people = await prisma.person.findMany({
      where: { dateOfBirth: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        isLiving: true,
      },
      orderBy: { firstName: "asc" },
    });

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
      const calendarToken = await prisma.calendarToken.findUnique({
        where: { token },
      });
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

    const marriages = await prisma.relationship.findMany({
      where: {
        type: "SPOUSE",
        marriageDate: { not: null },
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        relatedPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { marriageDate: "asc" },
    });

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

    const deceased = await prisma.person.findMany({
      where: { dateOfPassing: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfPassing: true,
      },
      orderBy: { dateOfPassing: "asc" },
    });

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
      const calendarToken = await prisma.calendarToken.findUnique({
        where: { token },
      });
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

    const events = await prisma.event.findMany({
      where: { date: { not: null } },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

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
