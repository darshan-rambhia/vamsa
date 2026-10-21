import { group, leaf } from "../lib/command";
import { str } from "../lib/context";
import { EVENT_TYPES } from "../lib/enums";
import {
  LIST_FLAGS,
  bodyFromFlags,
  deleteIdempotent,
  enc,
  enumFlag,
  printList,
  requireChanges,
  requireFlags,
} from "../lib/resource";
import type { Row } from "../lib/resource";

const types = EVENT_TYPES.join("|");

const list = leaf({
  name: "list",
  description: "List a person's life events",
  args: {
    person: { type: "string", description: "Person id", valueHint: "id" },
    ...LIST_FLAGS,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    requireFlags(args, ["person"], "vamsa event list --person <id>");
    const person = str(args.person) as string;
    const { data } = await ctx.api.request<{
      items: Array<Row>;
      total: number;
    }>("GET", "/events", { query: { personId: person } });
    const items = data.items.map((e) => ({
      ...e,
      participants: Array.isArray(e.participants) ? e.participants.length : 0,
    }));
    printList(ctx, {
      name: "events",
      items,
      total: data.total,
      defaults: ["id", "type", "date", "place"],
      empty: `No events for person ${person}.`,
      help: [
        "vamsa event update <id> --place <text>",
        "vamsa event participant add <id> --person <personId>",
      ],
      emptyHelp: [
        `vamsa event create --person ${person} --type BIRTH --date YYYY-MM-DD`,
      ],
    });
  },
});

const eventFlags = {
  type: { type: "string", description: "Event type", valueHint: types },
  date: { type: "string", description: "Date", valueHint: "YYYY-MM-DD" },
  place: {
    type: "string",
    description: "Place (free text)",
    valueHint: "text",
  },
  description: {
    type: "string",
    description: "Description",
    valueHint: "text",
  },
} as const;

function eventBody(args: Record<string, unknown>): Row {
  const body = bodyFromFlags(args, {
    date: ["date", "string"],
    place: ["place", "string"],
    description: ["description", "string"],
  });
  const type = enumFlag(args, "type", EVENT_TYPES);
  if (type) body.type = type;
  return body;
}

const create = leaf({
  name: "create",
  description: "Add a life event to a person",
  args: {
    person: { type: "string", description: "Person id", valueHint: "id" },
    ...eventFlags,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    requireFlags(
      args,
      ["person", "type"],
      "vamsa event create --person <id> --type BIRTH --date YYYY-MM-DD"
    );
    const body = { ...eventBody(args), personId: str(args.person) };
    const { data } = await ctx.api.request<Row>("POST", "/events", { body });
    ctx.print({
      created: { id: data.id, type: data.type, date: data.date ?? null },
      help: [
        `vamsa event list --person ${String(body.personId)}`,
        `vamsa source cite <sourceId> --person ${String(body.personId)} --event-type ${String(data.type)}`,
      ],
    });
  },
});

const update = leaf({
  name: "update",
  description: "Change an event (only the flags you pass)",
  args: {
    id: { type: "positional", required: true, description: "Event id" },
    ...eventFlags,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const body = eventBody(args);
    requireChanges(body, `vamsa event update ${args.id} --place <text>`);
    const { data } = await ctx.api.request<Row>(
      "PUT",
      `/events/${enc(args.id)}`,
      { body }
    );
    ctx.print({
      updated: { id: data.id, fields: Object.keys(body).join(",") },
      help: [`vamsa event list --person ${String(data.personId)}`],
    });
  },
});

const remove = leaf({
  name: "delete",
  description: "Delete an event (succeeds if already gone; needs ADMIN)",
  args: { id: { type: "positional", required: true, description: "Event id" } },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    await deleteIdempotent(ctx, `/events/${enc(args.id)}`, args.id, [
      "vamsa event list --person <id>",
    ]);
  },
});

const participantAdd = leaf({
  name: "add",
  description: "Add a person to an event (e.g. the spouse at a marriage)",
  args: {
    id: { type: "positional", required: true, description: "Event id" },
    person: { type: "string", description: "Person id", valueHint: "id" },
    role: {
      type: "string",
      description: "Role, e.g. WITNESS",
      valueHint: "text",
    },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    requireFlags(
      args,
      ["person"],
      `vamsa event participant add ${args.id} --person <id>`
    );
    const res = await ctx.api.request<Row>(
      "POST",
      `/events/${enc(args.id)}/participants`,
      { body: { personId: str(args.person), role: str(args.role) } }
    );
    ctx.print({
      added: { eventId: args.id, personId: str(args.person), id: res.data.id },
      help: [`vamsa event participant remove ${args.id} --person <id>`],
    });
  },
});

const participantRemove = leaf({
  name: "remove",
  description: "Remove a person from an event (succeeds if not a participant)",
  args: {
    id: { type: "positional", required: true, description: "Event id" },
    person: { type: "string", description: "Person id", valueHint: "id" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    requireFlags(
      args,
      ["person"],
      `vamsa event participant remove ${args.id} --person <id>`
    );
    const person = str(args.person) as string;
    const res = await ctx.api.request(
      "DELETE",
      `/events/${enc(args.id)}/participants/${enc(person)}`,
      { allowNotFound: true }
    );
    ctx.print({
      removed:
        res.status === 404
          ? {
              eventId: args.id,
              personId: person,
              note: "was not a participant",
            }
          : { eventId: args.id, personId: person },
      help: [`vamsa event list --person ${person}`],
    });
  },
});

const participant = group({
  name: "participant",
  description: "People taking part in an event",
  subCommands: { add: participantAdd, remove: participantRemove },
});

export const event = group({
  name: "event",
  description: "Life events (birth, marriage, ...)",
  subCommands: { list, create, update, delete: remove, participant },
});
