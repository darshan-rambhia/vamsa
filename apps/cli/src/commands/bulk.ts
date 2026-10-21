/**
 * `vamsa bulk add`: create many people or relationships from JSON/CSV via
 * the /batch endpoint, in chunks, skipping rows that already exist.
 *
 * Skip rules (so re-running the same file is safe):
 *   person:        same firstName + lastName + dateOfBirth (case-insensitive)
 *   relationship:  same personId + relatedPersonId + type
 */

import { group, leaf } from "../lib/command";
import { intFlag, str } from "../lib/context";
import { CliError, EXIT_ERROR, usageError } from "../lib/errors";
import { parseCsv } from "../lib/csv";
import { readTextFile } from "../lib/files";
import { truncate } from "../lib/output";
import type { ApiClient } from "../lib/client";
import type { Ctx } from "../lib/context";

type Row = Record<string, unknown>;
type Kind = "person" | "relationship";

const MAX_CHUNK = 100; // /batch limit
const MAX_FAILURES_SHOWN = 20;

interface Page {
  items: Array<Row>;
  nextCursor: string | null;
  hasMore: boolean;
}

async function fetchAll(
  api: ApiClient,
  path: string,
  query: Record<string, string> = {}
): Promise<Array<Row>> {
  const out: Array<Row> = [];
  let cursor: string | undefined;
  for (;;) {
    const { data } = await api.request<Page>("GET", path, {
      query: { ...query, limit: 100, cursor },
    });
    out.push(...data.items);
    if (!data.hasMore || !data.nextCursor) return out;
    cursor = data.nextCursor;
  }
}

/** Load rows from .json (array or {items:[...]}) or .csv. */
export function loadRows(name: string, text: string): Array<Row> {
  if (name.toLowerCase().endsWith(".csv")) return parseCsv(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw usageError(`${name} is not valid JSON: ${(e as Error).message}`);
  }
  const items = Array.isArray(parsed)
    ? parsed
    : (parsed as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) {
    throw usageError(`${name} must contain a JSON array (or {"items": [...]})`);
  }
  return items as Array<Row>;
}

/** Drop empty strings and coerce CSV booleans so the API accepts the row. */
export function normalize(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === "" || v === null || v === undefined) continue;
    if (v === "true" || v === "false") out[k] = v === "true";
    else out[k] = v;
  }
  if (typeof out.type === "string") out.type = out.type.toUpperCase();
  if (typeof out.gender === "string") out.gender = out.gender.toUpperCase();
  for (const field of DATE_FIELDS) {
    if (typeof out[field] === "string") out[field] = isoDate(out[field]);
  }
  return out;
}

/** Date columns: must be ISO, normalized to YYYY-MM-DD before dedupe. */
const DATE_FIELDS = [
  "dateOfBirth",
  "dateOfPassing",
  "marriageDate",
  "divorceDate",
] as const;

/** Marker for a date that is not ISO; reported as a row failure. */
const BAD_DATE = Symbol("bad-date");

/**
 * "1990-04-12" or "1990-04-12T00:00:00Z" -> "1990-04-12". Anything else
 * (12/04/1990, April 1990) is ambiguous and rejected, because the dedupe key
 * and the server would otherwise read it differently.
 */
export function isoDate(v: string): string | typeof BAD_DATE {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})(?:T[\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(
      v.trim()
    );
  if (!m) return BAD_DATE;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (
    date.getUTCMonth() !== Number(mo) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    return BAD_DATE;
  }
  return `${y}-${mo}-${d}`;
}

const personKey = (r: Row) =>
  [r.firstName, r.lastName, r.dateOfBirth ?? ""]
    .map((v) => String(v).trim().toLowerCase())
    .join("|");
const relKey = (r: Row) => [r.personId, r.relatedPersonId, r.type].join("|");

function invalidReason(kind: Kind, r: Row): string | undefined {
  const badDates = DATE_FIELDS.filter((f) => r[f] === BAD_DATE);
  if (badDates.length) {
    return `${badDates.join(", ")} must be an ISO date (YYYY-MM-DD)`;
  }
  const need =
    kind === "person"
      ? ["firstName", "lastName"]
      : ["personId", "relatedPersonId", "type"];
  const missing = need.filter((f) => !r[f]);
  return missing.length ? `missing ${missing.join(", ")}` : undefined;
}

async function existingKeys(
  ctx: Ctx,
  kind: Kind,
  rows: Array<Row>
): Promise<Set<string>> {
  if (kind === "person") {
    const persons = await fetchAll(ctx.api, "/persons");
    return new Set(persons.map(personKey));
  }
  const keys = new Set<string>();
  const personIds = [...new Set(rows.map((r) => String(r.personId ?? "")))];
  for (const personId of personIds.filter(Boolean)) {
    const rels = await fetchAll(ctx.api, "/relationships", { personId });
    for (const rel of rels) {
      const related =
        (rel.relatedPerson as Row | undefined)?.id ?? rel.relatedPersonId;
      keys.add([personId, related, rel.type].join("|"));
    }
  }
  return keys;
}

interface BatchResponse {
  results: Array<{
    index: number;
    success: boolean;
    id?: string;
    error?: string;
  }>;
}

const add = leaf({
  name: "add",
  description: "Create many people or relationships from a JSON or CSV file",
  args: {
    file: {
      type: "positional",
      required: true,
      description: "File (.json array or .csv with a header row)",
    },
    type: {
      type: "string",
      description: "What the rows are",
      valueHint: "person|relationship",
    },
    "dry-run": {
      type: "boolean",
      description: "Report what would be created or skipped; change nothing",
    },
    chunk: {
      type: "string",
      description: `Rows per /batch request (max ${MAX_CHUNK})`,
      valueHint: "n",
    },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const kind = str(args.type);
    if (kind !== "person" && kind !== "relationship") {
      throw usageError(
        "--type must be person or relationship",
        `vamsa bulk add ${args.file} --type person`
      );
    }
    const chunkSize =
      intFlag(args.chunk, "chunk", { max: MAX_CHUNK }) ?? MAX_CHUNK;
    const f = readTextFile(ctx, args.file);
    const rows = loadRows(f.name, f.text).map(normalize);
    if (!rows.length) {
      throw new CliError(
        "empty_file",
        `${f.name} has no rows`,
        "check the file"
      );
    }

    const keyOf = kind === "person" ? personKey : relKey;
    const seen = await existingKeys(ctx, kind, rows);
    const failed: Array<{ row: number; error: unknown }> = [];
    const toCreate: Array<{ row: number; data: Row }> = [];
    let skipped = 0;

    rows.forEach((data, i) => {
      const row = i + 1; // 1-based data row (header not counted)
      const bad = invalidReason(kind, data);
      if (bad) {
        failed.push({ row, error: bad });
        return;
      }
      const key = keyOf(data);
      if (seen.has(key)) {
        skipped++;
        return;
      }
      seen.add(key); // also skips duplicates within the file
      toCreate.push({ row, data });
    });

    let created = 0;
    if (!args["dry-run"]) {
      for (let i = 0; i < toCreate.length; i += chunkSize) {
        const chunk = toCreate.slice(i, i + chunkSize);
        ctx.debug(`batch ${i / chunkSize + 1}: ${chunk.length} rows`);
        let data: BatchResponse;
        try {
          ({ data } = await ctx.api.request<BatchResponse>("POST", "/batch", {
            body: {
              transaction: false,
              operations: chunk.map((c) => ({
                type: "create",
                entity: kind,
                data: c.data,
              })),
            },
          }));
        } catch (err) {
          // The batch schema validates the whole chunk up front; a bad row
          // rejects the chunk with 400. Count those rows as failed, go on.
          if (err instanceof CliError && err.status === 400) {
            for (const c of chunk)
              failed.push({ row: c.row, error: err.message });
            continue;
          }
          throw err;
        }
        for (const r of data.results) {
          if (r.success) created++;
          else
            failed.push({
              row: chunk[r.index]?.row ?? -1,
              error: r.error ?? "failed",
            });
        }
      }
    }

    failed.sort((a, b) => a.row - b.row);
    const summary: Row = {
      file: f.name,
      type: kind,
      rows: rows.length,
      [args["dry-run"] ? "wouldCreate" : "created"]: args["dry-run"]
        ? toCreate.length
        : created,
      skipped,
      failed: failed.length,
    };
    if (args["dry-run"]) summary.dryRun = true;

    const failures = failed.slice(0, MAX_FAILURES_SHOWN).map((x) => ({
      row: x.row,
      error: truncate(String(x.error), false),
    }));

    // Any failed row: one structured error carrying the summary (exit 1)
    if (failed.length) {
      throw new CliError(
        args["dry-run"] ? "invalid_rows" : "partial_failure",
        `${failed.length} of ${rows.length} rows ${args["dry-run"] ? "would fail" : "failed"}`,
        args["dry-run"]
          ? "fix the listed rows, then re-run with --dry-run"
          : "fix the listed rows and re-run; rows already created are skipped",
        EXIT_ERROR,
        undefined,
        {
          bulk: summary,
          failures,
          ...(failed.length > MAX_FAILURES_SHOWN
            ? {
                note: `showing first ${MAX_FAILURES_SHOWN} of ${failed.length} failures`,
              }
            : {}),
        }
      );
    }

    ctx.print({
      bulk: summary,
      help: args["dry-run"]
        ? [`vamsa bulk add ${args.file} --type ${kind}`]
        : [
            kind === "person"
              ? "vamsa person list"
              : "vamsa relationship list --person <id>",
          ],
    });
  },
});

export const bulk = group({
  name: "bulk",
  description: "Bulk create from files",
  subCommands: { add },
});
