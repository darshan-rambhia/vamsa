/**
 * Per-invocation context handed to every command: IO, parsed flags, config,
 * resolved server/credential, API client and output helpers.
 */

import { createClient } from "./client";
import { CliError, usageError } from "./errors";
import { loadConfig, resolveTarget } from "./config";
import { format } from "./output";
import type { ApiClient, FetchFn } from "./client";
import type { Config, Env, ResolvedTarget } from "./config";
import type { Format } from "./output";
import type { ArgsDef } from "citty";

/** Everything the CLI touches in the outside world, injectable for tests. */
export interface Runtime {
  env: Env;
  stdout: (s: string) => void;
  stderr: (s: string) => void;
  /** True only when both stdin and stdout are TTYs; gates all prompts */
  interactive: boolean;
  /** stdin is a terminal (so --password-stdin would block on the keyboard) */
  stdinIsTTY: boolean;
  readStdin: () => Promise<string>;
  fetch: FetchFn;
  /** Path of the running executable, for the home view */
  execPath: string;
}

/** Flags accepted by every command. */
export const GLOBAL_ARGS = {
  json: { type: "boolean", description: "Output JSON instead of TOON" },
  verbose: {
    type: "boolean",
    description: "Debug logs to stderr (or set VAMSA_DEBUG=1)",
  },
  profile: {
    type: "string",
    description: "Profile to use (env VAMSA_PROFILE)",
    valueHint: "name",
  },
  url: {
    type: "string",
    description: "Server URL (env VAMSA_URL)",
    valueHint: "url",
  },
  help: { type: "boolean", alias: "h", description: "Show help" },
} as const satisfies ArgsDef;

export interface Ctx {
  rt: Runtime;
  args: Record<string, unknown>;
  /** Raw argv for this command (after the subcommand path) */
  rawArgs: Array<string>;
  fmt: Format;
  config: Config;
  target: ResolvedTarget;
  api: ApiClient;
  debug: (msg: string) => void;
  print: (data: unknown) => void;
  /** Throw unless a credential is configured */
  requireAuth: () => void;
}

export function buildCtx(
  rt: Runtime,
  args: Record<string, unknown>,
  rawArgs: Array<string> = []
): Ctx {
  const verbose = Boolean(args.verbose) || Boolean(rt.env.VAMSA_DEBUG);
  const debug = (msg: string) => {
    if (verbose) rt.stderr(`[vamsa] ${msg}\n`);
  };
  const fmt: Format = args.json ? "json" : "toon";
  const config = loadConfig(rt.env);
  const target = resolveTarget(
    config,
    {
      profile: str(args.profile),
      url: str(args.url),
    },
    rt.env
  );
  debug(
    `profile=${target.profileName} url=${target.url} token=${target.tokenSource}`
  );
  const api = createClient({
    url: target.url,
    token: target.token,
    fetch: rt.fetch,
    debug,
  });

  return {
    rt,
    args,
    rawArgs,
    fmt,
    config,
    target,
    api,
    debug,
    print: (data) => rt.stdout(format(data, fmt) + "\n"),
    requireAuth: () => {
      if (!target.token && target.withheldFor) {
        throw new CliError(
          "token_url_mismatch",
          `Profile "${target.profileName}" is logged in to ${target.withheldFor}, not ${target.url}; its token was not sent`,
          `vamsa login --url ${target.url} --profile <name>  (or drop --url / VAMSA_URL)`
        );
      }
      if (!target.token) {
        throw new CliError(
          "not_logged_in",
          `No credential for profile "${target.profileName}"`,
          "vamsa login --email <email> --password-stdin  (or --token vms_...)"
        );
      }
    },
  };
}

export function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Parse a positive integer flag. */
export function intFlag(
  v: unknown,
  name: string,
  { min = 1, max = Number.MAX_SAFE_INTEGER } = {}
): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = /^\d+$/.test(String(v)) ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) {
    throw usageError(`--${name} must be an integer between ${min} and ${max}`);
  }
  return n;
}

/** Require a value: from the flag, else prompt (TTY only), else usage error. */
export async function requireValue(
  ctx: Ctx,
  value: string | undefined,
  flag: string,
  prompt: () => Promise<string | undefined>
): Promise<string> {
  if (value) return value;
  if (ctx.rt.interactive) {
    const answer = await prompt();
    if (answer) return answer;
  }
  throw usageError(`Missing --${flag}`, `pass --${flag} <value>`);
}
