import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { leaf } from "../lib/command";
import { str } from "../lib/context";
import { CliError, usageError } from "../lib/errors";
import { resolvePath } from "../lib/files";
import {
  bashCompletion,
  sessionHookSnippet,
  skillMarkdown,
  zshCompletion,
} from "../lib/generate";
import { tildify } from "../lib/output";

/** Root command, loaded lazily to avoid an import cycle with ./index. */
async function root() {
  return (await import("./index")).rootCommand;
}

export const setup = leaf({
  name: "setup",
  description:
    "Install the Vamsa agent skill (and print a session hook snippet)",
  args: {
    dir: {
      type: "string",
      description: "Skill directory (default ~/.claude/skills/vamsa)",
      valueHint: "path",
    },
    force: { type: "boolean", description: "Overwrite a SKILL.md you edited" },
    hook: {
      type: "boolean",
      description:
        "Also print a Claude Code SessionStart hook that shows the dashboard",
    },
  },
  handler: async (ctx, args) => {
    const home = ctx.rt.env.HOME || homedir();
    const given = str(args.dir);
    const dir = given
      ? resolvePath(ctx, given)
      : join(home, ".claude", "skills", "vamsa");
    const file = join(dir, "SKILL.md");
    const content = skillMarkdown(await root());

    let status: "created" | "updated" | "unchanged" = "created";
    if (existsSync(file)) {
      const current = readFileSync(file, "utf8");
      if (current === content) status = "unchanged";
      else if (!args.force && !current.startsWith("---\nname: vamsa\n")) {
        throw new CliError(
          "file_exists",
          `${file} exists and was not written by vamsa setup`,
          "pass --force to replace it, or --dir <path>"
        );
      } else status = "updated";
    }
    if (status !== "unchanged") {
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, content);
    }

    const out: Record<string, unknown> = {
      skill: {
        file: tildify(file, home),
        status,
        size: `${content.length} chars`,
      },
    };
    if (args.hook) {
      out.hook = {
        add_to: tildify(join(home, ".claude", "settings.json"), home),
        snippet: sessionHookSnippet("vamsa"),
      };
    }
    out.help = [
      args.hook
        ? "vamsa setup --hook --json  (copy-paste JSON for the snippet)"
        : "vamsa setup --hook",
      "vamsa completion zsh  (or bash)",
    ];
    ctx.print(out);
  },
});

export const completion = leaf({
  name: "completion",
  description: "Print a shell completion script (zsh or bash)",
  args: {
    shell: { type: "positional", required: true, description: "zsh or bash" },
  },
  handler: async (ctx, args) => {
    const cmd = await root();
    if (args.shell === "zsh") ctx.rt.stdout(zshCompletion(cmd));
    else if (args.shell === "bash") ctx.rt.stdout(bashCompletion(cmd));
    else {
      throw usageError(
        `Unsupported shell "${args.shell}"`,
        "vamsa completion zsh  |  vamsa completion bash"
      );
    }
  },
});
