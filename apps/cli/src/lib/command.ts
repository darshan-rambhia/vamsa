import { defineCommand } from "citty";
import { GLOBAL_ARGS } from "./context";
import type { ArgsDef, CommandDef, ParsedArgs } from "citty";
import type { Ctx } from "./context";

type Global = typeof GLOBAL_ARGS;

/** Any command regardless of its args (citty's CommandDef is invariant). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyCommand = CommandDef<any>;

/**
 * Define a leaf command. Adds the global flags and hands the handler the
 * per-invocation Ctx (passed by main.ts through citty's `data`).
 */
export function leaf<const T extends ArgsDef>(def: {
  name: string;
  description: string;
  args?: T;
  handler: (ctx: Ctx, args: ParsedArgs<T & Global>) => Promise<void>;
}): CommandDef<T & Global> {
  return defineCommand({
    meta: { name: def.name, description: def.description },
    args: { ...(def.args ?? ({} as T)), ...GLOBAL_ARGS },
    run: async (c) => def.handler(c.data as Ctx, c.args),
  });
}

/** Define a command group (e.g. `person`) with subcommands. */
export function group(def: {
  name: string;
  description: string;
  subCommands: Record<string, AnyCommand>;
}): AnyCommand {
  return defineCommand({
    meta: { name: def.name, description: def.description },
    args: GLOBAL_ARGS,
    subCommands: def.subCommands,
  });
}
