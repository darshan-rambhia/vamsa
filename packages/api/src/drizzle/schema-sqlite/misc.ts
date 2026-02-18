/**
 * Drizzle ORM Schema - Miscellaneous (SQLite)
 *
 * Defines FamilySettings, AuditLog, Invite, Source, ResearchNote, EmailLog, and Suggestion models
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { users } from "./user";
import { persons } from "./person";

export const familySettings = sqliteTable("FamilySettings", {
  id: text("id").primaryKey(),
  familyName: text("familyName").notNull().default("Our Family"),
  description: text("description"),
  locale: text("locale").notNull().default("en"),
  customLabels: text("customLabels", { mode: "json" }),
  defaultPrivacy: text("defaultPrivacy").notNull().default("MEMBERS_ONLY"),
  allowSelfRegistration: integer("allowSelfRegistration", { mode: "boolean" })
    .notNull()
    .default(true),
  requireApprovalForEdits: integer("requireApprovalForEdits", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  metricsDashboardUrl: text("metricsDashboardUrl"),
  metricsApiUrl: text("metricsApiUrl"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const auditLogs = sqliteTable(
  "AuditLog",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    action: text("action").notNull(),
    entityType: text("entityType").notNull(),
    entityId: text("entityId"),
    previousData: text("previousData", { mode: "json" }),
    newData: text("newData", { mode: "json" }),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_auditLog_userId").on(table.userId),
    index("idx_auditLog_entityType_entityId").on(
      table.entityType,
      table.entityId
    ),
    index("idx_auditLog_createdAt").on(table.createdAt),
  ]
);

export const invites = sqliteTable(
  "Invite",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    personId: text("personId"),
    role: text("role").notNull().default("MEMBER"),
    invitedById: text("invitedById").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    acceptedAt: integer("acceptedAt", { mode: "timestamp" }),
    status: text("status").notNull().default("PENDING"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_invite_email").on(table.email),
    index("idx_invite_invitedById").on(table.invitedById),
    index("idx_invite_status").on(table.status),
  ]
);

export const sources = sqliteTable(
  "Source",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    author: text("author"),
    publicationDate: text("publicationDate"),
    description: text("description"),
    repository: text("repository"),
    notes: text("notes"),
    sourceType: text("sourceType"),
    citationFormat: text("citationFormat"),
    doi: text("doi"),
    url: text("url"),
    isbn: text("isbn"),
    callNumber: text("callNumber"),
    accessDate: integer("accessDate", { mode: "timestamp" }),
    confidence: text("confidence"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_source_title").on(table.title),
    index("idx_source_sourceType").on(table.sourceType),
    index("idx_source_doi").on(table.doi),
  ]
);

export const researchNotes = sqliteTable(
  "ResearchNote",
  {
    id: text("id").primaryKey(),
    sourceId: text("sourceId").notNull(),
    personId: text("personId").notNull(),
    eventType: text("eventType").notNull(),
    findings: text("findings").notNull(),
    methodology: text("methodology"),
    limitations: text("limitations"),
    relatedSources: text("relatedSources"),
    conclusionReliability: text("conclusionReliability"),
    createdById: text("createdById"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_researchNote_sourceId").on(table.sourceId),
    index("idx_researchNote_personId").on(table.personId),
    index("idx_researchNote_eventType").on(table.eventType),
    index("idx_researchNote_createdById").on(table.createdById),
  ]
);

export const emailLogs = sqliteTable(
  "EmailLog",
  {
    id: text("id").primaryKey(),
    recipientEmail: text("recipientEmail").notNull(),
    subject: text("subject").notNull(),
    emailType: text("emailType").notNull(),
    status: text("status").notNull().default("sent"),
    sentAt: integer("sentAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    error: text("error"),
    resendId: text("resendId"),
    metadata: text("metadata", { mode: "json" }),
    createdById: text("createdById").notNull(),
  },
  (table) => [
    index("idx_emailLog_recipientEmail").on(table.recipientEmail),
    index("idx_emailLog_emailType").on(table.emailType),
    index("idx_emailLog_status").on(table.status),
    index("idx_emailLog_sentAt").on(table.sentAt),
  ]
);

export const suggestions = sqliteTable(
  "Suggestion",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    targetPersonId: text("targetPersonId"),
    suggestedData: text("suggestedData", { mode: "json" }).notNull(),
    reason: text("reason"),
    status: text("status").notNull().default("PENDING"),
    submittedById: text("submittedById").notNull(),
    reviewedById: text("reviewedById"),
    reviewNote: text("reviewNote"),
    submittedAt: integer("submittedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    reviewedAt: integer("reviewedAt", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_suggestion_status").on(table.status),
    index("idx_suggestion_submittedById").on(table.submittedById),
    index("idx_suggestion_targetPersonId").on(table.targetPersonId),
  ]
);

export const dashboardPreferences = sqliteTable(
  "DashboardPreferences",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().unique(),
    layout: text("layout", { mode: "json" })
      .notNull()
      .default(sql`'{"widgets":[]}'`),
    widgets: text("widgets", { mode: "json" })
      .notNull()
      .default(sql`'[]'`),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("idx_dashboardPreferences_userId").on(table.userId)]
);

export const familySettingsRelations = relations(familySettings, () => ({}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
    relationName: "AuditLogUser",
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  person: one(persons, {
    fields: [invites.personId],
    references: [persons.id],
    relationName: "InvitePerson",
  }),
  invitedBy: one(users, {
    fields: [invites.invitedById],
    references: [users.id],
    relationName: "InvitedBy",
  }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  researchNotes: many(researchNotes, {
    relationName: "SourceResearchNotes",
  }),
}));

export const researchNotesRelations = relations(researchNotes, ({ one }) => ({
  source: one(sources, {
    fields: [researchNotes.sourceId],
    references: [sources.id],
    relationName: "SourceResearchNotes",
  }),
  person: one(persons, {
    fields: [researchNotes.personId],
    references: [persons.id],
    relationName: "PersonResearchNotes",
  }),
  createdBy: one(users, {
    fields: [researchNotes.createdById],
    references: [users.id],
    relationName: "ResearchNoteCreator",
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  createdBy: one(users, {
    fields: [emailLogs.createdById],
    references: [users.id],
    relationName: "EmailLogCreator",
  }),
}));

export const suggestionsRelations = relations(suggestions, ({ one }) => ({
  targetPerson: one(persons, {
    fields: [suggestions.targetPersonId],
    references: [persons.id],
    relationName: "SuggestionTarget",
  }),
  submittedBy: one(users, {
    fields: [suggestions.submittedById],
    references: [users.id],
    relationName: "SuggestionSubmitter",
  }),
  reviewedBy: one(users, {
    fields: [suggestions.reviewedById],
    references: [users.id],
    relationName: "SuggestionReviewer",
  }),
}));

export const dashboardPreferencesRelations = relations(
  dashboardPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [dashboardPreferences.userId],
      references: [users.id],
    }),
  })
);
