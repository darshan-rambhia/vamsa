# Migration Plan: Convex to Prisma (Keep TanStack Start)

## Goal

Replace Convex with Prisma + PostgreSQL while keeping TanStack Start as the web framework.

## Current State

- **Framework**: TanStack Start (v1.145.11) with Vite 7 - working
- **Database**: Convex (not running, can't login)
- **E2E Tests**: Written but never executed (require Convex backend)
- **Unit Tests**: 170 tests in @vamsa/lib, 97 tests in @vamsa/ui - passing

## Why This Migration

1. Convex requires a running backend service (localhost:3210)
2. User prefers Prisma for familiarity and PostgreSQL's maturity
3. TanStack Start works well with any data layer

---

## Migration Steps

### Phase 1: Restore Prisma Infrastructure

**Files to create/restore:**

- `packages/api/prisma/schema.prisma` - Database schema
- `packages/api/src/client.ts` - Prisma client singleton
- `packages/api/package.json` - Add @prisma/client dependency

**Schema (from legacy):**

```prisma
model Person {
  id            String         @id @default(cuid())
  firstName     String
  middleName    String?
  lastName      String
  nickname      String?
  gender        Gender?
  birthDate     DateTime?
  deathDate     DateTime?
  birthPlace    String?
  deathPlace    String?
  bio           String?
  photoUrl      String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  relationships Relationship[] @relation("PersonRelationships")
  relatedTo     Relationship[] @relation("RelatedPerson")
}

model Relationship {
  id           String           @id @default(cuid())
  personId     String
  relatedId    String
  type         RelationshipType
  startDate    DateTime?
  endDate      DateTime?
  person       Person           @relation("PersonRelationships", fields: [personId], references: [id])
  related      Person           @relation("RelatedPerson", fields: [relatedId], references: [id])
  @@unique([personId, relatedId, type])
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     @default(MEMBER)
  createdAt    DateTime @default(now())
}

enum Gender { MALE FEMALE OTHER }
enum Role { ADMIN MEMBER VIEWER }
enum RelationshipType { PARENT CHILD SPOUSE SIBLING }
```

### Phase 2: Create Server Functions

Replace Convex queries/mutations with TanStack Start server functions.

**Files to create in `apps/web/src/server/`:**

- `db.ts` - Prisma client instance
- `persons.ts` - Person CRUD operations
- `relationships.ts` - Relationship operations
- `auth.ts` - Authentication (login/logout/session)
- `users.ts` - User management

**Example server function:**

```typescript
// apps/web/src/server/persons.ts
import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./db";
import { z } from "zod";

export const getPersons = createServerFn({ method: "GET" }).handler(
  async () => {
    return prisma.person.findMany({
      orderBy: { lastName: "asc" },
    });
  }
);

export const createPerson = createServerFn({ method: "POST" })
  .validator(
    z.object({
      firstName: z.string(),
      lastName: z.string(),
      // ... other fields
    })
  )
  .handler(async ({ data }) => {
    return prisma.person.create({ data });
  });
```

### Phase 3: Update Routes to Use Server Functions

**Files to update:**

- `apps/web/src/routes/_authenticated/people/index.tsx`
- `apps/web/src/routes/_authenticated/people/$personId.tsx`
- `apps/web/src/routes/_authenticated/tree.tsx`
- `apps/web/src/routes/_authenticated/dashboard.tsx`
- `apps/web/src/routes/_authenticated/admin/*.tsx`
- `apps/web/src/routes/login.tsx`

**Pattern:**

```typescript
// Before (Convex)
import { useQuery } from "convex/react";
import { api } from "@vamsa/api/convex/_generated/api";
const persons = useQuery(api.persons.list);

// After (TanStack Start + Prisma)
import { useSuspenseQuery } from "@tanstack/react-query";
import { getPersons } from "~/server/persons";
const { data: persons } = useSuspenseQuery({
  queryKey: ["persons"],
  queryFn: () => getPersons(),
});
```

### Phase 4: Update Auth System

**Current:** Convex-based auth (not implemented)
**Target:** Cookie-based session auth with Prisma

**Files:**

- `apps/web/src/server/auth.ts` - Session management
- `apps/web/src/routes/_authenticated.tsx` - Auth guard
- `apps/web/src/routes/login.tsx` - Login form

### Phase 5: Remove Convex

**Files to delete:**

- `packages/api/convex/` - All Convex functions
- `apps/web/src/lib/convex.ts` - Convex client

**Files to update:**

- `apps/web/src/routes/__root.tsx` - Remove ConvexProvider
- `packages/api/package.json` - Remove convex dependency
- `docker/docker-compose.convex.yml` - Replace with Prisma docker-compose

### Phase 6: Update Docker

**New `docker/docker-compose.yml`:**

```yaml
services:
  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile.web
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://vamsa:password@db:5432/vamsa
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: vamsa
      POSTGRES_PASSWORD: password
      POSTGRES_DB: vamsa
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vamsa"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

## Critical Files Summary

| Action | File                                                      |
| ------ | --------------------------------------------------------- |
| Create | `packages/api/prisma/schema.prisma`                       |
| Create | `packages/api/src/client.ts`                              |
| Create | `apps/web/src/server/db.ts`                               |
| Create | `apps/web/src/server/persons.ts`                          |
| Create | `apps/web/src/server/relationships.ts`                    |
| Create | `apps/web/src/server/auth.ts`                             |
| Create | `apps/web/src/server/users.ts`                            |
| Update | `apps/web/src/routes/__root.tsx`                          |
| Update | `apps/web/src/routes/login.tsx`                           |
| Update | `apps/web/src/routes/_authenticated.tsx`                  |
| Update | `apps/web/src/routes/_authenticated/people/*.tsx`         |
| Delete | `packages/api/convex/`                                    |
| Delete | `apps/web/src/lib/convex.ts`                              |
| Update | `docker/docker-compose.convex.yml` → `docker-compose.yml` |

---

## Verification

1. **Database setup:**

   ```bash
   docker compose up db -d
   cd packages/api && npx prisma migrate dev
   ```

2. **Dev server:**

   ```bash
   pnpm dev
   # Should start without Convex errors
   ```

3. **Login test:**
   - Navigate to http://localhost:3000/login
   - Create admin user via seed script
   - Login should work without WebSocket errors

4. **E2E tests:**
   ```bash
   pnpm test:e2e
   # Should pass with PostgreSQL backend
   ```

---

## Questions Resolved

- Keep TanStack Start: Yes
- Use Prisma with PostgreSQL: Yes
- E2E tests status: Written but never executed (need working backend)
