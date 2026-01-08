import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { requireAuth, requireAdmin } from "./auth";
import { Id } from "./_generated/dataModel";

const actionTypeArg = v.union(
  v.literal("CREATE"),
  v.literal("UPDATE"),
  v.literal("DELETE"),
  v.literal("LOGIN"),
  v.literal("LOGOUT"),
  v.literal("IMPORT"),
  v.literal("EXPORT"),
  v.literal("BACKUP_CREATED"),
  v.literal("BACKUP_RESTORED")
);

const entityTypeArg = v.union(
  v.literal("PERSON"),
  v.literal("RELATIONSHIP"),
  v.literal("USER"),
  v.literal("SUGGESTION"),
  v.literal("SETTINGS"),
  v.literal("SYSTEM")
);

/**
 * List audit logs with optional filters
 */
export const list = query({
  args: {
    token: v.string(),
    entityType: v.optional(entityTypeArg),
    actionType: v.optional(actionTypeArg),
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    daysAgo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const limit = args.limit ?? 50;
    let logsQuery = ctx.db.query("auditLogs").order("desc");

    // Apply time filter if specified
    if (args.daysAgo) {
      const cutoffTime = Date.now() - args.daysAgo * 24 * 60 * 60 * 1000;
      logsQuery = ctx.db
        .query("auditLogs")
        .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoffTime))
        .order("desc");
    }

    const logs = await logsQuery.take(limit + 1);

    // Filter in memory for entity/action type (Convex doesn't support multiple index filters easily)
    let filtered = logs;
    if (args.entityType) {
      filtered = filtered.filter((l) => l.entityType === args.entityType);
    }
    if (args.actionType) {
      filtered = filtered.filter((l) => l.actionType === args.actionType);
    }
    if (args.userId) {
      filtered = filtered.filter((l) => l.userId === args.userId);
    }

    const hasMore = filtered.length > limit;
    const items = filtered.slice(0, limit);

    // Enrich with user data
    const enriched = await Promise.all(
      items.map(async (log) => {
        const user = log.userId ? await ctx.db.get(log.userId) : null;
        return {
          ...log,
          user: user
            ? { id: user._id, email: user.email, name: user.name }
            : null,
        };
      })
    );

    return {
      items: enriched,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]._id : undefined,
    };
  },
});

/**
 * Get a single audit log entry
 */
export const get = query({
  args: {
    token: v.string(),
    id: v.id("auditLogs"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    return await ctx.db.get(args.id);
  },
});

/**
 * Create an audit log entry (internal use)
 */
export const create = mutation({
  args: {
    token: v.string(),
    actionType: actionTypeArg,
    entityType: entityTypeArg,
    entityId: v.optional(v.string()),
    description: v.string(),
    oldData: v.optional(v.any()),
    newData: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const logId = await ctx.db.insert("auditLogs", {
      actionType: args.actionType,
      entityType: args.entityType,
      entityId: args.entityId,
      description: args.description,
      oldData: args.oldData,
      newData: args.newData,
      userId: user._id,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      timestamp: Date.now(),
    });

    return logId;
  },
});

/**
 * Helper function to log actions from other mutations
 * Call this from within other Convex functions
 */
export async function logAction(
  ctx: MutationCtx,
  userId: Id<"users"> | null,
  params: {
    actionType:
      | "CREATE"
      | "UPDATE"
      | "DELETE"
      | "LOGIN"
      | "LOGOUT"
      | "IMPORT"
      | "EXPORT"
      | "BACKUP_CREATED"
      | "BACKUP_RESTORED";
    entityType:
      | "PERSON"
      | "RELATIONSHIP"
      | "USER"
      | "SUGGESTION"
      | "SETTINGS"
      | "SYSTEM";
    entityId?: string;
    description: string;
    oldData?: unknown;
    newData?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Id<"auditLogs">> {
  return await ctx.db.insert("auditLogs", {
    actionType: params.actionType,
    entityType: params.entityType,
    entityId: params.entityId,
    description: params.description,
    oldData: params.oldData,
    newData: params.newData,
    userId: userId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    timestamp: Date.now(),
  });
}

/**
 * Delete old audit logs - admin only
 */
export const deleteOld = mutation({
  args: {
    token: v.string(),
    daysToKeep: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const cutoffTime = Date.now() - args.daysToKeep * 24 * 60 * 60 * 1000;

    // Get logs older than cutoff
    const oldLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", cutoffTime))
      .collect();

    // Delete in batches
    let deleted = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deleted++;
    }

    return { deleted };
  },
});

/**
 * Get audit log statistics
 */
export const getStats = query({
  args: {
    token: v.string(),
    daysAgo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const daysAgo = args.daysAgo ?? 30;
    const cutoffTime = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoffTime))
      .collect();

    // Group by action type
    const byAction: Record<string, number> = {};
    const byEntity: Record<string, number> = {};

    for (const log of logs) {
      byAction[log.actionType] = (byAction[log.actionType] ?? 0) + 1;
      byEntity[log.entityType] = (byEntity[log.entityType] ?? 0) + 1;
    }

    return {
      total: logs.length,
      byActionType: byAction,
      byEntityType: byEntity,
      period: `${daysAgo} days`,
    };
  },
});
