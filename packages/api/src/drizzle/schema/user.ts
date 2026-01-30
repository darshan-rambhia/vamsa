/**
 * Drizzle ORM Schema - User
 *
 * Defines User, Account, Session, Verification, OAuthState, and CalendarToken models
 */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { profileClaimStatusEnum, userRoleEnum } from "./enums";

/**
 * User table - authentication and profile management
 */
export const users = pgTable(
  "User",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    image: text("image"),
    passwordHash: text("passwordHash"),
    personId: text("personId").unique(),
    role: userRoleEnum("role").notNull().default("VIEWER"),
    isActive: boolean("isActive").notNull().default(true),
    mustChangePassword: boolean("mustChangePassword").notNull().default(false),
    preferredLanguage: text("preferredLanguage").default("en"),
    oidcProvider: text("oidcProvider"),
    oidcSubject: text("oidcSubject"),
    emailVerified: boolean("emailVerified").notNull().default(false),
    profileClaimStatus: profileClaimStatusEnum("profileClaimStatus")
      .notNull()
      .default("PENDING"),
    profileClaimedAt: timestamp("profileClaimedAt", { mode: "date" }),
    invitedById: text("invitedById"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
    lastLoginAt: timestamp("lastLoginAt", { mode: "date" }),
    failedLoginAttempts: integer("failedLoginAttempts").notNull().default(0),
    lockedUntil: timestamp("lockedUntil", { mode: "date" }),
    lastFailedLoginAt: timestamp("lastFailedLoginAt", { mode: "date" }),
    // Use sql`` to match PostgreSQL's exact JSONB normalization (no spaces)
    emailNotificationPreferences: jsonb("emailNotificationPreferences").default(
      sql`'{"newMemberJoined":true,"birthdayReminders":true,"suggestionsCreated":true,"suggestionsUpdated":true}'::jsonb`
    ),
  },
  (table) => [
    // Column order must match database constraint order
    unique("User_oidcProvider_oidcSubject_unique").on(
      table.oidcSubject,
      table.oidcProvider
    ),
    index("idx_user_email").on(table.email),
    index("idx_user_personId").on(table.personId),
    index("idx_user_oidcProvider").on(table.oidcProvider),
  ]
);

/**
 * Account table - OAuth/OIDC account linking
 */
export const accounts = pgTable(
  "Account",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      mode: "date",
    }),
    scope: text("scope"),
    idToken: text("idToken"),
    password: text("password"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_account_userId").on(table.userId),
    unique("Account_providerId_accountId_unique").on(
      table.providerId,
      table.accountId
    ),
  ]
);

/**
 * Verification table - email/identity verification codes
 */
export const verifications = pgTable(
  "Verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [index("idx_verification_identifier").on(table.identifier)]
);

/**
 * Session table - user session management
 */
export const sessions = pgTable(
  "Session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("userId").notNull(),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_session_userId").on(table.userId),
    index("idx_session_expiresAt").on(table.expiresAt),
  ]
);

/**
 * CalendarToken table - calendar API access tokens
 */
export const calendarTokens = pgTable(
  "CalendarToken",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("userId").notNull(),
    name: text("name"),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    isActive: boolean("isActive").notNull().default(true),
    lastUsedAt: timestamp("lastUsedAt", { mode: "date" }),
    rotationPolicy: text("rotationPolicy").notNull().default("annual"),
    rotatedAt: timestamp("rotatedAt", { mode: "date" }),
    rotatedFrom: text("rotatedFrom"),
    scopes: text("scopes").array().default(["calendar:read"]),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
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
 * OAuthState table - OAuth authorization flow state tracking
 */
export const oAuthStates = pgTable(
  "OAuthState",
  {
    id: text("id").primaryKey(),
    state: text("state").notNull().unique(),
    codeVerifier: text("codeVerifier").notNull(),
    provider: text("provider").notNull(),
    redirectTo: text("redirectTo"),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
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
