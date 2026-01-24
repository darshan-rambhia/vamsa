# ADR 001: Migrate from Prisma to Drizzle ORM

## Status

Accepted

## Context

Vamsa uses Prisma ORM for database access. While Prisma provides excellent DX, it has limitations:

1. **Large binary size** - Prisma Query Engine adds ~16MB to builds
2. **Performance overhead** - Runtime query generation adds latency
3. **Single-binary blocker** - Cannot compile to true single binary with Bun

## Decision

Migrate from Prisma to Drizzle ORM.

## Rationale

### Benchmark Results

From POC benchmarks comparing identical queries:

| Query                      | Prisma   | Drizzle | Speedup   |
| -------------------------- | -------- | ------- | --------- |
| List Invites (with relations) | 4.139ms | 1.078ms | **3.84x** |
| Get Invite by Token        | 2.218ms  | 0.712ms | **3.11x** |
| Create Invite              | 1.582ms  | 1.312ms | **1.21x** |
| **Average**                |          |         | **2.72x** |

### Key Benefits

1. **Performance**: 2.72x average speedup (172% improvement)
2. **Type Safety**: SQL-like syntax with full TypeScript inference
3. **Bundle Size**: No external query engine binary
4. **Bun Native**: `bun:sql` driver for native PostgreSQL support

## Consequences

### Positive

- 2.7x faster queries on average
- Smaller deployment artifacts
- True single-binary deployment possible
- Better SQL control and visibility
- Native Bun integration

### Negative

- Migration effort required
- Team learning curve for Drizzle syntax
- Less mature ecosystem than Prisma
- Manual migration file management

## Migration Strategy

Gradual migration in phases:

### Phase 1: Foundation

- Map all 25 Prisma models to Drizzle schema
- Set up production-ready connection with pooling

### Phase 2: Query Layer

- Convert each business module incrementally
- Maintain parallel Prisma support during transition

### Phase 3: Integration

- Implement transaction patterns
- Update all tests

### Phase 4: Cutover

- Remove Prisma dependencies
- Final cleanup

## Implementation Details

### Schema Location

All Drizzle schema files live in `packages/api/src/drizzle/schema/`:

- `index.ts` - Barrel export
- `enums.ts` - All enum definitions
- `person.ts` - Person model
- `relationship.ts` - Relationship model
- `user.ts` - User, Account, Session models
- `event.ts` - Event models
- `place.ts` - Place models
- `media.ts` - Media models
- `backup.ts` - Backup models
- `misc.ts` - FamilySettings, AuditLog, etc.

### Connection Configuration

```typescript
// packages/api/src/drizzle/db.ts
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL } from "bun";

const sql = new SQL({
  url: process.env.DATABASE_URL,
  max: 10, // connection pool size
});

export const db = drizzle(sql);
```

## Verification Checklist

After each phase:

- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes
- [ ] `bun run build` succeeds
- [ ] `bun run dev` starts and pages load
- [ ] Manual verification of affected features

After full migration:

- [ ] Benchmark comparison shows expected speedup
- [ ] Docker build and run verification
- [ ] E2E test suite passes

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle with Bun](https://orm.drizzle.team/docs/get-started-postgresql#bun-sql)
- [POC Benchmark Code](../packages/api/src/drizzle/)
