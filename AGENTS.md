# AGENTS.md - Vamsa

**Generated:** 2026-01-01
**Stack:** Next.js 15 (App Router) + Bun + Prisma + NextAuth + TanStack Query + React Flow

---

# MULTI-AGENT DEVELOPMENT SYSTEM

## Quick Start

This project uses a multi-agent system configured for **OpenCode**.

### Agent Configuration

Agents are defined in `.opencode/agent/`:

```
.opencode/agent/
├── techlead.md     # Primary - orchestrates all agents
├── frontend.md     # Subagent - React/Next.js (gemini-2.5-pro)
├── backend.md      # Subagent - Prisma/Actions (claude-haiku-4-5)
├── tester.md       # Subagent - Vitest + Playwright (claude-haiku-4-5)
└── reviewer.md     # Subagent - ONLY one that closes beads
```

### Invoking Agents

**Primary agent (Tab to switch):**

- `techlead` - Use for new features, planning, coordination

**Subagents (@ mention):**

```
@frontend implement bead frontend-notifications
@backend implement bead backend-notifications
@tester write tests for epic-notifications
@reviewer review epic-notifications
```

### Workflow Summary

1. **User** describes feature to **Tech Lead**
2. **Tech Lead** analyzes, creates beads, presents plan
3. **User** approves (or requests changes)
4. **Tech Lead** delegates to **Frontend** + **Backend** (parallel)
5. **Tester** writes tests after implementation
6. **Reviewer** validates and marks complete (ONLY agent that can close beads)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Feature Request                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  TECH LEAD AGENT (claude-opus-4-5)                              │
│  - Analyzes requirements                                         │
│  - Creates epic + implementation beads                          │
│  - Defines acceptance criteria                                  │
│  - Assigns frontend/backend scope                               │
│  - Coordinates issue resolution                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│ FRONTEND AGENT          │   │ BACKEND AGENT           │
│ (gemini-2.5-pro)        │   │ (claude-haiku-4-5)      │
│ - Implements UI/UX      │   │ - Implements API logic  │
│ - Creates components    │   │ - DB migrations        │
│ - Updates forms/pages   │   │ - Server actions       │
└───────────┬─────────────┘   └───────────┬─────────────┘
            │                           │
            └─────────────┬─────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  TESTING AGENT (claude-haiku-4-5)                               │
│  - Writes unit tests (vitest)                                   │
│  - Writes E2E tests (playwright)                                │
│  - Validates coverage requirements                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  REVIEW AGENT (claude-opus-4-5)                                 │
│  - Uses MCP servers for verification                            │
│  - Validates acceptance criteria                                │
│  - ONLY agent that can mark beads complete                      │
└─────────────────────────────────────────────────────────────────┘
```

## Agent 1: TECH LEAD AGENT

**Model:** anthropic/claude-opus-4-5  
**Purpose:** Analyze requirements, design solutions, create implementation plan, coordinate agents, manage issue resolution

### When to Invoke

- New feature requests
- Significant refactoring
- Architectural changes
- Performance optimizations

### Workflow

1. Analyze the codebase to understand current patterns
2. Research dependencies and best practices
3. Create an **EPIC bead** containing:
   - Feature overview
   - Technical design decisions
   - Database schema changes (if any)
   - API surface changes (if any)
   - Frontend components needed
   - Backend logic needed
   - Security considerations
   - Performance implications

4. Create **implementation beads**:
   - `frontend-{feature-name}`: All UI/UX changes
   - `backend-{feature-name}`: All server-side changes
   - Link each to epic via parent/child relationship

5. Define **acceptance criteria** for each bead:
   - Functional requirements (what it does)
   - Non-functional requirements (performance, security)
   - Edge cases to handle
   - Browser/device compatibility
   - Accessibility requirements

### Bead Structure Example

```markdown
# Epic: Add User Profile Feature

## Overview

Allow users to edit their profile information including avatar, bio, and social links.

## Technical Design

- Add new database fields to User model
- Create profile API endpoints
- Build profile settings page
- Implement avatar upload with S3

## Acceptance Criteria

- [ ] User can upload avatar (max 5MB, PNG/JPG)
- [ ] User can edit bio (max 500 chars)
- [ ] User can add social links (Twitter, LinkedIn)
- [ ] Profile page loads in < 2s
- [ ] All new fields validated server-side
- [ ] Mobile responsive design

## Dependencies

- S3 storage (already configured)
- Existing auth system

---

# Bead: backend-user-profile-api

Type: backend
Priority: high
Epic: parent-bead-id

## Scope

- Add `avatarUrl`, `bio`, `socialLinks` to User model
- Create `updateProfile` server action
- Add validation with Zod
- Create Prisma migration

## Acceptance Criteria

- [ ] API accepts and validates all profile fields
- [ ] Avatar upload resized to 200x200px
- [ ] Social links validated as URLs
- [ ] Database migration runs without errors
- [ ] Unit tests cover all validation cases

---

# Bead: frontend-user-profile-page

Type: frontend
Priority: high
Epic: parent-bead-id

## Scope

- Create `/settings/profile` page
- Build ProfileSettings component
- Implement avatar upload with preview
- Add form with real-time validation

## Acceptance Criteria

- [ ] Form submits with valid data
- [ ] Avatar preview shows before upload
- [ ] Form validation errors displayed
- [ ] Mobile responsive layout
- [ ] E2E test: complete profile workflow
```

### Configuration

```yaml
techlead:
  model: anthropic/claude-opus-4-5
  system_prompt: |
    You are the Tech Lead for Vamsa Family Tree.

    Your responsibilities:
    1. Analyze requirements thoroughly before creating beads
    2. Create detailed, implementable specs for each bead
    3. Define clear acceptance criteria that can be objectively verified
    4. Ensure frontend/backend beads are properly scoped
    5. Coordinate issue resolution when reviewer finds problems
    6. Track progress via bead status

    Output format:
    - Use bead (bd) for issue creation
    - Create one epic bead per feature
    - Create implementation beads linked to epic
    - Each bead must have: scope, acceptance criteria, dependencies

    Never mark beads as complete. This is the Testing and Review agents' role.
```

## Agent 2: FRONTEND AGENT

**Model:** google/gemini-3-pro-high  
**Purpose:** Implement Next.js/React frontend features

### When to Invoke

- Bead has `type: frontend`
- Frontend implementation needed
- UI/UX changes required

### Workflow

1. Read the bead description and acceptance criteria
2. Explore codebase for similar patterns
3. Implement changes following existing conventions
4. Run `bun run format` and `bun run typecheck`
5. Create or update tests (but don't mark complete)
6. Commit changes

### Best Practices

- Use Server Components by default
- Client components only when needed for interactivity
- Follow shadcn/ui patterns
- Use Server Actions for mutations
- Implement proper error boundaries
- Add loading states and skeletons

### Example Prompt Template

```
Implement the frontend changes for bead: {bead_id}

Bead Description:
{bead_content}

Acceptance Criteria:
{acceptance_criteria}

Current Codebase Patterns:
- UI components: @/components/ui/*
- Forms: @/components/forms/*
- Pages: src/app/(dashboard)/*

Steps:
1. Read {bead_id} in detail
2. Explore similar implementations in codebase
3. Implement changes
4. Run: bun run format && bun run typecheck
5. Create/update tests in appropriate test files
6. Commit with message: "feat: {bead_title}"
7. Do NOT mark bead as complete
```

## Agent 3: BACKEND AGENT

**Model:** anthropic/claude-haiku-4-5  
**Purpose:** Implement TypeScript/Prisma backend features

### When to Invoke

- Bead has `type: backend`
- Database changes needed
- API/server action changes
- Authentication/authorization logic

### Workflow

1. Read the bead description and acceptance criteria
2. Check Prisma schema for existing models
3. Create migration if schema changes
4. Implement server actions
5. Add Zod validation
6. Write unit tests
7. Run database migrations
8. Commit changes

### Database Migration Pattern

```typescript
// 1. Update prisma/schema.prisma
model User {
  // ... existing fields
  avatarUrl     String?
  bio           String?
  socialLinks   Json?
}

// 2. Run migration
bunx prisma migrate dev --name add_user_profile_fields

// 3. Create seed/update logic if needed
```

### Example Prompt Template

```
Implement the backend changes for bead: {bead_id}

Bead Description:
{bead_content}

Acceptance Criteria:
{acceptance_criteria}

Database Patterns:
- Models defined in: prisma/schema.prisma
- Server actions: src/actions/*
- Validation: src/schemas/*

Steps:
1. Read {bead_id} in detail
2. Update Prisma schema if needed
3. Create migration: bunx prisma migrate dev
4. Implement server actions in src/actions/*
5. Add Zod validation in src/schemas/*
6. Write unit tests
7. Run: bun run typecheck
8. Commit with message: "feat: {bead_title}"
9. Do NOT mark bead as complete
```

## Agent 4: TESTING AGENT

**Model:** anthropic/claude-haiku-4-5  
**Purpose:** Write and update tests for all features

### When to Invoke

- After frontend/backend implementation
- Before review agent validation
- Coverage drops below thresholds
- New test files needed

### Test Coverage Requirements

- **Statements:** ≥90%
- **Branches:** ≥85%
- **Functions:** ≥90%
- **Lines:** ≥90%

### Test Types

#### Unit Tests (Vitest)

Location: `src/**/*.test.{ts,tsx}`

- Utility functions
- Zod schema validation
- Component rendering
- Server action logic

#### E2E Tests (Playwright)

Location: `e2e/**/*.spec.ts`

- User workflows
- Page interactions
- Form submissions
- Authentication flows

### Example Prompt Template

```
Write tests for bead: {bead_id}

Implementation Reference:
{file_paths_modified}

Acceptance Criteria:
{acceptance_criteria}

Coverage Requirements:
- Statements: ≥90%
- Branches: ≥85%
- Functions: ≥90%
- Lines: ≥90%

Steps:
1. Review the implementation files
2. Write unit tests in src/**/{filename}.test.ts
3. Write E2E tests in e2e/**/{filename}.spec.ts
4. Run: bun run test:coverage
5. Verify all coverage thresholds met
6. Ensure all acceptance criteria are testable
7. Do NOT mark bead as complete
```

### Playwright MCP Usage

```typescript
// Example E2E test pattern
import { test, expect } from "@playwright/test";

test("user can update profile", async ({ page }) => {
  // Use Playwright MCP for browser automation
  await page.goto("/settings/profile");
  await expect(page.locator("h1")).toHaveText("Profile Settings");

  // Test avatar upload
  await page.setInputFiles('input[type="file"]', "test-data/avatar.png");
  await expect(page.locator(".avatar-preview")).toBeVisible();

  // Test form submission
  await page.fill('textarea[name="bio"]', "New bio");
  await page.click('button[type="submit"]');
  await expect(page.locator(".success-message")).toBeVisible();
});
```

## Agent 5: REVIEW AGENT

**Model:** anthropic/claude-opus-4-5  
**Purpose:** Validate completion of acceptance criteria using MCP servers

### When to Invoke

- All implementation complete
- Tests written and passing
- Coverage thresholds met
- Ready for final validation

### MCP Servers Used

- **Next.js MCP:** Validates SSR, API routes, routing
- **Playwright MCP:** Validates browser behavior, E2E flows
- **Filesystem MCP:** Reviews code changes
- **Git MCP:** Verifies commit history

### Validation Checklist

```markdown
## Review Checklist for Bead: {bead_id}

### Implementation Review

- [ ] All code changes follow project conventions
- [ ] No `as any`, `@ts-ignore`, `@ts-expect-error`
- [ ] Error handling implemented
- [ ] Loading states where appropriate
- [ ] TypeScript compilation passes

### Acceptance Criteria Review

- [ ] Each criterion has corresponding test
- [ ] Tests pass: bun run test
- [ ] E2E tests pass: bun run test:e2e
- [ ] Coverage thresholds met: bun run test:coverage

### MCP Verification

- [ ] Next.js: App builds successfully
- [ ] Playwright: All E2E scenarios pass
- [ ] TypeScript: No type errors

### Final Actions

- [ ] Create PR with clear description
- [ ] Link to epic and parent beads
- [ ] Summarize changes made
- [ ] Mark bead as COMPLETE (only this agent can do this)
```

### Example Prompt Template

```
Review bead: {bead_id} for completion

Bead Description:
{bead_content}

Acceptance Criteria:
{acceptance_criteria}

Implementation Files:
{file_paths}

Test Files:
{test_files}

Coverage Report:
{coverage_summary}

Steps:
1. Review all implementation files
2. Verify each acceptance criterion has test coverage
3. Run: bun run build
4. Run: bun run test
5. Run: bun run test:e2e
6. Run: bun run test:coverage
7. Verify no type errors or lint warnings
8. Verify all MCP server validations pass
9. Create PR if all checks pass
10. Mark bead as COMPLETE only if ALL criteria met
```

---

# PROJECT STRUCTURE

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
test-output/               # Test artifacts
├── coverage/               # Vitest coverage reports
├── playwright/             # Playwright HTML reports
└── results/                # Playwright test results
```

---

# WHERE TO LOOK

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

---

# CONVENTIONS

## Data Flow

```
Page (Server Component) → Server Action → Prisma → DB
                       ↘ Zod validation
Form (Client) → useMutation → Server Action → revalidatePath
```

## Server Actions Pattern

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

## Component Patterns

- Server Components by default (no 'use client' unless needed)
- Client Components: forms, interactivity, hooks
- Import UI from `@/components/ui/*`
- Import path alias: `@/*` → `./src/*`

## Roles

- **ADMIN**: Full CRUD, approve suggestions, manage users
- **MEMBER**: Create/edit people, create suggestions
- **VIEWER**: Read-only

## Suggestion Workflow

Non-admins create suggestions → Admin approves/rejects → Applied to data

---

# BEAD NAMING CONVENTION

| Type     | Pattern                   | Example                     |
| -------- | ------------------------- | --------------------------- |
| Epic     | `epic-{feature-name}`     | epic-user-notifications     |
| Frontend | `frontend-{feature-name}` | frontend-notifications-page |
| Backend  | `backend-{feature-name}`  | backend-notifications-api   |
| Database | `db-{feature-name}`       | db-add-notifications-table  |
| Testing  | `test-{feature-name}`     | test-notifications          |
| Docs     | `docs-{feature-name}`     | docs-notifications-api      |

## Bead Labels

- `type:epic` - Parent feature bead
- `type:frontend` - Frontend implementation
- `type:backend` - Backend implementation
- `type:db` - Database migration
- `type:test` - Testing work
- `type:docs` - Documentation

---

# QUALITY GATES

## Before Review Agent

- [ ] All implementation complete
- [ ] TypeScript compilation passes
- [ ] Linting passes (`bun run lint`)
- [ ] Unit tests pass (`bun run test`)
- [ ] E2E tests pass (`bun run test:e2e`)
- [ ] Coverage thresholds met

## Before Merge

- [ ] Review agent approval
- [ ] CI/CD pipeline passes
- [ ] No regressions
- [ ] Documentation updated

---

# ANTI-PATTERNS

| Don't                        | Do Instead                         |
| ---------------------------- | ---------------------------------- |
| API routes for mutations     | Server Actions                     |
| `fetch()` for internal data  | Direct Prisma in Server Components |
| Client-side auth checks only | `requireAuth()` in Server Actions  |
| Skip Zod validation          | Always validate input in actions   |
| Inline SQL                   | Prisma queries                     |

---

# COMMANDS

```bash
# Development
bun run dev              # Dev server :3000
bun run build            # Production build

# Database
bun run db:migrate       # Prisma migrations
bun run db:seed          # Seed admin user
bun run db:studio        # Prisma GUI

# Testing
bun run test             # Vitest (watch)
bun run test:run         # Vitest (single)
bun run test:coverage    # Coverage with thresholds
bun run test:e2e         # Playwright

# Quality
bun run format           # Prettier
bun run lint             # ESLint
```

---

# TESTING

- **Unit**: Vitest + Testing Library, colocated `*.test.ts(x)` in `src/`
- **E2E**: Playwright with Page Objects in `e2e/pages/`
- **Mocks**: `vitest.setup.ts` mocks Next.js router, NextAuth, ResizeObserver
- **Coverage**: 90%+ statements, 85%+ branches, 90%+ functions, 90%+ lines

---

# DATABASE

**Models**: Person, User, Relationship, Suggestion, FamilySettings, AuditLog, Account, Session, VerificationToken

**Dual DB**: PostgreSQL (default) or SQLite via `DATABASE_URL`

```bash
# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/vamsa

# SQLite
DATABASE_URL=file:./data/vamsa.db
```

---

# DEPLOYMENT

```bash
# PostgreSQL variant (from project root)
docker compose -f docker/docker-compose.yml up -d

# SQLite variant (simpler)
docker compose -f docker/docker-compose.sqlite.yml up -d
```

**First run**: Set `ADMIN_EMAIL` + `ADMIN_PASSWORD` in `.env`, or password auto-generates to logs.

---

# GOTCHAS

1. **Storage adapter**: Photos stored via `src/lib/storage/` - switch local/S3 via `STORAGE_PROVIDER` env
2. **Relationship bidirectional**: Creating PARENT auto-creates CHILD inverse
3. **Profile claiming**: Users can claim existing Person records via email match
4. **Custom labels**: FamilySettings.customLabels overrides default terminology
5. **Tree layout**: React Flow uses dagre for automatic positioning - see `family-tree.tsx`

---

# KEY FILES

| File                                       | Lines | Purpose                             |
| ------------------------------------------ | ----- | ----------------------------------- |
| `src/components/person/person-profile.tsx` | 314   | Main profile view with tabs         |
| `src/actions/user.ts`                      | 248   | User CRUD + auth + profile claiming |
| `src/components/forms/person-form.tsx`     | 232   | Person create/edit form             |
| `src/actions/person.ts`                    | 198   | Person CRUD + search + tree data    |
| `src/lib/auth-options.ts`                  | 155   | NextAuth configuration              |
| `src/components/tree/family-tree.tsx`      | 170   | React Flow tree visualization       |
| `prisma/schema.prisma`                     | 251   | Complete data model                 |

---

# ISSUE TRACKING

This project uses **bd (beads)** for issue tracking.
Run `bd prime` for workflow context, or install hooks (`bd hooks install`) for auto-injection.

**Quick reference:**

- `bd ready` - Find unblocked work
- `bd create "Title" --type task --priority 2` - Create issue
- `bd close <id>` - Complete work (REVIEW AGENT only!)
- `bd sync` - Sync with git (run at session end)

For full workflow details: `bd prime`

---

# SEE ALSO

- `PLANNING.md` - Detailed architecture decisions and roadmap
- `README.md` - Quick start guide
- `.env.example` - All environment variables

---

# LANDING THE PLANE (Session Completion)

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
