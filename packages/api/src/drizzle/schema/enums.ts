/**
 * Drizzle ORM Schema - Enums (PostgreSQL)
 *
 * All 15 database enums as pgEnum, importing values from the shared
 * enum-values module. The shared module is the single source of truth
 * for enum values, used by both PG and (future) SQLite schemas.
 */

import { pgEnum } from "drizzle-orm/pg-core";
import {
  AUDIT_ACTION_VALUES,
  BACKUP_STATUS_VALUES,
  BACKUP_TYPE_VALUES,
  EVENT_TYPE_VALUES,
  GENDER_VALUES,
  INVITE_STATUS_VALUES,
  PERSON_PLACE_TYPE_VALUES,
  PLACE_TYPE_VALUES,
  PRIVACY_LEVEL_VALUES,
  PROFILE_CLAIM_STATUS_VALUES,
  RELATIONSHIP_TYPE_VALUES,
  STORAGE_PROVIDER_VALUES,
  SUGGESTION_STATUS_VALUES,
  SUGGESTION_TYPE_VALUES,
  USER_ROLE_VALUES,
} from "../schema-shared/enum-values";

// Re-export shared types for convenience
export type {
  AuditAction,
  BackupStatus,
  BackupType,
  EventType,
  Gender,
  InviteStatus,
  PersonPlaceType,
  PlaceType,
  PrivacyLevel,
  ProfileClaimStatus,
  RelationshipType,
  StorageProvider,
  SuggestionStatus,
  SuggestionType,
  UserRole,
} from "../schema-shared/enum-values";

export const genderEnum = pgEnum("Gender", [...GENDER_VALUES]);
export const userRoleEnum = pgEnum("UserRole", [...USER_ROLE_VALUES]);
export const relationshipTypeEnum = pgEnum("RelationshipType", [
  ...RELATIONSHIP_TYPE_VALUES,
]);
export const suggestionTypeEnum = pgEnum("SuggestionType", [
  ...SUGGESTION_TYPE_VALUES,
]);
export const suggestionStatusEnum = pgEnum("SuggestionStatus", [
  ...SUGGESTION_STATUS_VALUES,
]);
export const privacyLevelEnum = pgEnum("PrivacyLevel", [
  ...PRIVACY_LEVEL_VALUES,
]);
export const auditActionEnum = pgEnum("AuditAction", [...AUDIT_ACTION_VALUES]);
export const inviteStatusEnum = pgEnum("InviteStatus", [
  ...INVITE_STATUS_VALUES,
]);
export const profileClaimStatusEnum = pgEnum("ProfileClaimStatus", [
  ...PROFILE_CLAIM_STATUS_VALUES,
]);
export const eventTypeEnum = pgEnum("EventType", [...EVENT_TYPE_VALUES]);
export const placeTypeEnum = pgEnum("PlaceType", [...PLACE_TYPE_VALUES]);
export const personPlaceTypeEnum = pgEnum("PersonPlaceType", [
  ...PERSON_PLACE_TYPE_VALUES,
]);
export const backupStatusEnum = pgEnum("BackupStatus", [
  ...BACKUP_STATUS_VALUES,
]);
export const backupTypeEnum = pgEnum("BackupType", [...BACKUP_TYPE_VALUES]);
export const storageProviderEnum = pgEnum("StorageProvider", [
  ...STORAGE_PROVIDER_VALUES,
]);
