/**
 * Drizzle ORM Schema - Enums (SQLite)
 *
 * SQLite doesn't have native enum types. Enum columns use plain `text`
 * with application-layer Zod validation. The shared enum value arrays
 * and types are re-exported for use in validation schemas.
 */

// Re-export all shared enum values and types
export {
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
