/**
 * Drizzle ORM Schema - Media (SQLite)
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { persons } from "./person";

export const mediaObjects = sqliteTable(
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
    uploadedAt: integer("uploadedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_mediaObject_filePath").on(table.filePath),
    index("idx_mediaObject_uploadedAt").on(table.uploadedAt),
  ]
);

export const personMedias = sqliteTable(
  "PersonMedia",
  {
    id: text("id").primaryKey(),
    personId: text("personId").notNull(),
    mediaId: text("mediaId").notNull(),
    isPrimary: integer("isPrimary", { mode: "boolean" })
      .notNull()
      .default(false),
    caption: text("caption"),
    displayOrder: integer("displayOrder").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_personMedia_personId").on(table.personId),
    index("idx_personMedia_mediaId").on(table.mediaId),
    index("idx_personMedia_isPrimary").on(table.isPrimary),
  ]
);

export const mediaObjectsRelations = relations(mediaObjects, ({ many }) => ({
  eventMedias: many(mediaObjects, {
    relationName: "MediaEvents",
  }),
  personMedias: many(personMedias, {
    relationName: "MediaPersonObjects",
  }),
}));

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
