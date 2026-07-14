# ADR 014: Revert Package Manager to pnpm (Bun Remains the Runtime)

## Status

**Accepted** — supersedes [ADR 012](012-bun-package-manager-migration.md).

## Context

[ADR 012](012-bun-package-manager-migration.md) moved package management from
pnpm to Bun so that a single tool (Bun) handled runtime, testing, and package
management. In practice the package-manager half of that consolidation created
friction:

- **Workspace resolution.** Bun's workspace install is newer and occasionally
  resolves peer/override situations differently than the rest of the ecosystem
  expects, making some dependency issues hard to reproduce against upstream
  guidance.
- **Tooling expectations.** Much of the surrounding ecosystem (Renovate,
  native-build allowlisting, `overrides`, deploy tooling) is written first for
  npm/pnpm semantics.
- **Bundling.** `apps/ai` still used `bun build` (Bun's bundler) for a
  compile-check whose output was never consumed.

Bun's **runtime** — native TypeScript execution, `bun run server/index.ts`,
`bun --bun vitest`, and the `Bun.*` built-ins adopted in ADR 012
(`Bun.password`, `Bun.S3Client`) — has not been a source of friction and is
retained.

## Decision

Split the toolchain by responsibility:

- **pnpm** is the package manager and workspace/script runner.
- **Bun** remains the JavaScript runtime.

This reverts the package-management portion of ADR 012 while keeping everything
ADR 012 did at the runtime layer.

## Changes Made

### 1. Package management & workspace config

| Concern | Before (Bun) | After (pnpm) |
|---|---|---|
| Install | `bun install` | `pnpm install` |
| Workspaces | `"workspaces"` in `package.json` | `pnpm-workspace.yaml` |
| Lockfile | `bun.lock` | `pnpm-lock.yaml` |
| Tool config | `bunfig.toml` | `.npmrc` (`save-exact`, `auto-install-peers`) |
| Overrides | `"overrides"` in `package.json` | `overrides:` in `pnpm-workspace.yaml` |
| Native build scripts | built automatically | `allowBuilds:` allowlist in `pnpm-workspace.yaml` |

pnpm 10+ blocks dependency build scripts by default, so native/build-requiring
packages (`better-sqlite3`, `esbuild`, `@swc/core`, `msw`, `protobufjs`,
`core-js`, `unrs-resolver`) are explicitly allowlisted under `allowBuilds`.

### 2. Scripts — the runtime/package-manager boundary

Package-manager and script-runner invocations moved to pnpm:

```bash
# Before → After
bun install                     → pnpm install
bun run build                   → pnpm build
bun run --filter '*' typecheck  → pnpm -r typecheck
bun run --filter @vamsa/web dev → pnpm --filter @vamsa/web dev
bunx semantic-release           → pnpm exec semantic-release
```

Bun-**runtime** invocations are unchanged — Bun still executes TypeScript
directly:

```bash
bun scripts/cmd.ts ...                        # unchanged
bun run server/index.ts                        # unchanged (app entrypoint)
bun --bun vitest run                           # unchanged (test runtime)
bun packages/api/scripts/check-schema-drift.ts # unchanged
```

### 3. apps/ai bundler

`apps/ai` bundled with `bun build` (Bun's bundler). Replaced with **tsup**
(esbuild-based) so no build step depends on Bun's bundler. Bun still runs the
service (`bun run src/index.ts`).

### 4. CI (GitHub Actions)

Every job now sets up pnpm + Node (with pnpm cache) and **keeps** Bun for the
runtime steps:

```yaml
- uses: pnpm/action-setup@v4
  with: { version: 11.12.0 }
- uses: actions/setup-node@v4
  with: { node-version: 22, cache: pnpm }
- uses: oven-sh/setup-bun@v2 # runtime for bun-executed scripts / vitest
  with: { bun-version: latest }
- run: pnpm install --frozen-lockfile
```

Install and `pnpm <script>` steps use pnpm; steps that execute a `.ts` file
directly still use `bun`.

### 5. Docker

The base image stays `oven/bun` (Bun is the runtime; `CMD ["bun", "run",
"server/index.ts"]` is unchanged). Because the Bun image ships no Node.js, the
**build stages** add Node + pnpm and install with pnpm:

```dockerfile
RUN apk add --no-cache nodejs npm && npm install -g pnpm@11.12.0
RUN pnpm install --frozen-lockfile --ignore-scripts --node-linker=hoisted
```

`--node-linker=hoisted` produces a flat `node_modules` so it copies cleanly
across build stages (matching the previous Bun layout). Docker-compose commands
that run inside containers (`bun run server/index.ts`, `bunx drizzle-kit`,
`bunx playwright`) are Bun-runtime operations and are unchanged.

## Consequences

### Retained from ADR 012 (runtime layer)
- Bun runtime, native TypeScript execution, `bun --bun vitest`.
- `Bun.*` built-ins: `Bun.password` (argon2id), `Bun.S3Client`.
- `oven/bun` Docker base image and Bun app entrypoint.

### Trade-offs
- **Two tools in CI/Docker.** Both pnpm (package manager) and Bun (runtime) must
  be present. The build images are slightly larger for the added Node + pnpm.
- **pnpm's isolated `node_modules`.** Locally pnpm uses its default (isolated)
  linker; Docker build stages use `--node-linker=hoisted` for cross-stage copy
  compatibility.
- **Explicit build allowlisting.** New native dependencies must be added to
  `allowBuilds` before their install scripts run.

## References

- Supersedes [ADR 012: Migration from pnpm to Bun Package Manager](012-bun-package-manager-migration.md)
- [pnpm workspaces](https://pnpm.io/workspaces)
- [pnpm settings (pnpm-workspace.yaml)](https://pnpm.io/settings)
- [pnpm allowBuilds / onlyBuiltDependencies](https://pnpm.io/settings#allowbuilds)
- [tsup](https://tsup.egoist.dev/)
