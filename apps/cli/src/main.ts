/**
 * CLI entry logic: resolve the subcommand, reject unknown flags (exit 2),
 * print concise help, run the handler, and turn every failure into a
 * structured error on stdout.
 *
 * citty defines the commands and parses flags; dispatch lives here because
 * citty accepts unknown flags silently and prints errors to stderr.
 */

import { parseArgs } from "citty";
import { buildCtx } from "./lib/context";
import { EXIT_OK, EXIT_USAGE, toCliError, usageError } from "./lib/errors";
import { formatError } from "./lib/output";
import { rootCommand } from "./commands";
import { VERSION } from "./lib/version";
import type { ArgDef, ArgsDef } from "citty";
import type { AnyCommand } from "./lib/command";
import type { Runtime } from "./lib/context";

const BIN = "vamsa";

interface Resolved {
  cmd: AnyCommand;
  path: Array<string>;
  rest: Array<string>;
}

function argsOf(cmd: AnyCommand): ArgsDef {
  return (cmd.args ?? {}) as ArgsDef;
}

function subsOf(cmd: AnyCommand): Record<string, AnyCommand> {
  return (cmd.subCommands ?? {}) as Record<string, AnyCommand>;
}

function metaOf(cmd: AnyCommand): { name?: string; description?: string } {
  return (cmd.meta ?? {}) as { name?: string; description?: string };
}

/** Find a flag definition by long name (kebab or camel) or alias. */
function findFlag(
  args: ArgsDef,
  name: string
): { key: string; def: ArgDef } | undefined {
  const camel = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  for (const [key, def] of Object.entries(args)) {
    if (def.type === "positional") continue;
    const alias = (def as { alias?: string | Array<string> }).alias;
    const aliases = alias === undefined ? [] : [alias].flat();
    if (key === name || key === camel || aliases.includes(name)) {
      return { key, def };
    }
  }
  return undefined;
}

/** Index of the first positional token, skipping values of string flags. */
function firstPositional(tokens: Array<string>, args: ArgsDef): number {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "--") return i + 1 < tokens.length ? i + 1 : -1;
    if (!t.startsWith("-")) return i;
    if (t.includes("=")) continue;
    const flag = findFlag(args, t.replace(/^-+/, ""));
    if (flag && flag.def.type !== "boolean") i++;
  }
  return -1;
}

function resolve(argv: Array<string>): Resolved {
  let cmd: AnyCommand = rootCommand;
  const path: Array<string> = [];
  const rest = [...argv];

  for (;;) {
    const subs = subsOf(cmd);
    if (!Object.keys(subs).length) break;
    const i = firstPositional(rest, argsOf(cmd));
    if (i === -1) break;
    const name = rest[i];
    if (!(name in subs)) {
      const where = [BIN, ...path].join(" ");
      throw usageError(
        `Unknown command "${name}" for "${where}"`,
        `commands: ${Object.keys(subs).join(", ")}  (${where} --help)`
      );
    }
    rest.splice(i, 1);
    cmd = subs[name];
    path.push(name);
  }
  return { cmd, path, rest };
}

/** Reject unknown flags, missing flag values and extra positionals. */
export function validateArgs(
  tokens: Array<string>,
  args: ArgsDef,
  where: string
): void {
  const positionals = Object.entries(args).filter(
    ([, d]) => d.type === "positional"
  );
  // A last positional with valueHint "variadic" accepts any number of values
  const last = positionals.at(-1)?.[1];
  const variadic = last?.valueHint === "variadic";
  let seenPositional = 0;
  let flagsDone = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!flagsDone && t === "--") {
      flagsDone = true;
      continue;
    }
    if (flagsDone || !t.startsWith("-") || t === "-") {
      seenPositional++;
      if (seenPositional > positionals.length && !variadic) {
        throw usageError(
          `Unexpected argument "${t}" for "${where}"`,
          `${where} --help`
        );
      }
      continue;
    }

    const [rawName, inlineValue] = t.replace(/^-+/, "").split(/=(.*)/s, 2);
    let flag = findFlag(args, rawName);
    if (!flag && rawName.startsWith("no-")) {
      const neg = findFlag(args, rawName.slice(3));
      if (neg?.def.type === "boolean") flag = neg;
    }
    if (!flag) {
      throw usageError(`Unknown flag "${t}" for "${where}"`, `${where} --help`);
    }
    if (flag.def.type !== "boolean" && inlineValue === undefined) {
      const next = tokens[i + 1] as string | undefined;
      if (next === undefined || (next.startsWith("--") && next.length > 2)) {
        throw usageError(`Flag --${flag.key} needs a value`, `${where} --help`);
      }
      i++;
    }
  }

  const missing = positionals
    .slice(seenPositional)
    .filter(([, d]) => d.required !== false);
  if (missing.length) {
    throw usageError(
      `Missing <${missing[0][0]}> for "${where}"`,
      `${where} --help`
    );
  }
}

function flagUsage(key: string, def: ArgDef): string {
  if (def.type === "boolean") return `--${key}`;
  const hint =
    def.type === "enum" && def.options
      ? def.options.join("|")
      : (def.valueHint ?? "value");
  return `--${key} <${hint}>`;
}

const GLOBAL_KEYS = new Set(["json", "verbose", "profile", "url", "help"]);

/** Concise help: usage line, description, own flags, one line of globals. */
export function renderHelp(cmd: AnyCommand, path: Array<string>): string {
  const where = [BIN, ...path].join(" ");
  const meta = metaOf(cmd);
  const args = argsOf(cmd);
  const subs = subsOf(cmd);
  const lines: Array<string> = [];

  const positionals = Object.entries(args)
    .filter(([, d]) => d.type === "positional")
    .map(([k, d]) =>
      (d as { valueHint?: string }).valueHint === "variadic"
        ? `<${k}...>`
        : `<${k}>`
    );
  const own = Object.entries(args).filter(
    ([k, d]) => d.type !== "positional" && !GLOBAL_KEYS.has(k)
  );

  if (Object.keys(subs).length) {
    lines.push(`usage: ${where} <command> [flags]`);
  } else {
    lines.push(
      `usage: ${[where, ...positionals].join(" ")}${own.length ? " [flags]" : ""}`
    );
  }
  if (meta.description) lines.push(meta.description);

  if (Object.keys(subs).length) {
    lines.push("commands:");
    const width = Math.max(...Object.keys(subs).map((k) => k.length));
    for (const [name, sub] of Object.entries(subs)) {
      lines.push(
        `  ${name.padEnd(width)}  ${metaOf(sub).description ?? ""}`.trimEnd()
      );
    }
  }
  if (own.length) {
    lines.push("flags:");
    const usages = own.map(([k, d]) => flagUsage(k, d));
    const width = Math.max(...usages.map((u) => u.length));
    own.forEach(([, d], i) => {
      lines.push(
        `  ${usages[i].padEnd(width)}  ${d.description ?? ""}`.trimEnd()
      );
    });
  }
  lines.push("global: --json --verbose --profile <name> --url <url> --help");
  if (!path.length) lines.push(`version: ${VERSION} (vamsa --version)`);
  return lines.join("\n") + "\n";
}

function wantsHelp(tokens: Array<string>): boolean {
  const end = tokens.indexOf("--");
  const flags = end === -1 ? tokens : tokens.slice(0, end);
  return flags.includes("--help") || flags.includes("-h");
}

/** --json, --json=true (not --json=false), before any `--` */
export function wantsJson(argv: Array<string>): boolean {
  const end = argv.indexOf("--");
  const flags = end === -1 ? argv : argv.slice(0, end);
  return flags.some(
    (a) => a === "--json" || (a.startsWith("--json=") && a !== "--json=false")
  );
}

/** Run the CLI. Returns the process exit code. */
export async function run(argv: Array<string>, rt: Runtime): Promise<number> {
  const fmt = wantsJson(argv) ? "json" : "toon";
  try {
    const { cmd, path, rest } = resolve(argv);

    if (wantsHelp(rest)) {
      rt.stdout(renderHelp(cmd, path));
      return EXIT_OK;
    }

    // A group given without a subcommand: show its help
    if (!cmd.run && Object.keys(subsOf(cmd)).length) {
      rt.stdout(renderHelp(cmd, path));
      return EXIT_OK;
    }

    const where = [BIN, ...path].join(" ");
    validateArgs(rest, argsOf(cmd), where);
    const args = parseArgs(rest, argsOf(cmd)) as Record<string, unknown>;
    const ctx = buildCtx(rt, args, rest);
    await cmd.run?.({
      rawArgs: rest,
      args: args as never,
      cmd,
      data: ctx,
    });
    return EXIT_OK;
  } catch (err) {
    const e = toCliError(err);
    if (e.code === "internal" && err instanceof Error && err.stack) {
      if (argv.includes("--verbose") || rt.env.VAMSA_DEBUG) {
        rt.stderr(err.stack + "\n");
      }
    }
    rt.stdout(formatError(e, fmt) + "\n");
    return e.exitCode === EXIT_USAGE ? EXIT_USAGE : e.exitCode;
  }
}
