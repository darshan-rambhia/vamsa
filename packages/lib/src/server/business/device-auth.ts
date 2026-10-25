/**
 * Device authorization (RFC 8628) for `vamsa login`.
 *
 * Better Auth's deviceAuthorization plugin owns the protocol endpoints
 * (/api/auth/device/code, /device/token, /device/approve, /device/deny).
 * This module holds Vamsa's plugin settings and the data helpers behind the
 * /device approval page.
 */

import { drizzleDb, drizzleSchema } from "@vamsa/api";
import { eq } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.auth;

/** Clients allowed to start a device login. */
export const DEVICE_CLIENTS: Record<string, string> = {
  "vamsa-cli": "Vamsa CLI",
};

export const DEVICE_CODE_EXPIRES_IN = "10m";
export const DEVICE_POLL_INTERVAL = "5s";

/**
 * User codes use Better Auth's default alphabet (no 0/O, 1/I/L), 8 chars.
 * They are stored without a dash and shown as XXXX-XXXX; lookups strip
 * anything that is not a letter or digit, so either form works.
 */
export const USER_CODE_LENGTH = 8;

/** Better Auth rateLimit.customRules for the device endpoints (per IP). */
export const DEVICE_RATE_LIMITS = {
  // Code issuance: a person runs `vamsa login` a few times, not dozens
  "/device/code": { window: 60, max: 10 },
  // Polling at the 5s interval is 12/min; leave headroom for slow_down retries
  "/device/token": { window: 60, max: 20 },
  "/device/approve": { window: 60, max: 10 },
  "/device/deny": { window: 60, max: 10 },
} as const;

export function isDeviceClient(clientId: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEVICE_CLIENTS, clientId);
}

/** Public URL of the approval page. */
export function deviceVerificationUri(
  env: Record<string, string | undefined> = process.env
): string {
  let base = env.APP_URL || env.BETTER_AUTH_URL || "http://localhost:3000";
  while (base.endsWith("/")) base = base.slice(0, -1);
  return `${base}/device`;
}

/** Strip separators and upper-case: "abcd-efgh" -> "ABCDEFGH". */
export function normalizeUserCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** "ABCDEFGH" -> "ABCD-EFGH" for display. */
export function formatUserCode(code: string): string {
  const c = normalizeUserCode(code);
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/** Type for the database instance (for DI) */
export type DeviceAuthDb = typeof drizzleDb;

/** Record the requesting client's User-Agent on a fresh device code. */
export async function recordDeviceUserAgent(
  deviceCode: string,
  userAgent: string | null | undefined,
  db: DeviceAuthDb = drizzleDb
): Promise<void> {
  if (!userAgent) return;
  try {
    await db
      .update(drizzleSchema.deviceCodes)
      .set({ userAgent: userAgent.slice(0, 300) })
      .where(eq(drizzleSchema.deviceCodes.deviceCode, deviceCode));
  } catch (error) {
    // Display-only metadata: never fail the login over it
    log.withErr(error).msg("Could not record device user agent");
  }
}

export interface DeviceRequestDetails {
  userCode: string;
  /** User who claimed the code on /device (null until someone opens it) */
  userId: string | null;
  clientId: string | null;
  clientName: string | null;
  scope: string | null;
  userAgent: string | null;
  createdAt: Date | null;
  expiresAt: Date;
}

/** Display fields for a device code (looked up by normalized user code). */
export async function getDeviceRequestDetails(
  userCode: string,
  db: DeviceAuthDb = drizzleDb
): Promise<DeviceRequestDetails | null> {
  const code = normalizeUserCode(userCode);
  const [row] = await db
    .select()
    .from(drizzleSchema.deviceCodes)
    .where(eq(drizzleSchema.deviceCodes.userCode, code))
    .limit(1);
  if (!row) return null;
  return {
    userCode: formatUserCode(row.userCode),
    userId: row.userId,
    clientId: row.clientId,
    clientName: row.clientId ? (DEVICE_CLIENTS[row.clientId] ?? null) : null,
    scope: row.scope,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}
