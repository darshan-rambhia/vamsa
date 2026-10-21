/**
 * CLI config: profiles with a server URL and a credential.
 *
 * Location: $XDG_CONFIG_HOME/vamsa/config.json, else ~/.config/vamsa/config.json.
 * The file holds tokens, so it is written with mode 0600 (directory 0700).
 *
 * Env overrides (highest precedence after flags):
 *   VAMSA_PROFILE  profile name
 *   VAMSA_URL      server URL
 *   VAMSA_TOKEN    bearer token (session token or vms_ personal access token)
 */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { CliError, usageError } from "./errors";
import type { PendingLogin } from "./device";

export type TokenType = "session" | "pat";

export interface Profile {
  url: string;
  token?: string;
  tokenType?: TokenType;
  email?: string;
  /** Browser login started with --no-wait; `vamsa login --resume` finishes it */
  pending?: PendingLogin;
}

export interface Config {
  current: string;
  profiles: Record<string, Profile>;
}

export type Env = Record<string, string | undefined>;

export const DEFAULT_PROFILE = "default";
export const DEFAULT_URL = "http://localhost:3000";

export function configPath(env: Env = process.env): string {
  const base = env.XDG_CONFIG_HOME || join(env.HOME || homedir(), ".config");
  return join(base, "vamsa", "config.json");
}

export function emptyConfig(): Config {
  return { current: DEFAULT_PROFILE, profiles: {} };
}

export function loadConfig(env: Env = process.env): Config {
  const path = configPath(env);
  if (!existsSync(path)) return emptyConfig();
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<Config>;
    return {
      current: raw.current || DEFAULT_PROFILE,
      profiles: raw.profiles ?? {},
    };
  } catch {
    throw new CliError(
      "config_invalid",
      `Config file is not valid JSON: ${path}`,
      `fix or delete ${path}`
    );
  }
}

/**
 * Write the config atomically: a temp file created with mode 0600 in the
 * same directory, then rename over the real file. A crash mid-write never
 * leaves a truncated or world-readable config behind.
 */
export function saveConfig(config: Config, env: Env = process.env): string {
  const path = configPath(env);
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  // mkdir's mode is ignored for an existing directory; enforce it
  chmodSync(dir, 0o700);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(config, null, 2) + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    renameSync(tmp, path);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
  return path;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Normalize a server URL: https when no scheme is given, no trailing slash.
 * Plain http is refused except for loopback, so a token is never sent in
 * clear text over the network.
 */
export function normalizeUrl(input: string): string {
  const raw = input.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw
    : /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(raw)
      ? `http://${raw}`
      : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw usageError(
      `Not a valid URL: ${input}`,
      "--url https://vamsa.example"
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw usageError(
      `Unsupported URL scheme: ${url.protocol}`,
      "--url https://vamsa.example"
    );
  }
  if (url.protocol === "http:" && !LOOPBACK_HOSTS.has(url.hostname)) {
    throw usageError(
      `Refusing plain http for ${url.host}: credentials would travel unencrypted`,
      `use https://${url.host}${url.pathname === "/" ? "" : url.pathname}`
    );
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

/** Origin (scheme://host:port) of a URL, for comparing servers. */
export function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export interface ResolvedTarget {
  profileName: string;
  url: string;
  token?: string;
  tokenType?: TokenType;
  email?: string;
  /** Where the token came from, for whoami/home output */
  tokenSource: "env" | "profile" | "none";
  /**
   * Set when the profile has a token for a different server than the one
   * requested (--url / VAMSA_URL). The token is withheld in that case.
   */
  withheldFor?: string;
}

/**
 * Resolve which server and credential to use.
 * Precedence: flags > env > profile > defaults.
 */
export function resolveTarget(
  config: Config,
  flags: { profile?: string; url?: string },
  env: Env = process.env
): ResolvedTarget {
  const profileName = flags.profile || env.VAMSA_PROFILE || config.current;
  const profile = config.profiles[profileName] as Profile | undefined;

  const url = normalizeUrl(
    flags.url || env.VAMSA_URL || profile?.url || DEFAULT_URL
  );

  if (env.VAMSA_TOKEN) {
    return {
      profileName,
      url,
      token: env.VAMSA_TOKEN,
      tokenType: env.VAMSA_TOKEN.startsWith("vms_") ? "pat" : "session",
      tokenSource: "env",
    };
  }

  // Never send a profile's token to a server other than the one it was
  // issued by (e.g. `--url https://evil.example` with a saved login)
  if (profile?.token && originOf(normalizeUrl(profile.url)) !== originOf(url)) {
    return {
      profileName,
      url,
      tokenSource: "none",
      withheldFor: normalizeUrl(profile.url),
    };
  }

  return {
    profileName,
    url,
    token: profile?.token,
    tokenType: profile?.tokenType,
    email: profile?.email,
    tokenSource: profile?.token ? "profile" : "none",
  };
}
