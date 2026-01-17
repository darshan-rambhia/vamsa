/**
 * Server Business Logic Module - Central Export Hub
 *
 * This barrel export provides access to all business logic functions and types.
 * Each module is organized by domain and can be imported individually or as a group.
 *
 * Architecture:
 * - All modules use dependency injection for database access
 * - No framework dependencies (pure business logic)
 * - Full type safety with TypeScript
 *
 * Import patterns:
 * // Import everything
 * import * as vamsaLib from '@vamsa/lib/server/business'
 *
 * // Import specific module
 * import { loginUser, registerUser } from '@vamsa/lib/server/business'
 *
 * // Import with namespace
 * import * as auth from '@vamsa/lib/server/business'
 */

// ============================================================================
// Authentication & Authorization
// ============================================================================
export * from "./auth";
export * from "./auth-oidc";

// ============================================================================
// Backup & Restore
// ============================================================================
export * from "./backup";
export * from "./restore";

// ============================================================================
// Calendar Integration
// ============================================================================
export * from "./calendar";
export * from "./calendar-tokens";
export * from "./token-rotation";

// ============================================================================
// Charts & Visualization
// ============================================================================
export * from "./charts";
export * from "./dashboard";

// ============================================================================
// GEDCOM & Data Import
// ============================================================================
export * from "./claim";
export * from "./gedcom";

// ============================================================================
// Events & Timeline
// ============================================================================
export * from "./events";

// ============================================================================
// Invitations & Sharing
// ============================================================================
export * from "./invites";

// ============================================================================
// Location & Geography
// ============================================================================
export * from "./maps";
export * from "./places";

// ============================================================================
// Media & File Management
// ============================================================================
export * from "./media";

// ============================================================================
// Metrics & Monitoring
// ============================================================================
export * from "./metrics";

// ============================================================================
// Notifications & Alerts
// ============================================================================
export * from "./notifications";

// ============================================================================
// People & Relationships
// ============================================================================
export * from "./persons";
export * from "./relationships";

// ============================================================================
// Settings & Configuration
// ============================================================================
export * from "./settings";

// ============================================================================
// Data Sources & References
// ============================================================================
export * from "./sources";

// ============================================================================
// Suggestions & AI
// ============================================================================
export * from "./suggestions";

// ============================================================================
// User Management
// ============================================================================
export * from "./users";
