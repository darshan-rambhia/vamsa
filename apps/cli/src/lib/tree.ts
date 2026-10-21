/**
 * Walk the command tree. Used to generate shell completions and the agent
 * skill file, so both stay in sync with the real commands.
 */

import type { AnyCommand } from "./command";

export interface FlagInfo {
  name: string;
  alias: Array<string>;
  boolean: boolean;
  hint?: string;
  description: string;
}

export interface CommandInfo {
  path: Array<string>;
  description: string;
  positionals: Array<{ name: string; variadic: boolean }>;
  flags: Array<FlagInfo>;
  subcommands: Array<string>;
}

const GLOBAL = new Set(["json", "verbose", "profile", "url", "help"]);

type ArgDefLike = {
  type?: string;
  alias?: string | Array<string>;
  valueHint?: string;
  description?: string;
};

export function walk(
  cmd: AnyCommand,
  path: Array<string> = [],
  out: Array<CommandInfo> = []
): Array<CommandInfo> {
  const meta = (cmd.meta ?? {}) as { description?: string };
  const args = (cmd.args ?? {}) as Record<string, ArgDefLike>;
  const subs = (cmd.subCommands ?? {}) as Record<string, AnyCommand>;

  out.push({
    path,
    description: meta.description ?? "",
    positionals: Object.entries(args)
      .filter(([, d]) => d.type === "positional")
      .map(([name, d]) => ({ name, variadic: d.valueHint === "variadic" })),
    flags: Object.entries(args)
      .filter(([name, d]) => d.type !== "positional" && !GLOBAL.has(name))
      .map(([name, d]) => ({
        name,
        alias: d.alias === undefined ? [] : [d.alias].flat(),
        boolean: d.type === "boolean",
        hint: d.valueHint,
        description: d.description ?? "",
      })),
    subcommands: Object.keys(subs),
  });
  for (const [name, sub] of Object.entries(subs)) {
    walk(sub, [...path, name], out);
  }
  return out;
}

/** Leaf commands only (the ones that run). */
export function leaves(root: AnyCommand): Array<CommandInfo> {
  return walk(root).filter((c) => c.subcommands.length === 0 && c.path.length);
}
