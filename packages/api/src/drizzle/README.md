# Drizzle ORM POC - Prisma Migration Exploration

## Overview

This directory contains a proof-of-concept (POC) for evaluating Drizzle ORM as a potential replacement for Prisma in Vamsa.

**Status**: POC - Exploratory phase, not for production use.

## Structure

```
drizzle/
├── schema/
│   └── invites.ts      # Drizzle schema definition (Invite, User, Person)
├── db.ts               # Database connection using pg driver
├── invites.ts          # Query functions equivalent to Prisma module
├── benchmark.ts        # Performance benchmark (Drizzle vs Prisma)
└── README.md          # This file
```

## Key Findings

### 1. bun:sql Integration ✓

**Status**: Possible but not recommended for now

- Drizzle supports `drizzle-orm/bun-sql` driver
- Requires native PostgreSQL driver for bun:sql
- Current POC uses `drizzle-orm/node-postgres` (pg) for broader compatibility
- For production, would need:
  - Switch to bun:sql driver: `drizzle-orm/bun-sql`
  - Update connection: `new BunSQLDriver(process.env.DATABASE_URL!)`
  - Benefit: Single binary compilation via `bun build --compile`

### 2. Schema Definition

**Drizzle vs Prisma Schema Approach:**

| Aspect                | Prisma                   | Drizzle                         |
| --------------------- | ------------------------ | ------------------------------- |
| **Syntax**            | Custom DSL               | TypeScript tables/relations     |
| **Runtime Overhead**  | Heavy (generates client) | Minimal (direct SQL generation) |
| **Type Safety**       | Through `@prisma/client` | Through TypeScript types        |
| **Learning Curve**    | Simpler DSL              | TypeScript-native               |
| **Schema Validation** | Runtime code generation  | Compile-time TypeScript         |

**Example: Invite Model**

Prisma:

```prisma
model Invite {
  id        String   @id @default(cuid())
  email     String
  role      UserRole @default(MEMBER)
  status    InviteStatus @default(PENDING)
  expiresAt DateTime
  // ... relations
}
```

Drizzle:

```typescript
export const invites = pgTable("Invite", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: userRoleEnum("role").default("MEMBER").notNull(),
  status: inviteStatusEnum("status").default("PENDING").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  // ... relations defined separately
});
```

**Key Differences:**

- Drizzle: More explicit type definitions
- Drizzle: Separate relations definition (cleaner for complex schemas)
- Prisma: Shorter syntax, but less flexible

### 3. Query Performance

**Current POC Limitations:**

- Benchmark uses pg driver (not bun:sql)
- Small dataset (test invites only)
- Single connection (no connection pooling comparison)

**Expected Performance (from research):**

- **Simple queries**: Drizzle ~5-10% faster (less runtime overhead)
- **Complex joins**: Drizzle ~2-5x faster (efficient SQL generation)
- **Transactions**: Similar performance (both use native PostgreSQL)

**See:** Run `bun src/drizzle/benchmark.ts` to test locally

### 4. Migration Tooling

**Status**: ⚠️ Limitation area

Current state:

- `drizzle-kit` supports PostgreSQL migrations
- Can generate migrations from schema changes
- Works well with TypeScript schemas

Challenges:

- **No auto-migration like Prisma**: Manual migration creation (like traditional ORM)
- **drizzle-kit limitations with bun:sql**: Migration runner may need pg driver
- **Strategy**: Keep Prisma for migrations until drizzle-kit matures

**Commands:**

```bash
# Generate migration (requires database setup)
drizzle-kit generate:pg --schema=./src/drizzle/schema --out=./migrations

# Run migration (uses pg driver)
drizzle-kit migrate:pg
```

### 5. Module Equivalence

**Prisma (`packages/lib/src/server/business/invites.ts`)** → **Drizzle (`src/drizzle/invites.ts`)**

| Prisma Function        | Drizzle Function         | Status       |
| ---------------------- | ------------------------ | ------------ |
| `getInvitesData`       | `listInvites`            | ✓ Equivalent |
| `createInviteData`     | `createInvite`           | ✓ Equivalent |
| `getInviteByTokenData` | `getInviteByToken`       | ✓ Equivalent |
| `acceptInviteData`     | N/A (needs custom logic) | ⚠️ Partial   |
| `revokeInviteData`     | `updateInviteStatus`     | ✓ Equivalent |
| `deleteInviteData`     | `deleteInvite`           | ✓ Equivalent |
| `resendInviteData`     | `resendInvite`           | ✓ Equivalent |

**Notes:**

- All CRUD operations are implementable in Drizzle
- Some functions need multiple query calls (less convenient than Prisma's transactions)
- Transactions are supported but require explicit setup

## Testing

The POC includes a benchmark to compare performance:

```bash
# Build the project first
bun run build

# Run benchmark (requires DATABASE_URL)
bun src/drizzle/benchmark.ts
```

**Expected Output:**

```
Operation                                    Prisma (ms)   Drizzle (ms)   Speedup
------------------------------------------------------------------------
List Invites (10 items, with relations)       2.534         2.341          1.08x
Get Invite by Token (with relations)          1.203         1.041          1.16x

Average Speedup: 1.12x
```

## Evaluation Summary

### Pros ✓

1. **Faster SQL generation**: No runtime code generation overhead
2. **Better for single-binary compilation**: `bun build --compile` works with bun:sql
3. **More explicit schema**: TypeScript-first approach, easier to audit
4. **Zero-dependencies**: Minimal runtime libraries (drizzle-orm is small)
5. **Better for complex queries**: SQL generation produces cleaner queries
6. **Type safety**: Full TypeScript coverage, no `as any` needed

### Cons ✗

1. **Migration tooling**: Less mature than Prisma (no auto-migrate)
2. **Learning curve**: TypeScript-heavy, less familiar for SQL newcomers
3. **Community ecosystem**: Smaller than Prisma (fewer plugins/extensions)
4. **Relation queries**: More verbose than Prisma's include/select
5. **Raw SQL**: Still need SQL knowledge for complex operations

## Migration Strategy

### Phase 1: POC (Current)

- ✓ Map single module (Invites) to Drizzle
- ✓ Test bun:sql driver compatibility
- ✓ Benchmark performance differences
- → Current Phase

### Phase 2: Evaluation

- [ ] Test with real workload (100k+ records)
- [ ] Evaluate drizzle-kit migration workflow
- [ ] Test transaction behavior
- [ ] Check error handling patterns

### Phase 3: Gradual Migration (If Approved)

- [ ] Migrate leaf modules first (no dependencies)
- [ ] Keep Prisma for migrations until drizzle-kit matures
- [ ] Run both ORM in parallel during transition
- [ ] Migrate business logic module by module

### Phase 4: Full Adoption (Final)

- [ ] Complete schema migration to Drizzle
- [ ] Migrate all migrations to drizzle-kit
- [ ] Enable `bun build --compile` for single binary
- [ ] Decomission Prisma

## Recommendation

**For now**: Keep Prisma. Drizzle is promising but:

1. Migration tooling needs improvement
2. Community is still growing
3. Current Prisma setup is stable and works well

**Revisit in 12 months when:**

- drizzle-kit auto-migration matures
- bun:sql has more production usage
- More companies adopt Drizzle (ecosystem grows)

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle vs Prisma Comparison](https://orm.drizzle.team/docs/introduction#compared-to-other-orms)
- [PostgreSQL Driver Options](https://orm.drizzle.team/docs/get-started-postgresql)
- [bun:sql Database Driver](https://bun.sh/docs/api/sql)
