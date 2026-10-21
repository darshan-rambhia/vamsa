import { group, leaf } from "../lib/command";
import { configPath, saveConfig } from "../lib/config";
import { CliError } from "../lib/errors";
import { listView } from "../lib/output";

const list = leaf({
  name: "list",
  description: "List saved profiles",
  handler: async (ctx) => {
    const items = Object.entries(ctx.config.profiles).map(([name, p]) => ({
      name,
      current: name === ctx.config.current,
      url: p.url,
      email: p.email ?? null,
      auth: p.token ? (p.tokenType ?? "session") : "none",
    }));
    ctx.print({
      ...listView({
        name: "profiles",
        items,
        fields: ["name", "current", "url", "email", "auth"],
        full: true,
        emptyMessage: `No profiles saved in ${configPath(ctx.rt.env)}`,
      }),
      help: items.length
        ? ["vamsa profile use <name>", "vamsa profile remove <name>"]
        : ["vamsa login --url <url> --email <email> --password-stdin"],
    });
  },
});

const use = leaf({
  name: "use",
  description: "Make a profile the default",
  args: {
    name: { type: "positional", required: true, description: "Profile name" },
  },
  handler: async (ctx, args) => {
    const name = args.name;
    if (!(name in ctx.config.profiles)) {
      throw new CliError(
        "not_found",
        `No profile named "${name}"`,
        "vamsa profile list"
      );
    }
    ctx.config.current = name;
    saveConfig(ctx.config, ctx.rt.env);
    ctx.print({
      current: { profile: name, url: ctx.config.profiles[name].url },
      help: ["vamsa whoami"],
    });
  },
});

const remove = leaf({
  name: "remove",
  description: "Delete a saved profile and its credential",
  args: {
    name: { type: "positional", required: true, description: "Profile name" },
  },
  handler: async (ctx, args) => {
    const name = args.name;
    if (!(name in ctx.config.profiles)) {
      ctx.print({
        removed: { profile: name, note: "did not exist" },
        help: ["vamsa profile list"],
      });
      return;
    }
    const { [name]: _gone, ...others } = ctx.config.profiles;
    ctx.config.profiles = others;
    saveConfig(ctx.config, ctx.rt.env);
    ctx.print({
      removed: { profile: name },
      help: ["vamsa profile list"],
    });
  },
});

export const profile = group({
  name: "profile",
  description: "Manage saved server profiles",
  subCommands: { list, use, remove },
});
