# Integration Tests

Integration tests validate server functions and business logic against a real PostgreSQL database without browser overhead. They bridge the gap between:

- **Unit tests** (mocked database, fast)
- **E2E tests** (full browser, slow)

## Quick Start

### 1. Start Test Database

```bash
docker-compose -f docker/docker-compose.test.yml up -d
```

Wait for the database to be healthy:

```bash
docker-compose -f docker/docker-compose.test.yml logs postgres
# Look for "database system is ready to accept connections"
```

### 2. Run Integration Tests

```bash
bun run test:int
```

To run specific test file:

```bash
bun test ./tests/integration/persons.int.ts
```

### 3. Stop Test Database

```bash
docker-compose -f docker/docker-compose.test.yml down -v
```

## Environment Setup

Integration tests use test database credentials defined in `docker-compose.test.yml`:

- **Host**: localhost
- **Port**: 5433 (non-standard port to avoid conflicts with dev database on 5432)
- **Database**: vamsa_test
- **User**: vamsa_test
- **Password**: vamsa_test_password

The setup.ts file automatically uses these credentials when `DATABASE_URL` is not set.

## Test Structure

### Directory Layout

```
tests/integration/
├── setup.ts                      # Database setup, utilities, helpers
├── persons.int.ts                # Person CRUD integration tests
├── relationships.integration.test.ts  # Relationship and family tree tests
├── auth.integration.test.ts       # Authentication and user management tests
└── README.md                      # This file
```

### File Naming Convention

- `*.int.ts` - Shorter name for frequently-run tests
- `*.integration.test.ts` - More descriptive name for comprehensive test suites

## Writing Integration Tests

### Basic Test Template

```typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  beforeAll,
} from "bun:test";
import { testDb, cleanupTestData, seedTestData, eq } from "./setup";

describe("Feature Integration Tests", () => {
  let admin: Awaited<ReturnType<typeof seedTestData>>["adminUser"];

  beforeAll(async () => {
    const data = await seedTestData();
    admin = data.adminUser;
  });

  beforeEach(async () => {
    // Clean test data before each test for isolation
    await cleanupTestData();
    const data = await seedTestData();
    admin = data.adminUser;
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData();
  });

  describe("Feature Name", () => {
    it("does something specific", async () => {
      // Setup test data
      const [created] = await testDb.db
        .insert(testDb.schema.persons)
        .values({
          firstName: "Test",
          lastName: "Person",
          isLiving: true,
          createdById: admin.id,
          updatedAt: new Date(),
        })
        .returning();

      // Verify in database
      expect(created.id).toBeDefined();
      expect(created.firstName).toBe("Test");
    });
  });
});
```

### Available Helpers

#### Database and Schema

```typescript
// Import database and schema
const { db, schema } = testDb;

// Clean all test data
await cleanupTestData();

// Seed initial test data (admin user + test person)
const { adminUser, testPerson } = await seedTestData();
```

#### User Management

```typescript
// Create test user with specific role
const user = await createTestUser("ADMIN"); // "MEMBER" | "GUEST"

// Find user by ID
const user = await findUserById(userId);
```

#### Person Management

```typescript
// Find person by ID
const person = await findPersonById(personId);

// Create person with relatives (parent1, parent2, child + relationships)
const { parent1, parent2, child } =
  await createTestPersonWithRelatives(creatorId);

// Count total relationships
const count = await countRelationships();
```

#### Query Builders

```typescript
// Import Drizzle utilities
import { eq, sql } from "./setup";

// Find single record
const person = await testDb.db.query.persons.findFirst({
  where: eq(testDb.schema.persons.id, id),
});

// Find multiple records
const persons = await testDb.db.query.persons.findMany({
  where: eq(testDb.schema.persons.lastName, "Smith"),
});

// Execute raw SQL
const result = await testDb.db.execute(sql`SELECT COUNT(*) FROM persons`);
```

## Test Patterns

### Testing CRUD Operations

```typescript
it("creates and retrieves a person", async () => {
  // Create
  const [created] = await testDb.db
    .insert(testDb.schema.persons)
    .values({
      firstName: "John",
      lastName: "Doe",
      isLiving: true,
      createdById: admin.id,
      updatedAt: new Date(),
    })
    .returning();

  // Read
  const found = await findPersonById(created.id);
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

  const deleted = await findPersonById(created.id);
  expect(deleted).toBeUndefined();
});
```

### Testing Relationships

```typescript
it("queries family relationships", async () => {
  const { parent1, child } = await createTestPersonWithRelatives(admin.id);

  const relationships = await testDb.db.query.relationships.findMany({
    where: eq(testDb.schema.relationships.personToId, child.id),
  });

  expect(relationships.some((r) => r.personFromId === parent1.id)).toBe(true);
});
```

### Testing Complex Queries

```typescript
it("finds persons with multiple conditions", async () => {
  await testDb.db.insert(testDb.schema.persons).values([
    {
      firstName: "Alice",
      lastName: "Johnson",
      isLiving: true,
      createdById: admin.id,
      updatedAt: new Date(),
    },
    {
      firstName: "Bob",
      lastName: "Johnson",
      isLiving: false,
      createdById: admin.id,
      updatedAt: new Date(),
    },
  ]);

  // Find all living Johnsons
  const results = await testDb.db.query.persons.findMany();
  const livingJohnsons = results.filter(
    (p) => p.lastName === "Johnson" && p.isLiving === true
  );

  expect(livingJohnsons.length).toBeGreaterThan(0);
});
```

## Best Practices

1. **Isolate Tests**: Always clean data in `beforeEach()` to prevent test interference
2. **Test Data Consistency**: Verify data in database, not just query results
3. **Test Edge Cases**: Include tests for null values, empty results, updates, and deletes
4. **Clear Assertions**: Use meaningful assertion messages
5. **Meaningful Names**: Test names should describe the behavior being tested
6. **No Shared State**: Each test should be independent
7. **Use Helpers**: Leverage setup.ts helper functions to reduce repetition

## Performance

Integration tests are slower than unit tests because they:

- Spin up database connections
- Execute real SQL queries
- Truncate tables between tests

Typical performance:

- Individual test: 50-200ms
- Full suite (20 tests): 2-5 seconds

To optimize:

- Run only needed tests: `bun test persons.int.ts`
- Use parallel test execution when available
- Keep fixture data minimal

## Troubleshooting

### "Connection refused" Error

Test database is not running. Start it:

```bash
docker-compose -f docker/docker-compose.test.yml up -d
```

### "Database does not exist" Error

Database hasn't finished initializing. Wait and retry:

```bash
docker-compose -f docker/docker-compose.test.yml logs postgres
```

### "Foreign key violation" Error

Test cleanup order is wrong. Check `cleanupTestData()` in setup.ts respects CASCADE constraints.

### Tests are slow

Increase database resources or run tests in parallel. Check Docker has sufficient CPU/memory.

## CI/CD Integration

Integration tests run in GitHub Actions with a PostgreSQL service container.

See `.github/workflows/ci.yml` for:

- PostgreSQL service setup
- Database initialization
- Test execution
- Artifact collection

## Next Steps

- Add tests for GEDCOM import/export
- Add tests for media/file operations
- Add tests for event/place management
- Add server function integration tests
