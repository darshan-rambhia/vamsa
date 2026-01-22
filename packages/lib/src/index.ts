// Date utilities
export {
  parseDateString,
  formatDate,
  formatDateForInput,
  calculateAge,
  createDateOnly,
  toDateOnly,
} from "./date";

// General utilities
export { generateRandomPassword, getInitials } from "./utils";

// Event utilities
export {
  mapGedcomTagToEventType,
  mapEventTypeToGedcomTag,
  getEventTypeLabel,
  type EventType,
  GEDCOM_TO_EVENT_TYPE,
  EVENT_TYPE_TO_GEDCOM,
  EVENT_TYPE_LABELS,
} from "./event";

// GEDCOM support
export * from "./gedcom";

// Logging
export {
  logger,
  createContextLogger,
  createRequestLogger,
  startTimer,
  serializeError,
} from "./logger";

// Backup utilities (re-exported from backup/index.ts)
export * from "./backup/index";

// NOTE: ETag utilities have been moved to server.ts
// Import from '@vamsa/lib/server' to use server-only utilities

// Relationship utilities
export {
  type RelationshipType,
  type Gender,
  type RelationshipCategory,
  type InLawCreationPlan,
  BLOOD_RELATIONSHIPS,
  MARRIAGE_RELATIONSHIPS,
  INLAW_RELATIONSHIPS,
  STEP_RELATIONSHIPS,
  ALL_RELATIONSHIP_TYPES,
  isBloodRelationship,
  isInlawRelationship,
  isStepRelationship,
  isDerivedRelationship,
  getRelationshipCategory,
  getRelationshipLabel,
  getInverseRelationship,
  RELATIONSHIP_TYPE_OPTIONS,
  getRelationshipOptions,
  canCoexist,
} from "./relationships";

// PostgreSQL Full-Text Search utilities
export {
  type SearchConfig,
  type SearchResult,
  type SearchResults,
  sanitizeQuery,
  buildTsQuery,
  buildPersonSearchQuery,
  buildPersonSearchCountQuery,
  buildFuzzyPersonSearchQuery,
  buildCombinedSearchQuery,
  SEARCH_FIELD_WEIGHTS,
  CREATE_TRGM_EXTENSION_SQL,
  CREATE_PERSON_SEARCH_INDEX_SQL,
  CREATE_PERSON_TRGM_INDEX_SQL,
} from "./search";

// Profile claiming utilities for OIDC users
export {
  type ProfileClaimStatus,
  type ClaimableProfile,
  type ClaimingUser,
  type ProfileMatch,
  scoreProfileMatch,
  findSuggestedMatches,
  isConfidentMatch,
  getBestMatch,
  groupProfilesByMatch,
  validateClaim,
  getClaimStatusText,
  shouldShowClaimModal,
} from "./profile-claim";

// Chart utilities (platform-agnostic)
export * from "./charts";

// Fixtures for testing and stories
export * from "./fixtures";
