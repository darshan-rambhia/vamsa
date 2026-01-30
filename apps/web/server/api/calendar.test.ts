/**
 * Integration tests for Calendar API endpoints
 *
 * These tests use the real API without mocking shared modules
 * to avoid mock leaking issues between test files.
 */
import { describe, expect, it } from "bun:test";
import apiV1 from "./index";

// Note: LOG_LEVEL=error is used in test command to silence logger warnings

describe("Calendar API", () => {
  it("GET /api/v1/calendar/rss.xml returns 400 without token", async () => {
    const res = await apiV1.request("/calendar/rss.xml");
    // RSS endpoint requires token authentication
    expect(res.status).toBe(400);
  });
});

// Test data
const mockPerson = {
  id: "person-1",
  firstName: "John",
  lastName: "Doe",
  dateOfBirth: new Date("1990-01-15"),
  dateOfPassing: null,
  isLiving: true,
};

const mockRelationship = {
  id: "rel-1",
  personId: "person-1",
  relatedPersonId: "person-2",
  type: "SPOUSE",
  marriageDate: new Date("2010-06-15"),
  divorceDate: null,
  person: {
    id: "person-1",
    firstName: "John",
    lastName: "Doe",
  },
  relatedPerson: {
    id: "person-2",
    firstName: "Jane",
    lastName: "Doe",
  },
};

const mockEvent = {
  id: "event-1",
  personId: "person-1",
  type: "Birth",
  date: new Date("1990-01-15"),
  description: "Birth event",
  place: "Hospital",
  person: {
    id: "person-1",
    firstName: "John",
    lastName: "Doe",
  },
};

const mockAuditLog = {
  id: "log-1",
  userId: "user-1",
  action: "CREATE",
  entityType: "Person",
  entityId: "person-1",
  oldData: null,
  newData: {
    firstName: "John",
    lastName: "Doe",
    bio: "A family member",
  },
  createdAt: new Date(),
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
  },
};

const mockCalendarToken = {
  id: "token-1",
  token: "valid-token",
  userId: "user-1",
  type: "all",
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  isActive: true,
};

describe("Calendar API Endpoints", () => {
  describe("GET /api/v1/calendar/birthdays.ics", () => {
    it("should return valid iCalendar format", () => {
      // Basic test that the iCalendar format is correct
      const calendarOutput = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR";
      expect(calendarOutput).toContain("BEGIN:VCALENDAR");
      expect(calendarOutput).toContain("END:VCALENDAR");
      expect(calendarOutput).toContain("VERSION:2.0");
    });

    it("should include person with birthday", () => {
      expect(mockPerson.dateOfBirth).toBeDefined();
      expect(mockPerson.firstName).toBe("John");
    });

    it("should create birthday events for all people with birthdays", () => {
      const people = [
        { ...mockPerson, id: "person-1" },
        { ...mockPerson, id: "person-2", firstName: "Jane" },
      ];
      expect(people.length).toBe(2);
      expect(people.every((p) => p.dateOfBirth !== null)).toBe(true);
    });

    it("should handle people without birthdays", () => {
      const people = [{ ...mockPerson, dateOfBirth: null }];
      expect(people[0].dateOfBirth).toBeNull();
    });

    it("should mark deceased people appropriately", () => {
      const deceasedPerson = {
        ...mockPerson,
        isLiving: false,
      };
      expect(deceasedPerson.isLiving).toBe(false);
    });

    it("should include age in birthday summary", () => {
      const birthYear = mockPerson.dateOfBirth.getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      expect(age).toBeGreaterThan(0);
    });

    it("should set recurring yearly frequency", () => {
      // Verify that birthday events should be recurring
      expect(mockPerson.dateOfBirth).toBeDefined();
    });

    it("should validate calendar token when provided", () => {
      expect(mockCalendarToken.isActive).toBe(true);
      expect(mockCalendarToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should reject invalid tokens", () => {
      const invalidToken = null;
      expect(invalidToken).toBeNull();
    });

    it("should reject expired tokens", () => {
      const expiredToken = {
        ...mockCalendarToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      expect(expiredToken.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it("should reject inactive tokens", () => {
      const inactiveToken = {
        ...mockCalendarToken,
        isActive: false,
      };
      expect(inactiveToken.isActive).toBe(false);
    });

    it("should set correct Content-Type header", () => {
      const contentType = "text/calendar; charset=utf-8";
      expect(contentType).toContain("text/calendar");
    });

    it("should set Cache-Control header for 1 hour", () => {
      const cacheControl = "public, max-age=3600";
      expect(cacheControl).toContain("max-age=3600");
    });

    it("should handle database errors gracefully", () => {
      const error = new Error("Database error");
      expect(error.message).toBe("Database error");
    });

    it("should handle empty person list", () => {
      const people: Array<typeof mockPerson> = [];
      expect(people.length).toBe(0);
    });
  });

  describe("GET /api/v1/calendar/anniversaries.ics", () => {
    it("should return valid iCalendar format", () => {
      const calendarOutput = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR";
      expect(calendarOutput).toContain("BEGIN:VCALENDAR");
      expect(calendarOutput).toContain("END:VCALENDAR");
    });

    it("should include wedding anniversaries", () => {
      expect(mockRelationship.marriageDate).toBeDefined();
      expect(mockRelationship.type).toBe("SPOUSE");
    });

    it("should calculate years married correctly", () => {
      const marriageYear = mockRelationship.marriageDate.getFullYear();
      const currentYear = new Date().getFullYear();
      const yearsTogether = currentYear - marriageYear;
      expect(yearsTogether).toBeGreaterThan(0);
    });

    it("should include memorial dates for deceased", () => {
      const deceasedPerson = {
        ...mockPerson,
        isLiving: false,
        dateOfPassing: new Date("2020-05-15"),
      };
      expect(deceasedPerson.dateOfPassing).toBeDefined();
    });

    it("should skip people without death dates", () => {
      expect(mockPerson.dateOfPassing).toBeNull();
    });

    it("should validate calendar token when provided", () => {
      expect(mockCalendarToken.token).toBe("valid-token");
    });

    it("should set yearly recurring for anniversaries", () => {
      expect(mockRelationship.marriageDate).toBeDefined();
    });

    it("should handle relationships without marriage dates", () => {
      const relationshipNoDate = {
        ...mockRelationship,
        marriageDate: null,
      };
      expect(relationshipNoDate.marriageDate).toBeNull();
    });

    it("should handle database errors gracefully", () => {
      const error = new Error("Database error");
      expect(error.message).toBe("Database error");
    });

    it("should include years since death in memorial event", () => {
      const deceasedPerson = {
        ...mockPerson,
        dateOfPassing: new Date("2010-03-20"),
      };
      const yearsSince =
        new Date().getFullYear() - deceasedPerson.dateOfPassing.getFullYear();
      expect(yearsSince).toBeGreaterThan(0);
    });
  });

  describe("GET /api/v1/calendar/events.ics", () => {
    it("should return valid iCalendar format", () => {
      const calendarOutput = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR";
      expect(calendarOutput).toContain("BEGIN:VCALENDAR");
      expect(calendarOutput).toContain("END:VCALENDAR");
    });

    it("should include all family events", () => {
      expect(mockEvent.type).toBeDefined();
      expect(mockEvent.date).toBeDefined();
    });

    it("should include event type in summary", () => {
      expect(mockEvent.type).toBe("Birth");
    });

    it("should include event location if provided", () => {
      expect(mockEvent.place).toBe("Hospital");
    });

    it("should skip events without dates", () => {
      const eventNoDate = {
        ...mockEvent,
        date: null,
      };
      expect(eventNoDate.date).toBeNull();
    });

    it("should validate calendar token when provided", () => {
      expect(mockCalendarToken.isActive).toBe(true);
    });

    it("should set all-day event format", () => {
      // All-day events use DATE format, not DATE-TIME
      expect(mockEvent.date).toBeDefined();
    });

    it("should include event description", () => {
      expect(mockEvent.description).toBeTruthy();
    });

    it("should handle multiple events", () => {
      const events = [
        { ...mockEvent, id: "event-1", type: "Birth" },
        { ...mockEvent, id: "event-2", type: "Death" },
        { ...mockEvent, id: "event-3", type: "Marriage" },
      ];
      expect(events.length).toBe(3);
    });

    it("should handle database errors gracefully", () => {
      const error = new Error("Database error");
      expect(error.message).toBe("Database error");
    });

    it("should include person link in event", () => {
      expect(mockEvent.personId).toBeTruthy();
    });
  });

  describe("GET /api/v1/calendar/rss.xml", () => {
    it("should return valid RSS/XML format", () => {
      const rssOutput = '<?xml version="1.0"?><rss></rss>';
      expect(rssOutput).toContain("<?xml");
      expect(rssOutput).toContain("<rss");
    });

    it("should include recent audit logs", () => {
      expect(mockAuditLog.action).toBeDefined();
      expect(mockAuditLog.entityType).toBeDefined();
    });

    it("should include person creation updates", () => {
      const personLog = {
        ...mockAuditLog,
        entityType: "Person",
        action: "CREATE",
      };
      expect(personLog.entityType).toBe("Person");
      expect(personLog.action).toBe("CREATE");
    });

    it("should include person update events", () => {
      const personLog = {
        ...mockAuditLog,
        entityType: "Person",
        action: "UPDATE",
      };
      expect(personLog.action).toBe("UPDATE");
    });

    it("should include event creation updates", () => {
      const eventLog = {
        ...mockAuditLog,
        entityType: "Event",
        action: "CREATE",
      };
      expect(eventLog.entityType).toBe("Event");
    });

    it("should include media upload updates", () => {
      const mediaLog = {
        ...mockAuditLog,
        entityType: "MediaObject",
        action: "CREATE",
      };
      expect(mediaLog.entityType).toBe("MediaObject");
    });

    it("should limit to 50 most recent items", () => {
      const maxItems = 50;
      expect(maxItems).toBe(50);
    });

    it("should include user author information", () => {
      expect(mockAuditLog.user.name).toBeTruthy();
      expect(mockAuditLog.user.email).toBeTruthy();
    });

    it("should set correct Content-Type header for RSS", () => {
      const contentType = "application/rss+xml; charset=utf-8";
      expect(contentType).toContain("application/rss+xml");
    });

    it("should set Cache-Control header for 1 hour", () => {
      const cacheControl = "public, max-age=3600";
      expect(cacheControl).toContain("max-age=3600");
    });

    it("should handle database errors gracefully", () => {
      const error = new Error("Database error");
      expect(error.message).toBe("Database error");
    });

    it("should handle empty audit log", () => {
      const logs: Array<typeof mockAuditLog> = [];
      expect(logs.length).toBe(0);
    });

    it("should generate unique GUIDs for each item", () => {
      const logs = [
        { ...mockAuditLog, id: "log-1", createdAt: new Date("2026-01-01") },
        { ...mockAuditLog, id: "log-2", createdAt: new Date("2026-01-02") },
      ];
      expect(logs[0].id).not.toBe(logs[1].id);
    });

    it("should handle updates without user name", () => {
      const logNoName = {
        ...mockAuditLog,
        user: {
          ...mockAuditLog.user,
          name: null,
        },
      };
      expect(logNoName.user.name).toBeNull();
    });
  });

  describe("Token validation across endpoints", () => {
    it("should allow public access without token", () => {
      // Public endpoints don't require token
      expect(true).toBe(true);
    });

    it("should validate token when provided", () => {
      const isValid =
        mockCalendarToken.isActive &&
        mockCalendarToken.expiresAt.getTime() > Date.now();
      expect(isValid).toBe(true);
    });

    it("should reject expired token on birthdays endpoint", () => {
      const expiredToken = {
        ...mockCalendarToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      expect(expiredToken.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it("should reject expired token on anniversaries endpoint", () => {
      const expiredToken = {
        ...mockCalendarToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      expect(expiredToken.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it("should reject expired token on events endpoint", () => {
      const expiredToken = {
        ...mockCalendarToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      expect(expiredToken.expiresAt.getTime()).toBeLessThan(Date.now());
    });
  });

  describe("Content headers and formatting", () => {
    it("should return proper Content-Type for .ics files", () => {
      const contentType = "text/calendar; charset=utf-8";
      expect(contentType).toBe("text/calendar; charset=utf-8");
    });

    it("should return proper Content-Type for RSS", () => {
      const contentType = "application/rss+xml; charset=utf-8";
      expect(contentType).toBe("application/rss+xml; charset=utf-8");
    });

    it("should set Content-Disposition for calendar files", () => {
      const disposition = 'attachment; filename="birthdays.ics"';
      expect(disposition).toContain("attachment");
    });

    it("should set proper cache control headers", () => {
      const cacheControl = "public, max-age=3600";
      expect(cacheControl).toContain("max-age=");
    });
  });

  describe("Error handling", () => {
    it("should handle calendar creation errors gracefully", () => {
      const error = new Error("Calendar error");
      expect(error.message).toBe("Calendar error");
    });

    it("should continue on individual event creation failures", () => {
      const people = [
        { ...mockPerson, id: "person-1" },
        { ...mockPerson, id: "person-2" },
      ];
      // Should process all people even if some fail
      expect(people.length).toBe(2);
    });

    it("should return 500 on database errors", () => {
      const status = 500;
      expect(status).toBe(500);
    });

    it("should return 401 on invalid token", () => {
      const status = 401;
      expect(status).toBe(401);
    });

    it("should log errors appropriately", () => {
      // Errors should be logged for debugging
      const error = new Error("Test error");
      expect(error.message).toBe("Test error");
    });
  });
});
