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

  it("--hook uses `vamsa` when that name on PATH is this CLI", async () => {
    const self = join(home, ".local/bin/vamsa");
    mkdirSync(join(home, ".local/bin"), { recursive: true });
    writeFileSync(self, "");
    const r = await runCli(["setup", "--hook", "--json"], {
      home,
      path: { vamsa: self },
    });
    const out = JSON.parse(r.stdout);
    expect(out.hook.snippet.hooks.SessionStart[0].hooks[0]).toEqual({
      type: "command",
      command: "vamsa 2>/dev/null || true",
    });
    expect(out.hook.warning).toBeUndefined();
  });

  it("--hook uses the full command and warns when vamsa is not on PATH", async () => {
    const r = await runCli(["setup", "--hook", "--json"], {
      home,
      selfCommand: "/opt/bun /src/vamsa/index.ts",
    });
    const out = JSON.parse(r.stdout);
    expect(out.hook.snippet.hooks.SessionStart[0].hooks[0].command).toBe(
      "/opt/bun /src/vamsa/index.ts 2>/dev/null || true"
    );
    expect(out.hook.warning).toMatch(/not on PATH/);
  });

  it("--hook warns when a different vamsa is on PATH", async () => {
    const other = join(home, "other-vamsa");
    writeFileSync(other, "");
    const r = await runCli(["setup", "--hook", "--json"], {
      home,
      path: { vamsa: other },
    });
    expect(JSON.parse(r.stdout).hook.warning).toMatch(/not this CLI/);
  });
});

describe("setup ownership marker", () => {
  const skill = () => join(home, ".claude", "skills", "vamsa", "SKILL.md");

  it("writes a version + hash marker", async () => {
    await runCli(["setup"], { home });
    expect(readFileSync(skill(), "utf8")).toMatch(
      /\n<!-- vamsa-setup v\d+\.\d+\.\d+ sha256:[0-9a-f]{64} -->\n$/
    );
  });

  it("updates a file it wrote that is unchanged (e.g. older version)", async () => {
    await runCli(["setup"], { home });
    // Simulate an older generated file: different body, valid marker
    const { withMarker } = await import("./setup");
    writeFileSync(skill(), withMarker("---\nname: vamsa\n---\nold body\n"));
    const r = await runCli(["setup"], { home });
    expect(r.code).toBe(0);
    expect(decode(r.stdout)).toMatchObject({ skill: { status: "updated" } });
  });

  it("refuses to overwrite a generated file the user edited", async () => {
    await runCli(["setup"], { home });
    const edited = readFileSync(skill(), "utf8").replace(
      "# Vamsa CLI",
      "# Vamsa CLI (my notes)"
    );
    writeFileSync(skill(), edited);
    const r = await runCli(["setup"], { home });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("edited since");
    expect(readFileSync(skill(), "utf8")).toBe(edited);
    expect((await runCli(["setup", "--force"], { home })).code).toBe(0);
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
    expect(decode(r.stdout)).toEqual({
      version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    });
    expect(r.code).toBe(0);
  });

  it("works with --json and after a command", async () => {
    const json = await runCli(["--version", "--json"], { home });
    expect(JSON.parse(json.stdout).version).toMatch(/^\d+\.\d+\.\d+$/);
    const after = await runCli(["person", "list", "-v"], { home });
    expect(after.code).toBe(0);
    expect(decode(after.stdout)).toHaveProperty("version");
  });
});
