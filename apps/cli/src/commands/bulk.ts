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
import { CliError, usageError } from "../lib/errors";
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
  return out;
}

const personKey = (r: Row) =>
  [r.firstName, r.lastName, r.dateOfBirth ?? ""]
    .map((v) => String(v).trim().toLowerCase())
    .join("|");
const relKey = (r: Row) => [r.personId, r.relatedPersonId, r.type].join("|");

function invalidReason(kind: Kind, r: Row): string | undefined {
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

    ctx.print({
      bulk: summary,
      ...(failed.length
        ? {
            failures: failed.slice(0, MAX_FAILURES_SHOWN).map((x) => ({
              row: x.row,
              error: truncate(String(x.error), false),
            })),
          }
        : {}),
      help: args["dry-run"]
        ? [`vamsa bulk add ${args.file} --type ${kind}`]
        : failed.length
          ? ["fix the failed rows and re-run; existing rows are skipped"]
          : [
              kind === "person"
                ? "vamsa person list"
                : "vamsa relationship list --person <id>",
            ],
    });
    if (failed.length && !args["dry-run"]) {
      throw new CliError(
        "partial_failure",
        `${failed.length} of ${rows.length} rows failed`,
        "see failures above; re-running skips rows already created"
      );
    }
  },
});

export const bulk = group({
  name: "bulk",
  description: "Bulk create from files",
  subCommands: { add },
});
