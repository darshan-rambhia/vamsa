import { readFileSync } from "node:fs";
import { group, leaf } from "../lib/command";
import { YES_FLAG } from "../lib/confirm";
import { intFlag, str } from "../lib/context";
import { CliError, EXIT_ERROR, usageError } from "../lib/errors";
import { resolvePath, size, writeOutput } from "../lib/files";
import { LIST_FLAGS, enumFlag, printList } from "../lib/resource";
import type { Ctx } from "../lib/context";
import type { Row } from "../lib/resource";

const STRATEGIES = ["SKIP", "REPLACE", "MERGE"] as const;
const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "APPROVE",
  "REJECT",
] as const;

function readZipFile(ctx: Ctx, file: string): Uint8Array {
  const path = resolvePath(ctx, file);
  try {
    return new Uint8Array(readFileSync(path));
  } catch {
    throw new CliError(
      "file_not_found",
      `No such file: ${path}`,
      "check the path"
    );
  }
}

const create = leaf({
  name: "create",
  description: "Create a backup and download the ZIP",
  args: {
    output: {
      type: "string",
      alias: "o",
      description: "Output file, or - for stdout (default: server file name)",
      valueHint: "file",
    },
    photos: {
      type: "boolean",
      description: "Include photos (--no-photos to skip)",
    },
    audit: {
      type: "boolean",
      description: "Include audit logs (--no-audit to skip)",
    },
    "audit-days": {
      type: "string",
      description: "Days of audit log to include (default 90)",
      valueHint: "n",
    },
    force: { type: "boolean", description: "Overwrite an existing file" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const body = {
      includePhotos: args.photos !== false,
      includeAuditLogs: args.audit !== false,
      auditLogDays:
        intFlag(args["audit-days"], "audit-days", { max: 365 }) ?? 90,
    };
    const dl = await ctx.api.fetchBytes("POST", "/admin/backups", { body });
    const out = str(args.output);
    if (out === "-") {
      ctx.rt.stdoutBytes(dl.bytes);
      return;
    }
    const target = out ?? dl.fileName ?? "vamsa-backup.zip";
    const path = writeOutput(ctx, target, dl.bytes, Boolean(args.force));
    let stats: Row = {};
    try {
      stats = JSON.parse(
        dl.headers?.get("x-vamsa-backup-statistics") ?? "{}"
      ) as Row;
    } catch {
      // stats header is informational only
    }
    ctx.print({
      backup: {
        file: path,
        size: size(dl.bytes.length),
        people: stats.totalPeople ?? null,
        relationships: stats.totalRelationships ?? null,
        users: stats.totalUsers ?? null,
        auditLogs: stats.totalAuditLogs ?? null,
      },
      help: [`vamsa admin backup validate ${target}`],
    });
  },
});

const list = leaf({
  name: "list",
  description: "List stored backups",
  args: {
    limit: { type: "string", description: "Rows (default 20)", valueHint: "n" },
    page: { type: "string", description: "Page (default 1)", valueHint: "n" },
    ...LIST_FLAGS,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const limit = intFlag(args.limit, "limit", { max: 100 }) ?? 20;
    const page = intFlag(args.page, "page") ?? 1;
    const { data } = await ctx.api.request<{
      items: Array<Row>;
      total: number;
    }>("GET", "/admin/backups", {
      query: { limit, offset: (page - 1) * limit },
    });
    printList(ctx, {
      name: "backups",
      items: data.items,
      total: data.total,
      defaults: ["id", "filename", "status", "createdAt"],
      empty: "No stored backups (scheduled backups appear here).",
      help: ["vamsa admin backup create -o backup.zip"],
    });
  },
});

const imports = leaf({
  name: "imports",
  description: "Recent backup imports (restore history)",
  args: LIST_FLAGS,
  handler: async (ctx) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<{
      items: Array<Row>;
      total: number;
    }>("GET", "/admin/backups/imports");
    printList(ctx, {
      name: "imports",
      items: data.items,
      total: data.total,
      defaults: ["id", "importedAt", "strategy", "success"],
      empty: "No backups have been imported.",
      help: ["vamsa admin backup list"],
    });
  },
});

const validate = leaf({
  name: "validate",
  description: "Check a backup ZIP (structure, metadata, record counts)",
  args: {
    file: { type: "positional", required: true, description: "Backup .zip" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const bytes = readZipFile(ctx, args.file);
    const { data } = await ctx.api.request<{
      isValid: boolean;
      metadata: { exportedAt?: string; statistics?: Row };
      errors: Array<string>;
      warnings: Array<string>;
    }>("POST", "/admin/backups/validate", {
      raw: bytes,
      contentType: "application/zip",
    });
    const stats = data.metadata.statistics ?? {};
    if (!data.isValid) {
      // Same contract as gedcom validate: an unusable file is exit 1
      throw new CliError(
        "invalid_backup",
        `${args.file} is not a usable Vamsa backup`,
        "create a fresh one: vamsa admin backup create -o backup.zip",
        EXIT_ERROR,
        undefined,
        {
          file: args.file,
          errors: data.errors,
          ...(data.warnings.length ? { warnings: data.warnings } : {}),
        }
      );
    }
    ctx.print({
      validation: {
        file: args.file,
        valid: true,
        exportedAt: data.metadata.exportedAt || null,
        people: stats.totalPeople ?? 0,
        relationships: stats.totalRelationships ?? 0,
        users: stats.totalUsers ?? 0,
      },
      ...(data.warnings.length ? { warnings: data.warnings } : {}),
      help: ["vamsa admin backup preview"],
    });
  },
});

const preview = leaf({
  name: "preview",
  description: "Show existing data a restore would affect",
  handler: async (ctx) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<{ statistics?: Row }>(
      "GET",
      "/admin/backups/preview"
    );
    ctx.print({
      existing: (data.statistics?.existingItems as Row | undefined) ?? {},
      help: ["vamsa admin backup restore <file> --strategy skip"],
    });
  },
});

const restore = leaf({
  name: "restore",
  description: "Restore from a backup ZIP (asks first; --yes when scripted)",
  args: {
    file: { type: "positional", required: true, description: "Backup .zip" },
    strategy: {
      type: "string",
      description: "On conflict: skip (default), replace or merge",
      valueHint: "skip|replace|merge",
    },
    ...YES_FLAG,
  },
  handler: async (_ctx, args) => {
    // The server validates uploads and then answers 501: the restore
    // pipeline is not implemented. Fail here instead of prompting and
    // uploading a large file just to be told that.
    enumFlag(args, "strategy", STRATEGIES);
    throw new CliError(
      "not_implemented",
      "Restoring a backup is not available through the API yet",
      `vamsa admin backup validate ${args.file}  (checks the file without restoring)`
    );
  },
});

/** Accept ISO timestamps or relative spans like 30m, 24h, 7d. */
export function parseSince(v: string, now = Date.now()): string {
  const rel = /^(\d+)([mhd])$/.exec(v);
  if (rel) {
    const ms = { m: 60_000, h: 3_600_000, d: 86_400_000 }[
      rel[2] as "m" | "h" | "d"
    ];
    return new Date(now - Number(rel[1]) * ms).toISOString();
  }
  const t = Date.parse(v);
  if (Number.isNaN(t)) {
    throw usageError(
      `Cannot read "${v}" as a time`,
      "use 7d, 24h, 30m or 2026-01-31T00:00:00Z"
    );
  }
  return new Date(t).toISOString();
}

export const audit = leaf({
  name: "audit",
  description: "Search the audit log, newest first",
  args: {
    since: {
      type: "string",
      description: "From (7d, 24h, or ISO time)",
      valueHint: "when",
    },
    until: {
      type: "string",
      description: "Until (same formats)",
      valueHint: "when",
    },
    user: {
      type: "string",
      description: "User id or email",
      valueHint: "id|email",
    },
    action: {
      type: "string",
      description: "Action",
      valueHint: ACTIONS.join("|"),
    },
    entity: {
      type: "string",
      description: "Entity type, e.g. PERSON, BACKUP",
      valueHint: "type",
    },
    limit: {
      type: "string",
      description: "Rows, 1-200 (default 50)",
      valueHint: "n",
    },
    page: { type: "string", description: "Page (default 1)", valueHint: "n" },
    ...LIST_FLAGS,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const limit = intFlag(args.limit, "limit", { max: 200 }) ?? 50;
    const page = intFlag(args.page, "page") ?? 1;
    const user = str(args.user);
    // Emails are matched exactly on the server; anything else is a user id
    const userFilter = user?.includes("@")
      ? { userEmail: user }
      : { userId: user };
    const since = str(args.since);
    const until = str(args.until);
    const { data } = await ctx.api.request<{
      items: Array<Row>;
      total: number;
    }>("GET", "/admin/audit", {
      query: {
        since: since ? parseSince(since) : undefined,
        until: until ? parseSince(until) : undefined,
        ...userFilter,
        action: enumFlag(args, "action", ACTIONS),
        entityType: str(args.entity)?.toUpperCase(),
        limit,
        offset: (page - 1) * limit,
      },
    });
    const items = data.items.map((e) => ({
      ...e,
      user: e.userEmail ?? e.userId,
      at: e.createdAt,
      entity: e.entityId
        ? `${String(e.entityType)}:${String(e.entityId)}`
        : e.entityType,
    }));
    const more = page * limit < data.total;
    printList(ctx, {
      name: "audit",
      items,
      total: data.total,
      defaults: ["at", "user", "action", "entity"],
      empty: "No audit entries match.",
      help: [
        ...(more ? [`vamsa admin audit --page ${page + 1}`] : []),
        "vamsa admin audit --since 7d --action DELETE",
        "vamsa admin audit --fields at,user,action,entity,newData --full",
      ],
    });
  },
});

export const backup = group({
  name: "backup",
  description: "Backups: create, list, validate, restore",
  subCommands: { create, list, imports, validate, preview, restore },
});
