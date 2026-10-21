/**
 * Shared helpers for REST routers that wrap existing business functions.
 *
 * Business functions signal failures by throwing `Error("X not found")` etc.
 * `respond` turns those into HTTP statuses so each handler stays one line.
 */

import { createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "@vamsa/schemas";
import { loggers } from "@vamsa/lib/logger";
import type { RouteConfig } from "@hono/zod-openapi";
import type { Context } from "hono";
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

/** Map a business-layer error to an HTTP status. */
export function statusForError(err: unknown): ContentfulStatusCode {
  if (err instanceof z.ZodError) return 400;
  const msg = err instanceof Error ? err.message : "";
  if (/not found/i.test(msg)) return 404;
  if (/already|duplicate|exists/i.test(msg)) return 409;
  if (/required|invalid|cannot|must|circular/i.test(msg)) return 400;
  return 500;
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
    const message =
      err instanceof z.ZodError
        ? (err.issues[0]?.message ?? "Validation error")
        : (err as Error).message;
    return c.json({ error: message }, code) as never;
  }
}
