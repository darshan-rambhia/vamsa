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

### Code Quality

```bash
pnpm check              # Run all checks in parallel (lint, format, typecheck, test)
pnpm lint               # Run ESLint
pnpm lint:fix           # Fix ESLint issues
pnpm format             # Format code with Prettier
pnpm format:check       # Check formatting without modifying
pnpm typecheck          # Run TypeScript type checks
pnpm test               # Run all unit tests
pnpm test:unit          # Run lib and ui unit tests
pnpm test:e2e           # Run E2E tests with Playwright
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

## Skills

Skills provide domain-specific knowledge and patterns. Use the Skill tool to invoke them.

### Available Skills

| Skill     | When to Use                                        | Files                                                                  |
| --------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| `testing` | Writing unit tests (Bun) or E2E tests (Playwright) | `.claude/skills/testing/SKILL.md`, `unit-recipes.md`, `e2e-recipes.md` |
| `design`  | Building UI components, applying design system     | `.claude/skills/design/SKILL.md`, `tokens.md`, `patterns.md`           |

### When to Invoke Skills

- **`/testing`**: Before writing any test file. Contains patterns for React components, GEDCOM parsing, Charts, Server Functions (unit), and Page Objects, form validation, accessibility, responsive testing (E2E).
- **`/design`**: Before building UI. Contains Vamsa's editorial + earth tones aesthetic, typography, colors, spacing, and component patterns.

### Skill Invocation

Skills are automatically available to agents. When working on:

- **Frontend work**: Read `.claude/skills/design/` before writing components
- **Test work**: Read `.claude/skills/testing/` before writing tests
- **Both**: The relevant agent files already reference these skills
