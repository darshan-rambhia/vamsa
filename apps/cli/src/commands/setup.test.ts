import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decode } from "@toon-format/toon";
import { beforeEach, describe, expect, it } from "vitest";
import { skillMarkdown } from "../lib/generate";
import { leaves } from "../lib/tree";
import { runCli, tempHome } from "../test-helpers";
import { rootCommand } from "./index";

let home: string;

beforeEach(() => {
  home = tempHome();
});

describe("vamsa setup", () => {
  it("writes SKILL.md to ~/.claude/skills/vamsa and is idempotent", async () => {
    const first = await runCli(["setup"], { home });
    expect(first.code).toBe(0);
    const file = join(home, ".claude", "skills", "vamsa", "SKILL.md");
    expect(existsSync(file)).toBe(true);
    expect(decode(first.stdout)).toMatchObject({
      skill: { file: "~/.claude/skills/vamsa/SKILL.md", status: "created" },
    });
    const again = await runCli(["setup"], { home });
    expect(decode(again.stdout)).toMatchObject({
      skill: { status: "unchanged" },
    });
  });

  it("refuses to clobber a foreign SKILL.md without --force", async () => {
    const dir = join(home, "skills");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), "# my notes\n");
    const r = await runCli(["setup", "--dir", dir], { home });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("file_exists");
    expect(readFileSync(join(dir, "SKILL.md"), "utf8")).toBe("# my notes\n");
    expect(
      (await runCli(["setup", "--dir", dir, "--force"], { home })).code
    ).toBe(0);
  });

  it("--hook returns a SessionStart hook that runs the dashboard", async () => {
    const r = await runCli(["setup", "--hook", "--json"], { home });
    const out = JSON.parse(r.stdout);
    expect(out.hook.snippet.hooks.SessionStart[0].hooks[0]).toEqual({
      type: "command",
      command: "vamsa 2>/dev/null || true",
    });
  });
});

describe("generated skill", () => {
  it("documents every runnable command", () => {
    const md = skillMarkdown(rootCommand);
    expect(md.startsWith("---\nname: vamsa\ndescription: ")).toBe(true);
    for (const c of leaves(rootCommand)) {
      expect(md).toContain(`\`vamsa ${c.path.join(" ")}`);
    }
    expect(md).toContain("`vamsa admin settings set <pairs...>`");
  });
});

describe("vamsa completion", () => {
  it("bash and zsh scripts list top-level and nested commands", async () => {
    const bash = await runCli(["completion", "bash"], { home });
    expect(bash.code).toBe(0);
    expect(bash.stdout).toContain("complete -o default -F _vamsa vamsa");
    expect(bash.stdout).toContain(
      '"admin backup") echo "create list imports validate preview restore" ;;'
    );
    const zsh = await runCli(["completion", "zsh"], { home });
    expect(zsh.stdout.startsWith("#compdef vamsa")).toBe(true);
    expect(zsh.stdout).toContain('"person list") echo "--q --limit');
  });

  it("unknown shell is a usage error", async () => {
    expect((await runCli(["completion", "fish"], { home })).code).toBe(2);
  });
});

describe("--version", () => {
  it("prints the package version", async () => {
    const r = await runCli(["--version"], { home });
    expect(r.stdout).toMatch(/^vamsa \d+\.\d+\.\d+\n$/);
    expect(r.code).toBe(0);
  });
});
