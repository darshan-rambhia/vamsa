export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || "noreply@vamsa.family",
  apiKey: process.env.RESEND_API_KEY,
  enabled: !!process.env.RESEND_API_KEY,
};

export type NotificationPreferences = {
  suggestionsCreated: boolean;
  suggestionsUpdated: boolean;
  newMemberJoined: boolean;
  birthdayReminders: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  suggestionsCreated: true,
  suggestionsUpdated: true,
  newMemberJoined: true,
  birthdayReminders: true,
};
