import { isCancel, password as promptPassword, text } from "@clack/prompts";
import { createClient } from "../lib/client";
import { leaf } from "../lib/command";
import { normalizeUrl, saveConfig } from "../lib/config";
import { intFlag, requireValue, str } from "../lib/context";
import { CliError, usageError } from "../lib/errors";
import {
  displayCode,
  expiredError,
  pollOnce,
  requestDeviceCode,
  userAgent,
  waitForApproval,
} from "../lib/device";
import type { DeviceDeps, PendingLogin } from "../lib/device";
import type { Profile, TokenType } from "../lib/config";
import type { Ctx } from "../lib/context";

interface Me {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tokenScope: string | null;
}

const SCOPES = ["read", "write", "admin"] as const;
type Scope = (typeof SCOPES)[number];
const SCOPE_FOR_ROLE: Record<string, Scope> = {
  VIEWER: "read",
  MEMBER: "write",
  ADMIN: "admin",
};
const DEFAULT_TOKEN_DAYS = 90;

async function ask(
  fn: () => Promise<string | symbol>
): Promise<string | undefined> {
  const v = await fn();
  return isCancel(v) ? undefined : (v as string);
}

/**
 * End a saved session server-side before its token is dropped. Best effort:
 * an unreachable server or an already-expired session is fine.
 */
export async function endSavedSession(
  ctx: Ctx,
  profile: Profile | undefined
): Promise<"ended" | "skipped" | "unreachable"> {
  if (!profile?.token || profile.tokenType !== "session") return "skipped";
  let url: string;
  try {
    url = normalizeUrl(profile.url);
  } catch {
    return "skipped";
  }
  const client = createClient({
    url,
    token: profile.token,
    fetch: ctx.rt.fetch,
    debug: ctx.debug,
  });
  try {
    await client.request("POST", "/auth/logout");
    return "ended";
  } catch {
    ctx.debug("could not end the previous session; it will expire on its own");
    return "unreachable";
  }
}

async function storeCredential(
  ctx: Ctx,
  url: string,
  token: string,
  tokenType: TokenType,
  email: string
): Promise<string> {
  const name = ctx.target.profileName;
  // Replacing a session login: end the old session instead of orphaning it
  const previous = ctx.config.profiles[name] as Profile | undefined;
  if (previous?.token && previous.token !== token) {
    await endSavedSession(ctx, previous);
  }
  ctx.config.profiles[name] = { url, token, tokenType, email };
  ctx.config.current = name;
  return saveConfig(ctx.config, ctx.rt.env);
}

// ---------------------------------------------------------------------------
// Browser (device authorization) login
// ---------------------------------------------------------------------------

function deviceDeps(ctx: Ctx): DeviceDeps & {
  sleep: (ms: number) => Promise<void>;
  now: () => number;
} {
  return {
    fetch: ctx.rt.fetch,
    debug: ctx.debug,
    userAgent: userAgent(ctx.rt.platform, ctx.rt.hostname),
    sleep: ctx.rt.sleep,
    now: ctx.rt.now,
  };
}

function savePending(ctx: Ctx, pending: PendingLogin | undefined): void {
  const name = ctx.target.profileName;
  const existing = ctx.config.profiles[name] as Profile | undefined;
  if (!pending) {
    if (!existing?.pending) return;
    delete existing.pending;
    // A profile that only held the pending login goes away with it
    if (!existing.token) delete ctx.config.profiles[name];
  } else {
    ctx.config.profiles[name] = {
      ...(existing ?? { url: pending.url }),
      pending,
    };
  }
  saveConfig(ctx.config, ctx.rt.env);
}

function secondsLeft(ctx: Ctx, pending: PendingLogin): number {
  return Math.max(
    0,
    Math.round((Date.parse(pending.expiresAt) - ctx.rt.now()) / 1000)
  );
}

/** The block a person (or an agent's user) needs: where to go, what code. */
function printApprovalBlock(
  ctx: Ctx,
  pending: PendingLogin,
  status: "waiting" | "pending"
): void {
  const resume = `vamsa login --resume${ctx.target.profileName === "default" ? "" : ` --profile ${ctx.target.profileName}`}`;
  ctx.print({
    login: {
      status,
      verificationUri: pending.verificationUri,
      verificationUriComplete: pending.verificationUriComplete,
      userCode: displayCode(pending.userCode),
      expiresIn: secondsLeft(ctx, pending),
      profile: ctx.target.profileName,
    },
    help:
      status === "waiting"
        ? [
            "open verificationUriComplete in a browser, sign in, and approve",
            `${resume}  (if this command is interrupted)`,
          ]
        : [
            "open verificationUriComplete in a browser, sign in, and approve",
            `${resume}  (after approving, to finish)`,
          ],
  });
}

/**
 * Swap the short-lived session from the device grant for a revocable PAT,
 * then end the session. The stored credential is always the PAT.
 */
async function finishDeviceLogin(
  ctx: Ctx,
  pending: PendingLogin,
  sessionToken: string
): Promise<void> {
  const session = createClient({
    url: pending.url,
    token: sessionToken,
    fetch: ctx.rt.fetch,
    debug: ctx.debug,
  });
  let created: {
    id: string;
    token: string;
    scope: string;
    expiresAt: string | null;
  };
  let me: Me;
  let note: string | undefined;
  try {
    me = (await session.request<Me>("GET", "/auth/me")).data;
    const ceiling = SCOPE_FOR_ROLE[me.role] ?? "read";
    let scope = pending.scope as Scope;
    if (SCOPES.indexOf(scope) > SCOPES.indexOf(ceiling)) {
      note = `scope lowered from ${scope} to ${ceiling} (your role is ${me.role})`;
      scope = ceiling;
    }
    created = (
      await session.request<typeof created>("POST", "/tokens", {
        body: {
          name: pending.name,
          scope,
          expiresInDays: pendingDays(pending),
        },
      })
    ).data;
  } finally {
    // Never leave the device session behind, even if minting failed
    try {
      await session.request("POST", "/auth/logout");
    } catch {
      ctx.debug(
        "could not end the device-login session; it expires on its own"
      );
    }
  }

  const path = await storeCredential(
    ctx,
    pending.url,
    created.token,
    "pat",
    me.email
  );
  ctx.print({
    loggedIn: {
      profile: ctx.target.profileName,
      url: pending.url,
      email: me.email,
      role: me.role,
      tokenType: "pat",
      tokenScope: created.scope,
      tokenId: created.id,
      tokenName: pending.name,
      expiresAt: created.expiresAt,
      config: path,
      ...(note ? { note } : {}),
    },
    help: [
      "vamsa whoami",
      "vamsa person list",
      `vamsa token revoke ${created.id}  (to sign this machine out for good)`,
    ],
  });
}

function pendingDays(pending: PendingLogin): number {
  return pending.expiresInDays ?? DEFAULT_TOKEN_DAYS;
}

async function waitAndFinish(ctx: Ctx, pending: PendingLogin): Promise<void> {
  const deps = deviceDeps(ctx);
  const spin = ctx.rt.interactive ? ctx.rt.spinner() : undefined;
  spin?.start("Waiting for approval in the browser");
  ctx.debug(`polling every ${pending.interval}s until ${pending.expiresAt}`);
  let sessionToken: string;
  try {
    sessionToken = await waitForApproval(deps, pending);
  } catch (err) {
    spin?.stop("Login not approved");
    if (err instanceof CliError && err.code !== "connection_failed") {
      savePending(ctx, undefined);
    }
    throw err;
  }
  spin?.stop("Approved");
  await finishDeviceLogin(ctx, pending, sessionToken);
}

async function deviceLogin(
  ctx: Ctx,
  url: string,
  opts: {
    scope: Scope;
    name: string;
    days: number;
    wait: boolean;
    browser: boolean;
  }
): Promise<void> {
  const code = await requestDeviceCode(deviceDeps(ctx), url, opts.scope);
  const pending: PendingLogin = {
    url,
    deviceCode: code.deviceCode,
    userCode: code.userCode,
    verificationUri: code.verificationUri,
    verificationUriComplete: code.verificationUriComplete,
    expiresAt: new Date(ctx.rt.now() + code.expiresIn * 1000).toISOString(),
    interval: code.interval,
    scope: opts.scope,
    name: opts.name,
    expiresInDays: opts.days,
  };
  // Saved first, so an interrupted wait can be finished with --resume
  savePending(ctx, pending);
  printApprovalBlock(ctx, pending, opts.wait ? "waiting" : "pending");

  if (opts.browser && ctx.rt.interactive) {
    const opened = await ctx.rt.openUrl(pending.verificationUriComplete);
    ctx.debug(opened ? "opened the browser" : "could not open a browser");
  }
  if (!opts.wait) return;
  await waitAndFinish(ctx, pending);
}

async function resumeLogin(ctx: Ctx, wait: boolean): Promise<void> {
  const name = ctx.target.profileName;
  const pending = (ctx.config.profiles[name] as Profile | undefined)?.pending;
  if (!pending) {
    throw new CliError(
      "no_pending_login",
      `No browser login waiting for profile "${name}"`,
      `vamsa login --no-wait${name === "default" ? "" : ` --profile ${name}`}  (start one)`
    );
  }
  if (ctx.rt.now() >= Date.parse(pending.expiresAt)) {
    savePending(ctx, undefined);
    throw expiredError();
  }
  if (!wait) {
    // Check once and report, without blocking
    let result;
    try {
      result = await pollOnce(
        deviceDeps(ctx),
        pending.url,
        pending.deviceCode,
        pending.interval
      );
    } catch (err) {
      savePending(ctx, undefined);
      throw err;
    }
    if (result.status === "pending") {
      printApprovalBlock(ctx, pending, "pending");
      return;
    }
    await finishDeviceLogin(ctx, pending, result.accessToken);
    return;
  }
  printApprovalBlock(ctx, pending, "waiting");
  await waitAndFinish(ctx, pending);
}

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

export const login = leaf({
  name: "login",
  description:
    "Log in through the browser (SSO or password) and save a personal access token",
  args: {
    scope: {
      type: "enum",
      options: [...SCOPES],
      description:
        "Token scope: read, write or admin; capped by your role (default write)",
    },
    name: {
      type: "string",
      description: "Token name (default: this computer's hostname)",
      valueHint: "name",
    },
    "expires-in-days": {
      type: "string",
      description: `Token lifetime in days (default ${DEFAULT_TOKEN_DAYS})`,
      valueHint: "n",
    },
    "no-browser": {
      type: "boolean",
      description: "Do not open a browser; just print the link",
    },
    "no-wait": {
      type: "boolean",
      description:
        "Print the link and code, then exit; finish later with --resume",
    },
    resume: {
      type: "boolean",
      description: "Finish a login started with --no-wait",
    },
    token: {
      type: "string",
      description: "Store an existing personal access token instead",
      valueHint: "vms_...",
    },
    password: {
      type: "boolean",
      description: "Use email + password instead of the browser",
    },
    email: {
      type: "string",
      description: "Account email (--password mode)",
      valueHint: "email",
    },
    "password-stdin": {
      type: "boolean",
      description: "Read the password from stdin (--password mode)",
    },
  },
  handler: async (ctx, args) => {
    // citty maps --no-x to x=false
    const a = args as Record<string, unknown>;
    const wait = a.wait !== false && !a["no-wait"];
    const browser = a.browser !== false && !a["no-browser"];

    if (args.resume) {
      await resumeLogin(ctx, wait);
      return;
    }

    let url = ctx.target.url;
    if (!str(args.url) && !ctx.rt.env.VAMSA_URL && ctx.rt.interactive) {
      const answer = await ask(() =>
        text({ message: "Server URL", initialValue: url })
      );
      if (answer) url = normalizeUrl(answer);
    }

    const pat = str(args.token);
    if (pat) {
      if (!pat.startsWith("vms_")) {
        throw usageError(
          "--token must be a personal access token starting with vms_",
          "vamsa token create --name <name>  (while logged in)"
        );
      }
      const client = createClient({
        url,
        token: pat,
        fetch: ctx.rt.fetch,
        debug: ctx.debug,
      });
      const me = (await client.request<Me>("GET", "/auth/me")).data;
      const path = await storeCredential(ctx, url, pat, "pat", me.email);
      ctx.print({
        loggedIn: {
          profile: ctx.target.profileName,
          url,
          email: me.email,
          role: me.role,
          tokenType: "pat",
          tokenScope: me.tokenScope,
          config: path,
        },
        help: ["vamsa whoami", "vamsa person list"],
      });
      return;
    }

    if (args.password || str(args.email) || args["password-stdin"]) {
      await passwordLogin(ctx, url, args);
      return;
    }

    const scope = (str(args.scope) ?? "write") as Scope;
    if (!SCOPES.includes(scope)) {
      throw usageError(`--scope must be one of ${SCOPES.join(", ")}`);
    }
    await deviceLogin(ctx, url, {
      scope,
      name: str(args.name) ?? ctx.rt.hostname,
      days:
        intFlag(args["expires-in-days"], "expires-in-days", { max: 3650 }) ??
        DEFAULT_TOKEN_DAYS,
      wait,
      browser,
    });
  },
});

async function passwordLogin(
  ctx: Ctx,
  url: string,
  args: { email?: unknown; "password-stdin"?: unknown }
): Promise<void> {
  const email = await requireValue(ctx, str(args.email), "email", () =>
    ask(() => text({ message: "Email" }))
  );

  let pass: string | undefined;
  if (args["password-stdin"]) {
    if (ctx.rt.stdinIsTTY) {
      throw usageError(
        "--password-stdin needs the password piped in, but stdin is a terminal",
        'echo "$PASSWORD" | vamsa login --email <email> --password-stdin  (or drop --password-stdin to be prompted)'
      );
    }
    pass = (await ctx.rt.readStdin()).replace(/\r?\n$/, "");
  } else if (ctx.rt.interactive) {
    pass = await ask(() => promptPassword({ message: "Password" }));
  }
  if (!pass) {
    throw usageError(
      "No password given",
      'echo "$PASSWORD" | vamsa login --email <email> --password-stdin  (or plain `vamsa login` for browser login)'
    );
  }

  const client = createClient({ url, fetch: ctx.rt.fetch, debug: ctx.debug });
  const res = await client.request<{
    user: { email: string; role: string; name: string | null };
    token: string;
  }>("POST", "/auth/login", {
    body: { email, password: pass },
    headers: { "X-Vamsa-Client": "cli" },
  });
  if (!res.data.token) {
    throw new CliError(
      "no_token",
      "Server did not return a session token",
      "the server may predate CLI support; use --token vms_... instead"
    );
  }

  const path = await storeCredential(
    ctx,
    url,
    res.data.token,
    "session",
    email
  );
  ctx.print({
    loggedIn: {
      profile: ctx.target.profileName,
      url,
      email: res.data.user.email,
      role: res.data.user.role,
      tokenType: "session",
      config: path,
    },
    help: [
      "vamsa whoami",
      "vamsa person list",
      "vamsa token create --name <name> --scope read  (long-lived token)",
    ],
  });
}

export const logout = leaf({
  name: "logout",
  description: "Forget the profile's credential (ends the session server-side)",
  handler: async (ctx) => {
    const name = ctx.target.profileName;
    const profile = ctx.config.profiles[name] as
      (typeof ctx.config.profiles)[string] | undefined;

    if (!profile?.token) {
      ctx.print({
        loggedOut: { profile: name, note: "was not logged in" },
        help: ["vamsa login"],
      });
      return;
    }

    let serverNote = "token kept valid on server (personal access token)";
    if (profile.tokenType === "session") {
      try {
        await ctx.api.request("POST", "/auth/logout");
        serverNote = "session ended on server";
      } catch {
        serverNote = "could not reach server; session expires on its own";
      }
    }

    const wasPat = profile.tokenType === "pat";
    delete profile.token;
    delete profile.tokenType;
    saveConfig(ctx.config, ctx.rt.env);
    ctx.print({
      loggedOut: { profile: name, server: serverNote },
      help: wasPat
        ? ["vamsa token revoke <id>  (to invalidate it)"]
        : ["vamsa login"],
    });
  },
});

export const whoami = leaf({
  name: "whoami",
  description: "Show the current user, role and credential",
  handler: async (ctx) => {
    ctx.requireAuth();
    const me = (await ctx.api.request<Me>("GET", "/auth/me")).data;
    ctx.print({
      user: {
        id: me.id,
        email: me.email,
        name: me.name,
        role: me.role,
        tokenType: ctx.target.tokenType ?? "session",
        tokenScope: me.tokenScope,
        profile: ctx.target.profileName,
        url: ctx.target.url,
        source: ctx.target.tokenSource,
      },
      help: ["vamsa person list", "vamsa token list"],
    });
  },
});
