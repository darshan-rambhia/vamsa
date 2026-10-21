/**
 * Audit log queries and writes, shared by the backup export (which archives
 * logs since a cutoff), the web backup server functions and the REST API.
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { and, asc, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";
import type { SQL } from "drizzle-orm";

const log = loggers.db;

export type AuditLogsDb = typeof drizzleDb;

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "APPROVE",
  "REJECT",
] as const;
export type AuditActionValue = (typeof AUDIT_ACTIONS)[number];

export interface AuditLogFilters {
  /** Only entries at or after this time */
  since?: Date;
  /** Only entries at or before this time */
  until?: Date;
  userId?: string;
  action?: AuditActionValue;
  entityType?: string;
  /** Page size. Omit to return every match (used by backup export). */
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
}

type AuditLogRow = typeof drizzleSchema.auditLogs.$inferSelect;

export interface AuditLogListResult {
  items: Array<AuditLogRow & { userEmail?: string | null }>;
  total: number;
}

function whereFor(f: AuditLogFilters): SQL | undefined {
  const t = drizzleSchema.auditLogs;
  const conditions = [
    f.since ? gte(t.createdAt, f.since) : undefined,
    f.until ? lte(t.createdAt, f.until) : undefined,
    f.userId ? eq(t.userId, f.userId) : undefined,
    f.action ? eq(t.action, f.action) : undefined,
    f.entityType ? eq(t.entityType, f.entityType) : undefined,
  ].filter((c): c is SQL => c !== undefined);
  return conditions.length ? and(...conditions) : undefined;
}

/**
 * List audit log entries matching the filters.
 *
 * With `limit`, returns one page (newest first by default), the total match
 * count and each entry's user email. Without `limit`, returns all matches as
 * raw rows (oldest first by default), as the backup export needs.
 */
export async function listAuditLogsData(
  filters: AuditLogFilters = {},
  db: AuditLogsDb = drizzleDb
): Promise<AuditLogListResult> {
  const t = drizzleSchema.auditLogs;
  const where = whereFor(filters);
  const paged = filters.limit !== undefined;
  const order = filters.order ?? (paged ? "desc" : "asc");

  const query = db
    .select()
    .from(t)
    .where(where)
    .orderBy(order === "asc" ? asc(t.createdAt) : desc(t.createdAt));

  if (!paged) {
    const items = await query;
    return { items, total: items.length };
  }

  const [items, totals] = await Promise.all([
    query.limit(filters.limit ?? 50).offset(filters.offset ?? 0),
    db.select({ count: count() }).from(t).where(where),
  ]);

  const userIds = [...new Set(items.map((i) => i.userId))];
  const users = userIds.length
    ? await db
        .select({
          id: drizzleSchema.users.id,
          email: drizzleSchema.users.email,
        })
        .from(drizzleSchema.users)
        .where(inArray(drizzleSchema.users.id, userIds))
    : [];
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  return {
    items: items.map((i) => ({
      ...i,
      userEmail: emailById.get(i.userId) ?? null,
    })),
    total: Number(totals[0]?.count ?? 0),
  };
}

export interface AuditLogEntry {
  userId: string;
  action: AuditActionValue;
  entityType: string;
  entityId?: string | null;
  previousData?: unknown;
  newData?: unknown;
}

/**
 * Record an audit entry. Failures are logged, not thrown: an audit write
 * must never fail the operation it describes.
 */
export async function recordAuditLogData(
  entry: AuditLogEntry,
  db: AuditLogsDb = drizzleDb
): Promise<void> {
  try {
    await db.insert(drizzleSchema.auditLogs).values({
      id: crypto.randomUUID(),
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      previousData: entry.previousData ?? null,
      newData: entry.newData ?? null,
    });
  } catch (err) {
    log
      .withErr(err)
      .ctx({ entityType: entry.entityType })
      .msg("Failed to write audit log");
  }
}
