/**
 * Drizzle ORM Schema - Person
 *
 * Defines the Person model for the genealogy database
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  date,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { genderEnum } from "./enums";
import { users } from "./user";
import { relationships } from "./relationship";

/**
 * Person table - core genealogy record
 */
export const persons = pgTable(
  "Person",
  {
    id: text("id").primaryKey(),
    firstName: text("firstName").notNull(),
    lastName: text("lastName").notNull(),
    maidenName: text("maidenName"),
    dateOfBirth: date("dateOfBirth", { mode: "date" }),
    dateOfPassing: date("dateOfPassing", { mode: "date" }),
    birthPlace: text("birthPlace"),
    nativePlace: text("nativePlace"),
    gender: genderEnum("gender"),
    photoUrl: text("photoUrl"),
    bio: text("bio"),
    email: text("email"),
    phone: text("phone"),
    currentAddress: jsonb("currentAddress"),
    workAddress: jsonb("workAddress"),
    profession: text("profession"),
    employer: text("employer"),
    socialLinks: jsonb("socialLinks"),
    isLiving: boolean("isLiving").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
    createdById: text("createdById"),
  },
  (table) => [
    index("idx_person_lastName_firstName").on(table.lastName, table.firstName),
    index("idx_person_createdById").on(table.createdById),
    index("idx_person_dateOfBirth").on(table.dateOfBirth),
    index("idx_person_isLiving").on(table.isLiving),
  ]
);

/**
 * Person relations
 */
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
