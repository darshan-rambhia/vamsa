/**
 * Shared SQLite column types
 *
 * Calendar dates are stored as 'YYYY-MM-DD' text in SQLite. The PostgreSQL
 * schema uses `date(..., { mode: "date" })`, which yields a Date. This custom
 * type gives SQLite the same TypeScript type (Date) so business code does not
 * branch on the driver. The column DDL stays `text`, so no migration is needed.
 */

import { customType } from "drizzle-orm/sqlite-core";

/**
 * Date-only column. Read: 'YYYY-MM-DD' becomes a UTC-midnight Date (matches
 * PostgreSQL). Write: Date is formatted back to 'YYYY-MM-DD'.
 */
export const dateOnly = customType<{ data: Date; driverData: string }>({
  dataType: () => "text",
  fromDriver: (value) => new Date(value),
  toDriver: (value) => value.toISOString().slice(0, 10),
});
