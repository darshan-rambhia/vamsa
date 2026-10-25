/**
 * OAuth 2.0 device authorization grant (RFC 8628) against Better Auth's
 * /api/auth/device/* endpoints. Used by `vamsa login` so sign-in happens in
 * the browser with whatever the web app uses (SSO, password, ...).
 */

import { CliError } from "./errors";
import { VERSION } from "./version";
import type { FetchFn } from "./client";

export const CLIENT_ID = "vamsa-cli";
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
/** RFC 8628 §3.5: add 5 seconds to the interval on every slow_down */
const SLOW_DOWN_STEP_S = 5;

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

/** A started login that `vamsa login --resume` can pick up. */
export interface PendingLogin {
  url: string;
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  /** ISO time the code stops working */
  expiresAt: string;
  interval: number;
  scope: string;
  /** Name and lifetime of the PAT minted on approval */
  name: string;
  expiresInDays?: number;
}

export type PollResult =
  | { status: "approved"; accessToken: string }
  | { status: "pending"; interval: number };

export interface DeviceDeps {
  fetch: FetchFn;
  debug: (msg: string) => void;
  userAgent: string;
}

export function userAgent(platform: string, host: string): string {
  return `vamsa-cli/${VERSION} (${platform}; ${host})`;
}

/** "ABCDEFGH" -> "ABCD-EFGH" */
export function displayCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

async function post(
  deps: DeviceDeps,
  url: string,
  path: string,
  body: Record<string, string>
): Promise<{ status: number; data: Record<string, unknown> }> {
  const full = `${url}/api/auth${path}`;
  deps.debug(`-> POST ${full}`);
  let res: Response;
  try {
    res = await deps.fetch(full, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": deps.userAgent,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new CliError(
      "connection_failed",
      `Cannot reach ${url}: ${err instanceof Error ? err.message : String(err)}`,
      "check the server is running, or pass --url <url> / set VAMSA_URL"
    );
  }
  deps.debug(`<- ${res.status} POST ${full}`);
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

/** Ask the server for a device code + user code. */
export async function requestDeviceCode(
  deps: DeviceDeps,
  url: string,
  scope: string
): Promise<DeviceCode> {
  const { status, data } = await post(deps, url, "/device/code", {
    client_id: CLIENT_ID,
    scope,
  });
  if (status === 404) {
    throw new CliError(
      "device_login_unsupported",
      `${url} does not support browser login (no /api/auth/device/code)`,
      "vamsa login --token vms_...  (create one in the web app), or --password"
    );
  }
  if (status === 429) {
    throw new CliError(
      "rate_limited",
      "Too many login attempts; wait a minute",
      "vamsa login  (in a minute)"
    );
  }
  if (status !== 200 || typeof data.device_code !== "string") {
    throw new CliError(
      String(data.error ?? "device_code_failed"),
      String(
        data.error_description ?? `Server refused the login (HTTP ${status})`
      ),
      "vamsa login --verbose"
    );
  }
  return {
    deviceCode: data.device_code,
    userCode: String(data.user_code),
    verificationUri: String(data.verification_uri),
    verificationUriComplete: String(data.verification_uri_complete),
    expiresIn: Number(data.expires_in) || 600,
    interval: Number(data.interval) || 5,
  };
}

/** One poll of the token endpoint. Throws on denied/expired/invalid. */
export async function pollOnce(
  deps: DeviceDeps,
  url: string,
  deviceCode: string,
  interval: number
): Promise<PollResult> {
  let res: { status: number; data: Record<string, unknown> };
  try {
    res = await post(deps, url, "/device/token", {
      grant_type: GRANT_TYPE,
      device_code: deviceCode,
      client_id: CLIENT_ID,
    });
  } catch (err) {
    // Laptop asleep, Wi-Fi flapping: keep waiting until the code expires
    deps.debug(`poll failed: ${(err as Error).message}`);
    return { status: "pending", interval };
  }
  const { status, data } = res;
  if (status === 200 && typeof data.access_token === "string") {
    return { status: "approved", accessToken: data.access_token };
  }
  // Better Auth's own limiter answers 429 instead of slow_down
  if (status === 429) {
    return { status: "pending", interval: interval + SLOW_DOWN_STEP_S };
  }
  switch (data.error) {
    case "authorization_pending":
      return { status: "pending", interval };
    case "slow_down":
      deps.debug(`slow_down: interval now ${interval + SLOW_DOWN_STEP_S}s`);
      return { status: "pending", interval: interval + SLOW_DOWN_STEP_S };
    case "access_denied":
      throw new CliError(
        "access_denied",
        "The login was denied in the browser",
        "vamsa login  (to try again)"
      );
    case "expired_token":
      throw expiredError();
    default:
      throw new CliError(
        String(data.error ?? "device_token_failed"),
        String(
          data.error_description ?? `Server rejected the login (HTTP ${status})`
        ),
        "vamsa login  (start over)"
      );
  }
}

export function expiredError(): CliError {
  return new CliError(
    "expired_token",
    "The login code expired before it was approved",
    "vamsa login  (get a new code)"
  );
}

/** Poll until approved, denied or expired, honouring interval and slow_down. */
export async function waitForApproval(
  deps: DeviceDeps & {
    sleep: (ms: number) => Promise<void>;
    now: () => number;
  },
  pending: Pick<PendingLogin, "url" | "deviceCode" | "expiresAt" | "interval">
): Promise<string> {
  const deadline = Date.parse(pending.expiresAt);
  let interval = pending.interval;
  for (;;) {
    if (deps.now() >= deadline) throw expiredError();
    await deps.sleep(interval * 1000);
    const r = await pollOnce(deps, pending.url, pending.deviceCode, interval);
    if (r.status === "approved") return r.accessToken;
    interval = r.interval;
  }
}
