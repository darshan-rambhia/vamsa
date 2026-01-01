# Vamsa

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-runtime-f9f1e1?logo=bun)](https://bun.sh/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> _Sanskrit: वंश (vaṃśa) - "bamboo; family tree; lineage"_

A web application for managing family genealogy with role-based access, relationship visualization, and collaborative editing.

## Features

- **Interactive Family Tree**: Visual tree with React Flow (zoom, pan, click to view)
- **Person Profiles**: Store personal info, photos, relationships
- **Role-Based Access**: Admin, Member, Viewer roles
- **Suggestion Workflow**: Non-admins suggest changes, admins approve
- **Self-Registration**: Family members can claim their profiles
- **Pluggable Storage**: Local filesystem or S3-compatible
- **Dual Database Support**: PostgreSQL (default) or SQLite

## Quick Start

### With Docker (PostgreSQL)

```bash
# Clone and configure
cp .env.example .env
# Edit .env with your settings

# Start the application
docker compose -f docker/docker-compose.yml up -d

# The app will:
# 1. Start PostgreSQL
# 2. Run migrations
# 3. Seed the admin user
# 4. Start the web app at http://localhost:3000
```

### With Docker (SQLite - simpler)

```bash
docker compose -f docker/docker-compose.sqlite.yml up -d
```

### Local Development

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env

# Start PostgreSQL (if using)
docker run -d --name vamsa-db \
  -e POSTGRES_USER=vamsa \
  -e POSTGRES_PASSWORD=vamsa \
  -e POSTGRES_DB=vamsa \
  -p 5432:5432 \
  postgres:16-alpine

# Run migrations
bunx prisma migrate dev

# Seed admin user
bun run db:seed

# Start dev server
bun run dev
```

## Environment Variables

See `.env.example` for all options. Key variables:

| Variable          | Description                                      |
| ----------------- | ------------------------------------------------ |
| `DATABASE_URL`    | PostgreSQL or SQLite connection string           |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32`          |
| `ADMIN_EMAIL`     | Initial admin email                              |
| `ADMIN_PASSWORD`  | Initial admin password (auto-generated if empty) |

## Default Admin Account

On first run, an admin account is created:

- If `ADMIN_PASSWORD` is set: uses that password
- If empty: generates random password and prints to console

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Bun
- **Database**: PostgreSQL / SQLite with Prisma
- **Auth**: NextAuth.js (credentials + OIDC)
- **UI**: Tailwind CSS + shadcn/ui
- **Tree Visualization**: React Flow
- **State**: TanStack Query + Server Actions

## Project Structure

```
src/
├── app/                 # Next.js pages
│   ├── (auth)/          # Login, register, claim-profile
│   ├── (dashboard)/     # Protected routes
│   │   ├── tree/        # Family tree view
│   │   ├── people/      # People list & profiles
│   │   └── admin/       # User/settings management
│   └── api/             # API routes
├── actions/             # Server Actions
├── components/          # React components
├── lib/                 # Utilities
└── schemas/             # Zod validation
```

## Scripts

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run db:migrate   # Run database migrations
bun run db:seed      # Seed admin user
bun run db:studio    # Open Prisma Studio
```

## License

MIT
