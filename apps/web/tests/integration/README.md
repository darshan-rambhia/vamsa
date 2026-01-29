# Integration Tests

This directory contains integration tests that run against a real PostgreSQL database.

## Setup

1. Start the test database:

   ```bash
   docker-compose -f docker/docker-compose.test.yml up -d
   ```

2. Run integration tests:
   ```bash
   bun run test:int
   ```

## Structure

- `setup.ts` - Database connection and test utilities
- `*.int.ts` - Integration test files

## Writing Tests

```typescript
import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { testDb, cleanupTestData } from "./setup";

describe("Feature Integration", () => {
  beforeEach(async () => await cleanupTestData());
  afterAll(async () => await testDb.close());

  it("tests database operations", async () => {
    // Your test here
  });
});
```

## CI

Integration tests run in CI with a PostgreSQL service container.
See `.github/workflows/ci.yml` for configuration.
