# Vamsa

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-blue?logo=react)](https://tanstack.com/start)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-runtime-f9f1e1?logo=bun)](https://bun.sh/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql)](https://www.postgresql.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> _Sanskrit: वंश (vaṃśa) - "bamboo; family tree; lineage"_

A modern web application for managing family genealogy with server-side rendering, interactive family tree visualization, and relationship management.

## Features

- **Interactive Family Tree**: Server-computed hierarchical layout with React Flow (zoom, pan, click to navigate)
- **Person Profiles**: Store personal information, photos, relationships, birth/death dates
- **Relationship Management**: Support for complex family structures (multiple parents, remarriages, divorced couples)
- **GEDCOM Support**: Import/export genealogy data in GEDCOM format
- **Family Invites**: Send invitations for family members to join and claim profiles
- **Activity Feed**: View changes and activities within the family tree
- **Dashboard**: Statistics and quick actions
- **Role-Based Access**: Admin and Member roles
- **Focused & Full Tree Views**: Toggle between focused view (immediate family) and full tree view

## Tech Stack

- **Framework**: TanStack Start (React + Vite via Vinxi)
- **Backend API**: TanStack React Start server functions
- **Database**: PostgreSQL 18 with Prisma ORM
- **Runtime**: Bun
- **Monorepo**: pnpm workspaces + Turborepo
- **UI**: Tailwind CSS + shadcn/ui components
- **Tree Visualization**: React Flow
- **State Management**: TanStack Query
- **Validation**: Zod
- **Testing**: Playwright (E2E) + Vitest (Unit)

## Quick Start

### Prerequisites

- **Bun** 1.0+ ([install](https://bun.sh/))
- **Docker & Docker Compose** (for PostgreSQL)
- **Node.js** 18+ (optional, Bun is the runtime)

### With Docker Compose (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/vamsa.git
cd vamsa

# Configure environment
cp .env.example .env

# Start services (PostgreSQL + Web)
docker compose -f docker/docker-compose.yml up -d

# Migrations and seeding run automatically
# App available at http://localhost:5173
```

### Local Development

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env

# Start PostgreSQL 18 (if not using Docker Compose)
docker run -d --name vamsa-postgres \
  -e POSTGRES_USER=vamsa \
  -e POSTGRES_PASSWORD=vamsa \
  -e POSTGRES_DB=vamsa \
  -p 5432:5432 \
  postgres:18-alpine

# Set DATABASE_URL in .env
# DATABASE_URL="postgresql://vamsa:vamsa@localhost:5432/vamsa"

# Run migrations
bun run db:migrate

# Start development server
bun run dev

# App available at http://localhost:5173
```

## Environment Variables

See `.env.example` for complete list. Key variables:

| Variable       | Description                          | Default |
| -------------- | ------------------------------------ | ------- |
| `DATABASE_URL` | PostgreSQL connection string         | -       |
| `NODE_ENV`     | Environment (development/production) | -       |
| `VITE_API_URL` | API endpoint for client              | -       |

## Project Structure

```
apps/
  web/                    # TanStack Start application
    src/
      routes/            # Page routes
      server/            # Server functions & tree layout
      components/        # React components
      lib/               # Client utilities
    e2e/                 # Playwright E2E tests
    scripts/             # Build & utility scripts

packages/
  api/                   # Database layer
    prisma/             # Schema & migrations
    src/                # Database utilities
  lib/                   # Shared business logic
    src/
      gedcom/           # GEDCOM import/export
  schemas/               # Shared Zod validation schemas
  ui/                    # Shared shadcn/ui components
```

## Available Scripts

### Development

```bash
bun run dev              # Start dev server
bun run build            # Build for production
bun run preview          # Preview production build locally
bun run typecheck        # Run TypeScript checks
pnpm lint               # Run ESLint
```

### Database

```bash
bun run db:migrate      # Run Prisma migrations
bun run db:studio       # Open Prisma Studio
bun run db:seed         # Seed initial data
```

### Testing

```bash
bun run test            # Run unit tests
bun run test:e2e        # Run E2E tests
bun run test:ui         # Run tests with UI
pnpm test:coverage      # Generate coverage report
```

### Project Management

```bash
bd ready                # Show beads ready to work
bd list                 # List all beads
bd sync                 # Sync beads with git
```

## Architecture Highlights

### Server-Side Tree Layout

The family tree layout is computed on the server ([`apps/web/src/server/tree-layout.ts`](apps/web/src/server/tree-layout.ts)) using a hierarchical layout algorithm that:

- Groups people by generation relative to the focused person
- Pairs spouses horizontally
- Positions children directly below their parents
- Supports complex family structures (multiple parents, remarriages)
- Provides both "focused view" (±1 generation) and "full tree view" modes

This approach ensures:

- **Single source of truth** - Consistent layout across all clients
- **Reduced client computation** - Mobile-friendly
- **Future-proof** - Easily reusable by React Native or other clients

### Monorepo Structure

Using **pnpm workspaces** + **Turborepo** for:

- Shared packages (`ui`, `schemas`, `lib`) usable across clients
- Efficient builds with caching
- Dependency management

## Deployment

### Docker

```bash
# Build and run
docker compose -f docker/docker-compose.yml up -d

# View logs
docker compose logs -f web
```

### Environment Setup

Ensure these are set before deploying:

```env
DATABASE_URL=postgresql://user:password@host:5432/vamsa
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
