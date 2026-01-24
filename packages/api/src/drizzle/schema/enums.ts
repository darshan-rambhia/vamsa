/**
 * Drizzle ORM Schema - Enums
 *
 * All 15 enums from Prisma schema mapped to pgEnum
 */

import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Gender enum
 */
export const genderEnum = pgEnum("Gender", [
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
]);

/**
 * User role enum
 */
export const userRoleEnum = pgEnum("UserRole", ["ADMIN", "MEMBER", "VIEWER"]);

/**
 * Relationship type enum
 */
export const relationshipTypeEnum = pgEnum("RelationshipType", [
  "PARENT",
  "CHILD",
  "SPOUSE",
  "SIBLING",
  "PARENT_IN_LAW",
  "CHILD_IN_LAW",
  "SIBLING_IN_LAW",
  "STEP_PARENT",
  "STEP_CHILD",
  "STEP_SIBLING",
]);

/**
 * Suggestion type enum
 */
export const suggestionTypeEnum = pgEnum("SuggestionType", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ADD_RELATIONSHIP",
]);

/**
 * Suggestion status enum
 */
export const suggestionStatusEnum = pgEnum("SuggestionStatus", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

/**
 * Privacy level enum
 */
export const privacyLevelEnum = pgEnum("PrivacyLevel", [
  "PUBLIC",
  "MEMBERS_ONLY",
  "ADMIN_ONLY",
]);

/**
 * Audit action enum
 */
export const auditActionEnum = pgEnum("AuditAction", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "APPROVE",
  "REJECT",
]);

/**
 * Invite status enum
 */
export const inviteStatusEnum = pgEnum("InviteStatus", [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
]);

/**
 * Profile claim status enum
 */
export const profileClaimStatusEnum = pgEnum("ProfileClaimStatus", [
  "PENDING",
  "CLAIMED",
  "SKIPPED",
  "NA",
]);

/**
 * Event type enum
 */
export const eventTypeEnum = pgEnum("EventType", [
  "BIRTH",
  "DEATH",
  "MARRIAGE",
  "DIVORCE",
  "BURIAL",
  "GRADUATION",
  "ENGAGEMENT",
  "DIVORCE_FILED",
  "ADOPTION",
  "CONFIRMATION",
  "IMMIGRATION",
  "EMIGRATION",
  "NATURALIZATION",
  "RESIDENCE",
  "CUSTOM",
]);

/**
 * Place type enum
 */
export const placeTypeEnum = pgEnum("PlaceType", [
  "COUNTRY",
  "STATE",
  "COUNTY",
  "CITY",
  "TOWN",
  "VILLAGE",
  "PARISH",
  "DISTRICT",
  "REGION",
  "PROVINCE",
  "TERRITORY",
  "OTHER",
]);

/**
 * Person place type enum
 */
export const personPlaceTypeEnum = pgEnum("PersonPlaceType", [
  "BIRTH",
  "MARRIAGE",
  "DEATH",
  "LIVED",
  "WORKED",
  "STUDIED",
  "OTHER",
]);

/**
 * Backup status enum
 */
export const backupStatusEnum = pgEnum("BackupStatus", [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "DELETED",
]);

/**
 * Backup type enum
 */
export const backupTypeEnum = pgEnum("BackupType", [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "MANUAL",
]);

/**
 * Storage provider enum
 */
export const storageProviderEnum = pgEnum("StorageProvider", [
  "LOCAL",
  "S3",
  "R2",
  "B2",
]);
