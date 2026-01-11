export { emailService, EmailService } from "./service";
export { EMAIL_CONFIG, DEFAULT_NOTIFICATION_PREFERENCES } from "./config";
export type { NotificationPreferences } from "./config";
export {
  createSuggestionCreatedEmail,
  createSuggestionUpdatedEmail,
  createNewMemberEmail,
  createBirthdayReminderEmail,
} from "./templates";
export type { EmailTemplate } from "./templates";
