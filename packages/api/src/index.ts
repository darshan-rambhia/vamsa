// Re-export Prisma client and pool utilities
export {
  prisma,
  type PrismaClient,
  getPool,
  getPoolStats,
  shutdown,
} from "./client";

// Re-export generated types from client.ts (Prisma 7 exports from client.ts)
export * from "./generated/prisma/client";

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
