# Claude Code Instructions

This file contains project-specific instructions for Claude Code.

## Session Close Protocol

**Status: DISABLED**

Do NOT automatically run the session close protocol (git status, add, commit, bd sync, push) at the end of tasks. Only run these commands when explicitly asked by the user.

## Project Overview

Vamsa is a family genealogy application built with:

- **Frontend**: TanStack Start (React + Vite via Vinxi)
- **Backend API**: TanStack React Start server functions
- **Database**: PostgreSQL (via Prisma ORM)
- **Runtime**: Bun (non-negotiable)
- **Monorepo**: pnpm workspaces + Turborepo

## Package Structure

```
apps/
  web/           # TanStack Start app with server functions
    server/      # Production server entry point (Bun + Hono)
      index.ts   # HTTP server wrapper for TanStack Start
    dist/        # Build output
      client/    # Static files (served by nginx in production)
      server/    # Server bundle (TanStack Start fetch handler)
packages/
  api/           # Prisma schema, migrations, and database utilities
  lib/           # Shared business logic (GEDCOM, genealogy utilities)
  schemas/       # Shared Zod schemas
  ui/            # Shared UI components (shadcn/ui based)
```

## Design System

Editorial + Earth Tones aesthetic:

- **Typography**: Fraunces (display), Source Sans 3 (body), JetBrains Mono (mono)
- **Colors**: Forest greens, bark browns, warm creams
- **Mode**: Light and dark mode support

## Common Commands

### Development

```bash
pnpm dev                # Start web development server (TanStack Start on port 3000+)
pnpm dev:web-only       # Start only web app (skip API/UI builds)
pnpm build              # Build all packages for production
pnpm build:web          # Build web app only
pnpm preview            # Preview production build locally
pnpm typecheck          # Run TypeScript checks
pnpm test               # Run all unit tests
pnpm test:unit          # Run lib and ui unit tests
pnpm test:e2e           # Run E2E tests with Playwright
pnpm test:coverage      # Generate coverage report
```

### Production Server

```bash
cd apps/web
pnpm build              # Build the app first
pnpm start              # Start Bun + Hono production server
pnpm start:prod         # Start with NODE_ENV=production
```

The production server (`apps/web/server/index.ts`) uses:

- **Bun**: Fast JavaScript runtime with native TypeScript support
- **Hono**: Ultrafast web framework for middleware and routing
- **nginx**: Reverse proxy for static files and load balancing (Docker only)

### Linting & Formatting

```bash
pnpm lint               # Run ESLint
pnpm lint:fix           # Fix ESLint issues
pnpm format             # Format code with Prettier
pnpm format:check       # Check formatting without modifying
```

### Database

```bash
pnpm db:generate        # Generate Prisma client
pnpm db:migrate         # Run pending Prisma migrations
pnpm db:migrate:deploy  # Deploy migrations (production)
pnpm db:push            # Push Prisma schema to database
pnpm db:seed            # Seed database with initial data
pnpm db:studio          # Open Prisma Studio GUI
```

### Docker

```bash
pnpm docker             # Start all production services (PostgreSQL + app + nginx)
pnpm docker:down        # Stop all Docker services
pnpm docker:logs        # View logs from all services
pnpm docker:build       # Rebuild Docker images
```

See [DOCKER.md](./DOCKER.md) for complete Docker documentation.

### Project Management

```bash
bd ready                # Show beads ready to work
bd sync                 # Sync beads with git
pnpm clean              # Remove all node_modules
```

## E2E Testing Guidelines

### Waiting for Elements (Important)

**DO NOT use `waitForLoadState("networkidle")` in regular E2E tests.** It is non-deterministic, slow, and can be flaky with polling/websockets.

Instead, use **element visibility + hydration timeout**:

```typescript
// Good: Wait for specific element, then hydration timeout
await element.waitFor({ state: "visible", timeout: 10000 });
await page.waitForTimeout(500); // React hydration

// Bad: Don't use networkidle for regular tests
await page.waitForLoadState("networkidle"); // Avoid this
```

**When `networkidle` IS used (documented exceptions):**

1. **Login form** (`test-base.ts`, `page-objects.ts` LoginPage)
   - **Why**: Under parallel execution, React controlled inputs can be "visible" and "editable" before React attaches `onChange` handlers. The native input accepts text, then React hydrates and resets the input to empty state.
   - **Impact**: Login is critical infrastructure - all authenticated tests depend on it working reliably.
   - **Future fix**: Add a deterministic React hydration detection (e.g., `data-hydrated` attribute, custom event).

2. **Person creation form** (`relationships.spec.ts`, `person-forms.spec.ts`)
   - **Why**: Same React hydration issue as login - form inputs appear ready but onChange handlers aren't attached yet.
   - **Impact**: Relationship tests and edit tests depend on successfully creating a person first.
   - **Future fix**: Same as login - deterministic hydration detection.

**When `networkidle` might be acceptable (general):**

- Testing specific network behavior
- Waiting for all assets to load for performance testing
- Explicit requirement for full page load verification

### React Form Fills (Parallel Execution)

React controlled components need time to hydrate before event handlers are attached. Use this pattern:

```typescript
// 1. Wait for element visibility
await input.waitFor({ state: "visible", timeout: 5000 });

// 2. Wait for React hydration (500ms for parallel execution)
await page.waitForTimeout(500);

// 3. Fill with retry loop
for (let attempt = 1; attempt <= 3; attempt++) {
  await input.click();
  await page.waitForTimeout(100);
  await input.fill(value);
  await page.waitForTimeout(150);

  if ((await input.inputValue()) === value) break;

  // Retry with selectText + type if fill didn't work
  if (attempt < 3) {
    await input.selectText().catch(() => {});
    await input.type(value, { delay: 30 });
  }
}
```
