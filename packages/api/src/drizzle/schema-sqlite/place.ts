/**
 * Drizzle ORM Schema - Place (SQLite)
 */

import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { persons } from "./person";

export const places = sqliteTable(
  "Place",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    placeType: text("placeType").notNull(),
    latitude: real("latitude"),
    longitude: real("longitude"),
    parentId: text("parentId"),
    description: text("description"),
    alternativeNames: text("alternativeNames", { mode: "json" }),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_place_name").on(table.name),
    index("idx_place_placeType").on(table.placeType),
    index("idx_place_parentId").on(table.parentId),
    index("idx_place_latitude_longitude").on(table.latitude, table.longitude),
  ]
);

export const placePersonLinks = sqliteTable(
  "PlacePersonLink",
  {
    id: text("id").primaryKey(),
    personId: text("personId").notNull(),
    placeId: text("placeId").notNull(),
    fromYear: integer("fromYear"),
    toYear: integer("toYear"),
    type: text("type"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_placePersonLink_personId").on(table.personId),
    index("idx_placePersonLink_placeId").on(table.placeId),
  ]
);

export const placesRelations = relations(places, ({ one, many }) => ({
  parent: one(places, {
    fields: [places.parentId],
    references: [places.id],
    relationName: "PlaceHierarchy",
  }),
  children: many(places, {
    relationName: "PlaceHierarchy",
  }),
  events: many(places, {
    relationName: "EventPlaces",
  }),
  personLinks: many(placePersonLinks, {
    relationName: "PlacePersonLinks",
  }),
}));

export const placePersonLinksRelations = relations(
  placePersonLinks,
  ({ one }) => ({
    person: one(persons, {
      fields: [placePersonLinks.personId],
      references: [persons.id],
      relationName: "PersonPlaces",
    }),
    place: one(places, {
      fields: [placePersonLinks.placeId],
      references: [places.id],
      relationName: "PlacePersonLinks",
    }),
  })
);
