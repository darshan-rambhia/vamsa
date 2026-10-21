/**
 * Unit tests for audit-logs.ts with a small fake query builder injected via
 * the `db` parameter.
 */

import { describe, expect, it, vi } from "vitest";
import { listAuditLogsData, recordAuditLogData } from "./audit-logs";
import type { AuditLogsDb } from "./audit-logs";

type Row = Record<string, unknown>;

/** Fake drizzle select chain. `results` are returned in select() call order. */
function fakeDb(results: Array<Array<Row>>) {
  const calls: Array<string> = [];
  let n = 0;
  const select = vi.fn(() => {
    const result = results[n++] ?? [];
    const chain: Record<string, unknown> = {};
    for (const m of ["from", "where", "orderBy", "limit", "offset"]) {
      chain[m] = (..._a: Array<unknown>) => {
        calls.push(m);
        return chain;
      };
    }
    chain.then = (resolve: (v: unknown) => void) => resolve(result);
    return chain;
  });
  const values = vi.fn(async (_v: Row) => undefined);
  const insert = vi.fn(() => ({ values }));
  return {
    db: { select, insert } as unknown as AuditLogsDb,
    select,
    values,
    calls,
  };
}

const row = (id: string, userId: string) => ({
  id,
  userId,
  action: "CREATE",
  entityType: "PERSON",
  createdAt: new Date(),
});

describe("listAuditLogsData", () => {
  it("without limit returns every match and skips the count/user queries", async () => {
    const f = fakeDb([[row("a", "u1"), row("b", "u1")]]);
    const res = await listAuditLogsData({ since: new Date(0) }, f.db);
    expect(res.total).toBe(2);
    expect(res.items).toHaveLength(2);
    expect(f.select).toHaveBeenCalledTimes(1);
    expect(f.calls).not.toContain("limit");
  });

  it("with limit returns one page, the total and user emails", async () => {
    const f = fakeDb([
      [row("a", "u1"), row("b", "u2")],
      [{ count: 42 }],
      [{ id: "u1", email: "one@x" }],
    ]);
    const res = await listAuditLogsData(
      { limit: 2, offset: 4, action: "CREATE" },
      f.db
    );
    expect(res.total).toBe(42);
    expect(f.calls).toEqual(expect.arrayContaining(["limit", "offset"]));
    expect(res.items.map((i) => i.userEmail)).toEqual(["one@x", null]);
  });

  it("an empty page does not look up users", async () => {
    const f = fakeDb([[], [{ count: 0 }]]);
    const res = await listAuditLogsData({ limit: 10 }, f.db);
    expect(res).toEqual({ items: [], total: 0 });
    expect(f.select).toHaveBeenCalledTimes(2);
  });
});

describe("recordAuditLogData", () => {
  it("inserts the entry with an id and null defaults", async () => {
    const f = fakeDb([]);
    await recordAuditLogData(
      { userId: "u1", action: "DELETE", entityType: "BACKUP", entityId: "b1" },
      f.db
    );
    const v = f.values.mock.calls[0][0];
    expect(v).toMatchObject({
      userId: "u1",
      action: "DELETE",
      entityType: "BACKUP",
      entityId: "b1",
      previousData: null,
      newData: null,
    });
    expect(typeof v.id).toBe("string");
  });

  it("never throws when the insert fails", async () => {
    const f = fakeDb([]);
    f.values.mockRejectedValueOnce(new Error("db down"));
    await expect(
      recordAuditLogData(
        { userId: "u", action: "CREATE", entityType: "X" },
        f.db
      )
    ).resolves.toBeUndefined();
  });
});
