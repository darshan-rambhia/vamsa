import { tildify } from "../lib/output";
import type { Ctx } from "../lib/context";
import type { CliError } from "../lib/errors";

interface Me {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tokenScope: string | null;
}

interface Page {
  total?: number;
  items: Array<unknown>;
  hasMore: boolean;
}

/** `vamsa` with no arguments: what this is, where it points, what to do next. */
export async function homeView(ctx: Ctx): Promise<void> {
  const { target, rt } = ctx;
  const view: Record<string, unknown> = {
    about:
      "vamsa is the command-line client for a Vamsa family tree: people, relationships and API tokens.",
    bin: tildify(rt.execPath, rt.env.HOME),
    profile: target.profileName,
    url: target.url,
  };

  if (!target.token) {
    view.user = null;
    view.help = [
      "vamsa login --url <url> --email <email> --password-stdin",
      "vamsa login --token vms_...  (personal access token)",
      "vamsa --help",
    ];
    ctx.print(view);
    return;
  }

  try {
    const me = (await ctx.api.request<Me>("GET", "/auth/me")).data;
    view.user = `${me.email} (${me.role}${me.tokenScope ? `, token scope ${me.tokenScope}` : ""})`;
    const persons = (
      await ctx.api.request<Page>("GET", "/persons", { query: { limit: 1 } })
    ).data;
    view.counts = {
      persons: persons.total ?? (persons.hasMore ? "1+" : persons.items.length),
      // The REST API lists relationships per person only; no global count
      relationships: "per person: vamsa relationship list --person <id>",
    };
    view.help = [
      "vamsa person list",
      "vamsa person get <id>",
      "vamsa relationship list --person <id>",
      "vamsa token create --name <name> --scope read",
    ];
  } catch (err) {
    const e = err as CliError;
    view.user = null;
    view.status = `${e.code}: ${e.message}`;
    view.help = [
      e.hint ?? "vamsa login --email <email> --password-stdin",
      "vamsa whoami --verbose",
    ];
  }
  ctx.print(view);
}
