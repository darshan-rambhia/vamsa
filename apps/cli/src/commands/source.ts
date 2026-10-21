import { group, leaf } from "../lib/command";
import { str } from "../lib/context";
import {
  CITATION_FORMATS,
  CONFIDENCE,
  EVENT_TYPES,
  SOURCE_TYPES,
} from "../lib/enums";
import {
  LIST_FLAGS,
  bodyFromFlags,
  deleteIdempotent,
  enc,
  enumFlag,
  printList,
  printRecord,
  requireChanges,
  requireFlags,
} from "../lib/resource";
import type { Row } from "../lib/resource";

const list = leaf({
  name: "list",
  description: "List sources (books, records, websites, ...)",
  args: {
    type: {
      type: "string",
      description: "Filter by source type",
      valueHint: SOURCE_TYPES.join("|"),
    },
    person: {
      type: "string",
      description: "Only sources cited for this person",
      valueHint: "id",
    },
    ...LIST_FLAGS,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const type = enumFlag(args, "type", SOURCE_TYPES);
    const { data } = await ctx.api.request<{
      items: Array<Row>;
      total: number;
    }>("GET", "/sources", { query: { type, personId: str(args.person) } });
    printList(ctx, {
      name: "sources",
      items: data.items,
      total: data.total,
      defaults: ["id", "title", "sourceType", "eventCount"],
      empty:
        type || args.person
          ? "No sources match those filters."
          : "No sources yet.",
      help: [
        "vamsa source get <id>",
        "vamsa source citation <id> --format MLA",
      ],
      emptyHelp: ['vamsa source create --title "<title>" --type BOOK'],
    });
  },
});

const get = leaf({
  name: "get",
  description: "Show a source",
  args: {
    id: { type: "positional", required: true, description: "Source id" },
    full: { type: "boolean", description: "Do not truncate long values" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<Row>(
      "GET",
      `/sources/${enc(args.id)}`
    );
    printRecord(ctx, "source", data, [
      `vamsa source cite ${args.id} --person <id> --event-type BIRTH`,
      `vamsa source citation ${args.id}`,
    ]);
  },
});

const sourceFlags = {
  title: { type: "string", description: "Title", valueHint: "text" },
  author: { type: "string", description: "Author", valueHint: "text" },
  type: {
    type: "string",
    description: "Source type",
    valueHint: SOURCE_TYPES.join("|"),
  },
  published: {
    type: "string",
    description: "Publication date",
    valueHint: "text",
  },
  repository: {
    type: "string",
    description: "Where it is held",
    valueHint: "text",
  },
  url: { type: "string", description: "URL", valueHint: "url" },
  description: {
    type: "string",
    description: "Description",
    valueHint: "text",
  },
  notes: { type: "string", description: "Notes", valueHint: "text" },
  confidence: {
    type: "string",
    description: "Confidence",
    valueHint: CONFIDENCE.join("|"),
  },
} as const;

function sourceBody(args: Record<string, unknown>): Row {
  const body = bodyFromFlags(args, {
    title: ["title", "string"],
    author: ["author", "string"],
    published: ["publicationDate", "string"],
    repository: ["repository", "string"],
    url: ["url", "string"],
    description: ["description", "string"],
    notes: ["notes", "string"],
  });
  const type = enumFlag(args, "type", SOURCE_TYPES);
  if (type) body.sourceType = type;
  const confidence = enumFlag(args, "confidence", CONFIDENCE);
  if (confidence) body.confidence = confidence;
  return body;
}

const create = leaf({
  name: "create",
  description: "Add a source",
  args: sourceFlags,
  handler: async (ctx, args) => {
    ctx.requireAuth();
    requireFlags(args, ["title"], 'vamsa source create --title "<title>"');
    const { data } = await ctx.api.request<Row>("POST", "/sources", {
      body: sourceBody(args),
    });
    ctx.print({
      created: { id: data.id, title: data.title ?? str(args.title) },
      help: [
        `vamsa source cite ${String(data.id)} --person <id> --event-type BIRTH`,
        `vamsa source get ${String(data.id)}`,
      ],
    });
  },
});

const update = leaf({
  name: "update",
  description: "Change a source (only the flags you pass)",
  args: {
    id: { type: "positional", required: true, description: "Source id" },
    ...sourceFlags,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const body = sourceBody(args);
    requireChanges(body, `vamsa source update ${args.id} --author <text>`);
    await ctx.api.request("PUT", `/sources/${enc(args.id)}`, { body });
    ctx.print({
      updated: { id: args.id, fields: Object.keys(body).join(",") },
      help: [`vamsa source get ${args.id}`],
    });
  },
});

const remove = leaf({
  name: "delete",
  description: "Delete a source (succeeds if already gone; needs ADMIN)",
  args: {
    id: { type: "positional", required: true, description: "Source id" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    await deleteIdempotent(ctx, `/sources/${enc(args.id)}`, args.id, [
      "vamsa source list",
    ]);
  },
});

const cite = leaf({
  name: "cite",
  description: "Cite a source as evidence for a person's event",
  args: {
    id: { type: "positional", required: true, description: "Source id" },
    person: { type: "string", description: "Person id", valueHint: "id" },
    "event-type": {
      type: "string",
      description: "Event the source supports",
      valueHint: EVENT_TYPES.join("|"),
    },
    confidence: {
      type: "string",
      description: "Confidence",
      valueHint: CONFIDENCE.join("|"),
    },
    notes: { type: "string", description: "Notes", valueHint: "text" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    requireFlags(
      args,
      ["person", "event-type"],
      `vamsa source cite ${args.id} --person <id> --event-type BIRTH`
    );
    const body = {
      personId: str(args.person),
      eventType: enumFlag(args, "event-type", EVENT_TYPES),
      confidence: enumFlag(args, "confidence", CONFIDENCE),
      sourceNotes: str(args.notes),
    };
    const { data } = await ctx.api.request<Row>(
      "POST",
      `/sources/${enc(args.id)}/events`,
      { body }
    );
    ctx.print({
      cited: {
        id: data.id,
        sourceId: args.id,
        personId: body.personId,
        eventType: body.eventType,
      },
      help: [`vamsa source list --person ${String(body.personId)}`],
    });
  },
});

const citation = leaf({
  name: "citation",
  description: "Print a formatted citation",
  args: {
    id: { type: "positional", required: true, description: "Source id" },
    format: {
      type: "string",
      description: "Style (default MLA)",
      valueHint: CITATION_FORMATS.join("|"),
    },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const format = enumFlag(args, "format", CITATION_FORMATS) ?? "MLA";
    const { data } = await ctx.api.request<Row>(
      "GET",
      `/sources/${enc(args.id)}/citation`,
      { query: { format } }
    );
    ctx.print({
      citation: { format, text: data.citation ?? data.text ?? data },
      help: [`vamsa source citation ${args.id} --format APA`],
    });
  },
});

export const source = group({
  name: "source",
  description: "Sources and citations",
  subCommands: { list, get, create, update, delete: remove, cite, citation },
});
