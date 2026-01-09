import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import {
  eventCreateSchema,
  eventUpdateSchema,
  eventParticipantCreateSchema,
  eventParticipantRemoveSchema,
  type EventCreateInput,
  type EventUpdateInput,
  type EventParticipantCreateInput,
  type EventParticipantRemoveInput,
} from "@vamsa/schemas";
import { z } from "zod";

// Get all events for a person
export const getPersonEvents = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }) => {
    const person = await prisma.person.findUnique({
      where: { id: data.personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    const events = await prisma.event.findMany({
      where: { personId: data.personId },
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

    return events.map((event) => ({
      id: event.id,
      personId: event.personId,
      type: event.type,
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
    }));
  });

// Create a new event
export const createEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return eventCreateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    // Verify person exists
    const person = await prisma.person.findUnique({
      where: { id: data.personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    const event = await prisma.event.create({
      data: {
        personId: data.personId,
        type: data.type,
        date: data.date ? new Date(data.date) : null,
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

    return {
      id: event.id,
      personId: event.personId,
      type: event.type,
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
  });

// Update an event
export const updateEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return eventUpdateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    const { id, ...updates } = data;

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...updates,
        date: updates.date ? new Date(updates.date) : undefined,
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

    return {
      id: updatedEvent.id,
      personId: updatedEvent.personId,
      type: updatedEvent.type,
      date: updatedEvent.date?.toISOString().split("T")[0] ?? null,
      place: updatedEvent.place,
      description: updatedEvent.description,
      createdAt: updatedEvent.createdAt.toISOString(),
      updatedAt: updatedEvent.updatedAt.toISOString(),
      participants: updatedEvent.participants.map((p) => ({
        id: p.id,
        personId: p.personId,
        role: p.role,
        person: p.person,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  });

// Delete an event
export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { eventId: string }) => data)
  .handler(async ({ data }) => {
    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    await prisma.event.delete({
      where: { id: data.eventId },
    });

    return { success: true };
  });

// Add a participant to an event
export const addEventParticipant = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return eventParticipantCreateSchema.parse(data);
  })
  .handler(async ({ data }) => {
    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    // Verify person exists
    const person = await prisma.person.findUnique({
      where: { id: data.personId },
    });

    if (!person) {
      throw new Error("Person not found");
    }

    // Check if participant already exists
    const existingParticipant = await prisma.eventParticipant.findUnique({
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

    const participant = await prisma.eventParticipant.create({
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
  });

// Remove a participant from an event
export const removeEventParticipant = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return eventParticipantRemoveSchema.parse(data);
  })
  .handler(async ({ data }) => {
    // Verify participant exists
    const participant = await prisma.eventParticipant.findUnique({
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

    await prisma.eventParticipant.delete({
      where: {
        eventId_personId: {
          eventId: data.eventId,
          personId: data.personId,
        },
      },
    });

    return { success: true };
  });
