import { createMiddleware } from "hono/factory";
import { betterAuthGetSessionWithUser } from "@vamsa/lib/server/business/auth-better-api";
import {
  API_TOKEN_PREFIX,
  verifyApiTokenData,
} from "@vamsa/lib/server/business/api-tokens";
import { loggers } from "@vamsa/lib/logger";
import type { ApiTokenScope } from "@vamsa/lib/server/business/api-tokens";
import type { MiddlewareHandler } from "hono";

const log = loggers.api;

/**
 * Type for the session user returned by betterAuthGetSessionWithUser
 */
export type ApiSessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  personId: string | null;
  mustChangePassword: boolean;
  profileClaimStatus: string;
  oidcProvider: string | null;
};

/**
 * Augment Hono's context variables to include authenticated user
 */
declare module "hono" {
  interface ContextVariableMap {
    user: ApiSessionUser;
    /** Set when the request authenticated with a personal access token */
    apiTokenScope?: ApiTokenScope;
  }
}

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
};

type Role = "VIEWER" | "MEMBER" | "ADMIN";

/** Highest role a personal access token scope can act as. */
export const SCOPE_ROLE_CEILING: Record<ApiTokenScope, Role> = {
  read: "VIEWER",
  write: "MEMBER",
  admin: "ADMIN",
};

/** Lower of two roles. Unknown roles count as VIEWER. */
export function lowerRole(a: string, b: Role): Role {
  return (ROLE_HIERARCHY[a] ?? 0) <= ROLE_HIERARCHY[b] ? (a as Role) : b;
}

/** True when `role` is at least `required`. */
export function roleAtLeast(role: string, required: Role): boolean {
  return (ROLE_HIERARCHY[role] ?? 0) >= ROLE_HIERARCHY[required];
}

/**
 * Resolve the caller from either a personal access token (`Bearer vms_...`)
 * or a Better Auth session (cookie or session bearer token). For tokens the
 * role is capped by the token scope.
 */
async function resolveApiUser(
  headers: Headers
): Promise<{ user: ApiSessionUser; scope?: ApiTokenScope } | null> {
  const authz = headers.get("authorization");
  const bearer = authz?.startsWith("Bearer ") ? authz.slice(7).trim() : null;

  if (bearer?.startsWith(API_TOKEN_PREFIX)) {
    const verified = await verifyApiTokenData(bearer);
    if (!verified) return null;
    const role = lowerRole(
      verified.user.role,
      SCOPE_ROLE_CEILING[verified.scope]
    );
    return { user: { ...verified.user, role }, scope: verified.scope };
  }

  const user = await betterAuthGetSessionWithUser(headers);
  return user ? { user } : null;
}

/**
 * Minimum role for an HTTP method: reads VIEWER, writes MEMBER, deletes ADMIN.
 * Matches the server-function role rules.
 */
export function requiredRoleForMethod(
  method: string
): "VIEWER" | "MEMBER" | "ADMIN" {
  switch (method.toUpperCase()) {
    case "DELETE":
      return "ADMIN";
    case "POST":
    case "PUT":
    case "PATCH":
      return "MEMBER";
    default:
      return "VIEWER";
  }
}

/**
 * Method-aware API auth: picks the minimum role from the request method.
 * Use for resource mounts where reads and writes share a prefix.
 *
 * @example
 * apiV1.use("/persons/*", requireApiAuthForMethod());
 */
export function requireApiAuthForMethod(): MiddlewareHandler {
  return async (c, next) =>
    requireApiAuth(requiredRoleForMethod(c.req.method))(c, next);
}

/**
 * Hono middleware for API authentication
 *
 * Validates session using Better Auth and enforces role-based access control.
 * Sets the authenticated user in context variables for use by route handlers.
 *
 * @param minRole Minimum required role (VIEWER, MEMBER, or ADMIN)
 * @returns Hono middleware function
 *
 * @example
 * // Require VIEWER (default - least restrictive)
 * apiV1.use("/persons/*", requireApiAuth());
 *
 * @example
 * // Require MEMBER
 * apiV1.use("/batch/*", requireApiAuth("MEMBER"));
 *
 * @example
 * // Require ADMIN
 * apiV1.use("/metrics/*", requireApiAuth("ADMIN"));
 */
export function requireApiAuth(
  minRole: "VIEWER" | "MEMBER" | "ADMIN" = "VIEWER"
) {
  return createMiddleware(async (c, next) => {
    const resolved = await resolveApiUser(c.req.raw.headers);

    if (!resolved) {
      log.warn(
        { path: c.req.path, method: c.req.method },
        "API auth failed: no valid session"
      );
      return c.json(
        { error: "Unauthorized", message: "Authentication required" },
        401
      );
    }

    const { user, scope } = resolved;

    if (!roleAtLeast(user.role, minRole)) {
      log.warn(
        {
          path: c.req.path,
          method: c.req.method,
          role: user.role,
          required: minRole,
          tokenScope: scope,
          userId: user.id,
        },
        "API auth failed: insufficient role"
      );
      return c.json(
        { error: "Forbidden", message: "Insufficient permissions" },
        403
      );
    }

    c.set("user", user);
    if (scope) c.set("apiTokenScope", scope);
    await next();
  });
}
