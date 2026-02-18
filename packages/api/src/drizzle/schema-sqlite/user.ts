/**
 * Drizzle ORM Schema - User (SQLite)
 *
 * Defines User, Account, Session, Verification, OAuthState, and CalendarToken models
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

/**
 * User table
 */
export const users = sqliteTable(
  "User",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    image: text("image"),
    passwordHash: text("passwordHash"),
    personId: text("personId").unique(),
    role: text("role").notNull().default("VIEWER"),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    mustChangePassword: integer("mustChangePassword", { mode: "boolean" })
      .notNull()
      .default(false),
    preferredLanguage: text("preferredLanguage").default("en"),
    oidcProvider: text("oidcProvider"),
    oidcSubject: text("oidcSubject"),
    emailVerified: integer("emailVerified", { mode: "boolean" })
      .notNull()
      .default(false),
    profileClaimStatus: text("profileClaimStatus").notNull().default("PENDING"),
    profileClaimedAt: integer("profileClaimedAt", { mode: "timestamp" }),
    invitedById: text("invitedById"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    lastLoginAt: integer("lastLoginAt", { mode: "timestamp" }),
    failedLoginAttempts: integer("failedLoginAttempts").notNull().default(0),
    lockedUntil: integer("lockedUntil", { mode: "timestamp" }),
    lastFailedLoginAt: integer("lastFailedLoginAt", { mode: "timestamp" }),
    emailNotificationPreferences: text("emailNotificationPreferences", {
      mode: "json",
    }).default(
      sql`'{"newMemberJoined":true,"birthdayReminders":true,"suggestionsCreated":true,"suggestionsUpdated":true}'`
    ),
  },
  (table) => [
    index("idx_user_email").on(table.email),
    index("idx_user_personId").on(table.personId),
    index("idx_user_oidcProvider").on(table.oidcProvider),
  ]
);

/**
 * Account table
 */
export const accounts = sqliteTable(
  "Account",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    idToken: text("idToken"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("idx_account_userId").on(table.userId)]
);

/**
 * Verification table
 */
export const verifications = sqliteTable(
  "Verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("idx_verification_identifier").on(table.identifier)]
);

/**
 * Session table
 */
export const sessions = sqliteTable(
  "Session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("userId").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_session_userId").on(table.userId),
    index("idx_session_expiresAt").on(table.expiresAt),
  ]
);

/**
 * CalendarToken table
 */
export const calendarTokens = sqliteTable(
  "CalendarToken",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("userId").notNull(),
    name: text("name"),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    lastUsedAt: integer("lastUsedAt", { mode: "timestamp" }),
    rotationPolicy: text("rotationPolicy").notNull().default("annual"),
    rotatedAt: integer("rotatedAt", { mode: "timestamp" }),
    rotatedFrom: text("rotatedFrom"),
    // SQLite has no array type; store as JSON string
    scopes: text("scopes").default('["calendar:read"]'),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_calendarToken_userId").on(table.userId),
    index("idx_calendarToken_token").on(table.token),
    index("idx_calendarToken_expiresAt").on(table.expiresAt),
    index("idx_calendarToken_isActive").on(table.isActive),
    index("idx_calendarToken_userId_isActive").on(table.userId, table.isActive),
  ]
);

/**
 * OAuthState table
 */
export const oAuthStates = sqliteTable(
  "OAuthState",
  {
    id: text("id").primaryKey(),
    state: text("state").notNull().unique(),
    codeVerifier: text("codeVerifier").notNull(),
    provider: text("provider").notNull(),
    redirectTo: text("redirectTo"),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_oAuthState_state").on(table.state),
    index("idx_oAuthState_expiresAt").on(table.expiresAt),
  ]
);

/**
 * User relations
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  invitedBy: one(users, {
    fields: [users.invitedById],
    references: [users.id],
    relationName: "UserInvites",
  }),
  invitees: many(users, {
    relationName: "UserInvites",
  }),
  submittedSuggestions: many(users, {
    relationName: "SuggestionSubmitter",
  }),
  reviewedSuggestions: many(users, {
    relationName: "SuggestionReviewer",
  }),
  accounts: many(accounts),
  auditLogs: many(users, {
    relationName: "AuditLogUser",
  }),
  sessions: many(sessions),
  invites: many(users, {
    relationName: "InvitedBy",
  }),
  researchNotes: many(users, {
    relationName: "ResearchNoteCreator",
  }),
  emailLogs: many(users, {
    relationName: "EmailLogCreator",
  }),
  calendarTokens: many(calendarTokens),
}));

/**
 * Account relations
 */
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
    relationName: "AccountUser",
  }),
}));

/**
 * Session relations
 */
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
    relationName: "SessionUser",
  }),
}));

/**
 * CalendarToken relations
 */
export const calendarTokensRelations = relations(calendarTokens, ({ one }) => ({
  user: one(users, {
    fields: [calendarTokens.userId],
    references: [users.id],
    relationName: "CalendarTokens",
  }),
}));
