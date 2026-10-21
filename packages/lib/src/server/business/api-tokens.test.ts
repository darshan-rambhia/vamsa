/**
 * Unit tests for personal access tokens (api-tokens.ts)
 *
 * Uses a small in-test fake db injected via the `db` parameter, so each test
 * controls exactly what the queries return and can inspect what was written.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_TOKEN_PREFIX,
  createApiTokenData,
  hashApiToken,
  listApiTokensData,
  revokeAllUserApiTokensData,
  revokeApiTokenData,
  verifyApiTokenData,
} from "./api-tokens";
import type { ApiTokensDb } from "./api-tokens";

function createFakeDb() {
  const state = {
    inserted: [] as Array<Record<string, unknown>>,
    updates: [] as Array<Record<string, unknown>>,
    updateReturning: [] as Array<{ id: string }>,
    tokenRow: null as Record<string, unknown> | null,
    userRow: null as Record<string, unknown> | null,
    tokenRows: [] as Array<Record<string, unknown>>,
  };

  const db = {
    insert: vi.fn(() => ({
      values: (v: Record<string, unknown>) => {
        state.inserted.push(v);
        return { returning: async () => [{ ...v }] };
      },
    })),
    update: vi.fn(() => ({
      set: (v: Record<string, unknown>) => {
        state.updates.push(v);
        const whereResult = Object.assign(Promise.resolve(undefined), {
          returning: async () => state.updateReturning,
        });
        return { where: () => whereResult };
      },
    })),
    query: {
      apiTokens: {
        findFirst: vi.fn(async () => state.tokenRow),
        findMany: vi.fn(async () => state.tokenRows),
      },
      users: { findFirst: vi.fn(async () => state.userRow) },
    },
  };

  return { db: db as unknown as ApiTokensDb, state };
}

const activeUser = {
  id: "user-1",
  email: "a@example.com",
  name: "A",
  role: "ADMIN",
  isActive: true,
  lockedUntil: null,
  personId: null,
  mustChangePassword: false,
  profileClaimStatus: "CLAIMED",
  oidcProvider: null,
};

function tokenRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "tok-1",
    userId: "user-1",
    name: "laptop",
    tokenHash: "x",
    prefix: "vms_abcdef",
    scope: "read",
    expiresAt: null,
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

let fake: ReturnType<typeof createFakeDb>;

beforeEach(() => {
  fake = createFakeDb();
});

describe("createApiTokenData", () => {
  it("returns a vms_ plaintext once and stores only its sha256 hash", async () => {
    const created = await createApiTokenData(
      "user-1",
      { name: "laptop", scope: "write" },
      fake.db
    );

    expect(created.token).toMatch(/^vms_[A-Za-z0-9_-]{43}$/);
    const stored = fake.state.inserted[0];
    expect(stored.tokenHash).toBe(hashApiToken(created.token));
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toHaveProperty("token");
    expect(stored.prefix).toBe(created.token.slice(0, 10));
    expect(stored.scope).toBe("write");
    expect(stored.expiresAt).toBeNull();
  });

  it("sets expiresAt from expiresInDays", async () => {
    const before = Date.now();
    await createApiTokenData(
      "user-1",
      { name: "ci", scope: "read", expiresInDays: 30 },
      fake.db
    );
    const expiresAt = fake.state.inserted[0].expiresAt as Date;
    const days = (expiresAt.getTime() - before) / 86_400_000;
    expect(days).toBeGreaterThan(29.99);
    expect(days).toBeLessThan(30.01);
  });

  it("generates a different token each time", async () => {
    const a = await createApiTokenData(
      "u",
      { name: "a", scope: "read" },
      fake.db
    );
    const b = await createApiTokenData(
      "u",
      { name: "b", scope: "read" },
      fake.db
    );
    expect(a.token).not.toBe(b.token);
  });
});

describe("listApiTokensData", () => {
  it("never exposes the token hash", async () => {
    fake.state.tokenRows = [tokenRow()];
    const list = await listApiTokensData("user-1", fake.db);
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("tokenHash");
    expect(list[0].prefix).toBe("vms_abcdef");
  });
});

describe("revokeApiTokenData", () => {
  it("reports revoked when a row was updated", async () => {
    fake.state.updateReturning = [{ id: "tok-1" }];
    const res = await revokeApiTokenData("user-1", "tok-1", fake.db);
    expect(res).toEqual({ id: "tok-1", revoked: true });
    expect(fake.state.updates[0].revokedAt).toBeInstanceOf(Date);
  });

  it("is idempotent for missing or already revoked tokens", async () => {
    fake.state.updateReturning = [];
    const res = await revokeApiTokenData("user-1", "nope", fake.db);
    expect(res).toEqual({ id: "nope", revoked: false });
  });
});

describe("revokeAllUserApiTokensData", () => {
  it("returns how many tokens were revoked", async () => {
    fake.state.updateReturning = [{ id: "a" }, { id: "b" }];
    expect(await revokeAllUserApiTokensData("user-1", fake.db)).toBe(2);
  });
});

describe("verifyApiTokenData", () => {
  it("accepts a valid token, returns user + scope, updates lastUsedAt", async () => {
    fake.state.tokenRow = tokenRow({ scope: "write" });
    fake.state.userRow = activeUser;

    const res = await verifyApiTokenData(`${API_TOKEN_PREFIX}abc`, fake.db);

    expect(res?.scope).toBe("write");
    expect(res?.user.id).toBe("user-1");
    expect(res?.user.role).toBe("ADMIN");
    expect(fake.state.updates[0].lastUsedAt).toBeInstanceOf(Date);
  });

  it("rejects tokens without the vms_ prefix without querying", async () => {
    expect(await verifyApiTokenData("session-token", fake.db)).toBeNull();
    expect(fake.db.query.apiTokens.findFirst).not.toHaveBeenCalled();
  });

  it("rejects unknown tokens", async () => {
    expect(await verifyApiTokenData("vms_unknown", fake.db)).toBeNull();
  });

  it("rejects revoked tokens", async () => {
    fake.state.tokenRow = tokenRow({ revokedAt: new Date() });
    fake.state.userRow = activeUser;
    expect(await verifyApiTokenData("vms_x", fake.db)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    fake.state.tokenRow = tokenRow({ expiresAt: new Date(Date.now() - 1000) });
    fake.state.userRow = activeUser;
    expect(await verifyApiTokenData("vms_x", fake.db)).toBeNull();
  });

  it("rejects tokens of deactivated users", async () => {
    fake.state.tokenRow = tokenRow();
    fake.state.userRow = { ...activeUser, isActive: false };
    expect(await verifyApiTokenData("vms_x", fake.db)).toBeNull();
    expect(fake.state.updates).toHaveLength(0);
  });

  it("rejects tokens of locked-out users", async () => {
    fake.state.tokenRow = tokenRow();
    fake.state.userRow = {
      ...activeUser,
      lockedUntil: new Date(Date.now() + 60_000),
    };
    expect(await verifyApiTokenData("vms_x", fake.db)).toBeNull();
  });

  it("accepts once a lockout has expired", async () => {
    fake.state.tokenRow = tokenRow();
    fake.state.userRow = {
      ...activeUser,
      lockedUntil: new Date(Date.now() - 60_000),
    };
    expect(await verifyApiTokenData("vms_x", fake.db)).not.toBeNull();
  });
});
