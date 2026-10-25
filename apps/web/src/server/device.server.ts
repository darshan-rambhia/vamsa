/**
 * Server-only handlers for the /device page (approve a `vamsa login`).
 *
 * The protocol lives in Better Auth's deviceAuthorization plugin; these call
 * it with the browser's session so ownership checks stay in one place.
 */

import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@vamsa/lib/server/business/auth-better";
import {
  formatUserCode,
  getDeviceRequestDetails,
  normalizeUserCode,
} from "@vamsa/lib/server/business/device-auth";
import { loggers } from "@vamsa/lib/logger";
import { requireAuth } from "./middleware/require-auth";
import { checkRateLimit } from "./middleware/rate-limiter";

const log = loggers.auth;

export type DeviceState =
  "pending" | "approved" | "denied" | "expired" | "invalid";

export interface DeviceRequestView {
  state: DeviceState;
  userCode: string;
  clientName?: string | null;
  clientId?: string | null;
  scope?: string | null;
  userAgent?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
}

/** Better Auth APIError body code ("expired_token", "invalid_request", ...) */
function errorCode(err: unknown): string | undefined {
  const e = err as { body?: { error?: unknown }; error?: unknown };
  const code = e?.body?.error ?? e?.error;
  return typeof code === "string" ? code : undefined;
}

function stateFromError(err: unknown): DeviceState {
  const code = errorCode(err);
  if (code === "expired_token") return "expired";
  if (code === "invalid_request" || code === "access_denied") return "invalid";
  throw err;
}

function cleanCode(input: string): string {
  const code = normalizeUserCode(input ?? "");
  if (!code || code.length > 32) throw new Error("Invalid code");
  return code;
}

/**
 * Look up a code for the signed-in user. The first signed-in viewer claims a
 * pending code; anyone else then sees it as invalid (no details leak).
 */
export async function getDeviceRequestHandler(
  userCode: string
): Promise<DeviceRequestView> {
  const user = await requireAuth("VIEWER");
  // auth.api calls skip Better Auth's per-IP limiter; cap code guessing here
  await checkRateLimit("deviceAuth", user.id);
  const code = cleanCode(userCode);
  const display = formatUserCode(code);
  let verified: { status?: string; client_id?: string | null };
  try {
    verified = await auth.api.deviceVerify({
      query: { user_code: code },
      headers: getRequestHeaders(),
    });
  } catch (err) {
    return { state: stateFromError(err), userCode: display };
  }

  const details = await getDeviceRequestDetails(code);
  // client_id is only returned to the user who claimed the code. Two lookups
  // at once (React StrictMode, a double tab) race on the claim and the loser
  // gets no client_id even though the claim is ours, so check the row too.
  const claimedByMe =
    !!verified.client_id || (!!details && details.userId === user.id);
  if (!claimedByMe) return { state: "invalid", userCode: display };
  const status = verified.status;
  if (status !== "pending" && status !== "approved" && status !== "denied") {
    return { state: "invalid", userCode: display };
  }

  return {
    state: status,
    userCode: display,
    clientId: details?.clientId ?? verified.client_id,
    clientName: details?.clientName ?? null,
    scope: details?.scope ?? null,
    userAgent: details?.userAgent ?? null,
    createdAt: details?.createdAt?.toISOString() ?? null,
    expiresAt: details?.expiresAt.toISOString() ?? null,
  };
}

/** Approve or deny a code the signed-in user claimed. */
export async function decideDeviceRequestHandler(input: {
  userCode: string;
  approve: boolean;
}): Promise<DeviceRequestView> {
  const user = await requireAuth("VIEWER");
  await checkRateLimit("deviceAuth", user.id);
  const code = cleanCode(input.userCode);
  const display = formatUserCode(code);
  try {
    const call = input.approve ? auth.api.deviceApprove : auth.api.deviceDeny;
    await call({ body: { userCode: code }, headers: getRequestHeaders() });
  } catch (err) {
    return { state: stateFromError(err), userCode: display };
  }
  log.info(
    { userId: user.id, approved: input.approve },
    "Device login decision"
  );
  return { state: input.approve ? "approved" : "denied", userCode: display };
}
