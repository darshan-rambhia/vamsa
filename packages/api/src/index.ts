// Re-export Drizzle ORM client, schema, and pool utilities
// Export inferred types from schema
import type { InferSelectModel } from "drizzle-orm";
import type { backupSettings as backupSettingsTable } from "./drizzle/schema/backup";

export {
  drizzleDb,
  closeDrizzleDb,
  getDrizzlePoolStats,
  type DrizzleDB,
  type DrizzleSchema,
} from "./client";

// Re-export all Drizzle schema for query building
export * as drizzleSchema from "./drizzle/schema";

// Re-export commonly used types from Drizzle schema
export type { backups, backupSettings } from "./drizzle/schema/backup";

// Export enum types for external use
export type BackupType = "DAILY" | "WEEKLY" | "MONTHLY" | "MANUAL";
export type BackupStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "DELETED";
export type StorageProvider = "LOCAL" | "S3" | "R2" | "B2";
export type PersonPlaceType =
  | "BIRTH"
  | "MARRIAGE"
  | "DEATH"
  | "LIVED"
  | "WORKED"
  | "STUDIED"
  | "OTHER";
export type BackupSettings = InferSelectModel<typeof backupSettingsTable>;

// Re-export email service and templates
export {
  emailService,
  EmailService,
  EMAIL_CONFIG,
  DEFAULT_NOTIFICATION_PREFERENCES,
  createSuggestionCreatedEmail,
  createSuggestionUpdatedEmail,
  createNewMemberEmail,
  createBirthdayReminderEmail,
} from "./email";
export type { NotificationPreferences, EmailTemplate } from "./email";
