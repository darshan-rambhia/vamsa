/**
 * Drizzle ORM Schema - Event (SQLite)
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { persons } from "./person";

export const events = sqliteTable(
  "Event",
  {
    id: text("id").primaryKey(),
    personId: text("personId").notNull(),
    type: text("type").notNull(),
    date: text("date"),
    place: text("place"),
    placeId: text("placeId"),
    description: text("description"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_event_personId").on(table.personId),
    index("idx_event_type").on(table.type),
    index("idx_event_date").on(table.date),
    index("idx_event_placeId").on(table.placeId),
  ]
);

export const eventParticipants = sqliteTable(
  "EventParticipant",
  {
    id: text("id").primaryKey(),
    eventId: text("eventId").notNull(),
    personId: text("personId").notNull(),
    role: text("role"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_eventParticipant_eventId").on(table.eventId),
    index("idx_eventParticipant_personId").on(table.personId),
  ]
);

export const eventSources = sqliteTable(
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
    index("idx_eventSource_sourceId").on(table.sourceId),
    index("idx_eventSource_personId").on(table.personId),
    index("idx_eventSource_eventType").on(table.eventType),
  ]
);

export const eventMedias = sqliteTable(
  "EventMedia",
  {
    id: text("id").primaryKey(),
    mediaId: text("mediaId").notNull(),
    personId: text("personId").notNull(),
    eventType: text("eventType").notNull(),
  },
  (table) => [
    index("idx_eventMedia_mediaId").on(table.mediaId),
    index("idx_eventMedia_personId").on(table.personId),
    index("idx_eventMedia_eventType").on(table.eventType),
  ]
);

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

export const eventSourcesRelations = relations(eventSources, ({ one }) => ({
  person: one(persons, {
    fields: [eventSources.personId],
    references: [persons.id],
    relationName: "PersonEventSources",
  }),
}));

export const eventMediasRelations = relations(eventMedias, ({ one }) => ({
  person: one(persons, {
    fields: [eventMedias.personId],
    references: [persons.id],
    relationName: "PersonEventMedia",
  }),
}));
