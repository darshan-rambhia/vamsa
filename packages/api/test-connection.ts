/**
 * PostgreSQL Connection Test Script
 *
 * Tests Prisma connection with PostgreSQL 18 to verify:
 * - Basic connectivity
 * - Version information
 * - Simple queries
 * - Transactions
 * - Full-text search capabilities
 *
 * Usage:
 *   cd packages/api
 *   bun run test-connection.ts
 *
 * Or from project root:
 *   bun run packages/api/test-connection.ts
 */

import { prisma, shutdown, getPoolStats } from "./src/client";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<string>
): Promise<void> {
  const start = Date.now();
  try {
    const message = await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, message, duration });
    console.log(`[PASS] ${name} (${duration}ms)`);
    console.log(`       ${message}`);
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, message, duration });
    console.log(`[FAIL] ${name} (${duration}ms)`);
    console.log(`       Error: ${message}`);
  }
}

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("PostgreSQL 18 Connection Test Suite");
  console.log("=".repeat(60));
  console.log();

  // Test 1: Basic Connection
  await runTest("Basic Connection", async () => {
    await prisma.$connect();
    return "Successfully connected to PostgreSQL";
  });

  // Test 2: PostgreSQL Version
  await runTest("PostgreSQL Version Check", async () => {
    const result = await prisma.$queryRaw<
      { version: string }[]
    >`SELECT version()`;
    const version = result[0]?.version || "Unknown";
    const majorVersion = version.match(/PostgreSQL (\d+)/)?.[1];
    if (majorVersion && parseInt(majorVersion) >= 18) {
      return `Version verified: ${version.substring(0, 80)}...`;
    }
    throw new Error(`Expected PostgreSQL 18+, got: ${version}`);
  });

  // Test 3: Server Settings
  await runTest("Server Configuration", async () => {
    const settings = await prisma.$queryRaw<
      { name: string; setting: string }[]
    >`
      SELECT name, setting
      FROM pg_settings
      WHERE name IN ('max_connections', 'shared_buffers', 'effective_cache_size')
    `;
    const formatted = settings.map((s) => `${s.name}=${s.setting}`).join(", ");
    return `Settings: ${formatted}`;
  });

  // Test 4: Simple Query
  await runTest("Simple Query", async () => {
    const result = await prisma.$queryRaw<
      { result: number }[]
    >`SELECT 1 + 1 as result`;
    if (result[0]?.result !== 2) {
      throw new Error(`Expected 2, got ${result[0]?.result}`);
    }
    return "Basic arithmetic query successful";
  });

  // Test 5: JSON Support
  await runTest("JSON/JSONB Support", async () => {
    const result = await prisma.$queryRaw<{ data: { key: string } }[]>`
      SELECT '{"key": "value"}'::jsonb as data
    `;
    if (result[0]?.data?.key !== "value") {
      throw new Error("JSONB parsing failed");
    }
    return "JSONB operations working correctly";
  });

  // Test 6: Transaction Test
  await runTest("Transaction Support", async () => {
    // Create a test table, insert, select, and rollback in a transaction
    await prisma.$executeRaw`
      CREATE TEMP TABLE IF NOT EXISTS _pg18_test (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO _pg18_test (name) VALUES ('test_entry')`;
      const count = await tx.$queryRaw<
        { count: bigint }[]
      >`SELECT COUNT(*) as count FROM _pg18_test`;
      if (count[0]?.count < 1n) {
        throw new Error("Transaction insert failed");
      }
    });

    return "Transaction completed successfully";
  });

  // Test 7: Full-Text Search
  await runTest("Full-Text Search", async () => {
    const result = await prisma.$queryRaw<{ rank: number }[]>`
      SELECT ts_rank(
        to_tsvector('english', 'The quick brown fox jumps over the lazy dog'),
        to_tsquery('english', 'quick & fox')
      ) as rank
    `;
    if ((result[0]?.rank || 0) <= 0) {
      throw new Error("Full-text search ranking failed");
    }
    return `Full-text search working (rank: ${result[0]?.rank?.toFixed(4)})`;
  });

  // Test 8: Array Operations
  await runTest("Array Operations", async () => {
    const result = await prisma.$queryRaw<{ arr: number[] }[]>`
      SELECT ARRAY[1, 2, 3, 4, 5] as arr
    `;
    if (result[0]?.arr?.length !== 5) {
      throw new Error("Array operation failed");
    }
    return "PostgreSQL arrays working correctly";
  });

  // Test 9: Date/Time Functions
  await runTest("Date/Time Functions", async () => {
    const result = await prisma.$queryRaw<{ now: Date; tz: string }[]>`
      SELECT NOW() as now, current_setting('TIMEZONE') as tz
    `;
    if (!result[0]?.now) {
      throw new Error("Date/time query failed");
    }
    return `Timezone: ${result[0]?.tz}, Current time: ${result[0]?.now.toISOString()}`;
  });

  // Test 10: Connection Pool Stats
  await runTest("Connection Pool Stats", async () => {
    const stats = await getPoolStats();
    return `Pool: total=${stats.totalConnections}, idle=${stats.idleConnections}, waiting=${stats.waitingRequests}`;
  });

  // Test 11: UUID Generation
  await runTest("UUID Generation", async () => {
    const result = await prisma.$queryRaw<
      { uuid: string }[]
    >`SELECT gen_random_uuid() as uuid`;
    const uuid = result[0]?.uuid;
    if (!uuid || !/^[0-9a-f-]{36}$/i.test(uuid)) {
      throw new Error("UUID generation failed");
    }
    return `Generated UUID: ${uuid}`;
  });

  // Test 12: CTE (Common Table Expressions)
  await runTest("CTE Support", async () => {
    const result = await prisma.$queryRaw<{ n: bigint }[]>`
      WITH RECURSIVE numbers AS (
        SELECT 1 as n
        UNION ALL
        SELECT n + 1 FROM numbers WHERE n < 5
      )
      SELECT MAX(n) as n FROM numbers
    `;
    if (result[0]?.n !== 5n) {
      throw new Error("CTE query failed");
    }
    return "Recursive CTEs working correctly";
  });

  // Summary
  console.log();
  console.log("=".repeat(60));
  console.log("Test Summary");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + (r.duration || 0), 0);

  console.log(`Total:  ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Time:   ${totalDuration}ms`);
  console.log();

  if (failed > 0) {
    console.log("Failed tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
  }

  // Cleanup
  await shutdown();

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
