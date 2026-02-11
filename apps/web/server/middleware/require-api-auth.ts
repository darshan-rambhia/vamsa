import { createMiddleware } from "hono/factory";
import { betterAuthGetSessionWithUser } from "@vamsa/lib/server/business/auth-better-api";
import { loggers } from "@vamsa/lib/logger";

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
  }
}

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
};

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
    const user = await betterAuthGetSessionWithUser(c.req.raw.headers);

    if (!user) {
      log.warn(
        { path: c.req.path, method: c.req.method },
        "API auth failed: no valid session"
      );
      return c.json(
        { error: "Unauthorized", message: "Authentication required" },
        401
      );
    }

    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < requiredLevel) {
      log.warn(
        {
          path: c.req.path,
          method: c.req.method,
          role: user.role,
          required: minRole,
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
    await next();
  });
}
