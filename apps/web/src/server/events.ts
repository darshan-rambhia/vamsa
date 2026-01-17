import { createServerFn } from "@tanstack/react-start";
import {
  eventCreateSchema,
  eventUpdateSchema,
  eventParticipantCreateSchema,
  eventParticipantRemoveSchema,
  type EventCreateOutput,
  type EventUpdateOutput,
} from "@vamsa/schemas";
import {
  getPersonEventsData,
  createEventData,
  updateEventData,
  deleteEventData,
  addEventParticipantData,
  removeEventParticipantData,
  type Event,
  type EventParticipant,
} from "@vamsa/lib/server/business";

/**
 * Server function: Get all events for a person
 * @returns Array of events with participants
 */
export const getPersonEvents = createServerFn({ method: "GET" })
  .inputValidator((data: { personId: string }) => data)
  .handler(async ({ data }): Promise<Event[]> => {
    return getPersonEventsData(data.personId);
  });

/**
 * Server function: Create a new event
 * @returns Created event
 */
export const createEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return eventCreateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<Event> => {
    return createEventData(data as EventCreateOutput);
  });

/**
 * Server function: Update an event
 * @returns Updated event
 */
export const updateEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return eventUpdateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<Event> => {
    const { id, ...updates } = data as EventUpdateOutput;
    return updateEventData(id, updates);
  });

/**
 * Server function: Delete an event
 * @returns Success status
 */
export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { eventId: string }) => data)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    return deleteEventData(data.eventId);
  });

/**
 * Server function: Add a participant to an event
 * @returns Created participant
 */
export const addEventParticipant = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return eventParticipantCreateSchema.parse(data);
  })
  .handler(async ({ data }): Promise<EventParticipant> => {
    return addEventParticipantData(data);
  });

/**
 * Server function: Remove a participant from an event
 * @returns Success status
 */
export const removeEventParticipant = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    return eventParticipantRemoveSchema.parse(data);
  })
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    return removeEventParticipantData(data);
  });
