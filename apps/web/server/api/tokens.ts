import { createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "@vamsa/schemas";
import {
  API_TOKEN_SCOPES,
  createApiTokenData,
  listApiTokensData,
  revokeApiTokenData,
} from "@vamsa/lib/server/business";
import { loggers } from "@vamsa/lib/logger";
import {
  SCOPE_ROLE_CEILING,
  roleAtLeast,
} from "../middleware/require-api-auth";
import { createRouter } from "./route-helpers";
import type { ApiTokenSummary } from "@vamsa/lib/server/business";

const log = loggers.api;

const tokensRouter = createRouter();

/**
 * Creating and revoking tokens needs a real login. A leaked token must not be
 * able to mint fresh tokens (outliving its own revocation) or revoke others.
 */
const SESSION_REQUIRED = {
  error: "Forbidden",
  details:
    "Token management needs a password login, not a personal access token",
} as const;

const tokenSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    prefix: z.string().openapi({
      description: "First characters of the token, for display",
      example: "vms_Ab12Cd",
    }),
    scope: z.string().openapi({ example: "read" }),
    expiresAt: z.string().nullable(),
    lastUsedAt: z.string().nullable(),
    revokedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .openapi("ApiToken");

const createTokenBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    scope: z.enum(API_TOKEN_SCOPES).default("read"),
    expiresInDays: z
      .number()
      .int()
      .min(1)
      .max(3650)
      .nullable()
      .optional()
      .openapi({
        description:
          "Days until expiry (default 90). null for a token that never expires.",
      }),
  })
  .openapi("CreateApiTokenRequest");

const createdTokenSchema = tokenSchema
  .extend({
    token: z.string().openapi({
      description: "Plaintext token. Shown once; store it now.",
      example: "vms_...",
    }),
  })
  .openapi("CreatedApiToken");

function serialize(t: ApiTokenSummary) {
  return {
    id: t.id,
    name: t.name,
    prefix: t.prefix,
    scope: t.scope,
    expiresAt: t.expiresAt?.toISOString() ?? null,
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    revokedAt: t.revokedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

const json = <T extends z.ZodTypeAny>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Tokens"],
  summary: "List your API tokens",
  operationId: "listApiTokens",
  responses: {
    200: json(
      z.object({ items: z.array(tokenSchema), total: z.number() }),
      "Your tokens, newest first (revoked ones included)"
    ),
    401: json(errorResponseSchema, "Not authenticated"),
  },
});

tokensRouter.openapi(listRoute, async (c) => {
  const user = c.get("user");
  const tokens = await listApiTokensData(user.id);
  return c.json(
    { items: tokens.map(serialize), total: tokens.length },
    { status: 200 }
  );
});

const createTokenRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Tokens"],
  summary: "Create an API token",
  description:
    "Creates a personal access token. The scope caps what the token can do: read (VIEWER), write (MEMBER), admin (ADMIN). You cannot create a scope above your own role.",
  operationId: "createApiToken",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createTokenBodySchema } },
    },
  },
  responses: {
    201: json(createdTokenSchema, "Token created"),
    400: json(errorResponseSchema, "Validation error"),
    401: json(errorResponseSchema, "Not authenticated"),
    403: json(
      errorResponseSchema,
      "Scope above your role, or the request used a personal access token"
    ),
  },
});

tokensRouter.openapi(createTokenRoute, async (c) => {
  if (c.get("apiTokenScope")) return c.json(SESSION_REQUIRED, { status: 403 });
  const user = c.get("user");
  const body = c.req.valid("json");

  // user.role is already capped when the caller is itself a token
  if (!roleAtLeast(user.role, SCOPE_ROLE_CEILING[body.scope])) {
    return c.json(
      {
        error: "Forbidden",
        details: `Scope "${body.scope}" needs role ${SCOPE_ROLE_CEILING[body.scope]}`,
      },
      { status: 403 }
    );
  }

  const created = await createApiTokenData(user.id, body);
  log.info({ userId: user.id, tokenId: created.id }, "API token issued");
  return c.json(
    { ...serialize(created), token: created.token },
    { status: 201 }
  );
});

const revokeRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Tokens"],
  summary: "Revoke one of your API tokens",
  description:
    "Idempotent: revoking a missing or already revoked token succeeds with revoked=false.",
  operationId: "revokeApiToken",
  request: { params: z.object({ id: z.string().min(1) }) },
  responses: {
    200: json(
      z.object({ id: z.string(), revoked: z.boolean() }),
      "Token revoked (or already gone)"
    ),
    401: json(errorResponseSchema, "Not authenticated"),
    403: json(errorResponseSchema, "Request used a personal access token"),
  },
});

tokensRouter.openapi(revokeRoute, async (c) => {
  if (c.get("apiTokenScope")) return c.json(SESSION_REQUIRED, { status: 403 });
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const result = await revokeApiTokenData(user.id, id);
  return c.json(result, { status: 200 });
});

export default tokensRouter;
