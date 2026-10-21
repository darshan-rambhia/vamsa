/**
 * /api/v1/admin backups and audit log. Mounted under the ADMIN guard.
 */

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { backupExportSchema, errorResponseSchema } from "@vamsa/schemas";
import {
  AUDIT_ACTIONS,
  BackupRestoreError,
  createBackupExportData,
  getImportHistoryData,
  listAuditLogsData,
  listBackupsData,
  previewImportData,
  restoreBackupArchive,
  validateBackupFile,
} from "@vamsa/lib/server/business";
import { loggers } from "@vamsa/lib/logger";
import { jsonRoute, respond } from "./route-helpers";
import type { Context } from "hono";

const BACKUPS = "Admin: Backups";
const AUDIT = "Admin: Audit";
/** Largest accepted backup upload (validate/restore). */
export const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

const log = loggers.api;
const router = new OpenAPIHono();

const err = (description: string) => ({
  description,
  content: { "application/json": { schema: errorResponseSchema } },
});

const zipUpload = {
  required: true,
  content: {
    "application/zip": {
      schema: z.string().openapi({ format: "binary" }),
    },
  },
} as const;

/** Read a raw ZIP request body, enforcing a size cap. */
async function readZip(c: Context): Promise<Buffer | Response> {
  const declared = Number(c.req.header("content-length") ?? 0);
  if (declared > MAX_BACKUP_BYTES) {
    return c.json({ error: "Backup file too large" }, 413);
  }
  const bytes = Buffer.from(await c.req.arrayBuffer());
  if (bytes.length === 0) {
    return c.json({ error: "Send the backup ZIP as the request body" }, 400);
  }
  if (bytes.length > MAX_BACKUP_BYTES) {
    return c.json({ error: "Backup file too large" }, 413);
  }
  return bytes;
}

function restoreUser(c: Context) {
  const u = c.get("user");
  return { id: u.id, email: u.email, name: u.name, role: u.role as "ADMIN" };
}

// ---------------------------------------------------------------- backups

router.openapi(
  createRoute({
    method: "post",
    path: "/backups",
    tags: [BACKUPS],
    summary: "Create a backup and download it as a ZIP",
    operationId: "adminCreateBackup",
    request: {
      body: {
        required: false,
        content: { "application/json": { schema: backupExportSchema } },
      },
    },
    responses: {
      200: {
        description: "Backup archive",
        content: {
          "application/zip": {
            schema: z.string().openapi({ format: "binary" }),
          },
        },
      },
      400: err("Validation error"),
      401: err("Not authenticated"),
      403: err("Requires ADMIN"),
      500: err("Backup failed"),
    },
  }),
  async (c) => {
    const text = await c.req.text();
    let body: unknown = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      return c.json({ error: "Body must be JSON" }, 400);
    }
    const parsed = backupExportSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.issues[0]?.message ?? "Validation error" },
        400
      );
    }
    const user = c.get("user");
    const { zipBase64, filename, metadata } = await createBackupExportData(
      parsed.data,
      { id: user.id, email: user.email, name: user.name }
    );
    return c.body(new Uint8Array(Buffer.from(zipBase64, "base64")), 200, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Vamsa-Backup-Statistics": JSON.stringify(metadata.statistics),
    });
  }
);

router.openapi(
  jsonRoute({
    method: "get",
    path: "/backups",
    tag: BACKUPS,
    summary: "List stored backups",
    operationId: "adminListBackups",
    request: {
      query: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
        offset: z.coerce.number().int().min(0).default(0),
      }),
    },
  }),
  (c) => respond(c, () => listBackupsData(c.req.valid("query")))
);

router.openapi(
  jsonRoute({
    method: "get",
    path: "/backups/imports",
    tag: BACKUPS,
    summary: "Recent backup imports (restore history)",
    operationId: "adminImportHistory",
  }),
  (c) =>
    respond(c, async () => {
      const items = await getImportHistoryData(restoreUser(c));
      return { items, total: items.length };
    })
);

router.openapi(
  createRoute({
    method: "post",
    path: "/backups/validate",
    tags: [BACKUPS],
    summary: "Check a backup ZIP (structure, metadata, record counts)",
    operationId: "adminValidateBackup",
    request: { body: zipUpload },
    responses: {
      200: {
        description: "Validation result",
        content: {
          "application/json": { schema: z.record(z.string(), z.unknown()) },
        },
      },
      400: err("Empty body"),
      413: err("Too large"),
    },
  }),
  async (c) => {
    const zip = await readZip(c);
    if (zip instanceof Response) return zip as never;
    return respond(c, () => validateBackupFile(zip));
  }
);

router.openapi(
  jsonRoute({
    method: "get",
    path: "/backups/preview",
    tag: BACKUPS,
    summary: "Counts of existing data a restore would affect",
    operationId: "adminPreviewRestore",
  }),
  (c) => respond(c, () => previewImportData(restoreUser(c)))
);

router.openapi(
  createRoute({
    method: "post",
    path: "/backups/preview",
    tags: [BACKUPS],
    summary: "Preview restoring a backup ZIP (new/existing/changed per table)",
    operationId: "adminPreviewRestoreFile",
    request: { body: zipUpload },
    responses: {
      200: {
        description: "Import preview",
        content: {
          "application/json": { schema: z.record(z.string(), z.unknown()) },
        },
      },
      400: err("Invalid backup"),
      413: err("Too large"),
    },
  }),
  async (c) => {
    const zip = await readZip(c);
    if (zip instanceof Response) return zip as never;
    try {
      return c.json(await previewImportData(restoreUser(c), zip), 200);
    } catch (e) {
      return c.json(
        { error: "Invalid backup", details: (e as Error).message },
        400
      );
    }
  }
);

const flag = z
  .enum(["true", "false"])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "true"));

router.openapi(
  createRoute({
    method: "post",
    path: "/backups/restore",
    tags: [BACKUPS],
    summary: "Restore from a backup ZIP",
    description:
      "skip inserts new rows only; merge also overwrites existing rows by id; replace wipes the genealogy tables in the backup and family settings first. Users are never overwritten. One transaction: on any error nothing changes. merge and replace write a safety backup first unless preBackup=false.",
    operationId: "adminRestoreBackup",
    request: {
      query: z.object({
        strategy: z.enum(["skip", "replace", "merge"]).default("skip"),
        preBackup: flag.openapi({ description: "Safety backup first (true)" }),
        photos: flag.openapi({ description: "Restore media files (true)" }),
        auditLogs: flag.openapi({ description: "Import audit logs (false)" }),
      }),
      body: zipUpload,
    },
    responses: {
      200: {
        description: "Import result",
        content: {
          "application/json": { schema: z.record(z.string(), z.unknown()) },
        },
      },
      400: err("Invalid backup"),
      413: err("Too large"),
      500: err("Restore failed; nothing was changed"),
    },
  }),
  async (c) => {
    const zip = await readZip(c);
    if (zip instanceof Response) return zip as never;
    const q = c.req.valid("query");
    try {
      const result = await restoreBackupArchive(
        zip,
        {
          strategy: q.strategy,
          createBackupBeforeImport: q.preBackup ?? true,
          importPhotos: q.photos ?? true,
          importAuditLogs: q.auditLogs ?? false,
        },
        {
          id: c.get("user").id,
          email: c.get("user").email,
          name: c.get("user").name ?? null,
        }
      );
      return c.json(result, 200);
    } catch (e) {
      if (e instanceof BackupRestoreError) {
        return c.json({ error: "Invalid backup", details: e.message }, 400);
      }
      log.withErr(e).msg("Backup restore failed");
      return c.json(
        {
          error: "Restore failed; nothing was changed",
          details: (e as Error).message,
        },
        500
      );
    }
  }
);

// ------------------------------------------------------------------ audit

router.openapi(
  jsonRoute({
    method: "get",
    path: "/audit",
    tag: AUDIT,
    summary: "Search the audit log (newest first)",
    operationId: "adminListAuditLogs",
    request: {
      query: z.object({
        since: z.string().datetime({ offset: true }).optional().openapi({
          description: "ISO timestamp, inclusive",
        }),
        until: z.string().datetime({ offset: true }).optional(),
        userId: z.string().optional(),
        userEmail: z.string().email().optional().openapi({
          description: "Exact email of the acting user",
        }),
        action: z.enum(AUDIT_ACTIONS).optional(),
        entityType: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      }),
    },
  }),
  (c) => {
    const q = c.req.valid("query");
    return respond(c, () =>
      listAuditLogsData({
        ...q,
        since: q.since ? new Date(q.since) : undefined,
        until: q.until ? new Date(q.until) : undefined,
      })
    );
  }
);

export default router;
