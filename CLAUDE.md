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
- **Monorepo**: Bun workspaces

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
bun run dev             # Start web development server (TanStack Start on port 3000+)
bun run dev:web-only    # Start only web app (skip API/UI builds)
bun run build           # Build all packages for production
bun run build:web       # Build web app only
bun run preview         # Preview production build locally
```

### Production Server

```bash
cd apps/web
bun run build           # Build the app first
bun run start           # Start Bun + Hono production server
bun run start:prod      # Start with NODE_ENV=production
```

The production server (`apps/web/server/index.ts`) uses:

- **Bun**: Fast JavaScript runtime with native TypeScript support
- **Hono**: Ultrafast web framework for middleware and routing
- **nginx**: Reverse proxy for static files and load balancing (Docker only)

### Code Quality

```bash
bun run check           # Run all checks in parallel (lint, format, typecheck, test)
bun run lint            # Run ESLint
bun run lint:fix        # Fix ESLint issues
bun run format          # Format code with Prettier
bun run format:check    # Check formatting without modifying
bun run typecheck       # Run TypeScript type checks
bun run test            # Run all unit tests
bun run test:unit       # Run lib and ui unit tests
bun run test:e2e        # Run E2E tests with Playwright
```

### Database

```bash
bun run db:generate        # Generate Prisma client
bun run db:migrate         # Run pending Prisma migrations
bun run db:migrate:deploy  # Deploy migrations (production)
bun run db:push            # Push Prisma schema to database
bun run db:seed            # Seed database with initial data
bun run db:studio          # Open Prisma Studio GUI
```

### Docker

```bash
bun run docker          # Start all production services (PostgreSQL + app + nginx)
bun run docker:down     # Stop all Docker services
bun run docker:logs     # View logs from all services
bun run docker:build    # Rebuild Docker images
```

See [DOCKER.md](./DOCKER.md) for complete Docker documentation.

### Project Management

```bash
bd ready                # Show beads ready to work
bd sync                 # Sync beads with git
bun run clean           # Remove all node_modules
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
