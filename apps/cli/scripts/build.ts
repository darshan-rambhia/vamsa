#!/usr/bin/env bun
/**
 * Build standalone `vamsa` binaries with `bun build --compile`.
 *
 *   bun scripts/build.ts                  # all targets
 *   bun scripts/build.ts linux-x64        # one or more targets
 *
 * Output: dist/vamsa-<target> plus dist/SHA256SUMS.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

export const TARGETS = [
  "darwin-arm64",
  "darwin-x64",
  "linux-x64",
  "linux-arm64",
] as const;

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist");
const requested = process.argv.slice(2);
const unknown = requested.filter(
  (t) => !(TARGETS as ReadonlyArray<string>).includes(t)
);
if (unknown.length) {
  process.stderr.write(
    `unknown target(s): ${unknown.join(", ")}; valid: ${TARGETS.join(", ")}\n`
  );
  process.exit(2);
}
const targets = requested.length ? requested : [...TARGETS];

mkdirSync(dist, { recursive: true });
const sums: Array<string> = [];

for (const target of targets) {
  const out = join(dist, `vamsa-${target}`);
  process.stdout.write(`building ${target} -> ${out}\n`);
  await $`bun build ${join(root, "src/index.ts")} --compile --minify --target=bun-${target} --outfile ${out}`.quiet();
  const hash = createHash("sha256").update(readFileSync(out)).digest("hex");
  sums.push(`${hash}  vamsa-${target}`);
}

writeFileSync(join(dist, "SHA256SUMS"), sums.join("\n") + "\n");
process.stdout.write(
  `done: ${targets.length} binaries, checksums in dist/SHA256SUMS\n`
);
