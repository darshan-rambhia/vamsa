# Contributing to Vamsa

Thank you for your interest in contributing to Vamsa! This document provides guidelines and instructions for contributing to the project.

If you are new and looking for a first issue, start a conversation in [GitHub Discussions](https://github.com/darshan-rambhia/vamsa/discussions) and we will help you find a good starting point.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Database Changes](#database-changes)
- [Docker Development](#docker-development)
- [Observability](#observability)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/0/code_of_conduct/). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

Before contributing, ensure you have the following installed:

- **pnpm** 11 or higher ([installation guide](https://pnpm.io/installation)) -- package manager; the repo pins 12 via `packageManager`
- **Bun** 1.0 or higher ([installation guide](https://bun.sh/)) -- JavaScript runtime
- **Docker** and **Docker Compose** (optional; needed for PostgreSQL, Docker E2E, and the production stack)
- **Git** for version control

### Forking the Repository

1. Fork the repository by clicking the "Fork" button on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vamsa.git
   cd vamsa
   ```
3. Add the upstream repository as a remote:
   ```bash
   git remote add upstream https://github.com/darshan-rambhia/vamsa.git
   ```

## Development Setup

### Quick Start (SQLite, Recommended)

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start the dev server. Uses SQLite at data/vamsa-dev.db,
# pushes the schema, and seeds dev data automatically.
pnpm dev
```

### PostgreSQL

```bash
# Starts PostgreSQL 18 in Docker (docker/docker-compose.local.yml, profile "dev"),
# then runs the dev server against it
pnpm dev:pg
```

The application will be available at http://localhost:3000.

## Project Structure

Vamsa is a monorepo managed with **pnpm workspaces**:

```
vamsa/
├── apps/
│   ├── web/              # Main TanStack Start application
│   │   ├── src/          # Routes, components, server function wrappers
│   │   ├── server/       # Production server (Bun + Hono)
│   │   ├── e2e/          # End-to-end tests (Playwright)
│   │   └── tests/        # Integration tests
│   ├── ai/               # Optional AI sidecar (Hono + AI SDK)
│   └── mobile/           # Expo (React Native) app
├── packages/
│   ├── api/              # Drizzle schemas, migrations, database client
│   ├── lib/              # Shared business logic and utilities
│   ├── schemas/          # Shared Zod schemas
│   ├── ui/               # Shared UI components (shadcn/ui)
│   ├── client/           # Typed API client (not currently used by any app)
│   └── query-hooks/      # TanStack Query hooks (not currently used by any app)
├── docker/               # Docker configurations
└── scripts/              # Build and development scripts (run with Bun)
```

### Key Technologies

- **Frontend**: React 19, TanStack Start (Vite 8), TanStack Router, TanStack Query, d3 (charts)
- **Backend**: TanStack Start server functions, Hono (production server), better-auth
- **Database**: Drizzle ORM on SQLite (default) or PostgreSQL 18 (`DB_DRIVER=postgres`)
- **Styling**: Tailwind CSS, shadcn/ui components
- **Testing**: Playwright (E2E), Vitest (Unit), @axe-core/playwright (Accessibility)
- **Observability**: OpenTelemetry, Prometheus, Grafana

## Development Workflow

### 1. Create a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/amazing-feature
```

Use descriptive branch names:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/improvements
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Follow the [Code Style](#code-style) guidelines
- Write or update tests for your changes
- Update documentation as needed
- Ensure all tests pass locally

### 3. Keep Your Branch Updated

```bash
# Fetch latest changes
git fetch upstream

# Rebase your branch
git rebase upstream/main
```

## Testing

Vamsa has comprehensive testing at multiple levels:

### Unit Tests

Unit tests use **Vitest** (never `bun:test`) and cover the `schemas`, `client`, `query-hooks`, `api`, `lib`, and `ui` packages:

```bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test --coverage
```

### Integration Tests

Integration tests run server code against a real database:

```bash
pnpm test:integration --db sqlite     # In-memory SQLite
pnpm test:integration --db postgres   # PostgreSQL (needs a running database)
```

### End-to-End Tests

E2E tests use **Playwright** and test the full application:

```bash
# Run E2E tests (headless)
pnpm test:e2e

# Extra arguments are passed through to Playwright
pnpm test:e2e --ui        # Interactive UI mode
pnpm test:e2e --headed    # See the browser
pnpm test:e2e --debug     # Debug mode

# View test report
pnpm --filter @vamsa/web test:e2e:report
```

### Accessibility Testing

Accessibility tests are integrated into E2E tests using `@axe-core/playwright`. Ensure your changes don't introduce accessibility violations.

### Testing Guidelines

- **Write tests** for new features and bug fixes
- **Update tests** when modifying existing functionality
- **Run tests locally** before pushing
- Ensure **all tests pass** before submitting a PR
- Aim for **meaningful test coverage**, not just high percentages

## Code Style

### Linting and Formatting

The project uses **ESLint** and **Prettier**:

```bash
# Check for linting errors
pnpm lint

# Fix auto-fixable linting issues
pnpm lint:fix

# Check code formatting
pnpm format:check

# Format code
pnpm format
```

### TypeScript

- Enable **strict mode** is enabled
- Use **explicit types** where helpful for clarity
- Avoid `any` types; use `unknown` if needed
- Run type checking: `pnpm typecheck`

### Code Conventions

- **Imports**: Group and sort imports (types, external packages, internal modules)
- **Components**: Use functional components with TypeScript
- **Hooks**: Follow React hooks rules and naming conventions (`use*`)
- **Server Functions**: Keep server-side logic in server functions (not in components)
- **Logging**: Use the shared logger from `@vamsa/lib/logger`
- **Validation**: Use Zod schemas from `@vamsa/schemas`

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, configs)
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```bash
feat(tree): add zoom controls to family tree visualization

fix(auth): resolve session timeout issue on mobile devices

docs(api): update authentication endpoint documentation

test(e2e): add tests for person profile editing
```

### Commit Best Practices

- Use the imperative mood ("add feature" not "added feature")
- Keep subject line under 72 characters
- Add body for complex changes
- Reference issues/PRs in footer: `Fixes #123` or `Closes #456`

## Pull Request Process

### Before Submitting

1. **Run all checks locally**:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   ```

2. **Update documentation** if needed:
   - Update README.md for user-facing changes
   - Update `docs/guides/api.md` for API changes
   - Add JSDoc comments for public functions

3. **Ensure your branch is up-to-date**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Submitting a Pull Request

1. Push your branch to your fork:

   ```bash
   git push origin feature/amazing-feature
   ```

2. Open a Pull Request on GitHub from your fork to `darshan-rambhia/vamsa:main`

3. Fill out the PR template with:
   - **Description**: What does this PR do?
   - **Related Issues**: Link to related issues (e.g., `Fixes #123`)
   - **Changes**: List key changes
   - **Screenshots**: For UI changes, include before/after screenshots
   - **Testing**: Describe how you tested your changes
   - **Checklist**: Complete the PR checklist

### PR Title Format

Use the same format as commits:

```
feat(tree): add zoom controls to family tree visualization
```

### Code Review Process

- A maintainer will review your PR
- Address any feedback or requested changes
- Push additional commits to your branch (they'll appear in the PR)
- Once approved, a maintainer will merge your PR

### CI Checks

All PRs must pass:

- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Unit tests (Vitest)
- ✅ E2E tests (Playwright)
- ✅ Build validation

## Database Changes

### Working with Drizzle

There are two schemas, one per driver, and both must stay in sync:

- PostgreSQL: `packages/api/src/drizzle/schema/`
- SQLite: `packages/api/src/drizzle/schema-sqlite/`

### Making Schema Changes

1. **Edit both schemas** (`schema/*.ts` and `schema-sqlite/*.ts`).

2. **Generate migrations**:

   ```bash
   pnpm db:generate                                # PostgreSQL -> packages/api/drizzle/
   pnpm --filter @vamsa/api db:generate:sqlite     # SQLite -> packages/api/drizzle-sqlite/
   ```

3. **Apply and preview**:

   ```bash
   pnpm db:migrate:dry-run   # Show pending migrations
   pnpm db:migrate           # Apply to the PostgreSQL database in DATABASE_URL
   ```

   `pnpm dev` pushes the SQLite schema automatically on startup.

4. **Test your changes**:
   - Run the app and test functionality
   - Run tests: `pnpm test`, `pnpm test:integration --db sqlite`, `pnpm test:integration --db postgres`, and `pnpm test:e2e`

5. **Commit the migration**:
   - Include both the schema changes AND the migration files
   - Migration files are in `packages/api/drizzle/` (PostgreSQL) and `packages/api/drizzle-sqlite/` (SQLite)

### Database Best Practices

- Always create migrations for schema changes (don't use `db:push` for production)
- Test migrations both up and down (if applicable)
- Add indexes for frequently queried fields
- Use appropriate data types
- Document complex schema relationships

## Docker Development

### Using Docker Compose

The project provides several Docker Compose configurations:

```bash
# Production (PostgreSQL + Web App)
docker compose -f docker/docker-compose.yml up -d

# Production plus the optional AI service
docker compose -f docker/docker-compose.yml --profile ai up -d

# Development (just PostgreSQL)
docker compose -f docker/docker-compose.local.yml --profile dev up -d

# Development (PostgreSQL + app server)
docker compose -f docker/docker-compose.local.yml --profile dev-app up -d

# Observability stack (Prometheus, Grafana, etc.)
pnpm observability

# Stop all services
docker compose -f docker/docker-compose.yml down
```

### Useful Docker Commands

```bash
# View logs
pnpm docker:logs

# Rebuild containers
pnpm docker:build

# Start fresh (remove volumes)
docker compose -f docker/docker-compose.yml down -v
```

### Debugging with Docker

- Access PostgreSQL: `docker exec -it vamsa-db psql -U vamsa -d vamsa`
- View container logs: `docker logs vamsa-app -f`
- Inspect database: `pnpm db:studio` (opens Drizzle Studio)

## Observability

Vamsa includes an observability stack with OpenTelemetry, Prometheus, and Grafana.

### Starting the Observability Stack

```bash
# Start observability services
pnpm observability

# Stop observability services
pnpm observability:down

# View observability logs
pnpm observability:logs

# Access Grafana: http://localhost:3001 (admin/admin)
# Access Prometheus: http://localhost:9090
```

### Adding Instrumentation

- Use the shared telemetry utilities in `apps/web/server/telemetry.ts`
- Add spans for critical operations
- Use the logger from `@vamsa/lib/logger` for structured logging

## Questions or Issues?

- **Questions**: Open a [GitHub Discussion](https://github.com/darshan-rambhia/vamsa/discussions)
- **Bugs**: Open an [Issue](https://github.com/darshan-rambhia/vamsa/issues) with reproduction steps
- **Feature Requests**: Open an [Issue](https://github.com/darshan-rambhia/vamsa/issues) with the `enhancement` label

## License

By contributing to Vamsa, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

---

Thank you for contributing to Vamsa! 🙏
