import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";

// Get dashboard stats
export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const [
      totalPeople,
      livingPeople,
      deceasedPeople,
      totalRelationships,
      recentAdditions,
    ] = await Promise.all([
      prisma.person.count(),
      prisma.person.count({ where: { isLiving: true } }),
      prisma.person.count({ where: { isLiving: false } }),
      prisma.relationship.count(),
      prisma.person.findMany({
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
);

// Get pending suggestions count
export const getPendingSuggestions = createServerFn({ method: "GET" }).handler(
  async () => {
    const suggestions = await prisma.suggestion.findMany({
      where: { status: "PENDING" },
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return suggestions.map((s) => ({
      id: s.id,
      type: s.type,
      status: s.status,
      reason: s.reason,
      submittedAt: s.submittedAt.getTime(),
      submittedBy: s.submittedBy
        ? { name: s.submittedBy.name, email: s.submittedBy.email }
        : null,
    }));
  }
);

// Activity filter input type
interface ActivityFilters {
  limit?: number;
  dateFrom?: number; // timestamp
  dateTo?: number; // timestamp
  actionTypes?: string[]; // CREATE, UPDATE, DELETE, etc.
  entityTypes?: string[]; // PERSON, RELATIONSHIP, USER, etc.
  userId?: string; // filter by user who performed action
  searchQuery?: string; // free text search
}

// Get recent activity with filters
export const getRecentActivity = createServerFn({ method: "GET" })
  .inputValidator((data: ActivityFilters) => data)
  .handler(async ({ data }) => {
    // Build where clause dynamically - use type assertion to avoid strict type issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Date range filter
    if (data.dateFrom || data.dateTo) {
      where.createdAt = {};
      if (data.dateFrom) {
        where.createdAt.gte = new Date(data.dateFrom);
      }
      if (data.dateTo) {
        where.createdAt.lte = new Date(data.dateTo);
      }
    }

    // Action type filter
    if (data.actionTypes && data.actionTypes.length > 0) {
      where.action = { in: data.actionTypes };
    }

    // Entity type filter
    if (data.entityTypes && data.entityTypes.length > 0) {
      where.entityType = { in: data.entityTypes };
    }

    // User filter
    if (data.userId) {
      where.userId = data.userId;
    }

    // Note: searchQuery would require full-text search capabilities
    // For now, we'll do a basic implementation in the application layer

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: data.limit ?? 50,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // If search query is provided, filter in application layer
    let filteredLogs = logs;
    if (data.searchQuery) {
      const query = data.searchQuery.toLowerCase();
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
  });

// Get available filter options
export const getActivityFilterOptions = createServerFn({
  method: "GET",
}).handler(async () => {
  // Get distinct action types and entity types from audit logs
  const [actionTypes, entityTypes, users] = await Promise.all([
    prisma.auditLog.groupBy({
      by: ["action"],
      _count: true,
    }),
    prisma.auditLog.groupBy({
      by: ["entityType"],
      _count: true,
    }),
    prisma.user.findMany({
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
});

// Helper to format action type for display
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

// Helper to format entity type for display
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
