import { describe, expect, it } from "vitest";
import { bootstrapAdminUser } from "./bootstrap-admin";

import type { DrizzleDB } from "./db";

/**
 * Minimal fake of the drizzle query chains used by bootstrapAdminUser.
 * Each select() call consumes the next entry from `selectResults`.
 */
function fakeDb(selectResults: Array<Array<{ id: string }>>) {
  const queue = [...selectResults];
  const calls = {
    inserted: [] as Array<Record<string, unknown>>,
    updated: [] as Array<Record<string, unknown>>,
  };
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => queue.shift() ?? [],
        }),
      }),
    }),
    insert: () => ({
      values: async (row: Record<string, unknown>) => {
        calls.inserted.push(row);
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          calls.updated.push(values);
        },
      }),
    }),
  };
  return { db: db as unknown as DrizzleDB, calls };
}

describe("bootstrapAdminUser", () => {
  it("does nothing when an ADMIN already exists", async () => {
    const { db, calls } = fakeDb([[{ id: "existing-admin" }]]);

    const result = await bootstrapAdminUser("Owner@Example.com", { db });

    expect(result).toEqual({ action: "exists" });
    expect(calls.inserted).toHaveLength(0);
    expect(calls.updated).toHaveLength(0);
  });

  it("creates a passwordless, verified ADMIN when no user has the email", async () => {
    const { db, calls } = fakeDb([[], []]);

    const result = await bootstrapAdminUser("  Owner@Example.com ", { db });

    expect(result.action).toBe("created");
    expect(calls.inserted).toHaveLength(1);
    expect(calls.inserted[0]).toMatchObject({
      email: "owner@example.com",
      role: "ADMIN",
      isActive: true,
      emailVerified: true,
    });
    expect(calls.inserted[0]).not.toHaveProperty("passwordHash");
  });

  it("promotes an existing user with the same email instead of inserting", async () => {
    const { db, calls } = fakeDb([[], [{ id: "user-1" }]]);

    const result = await bootstrapAdminUser("owner@example.com", { db });

    expect(result).toEqual({ action: "promoted", userId: "user-1" });
    expect(calls.inserted).toHaveLength(0);
    expect(calls.updated[0]).toMatchObject({ role: "ADMIN", isActive: true });
  });
});
