/**
 * Output formatting. Default is TOON (compact, token-efficient, readable by
 * agents and humans); `--json` switches to pretty JSON. Everything a command
 * reports, including errors, goes to stdout. stderr is only for debug logs.
 */

import { encode } from "@toon-format/toon";
import type { CliError } from "./errors";

export type Format = "toon" | "json";

/** Strings longer than this are truncated in lists unless --full is given. */
export const TRUNCATE_AT = 80;

export function format(data: unknown, fmt: Format): string {
  if (fmt === "json") return JSON.stringify(data, null, 2);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return encode(data);
  }
  // TOON would inline `help` as one comma-joined row; commands contain spaces
  // and commas, so render it in TOON's list form, one command per line.
  const { help, ...rest } = data as Record<string, unknown>;
  const body = encode(rest);
  if (!Array.isArray(help) || help.length === 0) return body;
  const lines = help.map((h) => `  - ${encode(String(h))}`);
  return `${body}\nhelp[${help.length}]:\n${lines.join("\n")}`;
}

export function formatError(err: CliError, fmt: Format): string {
  const error: Record<string, unknown> = {
    code: err.code,
    message: err.message,
  };
  if (err.status !== undefined) error.status = err.status;
  if (err.hint) error.hint = err.hint;
  if (err.details) Object.assign(error, err.details);
  return format({ error }, fmt);
}

/** Truncate long strings with a size hint so the reader knows what was cut. */
export function truncate(value: unknown, full: boolean): unknown {
  if (full || typeof value !== "string" || value.length <= TRUNCATE_AT) {
    return value;
  }
  const extra = value.length - TRUNCATE_AT;
  return `${value.slice(0, TRUNCATE_AT)}... (+${extra} chars, --full to show)`;
}

/** Parse `--fields a,b,c`; falls back to the command's defaults. */
export function parseFields(
  fields: string | undefined,
  defaults: Array<string>
): Array<string> {
  if (!fields) return defaults;
  const list = fields
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  return list.length ? list : defaults;
}

/** Pick fields from a record. Missing fields become null so columns align. */
export function pick(
  item: Record<string, unknown>,
  fields: Array<string>,
  full: boolean
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = item[f];
    out[f] =
      v === undefined
        ? null
        : typeof v === "object" && v !== null
          ? JSON.stringify(v)
          : truncate(v, full);
  }
  return out;
}

export interface ListOptions {
  /** Key for the list, e.g. "persons" */
  name: string;
  items: Array<Record<string, unknown>>;
  fields: Array<string>;
  full: boolean;
  /** Total matching items across all pages, if the API reports it */
  total?: number;
  page?: number;
  hasMore?: boolean;
  /** Message shown instead of an empty list */
  emptyMessage: string;
  help?: Array<string>;
}

/**
 * Build the standard list view: rows, total count, explicit empty message,
 * and help lines. Never produces empty output.
 */
export function listView(opts: ListOptions): Record<string, unknown> {
  const total = opts.total ?? opts.items.length;
  const view: Record<string, unknown> = {};
  if (opts.items.length === 0) {
    view[opts.name] = [];
    view.total = total;
    view.message = opts.emptyMessage;
  } else {
    view[opts.name] = opts.items.map((i) => pick(i, opts.fields, opts.full));
    view.total = total;
    view.showing = opts.items.length;
    if (opts.page !== undefined) view.page = opts.page;
    if (opts.hasMore !== undefined) view.hasMore = opts.hasMore;
  }
  if (opts.help?.length) view.help = opts.help;
  return view;
}

/** Replace the home directory prefix with ~ for display. */
export function tildify(path: string, home: string | undefined): string {
  if (home && (path === home || path.startsWith(home + "/"))) {
    return "~" + path.slice(home.length);
  }
  return path;
}
