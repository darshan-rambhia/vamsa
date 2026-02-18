#!/usr/bin/env bun
/**
 * Schema Drift Check
 *
 * Compares exported table names from the PG and SQLite schema sets to detect
 * missing tables or column mismatches. This catches accidental divergence
 * when a table is added to one schema but not the other.
 *
 * Usage: bun run packages/api/scripts/check-schema-drift.ts
 *
 * Checks:
 * 1. Both schemas export the same set of table names
 * 2. Each table has the same column names in both schemas
 *
 * This is a structural check only — type mapping differences (e.g., PG timestamp
 * vs SQLite integer) are expected and not flagged.
 */

import * as pgSchema from "../src/drizzle/schema/index";
import * as sqliteSchema from "../src/drizzle/schema-sqlite/index";
import { getTableName, getTableColumns } from "drizzle-orm";

// Collect tables from a schema module
function collectTables(
  schema: Record<string, unknown>
): Map<string, { columns: Set<string>; exportName: string }> {
  const tables = new Map<
    string,
    { columns: Set<string>; exportName: string }
  >();

  for (const [key, value] of Object.entries(schema)) {
    // Skip non-table exports (relations, enums, re-exports)
    if (!value || typeof value !== "object") continue;

    try {
      const tableName = getTableName(
        value as Parameters<typeof getTableName>[0]
      );
      if (!tableName) continue;

      const columns = getTableColumns(
        value as Parameters<typeof getTableColumns>[0]
      );
      const columnNames = new Set(Object.keys(columns));
      tables.set(tableName, { columns: columnNames, exportName: key });
    } catch {
      // Not a table — skip
    }
  }

  return tables;
}

const pgTables = collectTables(pgSchema as Record<string, unknown>);
const sqliteTables = collectTables(sqliteSchema as Record<string, unknown>);

let hasErrors = false;

// Check for tables missing from SQLite
for (const [tableName] of pgTables) {
  if (!sqliteTables.has(tableName)) {
    console.error(`MISSING in SQLite: table "${tableName}"`);
    hasErrors = true;
  }
}

// Check for tables missing from PG
for (const [tableName] of sqliteTables) {
  if (!pgTables.has(tableName)) {
    console.error(`MISSING in PG: table "${tableName}"`);
    hasErrors = true;
  }
}

// Check column drift for tables present in both
for (const [tableName, pgTable] of pgTables) {
  const sqliteTable = sqliteTables.get(tableName);
  if (!sqliteTable) continue;

  // Columns in PG but not SQLite
  for (const col of pgTable.columns) {
    if (!sqliteTable.columns.has(col)) {
      console.error(
        `COLUMN DRIFT: "${tableName}.${col}" exists in PG but not SQLite`
      );
      hasErrors = true;
    }
  }

  // Columns in SQLite but not PG
  for (const col of sqliteTable.columns) {
    if (!pgTable.columns.has(col)) {
      console.error(
        `COLUMN DRIFT: "${tableName}.${col}" exists in SQLite but not PG`
      );
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error(
    "\nSchema drift detected! Update both PG and SQLite schemas to match."
  );
  process.exit(1);
} else {
  console.log(
    `Schema check passed: ${pgTables.size} PG tables, ${sqliteTables.size} SQLite tables — no drift.`
  );
}
