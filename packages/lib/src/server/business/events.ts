import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";
import type {
  EventCreateOutput,
  EventUpdateOutput,
  EventParticipantCreateInput,
  EventParticipantRemoveInput,
  EventType,
} from "@vamsa/schemas";

/**
 * Type for the database client used by event functions.
 * This allows dependency injection for testing.
 */
export type EventsDb = Pick<
  PrismaClient,
  "event" | "eventParticipant" | "person"
>;

/**
 * Formatted event participant representation
 */
export interface EventParticipant {
  id: string;
  personId: string;
  role: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

/**
 * Formatted event representation
 */
export interface Event {
  id: string;
  personId: string;
  type: EventType;
  date: string | null;
  place: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  participants: EventParticipant[];
}

/**
 * Format a raw Prisma event to the response format
 * @param event - Raw event from Prisma with participants included
 * @returns Formatted event
 */
function formatEvent(event: {
  id: string;
  personId: string;
  type: string | EventType;
  date: Date | null;
  place: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: Array<{
    id: string;
    personId: string;
    role: string | null;
    createdAt: Date;
    person: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}): Event {
  return {
    id: event.id,
    personId: event.personId,
    type: event.type as EventType,
    date: event.date?.toISOString().split("T")[0] ?? null,
    place: event.place,
    description: event.description,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    participants: event.participants.map((p) => ({
      id: p.id,
      personId: p.personId,
      role: p.role,
      person: p.person,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

/**
 * Retrieve all events for a person
 * @param personId - ID of the person
 * @param db - Optional database client (defaults to prisma)
 * @returns Array of events with participants
 * @throws Error if person not found
 */
export async function getPersonEventsData(
  personId: string,
  db: EventsDb = defaultPrisma
): Promise<Event[]> {
  const person = await db.person.findUnique({
    where: { id: personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const events = await db.event.findMany({
    where: { personId },
    include: {
      participants: {
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
    orderBy: { date: "desc" },
  });

  return events.map(formatEvent);
}

/**
 * Create a new event for a person
 * @param data - Event creation data
 * @param db - Optional database client (defaults to prisma)
 * @returns Created event with participants
 * @throws Error if person not found
 */
export async function createEventData(
  data: EventCreateOutput,
  db: EventsDb = defaultPrisma
): Promise<Event> {
  const person = await db.person.findUnique({
    where: { id: data.personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const event = await db.event.create({
    data: {
      personId: data.personId,
      type: data.type,
      date: data.date,
      place: data.place || null,
      description: data.description || null,
    },
    include: {
      participants: {
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

  return formatEvent(event);
}

/**
 * Update an existing event
 * @param eventId - ID of the event to update
 * @param data - Event update data
 * @param db - Optional database client (defaults to prisma)
 * @returns Updated event with participants
 * @throws Error if event not found
 */
export async function updateEventData(
  eventId: string,
  data: Omit<EventUpdateOutput, "id">,
  db: EventsDb = defaultPrisma
): Promise<Event> {
  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const updatedEvent = await db.event.update({
    where: { id: eventId },
    data,
    include: {
      participants: {
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

  return formatEvent(updatedEvent);
}

/**
 * Delete an event
 * @param eventId - ID of the event to delete
 * @param db - Optional database client (defaults to prisma)
 * @returns Success status
 * @throws Error if event not found
 */
export async function deleteEventData(
  eventId: string,
  db: EventsDb = defaultPrisma
): Promise<{ success: boolean }> {
  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  await db.event.delete({
    where: { id: eventId },
  });

  return { success: true };
}

/**
 * Add a participant to an event
 * @param data - Participant creation data (eventId, personId, role)
 * @param db - Optional database client (defaults to prisma)
 * @returns Created participant
 * @throws Error if event or person not found, or participant already exists
 */
export async function addEventParticipantData(
  data: EventParticipantCreateInput,
  db: EventsDb = defaultPrisma
): Promise<EventParticipant> {
  const event = await db.event.findUnique({
    where: { id: data.eventId },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const person = await db.person.findUnique({
    where: { id: data.personId },
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const existingParticipant = await db.eventParticipant.findUnique({
    where: {
      eventId_personId: {
        eventId: data.eventId,
        personId: data.personId,
      },
    },
  });

  if (existingParticipant) {
    throw new Error("This person is already a participant in this event");
  }

  const participant = await db.eventParticipant.create({
    data: {
      eventId: data.eventId,
      personId: data.personId,
      role: data.role || null,
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
  });

  return {
    id: participant.id,
    personId: participant.personId,
    role: participant.role,
    person: participant.person,
    createdAt: participant.createdAt.toISOString(),
  };
}

/**
 * Remove a participant from an event
 * @param data - Participant removal data (eventId, personId)
 * @param db - Optional database client (defaults to prisma)
 * @returns Success status
 * @throws Error if participant not found
 */
export async function removeEventParticipantData(
  data: EventParticipantRemoveInput,
  db: EventsDb = defaultPrisma
): Promise<{ success: boolean }> {
  const participant = await db.eventParticipant.findUnique({
    where: {
      eventId_personId: {
        eventId: data.eventId,
        personId: data.personId,
      },
    },
  });

  if (!participant) {
    throw new Error("Participant not found in this event");
  }

  await db.eventParticipant.delete({
    where: {
      eventId_personId: {
        eventId: data.eventId,
        personId: data.personId,
      },
    },
  });

  return { success: true };
}
