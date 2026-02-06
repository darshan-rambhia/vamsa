# ADR 012: Migration from pnpm to Bun Package Manager

## Status

**Accepted** (Experiment Branch: `experiment/bun-package-manager`)

## Context

Vamsa already uses Bun as its JavaScript runtime for:
- Running the production server (`bun run server/index.ts`)
- Executing unit tests (`bun test`)
- Native TypeScript execution without compilation

However, the project used **pnpm + Turborepo** for:
- Package management and dependency installation
- Monorepo workspace orchestration
- Task running and caching

This created a split toolchain where Bun handled runtime but pnpm handled package management, adding complexity and potential inconsistencies.

## Decision

Migrate fully to Bun for both runtime AND package management:
- Replace `pnpm` with `bun` for dependency installation
- Replace `pnpm-workspace.yaml` with `workspaces` in `package.json`
- Remove Turborepo dependency (use `bun run --filter` for workspace tasks)
- Replace external dependencies with Bun built-ins where possible

## Changes Made

### 1. Package Management

**Before:**
```bash
pnpm install
pnpm run build
pnpm run --filter @vamsa/web dev
```

**After:**
```bash
bun install
bun run build
bun run --filter @vamsa/web dev
```

### 2. Workspace Configuration

**Before (pnpm-workspace.yaml):**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**After (package.json):**
```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

### 3. Lockfile

- Removed: `pnpm-lock.yaml`
- Added: `bun.lock` (text format for better git diffs via `bunfig.toml`)

### 4. Dependencies Replaced with Bun Built-ins

| External Package | Bun Built-in | Notes |
|-----------------|--------------|-------|
| `bcryptjs` | `Bun.password.hash()` | Uses argon2id (more secure than bcrypt) |
| `@aws-sdk/client-s3` | `Bun.S3Client` | Native S3 client (Bun 1.2+) |

**Example - Password Hashing:**
```typescript
// Before
import bcrypt from "bcryptjs";
const hash = await bcrypt.hash(password, 12);

// After (no import needed)
const hash = await Bun.password.hash(password);
```

**Example - S3 Client:**
```typescript
// Before
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const client = new S3Client({ region, credentials });
await client.send(new PutObjectCommand({ Bucket, Key, Body }));

// After
const client = new Bun.S3Client({ accessKeyId, secretAccessKey, region });
await client.write(`${bucket}/${key}`, data);
```

### 5. Docker Updates

**Before:**
```dockerfile
# Install pnpm
RUN curl -fsSL https://get.pnpm.io/install.sh | sh
RUN pnpm install --frozen-lockfile
RUN pnpm run build
```

**After:**
```dockerfile
# No package manager installation needed - Bun image includes it
RUN bun install
RUN bun run build
```

Added 3-stage build for smaller production images:
1. `builder` - Full deps for building
2. `prod-deps` - Production deps only
3. `runner` - Minimal runtime image

### 6. GitHub Actions

Updated workflows to use Bun exclusively:
```yaml
- name: Setup Bun
  uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest

- name: Install dependencies
  run: bun install

- name: Build
  run: bun run build
```

## Benefits

### Performance
- **Faster installs**: Bun's package manager is significantly faster than pnpm
- **Native S3**: `Bun.S3Client` is optimized for Bun's runtime
- **Better password hashing**: argon2id (Bun.password) is more secure and faster than bcrypt

### Simplicity
- **Single toolchain**: One tool (Bun) for runtime, testing, and package management
- **Fewer dependencies**: Removed Turborepo, bcryptjs, dotenv, @aws-sdk/client-s3
- **Simpler Docker**: No need to install additional package managers

### Consistency
- **Same tool everywhere**: Development, CI/CD, and production all use Bun
- **Unified lockfile**: `bun.lock` instead of `pnpm-lock.yaml`

## Trade-offs

### Packages That Cannot Be Replaced

| Package | Reason |
|---------|--------|
| `archiver` | Bun's gzip/deflate are single-stream; archiver creates multi-file ZIPs |
| `sharp` | Native image processing with complex bindings |
| `prisma` | Native query engine (potential future migration to Drizzle) |

### Corporate Proxy Considerations

Bun's package installation inside Docker containers may fail in environments with SSL-intercepting proxies (e.g., Zscaler) because containers lack the corporate CA certificates.

**Workarounds:**
1. Build in CI/CD (no proxy there)
2. Add corporate CA cert to Dockerfile
3. Pre-install deps on host, copy to container

### Ecosystem Maturity

- Bun workspaces are newer than pnpm workspaces
- Some edge cases may behave differently
- Fewer community resources for troubleshooting

## Files Modified

### Configuration
- `package.json` - Added workspaces, removed Turborepo
- `bunfig.toml` - Created for Bun configuration
- `apps/web/tsconfig.json` - Added dist to exclude

### Source Code
- `packages/lib/src/server/business/invites.ts` - Bun.password
- `apps/web/server/jobs/storage.ts` - Bun.S3Client
- `apps/web/server/index.ts` - Fixed TanStack handler types

### Docker
- `docker/Dockerfile` - Removed pnpm, 3-stage build
- `docker/docker-compose.dev.yml` - postgres:18
- `docker/docker-compose.test.yml` - postgres:18

### CI/CD
- `.github/workflows/e2e.yml` - Bun commands
- `.github/workflows/site.yml` - Bun commands

### Documentation
- `CLAUDE.md` - All commands
- `README.md` - Monorepo description
- `.claude/agents/*.md` - Agent instructions
- `.claude/commands/*.md` - Command references
- `.claude/skills/testing/SKILL.md` - Test commands

## Verification

```bash
# All tests pass
bun run test
# 1300 pass, 0 fail

# Typecheck passes
bun run typecheck
# All packages: exit code 0
```

## Future Considerations

1. **Drizzle Migration**: Replacing Prisma with Drizzle would enable `bun build --compile` for single-binary deployment
2. **Sharp Alternative**: Investigate pure-JS image processing or external service
3. **Bun.serve()**: Consider replacing Hono with Bun's native HTTP server

## References

- [Bun Package Manager](https://bun.sh/docs/cli/install)
- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [Bun.password](https://bun.sh/docs/api/hashing)
- [Bun.S3Client](https://bun.sh/docs/api/s3)
- Experiment Branch: `experiment/bun-package-manager`
