/**
 * Drizzle ORM Schema - Person (SQLite)
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./user";
import { relationships } from "./relationship";

export const persons = sqliteTable(
  "Person",
  {
    id: text("id").primaryKey(),
    firstName: text("firstName").notNull(),
    lastName: text("lastName").notNull(),
    maidenName: text("maidenName"),
    dateOfBirth: text("dateOfBirth"),
    dateOfPassing: text("dateOfPassing"),
    birthPlace: text("birthPlace"),
    nativePlace: text("nativePlace"),
    gender: text("gender"),
    photoUrl: text("photoUrl"),
    bio: text("bio"),
    email: text("email"),
    phone: text("phone"),
    currentAddress: text("currentAddress", { mode: "json" }),
    workAddress: text("workAddress", { mode: "json" }),
    profession: text("profession"),
    employer: text("employer"),
    socialLinks: text("socialLinks", { mode: "json" }),
    isLiving: integer("isLiving", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    createdById: text("createdById"),
    deletedAt: integer("deletedAt", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_person_lastName_firstName").on(table.lastName, table.firstName),
    index("idx_person_createdById").on(table.createdById),
    index("idx_person_dateOfBirth").on(table.dateOfBirth),
    index("idx_person_isLiving").on(table.isLiving),
    index("idx_person_deletedAt").on(table.deletedAt),
  ]
);

export const personsRelations = relations(persons, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [persons.createdById],
    references: [users.id],
    relationName: "PersonCreatedBy",
  }),
  relationshipsFrom: many(relationships, {
    relationName: "RelationshipFrom",
  }),
  relationshipsTo: many(relationships, {
    relationName: "RelationshipTo",
  }),
  suggestions: many(persons, {
    relationName: "SuggestionTarget",
  }),
  events: many(persons, {
    relationName: "PersonEvents",
  }),
  eventParticipants: many(persons, {
    relationName: "PersonEventParticipants",
  }),
  eventSources: many(persons, {
    relationName: "PersonEventSources",
  }),
  eventMedia: many(persons, {
    relationName: "PersonEventMedia",
  }),
  invites: many(persons, {
    relationName: "InvitePerson",
  }),
  placeLinks: many(persons, {
    relationName: "PersonPlaces",
  }),
  mediaObjects: many(persons, {
    relationName: "PersonMediaObjects",
  }),
  researchNotes: many(persons, {
    relationName: "PersonResearchNotes",
  }),
}));
