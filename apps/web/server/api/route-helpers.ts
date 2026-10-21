/**
 * Shared helpers for REST routers that wrap existing business functions.
 *
 * Business functions signal failures by throwing `Error("X not found")` etc.
 * `respond` turns those into HTTP statuses so each handler stays one line.
 */

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "@vamsa/schemas";
import { loggers } from "@vamsa/lib/logger";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@vamsa/lib/server/business/errors";
import type { RouteConfig } from "@hono/zod-openapi";
import type { Context, Env } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const log = loggers.api;

const errorContent = (description: string) => ({
  description,
  content: { "application/json": { schema: errorResponseSchema } },
});

/** Path param schema for `/{id}` style routes. */
export const idParam = (name = "id") => z.object({ [name]: z.string().min(1) });

interface RouteOptions<TRequest extends RouteConfig["request"]> {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  tag: string;
  summary: string;
  operationId: string;
  description?: string;
  request?: TRequest;
  status?: 200 | 201;
  /** Response schema; defaults to an untyped JSON object */
  response?: z.ZodType;
}

/** createRoute with the standard error responses filled in. */
export function jsonRoute<TRequest extends RouteConfig["request"] = undefined>(
  o: RouteOptions<TRequest>
) {
  return createRoute({
    method: o.method,
    path: o.path,
    tags: [o.tag],
    summary: o.summary,
    description: o.description,
    operationId: o.operationId,
    request: o.request as TRequest,
    responses: {
      [o.status ?? 200]: {
        description: "Success",
        content: {
          "application/json": {
            schema: o.response ?? z.record(z.string(), z.unknown()),
          },
        },
      },
      400: errorContent("Validation error"),
      401: errorContent("Not authenticated"),
      403: errorContent("Insufficient role"),
      404: errorContent("Not found"),
      409: errorContent("Conflict"),
      500: errorContent("Server error"),
    },
  });
}

/** JSON body helper for `request.body`. */
export function jsonBody<TSchema extends z.ZodType>(schema: TSchema) {
  return {
    required: true,
    content: { "application/json": { schema } },
  } as const;
}

/**
 * Messages the business layer throws as plain Errors, by HTTP status.
 * Exact phrases only: anything unlisted is a 500, so an internal message that
 * happens to contain "not found" is never echoed to clients as a 404.
 */
const KNOWN_MESSAGES: Record<string, ContentfulStatusCode> = {
  "User not found": 404,
  "Invite not found": 404,
  "Backup not found": 404,
  "A user already exists with this email": 409,
  "An account already exists with this email": 409,
  "An active invite already exists for this email": 409,
  "This person is already linked to a user": 409,
  "This person is already linked to another user": 409,
  "Cannot demote yourself": 400,
  "Cannot deactivate yourself": 400,
  "Cannot delete yourself": 400,
  "Can only revoke pending invites": 409,
  "Only revoked invites can be deleted": 409,
  "Cannot resend an accepted invite": 409,
  "Invite has expired": 409,
};

/** Map a business-layer error to an HTTP status. */
export function statusForError(err: unknown): ContentfulStatusCode {
  if (err instanceof z.ZodError) return 400;
  // Match on name, not instanceof: under Vite SSR the business package can be
  // loaded twice (bundled and external), giving two copies of each class
  const name = err instanceof Error ? err.name : "";
  if (err instanceof NotFoundError || name === "NotFoundError") return 404;
  if (err instanceof ConflictError || name === "ConflictError") return 409;
  if (err instanceof ValidationError || name === "ValidationError") return 400;
  if (err instanceof Error) return KNOWN_MESSAGES[err.message] ?? 500;
  return 500;
}

/**
 * Keep only the keys the client actually sent. Shared schemas fill absent
 * optional fields with defaults (e.g. `date` -> null); passing those through
 * to an update would silently clear stored values.
 */
export function onlyProvided<T extends Record<string, unknown>>(
  parsed: T,
  raw: Record<string, unknown>
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(raw)) {
    if (key in parsed) out[key as keyof T] = parsed[key as keyof T];
  }
  return out;
}

/**
 * Run a business call and send its result as JSON, mapping thrown errors.
 * Returns `never` so it satisfies OpenAPIHono's typed handler signature.
 */
export async function respond(
  c: Context,
  fn: () => Promise<unknown>,
  status: ContentfulStatusCode = 200
): Promise<never> {
  try {
    const result = await fn();
    return c.json(result as object, status) as never;
  } catch (err) {
    const code = statusForError(err);
    if (code === 500) {
      log.withErr(err).msg(`Unhandled error in ${c.req.method} ${c.req.path}`);
      return c.json({ error: "Internal server error" }, 500) as never;
    }
    if (err instanceof z.ZodError) {
      return c.json(validationErrorBody(err), 400) as never;
    }
    return c.json({ error: (err as Error).message }, code) as never;
  }
}

/**
 * 400 body for a zod failure. Only path/message/code per issue so no input
 * values or schema internals reach the client.
 */
export function validationErrorBody(err: z.ZodError) {
  const issues = err.issues.map((i) => ({
    path: i.path.map(String).join("."),
    message: i.message,
    code: String(i.code),
  }));
  return {
    error: "Validation error",
    details: issues[0]?.message ?? "Invalid request",
    issues,
  };
}

/** defaultHook: request validation failures -> 400 validationErrorBody. */
export function validationHook(
  result: { success: true } | { success: false; error: z.ZodError },
  c: Context
) {
  if (!result.success) {
    return c.json(validationErrorBody(result.error), 400);
  }
  return undefined;
}

/**
 * OpenAPIHono with the shared validation hook. defaultHook is per instance
 * (a parent's hook does not reach routes on a mounted sub-router), so every
 * router must be created through this.
 */
export function createRouter<TEnv extends Env = Env>() {
  return new OpenAPIHono<TEnv>({ defaultHook: validationHook });
}
