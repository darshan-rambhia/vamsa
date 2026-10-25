import { group, leaf } from "../lib/command";
import { intFlag, str } from "../lib/context";
import { CliError, usageError } from "../lib/errors";
import { listView, parseFields } from "../lib/output";

interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  scope: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

const listFlags = {
  fields: {
    type: "string",
    description:
      "Columns (default id,name,scope,status). Also: prefix,expiresAt,lastUsedAt,revokedAt,createdAt",
    valueHint: "a,b,c",
  },
  full: { type: "boolean", description: "Do not truncate long values" },
} as const;

function status(t: ApiToken): string {
  if (t.revokedAt) return "revoked";
  if (t.expiresAt && new Date(t.expiresAt) <= new Date()) return "expired";
  return "active";
}

const list = leaf({
  name: "list",
  description: "List your API tokens",
  args: listFlags,
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<{
      items: Array<ApiToken>;
      total: number;
    }>("GET", "/tokens");
    const items = data.items.map((t) => ({ ...t, status: status(t) }));
    ctx.print(
      listView({
        name: "tokens",
        items,
        fields: parseFields(str(args.fields), [
          "id",
          "name",
          "scope",
          "status",
        ]),
        full: Boolean(args.full),
        total: data.total,
        emptyMessage: "No API tokens yet.",
        help: items.length
          ? ["vamsa token revoke <id>", "vamsa token create --name <name>"]
          : ["vamsa token create --name <name> --scope read"],
      })
    );
  },
});

const SCOPES = ["read", "write", "admin"];

const create = leaf({
  name: "create",
  description: "Create a personal access token (shown once)",
  args: {
    name: {
      type: "string",
      description: "Label for the token",
      valueHint: "name",
    },
    scope: {
      type: "enum",
      options: SCOPES,
      description: "read=VIEWER, write=MEMBER, admin=ADMIN (default read)",
    },
    "expires-in-days": {
      type: "string",
      description: "Expire after N days (default: never)",
      valueHint: "n",
    },
  },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    if (ctx.target.tokenType === "pat") {
      // The server refuses: a token must not be able to mint more tokens
      throw new CliError(
        "session_required",
        "Creating a token needs a browser login, not a personal access token",
        `vamsa login --profile <new-profile> --name <token name>  (each browser login mints its own token)`
      );
    }
    const name = str(args.name);
    if (!name) {
      throw usageError("Missing --name", "vamsa token create --name <name>");
    }
    const scope = str(args.scope) ?? "read";
    if (!SCOPES.includes(scope)) {
      throw usageError(`--scope must be one of ${SCOPES.join(", ")}`);
    }
    const expiresInDays = intFlag(args["expires-in-days"], "expires-in-days", {
      max: 3650,
    });
    const { data } = await ctx.api.request<ApiToken & { token: string }>(
      "POST",
      "/tokens",
      { body: { name, scope, expiresInDays } }
    );
    ctx.print({
      token: {
        id: data.id,
        name: data.name,
        scope: data.scope,
        expiresAt: data.expiresAt,
        secret: data.token,
      },
      note: "the secret is shown only once; store it now",
      help: [
        `vamsa login --token ${data.token.slice(0, 10)}...  (use it on another machine/profile)`,
        "VAMSA_TOKEN=<secret> vamsa person list",
        `vamsa token revoke ${data.id}`,
      ],
    });
  },
});

const revoke = leaf({
  name: "revoke",
  description:
    "Revoke one of your tokens (no-op if already revoked or missing)",
  args: { id: { type: "positional", required: true, description: "Token id" } },
  handler: async (ctx, args) => {
    ctx.requireAuth();
    const { data } = await ctx.api.request<{ id: string; revoked: boolean }>(
      "DELETE",
      `/tokens/${encodeURIComponent(args.id)}`
    );
    ctx.print({
      revoked: data.revoked
        ? { id: data.id }
        : { id: data.id, note: "already revoked or not found; nothing to do" },
      help: ["vamsa token list"],
    });
  },
});

export const token = group({
  name: "token",
  description: "Manage personal access tokens",
  subCommands: { create, list, revoke },
});
