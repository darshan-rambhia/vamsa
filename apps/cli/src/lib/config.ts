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
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { CliError } from "./errors";

export type TokenType = "session" | "pat";

export interface Profile {
  url: string;
  token?: string;
  tokenType?: TokenType;
  email?: string;
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

export function saveConfig(config: Config, env: Env = process.env): string {
  const path = configPath(env);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  // writeFileSync keeps the mode of an existing file; force it
  chmodSync(path, 0o600);
  return path;
}

/** Normalize a server URL: add scheme if missing, drop trailing slash. */
export function normalizeUrl(url: string): string {
  const withScheme = /^https?:\/\//i.test(url) ? url : `http://${url}`;
  return withScheme.replace(/\/+$/, "");
}

export interface ResolvedTarget {
  profileName: string;
  url: string;
  token?: string;
  tokenType?: TokenType;
  email?: string;
  /** Where the token came from, for whoami/home output */
  tokenSource: "flag" | "env" | "profile" | "none";
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

  return {
    profileName,
    url,
    token: profile?.token,
    tokenType: profile?.tokenType,
    email: profile?.email,
    tokenSource: profile?.token ? "profile" : "none",
  };
}
