# Vamsa

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-blue?logo=react)](https://tanstack.com/start)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-runtime-f9f1e1?logo=bun)](https://bun.sh/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle)](https://orm.drizzle.team/)
[![SQLite](https://img.shields.io/badge/SQLite-default-003B57?logo=sqlite)](https://www.sqlite.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql)](https://www.postgresql.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> _Sanskrit: वंश (vaṃśa) - "bamboo; family tree; lineage"_

A modern web application for managing family genealogy with server-side rendering, interactive family tree visualization, and relationship management.

## Features

- **Interactive Family Tree**: Server-computed chart data rendered with d3 (tree, ancestor, descendant, fan, hourglass, bowtie, timeline; zoom, pan, click to navigate)
- **Person Profiles**: Store personal information, photos, relationships, birth/death dates
- **Relationship Management**: Support for complex family structures (multiple parents, remarriages, divorced couples)
- **GEDCOM Support**: Import/export genealogy data in GEDCOM format
- **Family Invites**: Send invitations for family members to join and claim profiles
- **Activity Feed**: View changes and activities within the family tree
- **Dashboard**: Statistics and quick actions
- **Role-Based Access**: Admin and Member roles
- **Focused & Full Tree Views**: Toggle between focused view (immediate family) and full tree view

## Tech Stack

- **Framework**: TanStack Start (React 19 + Vite 8)
- **Backend API**: TanStack React Start server functions
- **Database**: Drizzle ORM. SQLite by default, PostgreSQL 18 with `DB_DRIVER=postgres`
- **Auth**: better-auth
- **Runtime**: Bun
- **Package Manager**: pnpm 12
- **Monorepo**: pnpm workspaces
- **UI**: Tailwind CSS + shadcn/ui components
- **Tree Visualization**: d3
- **AI (optional)**: Hono sidecar using the Vercel AI SDK
- **Mobile**: Expo (React Native)
- **State Management**: TanStack Query
- **Validation**: Zod
- **Testing**: Playwright (E2E) + Vitest (Unit)

## Quick Start

### Prerequisites

- **pnpm** 11+ ([install](https://pnpm.io/installation)) -- package manager; the repo pins 12 via `packageManager`
- **Bun** 1.0+ ([install](https://bun.sh/)) -- JavaScript runtime
- **Docker & Docker Compose** (optional; only for PostgreSQL or the production stack)

### With Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/vamsa.git
cd vamsa

# Configure environment
cp .env.example .env

# Start services (PostgreSQL + app)
docker compose -f docker/docker-compose.yml up -d

# App available at http://localhost (APP_PORT, default 80)
# See DOCKER.md for required secrets and the optional AI service
```

### Local Development

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Start development server (SQLite, schema pushed and seeded automatically)
pnpm dev

# Or run against PostgreSQL 18 in Docker
pnpm dev:pg

# App available at http://localhost:3000
```

## Environment Variables

See `.env.example` for complete list. Key variables:

| Variable             | Description                                      | Default                                    |
| -------------------- | ------------------------------------------------ | ------------------------------------------ |
| `DB_DRIVER`          | `sqlite` or `postgres`                           | `sqlite` (auto-detects `postgres://` URLs) |
| `DATABASE_URL`       | SQLite file path or PostgreSQL connection string | `./data/vamsa.db`                          |
| `BETTER_AUTH_SECRET` | Auth signing secret (32+ chars)                  | -                                          |
| `NODE_ENV`           | Environment (development/production)             | -                                          |

## Project Structure

```
apps/
  web/                    # TanStack Start application
    src/
      routes/            # Page routes
      server/            # Server function wrappers
      components/        # React components (charts/ holds the d3 charts)
      lib/               # Client utilities
    server/              # Production server (Bun + Hono)
    e2e/                 # Playwright E2E tests
    tests/integration/   # Integration tests (SQLite and PostgreSQL)
    scripts/             # Build & utility scripts
  ai/                     # Optional AI sidecar (Hono + AI SDK)
  mobile/                 # Expo (React Native) app

packages/
  api/                   # Database layer
    src/drizzle/        # Drizzle schemas (PostgreSQL and SQLite) and db client
    drizzle/            # PostgreSQL migrations
    drizzle-sqlite/     # SQLite migrations
  lib/                   # Shared business logic
    src/
      server/business/  # Server-side business logic (charts, people, ...)
      gedcom/           # GEDCOM import/export
  schemas/               # Shared Zod validation schemas
  ui/                    # Shared shadcn/ui components
  client/                # Typed API client (not currently used by any app)
  query-hooks/           # TanStack Query hooks (not currently used by any app)
```

## Available Scripts

### Development

```bash
pnpm dev              # Start dev server (SQLite, port 3000)
pnpm dev:pg           # Start dev server against PostgreSQL in Docker
pnpm build            # Build for production
pnpm preview          # Preview production build locally
pnpm quality          # Local quality checks (fix/format + lint + typecheck + test)
pnpm quality:ci       # CI-safe quality gate (no auto-fixes)
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint
```

### Database

```bash
pnpm db:migrate      # Run Drizzle migrations
pnpm db:studio       # Open Drizzle Studio
pnpm db:seed         # Seed initial data
```

### Testing

```bash
pnpm test                          # Canonical unit test command
pnpm test --coverage               # Unit tests with coverage
pnpm test:integration              # Integration tests (SQLite default; --db postgres for PostgreSQL)
pnpm test:e2e                      # E2E tests
pnpm test:focus --suite visual     # Focused visual suite
pnpm test:focus --suite perf       # Focused performance suite
pnpm test:ci                       # CI test suite (unit with coverage + SQLite and PostgreSQL integration)
```

### Command Center

```bash
pnpm cmd -- db migrate        # Database operations
pnpm cmd -- docker dev        # Docker workflow operations
pnpm cmd -- docs build        # Documentation operations
pnpm cmd -- obs up            # Observability stack operations
pnpm cmd -- load run search   # Load-test scenario operations
```

See `docs/guides/command-architecture.md` for migration guidance and deprecated alias mappings.

### Project Management

```bash
bd ready                # Show beads ready to work
bd list                 # List all beads
bd sync                 # Pull/push beads with the Dolt remote
```

## Architecture Highlights

### Server-Computed Chart Data

Chart data is computed on the server in [`packages/lib/src/server/business/charts.ts`](packages/lib/src/server/business/charts.ts) and exposed through thin server functions in [`apps/web/src/server/charts.ts`](apps/web/src/server/charts.ts). The server walks relationships, assigns generations relative to the focused person, and returns nodes and edges for each chart type. The client renders them with d3 in [`apps/web/src/components/charts/`](apps/web/src/components/charts/).

This approach ensures:

- **Single source of truth** - Consistent layout across all clients
- **Reduced client computation** - Mobile-friendly
- **Future-proof** - Easily reusable by React Native or other clients

### Monorepo Structure

Using **pnpm workspaces** for:

- Shared packages (`ui`, `schemas`, `lib`) usable across clients
- Isolated `node_modules` per package, so undeclared dependencies fail fast
- Dependency management

## Deployment

### Docker

```bash
# Build and run
docker compose -f docker/docker-compose.yml up -d

# View logs
docker compose -f docker/docker-compose.yml logs -f app
```

### Environment Setup

Ensure these are set before deploying:

```env
DATABASE_URL=postgresql://user:password@host:5432/vamsa
BETTER_AUTH_SECRET=<32+ random characters>
NODE_ENV=production
```

## Design System

**Editorial + Earth Tones** aesthetic:

- **Typography**: Fraunces (display), Source Sans 3 (body), JetBrains Mono (mono)
- **Colors**: Forest greens, bark browns, warm creams
- **Modes**: Light and dark mode support

## Contributing

New to the project? Start a friendly conversation in [GitHub Discussions](https://github.com/darshan-rambhia/vamsa/discussions) and we’ll help you find a good first issue.

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information on:

- Development setup and workflow
- Testing guidelines (unit, E2E, accessibility)
- Code style and commit conventions
- Database migration process
- Docker development
- Pull request process

For quick contributions, you can:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`git commit -m 'feat: add amazing feature'`)
5. Push to your fork (`git push origin feature/amazing-feature`)
6. Open a Pull Request

For more details, read the full [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
