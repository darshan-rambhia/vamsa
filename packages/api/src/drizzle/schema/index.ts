/**
 * Drizzle ORM Schema - Barrel Export
 *
 * Exports all schema tables, enums, and relations
 */

// Enums
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

// Better Auth expects singular table names (user, session, account, verification)
// Export aliases to support Better Auth's Drizzle adapter
export { users as user } from "./user";
export { sessions as session } from "./user";
export { accounts as account } from "./user";
export { verifications as verification } from "./user";

// Dashboard preferences
export { dashboardPreferences, dashboardPreferencesRelations } from "./misc";
