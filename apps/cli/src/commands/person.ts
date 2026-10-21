import { group, leaf } from "../lib/command";
import { intFlag, str } from "../lib/context";
import { usageError } from "../lib/errors";
import { listView, parseFields, pick } from "../lib/output";
import { fetchPage } from "../lib/paging";

type Person = Record<string, unknown> & {
  id: string;
  firstName: string;
  lastName: string;
};

const GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];

/** Add a display `name` column built from first/last name. */
function withName(p: Person): Person {
  return { ...p, name: `${p.firstName} ${p.lastName}`.trim() };
}

const list = leaf({
  name: "list",
  description: "List people (sorted by last name)",
  args: {
    q: { type: "string", description: "Search by name", valueHint: "text" },
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
        "Columns (default id,name,dateOfBirth,isLiving). Any person field, e.g. gender,birthPlace,bio",
      valueHint: "a,b,c",
    },
    full: { type: "boolean", description: "Do not truncate long values" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const limit = intFlag(args.limit, "limit", { max: 100 }) ?? 20;
    const page = intFlag(args.page, "page") ?? 1;
    const q = str(args.q);
    const data = await fetchPage<Person>(
      ctx.api,
      "/persons",
      { search: q },
      limit,
      page
    );
    const help = data.items.length
      ? ["vamsa person get <id>", "vamsa relationship list --person <id>"]
      : [
          q
            ? "vamsa person list  (without --q)"
            : "vamsa person create --first-name <first> --last-name <last>",
        ];
    if (data.hasMore)
      help.unshift(
        `vamsa person list --page ${page + 1}${q ? ` --q "${q}"` : ""}`
      );
    ctx.print(
      listView({
        name: "persons",
        items: data.items.map(withName),
        fields: parseFields(str(args.fields), [
          "id",
          "name",
          "dateOfBirth",
          "isLiving",
        ]),
        full: Boolean(args.full),
        total: data.total,
        page,
        hasMore: data.hasMore,
        emptyMessage: q
          ? `No people match "${q}".`
          : page > 1
            ? `No people on page ${page}.`
            : "No people in this family tree yet.",
        help,
      })
    );
  },
});

const get = leaf({
  name: "get",
  description: "Show one person",
  args: {
    id: { type: "positional", required: true, description: "Person id" },
    full: { type: "boolean", description: "Do not truncate long values" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<Person>(
      "GET",
      `/persons/${encodeURIComponent(args.id)}`
    );
    const fields = Object.keys(data).filter(
      (k) => data[k] !== null && data[k] !== ""
    );
    ctx.print({
      person: pick(data, fields, Boolean(args.full)),
      help: [
        `vamsa relationship list --person ${data.id}`,
        `vamsa person update ${data.id} --bio <text>`,
      ],
    });
  },
});

const personFlags = {
  "first-name": {
    type: "string",
    description: "First name",
    valueHint: "text",
  },
  "last-name": { type: "string", description: "Last name", valueHint: "text" },
  "maiden-name": {
    type: "string",
    description: "Maiden name",
    valueHint: "text",
  },
  "birth-date": {
    type: "string",
    description: "Date of birth",
    valueHint: "YYYY-MM-DD",
  },
  "death-date": {
    type: "string",
    description: "Date of passing (implies --no-living)",
    valueHint: "YYYY-MM-DD",
  },
  "birth-place": {
    type: "string",
    description: "Birth place",
    valueHint: "text",
  },
  gender: { type: "enum", options: GENDERS, description: "Gender" },
  bio: { type: "string", description: "Biography", valueHint: "text" },
  email: { type: "string", description: "Email", valueHint: "email" },
  living: { type: "boolean", description: "Is living (--no-living if not)" },
  data: {
    type: "string",
    description: "Extra fields as a JSON object (merged last)",
    valueHint: "json",
  },
} as const;

/** Build a person body from flags; only fields the user passed are sent. */
function personBody(
  args: Record<string, unknown>,
  rawArgs: Array<string>
): Record<string, unknown> {
  const map: Record<string, string> = {
    "first-name": "firstName",
    "last-name": "lastName",
    "maiden-name": "maidenName",
    "birth-date": "dateOfBirth",
    "death-date": "dateOfPassing",
    "birth-place": "birthPlace",
    gender: "gender",
    bio: "bio",
    email: "email",
  };
  const body: Record<string, unknown> = {};
  for (const [flag, field] of Object.entries(map)) {
    const v = str(args[flag]);
    if (v !== undefined) body[field] = v;
  }
  if (body.gender && !GENDERS.includes(String(body.gender))) {
    throw usageError(`--gender must be one of ${GENDERS.join(", ")}`);
  }
  // citty fills booleans with false when absent; only send if passed
  if (rawArgs.some((a) => a === "--living" || a === "--no-living")) {
    body.isLiving = Boolean(args.living);
  } else if (body.dateOfPassing) {
    body.isLiving = false;
  }
  const extra = str(args.data);
  if (extra) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(extra);
    } catch {
      throw usageError(
        "--data must be valid JSON",
        `--data '{"profession":"Teacher"}'`
      );
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw usageError("--data must be a JSON object");
    }
    Object.assign(body, parsed);
  }
  return body;
}

const create = leaf({
  name: "create",
  description: "Add a person",
  args: personFlags,
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const body = personBody(args, ctx.rawArgs);
    if (!body.firstName || !body.lastName) {
      throw usageError(
        "--first-name and --last-name are required",
        "vamsa person create --first-name <first> --last-name <last>"
      );
    }
    const { data } = await ctx.api.request<{ id: string }>("POST", "/persons", {
      body,
    });
    ctx.print({
      created: { id: data.id, name: `${body.firstName} ${body.lastName}` },
      help: [
        `vamsa person get ${data.id}`,
        `vamsa relationship create --person ${data.id} --related <id> --type PARENT`,
      ],
    });
  },
});

const update = leaf({
  name: "update",
  description: "Change fields on a person (only the flags you pass)",
  args: {
    id: { type: "positional", required: true, description: "Person id" },
    ...personFlags,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const body = personBody(args, ctx.rawArgs);
    if (!Object.keys(body).length) {
      throw usageError(
        "Nothing to update",
        `vamsa person update ${args.id} --bio <text>  (see --help for fields)`
      );
    }
    const { data } = await ctx.api.request<{ id: string }>(
      "PUT",
      `/persons/${encodeURIComponent(args.id)}`,
      { body }
    );
    ctx.print({
      updated: { id: data.id, fields: Object.keys(body).join(",") },
      help: [`vamsa person get ${data.id}`],
    });
  },
});

const remove = leaf({
  name: "delete",
  description: "Delete a person (succeeds if already gone; needs ADMIN)",
  args: {
    id: { type: "positional", required: true, description: "Person id" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const res = await ctx.api.request(
      "DELETE",
      `/persons/${encodeURIComponent(args.id)}`,
      { allowNotFound: true }
    );
    ctx.print({
      deleted:
        res.status === 404
          ? { id: args.id, note: "not found; nothing to delete" }
          : { id: args.id },
      help: ["vamsa person list"],
    });
  },
});

export const person = group({
  name: "person",
  description: "People in the family tree",
  subCommands: { list, get, create, update, delete: remove },
});
