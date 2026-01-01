# AGENTS.md - Vamsa

**Generated:** 2026-01-01
**Stack:** Next.js 15 (App Router) + Bun + Prisma + NextAuth + TanStack Query + React Flow

## OVERVIEW

Family genealogy webapp with role-based access (Admin/Member/Viewer), suggestion workflow for collaborative editing, and interactive tree visualization.

## STRUCTURE

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Public: login, register, claim-profile, change-password
│   ├── (dashboard)/        # Protected: tree, people, people/[id], admin/*
│   └── api/                # Routes: auth/[...nextauth], upload, uploads/[...path], settings
├── actions/                # Server Actions (person, user, relationship, suggestion)
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── tree/               # React Flow tree viz
│   ├── person/             # Person CRUD components
│   ├── admin/              # Admin panel components
│   ├── forms/              # Form components
│   └── layout/             # Navbar
├── lib/
│   ├── auth.ts             # getSession, requireAuth, requireAdmin, requireMember
│   ├── auth-options.ts     # NextAuth config (credentials + OIDC)
│   ├── db.ts               # Prisma client singleton
│   ├── storage/            # Pluggable storage (local/S3)
│   ├── labels.ts           # Customizable terminology
│   └── utils.ts            # cn, formatDate, calculateAge, generateRandomPassword
├── schemas/                # Zod schemas (shared client/server validation)
├── hooks/                  # use-toast
└── config/                 # env.ts
prisma/
├── schema.prisma           # 11 models: Person, User, Relationship, Suggestion, etc.
└── seed.ts                 # Admin user seeding
e2e/
├── *.spec.ts               # Playwright E2E tests
└── pages/                  # Page Object Model classes
docker/
├── Dockerfile              # PostgreSQL variant
├── Dockerfile.sqlite       # SQLite variant
├── docker-compose.yml      # PostgreSQL deployment
└── docker-compose.sqlite.yml # SQLite deployment
scripts/
├── build.sh                # Build Docker image
├── run.sh                  # Run standalone container
├── up.sh                   # Docker compose up
└── down.sh                 # Docker compose down
```

## WHERE TO LOOK

| Task                  | Location                    | Notes                                       |
| --------------------- | --------------------------- | ------------------------------------------- |
| Add new page          | `src/app/(dashboard)/`      | Use route groups, Server Components default |
| Add mutation          | `src/actions/`              | Server Actions with Zod validation          |
| Add validation        | `src/schemas/`              | Zod schemas, import in actions + forms      |
| Add UI component      | `src/components/ui/`        | shadcn/ui pattern                           |
| Add feature component | `src/components/{feature}/` | Group by domain                             |
| Modify auth           | `src/lib/auth-options.ts`   | NextAuth providers config                   |
| Check permissions     | `src/lib/auth.ts`           | requireAuth/requireAdmin/requireMember      |
| Add DB model          | `prisma/schema.prisma`      | Run `bun run db:migrate` after              |
| Add API route         | `src/app/api/`              | Only for streaming/file uploads             |
| Add E2E test          | `e2e/`                      | Use Page Object pattern in `e2e/pages/`     |

## CONVENTIONS

### Data Flow

```
Page (Server Component) → Server Action → Prisma → DB
                       ↘ Zod validation
Form (Client) → useMutation → Server Action → revalidatePath
```

### Server Actions Pattern

```typescript
'use server'
import { requireAuth } from '@/lib/auth'
import { personSchema } from '@/schemas/person'

export async function createPerson(input: unknown) {
  const session = await requireAuth()           // Always first
  const data = personSchema.parse(input)        // Zod validation
  const result = await db.person.create(...)    // Prisma
  revalidatePath('/people')                     // Invalidate cache
  return result
}
```

### Component Patterns

- Server Components by default (no 'use client' unless needed)
- Client Components: forms, interactivity, hooks
- Import UI from `@/components/ui/*`
- Import path alias: `@/*` → `./src/*`

### Roles

- **ADMIN**: Full CRUD, approve suggestions, manage users
- **MEMBER**: Create/edit people, create suggestions
- **VIEWER**: Read-only

### Suggestion Workflow

Non-admins create suggestions → Admin approves/rejects → Applied to data

## ANTI-PATTERNS

| Don't                        | Do Instead                         |
| ---------------------------- | ---------------------------------- |
| API routes for mutations     | Server Actions                     |
| `fetch()` for internal data  | Direct Prisma in Server Components |
| Client-side auth checks only | `requireAuth()` in Server Actions  |
| Skip Zod validation          | Always validate input in actions   |
| Inline SQL                   | Prisma queries                     |

## COMMANDS

```bash
bun run dev              # Dev server :3000
bun run build            # Production build
bun run db:migrate       # Prisma migrations
bun run db:seed          # Seed admin user
bun run db:studio        # Prisma GUI
bun run test             # Vitest (watch)
bun run test:run         # Vitest (single)
bun run test:e2e         # Playwright
bun run format           # Prettier
```

## TESTING

- **Unit**: Vitest + Testing Library, colocated `*.test.ts(x)` in `src/`
- **E2E**: Playwright with Page Objects in `e2e/pages/`
- **Mocks**: `vitest.setup.ts` mocks Next.js router, NextAuth, ResizeObserver

## DATABASE

**Models**: Person, User, Relationship, Suggestion, FamilySettings, AuditLog, Account, Session, VerificationToken

**Dual DB**: PostgreSQL (default) or SQLite via `DATABASE_URL`

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/vamsa

# SQLite
DATABASE_URL=file:./data/vamsa.db
```

## DEPLOYMENT

```bash
# PostgreSQL variant (from project root)
docker compose -f docker/docker-compose.yml up -d

# SQLite variant (simpler)
docker compose -f docker/docker-compose.sqlite.yml up -d
```

**First run**: Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` in `.env`, or password auto-generates to logs.

## GOTCHAS

1. **Storage adapter**: Photos stored via `src/lib/storage/` - switch local/S3 via `STORAGE_PROVIDER` env
2. **Relationship bidirectional**: Creating PARENT auto-creates CHILD inverse
3. **Profile claiming**: Users can claim existing Person records via email match
4. **Custom labels**: FamilySettings.customLabels overrides default terminology
5. **Tree layout**: React Flow uses dagre for automatic positioning - see `family-tree.tsx`

## KEY FILES

| File                                       | Lines | Purpose                             |
| ------------------------------------------ | ----- | ----------------------------------- |
| `src/components/person/person-profile.tsx` | 314   | Main profile view with tabs         |
| `src/actions/user.ts`                      | 248   | User CRUD + auth + profile claiming |
| `src/components/forms/person-form.tsx`     | 232   | Person create/edit form             |
| `src/actions/person.ts`                    | 198   | Person CRUD + search + tree data    |
| `src/lib/auth-options.ts`                  | 155   | NextAuth configuration              |
| `src/components/tree/family-tree.tsx`      | 170   | React Flow tree visualization       |
| `prisma/schema.prisma`                     | 251   | Complete data model                 |

## Issue Tracking

This project uses **bd (beads)** for issue tracking.
Run `bd prime` for workflow context, or install hooks (`bd hooks install`) for auto-injection.

**Quick reference:**

- `bd ready` - Find unblocked work
- `bd create "Title" --type task --priority 2` - Create issue
- `bd close <id>` - Complete work
- `bd sync` - Sync with git (run at session end)

For full workflow details: `bd prime`

## SEE ALSO

- `PLANNING.md` - Detailed architecture decisions and roadmap
- `README.md` - Quick start guide
- `.env.example` - All environment variables

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
  Use 'bd' for task tracking
