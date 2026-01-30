/**
 * Dashboard Server Functions - Framework Wrappers
 *
 * This module contains thin `createServerFn` wrappers that call the business logic
 * functions from dashboard.server.ts. These wrappers handle:
 * - Input validation with Zod schemas (for POST operations with filters)
 * - Calling the corresponding server function
 * - Authentication (delegated to server layer via requireAuth)
 * - Error handling
 *
 * This layer is excluded from unit test coverage as it's framework integration code.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getActivityFilterOptionsData,
  getDashboardStatsData,
  getRecentActivityData,
} from "@vamsa/lib/server/business";
import { requireAuth } from "./middleware/require-auth";
import type {
  ActivityFilterOption,
  ActivityFilters,
  ActivityLog,
  DashboardStats,
} from "@vamsa/lib/server/business";

// Validation schemas
const activityFiltersSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  dateFrom: z.number().optional(),
  dateTo: z.number().optional(),
  actionTypes: z.array(z.string()).optional(),
  entityTypes: z.array(z.string()).optional(),
  userId: z.string().optional(),
  searchQuery: z.string().optional(),
});

/**
 * Get dashboard statistics - family counts and recent additions
 *
 * GET endpoint that requires authentication. No input needed as this
 * returns aggregate statistics across the entire family database.
 *
 * @returns DashboardStats with totalPeople, livingPeople, deceasedPeople, totalRelationships, recentAdditions
 *
 * @example
 * const stats = await getDashboardStats()
 */
export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardStats> => {
    await requireAuth("VIEWER");
    return getDashboardStatsData();
  }
);

/**
 * Get recent activity logs with optional filtering
 *
 * POST endpoint that requires authentication. Accepts optional filters
 * to narrow down activity logs by date, action type, entity type, user, or search query.
 *
 * Supports filtering by:
 * - Date range (dateFrom, dateTo as timestamps in milliseconds)
 * - Action type(s) (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
 * - Entity type(s) (PERSON, RELATIONSHIP, USER, SETTINGS, etc.)
 * - User who performed the action
 * - Free-text search across descriptions and user names
 *
 * @param filters - Optional activity filters
 * @returns Array of ActivityLog entries
 *
 * @example
 * const logs = await getRecentActivity({
 *   limit: 20,
 *   actionTypes: ['CREATE', 'UPDATE'],
 *   dateFrom: Date.now() - 86400000
 * })
 */
export const getRecentActivity = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof activityFiltersSchema>) => {
    return activityFiltersSchema.parse(data);
  })
  .handler(async ({ data }): Promise<Array<ActivityLog>> => {
    await requireAuth("VIEWER");

    const filters: ActivityFilters = {
      limit: data.limit,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      actionTypes: data.actionTypes,
      entityTypes: data.entityTypes,
      userId: data.userId,
      searchQuery: data.searchQuery,
    };

    return getRecentActivityData(filters);
  });

/**
 * Get available filter options for activity logs
 *
 * GET endpoint that requires authentication. Returns all available options
 * for filtering activity logs (action types, entity types, users with counts).
 *
 * Used to populate filter UI dropdowns and comboboxes.
 *
 * @returns ActivityFilterOption with actionTypes, entityTypes, and users
 *
 * @example
 * const options = await getActivityFilterOptions()
 */
export const getActivityFilterOptions = createServerFn({
  method: "GET",
}).handler(async (): Promise<ActivityFilterOption> => {
  await requireAuth("VIEWER");
  return getActivityFilterOptionsData();
});

/**
 * Get pending suggestions count (legacy function)
 *
 * GET endpoint that requires authentication. Returns list of pending suggestions
 * submitted by family members.
 *
 * @returns Array of pending suggestions with submitter information
 *
 * @example
 * const suggestions = await getPendingSuggestions()
 */
export const getPendingSuggestions = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAuth();

    const { drizzleDb, drizzleSchema } = await import("@vamsa/lib/server");
    const { eq } = await import("drizzle-orm");

    const suggestions = await drizzleDb
      .select({
        id: drizzleSchema.suggestions.id,
        type: drizzleSchema.suggestions.type,
        status: drizzleSchema.suggestions.status,
        reason: drizzleSchema.suggestions.reason,
        submittedAt: drizzleSchema.suggestions.submittedAt,
        submittedBy: {
          name: drizzleSchema.users.name,
          email: drizzleSchema.users.email,
        },
      })
      .from(drizzleSchema.suggestions)
      .leftJoin(
        drizzleSchema.users,
        eq(drizzleSchema.suggestions.submittedById, drizzleSchema.users.id)
      )
      .where(eq(drizzleSchema.suggestions.status, "PENDING"))
      .orderBy(drizzleSchema.suggestions.submittedAt);

    return suggestions.map((s) => ({
      id: s.id,
      type: s.type,
      status: s.status,
      reason: s.reason,
      submittedAt: s.submittedAt?.getTime() ?? 0,
      submittedBy: s.submittedBy?.email
        ? { name: s.submittedBy.name, email: s.submittedBy.email }
        : null,
    }));
  }
);
