import { group, leaf } from "../lib/command";
import { intFlag, str } from "../lib/context";
import { usageError } from "../lib/errors";
import { listView, parseFields, pick } from "../lib/output";
import { MAX_PAGE, fetchPage } from "../lib/paging";

const TYPES = ["PARENT", "CHILD", "SPOUSE", "SIBLING"];

type Relationship = Record<string, unknown> & { id: string };

/** The list endpoint nests the other person; flatten it into columns. */
function flatten(r: Relationship): Relationship {
  const rel = r.relatedPerson as
    { id: string; firstName: string; lastName: string } | undefined;
  if (!rel) return r;
  const { relatedPerson: _nested, ...rest } = r;
  return {
    ...rest,
    relatedPersonId: rel.id,
    relatedName: `${rel.firstName} ${rel.lastName}`.trim(),
  };
}

function checkType(type: string | undefined): string | undefined {
  if (type === undefined) return undefined;
  const t = type.toUpperCase();
  if (!TYPES.includes(t)) {
    throw usageError(`--type must be one of ${TYPES.join(", ")}`);
  }
  return t;
}

const list = leaf({
  name: "list",
  description: "List a person's relationships",
  args: {
    person: {
      type: "string",
      description: "Person id (required; the API lists per person)",
      valueHint: "id",
    },
    type: { type: "enum", options: TYPES, description: "Filter by type" },
    limit: {
      type: "string",
      description: "Rows per page, 1-100 (default 20)",
      valueHint: "n",
    },
    page: {
      type: "string",
      description: "Page number (default 1)",
      valueHint: "n",
    },
    fields: {
      type: "string",
      description:
        "Columns (default id,type,relatedPersonId,relatedName). Also: isActive,marriageDate,divorceDate",
      valueHint: "a,b,c",
    },
    full: { type: "boolean", description: "Do not truncate long values" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const personId = str(args.person);
    if (!personId) {
      throw usageError(
        "Missing --person",
        "vamsa relationship list --person <id>  (find ids with: vamsa person list)"
      );
    }
    const limit = intFlag(args.limit, "limit", { max: 100 }) ?? 20;
    // Pages are reached by following cursors; cap the walk
    const page = intFlag(args.page, "page", { max: MAX_PAGE }) ?? 1;
    const type = checkType(str(args.type));
    const data = await fetchPage<Relationship>(
      ctx.api,
      "/relationships",
      { personId, type },
      limit,
      page
    );
    ctx.print(
      listView({
        name: "relationships",
        items: data.items.map(flatten),
        fields: parseFields(str(args.fields), [
          "id",
          "type",
          "relatedPersonId",
          "relatedName",
        ]),
        full: Boolean(args.full),
        total: data.total,
        page,
        hasMore: data.hasMore,
        emptyMessage: `No relationships for person ${personId}${type ? ` of type ${type}` : ""}.`,
        help: data.items.length
          ? [
              "vamsa relationship get <id>",
              "vamsa person get <relatedPersonId>",
            ]
          : [
              `vamsa relationship create --person ${personId} --related <id> --type PARENT`,
            ],
      })
    );
  },
});

const get = leaf({
  name: "get",
  description: "Show one relationship",
  args: {
    id: { type: "positional", required: true, description: "Relationship id" },
    full: { type: "boolean", description: "Do not truncate long values" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<Relationship>(
      "GET",
      `/relationships/${encodeURIComponent(args.id)}`
    );
    const fields = Object.keys(data).filter((k) => data[k] !== null);
    ctx.print({
      relationship: pick(data, fields, Boolean(args.full)),
      help: [
        `vamsa person get ${String(data.personId)}`,
        `vamsa relationship delete ${data.id}`,
      ],
    });
  },
});

const create = leaf({
  name: "create",
  description: "Link two people",
  args: {
    person: { type: "string", description: "Person id", valueHint: "id" },
    related: {
      type: "string",
      description: "Related person id",
      valueHint: "id",
    },
    type: {
      type: "enum",
      options: TYPES,
      description: "How --related relates to --person",
    },
    "marriage-date": {
      type: "string",
      description: "For SPOUSE",
      valueHint: "YYYY-MM-DD",
    },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const personId = str(args.person);
    const relatedPersonId = str(args.related);
    const type = checkType(str(args.type));
    if (!personId || !relatedPersonId || !type) {
      throw usageError(
        "--person, --related and --type are required",
        "vamsa relationship create --person <id> --related <id> --type PARENT"
      );
    }
    const { data } = await ctx.api.request<Relationship>(
      "POST",
      "/relationships",
      {
        body: {
          personId,
          relatedPersonId,
          type,
          marriageDate: str(args["marriage-date"]),
        },
      }
    );
    ctx.print({
      created: { id: data.id, personId, relatedPersonId, type },
      help: [
        `vamsa relationship get ${data.id}`,
        `vamsa relationship list --person ${personId}`,
      ],
    });
  },
});

const remove = leaf({
  name: "delete",
  description: "Delete a relationship (succeeds if already gone; needs ADMIN)",
  args: {
    id: { type: "positional", required: true, description: "Relationship id" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const res = await ctx.api.request(
      "DELETE",
      `/relationships/${encodeURIComponent(args.id)}`,
      { allowNotFound: "Relationship not found" }
    );
    ctx.print({
      deleted:
        res.status === 404
          ? { id: args.id, note: "not found; nothing to delete" }
          : { id: args.id },
      help: ["vamsa relationship list --person <id>"],
    });
  },
});

export const relationship = group({
  name: "relationship",
  description: "Relationships between people",
  subCommands: { list, get, create, delete: remove },
});
