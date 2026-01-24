/**
 * Drizzle ORM Schema - Media
 *
 * Maps Prisma MediaObject and PersonMedia models
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { persons } from "./person";

/**
 * MediaObject table - multimedia files (images, videos, documents)
 */
export const mediaObjects = pgTable(
  "MediaObject",
  {
    id: text("id").primaryKey(),
    filePath: text("filePath").notNull(),
    format: text("format").notNull(),
    mimeType: text("mimeType").notNull(),
    fileSize: integer("fileSize").notNull(),
    title: text("title"),
    description: text("description"),
    source: text("source"),
    width: integer("width"),
    height: integer("height"),
    thumbnailPath: text("thumbnailPath"),
    webpPath: text("webpPath"),
    thumb400Path: text("thumb400Path"),
    thumb800Path: text("thumb800Path"),
    thumb1200Path: text("thumb1200Path"),
    uploadedAt: timestamp("uploadedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_mediaObject_filePath").on(table.filePath),
    index("idx_mediaObject_uploadedAt").on(table.uploadedAt),
  ]
);

/**
 * PersonMedia table - media associated with persons
 */
export const personMedias = pgTable(
  "PersonMedia",
  {
    id: text("id").primaryKey(),
    personId: text("personId").notNull(),
    mediaId: text("mediaId").notNull(),
    isPrimary: boolean("isPrimary").notNull().default(false),
    caption: text("caption"),
    displayOrder: integer("displayOrder").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [
    unique().on(table.personId, table.mediaId),
    index("idx_personMedia_personId").on(table.personId),
    index("idx_personMedia_mediaId").on(table.mediaId),
    index("idx_personMedia_isPrimary").on(table.isPrimary),
  ]
);

/**
 * MediaObject relations
 */
export const mediaObjectsRelations = relations(mediaObjects, ({ many }) => ({
  eventMedias: many(mediaObjects, {
    relationName: "MediaEvents",
  }),
  personMedias: many(personMedias, {
    relationName: "MediaPersonObjects",
  }),
}));

/**
 * PersonMedia relations
 */
export const personMediasRelations = relations(personMedias, ({ one }) => ({
  person: one(persons, {
    fields: [personMedias.personId],
    references: [persons.id],
    relationName: "PersonMediaObjects",
  }),
  media: one(mediaObjects, {
    fields: [personMedias.mediaId],
    references: [mediaObjects.id],
    relationName: "MediaPersonObjects",
  }),
}));
