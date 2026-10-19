import { describe, expect, it } from "vitest";
import { PgDialect, pgTable, text as pgText } from "drizzle-orm/pg-core";
import {
  SQLiteSyncDialect,
  sqliteTable,
  text as sqliteText,
} from "drizzle-orm/sqlite-core";

import { caseInsensitiveLike, escapeLike } from "./db";

const pgPersons = pgTable("persons", {
  firstName: pgText("first_name"),
});

const sqlitePersons = sqliteTable("persons", {
  firstName: sqliteText("first_name"),
});

const pgDialect = new PgDialect();
const sqliteDialect = new SQLiteSyncDialect();

describe("escapeLike", () => {
  it("escapes %, _ and backslash", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeLike("Smith")).toBe("Smith");
  });
});

describe("caseInsensitiveLike", () => {
  it("emits ILIKE on postgres", () => {
    const { sql, params } = pgDialect.sqlToQuery(
      caseInsensitiveLike(pgPersons.firstName, "%ali%", "postgres")
    );
    expect(sql).toBe('"persons"."first_name" ILIKE $1');
    expect(params).toEqual(["%ali%"]);
  });

  it("emits lower() LIKE lower() with ESCAPE on sqlite", () => {
    const { sql, params } = sqliteDialect.sqlToQuery(
      caseInsensitiveLike(sqlitePersons.firstName, "%ali%", "sqlite")
    );
    expect(sql).toBe(
      'lower("persons"."first_name") LIKE lower(?) ESCAPE \'\\\''
    );
    expect(params).toEqual(["%ali%"]);
  });

  it("never emits ILIKE on sqlite", () => {
    const { sql } = sqliteDialect.sqlToQuery(
      caseInsensitiveLike(sqlitePersons.firstName, "%x%", "sqlite")
    );
    expect(sql.toUpperCase()).not.toContain("ILIKE");
  });

  it("keeps escaped wildcards literal on sqlite", () => {
    const { sql, params } = sqliteDialect.sqlToQuery(
      caseInsensitiveLike(
        sqlitePersons.firstName,
        `%${escapeLike("50%")}%`,
        "sqlite"
      )
    );
    expect(sql).toContain("ESCAPE '\\'");
    expect(params).toEqual(["%50\\%%"]);
  });

  it("defaults to the configured driver (mocked as postgres in unit setup)", () => {
    const { sql } = pgDialect.sqlToQuery(
      caseInsensitiveLike(pgPersons.firstName, "%a%")
    );
    expect(sql).toContain("ILIKE");
  });
});
