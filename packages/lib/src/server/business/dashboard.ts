/**
 * Dashboard Server Functions - Business Logic for Dashboard Data
 *
 * This module contains the business logic orchestration layer for all dashboard
 * data generation. Each function:
 * - Queries the database for relevant data
 * - Performs data aggregation and calculations
 * - Formats results for frontend consumption
 * - Records metrics for monitoring
 *
 * Exported Functions:
 * - getDashboardStatsData: Calculate family statistics
 * - getRecentActivityData: Generate activity feed from audit logs
 * - calculateFamilyStats: Helper for aggregating stats
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

/**
 * Dashboard statistics result interface
 */
export interface DashboardStats {
  totalPeople: number;
  livingPeople: number;
  deceasedPeople: number;
  totalRelationships: number;
  recentAdditions: Array<{
    id: string;
    firstName: string;
    lastName: string;
    createdAt: number; // timestamp in ms
  }>;
}

/**
 * Activity log result interface
 */
export interface ActivityLog {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  description: string;
  timestamp: number; // timestamp in ms
  user: {
    id: string;
    name: string;
  } | null;
}

/**
 * Activity filter options interface
 */
export interface ActivityFilterOption {
  actionTypes: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  entityTypes: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  users: Array<{
    value: string;
    label: string;
  }>;
}

/**
 * Activity filter input interface
 */
export interface ActivityFilters {
  limit?: number;
  dateFrom?: number; // timestamp
  dateTo?: number; // timestamp
  actionTypes?: Array<string>; // CREATE, UPDATE, DELETE, etc.
  entityTypes?: Array<string>; // PERSON, RELATIONSHIP, USER, etc.
  userId?: string; // filter by user who performed action
  searchQuery?: string; // free text search
}

/**
 * Calculates family statistics - total people, living/deceased, relationships, recent additions
 *
 * Aggregates counts across the entire family database:
 * 1. Total person count
 * 2. Living vs deceased breakdown
 * 3. Total relationship count
 * 4. Last 5 recently added people with timestamps
 *
 * Used by: getDashboardStatsData
 *
 * @returns DashboardStats with aggregated counts
 *
 * @example
 * const stats = await calculateFamilyStats()
 */
async function calculateFamilyStats(): Promise<DashboardStats> {
  const [
    totalPeopleResult,
    livingPeopleResult,
    deceasedPeopleResult,
    totalRelationshipsResult,
    recentAdditions,
  ] = await Promise.all([
    drizzleDb.select({ count: count() }).from(drizzleSchema.persons),
    drizzleDb
      .select({ count: count() })
      .from(drizzleSchema.persons)
      .where(eq(drizzleSchema.persons.isLiving, true)),
    drizzleDb
      .select({ count: count() })
      .from(drizzleSchema.persons)
      .where(eq(drizzleSchema.persons.isLiving, false)),
    drizzleDb.select({ count: count() }).from(drizzleSchema.relationships),
    drizzleDb.query.persons.findMany({
      orderBy: desc(drizzleSchema.persons.createdAt),
      limit: 5,
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPeople = totalPeopleResult[0]?.count ?? 0;
  const livingPeople = livingPeopleResult[0]?.count ?? 0;
  const deceasedPeople = deceasedPeopleResult[0]?.count ?? 0;
  const totalRelationships = totalRelationshipsResult[0]?.count ?? 0;

  return {
    totalPeople,
    livingPeople,
    deceasedPeople,
    totalRelationships,
    recentAdditions: recentAdditions.map((p: (typeof recentAdditions)[0]) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      createdAt: p.createdAt.getTime(),
    })),
  };
}

/**
 * Retrieves dashboard statistics - family counts and recent additions
 *
 * Orchestrates dashboard stat generation by:
 * 1. Calling calculateFamilyStats helper
 * 2. Formatting results for display
 * 3. Recording metrics
 *
 * @returns DashboardStats with family overview
 *
 * @example
 * const stats = await getDashboardStatsData()
 */
export async function getDashboardStatsData(): Promise<DashboardStats> {
  return calculateFamilyStats();
}

/**
 * Helper to format action type for display
 *
 * @param action - Raw action type from audit log
 * @returns Human-readable action label
 *
 * @example
 * formatActionType('CREATE') // => 'Created'
 */
function formatActionType(action: string): string {
  const labels: Record<string, string> = {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
    LOGIN: "Login",
    LOGOUT: "Logout",
    EXPORT: "Export",
    IMPORT: "Import",
    INVITE: "Invite Sent",
    BACKUP: "Backup",
  };
  return labels[action] ?? action.charAt(0) + action.slice(1).toLowerCase();
}

/**
 * Helper to format entity type for display
 *
 * @param entityType - Raw entity type from audit log
 * @returns Human-readable entity label
 *
 * @example
 * formatEntityType('PERSON') // => 'Person'
 */
function formatEntityType(entityType: string): string {
  const labels: Record<string, string> = {
    PERSON: "Person",
    RELATIONSHIP: "Relationship",
    USER: "User",
    SETTINGS: "Settings",
    INVITATION: "Invitation",
    BACKUP: "Backup",
    MEDIA: "Media",
  };
  return (
    labels[entityType] ??
    entityType.charAt(0) + entityType.slice(1).toLowerCase()
  );
}

/**
 * Helper to generate human-readable description from audit log data
 *
 * Converts action, entity type, and new data into a user-friendly description.
 * Handles special cases for PERSON entities to include names.
 *
 * @param action - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param entityType - Entity type (PERSON, RELATIONSHIP, etc.)
 * @param newData - New data from audit log (may include names)
 * @returns Human-readable description
 *
 * @example
 * getActivityDescription('CREATE', 'PERSON', { firstName: 'John', lastName: 'Doe' })
 * // => 'Added John Doe to the family tree'
 */
function getActivityDescription(
  action: string,
  entityType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newData: any
): string {
  const entityName = entityType.charAt(0) + entityType.slice(1).toLowerCase();

  if (action === "CREATE") {
    if (entityType === "PERSON" && newData?.firstName && newData?.lastName) {
      return `Added ${newData.firstName} ${newData.lastName} to the family tree`;
    }
    return `Created a new ${entityName}`;
  }

  if (action === "UPDATE") {
    if (entityType === "PERSON" && newData?.firstName && newData?.lastName) {
      return `Updated ${newData.firstName} ${newData.lastName}'s profile`;
    }
    return `Updated a ${entityName}`;
  }

  if (action === "DELETE") {
    return `Removed a ${entityName}`;
  }

  if (action === "LOGIN") {
    return "Logged in";
  }

  if (action === "LOGOUT") {
    return "Logged out";
  }

  return `${action} ${entityName}`;
}

/**
 * Retrieves recent activity logs with optional filtering
 *
 * Orchestrates activity data generation by:
 * 1. Building dynamic where clause from filters
 * 2. Querying audit logs from database
 * 3. Applying optional application-layer search
 * 4. Formatting results for display
 * 5. Recording metrics
 *
 * Supports filtering by:
 * - Date range (dateFrom, dateTo as timestamps)
 * - Action type(s) (CREATE, UPDATE, DELETE, etc.)
 * - Entity type(s) (PERSON, RELATIONSHIP, etc.)
 * - User who performed action
 * - Free-text search (applied in application layer)
 *
 * @param filters - Optional activity filters
 * @returns Array of formatted activity logs
 *
 * @example
 * const logs = await getRecentActivityData({
 *   limit: 20,
 *   actionTypes: ['CREATE', 'UPDATE'],
 *   dateFrom: Date.now() - 86400000 // last 24 hours
 * })
 */
export async function getRecentActivityData(
  filters: ActivityFilters = {}
): Promise<Array<ActivityLog>> {
  // Build where clause dynamically - collect all conditions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereConditions: Array<any> = [];

  // Date range filter
  if (filters.dateFrom) {
    whereConditions.push(
      sql`${drizzleSchema.auditLogs.createdAt} >= ${new Date(filters.dateFrom)}`
    );
  }
  if (filters.dateTo) {
    whereConditions.push(
      sql`${drizzleSchema.auditLogs.createdAt} <= ${new Date(filters.dateTo)}`
    );
  }

  // Action type filter
  if (filters.actionTypes && filters.actionTypes.length > 0) {
    whereConditions.push(
      inArray(
        drizzleSchema.auditLogs.action,
        filters.actionTypes as Array<
          | "CREATE"
          | "UPDATE"
          | "DELETE"
          | "LOGIN"
          | "LOGOUT"
          | "APPROVE"
          | "REJECT"
        >
      )
    );
  }

  // Entity type filter
  if (filters.entityTypes && filters.entityTypes.length > 0) {
    whereConditions.push(
      inArray(drizzleSchema.auditLogs.entityType, filters.entityTypes)
    );
  }

  // User filter
  if (filters.userId) {
    whereConditions.push(eq(drizzleSchema.auditLogs.userId, filters.userId));
  }

  // Fetch audit logs
  const logs = await drizzleDb.query.auditLogs.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    orderBy: desc(drizzleSchema.auditLogs.createdAt),
    limit: filters.limit ?? 50,
    with: {
      user: {
        columns: { id: true, name: true },
      },
    },
  });

  // Apply search query filter in application layer if provided
  let filteredLogs = logs;
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filteredLogs = logs.filter((log: (typeof logs)[0]) => {
      const description = getActivityDescription(
        log.action,
        log.entityType,
        log.newData
      ).toLowerCase();
      const userName = log.user?.name?.toLowerCase() ?? "";
      return description.includes(query) || userName.includes(query);
    });
  }

  // Format results
  return filteredLogs.map((log: (typeof logs)[0]) => ({
    id: log.id,
    actionType: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    description: getActivityDescription(
      log.action,
      log.entityType,
      log.newData
    ),
    timestamp: log.createdAt.getTime(),
    user: log.user
      ? { id: log.user.id, name: log.user.name ?? "Unknown" }
      : null,
  }));
}

/**
 * Retrieves available filter options for activity logs
 *
 * Aggregates distinct values from audit logs:
 * 1. All unique action types with counts
 * 2. All unique entity types with counts
 * 3. All users who have performed actions
 *
 * Used to populate filter UI controls.
 *
 * @returns ActivityFilterOption with grouped filter choices
 *
 * @example
 * const options = await getActivityFilterOptionsData()
 */
export async function getActivityFilterOptionsData(): Promise<ActivityFilterOption> {
  // Get all audit logs to aggregate action and entity types
  const allLogs = await drizzleDb.query.auditLogs.findMany();

  // Aggregate action types with counts
  const actionTypeMap = new Map<string, number>();
  const entityTypeMap = new Map<string, number>();

  allLogs.forEach((log) => {
    actionTypeMap.set(log.action, (actionTypeMap.get(log.action) ?? 0) + 1);
    entityTypeMap.set(
      log.entityType,
      (entityTypeMap.get(log.entityType) ?? 0) + 1
    );
  });

  // Get all users who have performed actions
  const usersWithLogs = await drizzleDb.query.users.findMany({
    columns: { id: true, name: true },
    orderBy: asc(drizzleSchema.users.name),
  });

  // Filter users to only those who have audit logs
  const userIdSet = new Set(allLogs.map((log) => log.userId));
  const usersInLogs = usersWithLogs.filter((u) => userIdSet.has(u.id));

  return {
    actionTypes: Array.from(actionTypeMap.entries()).map(
      ([action, count]: [string, number]) => ({
        value: action,
        label: formatActionType(action),
        count,
      })
    ),
    entityTypes: Array.from(entityTypeMap.entries()).map(
      ([entityType, count]: [string, number]) => ({
        value: entityType,
        label: formatEntityType(entityType),
        count,
      })
    ),
    users: usersInLogs.map((u: (typeof usersInLogs)[0]) => ({
      value: u.id,
      label: u.name ?? "Unknown",
    })),
  };
}
