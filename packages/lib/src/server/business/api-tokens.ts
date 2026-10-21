import { createHmac, randomBytes } from "node:crypto";
import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { and, desc, eq, isNull } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.auth;

/** Type for the database instance (for DI) */
export type ApiTokensDb = typeof drizzleDb;

/** Plaintext tokens start with this, so the auth middleware can route them. */
export const API_TOKEN_PREFIX = "vms_";

/** Characters of the plaintext kept for display (e.g. `vms_AbC123`). */
const DISPLAY_PREFIX_LENGTH = 10;

export const API_TOKEN_SCOPES = ["read", "write", "admin"] as const;
export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number];

/** Tokens expire after this many days unless the caller says otherwise. */
export const DEFAULT_TOKEN_EXPIRY_DAYS = 90;

/** lastUsedAt is only rewritten when older than this, to avoid a write per request. */
export const LAST_USED_WRITE_INTERVAL_MS = 60_000;

export interface CreateApiTokenInput {
  name: string;
  scope: ApiTokenScope;
  /** Days until expiry. Omit for the 90-day default; null for no expiry. */
  expiresInDays?: number | null;
}

/** Public view of a token. Never includes the hash or plaintext. */
export interface ApiTokenSummary {
  id: string;
  name: string;
  prefix: string;
  scope: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreatedApiToken extends ApiTokenSummary {
  /** Plaintext token. Returned once at creation, never stored. */
  token: string;
}

export interface VerifiedApiToken {
  tokenId: string;
  scope: ApiTokenScope;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    personId: string | null;
    mustChangePassword: boolean;
    profileClaimStatus: string;
    oidcProvider: string | null;
  };
}

/**
 * Server secret that keys token hashes. API_TOKEN_SECRET wins; otherwise
 * BETTER_AUTH_SECRET. Rotating it invalidates every existing token.
 */
export function getApiTokenSecret(): string {
  const secret = process.env.API_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "API_TOKEN_SECRET or BETTER_AUTH_SECRET must be set to hash API tokens"
    );
  }
  return secret;
}

/**
 * HMAC-SHA256 of the token keyed with the server secret. Tokens carry 256
 * bits of randomness, so a slow password hash isn't needed; the key means a
 * leaked database alone can't be used to check guesses.
 */
export function hashApiToken(
  token: string,
  secret: string = getApiTokenSecret()
): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function generateApiToken(): string {
  return API_TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

type ApiTokenRow = typeof drizzleSchema.apiTokens.$inferSelect;

function toSummary(row: ApiTokenRow): ApiTokenSummary {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scope: row.scope,
    expiresAt: row.expiresAt ?? null,
    lastUsedAt: row.lastUsedAt ?? null,
    revokedAt: row.revokedAt ?? null,
    createdAt: row.createdAt,
  };
}

/**
 * Create a personal access token. The plaintext is returned once; only its
 * HMAC-SHA256 hash is stored.
 */
export async function createApiTokenData(
  userId: string,
  input: CreateApiTokenInput,
  db: ApiTokensDb = drizzleDb
): Promise<CreatedApiToken> {
  const token = generateApiToken();
  const days =
    input.expiresInDays === undefined
      ? DEFAULT_TOKEN_EXPIRY_DAYS
      : input.expiresInDays;
  const expiresAt =
    days === null ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const [created] = await db
    .insert(drizzleSchema.apiTokens)
    .values({
      id: crypto.randomUUID(),
      userId,
      name: input.name,
      tokenHash: hashApiToken(token),
      prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
      scope: input.scope,
      expiresAt,
      createdAt: new Date(),
    })
    .returning();

  log.info(
    { userId, tokenId: created.id, scope: input.scope },
    "API token created"
  );

  return { ...toSummary(created), token };
}

/** List a user's tokens, newest first. Includes revoked tokens. */
export async function listApiTokensData(
  userId: string,
  db: ApiTokensDb = drizzleDb
): Promise<Array<ApiTokenSummary>> {
  const rows = await db.query.apiTokens.findMany({
    where: eq(drizzleSchema.apiTokens.userId, userId),
    orderBy: desc(drizzleSchema.apiTokens.createdAt),
  });
  return rows.map(toSummary);
}

/**
 * Revoke one of the user's tokens. Idempotent: an unknown id, another user's
 * token, or an already revoked token all return `revoked: false` without error.
 */
export async function revokeApiTokenData(
  userId: string,
  tokenId: string,
  db: ApiTokensDb = drizzleDb
): Promise<{ id: string; revoked: boolean }> {
  const rows = await db
    .update(drizzleSchema.apiTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(drizzleSchema.apiTokens.id, tokenId),
        eq(drizzleSchema.apiTokens.userId, userId),
        isNull(drizzleSchema.apiTokens.revokedAt)
      )
    )
    .returning({ id: drizzleSchema.apiTokens.id });

  const revoked = rows.length > 0;
  if (revoked) log.info({ userId, tokenId }, "API token revoked");
  return { id: tokenId, revoked };
}

/** Revoke every active token a user has (password change, deactivation). */
export async function revokeAllUserApiTokensData(
  userId: string,
  db: ApiTokensDb = drizzleDb
): Promise<number> {
  const rows = await db
    .update(drizzleSchema.apiTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(drizzleSchema.apiTokens.userId, userId),
        isNull(drizzleSchema.apiTokens.revokedAt)
      )
    )
    .returning({ id: drizzleSchema.apiTokens.id });

  if (rows.length > 0) {
    log.info({ userId, count: rows.length }, "All API tokens revoked");
  }
  return rows.length;
}

/**
 * Revoke all of a user's tokens without ever throwing: used from auth hooks
 * (password change/reset, deactivation) where a revoke failure must not
 * break the operation itself. Failures are logged at error level.
 */
export async function revokeAllUserApiTokensSafe(
  userId: string,
  reason: string,
  db: ApiTokensDb = drizzleDb
): Promise<void> {
  try {
    const count = await revokeAllUserApiTokensData(userId, db);
    if (count > 0) log.info({ userId, count, reason }, "API tokens revoked");
  } catch (err) {
    log.withErr(err).ctx({ userId, reason }).msg("Failed to revoke API tokens");
  }
}

/** Better Auth endpoints that write a credential password. */
const PASSWORD_WRITE_PATHS = new Set([
  "/change-password",
  "/set-password",
  "/reset-password",
]);

/**
 * Better Auth `account.update.after` hook body: when a password-writing
 * endpoint updated a credential account, revoke the user's tokens.
 * Returns true if it revoked.
 */
export async function revokeTokensOnPasswordWrite(
  account: unknown,
  path: string | undefined,
  db: ApiTokensDb = drizzleDb
): Promise<boolean> {
  if (!path || !PASSWORD_WRITE_PATHS.has(path)) return false;
  const userId = (account as { userId?: unknown } | null)?.userId;
  if (typeof userId !== "string") return false;
  await revokeAllUserApiTokensSafe(userId, `password write ${path}`, db);
  return true;
}

/**
 * Verify a plaintext token. Returns null when the token is unknown, revoked,
 * expired, or its user is deactivated or locked out. Updates lastUsedAt.
 */
export async function verifyApiTokenData(
  token: string,
  db: ApiTokensDb = drizzleDb
): Promise<VerifiedApiToken | null> {
  if (!token.startsWith(API_TOKEN_PREFIX)) return null;

  const row = await db.query.apiTokens.findFirst({
    where: eq(drizzleSchema.apiTokens.tokenHash, hashApiToken(token)),
  });
  if (!row) return null;

  const now = new Date();
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt <= now) return null;
  if (!API_TOKEN_SCOPES.includes(row.scope as ApiTokenScope)) return null;

  const user = await db.query.users.findFirst({
    where: eq(drizzleSchema.users.id, row.userId),
  });
  if (!user || user.isActive === false) {
    log.warn({ tokenId: row.id }, "API token rejected: user inactive");
    return null;
  }
  if (user.lockedUntil && user.lockedUntil > now) {
    log.warn({ tokenId: row.id }, "API token rejected: user locked");
    return null;
  }

  const lastUsed = row.lastUsedAt?.getTime() ?? 0;
  if (now.getTime() - lastUsed > LAST_USED_WRITE_INTERVAL_MS) {
    await db
      .update(drizzleSchema.apiTokens)
      .set({ lastUsedAt: now })
      .where(eq(drizzleSchema.apiTokens.id, row.id));
  }

  return {
    tokenId: row.id,
    scope: row.scope as ApiTokenScope,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "VIEWER",
      personId: user.personId ?? null,
      mustChangePassword: user.mustChangePassword ?? false,
      profileClaimStatus: user.profileClaimStatus ?? "PENDING",
      oidcProvider: user.oidcProvider ?? null,
    },
  };
}
