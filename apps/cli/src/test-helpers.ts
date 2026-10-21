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
  }
): Promise<FakeRun> {
  let stdout = "";
  let stderr = "";
  const rt: Runtime = {
    env: { HOME: opts.home, ...opts.env },
    stdout: (s) => {
      stdout += s;
    },
    stderr: (s) => {
      stderr += s;
    },
    interactive: opts.interactive ?? false,
    readStdin: async () => opts.stdin ?? "",
    fetch:
      opts.fetch ??
      (async () => {
        throw new Error("unexpected fetch");
      }),
    execPath: join(opts.home, ".local/bin/vamsa"),
  };
  const code = await run(argv, rt);
  return { code, stdout, stderr };
}
