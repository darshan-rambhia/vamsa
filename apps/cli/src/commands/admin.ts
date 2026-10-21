import { group, leaf } from "../lib/command";
import { YES_FLAG, confirmDestructive } from "../lib/confirm";
import { intFlag, str } from "../lib/context";
import { CliError, usageError } from "../lib/errors";
import {
  LIST_FLAGS,
  bodyFromFlags,
  enc,
  enumFlag,
  printList,
  printRecord,
  requireChanges,
  requireFlags,
} from "../lib/resource";
import type { Ctx } from "../lib/context";
import type { Row } from "../lib/resource";

const ROLES = ["ADMIN", "MEMBER", "VIEWER"] as const;
const INVITE_STATUS = ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"] as const;

interface Paged {
  items: Array<Row>;
  pagination?: { total?: number; page?: number; hasNext?: boolean };
}

const PAGE_FLAGS = {
  page: { type: "string", description: "Page (default 1)", valueHint: "n" },
  limit: {
    type: "string",
    description: "Rows per page, 1-100 (default 20)",
    valueHint: "n",
  },
} as const;

function pageQuery(args: Record<string, unknown>) {
  return {
    page: intFlag(args.page, "page") ?? 1,
    limit: intFlag(args.limit, "limit", { max: 100 }) ?? 20,
  };
}

/** Run a call where 404 means "already done". Returns false if it was 404. */
async function idempotent(
  ctx: Ctx,
  method: string,
  path: string
): Promise<boolean> {
  const res = await ctx.api.request(method, path, { allowNotFound: true });
  return res.status !== 404;
}

// ------------------------------------------------------------------ users

const userList = leaf({
  name: "list",
  description: "List user accounts",
  args: {
    q: {
      type: "string",
      description: "Search name or email",
      valueHint: "text",
    },
    role: {
      type: "string",
      description: "Filter by role",
      valueHint: ROLES.join("|"),
    },
    active: {
      type: "string",
      description: "Filter by status",
      valueHint: "true|false",
    },
    ...PAGE_FLAGS,
    ...LIST_FLAGS,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const active = str(args.active);
    if (active && active !== "true" && active !== "false") {
      throw usageError("--active must be true or false");
    }
    const { page, limit } = pageQuery(args);
    const { data } = await ctx.api.request<Paged>("GET", "/admin/users", {
      query: {
        page,
        limit,
        search: str(args.q),
        role: enumFlag(args, "role", ROLES),
        active,
      },
    });
    const items = data.items.map((u) => ({
      ...u,
      person: u.person
        ? `${(u.person as Row).firstName} ${(u.person as Row).lastName}`
        : null,
    }));
    printList(ctx, {
      name: "users",
      items,
      total: data.pagination?.total,
      defaults: ["id", "email", "role", "isActive"],
      empty: "No users match.",
      help: [
        "vamsa admin user get <id>",
        "vamsa admin user update <id> --role MEMBER",
        ...(data.pagination?.hasNext
          ? [`vamsa admin user list --page ${page + 1}`]
          : []),
      ],
      emptyHelp: ["vamsa admin invite create --email <email> --role MEMBER"],
    });
  },
});

const userGet = leaf({
  name: "get",
  description: "Show a user account",
  args: {
    id: { type: "positional", required: true, description: "User id" },
    full: { type: "boolean", description: "Do not truncate long values" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<Row>(
      "GET",
      `/admin/users/${enc(args.id)}`
    );
    printRecord(ctx, "user", data, [
      `vamsa admin user update ${args.id} --role <role>`,
      `vamsa admin user unlock ${args.id}`,
    ]);
  },
});

const userUpdate = leaf({
  name: "update",
  description: "Change a user's name, email, role or active status",
  args: {
    id: { type: "positional", required: true, description: "User id" },
    name: { type: "string", description: "Display name", valueHint: "text" },
    email: { type: "string", description: "Email", valueHint: "email" },
    role: { type: "string", description: "Role", valueHint: ROLES.join("|") },
    active: {
      type: "boolean",
      description:
        "Activate (--no-active deactivates: ends sessions, revokes tokens)",
    },
    ...YES_FLAG,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const body = bodyFromFlags(args, {
      name: ["name", "string"],
      email: ["email", "string"],
    });
    const role = enumFlag(args, "role", ROLES);
    if (role) body.role = role;
    if (ctx.rawArgs.some((a) => a === "--active" || a === "--no-active")) {
      body.isActive = args.active !== false;
    }
    requireChanges(body, `vamsa admin user update ${args.id} --role MEMBER`);
    if (body.isActive === false) {
      await confirmDestructive(
        ctx,
        `Deactivate user ${args.id} (ends sessions, revokes API tokens)`,
        `vamsa admin user update ${args.id} --no-active`
      );
    }
    await ctx.api.request("PATCH", `/admin/users/${enc(args.id)}`, { body });
    ctx.print({
      updated: { id: args.id, fields: Object.keys(body).join(",") },
      help: [`vamsa admin user get ${args.id}`],
    });
  },
});

const userDelete = leaf({
  name: "delete",
  description: "Delete a user account (asks first; --yes when scripted)",
  args: {
    id: { type: "positional", required: true, description: "User id" },
    ...YES_FLAG,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    await confirmDestructive(
      ctx,
      `Delete user ${args.id}`,
      `vamsa admin user delete ${args.id}`
    );
    const existed = await idempotent(
      ctx,
      "DELETE",
      `/admin/users/${enc(args.id)}`
    );
    ctx.print({
      deleted: existed
        ? { id: args.id }
        : { id: args.id, note: "not found; nothing to delete" },
      help: ["vamsa admin user list"],
    });
  },
});

const userUnlock = leaf({
  name: "unlock",
  description: "Clear a failed-login lockout",
  args: { id: { type: "positional", required: true, description: "User id" } },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    await ctx.api.request("POST", `/admin/users/${enc(args.id)}/unlock`);
    ctx.print({
      unlocked: { id: args.id },
      help: [`vamsa admin user get ${args.id}`],
    });
  },
});

const userLink = leaf({
  name: "link",
  description: "Link a user to their person in the tree (--unlink to clear)",
  args: {
    id: { type: "positional", required: true, description: "User id" },
    person: { type: "string", description: "Person id", valueHint: "id" },
    unlink: { type: "boolean", description: "Remove the link" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const person = str(args.person);
    if (!person && !args.unlink) {
      throw usageError(
        "Pass --person <id> or --unlink",
        "vamsa admin user available --q <name>  (people not yet linked)"
      );
    }
    await ctx.api.request("PUT", `/admin/users/${enc(args.id)}/person`, {
      body: { personId: args.unlink ? null : person },
    });
    ctx.print({
      linked: { userId: args.id, personId: args.unlink ? null : person },
      help: [`vamsa admin user get ${args.id}`],
    });
  },
});

const userAvailable = leaf({
  name: "available",
  description: "People not yet linked to any user",
  args: {
    q: { type: "string", description: "Search by name", valueHint: "text" },
    ...LIST_FLAGS,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<{
      items: Array<Row>;
      total: number;
    }>("GET", "/admin/persons/available", { query: { q: str(args.q) } });
    printList(ctx, {
      name: "persons",
      items: data.items.map((p) => ({
        ...p,
        name: `${p.firstName} ${p.lastName}`,
      })),
      total: data.total,
      defaults: ["id", "name", "dateOfBirth"],
      empty: "Every person is already linked to a user.",
      help: ["vamsa admin user link <userId> --person <id>"],
    });
  },
});

const user = group({
  name: "user",
  description: "User accounts",
  subCommands: {
    list: userList,
    get: userGet,
    update: userUpdate,
    delete: userDelete,
    unlock: userUnlock,
    link: userLink,
    available: userAvailable,
  },
});

// ---------------------------------------------------------------- invites

const inviteList = leaf({
  name: "list",
  description: "List invites",
  args: {
    status: {
      type: "string",
      description: "Filter by status",
      valueHint: INVITE_STATUS.join("|"),
    },
    ...PAGE_FLAGS,
    ...LIST_FLAGS,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const { page, limit } = pageQuery(args);
    const status = enumFlag(args, "status", INVITE_STATUS);
    const { data } = await ctx.api.request<Paged>("GET", "/admin/invites", {
      query: { page, limit, status },
    });
    printList(ctx, {
      name: "invites",
      items: data.items,
      total: data.pagination?.total,
      defaults: ["id", "email", "role", "status"],
      empty: status ? `No ${status.toLowerCase()} invites.` : "No invites yet.",
      help: [
        "vamsa admin invite resend <id>",
        "vamsa admin invite revoke <id>",
      ],
      emptyHelp: ["vamsa admin invite create --email <email> --role MEMBER"],
    });
  },
});

const inviteCreate = leaf({
  name: "create",
  description: "Invite someone by email",
  args: {
    email: { type: "string", description: "Email", valueHint: "email" },
    role: {
      type: "string",
      description: "Role (default MEMBER)",
      valueHint: ROLES.join("|"),
    },
    person: {
      type: "string",
      description: "Pre-link to this person",
      valueHint: "id",
    },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    requireFlags(args, ["email"], "vamsa admin invite create --email <email>");
    const { data } = await ctx.api.request<Row>("POST", "/admin/invites", {
      body: {
        email: str(args.email),
        role: enumFlag(args, "role", ROLES),
        personId: str(args.person),
      },
    });
    ctx.print({
      invite: Object.fromEntries(
        ["id", "email", "role", "status", "token", "expiresAt"]
          .filter((k) => data[k] !== null && data[k] !== undefined)
          .map((k) => [k, data[k]])
      ),
      help: [
        `vamsa admin invite resend ${String(data.id)}`,
        "vamsa admin invite list",
      ],
    });
  },
});

const inviteRevoke = leaf({
  name: "revoke",
  description: "Revoke a pending invite (no-op if not pending)",
  args: {
    id: { type: "positional", required: true, description: "Invite id" },
    ...YES_FLAG,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    await confirmDestructive(
      ctx,
      `Revoke invite ${args.id}`,
      `vamsa admin invite revoke ${args.id}`
    );
    try {
      const existed = await idempotent(
        ctx,
        "POST",
        `/admin/invites/${enc(args.id)}/revoke`
      );
      ctx.print({
        revoked: existed
          ? { id: args.id }
          : { id: args.id, note: "not found; nothing to do" },
        help: [`vamsa admin invite delete ${args.id}`],
      });
    } catch (err) {
      if (
        err instanceof CliError &&
        err.status === 400 &&
        /pending/i.test(err.message)
      ) {
        ctx.print({
          revoked: { id: args.id, note: "not pending; nothing to do" },
          help: ["vamsa admin invite list"],
        });
        return;
      }
      throw err;
    }
  },
});

const inviteResend = leaf({
  name: "resend",
  description: "Resend an invite with a fresh token and expiry",
  args: {
    id: { type: "positional", required: true, description: "Invite id" },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<Row>(
      "POST",
      `/admin/invites/${enc(args.id)}/resend`
    );
    ctx.print({
      resent: {
        id: args.id,
        expiresAt:
          (data.invite as Row | undefined)?.expiresAt ?? data.expiresAt ?? null,
      },
      help: ["vamsa admin invite list --status PENDING"],
    });
  },
});

const inviteDelete = leaf({
  name: "delete",
  description: "Delete a revoked invite (asks first; --yes when scripted)",
  args: {
    id: { type: "positional", required: true, description: "Invite id" },
    ...YES_FLAG,
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    await confirmDestructive(
      ctx,
      `Delete invite ${args.id}`,
      `vamsa admin invite delete ${args.id}`
    );
    const existed = await idempotent(
      ctx,
      "DELETE",
      `/admin/invites/${enc(args.id)}`
    );
    ctx.print({
      deleted: existed
        ? { id: args.id }
        : { id: args.id, note: "not found; nothing to delete" },
      help: ["vamsa admin invite list"],
    });
  },
});

const invite = group({
  name: "invite",
  description: "Invitations",
  subCommands: {
    list: inviteList,
    create: inviteCreate,
    revoke: inviteRevoke,
    resend: inviteResend,
    delete: inviteDelete,
  },
});

// --------------------------------------------------------------- settings

const SETTING_KEYS: Record<string, "string" | "boolean" | "url"> = {
  familyName: "string",
  description: "string",
  allowSelfRegistration: "boolean",
  requireApprovalForEdits: "boolean",
  allowProfileClaiming: "boolean",
  metricsDashboardUrl: "url",
  metricsApiUrl: "url",
};

/** Parse `key=value` pairs into a typed settings patch. */
export function parseSettingPairs(pairs: Array<string>): Row {
  const patch: Row = {};
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq < 1) {
      throw usageError(
        `Expected key=value, got "${pair}"`,
        "vamsa admin settings set familyName=Kapoor"
      );
    }
    const key = pair.slice(0, eq);
    const raw = pair.slice(eq + 1);
    const kind = SETTING_KEYS[key] as (typeof SETTING_KEYS)[string] | undefined;
    if (!kind) {
      throw usageError(
        `Unknown setting "${key}"`,
        `keys: ${Object.keys(SETTING_KEYS).join(", ")}`
      );
    }
    if (kind === "boolean") {
      if (raw !== "true" && raw !== "false") {
        throw usageError(`${key} must be true or false`);
      }
      patch[key] = raw === "true";
    } else if (kind === "url") {
      patch[key] = raw === "" || raw === "null" ? null : raw;
    } else {
      patch[key] = raw;
    }
  }
  return patch;
}

const settingsGet = leaf({
  name: "get",
  description: "Show family settings",
  handler: async (ctx) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<Row>("GET", "/admin/settings");
    const { id: _id, ...rest } = data;
    ctx.print({
      settings: rest,
      help: [
        "vamsa admin settings set familyName=<name> allowProfileClaiming=true",
      ],
    });
  },
});

const settingsSet = leaf({
  name: "set",
  description: "Change settings: key=value ... (only the keys given)",
  args: {
    pairs: {
      type: "positional",
      required: true,
      description: "key=value pairs",
      valueHint: "variadic",
    },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const patch = parseSettingPairs(args._.map(String));
    const { data } = await ctx.api.request<Row>("PUT", "/admin/settings", {
      body: patch,
    });
    const changed: Row = {};
    for (const k of Object.keys(patch)) changed[k] = data[k] ?? patch[k];
    ctx.print({ updated: changed, help: ["vamsa admin settings get"] });
  },
});

const settings = group({
  name: "settings",
  description: "Family settings",
  subCommands: { get: settingsGet, set: settingsSet },
});

export const admin = group({
  name: "admin",
  description: "Administration (requires ADMIN)",
  subCommands: { user, invite, settings },
});
