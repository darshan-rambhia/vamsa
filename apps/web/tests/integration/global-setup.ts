/**
 * Global Setup for Integration Tests
 *
 * Runs once in the main process before any test worker forks start.
 * Handles PostgreSQL migrations to prevent race conditions that occur
 * when parallel forks each attempt to migrate the same database.
 *
 * SQLite tests use per-fork :memory: databases and migrate inline in setup.ts.
 */

function getDriver(): "sqlite" | "postgres" {
  if (process.env.DB_DRIVER === "postgres") return "postgres";
  if (process.env.DB_DRIVER === "sqlite") return "sqlite";
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://"))
    return "postgres";
  return "sqlite";
}

export async function setup(): Promise<void> {
  if (getDriver() !== "postgres") return;

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      "postgresql://vamsa_test:vamsa_test@localhost:5433/vamsa_test";
  }

  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const path = await import("path");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const migrationsPath = path.default.resolve(
    import.meta.dirname,
    "../../../../packages/api/drizzle"
  );

  try {
    await migrate(db, { migrationsFolder: migrationsPath });
  } catch (error) {
    if (error instanceof Error) {
      console.warn(`Migration warning: ${error.message}`);
    }
  } finally {
    await pool.end();
  }
}
