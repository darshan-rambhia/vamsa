/**
 * Static scanner for createServerFn declarations under apps/web/src.
 *
 * Used by src/server/server-fn-auth-guard.test.ts. It is a regex-based source
 * scan, not an AST walk. It follows handler delegation one level into sibling
 * modules (persons.functions.ts -> persons.server.ts) so that auth checks that
 * live inside a handler still count.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SRC_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../src"
);

export type Role = "VIEWER" | "MEMBER" | "ADMIN";

/** Calls that count as an authentication check. */
const AUTH_CALL = /\b(requireAuth|getCurrentAuthenticatedUser)\s*\(/;
const REQUIRE_AUTH_ROLE = /\brequireAuth\(\s*(?:"(VIEWER|MEMBER|ADMIN)")?\s*\)/;

export interface ServerFnDecl {
  /** Path relative to apps/web/src, e.g. "server/events.ts" */
  file: string;
  name: string;
  block: string;
  source: string;
}

function walk(dir: string, out: Array<string> = []): Array<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Splits a source file into top-level declaration blocks. */
function declarationBlocks(source: string): Array<string> {
  const boundary =
    /\n(?=(?:export )?const \w+ = |(?:export )?(?:async )?function |\/\*\*)/g;
  const starts = [...source.matchAll(boundary)].map((m) => m.index ?? 0);
  return starts.map((start, i) =>
    source.slice(start, starts[i + 1] ?? source.length)
  );
}

export function collectServerFns(): Array<ServerFnDecl> {
  const decls: Array<ServerFnDecl> = [];
  for (const abs of walk(SRC_ROOT)) {
    const source = readFileSync(abs, "utf8");
    if (!source.includes("createServerFn")) continue;
    const file = abs.slice(SRC_ROOT.length + 1);
    for (const text of declarationBlocks(source)) {
      const m = /^\n(?:export )?const (\w+) = createServerFn\b/.exec(text);
      if (!m) continue;
      decls.push({ file, name: m[1], block: text, source });
    }
  }
  return decls;
}

/** Body of a top-level function `name` in `absFile`, or null. */
function functionBody(absFile: string, name: string): string | null {
  if (!existsSync(absFile)) return null;
  const source = readFileSync(absFile, "utf8");
  const m = new RegExp(`(?:export )?(?:async )?function ${name}\\b`).exec(
    source
  );
  if (!m) return null;
  const rest = source.slice(m.index + m[0].length);
  const next = rest.search(
    /\n(?:export )?(?:async )?function |\nexport const /
  );
  return next < 0 ? rest : rest.slice(0, next);
}

/** Resolves a relative import of `name` in `source` to an absolute file. */
function resolveImport(
  fromFile: string,
  source: string,
  name: string
): string | null {
  const importRe = new RegExp(
    `import\\s+(?:type\\s+)?\\{[^}]*\\b${name}\\b[^}]*\\}\\s+from\\s+["'](\\.{1,2}/[^"']+)["']`
  );
  const m = importRe.exec(source);
  if (!m) return null;
  const base = resolve(dirname(join(SRC_ROOT, fromFile)), m[1]);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Function names referenced by a block (passed to .handler or called). */
function delegatedNames(text: string): Set<string> {
  const names = new Set<string>();
  const direct = /\.handler\(\s*(\w+)\s*\)/.exec(text);
  if (direct) names.add(direct[1]);
  for (const m of text.matchAll(/\b([a-z]\w*)\s*\(/g)) {
    names.add(m[1]);
  }
  return names;
}

/**
 * Bodies of handlers reachable from `text` through sibling imports, up to
 * `depth` hops. Each body is paired with the file it lives in so nested
 * imports resolve against the right module.
 */
function reachableBodies(
  fromFile: string,
  fromSource: string,
  text: string,
  depth: number
): Array<string> {
  if (depth === 0) return [];
  const bodies: Array<string> = [];
  for (const name of delegatedNames(text)) {
    const target = resolveImport(fromFile, fromSource, name);
    const absFile = target ?? join(SRC_ROOT, fromFile);
    const body = functionBody(absFile, name);
    if (!body) continue;
    bodies.push(body);
    if (target) {
      const rel = target.slice(SRC_ROOT.length + 1);
      bodies.push(
        ...reachableBodies(rel, readFileSync(target, "utf8"), body, depth - 1)
      );
    } else {
      bodies.push(...reachableBodies(fromFile, fromSource, body, depth - 1));
    }
  }
  return bodies;
}

const DELEGATION_DEPTH = 2;

/** True when the server function calls an auth helper, inline or via a handler. */
export function hasAuthCheck(decl: ServerFnDecl): boolean {
  if (AUTH_CALL.test(decl.block)) return true;
  return reachableBodies(
    decl.file,
    decl.source,
    decl.block,
    DELEGATION_DEPTH
  ).some((b) => AUTH_CALL.test(b));
}

/**
 * Role passed to requireAuth for this function, inline or via a delegated
 * handler. `requireAuth()` with no argument means VIEWER (the default).
 * Returns null when no requireAuth call is found.
 */
export function roleOf(decl: ServerFnDecl): Role | null {
  const sources = [
    decl.block,
    ...reachableBodies(decl.file, decl.source, decl.block, DELEGATION_DEPTH),
  ];
  for (const text of sources) {
    const m = REQUIRE_AUTH_ROLE.exec(text);
    if (m) return (m[1] as Role | undefined) ?? "VIEWER";
  }
  return null;
}
