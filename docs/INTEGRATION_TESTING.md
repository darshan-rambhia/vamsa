# Integration Testing Guide

## Overview

Integration tests bridge the gap between unit tests (mocked database) and E2E tests (full browser). They test server functions and business logic against a real PostgreSQL database without browser overhead.

### Testing Pyramid

```
      E2E Tests (Slow, Full Browser)
    Integration Tests (Real DB, Fast)
  Unit Tests (Mocked, Fastest)
```

## Quick Start

### 1. Start Test Database

```bash
docker compose -f docker/docker-compose.local.yml --profile test up -d
```

Verify it's healthy:

```bash
docker compose -f docker/docker-compose.local.yml --profile test logs postgres
```

### 2. Run Integration Tests

```bash
bun run test:int
```

Or run specific test file:

```bash
cd apps/web
bun test ./tests/integration/persons.int.ts
```

### 3. Stop Test Database

```bash
docker compose -f docker/docker-compose.local.yml --profile test down -v
```

## Architecture

### Test Database Configuration

- **Location**: `docker/docker-compose.local.yml` (test profile)
- **Host**: localhost
- **Port**: 5433 (non-standard to avoid conflicts)
- **Database**: vamsa_test
- **User**: vamsa_test
- **Password**: vamsa_test_password

### Test Files Location

```
apps/web/tests/integration/
├── setup.ts                      # Database setup, utilities, helpers
├── persons.int.ts                # Person CRUD integration tests
├── relationships.integration.test.ts  # Relationship tests (WIP)
├── auth.integration.test.ts       # Authentication tests (WIP)
└── README.md                      # Detailed documentation
```

## Writing Integration Tests

### Core Helpers (from setup.ts)

#### Database Setup

```typescript
import { testDb, cleanupTestData, seedTestData } from "./setup";

// Access database and schema
const { db, schema } = testDb;

// Clean all test data before each test
await cleanupTestData();

// Seed initial data (returns admin user + test person)
const { adminUser, testPerson } = await seedTestData();
```

#### User Management

```typescript
import { createTestUser, findUserById } from "./setup";

// Create user with specific role
const member = await createTestUser("MEMBER");
const admin = await createTestUser("ADMIN");

// Find user by ID
const user = await findUserById(userId);
```

#### Person Management

```typescript
import {
  findPersonById,
  createTestPersonWithRelatives,
  countRelationships,
  randomUUID
} from "./setup";

// Find person by ID
const person = await findPersonById(personId);

// Create persons with relationships
const { parent1, parent2, child } = await createTestPersonWithRelatives(creatorId);

// Count relationships in database
const relationshipCount = await countRelationships();

// Generate UUIDs for records
const id = randomUUID();
```

### Test Template

```typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  beforeAll,
} from "bun:test";
import {
  testDb,
  cleanupTestData,
  seedTestData,
  eq,
  randomUUID,
} from "./setup";

describe("Feature Integration Tests", () => {
  let creator: Awaited<ReturnType<typeof seedTestData>>["adminUser"];

  beforeAll(async () => {
    const data = await seedTestData();
    creator = data.adminUser;
  });

  beforeEach(async () => {
    // Isolate each test by cleaning data
    await cleanupTestData();
    const data = await seedTestData();
    creator = data.adminUser;
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData();
  });

  describe("Feature Name", () => {
    it("does something specific", async () => {
      // Create test data
      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          id: randomUUID(),
          firstName: "Test",
          lastName: "Person",
          isLiving: true,
          createdById: creator.id,
          updatedAt: new Date(),
        })
        .returning();

      // Assert results
      expect(created.id).toBeDefined();
      expect(created.firstName).toBe("Test");
    });
  });
});
```

## Complete Test Examples

### Testing CRUD Operations

```typescript
it("creates, reads, updates, and deletes a person", async () => {
  // Create
  const [created] = await testDb.db
    .insert(testDb.schema.persons)
    .values({
      id: randomUUID(),
      firstName: "John",
      lastName: "Doe",
      isLiving: true,
      createdById: creator.id,
      updatedAt: new Date(),
    })
    .returning();

  expect(created.id).toBeDefined();

  // Read
  const found = await testDb.db.query.persons.findFirst({
    where: eq(testDb.schema.persons.id, created.id),
  });
  expect(found?.firstName).toBe("John");

  // Update
  const [updated] = await testDb.db
    .update(testDb.schema.persons)
    .set({ firstName: "Jane" })
    .where(eq(testDb.schema.persons.id, created.id))
    .returning();
  expect(updated.firstName).toBe("Jane");

  // Delete
  await testDb.db
    .delete(testDb.schema.persons)
    .where(eq(testDb.schema.persons.id, created.id));

  const deleted = await testDb.db.query.persons.findFirst({
    where: eq(testDb.schema.persons.id, created.id),
  });
  expect(deleted).toBeUndefined();
});
```

### Testing Relationships

```typescript
it("creates and queries family relationships", async () => {
  const { parent1, parent2, child } =
    await createTestPersonWithRelatives(creator.id);

  // Query all relationships for child
  const relationships = await testDb.db.query.relationships.findMany({
    where: eq(testDb.schema.relationships.personToId, child.id),
  });

  expect(relationships.length).toBe(2);
  expect(
    relationships.some((r) => r.personFromId === parent1.id)
  ).toBe(true);
});
```

### Testing Complex Queries

```typescript
it("finds persons with multiple conditions", async () => {
  // Insert test data
  await testDb.db.insert(testDb.schema.persons).values([
    {
      id: randomUUID(),
      firstName: "Alice",
      lastName: "Johnson",
      isLiving: true,
      createdById: creator.id,
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      firstName: "Bob",
      lastName: "Johnson",
      isLiving: false,
      createdById: creator.id,
      updatedAt: new Date(),
    },
  ]);

  // Query living Johnsons
  const johnsons = await testDb.db.query.persons.findMany({
    where: eq(testDb.schema.persons.lastName, "Johnson"),
  });

  const livingJohnsons = johnsons.filter((p) => p.isLiving);
  expect(livingJohnsons.length).toBeGreaterThan(0);
});
```

## Best Practices

1. **Test Isolation**: Always clean data in `beforeEach()` to prevent test interference
2. **Real Database Validation**: Verify data actually persists in the database
3. **Edge Cases**: Test null values, empty results, updates, deletes
4. **Clear Assertions**: Make test failures informative
5. **Meaningful Names**: Describe the behavior being tested
6. **No Shared State**: Each test should be completely independent
7. **Use Helpers**: Leverage setup.ts functions to reduce repetition
8. **Generate IDs**: Always provide explicit UUIDs for records

## Performance Tuning

### Typical Performance

- Individual test: 50-200ms
- Full persons suite (15 tests): 1.5-2 seconds
- All suites: 2-5 seconds

### Optimization Tips

```bash
# Run only specific test file
bun test tests/integration/persons.int.ts

# Run specific test by name
bun test tests/integration/persons.int.ts -t "creates a person"

# Parallel execution (Bun supports this natively)
bun test tests/integration/**/*.int.ts
```

## Troubleshooting

### Connection Refused

Test database not running:

```bash
docker compose -f docker/docker-compose.local.yml --profile test up -d
```

### Database Does Not Exist

Database hasn't finished initializing. Wait and check:

```bash
docker compose -f docker/docker-compose.local.yml --profile test logs postgres
# Look for "database system is ready to accept connections"
```

### Foreign Key Violation

Test cleanup order is incorrect. Check `cleanupTestData()` in setup.ts respects CASCADE constraints.

### Tests Are Slow

1. Check Docker has sufficient CPU/memory
2. Reduce number of tests per run
3. Profile with `--verbose` flag

### Type Errors

Ensure all IDs are properly typed (use `as any` as last resort for schema mismatches):

```typescript
const id = randomUUID();
// Use id directly, or cast if needed
where(eq(testDb.schema.relationships.id, id as any))
```

## Coverage Requirements

Integration tests should cover:

- Core CRUD operations for each major entity
- Complex queries with multiple conditions
- Data validation and constraints
- Relationship integrity
- Timestamp tracking
- Soft deletes and special states

See current coverage:

```bash
cd apps/web
bun test ./tests/integration/persons.int.ts --coverage
```

## Adding New Integration Tests

### Checklist

- [ ] Create new file: `tests/integration/feature-name.integration.test.ts`
- [ ] Import helpers from `setup.ts`
- [ ] Add `beforeAll()`, `beforeEach()`, `afterAll()` lifecycle
- [ ] Use `randomUUID()` for all record IDs
- [ ] Include both positive and negative test cases
- [ ] Test database state verification, not just query results
- [ ] Add meaningful test descriptions
- [ ] Document special setup requirements

### Example Skeleton

```typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  beforeAll,
} from "bun:test";
import {
  testDb,
  cleanupTestData,
  seedTestData,
  eq,
  randomUUID,
} from "./setup";

describe("Feature Integration Tests", () => {
  let creator: Awaited<ReturnType<typeof seedTestData>>["adminUser"];

  beforeAll(async () => {
    const data = await seedTestData();
    creator = data.adminUser;
  });

  beforeEach(async () => {
    await cleanupTestData();
    const data = await seedTestData();
    creator = data.adminUser;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe("Feature Name", () => {
    it("should behave correctly", async () => {
      // TODO: Add test
    });
  });
});
```

## Related Documentation

- `apps/web/tests/integration/README.md` - Detailed integration test documentation
- `CLAUDE.md` - Project instructions and conventions
- `.claude/skills/testing/SKILL.md` - Testing principles and patterns

## Current Status

### Passing Test Suites

- `persons.int.ts` - 15 tests, 100% passing

### In Progress

- `relationships.integration.test.ts` - Structure complete, needs ID updates
- `auth.integration.test.ts` - Structure complete, needs ID updates

### Not Yet Implemented

- GEDCOM import/export integration tests
- Media/file operations integration tests
- Event/place management integration tests
- Server function integration tests with actual API calls
