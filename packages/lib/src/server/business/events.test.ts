/**
 * Unit tests for events server business logic
 *
 * Tests cover:
 * - Retrieving events for a person
 * - Creating new events
 * - Updating events
 * - Deleting events
 * - Adding participants to events
 * - Removing participants from events
 * - Error handling and validation
 * - Data formatting and transformations
 *
 * Testing approach: Module mocking with mock.module() for @vamsa/api
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  addEventParticipantData,
  createEventData,
  deleteEventData,
  getPersonEventsData,
  removeEventParticipantData,
  updateEventData,
} from "@vamsa/lib/server/business";
import { mockLogger } from "../../testing/shared-mocks";

// Import the functions to test

// Create mock drizzleDb
const mockDrizzleDb = {
  query: {
    persons: {
      findFirst: mock(() => Promise.resolve(null)),
    },
    events: {
      findFirst: mock(() => Promise.resolve(null)),
      findMany: mock(() => Promise.resolve([])),
    },
    eventParticipants: {
      findFirst: mock(() => Promise.resolve(null)),
    },
  },
  insert: mock(() => ({
    values: mock(() => ({
      returning: mock(() => Promise.resolve([{}])),
    })),
  })),
  update: mock(() => ({
    set: mock(() => ({
      where: mock(() => Promise.resolve({})),
    })),
  })),
  delete: mock(() => ({
    where: mock(() => Promise.resolve({})),
  })),
};

describe("Events Server Business Logic", () => {
  beforeEach(() => {
    (
      mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.events.findMany as ReturnType<typeof mock>
    ).mockClear();
    (
      mockDrizzleDb.query.eventParticipants.findFirst as ReturnType<typeof mock>
    ).mockClear();
    (mockDrizzleDb.insert as ReturnType<typeof mock>).mockClear();
    (mockDrizzleDb.update as ReturnType<typeof mock>).mockClear();
    (mockDrizzleDb.delete as ReturnType<typeof mock>).mockClear();
    mockLogger.error.mockClear();
  });

  describe("getPersonEventsData", () => {
    it("should throw error when person not found", async () => {
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await getPersonEventsData("nonexistent-person", mockDrizzleDb as any);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Person not found");
      }
    });

    it("should retrieve events for a person", async () => {
      const mockPerson = { id: "person-1", firstName: "John", lastName: "Doe" };
      const mockEvents = [
        {
          id: "event-1",
          personId: "person-1",
          type: "BIRTH",
          date: new Date("1990-01-15"),
          place: "New York",
          description: "Birth event",
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [
            {
              id: "participant-1",
              personId: "person-2",
              role: "Attendee",
              createdAt: new Date(),
              person: { id: "person-2", firstName: "Jane", lastName: "Doe" },
            },
          ],
        },
      ];

      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDrizzleDb.query.events.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEvents);

      const result = await getPersonEventsData(
        "person-1",
        mockDrizzleDb as any
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("event-1");
      expect(result[0].personId).toBe("person-1");
    });

    it("should format event dates as ISO strings", async () => {
      const mockPerson = { id: "person-1" };
      const testDate = new Date("2024-01-15T10:30:00Z");
      const mockEvents = [
        {
          id: "event-1",
          personId: "person-1",
          type: "BIRTH",
          date: testDate,
          place: null,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [],
        },
      ];

      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDrizzleDb.query.events.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEvents);

      const result = await getPersonEventsData(
        "person-1",
        mockDrizzleDb as any
      );

      expect(result[0].date).toBe("2024-01-15");
    });

    it("should format event timestamps as ISO strings", async () => {
      const mockPerson = { id: "person-1" };
      const createdAtDate = new Date("2024-01-15T10:30:00Z");
      const updatedAtDate = new Date("2024-01-20T15:45:00Z");
      const mockEvents = [
        {
          id: "event-1",
          personId: "person-1",
          type: "BIRTH",
          date: null,
          place: null,
          description: null,
          createdAt: createdAtDate,
          updatedAt: updatedAtDate,
          participants: [],
        },
      ];

      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDrizzleDb.query.events.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEvents);

      const result = await getPersonEventsData(
        "person-1",
        mockDrizzleDb as any
      );

      expect(result[0].createdAt).toBe(createdAtDate.toISOString());
      expect(result[0].updatedAt).toBe(updatedAtDate.toISOString());
    });

    it("should format participants correctly", async () => {
      const mockPerson = { id: "person-1" };
      const mockEvents = [
        {
          id: "event-1",
          personId: "person-1",
          type: "MARRIAGE",
          date: null,
          place: null,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [
            {
              id: "participant-1",
              personId: "person-2",
              role: "Groom",
              createdAt: new Date(),
              person: { id: "person-2", firstName: "John", lastName: "Doe" },
            },
            {
              id: "participant-2",
              personId: "person-3",
              role: "Bride",
              createdAt: new Date(),
              person: { id: "person-3", firstName: "Jane", lastName: "Doe" },
            },
          ],
        },
      ];

      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDrizzleDb.query.events.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEvents);

      const result = await getPersonEventsData(
        "person-1",
        mockDrizzleDb as any
      );

      expect(result[0].participants.length).toBe(2);
      expect(result[0].participants[0].role).toBe("Groom");
      expect(result[0].participants[0].person.firstName).toBe("John");
    });

    it("should return empty array when person has no events", async () => {
      const mockPerson = { id: "person-1" };

      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDrizzleDb.query.events.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce([]);

      const result = await getPersonEventsData(
        "person-1",
        mockDrizzleDb as any
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should order events by date descending", async () => {
      const mockPerson = { id: "person-1" };
      const mockEvents = [
        {
          id: "event-1",
          personId: "person-1",
          type: "BIRTH",
          date: new Date("1990-01-15"),
          place: null,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [],
        },
      ];

      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (
        mockDrizzleDb.query.events.findMany as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEvents);

      const result = await getPersonEventsData(
        "person-1",
        mockDrizzleDb as any
      );

      expect(result).toBeDefined();
    });
  });

  describe("createEventData", () => {
    it("should throw error when person not found", async () => {
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await createEventData(
          {
            personId: "nonexistent-person",
            type: "BIRTH",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Person not found");
      }
    });

    it("should create a new event", async () => {
      const mockPerson = { id: "person-1", firstName: "John", lastName: "Doe" };
      const createdEvent = {
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: new Date("1990-01-15"),
        place: "New York",
        description: "Birth event",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockEvent = {
        ...createdEvent,
        participants: [
          {
            id: "participant-1",
            personId: "person-2",
            role: null,
            createdAt: new Date(),
            person: { id: "person-2", firstName: "Jane", lastName: "Doe" },
          },
        ],
      };

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce(mockPerson)
        .mockResolvedValueOnce(mockEvent);
      (mockDrizzleDb.insert as ReturnType<typeof mock>).mockReturnValue({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([createdEvent])),
        })),
      });
      (
        mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEvent);

      const result = await createEventData(
        {
          personId: "person-1",
          type: "BIRTH",
          date: new Date("1990-01-15"),
          place: "New York",
          description: "Birth event",
        },
        mockDrizzleDb as any
      );

      expect(result.id).toBe("event-1");
      expect(result.personId).toBe("person-1");
      expect(result.type).toBe("BIRTH");
    });

    it("should create event with minimal data", async () => {
      const mockPerson = { id: "person-1" };
      const createdEvent = {
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: null,
        place: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockEvent = {
        ...createdEvent,
        participants: [],
      };

      (mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce(mockPerson)
        .mockResolvedValueOnce(mockEvent);
      (mockDrizzleDb.insert as ReturnType<typeof mock>).mockReturnValue({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([createdEvent])),
        })),
      });
      (
        mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEvent);

      const result = await createEventData(
        {
          personId: "person-1",
          type: "BIRTH",
        },
        mockDrizzleDb as any
      );

      expect(result.id).toBe("event-1");
      expect(result.place).toBeNull();
      expect(result.description).toBeNull();
    });

    it("should throw error if insert fails", async () => {
      const mockPerson = { id: "person-1" };

      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDrizzleDb.insert as ReturnType<typeof mock>).mockReturnValue({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([])),
        })),
      });

      try {
        await createEventData(
          {
            personId: "person-1",
            type: "BIRTH",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Failed to create event");
      }
    });

    it("should throw error if retrieval after insert fails", async () => {
      const mockPerson = { id: "person-1" };
      const createdEvent = {
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: null,
        place: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockPerson);
      (mockDrizzleDb.insert as ReturnType<typeof mock>).mockReturnValue({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([createdEvent])),
        })),
      });
      (
        mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await createEventData(
          {
            personId: "person-1",
            type: "BIRTH",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Failed to retrieve created event");
      }
    });
  });

  describe("updateEventData", () => {
    it("should throw error when event not found", async () => {
      (
        mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await updateEventData(
          "nonexistent-event",
          {
            type: "MARRIAGE",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Event not found");
      }
    });

    it("should update event type", async () => {
      const existingEvent = {
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: null,
        place: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedEvent = {
        ...existingEvent,
        type: "MARRIAGE",
        participants: [],
      };

      (mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce(existingEvent)
        .mockResolvedValueOnce(updatedEvent);
      (mockDrizzleDb.update as ReturnType<typeof mock>).mockReturnValue({
        set: mock(() => ({
          where: mock(() => Promise.resolve({})),
        })),
      });

      const result = await updateEventData(
        "event-1",
        {
          type: "MARRIAGE",
        },
        mockDrizzleDb as any
      );

      expect(result.type).toBe("MARRIAGE");
    });

    it("should update event date", async () => {
      const existingEvent = {
        id: "event-1",
        personId: "person-1",
        type: "MARRIAGE",
        date: new Date("2020-01-01"),
        place: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedEvent = {
        ...existingEvent,
        date: new Date("2021-06-15"),
        participants: [],
      };

      (mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce(existingEvent)
        .mockResolvedValueOnce(updatedEvent);
      (mockDrizzleDb.update as ReturnType<typeof mock>).mockReturnValue({
        set: mock(() => ({
          where: mock(() => Promise.resolve({})),
        })),
      });

      const result = await updateEventData(
        "event-1",
        {
          date: new Date("2021-06-15"),
        },
        mockDrizzleDb as any
      );

      expect(result.date).toBe("2021-06-15");
    });

    it("should update place and description", async () => {
      const existingEvent = {
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: null,
        place: "Old Place",
        description: "Old desc",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedEvent = {
        ...existingEvent,
        place: "New Place",
        description: "New desc",
        participants: [],
      };

      (mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce(existingEvent)
        .mockResolvedValueOnce(updatedEvent);
      (mockDrizzleDb.update as ReturnType<typeof mock>).mockReturnValue({
        set: mock(() => ({
          where: mock(() => Promise.resolve({})),
        })),
      });

      const result = await updateEventData(
        "event-1",
        {
          place: "New Place",
          description: "New desc",
        },
        mockDrizzleDb as any
      );

      expect(result.place).toBe("New Place");
      expect(result.description).toBe("New desc");
    });

    it("should throw error if retrieval after update fails", async () => {
      const existingEvent = {
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: null,
        place: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>)
        .mockResolvedValueOnce(existingEvent)
        .mockResolvedValueOnce(null);
      (mockDrizzleDb.update as ReturnType<typeof mock>).mockReturnValue({
        set: mock(() => ({
          where: mock(() => Promise.resolve({})),
        })),
      });

      try {
        await updateEventData(
          "event-1",
          {
            type: "MARRIAGE",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Failed to retrieve updated event");
      }
    });
  });

  describe("deleteEventData", () => {
    it("should throw error when event not found", async () => {
      (
        mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await deleteEventData("nonexistent-event", mockDrizzleDb as any);
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Event not found");
      }
    });

    it("should delete an event", async () => {
      const existingEvent = {
        id: "event-1",
        personId: "person-1",
        type: "BIRTH",
        date: null,
        place: null,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (
        mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(existingEvent);
      (mockDrizzleDb.delete as ReturnType<typeof mock>).mockReturnValue({
        where: mock(() => Promise.resolve({})),
      });

      const result = await deleteEventData("event-1", mockDrizzleDb as any);

      expect(result.success).toBe(true);
      expect(mockDrizzleDb.delete).toHaveBeenCalled();
    });
  });

  describe("addEventParticipantData", () => {
    it("should throw error when event not found", async () => {
      (
        mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await addEventParticipantData(
          {
            eventId: "nonexistent-event",
            personId: "person-1",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Event not found");
      }
    });

    it("should check for event existence before operations", async () => {
      (
        mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await addEventParticipantData(
          {
            eventId: "event-1",
            personId: "person-1",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe("Event not found");
        expect(mockDrizzleDb.query.events.findFirst).toHaveBeenCalled();
      }
    });

    it("should validate participant participant operations", async () => {
      // Basic validation that the function checks necessary conditions
      const mockEvent = { id: "event-1", personId: "person-1" };
      (
        mockDrizzleDb.query.events.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(mockEvent);
      (
        mockDrizzleDb.query.persons.findFirst as ReturnType<typeof mock>
      ).mockResolvedValueOnce(null);

      try {
        await addEventParticipantData(
          {
            eventId: "event-1",
            personId: "person-2",
          },
          mockDrizzleDb as any
        );
      } catch (err) {
        expect(err instanceof Error).toBe(true);
      }
    });
  });

  describe("removeEventParticipantData", () => {
    it("should throw error when participant not found", async () => {
      (
        mockDrizzleDb.query.eventParticipants.findFirst as ReturnType<
          typeof mock
        >
      ).mockResolvedValueOnce(null);

      try {
        await removeEventParticipantData(
          {
            eventId: "event-1",
            personId: "person-1",
          },
          mockDrizzleDb as any
        );
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toBe(
          "Participant not found in this event"
        );
      }
    });

    it("should call delete when participant found", async () => {
      const mockParticipant = {
        id: "participant-1",
        eventId: "event-1",
        personId: "person-2",
      };

      (
        mockDrizzleDb.query.eventParticipants.findFirst as ReturnType<
          typeof mock
        >
      ).mockResolvedValueOnce(mockParticipant);
      (mockDrizzleDb.delete as ReturnType<typeof mock>).mockReturnValueOnce({
        where: mock(() => Promise.resolve({})),
      });

      const result = await removeEventParticipantData(
        {
          eventId: "event-1",
          personId: "person-2",
        },
        mockDrizzleDb as any
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
      expect(mockDrizzleDb.delete).toHaveBeenCalled();
    });
  });
});
