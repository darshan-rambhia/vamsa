/**
 * Shared Enum Value Arrays
 *
 * These arrays define the allowed values for all database enums.
 * They are shared between the PostgreSQL schema (which uses pgEnum)
 * and the future SQLite schema (which uses text columns with
 * application-layer Zod validation).
 *
 * Each array is exported as a `const` tuple for type safety.
 */

// -- Person --

export const GENDER_VALUES = [
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
] as const;
export type Gender = (typeof GENDER_VALUES)[number];

// -- User --

export const USER_ROLE_VALUES = ["ADMIN", "MEMBER", "VIEWER"] as const;
export type UserRole = (typeof USER_ROLE_VALUES)[number];

// -- Relationship --

export const RELATIONSHIP_TYPE_VALUES = [
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
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPE_VALUES)[number];

// -- Suggestion --

export const SUGGESTION_TYPE_VALUES = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ADD_RELATIONSHIP",
] as const;
export type SuggestionType = (typeof SUGGESTION_TYPE_VALUES)[number];

export const SUGGESTION_STATUS_VALUES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUS_VALUES)[number];

// -- Privacy --

export const PRIVACY_LEVEL_VALUES = [
  "PUBLIC",
  "MEMBERS_ONLY",
  "ADMIN_ONLY",
] as const;
export type PrivacyLevel = (typeof PRIVACY_LEVEL_VALUES)[number];

// -- Audit --

export const AUDIT_ACTION_VALUES = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "APPROVE",
  "REJECT",
] as const;
export type AuditAction = (typeof AUDIT_ACTION_VALUES)[number];

// -- Invite --

export const INVITE_STATUS_VALUES = [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
] as const;
export type InviteStatus = (typeof INVITE_STATUS_VALUES)[number];

// -- Profile Claim --

export const PROFILE_CLAIM_STATUS_VALUES = [
  "PENDING",
  "CLAIMED",
  "SKIPPED",
  "NA",
] as const;
export type ProfileClaimStatus = (typeof PROFILE_CLAIM_STATUS_VALUES)[number];

// -- Event --

export const EVENT_TYPE_VALUES = [
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
] as const;
export type EventType = (typeof EVENT_TYPE_VALUES)[number];

// -- Place --

export const PLACE_TYPE_VALUES = [
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
] as const;
export type PlaceType = (typeof PLACE_TYPE_VALUES)[number];

export const PERSON_PLACE_TYPE_VALUES = [
  "BIRTH",
  "MARRIAGE",
  "DEATH",
  "LIVED",
  "WORKED",
  "STUDIED",
  "OTHER",
] as const;
export type PersonPlaceType = (typeof PERSON_PLACE_TYPE_VALUES)[number];

// -- Backup --

export const BACKUP_STATUS_VALUES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "DELETED",
] as const;
export type BackupStatus = (typeof BACKUP_STATUS_VALUES)[number];

export const BACKUP_TYPE_VALUES = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "MANUAL",
] as const;
export type BackupType = (typeof BACKUP_TYPE_VALUES)[number];

// -- Storage --

export const STORAGE_PROVIDER_VALUES = ["LOCAL", "S3", "R2", "B2"] as const;
export type StorageProvider = (typeof STORAGE_PROVIDER_VALUES)[number];
