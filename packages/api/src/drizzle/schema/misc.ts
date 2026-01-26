/**
 * Drizzle ORM Schema - Miscellaneous
 *
 * Maps Prisma FamilySettings, AuditLog, Invite, Source, ResearchNote, EmailLog, and Suggestion models
 */

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  privacyLevelEnum,
  auditActionEnum,
  userRoleEnum,
  inviteStatusEnum,
  suggestionTypeEnum,
  suggestionStatusEnum,
} from "./enums";
import { users } from "./user";
import { persons } from "./person";

/**
 * FamilySettings table - global family genealogy settings
 */
export const familySettings = pgTable("FamilySettings", {
  id: text("id").primaryKey(),
  familyName: text("familyName").notNull().default("Our Family"),
  description: text("description"),
  locale: text("locale").notNull().default("en"),
  customLabels: jsonb("customLabels"),
  defaultPrivacy: privacyLevelEnum("defaultPrivacy")
    .notNull()
    .default("MEMBERS_ONLY"),
  allowSelfRegistration: boolean("allowSelfRegistration")
    .notNull()
    .default(true),
  requireApprovalForEdits: boolean("requireApprovalForEdits")
    .notNull()
    .default(true),
  metricsDashboardUrl: text("metricsDashboardUrl"),
  metricsApiUrl: text("metricsApiUrl"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
});

/**
 * AuditLog table - audit trail of user actions
 */
export const auditLogs = pgTable(
  "AuditLog",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    action: auditActionEnum("action").notNull(),
    entityType: text("entityType").notNull(),
    entityId: text("entityId"),
    previousData: jsonb("previousData"),
    newData: jsonb("newData"),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
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

/**
 * Invite table - pending invitations to join the family
 */
export const invites = pgTable(
  "Invite",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    personId: text("personId"),
    role: userRoleEnum("role").notNull().default("MEMBER"),
    invitedById: text("invitedById").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    acceptedAt: timestamp("acceptedAt", { mode: "date" }),
    status: inviteStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_invite_email").on(table.email),
    index("idx_invite_invitedById").on(table.invitedById),
    index("idx_invite_status").on(table.status),
  ]
);

/**
 * Source table - genealogical sources for citations
 */
export const sources = pgTable(
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
    accessDate: timestamp("accessDate", { mode: "date" }),
    confidence: text("confidence"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_source_title").on(table.title),
    index("idx_source_sourceType").on(table.sourceType),
    index("idx_source_doi").on(table.doi),
  ]
);

/**
 * ResearchNote table - research documentation and findings
 */
export const researchNotes = pgTable(
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
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_researchNote_sourceId").on(table.sourceId),
    index("idx_researchNote_personId").on(table.personId),
    index("idx_researchNote_eventType").on(table.eventType),
    index("idx_researchNote_createdById").on(table.createdById),
  ]
);

/**
 * EmailLog table - log of sent emails
 */
export const emailLogs = pgTable(
  "EmailLog",
  {
    id: text("id").primaryKey(),
    recipientEmail: text("recipientEmail").notNull(),
    subject: text("subject").notNull(),
    emailType: text("emailType").notNull(),
    status: text("status").notNull().default("sent"),
    sentAt: timestamp("sentAt", { mode: "date" }).notNull().defaultNow(),
    error: text("error"),
    resendId: text("resendId"),
    metadata: jsonb("metadata"),
    createdById: text("createdById").notNull(),
  },
  (table) => [
    index("idx_emailLog_recipientEmail").on(table.recipientEmail),
    index("idx_emailLog_emailType").on(table.emailType),
    index("idx_emailLog_status").on(table.status),
    index("idx_emailLog_sentAt").on(table.sentAt),
  ]
);

/**
 * Suggestion table - user suggestions for changes
 */
export const suggestions = pgTable(
  "Suggestion",
  {
    id: text("id").primaryKey(),
    type: suggestionTypeEnum("type").notNull(),
    targetPersonId: text("targetPersonId"),
    suggestedData: jsonb("suggestedData").notNull(),
    reason: text("reason"),
    status: suggestionStatusEnum("status").notNull().default("PENDING"),
    submittedById: text("submittedById").notNull(),
    reviewedById: text("reviewedById"),
    reviewNote: text("reviewNote"),
    submittedAt: timestamp("submittedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }),
  },
  (table) => [
    index("idx_suggestion_status").on(table.status),
    index("idx_suggestion_submittedById").on(table.submittedById),
    index("idx_suggestion_targetPersonId").on(table.targetPersonId),
  ]
);

/**
 * FamilySettings relations
 */
export const familySettingsRelations = relations(familySettings, () => ({}));

/**
 * AuditLog relations
 */
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
    relationName: "AuditLogUser",
  }),
}));

/**
 * Invite relations
 */
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

/**
 * Source relations
 */
export const sourcesRelations = relations(sources, ({ many }) => ({
  researchNotes: many(researchNotes, {
    relationName: "SourceResearchNotes",
  }),
}));

/**
 * ResearchNote relations
 */
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

/**
 * EmailLog relations
 */
export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  createdBy: one(users, {
    fields: [emailLogs.createdById],
    references: [users.id],
    relationName: "EmailLogCreator",
  }),
}));

/**
 * DashboardPreferences table - user dashboard configuration and layout preferences
 */
export const dashboardPreferences = pgTable(
  "DashboardPreferences",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull().unique(),
    layout: jsonb("layout")
      .notNull()
      .default(sql`'{"widgets":[]}'::jsonb`),
    widgets: jsonb("widgets")
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [index("idx_dashboardPreferences_userId").on(table.userId)]
);

/**
 * Suggestion relations
 */
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

/**
 * DashboardPreferences relations
 */
export const dashboardPreferencesRelations = relations(
  dashboardPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [dashboardPreferences.userId],
      references: [users.id],
    }),
  })
);
