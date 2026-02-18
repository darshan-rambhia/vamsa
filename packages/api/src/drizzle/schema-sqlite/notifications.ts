/**
 * Drizzle ORM Schema - Notifications (SQLite)
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./user";

export const deviceTokens = sqliteTable(
  "DeviceToken",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    // varchar maps to text in SQLite
    token: text("token").notNull(),
    platform: text("platform").notNull(),
    deviceId: text("deviceId"),
    isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("idx_deviceToken_userId").on(table.userId),
    index("idx_deviceToken_isActive").on(table.isActive),
    index("idx_deviceToken_userId_isActive").on(table.userId, table.isActive),
    index("idx_deviceToken_deviceId").on(table.deviceId),
  ]
);

export const notifications = sqliteTable(
  "Notification",
  {
    id: text("id").primaryKey(),
    userId: text("userId").notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: text("data", { mode: "json" }),
    readAt: integer("readAt", { mode: "timestamp" }),
    sentAt: integer("sentAt", { mode: "timestamp" }),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("idx_notification_userId").on(table.userId),
    index("idx_notification_type").on(table.type),
    index("idx_notification_createdAt").on(table.createdAt),
    index("idx_notification_userId_readAt").on(table.userId, table.readAt),
  ]
);

export const deviceTokensRelations = relations(deviceTokens, ({ one }) => ({
  user: one(users, {
    fields: [deviceTokens.userId],
    references: [users.id],
    relationName: "DeviceTokens",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "Notifications",
  }),
}));
