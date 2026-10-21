import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, resolve } from "node:path";
import { CliError } from "./errors";
import type { Ctx } from "./context";

export function resolvePath(ctx: Ctx, p: string): string {
  return isAbsolute(p) ? p : resolve(ctx.rt.cwd, p);
}

/** Read a text file; a missing file is a structured error, not a stack trace. */
export function readTextFile(
  ctx: Ctx,
  p: string
): { path: string; name: string; text: string } {
  const path = resolvePath(ctx, p);
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new CliError(
      "file_not_found",
      `No such file: ${path}`,
      "check the path"
    );
  }
  return { path, name: basename(path), text: readFileSync(path, "utf8") };
}

/** Write bytes, refusing to clobber an existing file unless `force`. */
export function writeOutput(
  ctx: Ctx,
  p: string,
  bytes: Uint8Array,
  force: boolean
): string {
  const path = resolvePath(ctx, p);
  if (existsSync(path) && !force) {
    throw new CliError(
      "file_exists",
      `Refusing to overwrite ${path}`,
      "pass --force, or choose another path with -o <file>"
    );
  }
  writeFileSync(path, bytes);
  return path;
}

/** Human-readable byte size. */
export function size(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
