/**
 * Drizzle ORM Schema - Event
 *
 * Defines Event, EventParticipant, EventSource, and EventMedia models
 */

import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { eventTypeEnum } from "./enums";
import { persons } from "./person";

/**
 * Event table - genealogical events (birth, marriage, etc.)
 */
export const events = pgTable(
  "Event",
  {
    id: text("id").primaryKey(),
    personId: text("personId").notNull(),
    type: eventTypeEnum("type").notNull(),
    date: date("date", { mode: "date" }),
    place: text("place"),
    placeId: text("placeId"),
    description: text("description"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_event_personId").on(table.personId),
    index("idx_event_type").on(table.type),
    index("idx_event_date").on(table.date),
    index("idx_event_placeId").on(table.placeId),
  ]
);

/**
 * EventParticipant table - participants in events
 */
export const eventParticipants = pgTable(
  "EventParticipant",
  {
    id: text("id").primaryKey(),
    eventId: text("eventId").notNull(),
    personId: text("personId").notNull(),
    role: text("role"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // Column order must match database constraint order
    unique("EventParticipant_eventId_personId_unique").on(
      table.personId,
      table.eventId
    ),
    index("idx_eventParticipant_eventId").on(table.eventId),
    index("idx_eventParticipant_personId").on(table.personId),
  ]
);

/**
 * EventSource table - source citations for events
 */
export const eventSources = pgTable(
  "EventSource",
  {
    id: text("id").primaryKey(),
    sourceId: text("sourceId").notNull(),
    personId: text("personId").notNull(),
    eventType: text("eventType").notNull(),
    confidence: text("confidence"),
    sourceNotes: text("sourceNotes"),
  },
  (table) => [
    unique("EventSource_sourceId_personId_eventType_unique").on(
      table.sourceId,
      table.personId,
      table.eventType
    ),
    index("idx_eventSource_sourceId").on(table.sourceId),
    index("idx_eventSource_personId").on(table.personId),
    index("idx_eventSource_eventType").on(table.eventType),
  ]
);

/**
 * EventMedia table - media objects associated with events
 */
export const eventMedias = pgTable(
  "EventMedia",
  {
    id: text("id").primaryKey(),
    mediaId: text("mediaId").notNull(),
    personId: text("personId").notNull(),
    eventType: text("eventType").notNull(),
  },
  (table) => [
    // Column order must match database constraint order
    unique("EventMedia_mediaId_personId_eventType_unique").on(
      table.personId,
      table.mediaId,
      table.eventType
    ),
    index("idx_eventMedia_mediaId").on(table.mediaId),
    index("idx_eventMedia_personId").on(table.personId),
    index("idx_eventMedia_eventType").on(table.eventType),
  ]
);

/**
 * Event relations
 */
export const eventsRelations = relations(events, ({ one, many }) => ({
  person: one(persons, {
    fields: [events.personId],
    references: [persons.id],
    relationName: "PersonEvents",
  }),
  participants: many(eventParticipants, {
    relationName: "EventParticipants",
  }),
}));

/**
 * EventParticipant relations
 */
export const eventParticipantsRelations = relations(
  eventParticipants,
  ({ one }) => ({
    event: one(events, {
      fields: [eventParticipants.eventId],
      references: [events.id],
      relationName: "EventParticipants",
    }),
    person: one(persons, {
      fields: [eventParticipants.personId],
      references: [persons.id],
      relationName: "PersonEventParticipants",
    }),
  })
);

/**
 * EventSource relations
 */
export const eventSourcesRelations = relations(eventSources, ({ one }) => ({
  person: one(persons, {
    fields: [eventSources.personId],
    references: [persons.id],
    relationName: "PersonEventSources",
  }),
}));

/**
 * EventMedia relations
 */
export const eventMediasRelations = relations(eventMedias, ({ one }) => ({
  person: one(persons, {
    fields: [eventMedias.personId],
    references: [persons.id],
    relationName: "PersonEventMedia",
  }),
}));
