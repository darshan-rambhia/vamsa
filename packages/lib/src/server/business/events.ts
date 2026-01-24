import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq, and } from "drizzle-orm";
import type {
  EventCreateOutput,
  EventUpdateOutput,
  EventParticipantCreateInput,
  EventParticipantRemoveInput,
  EventType,
} from "@vamsa/schemas";

/**
 * Type for the database client used by event functions.
 * This module uses Drizzle ORM as the default database client.
 */
export type EventsDb = typeof drizzleDb;

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
 * @param db - Drizzle database instance
 * @returns Array of events with participants
 * @throws Error if person not found
 */
export async function getPersonEventsData(
  personId: string,
  db: EventsDb = drizzleDb
): Promise<Event[]> {
  const person = await db.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, personId),
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const events = await db.query.events.findMany({
    where: eq(drizzleSchema.events.personId, personId),
    with: {
      participants: {
        with: {
          person: true,
        },
      },
    },
    orderBy: (events, { desc }) => [desc(events.date)],
  });

  return events.map((event) =>
    formatEvent({
      ...event,
      date: event.date,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      participants: event.participants.map((p) => ({
        ...p,
        createdAt: p.createdAt,
        person: {
          id: p.person.id,
          firstName: p.person.firstName,
          lastName: p.person.lastName,
        },
      })),
    })
  );
}

/**
 * Create a new event for a person
 * @param data - Event creation data
 * @param db - Drizzle database instance
 * @returns Created event with participants
 * @throws Error if person not found
 */
export async function createEventData(
  data: EventCreateOutput,
  db: EventsDb = drizzleDb
): Promise<Event> {
  const person = await db.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, data.personId),
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const result = await db
    .insert(drizzleSchema.events)
    .values({
      id: crypto.randomUUID(),
      personId: data.personId,
      type: data.type,
      date: data.date ? new Date(data.date) : null,
      place: data.place || null,
      description: data.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!result[0]) {
    throw new Error("Failed to create event");
  }

  const event = await db.query.events.findFirst({
    where: eq(drizzleSchema.events.id, result[0].id),
    with: {
      participants: {
        with: {
          person: true,
        },
      },
    },
  });

  if (!event) {
    throw new Error("Failed to retrieve created event");
  }

  return formatEvent({
    ...event,
    date: event.date,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    participants: event.participants.map((p) => ({
      ...p,
      createdAt: p.createdAt,
      person: {
        id: p.person.id,
        firstName: p.person.firstName,
        lastName: p.person.lastName,
      },
    })),
  });
}

/**
 * Update an existing event
 * @param eventId - ID of the event to update
 * @param data - Event update data
 * @param db - Drizzle database instance
 * @returns Updated event with participants
 * @throws Error if event not found
 */
export async function updateEventData(
  eventId: string,
  data: Omit<EventUpdateOutput, "id">,
  db: EventsDb = drizzleDb
): Promise<Event> {
  const event = await db.query.events.findFirst({
    where: eq(drizzleSchema.events.id, eventId),
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.type !== undefined) {
    updateData.type = data.type;
  }
  if (data.date !== undefined) {
    updateData.date = data.date ? new Date(data.date) : null;
  }
  if (data.place !== undefined) {
    updateData.place = data.place || null;
  }
  if (data.description !== undefined) {
    updateData.description = data.description || null;
  }

  await db
    .update(drizzleSchema.events)
    .set(updateData)
    .where(eq(drizzleSchema.events.id, eventId));

  const updatedEvent = await db.query.events.findFirst({
    where: eq(drizzleSchema.events.id, eventId),
    with: {
      participants: {
        with: {
          person: true,
        },
      },
    },
  });

  if (!updatedEvent) {
    throw new Error("Failed to retrieve updated event");
  }

  return formatEvent({
    ...updatedEvent,
    date: updatedEvent.date,
    createdAt: updatedEvent.createdAt,
    updatedAt: updatedEvent.updatedAt,
    participants: updatedEvent.participants.map((p) => ({
      ...p,
      createdAt: p.createdAt,
      person: {
        id: p.person.id,
        firstName: p.person.firstName,
        lastName: p.person.lastName,
      },
    })),
  });
}

/**
 * Delete an event
 * @param eventId - ID of the event to delete
 * @param db - Drizzle database instance
 * @returns Success status
 * @throws Error if event not found
 */
export async function deleteEventData(
  eventId: string,
  db: EventsDb = drizzleDb
): Promise<{ success: boolean }> {
  const event = await db.query.events.findFirst({
    where: eq(drizzleSchema.events.id, eventId),
  });

  if (!event) {
    throw new Error("Event not found");
  }

  await db
    .delete(drizzleSchema.events)
    .where(eq(drizzleSchema.events.id, eventId));

  return { success: true };
}

/**
 * Add a participant to an event
 * @param data - Participant creation data (eventId, personId, role)
 * @param db - Drizzle database instance
 * @returns Created participant
 * @throws Error if event or person not found, or participant already exists
 */
export async function addEventParticipantData(
  data: EventParticipantCreateInput,
  db: EventsDb = drizzleDb
): Promise<EventParticipant> {
  const event = await db.query.events.findFirst({
    where: eq(drizzleSchema.events.id, data.eventId),
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const person = await db.query.persons.findFirst({
    where: eq(drizzleSchema.persons.id, data.personId),
  });

  if (!person) {
    throw new Error("Person not found");
  }

  const existingParticipant = await db.query.eventParticipants.findFirst(
    {
      where: and(
        eq(drizzleSchema.eventParticipants.eventId, data.eventId),
        eq(drizzleSchema.eventParticipants.personId, data.personId)
      ),
    }
  );

  if (existingParticipant) {
    throw new Error("This person is already a participant in this event");
  }

  const result = await db
    .insert(drizzleSchema.eventParticipants)
    .values({
      id: crypto.randomUUID(),
      eventId: data.eventId,
      personId: data.personId,
      role: data.role || null,
      createdAt: new Date(),
    })
    .returning();

  if (!result[0]) {
    throw new Error("Failed to create participant");
  }

  const participant = await db.query.eventParticipants.findFirst({
    where: eq(drizzleSchema.eventParticipants.id, result[0].id),
    with: {
      person: true,
    },
  });

  if (!participant) {
    throw new Error("Failed to retrieve created participant");
  }

  return {
    id: participant.id,
    personId: participant.personId,
    role: participant.role,
    person: {
      id: participant.person.id,
      firstName: participant.person.firstName,
      lastName: participant.person.lastName,
    },
    createdAt: participant.createdAt.toISOString(),
  };
}

/**
 * Remove a participant from an event
 * @param data - Participant removal data (eventId, personId)
 * @param db - Drizzle database instance
 * @returns Success status
 * @throws Error if participant not found
 */
export async function removeEventParticipantData(
  data: EventParticipantRemoveInput,
  db: EventsDb = drizzleDb
): Promise<{ success: boolean }> {
  const participant = await db.query.eventParticipants.findFirst({
    where: and(
      eq(drizzleSchema.eventParticipants.eventId, data.eventId),
      eq(drizzleSchema.eventParticipants.personId, data.personId)
    ),
  });

  if (!participant) {
    throw new Error("Participant not found in this event");
  }

  await db
    .delete(drizzleSchema.eventParticipants)
    .where(
      and(
        eq(drizzleSchema.eventParticipants.eventId, data.eventId),
        eq(drizzleSchema.eventParticipants.personId, data.personId)
      )
    );

  return { success: true };
}

