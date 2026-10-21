import { isCancel, password as promptPassword, text } from "@clack/prompts";
import { createClient } from "../lib/client";
import { leaf } from "../lib/command";
import { normalizeUrl, saveConfig } from "../lib/config";
import { requireValue, str } from "../lib/context";
import { CliError, usageError } from "../lib/errors";
import type { Profile, TokenType } from "../lib/config";
import type { Ctx } from "../lib/context";

interface Me {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tokenScope: string | null;
}

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

export const login = leaf({
  name: "login",
  description:
    "Log in and save the credential to a profile (email/password, or a vms_ token)",
  args: {
    email: {
      type: "string",
      description: "Account email (prompted on a TTY)",
      valueHint: "email",
    },
    "password-stdin": {
      type: "boolean",
      description: "Read the password from stdin (prompted on a TTY otherwise)",
    },
    token: {
      type: "string",
      description: "Store a personal access token instead of logging in",
      valueHint: "vms_...",
    },
  },
  handler: async (ctx, args) => {
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
        'echo "$PASSWORD" | vamsa login --email <email> --password-stdin'
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
  },
});

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
        help: ["vamsa login --email <email> --password-stdin"],
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
        : ["vamsa login --email <email> --password-stdin"],
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
