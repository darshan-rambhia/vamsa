#!/usr/bin/env bun
import { hostname } from "node:os";
import { spinner } from "@clack/prompts";
import { run } from "./main";
import type { Runtime } from "./lib/context";

/** Open a URL with the platform opener; never throws. */
async function openUrl(url: string): Promise<boolean> {
  const cmd =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  try {
    const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
    return (await proc.exited) === 0;
  } catch {
    return false;
  }
}

async function readStdin(): Promise<string> {
  const chunks: Array<Buffer> = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const compiled = process.argv[1]?.startsWith("/$bunfs") ?? false;

/** Quote a path for a POSIX shell command line. */
function shellQuote(s: string): string {
  return /^[A-Za-z0-9_./@%+=:,-]+$/.test(s)
    ? s
    : `'${s.replace(/'/g, "'\\''")}'`;
}

const runtime: Runtime = {
  env: process.env,
  stdout: (s) => process.stdout.write(s),
  stdoutBytes: (b) => process.stdout.write(b),
  cwd: process.cwd(),
  stderr: (s) => process.stderr.write(s),
  interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
  stdinIsTTY: Boolean(process.stdin.isTTY),
  readStdin,
  fetch: (input, init) => fetch(input, init),
  // Compiled binaries report a virtual /$bunfs path in argv[1]
  execPath: compiled ? process.execPath : (process.argv[1] ?? "vamsa"),
  // How to run this exact CLI again from a shell (hooks, completions)
  selfCommand: compiled
    ? shellQuote(process.execPath)
    : `${shellQuote(process.execPath)} ${shellQuote(process.argv[1] ?? "")}`,
  which: (name) => Bun.which(name) ?? undefined,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
  openUrl,
  hostname: hostname(),
  platform: process.platform,
  spinner: () => {
    const s = spinner();
    return { start: (m) => s.start(m), stop: (m) => s.stop(m) };
  },
};

process.exitCode = await run(process.argv.slice(2), runtime);
