/**
 * Drizzle ORM Schema - Barrel Export (SQLite)
 *
 * Mirrors the PG schema barrel export structure.
 */

// Enums (re-exported shared values and types)
export * from "./enums";

// Tables
export * from "./person";
export * from "./relationship";
export * from "./user";
export * from "./event";
export * from "./place";
export * from "./media";
export * from "./backup";
export * from "./misc";
export * from "./notifications";

// Better Auth expects singular table names
export { users as user } from "./user";
export { sessions as session } from "./user";
export { accounts as account } from "./user";
export { verifications as verification } from "./user";

// Dashboard preferences
export { dashboardPreferences, dashboardPreferencesRelations } from "./misc";
