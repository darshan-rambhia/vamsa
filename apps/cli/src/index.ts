#!/usr/bin/env bun
import { run } from "./main";
import type { Runtime } from "./lib/context";

async function readStdin(): Promise<string> {
  const chunks: Array<Buffer> = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
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
  execPath: process.argv[1] ?? "vamsa",
};

process.exitCode = await run(process.argv.slice(2), runtime);
