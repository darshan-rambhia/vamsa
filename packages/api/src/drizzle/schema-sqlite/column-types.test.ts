/**
 * Unit tests for the SQLite dateOnly column type.
 *
 * Reads must yield the same Date the PostgreSQL `date(mode: "date")` column
 * yields, so business code can call Date methods on both drivers.
 */

import { describe, expect, it } from "vitest";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { dateOnly } from "./column-types";

const table = sqliteTable("t", {
  day: dateOnly("day"),
});

describe("dateOnly (SQLite)", () => {
  it("builds a text column so DDL and migrations are unchanged", () => {
    expect(table.day.getSQLType()).toBe("text");
  });

  it("maps a stored 'YYYY-MM-DD' string to a UTC-midnight Date", () => {
    const value: unknown = table.day.mapFromDriverValue("1905-03-15");

    expect(value).toBeInstanceOf(Date);
    expect((value as Date).toISOString()).toBe("1905-03-15T00:00:00.000Z");
  });

  it("maps a Date back to a 'YYYY-MM-DD' string for storage", () => {
    const stored = table.day.mapToDriverValue(new Date("1980-06-20T00:00:00Z"));

    expect(stored).toBe("1980-06-20");
  });

  it("round-trips a date through driver format", () => {
    const original = "2005-06-15";
    const roundTrip = table.day.mapToDriverValue(
      table.day.mapFromDriverValue(original)
    );

    expect(roundTrip).toBe(original);
  });
});
