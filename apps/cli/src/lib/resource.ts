/**
 * Shared building blocks for resource commands (list/get/create/delete), so
 * every command follows the same output rules.
 */

import { str } from "./context";
import { usageError } from "./errors";
import { listView, parseFields, pick } from "./output";
import type { Ctx } from "./context";

export type Row = Record<string, unknown>;

/** Standard flags for list commands. */
export const LIST_FLAGS = {
  fields: {
    type: "string",
    description: "Columns to show (comma-separated)",
    valueHint: "a,b,c",
  },
  full: { type: "boolean", description: "Do not truncate long values" },
} as const;

export function printList(
  ctx: Ctx,
  o: {
    name: string;
    items: Array<Row>;
    total?: number;
    defaults: Array<string>;
    empty: string;
    help: Array<string>;
    emptyHelp?: Array<string>;
  }
): void {
  ctx.print(
    listView({
      name: o.name,
      items: o.items,
      fields: parseFields(str(ctx.args.fields), o.defaults),
      full: Boolean(ctx.args.full),
      total: o.total,
      emptyMessage: o.empty,
      help: o.items.length ? o.help : (o.emptyHelp ?? o.help),
    })
  );
}

/** Print one record, skipping null/empty fields; nested values as JSON. */
export function printRecord(
  ctx: Ctx,
  key: string,
  data: Row,
  help: Array<string>
): void {
  const fields = Object.keys(data).filter(
    (k) =>
      data[k] !== null &&
      data[k] !== "" &&
      !(Array.isArray(data[k]) && (data[k] as Array<unknown>).length === 0)
  );
  ctx.print({ [key]: pick(data, fields, Boolean(ctx.args.full)), help });
}

/** DELETE that treats 404 as success with a note. */
export async function deleteIdempotent(
  ctx: Ctx,
  path: string,
  id: string,
  help: Array<string>
): Promise<void> {
  const res = await ctx.api.request("DELETE", path, { allowNotFound: true });
  ctx.print({
    deleted:
      res.status === 404
        ? { id, note: "not found; nothing to delete" }
        : { id },
    help,
  });
}

export type FieldKind = "string" | "int" | "number" | "list" | "upper";

/**
 * Build a request body from flags. Only flags the user passed are sent.
 * `map` is flag name -> [body field, kind].
 */
export function bodyFromFlags(
  args: Record<string, unknown>,
  map: Record<string, [string, FieldKind]>
): Row {
  const body: Row = {};
  for (const [flag, [field, kind]] of Object.entries(map)) {
    const raw = str(args[flag]);
    if (raw === undefined) continue;
    switch (kind) {
      case "int": {
        const n = Number(raw);
        if (!Number.isInteger(n))
          throw usageError(`--${flag} must be an integer`);
        body[field] = n;
        break;
      }
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n)) throw usageError(`--${flag} must be a number`);
        body[field] = n;
        break;
      }
      case "list":
        body[field] = raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case "upper":
        body[field] = raw.toUpperCase();
        break;
      default:
        body[field] = raw;
    }
  }
  return body;
}

/** Throw a usage error naming the first missing required flag. */
export function requireFlags(
  args: Record<string, unknown>,
  flags: Array<string>,
  example: string
): void {
  const missing = flags.filter((f) => !str(args[f]));
  if (missing.length) {
    throw usageError(
      `Missing ${missing.map((f) => `--${f}`).join(", ")}`,
      example
    );
  }
}

/** Throw if an update has nothing to change. */
export function requireChanges(body: Row, example: string): void {
  if (!Object.keys(body).length) {
    throw usageError("Nothing to update", example);
  }
}

/** Read an enum flag case-insensitively; usage error if not an option. */
export function enumFlag(
  args: Record<string, unknown>,
  flag: string,
  options: ReadonlyArray<string>
): string | undefined {
  const raw = str(args[flag]);
  if (raw === undefined) return undefined;
  const v = raw.toUpperCase();
  if (!options.includes(v)) {
    throw usageError(`--${flag} must be one of ${options.join(", ")}`);
  }
  return v;
}

export const enc = encodeURIComponent;
