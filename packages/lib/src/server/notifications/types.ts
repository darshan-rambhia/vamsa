/**
 * Notifications Types
 *
 * Defines types and interfaces for push notification system
 */

export type NotificationType =
  | "birthday_reminder"
  | "new_member"
  | "relationship_suggestion"
  | "collaboration_invite"
  | "general";

export interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, string>;
}

export interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface DeviceTokenRecord {
  token: string;
  platform: "ios" | "android" | "web";
  deviceId?: string;
}

export interface DeviceTokenInput {
  userId: string;
  token: string;
  platform: "ios" | "android" | "web";
  deviceId?: string;
}
