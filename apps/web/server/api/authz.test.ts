/**
 * REST API authorization tests
 *
 * Verifies role enforcement on /api/v1 resource routes:
 * - Unauthenticated requests get 401
 * - Reads need VIEWER, creates/updates need MEMBER, deletes need ADMIN
 * - Batch requests containing deletes need ADMIN
 * - /auth/login and /auth/register are rate limited
 *
 * The session is stubbed per test. Business functions are mocked so that only
 * the authorization decision is under test.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  RATE_LIMITS,
  initializeRateLimitStore,
} from "../../src/server/middleware/rate-limiter";
import { MemoryRateLimitStore } from "../../src/server/middleware/rate-limit-store";

import apiV1 from "./index";

type Role = "VIEWER" | "MEMBER" | "ADMIN";

const {
  mockSession,
  mockDeletePerson,
  mockCreatePerson,
  mockUpdatePerson,
  mockListPersons,
  mockDeleteRelationship,
} = vi.hoisted(() => ({
  mockSession: vi.fn<() => Promise<unknown>>(async () => null),
  mockDeletePerson: vi.fn(async () => ({ success: true })),
  mockCreatePerson: vi.fn(async () => ({ id: "person-new" })),
  mockUpdatePerson: vi.fn(async () => ({ id: "person-1" })),
  mockListPersons: vi.fn(async () => ({
    items: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
  })),
  mockDeleteRelationship: vi.fn(async () => ({ success: true })),
}));

vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthGetSessionWithUser: mockSession,
}));

vi.mock("@vamsa/lib/server/business", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    deletePersonData: mockDeletePerson,
    createPersonData: mockCreatePerson,
    updatePersonData: mockUpdatePerson,
    listPersonsData: mockListPersons,
    deleteRelationshipData: mockDeleteRelationship,
  };
});

function asUser(role: Role) {
  return {
    id: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@example.com`,
    name: role,
    role,
    personId: null,
    mustChangePassword: false,
    profileClaimStatus: "CLAIMED",
    oidcProvider: null,
  };
}

function signedInAs(role: Role) {
  mockSession.mockResolvedValue(asUser(role));
}

function signedOut() {
  mockSession.mockResolvedValue(null);
}

const PERSON_ID = "person-1";
const RELATIONSHIP_ID = "rel-1";

const personBody = JSON.stringify({
  firstName: "Asha",
  lastName: "Rao",
  isLiving: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  initializeRateLimitStore(new MemoryRateLimitStore());
  signedOut();
});

describe("Persons REST role enforcement", () => {
  test("unauthenticated GET /persons is rejected with 401", async () => {
    const res = await apiV1.request("/persons");
    expect(res.status).toBe(401);
    expect(mockListPersons).not.toHaveBeenCalled();
  });

  test("VIEWER can read /persons", async () => {
    signedInAs("VIEWER");
    const res = await apiV1.request("/persons");
    expect(res.status).toBe(200);
  });

  test("/persons total is the database count, not the prefetched length", async () => {
    signedInAs("VIEWER");
    mockListPersons.mockResolvedValueOnce({
      items: [{ id: "p1" }] as never,
      pagination: {
        total: 12345,
        page: 1,
        limit: 10000,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      },
    });
    const res = await apiV1.request("/persons?limit=1");
    expect((await res.json()).total).toBe(12345);
  });

  test("VIEWER cannot create a person (POST) and nothing is written", async () => {
    signedInAs("VIEWER");
    const res = await apiV1.request("/persons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: personBody,
    });
    expect(res.status).toBe(403);
    expect(mockCreatePerson).not.toHaveBeenCalled();
  });

  test("VIEWER cannot update a person (PUT)", async () => {
    signedInAs("VIEWER");
    const res = await apiV1.request(`/persons/${PERSON_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "Changed" }),
    });
    expect(res.status).toBe(403);
    expect(mockUpdatePerson).not.toHaveBeenCalled();
  });

  test("VIEWER cannot delete a person (DELETE)", async () => {
    signedInAs("VIEWER");
    const res = await apiV1.request(`/persons/${PERSON_ID}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
    expect(mockDeletePerson).not.toHaveBeenCalled();
  });

  test("MEMBER can create a person", async () => {
    signedInAs("MEMBER");
    const res = await apiV1.request("/persons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: personBody,
    });
    expect(res.status).toBe(201);
    expect(mockCreatePerson).toHaveBeenCalledTimes(1);
  });

  test("MEMBER cannot delete a person (DELETE is ADMIN only)", async () => {
    signedInAs("MEMBER");
    const res = await apiV1.request(`/persons/${PERSON_ID}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
    expect(mockDeletePerson).not.toHaveBeenCalled();
  });

  test("ADMIN can delete a person", async () => {
    signedInAs("ADMIN");
    const res = await apiV1.request(`/persons/${PERSON_ID}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
    expect(mockDeletePerson).toHaveBeenCalledTimes(1);
  });
});

describe("Relationships REST role enforcement", () => {
  test("unauthenticated GET /relationships is rejected with 401", async () => {
    const res = await apiV1.request(`/relationships?personId=${PERSON_ID}`);
    expect(res.status).toBe(401);
  });

  test("VIEWER cannot delete a relationship", async () => {
    signedInAs("VIEWER");
    const res = await apiV1.request(`/relationships/${RELATIONSHIP_ID}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
    expect(mockDeleteRelationship).not.toHaveBeenCalled();
  });

  test("MEMBER cannot delete a relationship", async () => {
    signedInAs("MEMBER");
    const res = await apiV1.request(`/relationships/${RELATIONSHIP_ID}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(403);
    expect(mockDeleteRelationship).not.toHaveBeenCalled();
  });

  test("ADMIN can delete a relationship", async () => {
    signedInAs("ADMIN");
    const res = await apiV1.request(`/relationships/${RELATIONSHIP_ID}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
    expect(mockDeleteRelationship).toHaveBeenCalledTimes(1);
  });
});

describe("Batch REST role enforcement", () => {
  const deleteBatch = JSON.stringify({
    operations: [{ type: "delete", entity: "person", id: PERSON_ID }],
    transaction: true,
  });

  test("unauthenticated batch is rejected with 401", async () => {
    const res = await apiV1.request("/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: deleteBatch,
    });
    expect(res.status).toBe(401);
  });

  test("VIEWER cannot run a batch", async () => {
    signedInAs("VIEWER");
    const res = await apiV1.request("/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: deleteBatch,
    });
    expect(res.status).toBe(403);
    expect(mockDeletePerson).not.toHaveBeenCalled();
  });

  test("MEMBER cannot run a batch that contains deletes", async () => {
    signedInAs("MEMBER");
    const res = await apiV1.request("/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: deleteBatch,
    });
    expect(res.status).toBe(403);
    expect(mockDeletePerson).not.toHaveBeenCalled();
  });
});

describe("Auth endpoint rate limiting", () => {
  const loginAttempt = () =>
    apiV1.request("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vamsa-client-ip": "203.0.113.7",
      },
      body: JSON.stringify({ email: "x@example.com", password: "" }),
    });

  test("login returns 429 once the per-IP limit is exceeded", async () => {
    // Each attempt is rejected by validation (400), but still counts toward the limit
    const limit = RATE_LIMITS.login.limit;
    for (let i = 0; i < limit; i++) {
      const res = await loginAttempt();
      expect(res.status).not.toBe(429);
    }
    const blocked = await loginAttempt();
    expect(blocked.status).toBe(429);
  });
});
