/**
 * Drizzle ORM Schema - Backup (SQLite)
 */

import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const backups = sqliteTable(
  "Backup",
  {
    id: text("id").primaryKey(),
    filename: text("filename").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("PENDING"),
    // SQLite has no bigint; integer handles up to 2^53 which is fine for file sizes
    size: integer("size"),
    location: text("location").notNull().default("LOCAL"),
    personCount: integer("personCount"),
    relationshipCount: integer("relationshipCount"),
    eventCount: integer("eventCount"),
    mediaCount: integer("mediaCount"),
    duration: integer("duration"),
    error: text("error"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    deletedAt: integer("deletedAt", { mode: "timestamp" }),
  },
  (table) => [
    index("idx_backup_type_createdAt").on(table.type, table.createdAt),
    index("idx_backup_status").on(table.status),
    index("idx_backup_createdAt").on(table.createdAt),
  ]
);

export const backupSettings = sqliteTable("BackupSettings", {
  id: text("id").primaryKey(),
  dailyEnabled: integer("dailyEnabled", { mode: "boolean" })
    .notNull()
    .default(true),
  dailyTime: text("dailyTime").notNull().default("02:00"),
  weeklyEnabled: integer("weeklyEnabled", { mode: "boolean" })
    .notNull()
    .default(true),
  weeklyDay: integer("weeklyDay").notNull().default(0),
  weeklyTime: text("weeklyTime").notNull().default("03:00"),
  monthlyEnabled: integer("monthlyEnabled", { mode: "boolean" })
    .notNull()
    .default(true),
  monthlyDay: integer("monthlyDay").notNull().default(1),
  monthlyTime: text("monthlyTime").notNull().default("04:00"),
  dailyRetention: integer("dailyRetention").notNull().default(7),
  weeklyRetention: integer("weeklyRetention").notNull().default(4),
  monthlyRetention: integer("monthlyRetention").notNull().default(12),
  storageProvider: text("storageProvider").notNull().default("LOCAL"),
  storageBucket: text("storageBucket"),
  storageRegion: text("storageRegion"),
  storagePath: text("storagePath").notNull().default("backups"),
  includePhotos: integer("includePhotos", { mode: "boolean" })
    .notNull()
    .default(true),
  includeAuditLogs: integer("includeAuditLogs", { mode: "boolean" })
    .notNull()
    .default(false),
  compressLevel: integer("compressLevel").notNull().default(6),
  notifyOnSuccess: integer("notifyOnSuccess", { mode: "boolean" })
    .notNull()
    .default(false),
  notifyOnFailure: integer("notifyOnFailure", { mode: "boolean" })
    .notNull()
    .default(true),
  notificationEmails: text("notificationEmails", { mode: "json" }),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const backupsRelations = relations(backups, () => ({}));

export const backupSettingsRelations = relations(backupSettings, () => ({}));
