/**
 * Unit tests for event server business logic
 *
 * Tests cover:
 * - Retrieving events for a person
 * - Creating events with validation
 * - Updating event data
 * - Deleting events
 * - Managing event participants (add/remove)
 * - Error handling and validation
 *
 * Uses dependency injection pattern - passes mock db directly to functions
 * instead of using mock.module() which would pollute the global module cache.
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { EventsDb } from "@vamsa/lib/server/business";
import type {
  EventCreateOutput,
  EventParticipantCreateInput,
  EventParticipantRemoveInput,
} from "@vamsa/schemas";

// Use shared mock from test setup

// Mock logger for this test file
import {
  mockLogger,
  mockSerializeError,
  mockCreateContextLogger,
  mockCreateRequestLogger,
  mockStartTimer,
} from "../../testing/shared-mocks";

mock.module("@vamsa/lib/logger", () => ({
  logger: mockLogger,
  serializeError: mockSerializeError,
  createContextLogger: mockCreateContextLogger,
  createRequestLogger: mockCreateRequestLogger,
  startTimer: mockStartTimer,
}));

// Import the functions to test
import {
  getPersonEventsData,
  createEventData,
  updateEventData,
  deleteEventData,
  addEventParticipantData,
  removeEventParticipantData,
} from "@vamsa/lib/server/business";

// Create mock database client - no mock.module() needed!
function createMockDb(): EventsDb {
  return {
    person: {
      findUnique: mock(() => Promise.resolve(null)),
    },
    event: {
      findMany: mock(() => Promise.resolve([])),
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      update: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
    eventParticipant: {
      findUnique: mock(() => Promise.resolve(null)),
      create: mock(() => Promise.resolve({})),
      delete: mock(() => Promise.resolve({})),
    },
  } as unknown as EventsDb;
}

describe("Event Server Functions", () => {
  let mockDb: EventsDb;

  beforeEach(() => {
    mockDb = createMockDb();
    mockLogger.error.mockClear();
  });

  describe("getPersonEventsData", () => {
    it("should throw error when person not found", async () => {
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue(
        null
      );

      try {
        await getPersonEventsData("person-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Person not found");
      }
    });

    it("should return empty array when no events exist", async () => {
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      const result = await getPersonEventsData("person-1", mockDb);

      expect(result).toHaveLength(0);
    });

    it("should retrieve events for a person", async () => {
      const now = new Date();
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "event-1",
          personId: "person-1",
          type: "BIRTH",
          date: now,
          place: "New York",
          description: "Born",
          createdAt: now,
          updatedAt: now,
          participants: [],
        },
      ]);

      const result = await getPersonEventsData("person-1", mockDb);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("event-1");
      expect(result[0].type).toBe("BIRTH");
    });

    it("should include participants with person info", async () => {
      const now = new Date();
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "event-1",
          personId: "person-1",
          type: "MARRIAGE",
          date: now,
          place: "Church",
          description: null,
          createdAt: now,
          updatedAt: now,
          participants: [
            {
              id: "participant-1",
              personId: "person-2",
              role: "SPOUSE",
              createdAt: now,
              person: {
                id: "person-2",
                firstName: "Jane",
                lastName: "Doe",
              },
            },
          ],
        },
      ]);

      const result = await getPersonEventsData("person-1", mockDb);

      expect(result[0].participants).toHaveLength(1);
      expect(result[0].participants[0].person.firstName).toBe("Jane");
    });

    it("should order events by date descending", async () => {
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValue([]);

      await getPersonEventsData("person-1", mockDb);

      const call = (mockDb.event.findMany as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]).toEqual(
        expect.objectContaining({
          orderBy: { date: "desc" },
        })
      );
    });

    it("should format dates as ISO strings", async () => {
      const date = new Date("2020-01-15");
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "event-1",
          personId: "person-1",
          type: "BIRTH",
          date,
          place: null,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [],
        },
      ]);

      const result = await getPersonEventsData("person-1", mockDb);

      expect(result[0].date).toBe("2020-01-15");
    });

    it("should handle null dates in events", async () => {
      const now = new Date();
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "event-1",
          personId: "person-1",
          type: "OTHER",
          date: null,
          place: null,
          description: null,
          createdAt: now,
          updatedAt: now,
          participants: [],
        },
      ]);

      const result = await getPersonEventsData("person-1", mockDb);

      expect(result[0].date).toBeNull();
    });

    it("should handle multiple events", async () => {
      const date1 = new Date("2020-01-15");
      const date2 = new Date("2021-06-20");
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "event-1",
          personId: "person-1",
          type: "BIRTH",
          date: date1,
          place: "New York",
          description: "Born",
          createdAt: date1,
          updatedAt: date1,
          participants: [],
        },
        {
          id: "event-2",
          personId: "person-1",
          type: "MARRIAGE",
          date: date2,
          place: "Church",
          description: null,
          createdAt: date2,
          updatedAt: date2,
          participants: [],
        },
      ]);

      const result = await getPersonEventsData("person-1", mockDb);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("BIRTH");
      expect(result[1].type).toBe("MARRIAGE");
    });
  });

  describe("createEventData", () => {
    it("should throw error when person not found", async () => {
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue(
        null
      );

      const input: EventCreateOutput = {
        personId: "person-1",
        type: "BIRTH",
        date: new Date(),
      };

      try {
        await createEventData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Person not found");
      }
    });

    it("should create event with required fields", async () => {
      const now = new Date();
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.create as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: now,
        place: null,
        description: null,
        createdAt: now,
        updatedAt: now,
        participants: [],
      });

      const input: EventCreateOutput = {
        personId: "person-1",
        type: "BIRTH",
        date: now,
      };

      const result = await createEventData(input, mockDb);

      expect(result.id).toBe("event-1");
      expect(result.type).toBe("BIRTH");
    });

    it("should create event with optional fields", async () => {
      const now = new Date();
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.create as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
        personId: "person-1",
        type: "MARRIAGE",
        date: now,
        place: "Church",
        description: "Married Jane",
        createdAt: now,
        updatedAt: now,
        participants: [],
      });

      const input: EventCreateOutput = {
        personId: "person-1",
        type: "MARRIAGE",
        date: now,
        place: "Church",
        description: "Married Jane",
      };

      const result = await createEventData(input, mockDb);

      expect(result.place).toBe("Church");
      expect(result.description).toBe("Married Jane");
    });

    it("should set null values for missing optional fields", async () => {
      const now = new Date();
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.create as ReturnType<typeof mock>).mockImplementation(
        (args: any) => {
          const { data } = args;
          return Promise.resolve({
            id: "event-1",
            personId: data.personId,
            type: data.type,
            date: data.date,
            place: data.place,
            description: data.description,
            createdAt: now,
            updatedAt: now,
            participants: [],
          });
        }
      );

      const input: EventCreateOutput = {
        personId: "person-1",
        type: "BIRTH",
        date: now,
      };

      await createEventData(input, mockDb);

      const call = (mockDb.event.create as ReturnType<typeof mock>).mock
        .calls[0];
      expect(call?.[0]?.data?.place).toBeNull();
      expect(call?.[0]?.data?.description).toBeNull();
    });

    it("should format dates correctly on creation", async () => {
      const now = new Date();
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.create as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: now,
        place: null,
        description: null,
        createdAt: now,
        updatedAt: now,
        participants: [],
      });

      const input: EventCreateOutput = {
        personId: "person-1",
        type: "BIRTH",
        date: now,
      };

      const result = await createEventData(input, mockDb);

      expect(result.createdAt).toContain("T");
      expect(result.updatedAt).toContain("T");
    });
  });

  describe("updateEventData", () => {
    it("should throw error when event not found", async () => {
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue(
        null
      );

      try {
        await updateEventData("event-1", {}, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Event not found");
      }
    });

    it("should update event data", async () => {
      const now = new Date();
      const newDate = new Date("2021-01-01");

      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: now,
        place: "Old Place",
        description: "Old",
        createdAt: now,
        updatedAt: now,
      });
      (mockDb.event.update as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: newDate,
        place: "New Place",
        description: "New",
        createdAt: now,
        updatedAt: now,
        participants: [],
      });

      const result = await updateEventData(
        "event-1",
        { place: "New Place" },
        mockDb
      );

      expect(result.id).toBe("event-1");
    });

    it("should update place and description", async () => {
      const now = new Date();

      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
        personId: "person-1",
        type: "MARRIAGE",
        date: now,
        place: "Old Location",
        description: "Old notes",
        createdAt: now,
        updatedAt: now,
      });
      (mockDb.event.update as ReturnType<typeof mock>).mockImplementation(
        (args: any) => {
          const { data } = args;
          return Promise.resolve({
            id: "event-1",
            personId: "person-1",
            type: "MARRIAGE",
            date: now,
            place: data.place,
            description: data.description,
            createdAt: now,
            updatedAt: now,
            participants: [],
          });
        }
      );

      const result = await updateEventData(
        "event-1",
        { place: "New Location", description: "New notes" },
        mockDb
      );

      expect(result.place).toBe("New Location");
      expect(result.description).toBe("New notes");
    });

    it("should handle partial updates", async () => {
      const now = new Date();

      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });
      (mockDb.event.update as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: now,
        place: null,
        description: null,
        createdAt: now,
        updatedAt: now,
        participants: [],
      });

      const result = await updateEventData(
        "event-1",
        { type: "DEATH" },
        mockDb
      );

      expect(result.id).toBe("event-1");
    });
  });

  describe("deleteEventData", () => {
    it("should throw error when event not found", async () => {
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue(
        null
      );

      try {
        await deleteEventData("event-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Event not found");
      }
    });

    it("should delete event successfully", async () => {
      const now = new Date();
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: now,
        place: null,
        description: null,
      });
      (mockDb.event.delete as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });

      const result = await deleteEventData("event-1", mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.event.delete).toHaveBeenCalledWith({
        where: { id: "event-1" },
      });
    });

    it("should return success response", async () => {
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });
      (mockDb.event.delete as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });

      const result = await deleteEventData("event-1", mockDb);

      expect(result).toEqual({ success: true });
    });
  });

  describe("addEventParticipantData", () => {
    it("should throw error when event not found", async () => {
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue(
        null
      );

      const input: EventParticipantCreateInput = {
        eventId: "event-1",
        personId: "person-1",
        role: "ATTENDEE",
      };

      try {
        await addEventParticipantData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Event not found");
      }
    });

    it("should throw error when person not found", async () => {
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue(
        null
      );

      const input: EventParticipantCreateInput = {
        eventId: "event-1",
        personId: "person-1",
        role: "ATTENDEE",
      };

      try {
        await addEventParticipantData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Person not found");
      }
    });

    it("should throw error when participant already exists", async () => {
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (
        mockDb.eventParticipant.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({ id: "participant-1" });

      const input: EventParticipantCreateInput = {
        eventId: "event-1",
        personId: "person-1",
        role: "ATTENDEE",
      };

      try {
        await addEventParticipantData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("already a participant");
      }
    });

    it("should add participant to event", async () => {
      const now = new Date();
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (
        mockDb.eventParticipant.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);
      (
        mockDb.eventParticipant.create as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: "participant-1",
        personId: "person-1",
        role: "ATTENDEE",
        createdAt: now,
        person: {
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
        },
      });

      const input: EventParticipantCreateInput = {
        eventId: "event-1",
        personId: "person-1",
        role: "ATTENDEE",
      };

      const result = await addEventParticipantData(input, mockDb);

      expect(result.id).toBe("participant-1");
      expect(result.person.firstName).toBe("John");
      expect(result.createdAt).toBe(now.toISOString());
    });

    it("should set null role when not provided", async () => {
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (
        mockDb.eventParticipant.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);
      (
        mockDb.eventParticipant.create as ReturnType<typeof mock>
      ).mockImplementation((args: any) => {
        const { data } = args;
        return Promise.resolve({
          id: "participant-1",
          personId: data.personId,
          role: data.role,
          createdAt: new Date(),
          person: {
            id: "person-1",
            firstName: "John",
            lastName: "Doe",
          },
        });
      });

      const input: EventParticipantCreateInput = {
        eventId: "event-1",
        personId: "person-1",
      };

      await addEventParticipantData(input, mockDb);

      const call = (mockDb.eventParticipant.create as ReturnType<typeof mock>)
        .mock.calls[0];
      expect(call?.[0]?.data?.role).toBeNull();
    });

    it("should format participant timestamps correctly", async () => {
      const now = new Date();
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (
        mockDb.eventParticipant.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);
      (
        mockDb.eventParticipant.create as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: "participant-1",
        personId: "person-1",
        role: "SPOUSE",
        createdAt: now,
        person: {
          id: "person-1",
          firstName: "Jane",
          lastName: "Doe",
        },
      });

      const input: EventParticipantCreateInput = {
        eventId: "event-1",
        personId: "person-1",
        role: "SPOUSE",
      };

      const result = await addEventParticipantData(input, mockDb);

      expect(result.createdAt).toContain("T");
    });
  });

  describe("removeEventParticipantData", () => {
    it("should throw error when participant not found", async () => {
      (
        mockDb.eventParticipant.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      const input: EventParticipantRemoveInput = {
        eventId: "event-1",
        personId: "person-1",
      };

      try {
        await removeEventParticipantData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain("Participant not found");
      }
    });

    it("should remove participant from event", async () => {
      (
        mockDb.eventParticipant.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({ id: "participant-1" });
      (
        mockDb.eventParticipant.delete as ReturnType<typeof mock>
      ).mockResolvedValue({ id: "participant-1" });

      const input: EventParticipantRemoveInput = {
        eventId: "event-1",
        personId: "person-1",
      };

      const result = await removeEventParticipantData(input, mockDb);

      expect(result.success).toBe(true);
      expect(mockDb.eventParticipant.delete).toHaveBeenCalledWith({
        where: {
          eventId_personId: {
            eventId: "event-1",
            personId: "person-1",
          },
        },
      });
    });

    it("should return success response", async () => {
      (
        mockDb.eventParticipant.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({ id: "participant-1" });
      (
        mockDb.eventParticipant.delete as ReturnType<typeof mock>
      ).mockResolvedValue({ id: "participant-1" });

      const input: EventParticipantRemoveInput = {
        eventId: "event-1",
        personId: "person-1",
      };

      const result = await removeEventParticipantData(input, mockDb);

      expect(result).toEqual({ success: true });
    });
  });

  describe("Event CRUD operations - edge cases", () => {
    it("should handle events with all participants", async () => {
      const now = new Date();
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "event-1",
          personId: "person-1",
          type: "MARRIAGE",
          date: now,
          place: "Church",
          description: "Wedding",
          createdAt: now,
          updatedAt: now,
          participants: [
            {
              id: "p1",
              personId: "person-1",
              role: "GROOM",
              createdAt: now,
              person: { id: "person-1", firstName: "John", lastName: "Doe" },
            },
            {
              id: "p2",
              personId: "person-2",
              role: "BRIDE",
              createdAt: now,
              person: { id: "person-2", firstName: "Jane", lastName: "Smith" },
            },
          ],
        },
      ]);

      const result = await getPersonEventsData("person-1", mockDb);

      expect(result[0].participants).toHaveLength(2);
    });

    it("should handle events without descriptions", async () => {
      const now = new Date();
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.findMany as ReturnType<typeof mock>).mockResolvedValue([
        {
          id: "event-1",
          personId: "person-1",
          type: "OTHER",
          date: now,
          place: null,
          description: null,
          createdAt: now,
          updatedAt: now,
          participants: [],
        },
      ]);

      const result = await getPersonEventsData("person-1", mockDb);

      expect(result[0].description).toBeNull();
    });

    it("should handle all event types", async () => {
      const now = new Date();
      const eventTypes = [
        "BIRTH",
        "DEATH",
        "MARRIAGE",
        "DIVORCE",
        "CUSTOM",
      ] as const;

      for (const eventType of eventTypes) {
        (
          mockDb.person.findUnique as ReturnType<typeof mock>
        ).mockResolvedValueOnce({
          id: "person-1",
        });
        (mockDb.event.create as ReturnType<typeof mock>).mockResolvedValueOnce({
          id: `event-${eventType}`,
          personId: "person-1",
          type: eventType,
          date: now,
          place: null,
          description: null,
          createdAt: now,
          updatedAt: now,
          participants: [],
        });

        const input: EventCreateOutput = {
          personId: "person-1",
          type: eventType,
          date: now,
        };

        const result = await createEventData(input, mockDb);
        expect(result.type).toBe(eventType);
      }
    });
  });

  describe("Error handling", () => {
    it("should handle database errors in getPersonEventsData", async () => {
      const error = new Error("Database error");
      (
        mockDb.person.findUnique as ReturnType<typeof mock>
      ).mockRejectedValueOnce(error);

      try {
        await getPersonEventsData("person-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it("should handle database errors in createEventData", async () => {
      const error = new Error("Database error");
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (mockDb.event.create as ReturnType<typeof mock>).mockRejectedValueOnce(
        error
      );

      const input: EventCreateOutput = {
        personId: "person-1",
        type: "BIRTH",
        date: new Date(),
      };

      try {
        await createEventData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it("should handle database errors in updateEventData", async () => {
      const error = new Error("Database error");
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });
      (mockDb.event.update as ReturnType<typeof mock>).mockRejectedValueOnce(
        error
      );

      try {
        await updateEventData("event-1", {}, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it("should handle database errors in deleteEventData", async () => {
      const error = new Error("Database error");
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });
      (mockDb.event.delete as ReturnType<typeof mock>).mockRejectedValueOnce(
        error
      );

      try {
        await deleteEventData("event-1", mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it("should handle database errors in addEventParticipantData", async () => {
      const error = new Error("Database error");
      (mockDb.event.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "event-1",
      });
      (mockDb.person.findUnique as ReturnType<typeof mock>).mockResolvedValue({
        id: "person-1",
      });
      (
        mockDb.eventParticipant.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);
      (
        mockDb.eventParticipant.create as ReturnType<typeof mock>
      ).mockRejectedValueOnce(error);

      const input: EventParticipantCreateInput = {
        eventId: "event-1",
        personId: "person-1",
      };

      try {
        await addEventParticipantData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
      }
    });

    it("should handle database errors in removeEventParticipantData", async () => {
      const error = new Error("Database error");
      (
        mockDb.eventParticipant.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({ id: "participant-1" });
      (
        mockDb.eventParticipant.delete as ReturnType<typeof mock>
      ).mockRejectedValueOnce(error);

      const input: EventParticipantRemoveInput = {
        eventId: "event-1",
        personId: "person-1",
      };

      try {
        await removeEventParticipantData(input, mockDb);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBe(error);
      }
    });
  });
});
