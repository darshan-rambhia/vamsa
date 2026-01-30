/**
 * Drizzle ORM Schema - Place
 *
 * Defines Place and PlacePersonLink models
 */

import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { personPlaceTypeEnum, placeTypeEnum } from "./enums";
import { persons } from "./person";

/**
 * Place table - geographical locations in genealogy
 */
export const places = pgTable(
  "Place",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    placeType: placeTypeEnum("placeType").notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    parentId: text("parentId"),
    description: text("description"),
    alternativeNames: jsonb("alternativeNames"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_place_name").on(table.name),
    index("idx_place_placeType").on(table.placeType),
    index("idx_place_parentId").on(table.parentId),
    index("idx_place_latitude_longitude").on(table.latitude, table.longitude),
  ]
);

/**
 * PlacePersonLink table - person-to-place associations (lived, worked, studied, etc.)
 */
export const placePersonLinks = pgTable(
  "PlacePersonLink",
  {
    id: text("id").primaryKey(),
    personId: text("personId").notNull(),
    placeId: text("placeId").notNull(),
    fromYear: integer("fromYear"),
    toYear: integer("toYear"),
    type: personPlaceTypeEnum("type"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // Column order must match database constraint order
    unique("PlacePersonLink_personId_placeId_type_unique").on(
      table.type,
      table.placeId,
      table.personId
    ),
    index("idx_placePersonLink_personId").on(table.personId),
    index("idx_placePersonLink_placeId").on(table.placeId),
  ]
);

/**
 * Place relations
 */
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

/**
 * PlacePersonLink relations
 */
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
