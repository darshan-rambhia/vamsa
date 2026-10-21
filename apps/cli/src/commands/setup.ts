import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
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
import { VERSION } from "../lib/version";

/** Marker line appended to SKILL.md: version + hash of the body above it. */
const MARKER_RE = /\n<!-- vamsa-setup v(\S+) sha256:([0-9a-f]{64}) -->\n?$/;

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function withMarker(body: string): string {
  return `${body}\n<!-- vamsa-setup v${VERSION} sha256:${sha256(body)} -->\n`;
}

/** True when the file carries our marker and its body still matches the hash. */
export function writtenBySetupUnchanged(text: string): boolean {
  const m = MARKER_RE.exec(text);
  if (!m) return false;
  const body = text.slice(0, m.index);
  return sha256(body) === m[2];
}

function samePath(a: string, b: string): boolean {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return a === b;
  }
}

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
    const content = withMarker(skillMarkdown(await root()));

    let status: "created" | "updated" | "unchanged" = "created";
    if (existsSync(file)) {
      const current = readFileSync(file, "utf8");
      if (current === content) status = "unchanged";
      else if (!args.force && !writtenBySetupUnchanged(current)) {
        // Either not ours, or ours but edited since: never overwrite silently
        throw new CliError(
          "file_exists",
          `${file} was not written by vamsa setup, or was edited since`,
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
      // Use `vamsa` only if that name on PATH is this CLI; else the full command
      const onPath = ctx.rt.which("vamsa");
      const isThis = onPath !== undefined && samePath(onPath, ctx.rt.execPath);
      out.hook = {
        add_to: tildify(join(home, ".claude", "settings.json"), home),
        snippet: sessionHookSnippet(isThis ? "vamsa" : ctx.rt.selfCommand),
        ...(isThis
          ? {}
          : {
              warning: onPath
                ? `"vamsa" on PATH is ${onPath}, not this CLI; the hook uses the full command`
                : `"vamsa" is not on PATH; the hook uses the full command`,
            }),
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
