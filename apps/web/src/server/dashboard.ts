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

// Get recent activity
export const getRecentActivity = createServerFn({ method: "GET" })
  .inputValidator((data: { limit?: number }) => data)
  .handler(async ({ data }) => {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: data.limit ?? 50,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return logs.map((log) => ({
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
