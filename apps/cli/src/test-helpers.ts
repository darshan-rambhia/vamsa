import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "./main";
import type { vi } from "vitest";
import type { Runtime } from "./lib/context";

export interface FakeRun {
  code: number;
  stdout: string;
  stderr: string;
}

export function tempHome(): string {
  return mkdtempSync(join(tmpdir(), "vamsa-cli-test-"));
}

export type FetchMock = ReturnType<typeof vi.fn<Runtime["fetch"]>>;

/** JSON Response helper for fetch mocks. */
export function json(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Run the CLI in-process with a fake runtime. */
export async function runCli(
  argv: Array<string>,
  opts: {
    home: string;
    env?: Record<string, string>;
    fetch?: FetchMock;
    stdin?: string;
    interactive?: boolean;
    stdinIsTTY?: boolean;
    cwd?: string;
    /** Fake PATH lookup: command name -> resolved path */
    path?: Record<string, string>;
    selfCommand?: string;
    /** Records every sleep (ms); the fake clock advances by it */
    sleeps?: Array<number>;
    /** Records URLs the CLI tried to open */
    opened?: Array<string>;
    /** Fake clock start (ms since epoch) */
    now?: number;
  }
): Promise<FakeRun> {
  let stdout = "";
  let stderr = "";
  let clock = opts.now ?? Date.now();
  const rt: Runtime = {
    env: { HOME: opts.home, ...opts.env },
    stdout: (s) => {
      stdout += s;
    },
    stdoutBytes: (b) => {
      stdout += Buffer.from(b).toString("latin1");
    },
    cwd: opts.cwd ?? opts.home,
    stderr: (s) => {
      stderr += s;
    },
    interactive: opts.interactive ?? false,
    stdinIsTTY: opts.stdinIsTTY ?? opts.interactive ?? false,
    readStdin: async () => opts.stdin ?? "",
    fetch:
      opts.fetch ??
      (async () => {
        throw new Error("unexpected fetch");
      }),
    execPath: join(opts.home, ".local/bin/vamsa"),
    selfCommand: opts.selfCommand ?? join(opts.home, ".local/bin/vamsa"),
    which: (name) => opts.path?.[name],
    sleep: async (ms) => {
      clock += ms;
      opts.sleeps?.push(ms);
    },
    now: () => clock,
    openUrl: async (url) => {
      opts.opened?.push(url);
      return true;
    },
    hostname: "test-host",
    platform: "darwin",
    spinner: () => ({
      start: (m) => {
        stderr += `[spinner] ${m}\n`;
      },
      stop: (m) => {
        stderr += `[spinner done] ${m}\n`;
      },
    }),
  };
  const code = await run(argv, rt);
  return { code, stdout, stderr };
}
