/**
 * Drizzle ORM Schema - Notifications
 *
 * Defines NotificationDeviceToken and Notification models for push notification system
 */

import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

/**
 * Device Tokens table - stores push notification tokens for each device
 */
export const deviceTokens = pgTable(
  "DeviceToken",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    token: varchar("token", { length: 512 }).notNull(),
    platform: varchar("platform", { length: 20 }).notNull(), // "ios", "android", "web"
    deviceId: varchar("deviceId", { length: 255 }), // Unique device identifier
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_deviceToken_userId").on(table.userId),
    index("idx_deviceToken_isActive").on(table.isActive),
    index("idx_deviceToken_userId_isActive").on(table.userId, table.isActive),
    index("idx_deviceToken_deviceId").on(table.deviceId),
  ]
);

/**
 * Notifications table - stores notification history and delivery status
 */
export const notifications = pgTable(
  "Notification",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    type: varchar("type", { length: 50 }).notNull(), // "birthday_reminder", "new_member", "invite", etc.
    title: varchar("title", { length: 255 }).notNull(),
    body: varchar("body", { length: 1024 }).notNull(),
    data: jsonb("data"), // Additional payload data
    readAt: timestamp("readAt", { mode: "date" }),
    sentAt: timestamp("sentAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notification_userId").on(table.userId),
    index("idx_notification_type").on(table.type),
    index("idx_notification_createdAt").on(table.createdAt),
    index("idx_notification_userId_readAt").on(table.userId, table.readAt),
  ]
);

/**
 * Device Tokens relations
 */
export const deviceTokensRelations = relations(deviceTokens, ({ one }) => ({
  user: one(users, {
    fields: [deviceTokens.userId],
    references: [users.id],
    relationName: "DeviceTokens",
  }),
}));

/**
 * Notifications relations
 */
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "Notifications",
  }),
}));
