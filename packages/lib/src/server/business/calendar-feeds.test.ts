/**
 * Unit tests for calendar feeds business logic
 *
 * Tests cover:
 * - Token validation with DI
 * - RSS feed generation
 * - Birthday calendar generation
 * - Anniversary/memorial calendar generation
 * - Events calendar generation
 *
 * Uses module mocking for @vamsa/api, similar to claim.test.ts.
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockLog,
  mockLogger,
  mockLoggers,
  mockSerializeError,
  mockStartTimer,
} from "../../testing/shared-mocks";

// Import after mocking
import {
  generateAnniversaryCalendarData,
  generateBirthdayCalendarData,
  generateEventsCalendarData,
  generateRSSFeedData,
  validateCalendarToken,
} from "./calendar-feeds";

// Create mock drizzleSchema
const mockDrizzleSchema = {
  calendarTokens: {
    id: "id",
    token: "token",
    userId: "userId",
    isActive: "isActive",
    expiresAt: "expiresAt",
    lastUsedAt: "lastUsedAt",
  },
  auditLogs: {
    entityType: "entityType",
    entityId: "entityId",
    action: "action",
    newData: "newData",
    createdAt: "createdAt",
    userId: "userId",
  },
  users: {
    id: "id",
    name: "name",
    email: "email",
  },
  persons: {
    id: "id",
    firstName: "firstName",
    lastName: "lastName",
    dateOfBirth: "dateOfBirth",
    dateOfPassing: "dateOfPassing",
    isLiving: "isLiving",
  },
  relationships: {
    id: "id",
    type: "type",
    personId: "personId",
    relatedPersonId: "relatedPersonId",
    marriageDate: "marriageDate",
  },
  events: {
    id: "id",
    type: "type",
    date: "date",
    description: "description",
    place: "place",
    personId: "personId",
  },
};

// Create mock drizzleDb
const mockDrizzleDb = {
  select: mock(() => ({
    from: mock(() => ({
      where: mock(() => ({
        limit: mock(() => Promise.resolve([])),
        orderBy: mock(() => Promise.resolve([])),
      })),
      leftJoin: mock(() => ({
        where: mock(() => ({
          orderBy: mock(() => ({
            limit: mock(() => Promise.resolve([])),
          })),
        })),
      })),
      innerJoin: mock(() => ({
        where: mock(() => ({
          orderBy: mock(() => Promise.resolve([])),
        })),
        innerJoin: mock(() => ({
          where: mock(() => ({
            orderBy: mock(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  })),
  update: mock(() => ({
    set: mock(() => ({
      where: mock(() => Promise.resolve({})),
    })),
  })),
};

// Mock modules
mock.module("@vamsa/api", () => ({
  drizzleDb: mockDrizzleDb,
  drizzleSchema: mockDrizzleSchema,
}));

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  loggers: mockLoggers,
  log: mockLog,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

describe("Calendar Feeds Business Logic", () => {
  beforeEach(() => {
    mockLogger.error.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
  });

  describe("validateCalendarToken", () => {
    it("should return valid=true for active, non-expired token", async () => {
      const mockToken = {
        id: "token-1",
        token: "valid-token-123",
        userId: "user-1",
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
      };

      // Reset the main mock for this test
      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => ({
            where: mock(() => ({
              limit: mock(() => Promise.resolve([mockToken])),
            })),
          })),
        })
      );

      const result = await validateCalendarToken("valid-token-123");

      expect(result.valid).toBe(true);
      expect(result.tokenRecord?.id).toBe("token-1");
      expect(result.tokenRecord?.userId).toBe("user-1");
    });

    it("should return valid=false for non-existent token", async () => {
      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => ({
            where: mock(() => ({
              limit: mock(() => Promise.resolve([])),
            })),
          })),
        })
      );

      const result = await validateCalendarToken("nonexistent-token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token not found");
    });

    it("should return valid=false for inactive token", async () => {
      const mockToken = {
        id: "token-1",
        token: "inactive-token",
        userId: "user-1",
        isActive: false,
        expiresAt: new Date(Date.now() + 86400000),
      };

      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => ({
            where: mock(() => ({
              limit: mock(() => Promise.resolve([mockToken])),
            })),
          })),
        })
      );

      const result = await validateCalendarToken("inactive-token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token is inactive");
    });

    it("should return valid=false for expired token", async () => {
      const mockToken = {
        id: "token-1",
        token: "expired-token",
        userId: "user-1",
        isActive: true,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      };

      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => ({
            where: mock(() => ({
              limit: mock(() => Promise.resolve([mockToken])),
            })),
          })),
        })
      );

      const result = await validateCalendarToken("expired-token");

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Token has expired");
    });
  });

  describe("generateRSSFeedData", () => {
    it("should throw error for invalid token", async () => {
      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => ({
            where: mock(() => ({
              limit: mock(() => Promise.resolve([])),
            })),
          })),
        })
      );

      await expect(
        generateRSSFeedData("invalid-token", "https://example.com")
      ).rejects.toThrow("Token not found");
    });

    it("should generate RSS XML for valid token", async () => {
      const mockToken = {
        id: "token-1",
        token: "valid-token",
        userId: "user-1",
        isActive: true,
        expiresAt: new Date(Date.now() + 86400000),
      };

      const mockUpdates = [
        {
          entityType: "Person",
          entityId: "person-1",
          action: "CREATE",
          newData: { firstName: "John", lastName: "Doe", bio: "Test bio" },
          createdAt: new Date("2024-01-15"),
          user: { name: "Admin", email: "admin@example.com" },
        },
      ];

      let callCount = 0;
      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => {
            callCount++;
            if (callCount === 1) {
              // Token validation
              return {
                where: mock(() => ({
                  limit: mock(() => Promise.resolve([mockToken])),
                })),
              };
            }
            // Audit logs
            return {
              leftJoin: mock(() => ({
                where: mock(() => ({
                  orderBy: mock(() => ({
                    limit: mock(() => Promise.resolve(mockUpdates)),
                  })),
                })),
              })),
            };
          }),
        })
      );

      const xml = await generateRSSFeedData(
        "valid-token",
        "https://example.com"
      );

      expect(xml).toContain("<?xml");
      expect(xml).toContain("<rss");
      expect(xml).toContain("Vamsa Family Updates");
      expect(xml).toContain("New person added: John Doe");
    });
  });

  describe("generateBirthdayCalendarData", () => {
    it("should generate iCal with birthday events", async () => {
      const mockPeople = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: new Date("1990-06-15"),
          isLiving: true,
        },
        {
          id: "person-2",
          firstName: "Jane",
          lastName: "Smith",
          dateOfBirth: new Date("1985-03-20"),
          isLiving: false,
        },
      ];

      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => ({
            where: mock(() => ({
              orderBy: mock(() => Promise.resolve(mockPeople)),
            })),
          })),
        })
      );

      const ics = await generateBirthdayCalendarData("https://example.com");

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("Family Birthdays");
      expect(ics).toContain("John Doe's Birthday");
      expect(ics).toContain("Jane Smith's Birthday");
      expect(ics).toContain("(Deceased)");
      expect(ics).toContain("RRULE:FREQ=YEARLY");
    });

    it("should skip people without birth dates", async () => {
      const mockPeople = [
        {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: null,
          isLiving: true,
        },
      ];

      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => ({
            where: mock(() => ({
              orderBy: mock(() => Promise.resolve(mockPeople)),
            })),
          })),
        })
      );

      const ics = await generateBirthdayCalendarData("https://example.com");

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).not.toContain("John Doe");
    });
  });

  describe("generateAnniversaryCalendarData", () => {
    it("should generate iCal with anniversary and memorial events", async () => {
      const mockMarriages = [
        {
          id: "rel-1",
          marriageDate: new Date("2010-08-15"),
          person: { id: "person-1", firstName: "John", lastName: "Doe" },
          relatedPerson: { id: "person-2", firstName: "Jane", lastName: "Doe" },
        },
      ];

      const mockDeceased = [
        {
          id: "person-3",
          firstName: "Robert",
          lastName: "Smith",
          dateOfPassing: new Date("2020-11-10"),
        },
      ];

      let selectCall = 0;
      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => {
            selectCall++;
            if (selectCall === 1) {
              // Marriages query
              return {
                innerJoin: mock(() => ({
                  innerJoin: mock(() => ({
                    where: mock(() => ({
                      orderBy: mock(() => Promise.resolve(mockMarriages)),
                    })),
                  })),
                })),
              };
            }
            // Deceased query
            return {
              where: mock(() => ({
                orderBy: mock(() => Promise.resolve(mockDeceased)),
              })),
            };
          }),
        })
      );

      const ics = await generateAnniversaryCalendarData("https://example.com");

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("Family Anniversaries");
      expect(ics).toContain("John & Jane Anniversary");
      expect(ics).toContain("Memorial: Robert Smith");
      expect(ics).toContain("RRULE:FREQ=YEARLY");
    });
  });

  describe("generateEventsCalendarData", () => {
    it("should generate iCal with family events", async () => {
      const mockEvents = [
        {
          id: "event-1",
          type: "BIRTH",
          date: new Date("2020-05-10"),
          description: "Baby was born",
          place: "Hospital",
          person: { id: "person-1", firstName: "Baby", lastName: "Doe" },
        },
        {
          id: "event-2",
          type: "MARRIAGE",
          date: new Date("2015-06-20"),
          description: "Wedding ceremony",
          place: "Church",
          person: { id: "person-2", firstName: "John", lastName: "Doe" },
        },
      ];

      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => ({
            innerJoin: mock(() => ({
              where: mock(() => ({
                orderBy: mock(() => Promise.resolve(mockEvents)),
              })),
            })),
          })),
        })
      );

      const ics = await generateEventsCalendarData("https://example.com");

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).toContain("Family Events");
      expect(ics).toContain("BIRTH: Baby Doe");
      expect(ics).toContain("MARRIAGE: John Doe");
      expect(ics).toContain("Hospital");
      expect(ics).toContain("Church");
    });

    it("should skip events without dates", async () => {
      const mockEvents = [
        {
          id: "event-1",
          type: "BIRTH",
          date: null,
          description: "No date event",
          place: null,
          person: { id: "person-1", firstName: "Test", lastName: "Person" },
        },
      ];

      (mockDrizzleDb.select as ReturnType<typeof mock>).mockImplementation(
        () => ({
          from: mock(() => ({
            innerJoin: mock(() => ({
              where: mock(() => ({
                orderBy: mock(() => Promise.resolve(mockEvents)),
              })),
            })),
          })),
        })
      );

      const ics = await generateEventsCalendarData("https://example.com");

      expect(ics).toContain("BEGIN:VCALENDAR");
      expect(ics).not.toContain("BIRTH: Test Person");
    });
  });
});
