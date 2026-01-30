/**
 * Drizzle ORM Schema - Backup
 *
 * Defines Backup and BackupSettings models
 */

import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { backupStatusEnum, backupTypeEnum, storageProviderEnum } from "./enums";

/**
 * Backup table - automated backup records
 */
export const backups = pgTable(
  "Backup",
  {
    id: text("id").primaryKey(),
    filename: text("filename").notNull(),
    type: backupTypeEnum("type").notNull(),
    status: backupStatusEnum("status").notNull().default("PENDING"),
    size: bigint("size", { mode: "number" }),
    location: storageProviderEnum("location").notNull().default("LOCAL"),
    personCount: integer("personCount"),
    relationshipCount: integer("relationshipCount"),
    eventCount: integer("eventCount"),
    mediaCount: integer("mediaCount"),
    duration: integer("duration"),
    error: text("error"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    deletedAt: timestamp("deletedAt", { mode: "date" }),
  },
  (table) => [
    index("idx_backup_type_createdAt").on(table.type, table.createdAt),
    index("idx_backup_status").on(table.status),
    index("idx_backup_createdAt").on(table.createdAt),
  ]
);

/**
 * BackupSettings table - configuration for automated backups
 */
export const backupSettings = pgTable("BackupSettings", {
  id: text("id").primaryKey(),
  dailyEnabled: boolean("dailyEnabled").notNull().default(true),
  dailyTime: text("dailyTime").notNull().default("02:00"),
  weeklyEnabled: boolean("weeklyEnabled").notNull().default(true),
  weeklyDay: integer("weeklyDay").notNull().default(0),
  weeklyTime: text("weeklyTime").notNull().default("03:00"),
  monthlyEnabled: boolean("monthlyEnabled").notNull().default(true),
  monthlyDay: integer("monthlyDay").notNull().default(1),
  monthlyTime: text("monthlyTime").notNull().default("04:00"),
  dailyRetention: integer("dailyRetention").notNull().default(7),
  weeklyRetention: integer("weeklyRetention").notNull().default(4),
  monthlyRetention: integer("monthlyRetention").notNull().default(12),
  storageProvider: storageProviderEnum("storageProvider")
    .notNull()
    .default("LOCAL"),
  storageBucket: text("storageBucket"),
  storageRegion: text("storageRegion"),
  storagePath: text("storagePath").notNull().default("backups"),
  includePhotos: boolean("includePhotos").notNull().default(true),
  includeAuditLogs: boolean("includeAuditLogs").notNull().default(false),
  compressLevel: integer("compressLevel").notNull().default(6),
  notifyOnSuccess: boolean("notifyOnSuccess").notNull().default(false),
  notifyOnFailure: boolean("notifyOnFailure").notNull().default(true),
  notificationEmails: jsonb("notificationEmails"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull(),
});

/**
 * Backup relations
 */
export const backupsRelations = relations(backups, () => ({}));

/**
 * BackupSettings relations
 */
export const backupSettingsRelations = relations(backupSettings, () => ({}));
