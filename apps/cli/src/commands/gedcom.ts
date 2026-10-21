import { group, leaf } from "../lib/command";
import { str } from "../lib/context";
import { CliError, EXIT_ERROR, usageError } from "../lib/errors";
import { readTextFile, size, writeOutput } from "../lib/files";
import { truncate } from "../lib/output";

interface Validation {
  valid: boolean;
  message: string;
  preview?: {
    peopleCount: number;
    familiesCount: number;
    errors: Array<
      { message?: string; line?: number } & Record<string, unknown>
    >;
  };
}

interface ImportResult {
  success: boolean;
  message: string;
  imported?: { people: number; relationships: number };
  errors?: Array<{ message: string; type: string }>;
}

/** Errors are capped so a broken file does not flood the output. */
const MAX_ERRORS = 10;

function errorRows(
  errors: Array<Record<string, unknown>> | undefined
): Record<string, unknown> {
  if (!errors?.length) return {};
  return {
    errors: errors.slice(0, MAX_ERRORS).map((e) => ({
      type: (e.type as string | undefined) ?? "error",
      message: truncate(String(e.message ?? JSON.stringify(e)), false),
    })),
    errorCount: errors.length,
    ...(errors.length > MAX_ERRORS
      ? { note: `showing first ${MAX_ERRORS} of ${errors.length} errors` }
      : {}),
  };
}

function gedFile(ctx: Parameters<typeof readTextFile>[0], file: string) {
  const f = readTextFile(ctx, file);
  if (!f.name.toLowerCase().endsWith(".ged")) {
    throw usageError(`Expected a .ged file, got ${f.name}`);
  }
  return f;
}

const validate = leaf({
  name: "validate",
  description: "Check a GEDCOM file without importing (needs ADMIN)",
  args: {
    file: { type: "positional", required: true, description: "File (.ged)" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const f = gedFile(ctx, args.file);
    const { data } = await ctx.api.request<Validation>(
      "POST",
      "/gedcom/validate",
      {
        body: { fileName: f.name, content: f.text },
      }
    );
    ctx.print({
      validation: {
        file: f.name,
        valid: data.valid,
        message: data.message,
        people: data.preview?.peopleCount ?? 0,
        families: data.preview?.familiesCount ?? 0,
      },
      ...errorRows(data.preview?.errors),
      help: data.valid
        ? [`vamsa gedcom import ${args.file}`]
        : ["fix the errors, then re-run vamsa gedcom validate <file>"],
    });
  },
});

const importCmd = leaf({
  name: "import",
  description:
    "Import people and relationships from a GEDCOM file (needs ADMIN)",
  args: {
    file: { type: "positional", required: true, description: "File (.ged)" },
    "dry-run": {
      type: "boolean",
      description: "Only validate and report what would be imported",
    },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const f = gedFile(ctx, args.file);
    if (args["dry-run"]) {
      const { data } = await ctx.api.request<Validation>(
        "POST",
        "/gedcom/validate",
        { body: { fileName: f.name, content: f.text } }
      );
      ctx.print({
        dryRun: {
          file: f.name,
          valid: data.valid,
          wouldImport: {
            people: data.preview?.peopleCount ?? 0,
            families: data.preview?.familiesCount ?? 0,
          },
          message: data.message,
        },
        ...errorRows(data.preview?.errors),
        help: data.valid
          ? [`vamsa gedcom import ${args.file}`]
          : ["fix the errors, then re-run with --dry-run"],
      });
      return;
    }
    const { data } = await ctx.api.request<ImportResult>(
      "POST",
      "/gedcom/import",
      {
        body: { fileName: f.name, content: f.text },
      }
    );
    if (!data.success) {
      throw new CliError(
        "import_failed",
        data.message,
        `vamsa gedcom validate ${args.file}`,
        EXIT_ERROR,
        undefined,
        errorRows(data.errors)
      );
    }
    ctx.print({
      imported: {
        file: f.name,
        people: data.imported?.people ?? 0,
        relationships: data.imported?.relationships ?? 0,
        message: data.message,
      },
      ...errorRows(data.errors),
      help: ["vamsa person list", "vamsa gedcom export -o backup.ged"],
    });
  },
});

const exportCmd = leaf({
  name: "export",
  description:
    "Download the tree as GEDCOM (.ged) or GEDZip (--zip) (needs ADMIN)",
  args: {
    output: {
      type: "string",
      alias: "o",
      description: "Output file, or - for stdout (default: server file name)",
      valueHint: "file",
    },
    zip: { type: "boolean", description: "GEDZip archive with media" },
    media: {
      type: "boolean",
      description: "With --zip: include media (--no-media to leave out)",
    },
    force: { type: "boolean", description: "Overwrite an existing file" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const dl = args.zip
      ? await ctx.api.download("/gedcom/export.zip", {
          media: args.media === false ? "false" : "true",
        })
      : await ctx.api.download("/gedcom/export");
    const out = str(args.output);
    if (out === "-") {
      ctx.rt.stdoutBytes(dl.bytes);
      return;
    }
    const target = out ?? dl.fileName ?? (args.zip ? "vamsa.zip" : "vamsa.ged");
    const path = writeOutput(ctx, target, dl.bytes, Boolean(args.force));
    ctx.print({
      exported: {
        file: path,
        format: args.zip ? "gedzip" : "gedcom",
        size: size(dl.bytes.length),
      },
      help: args.zip
        ? ["unzip -l " + target]
        : [`vamsa gedcom validate ${target}`],
    });
  },
});

export const gedcom = group({
  name: "gedcom",
  description: "GEDCOM import and export",
  subCommands: { validate, import: importCmd, export: exportCmd },
});
