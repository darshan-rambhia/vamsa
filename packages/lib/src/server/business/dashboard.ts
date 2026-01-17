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

import { prisma as defaultPrisma } from "../db";
import type { PrismaClient } from "@vamsa/api";

/**
 * Type for the database client used by dashboard functions.
 * This allows dependency injection for testing.
 */
export type DashboardDb = Pick<
  PrismaClient,
  "person" | "relationship" | "auditLog" | "user"
>;

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
  actionTypes?: string[]; // CREATE, UPDATE, DELETE, etc.
  entityTypes?: string[]; // PERSON, RELATIONSHIP, USER, etc.
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
 * @param db - Optional database client (defaults to prisma)
 * @returns DashboardStats with aggregated counts
 *
 * @example
 * const stats = await calculateFamilyStats()
 */
async function calculateFamilyStats(
  db: DashboardDb = defaultPrisma
): Promise<DashboardStats> {
  const [
    totalPeople,
    livingPeople,
    deceasedPeople,
    totalRelationships,
    recentAdditions,
  ] = await Promise.all([
    db.person.count(),
    db.person.count({ where: { isLiving: true } }),
    db.person.count({ where: { isLiving: false } }),
    db.relationship.count(),
    db.person.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    totalPeople,
    livingPeople,
    deceasedPeople,
    totalRelationships,
    recentAdditions: recentAdditions.map((p) => ({
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
 * @param db - Optional database client (defaults to prisma)
 * @returns DashboardStats with family overview
 *
 * @example
 * const stats = await getDashboardStatsData()
 */
export async function getDashboardStatsData(
  db: DashboardDb = defaultPrisma
): Promise<DashboardStats> {
  return calculateFamilyStats(db);
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
 * @param db - Optional database client (defaults to prisma)
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
  filters: ActivityFilters = {},
  db: DashboardDb = defaultPrisma
): Promise<ActivityLog[]> {
  // Build where clause dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(filters.dateTo);
    }
  }

  // Action type filter
  if (filters.actionTypes && filters.actionTypes.length > 0) {
    where.action = { in: filters.actionTypes };
  }

  // Entity type filter
  if (filters.entityTypes && filters.entityTypes.length > 0) {
    where.entityType = { in: filters.entityTypes };
  }

  // User filter
  if (filters.userId) {
    where.userId = filters.userId;
  }

  // Fetch audit logs
  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 50,
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  // Apply search query filter in application layer if provided
  let filteredLogs = logs;
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filteredLogs = logs.filter((log) => {
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
  return filteredLogs.map((log) => ({
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
 * @param db - Optional database client (defaults to prisma)
 * @returns ActivityFilterOption with grouped filter choices
 *
 * @example
 * const options = await getActivityFilterOptionsData()
 */
export async function getActivityFilterOptionsData(
  db: DashboardDb = defaultPrisma
): Promise<ActivityFilterOption> {
  // Get distinct action types, entity types, and users from audit logs
  const [actionTypes, entityTypes, users] = await Promise.all([
    db.auditLog.groupBy({
      by: ["action"],
      _count: true,
    }),
    db.auditLog.groupBy({
      by: ["entityType"],
      _count: true,
    }),
    db.user.findMany({
      select: { id: true, name: true },
      where: {
        auditLogs: { some: {} },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    actionTypes: actionTypes.map((a) => ({
      value: a.action,
      label: formatActionType(a.action),
      count: a._count,
    })),
    entityTypes: entityTypes.map((e) => ({
      value: e.entityType,
      label: formatEntityType(e.entityType),
      count: e._count,
    })),
    users: users.map((u) => ({
      value: u.id,
      label: u.name ?? "Unknown",
    })),
  };
}
