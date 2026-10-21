import { group, leaf } from "../lib/command";
import { str } from "../lib/context";
import { usageError } from "../lib/errors";
import { PERSON_PLACE_TYPES, PLACE_TYPES } from "../lib/enums";
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

type ListResponse = { items: Array<Row>; total: number };

const list = leaf({
  name: "list",
  description: "Search places by name, or list a person's places",
  args: {
    q: { type: "string", description: "Search by name", valueHint: "text" },
    person: {
      type: "string",
      description: "List places linked to this person",
      valueHint: "id",
    },
    ...LIST_FLAGS,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const q = str(args.q);
    const person = str(args.person);
    if (!q && !person) {
      throw usageError(
        "Pass --q <text> or --person <id>",
        "vamsa place list --q <name>"
      );
    }
    const { data } = await ctx.api.request<ListResponse>("GET", "/places", {
      query: { q, personId: person },
    });
    if (person) {
      // Person links nest the place; flatten for the table
      const items = data.items.map((l) => {
        const p = (l.place ?? {}) as Row;
        return {
          linkId: l.id,
          placeId: p.id,
          name: p.name,
          type: l.type,
          years: [l.fromYear, l.toYear].filter((y) => y != null).join("-"),
        };
      });
      printList(ctx, {
        name: "places",
        items,
        total: data.total,
        defaults: ["linkId", "placeId", "name", "type"],
        empty: `No places linked to person ${person}.`,
        help: ["vamsa place get <placeId>", "vamsa place unlink <linkId>"],
        emptyHelp: [
          `vamsa place link <placeId> --person ${person} --type BIRTH`,
        ],
      });
      return;
    }
    printList(ctx, {
      name: "places",
      items: data.items,
      total: data.total,
      defaults: ["id", "name", "placeType", "parentName"],
      empty: `No places match "${q}".`,
      help: ["vamsa place get <id>", "vamsa place hierarchy <id>"],
      emptyHelp: ["vamsa place create --name <name> --type CITY"],
    });
  },
});

const get = leaf({
  name: "get",
  description: "Show a place",
  args: {
    id: { type: "positional", required: true, description: "Place id" },
    full: { type: "boolean", description: "Do not truncate long values" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<Row>(
      "GET",
      `/places/${enc(args.id)}`
    );
    printRecord(ctx, "place", data, [
      `vamsa place children ${args.id}`,
      `vamsa place hierarchy ${args.id}`,
    ]);
  },
});

function placeListCommand(
  name: "hierarchy" | "children",
  description: string,
  empty: string
) {
  return leaf({
    name,
    description,
    args: {
      id: { type: "positional", required: true, description: "Place id" },
      ...LIST_FLAGS,
    },
    handler: async (ctx, args) => {
      ctx.requireAuth();
      const { data } = await ctx.api.request<ListResponse>(
        "GET",
        `/places/${enc(args.id)}/${name}`
      );
      printList(ctx, {
        name: "places",
        items: data.items,
        total: data.total,
        defaults: ["id", "name", "placeType"],
        empty,
        help: ["vamsa place get <id>"],
        emptyHelp:
          name === "children"
            ? [
                `vamsa place create --name <name> --type CITY --parent ${args.id}`,
              ]
            : ["vamsa place list --q <name>"],
      });
    },
  });
}

const placeFlags = {
  name: { type: "string", description: "Name", valueHint: "text" },
  type: {
    type: "string",
    description: "Place type",
    valueHint: PLACE_TYPES.join("|"),
  },
  parent: { type: "string", description: "Parent place id", valueHint: "id" },
  lat: { type: "string", description: "Latitude", valueHint: "deg" },
  lng: { type: "string", description: "Longitude", valueHint: "deg" },
  description: {
    type: "string",
    description: "Description",
    valueHint: "text",
  },
  aliases: {
    type: "string",
    description: "Alternative names (comma-separated)",
    valueHint: "a,b",
  },
} as const;

function placeBody(args: Record<string, unknown>): Row {
  const body = bodyFromFlags(args, {
    name: ["name", "string"],
    parent: ["parentId", "string"],
    lat: ["latitude", "number"],
    lng: ["longitude", "number"],
    description: ["description", "string"],
    aliases: ["alternativeNames", "list"],
  });
  const type = enumFlag(args, "type", PLACE_TYPES);
  if (type) body.placeType = type;
  return body;
}

const create = leaf({
  name: "create",
  description: "Add a place",
  args: placeFlags,
  handler: async (ctx, args) => {
    ctx.requireAuth();
    requireFlags(
      args,
      ["name", "type"],
      "vamsa place create --name <name> --type CITY"
    );
    const { data } = await ctx.api.request<Row>("POST", "/places", {
      body: placeBody(args),
    });
    ctx.print({
      created: { id: data.id, name: data.name, placeType: data.placeType },
      help: [
        `vamsa place link ${String(data.id)} --person <id> --type BIRTH`,
        `vamsa place hierarchy ${String(data.id)}`,
      ],
    });
  },
});

const update = leaf({
  name: "update",
  description: "Change a place (only the flags you pass)",
  args: {
    id: { type: "positional", required: true, description: "Place id" },
    ...placeFlags,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const body = placeBody(args);
    requireChanges(body, `vamsa place update ${args.id} --name <text>`);
    const { data } = await ctx.api.request<Row>(
      "PUT",
      `/places/${enc(args.id)}`,
      {
        body,
      }
    );
    ctx.print({
      updated: { id: data.id, fields: Object.keys(body).join(",") },
      help: [`vamsa place get ${args.id}`],
    });
  },
});

const remove = leaf({
  name: "delete",
  description: "Delete a place (succeeds if already gone; needs ADMIN)",
  args: { id: { type: "positional", required: true, description: "Place id" } },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    await deleteIdempotent(
      ctx,
      `/places/${enc(args.id)}`,
      args.id,
      ["vamsa place list --q <name>"],
      "Place not found"
    );
  },
});

const link = leaf({
  name: "link",
  description: "Link a person to a place (born, lived, worked, ...)",
  args: {
    id: { type: "positional", required: true, description: "Place id" },
    person: { type: "string", description: "Person id", valueHint: "id" },
    type: {
      type: "string",
      description: "Link type",
      valueHint: PERSON_PLACE_TYPES.join("|"),
    },
    from: { type: "string", description: "From year", valueHint: "YYYY" },
    to: { type: "string", description: "To year", valueHint: "YYYY" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    requireFlags(args, ["person"], `vamsa place link ${args.id} --person <id>`);
    const body: Row = {
      ...bodyFromFlags(args, {
        person: ["personId", "string"],
        from: ["fromYear", "int"],
        to: ["toYear", "int"],
      }),
      type: enumFlag(args, "type", PERSON_PLACE_TYPES),
    };
    const { data } = await ctx.api.request<Row>(
      "POST",
      `/places/${enc(args.id)}/persons`,
      { body }
    );
    ctx.print({
      linked: { linkId: data.id, placeId: args.id, personId: body.personId },
      help: [
        `vamsa place list --person ${String(body.personId)}`,
        `vamsa place unlink ${String(data.id)}`,
      ],
    });
  },
});

const unlink = leaf({
  name: "unlink",
  description: "Remove a person-place link (succeeds if already gone)",
  args: { id: { type: "positional", required: true, description: "Link id" } },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    await deleteIdempotent(
      ctx,
      `/places/links/${enc(args.id)}`,
      args.id,
      ["vamsa place list --person <id>"],
      "Place-person link not found"
    );
  },
});

export const place = group({
  name: "place",
  description: "Places and where people lived",
  subCommands: {
    list,
    get,
    hierarchy: placeListCommand(
      "hierarchy",
      "Show a place's ancestors, root first",
      "No hierarchy for this place."
    ),
    children: placeListCommand(
      "children",
      "List places directly inside a place",
      "This place has no child places."
    ),
    create,
    update,
    delete: remove,
    link,
    unlink,
  },
});
