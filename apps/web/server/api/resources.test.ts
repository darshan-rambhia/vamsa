/**
 * Events, places and sources REST routes
 *
 * - Role matrix: reads VIEWER, writes MEMBER, deletes ADMIN, 401 signed out
 * - Business errors map to HTTP statuses (not found -> 404, etc.)
 * - Path/body values reach the business functions
 *
 * Session and business functions are mocked.
 */

import { beforeEach, describe, expect, test, vi } from "vitest";
import { initializeRateLimitStore } from "../../src/server/middleware/rate-limiter";
import { MemoryRateLimitStore } from "../../src/server/middleware/rate-limit-store";
import { statusForError } from "./route-helpers";
import apiV1 from "./index";

type Role = "VIEWER" | "MEMBER" | "ADMIN";

const m = vi.hoisted(() => {
  const ok = <T>(v: T) => vi.fn(async (..._args: Array<unknown>) => v);
  return {
    session: vi.fn<() => Promise<unknown>>(async () => null),
    getPersonEventsData: ok([{ id: "e1", type: "BIRTH" }]),
    createEventData: ok({ id: "e-new" }),
    updateEventData: ok({ id: "e1" }),
    deleteEventData: ok({ success: true }),
    addEventParticipantData: ok({ id: "ep1" }),
    removeEventParticipantData: ok({ success: true }),
    searchPlacesData: ok([{ id: "pl1", name: "Pune" }]),
    getPersonPlacesData: ok([]),
    getPlaceData: ok({ id: "pl1" }),
    getPlaceHierarchyData: ok([{ id: "c1" }, { id: "pl1" }]),
    getPlaceChildrenData: ok([]),
    createPlaceData: ok({ id: "pl-new" }),
    updatePlaceData: ok({ id: "pl1" }),
    deletePlaceData: ok({ success: true }),
    linkPersonToPlaceData: ok({ id: "link1" }),
    unlinkPersonFromPlaceData: ok({ success: true }),
    listSourcesData: ok({ items: [], total: 0 }),
    getSourceData: ok({ id: "s1" }),
    createSourceData: ok({ id: "s-new" }),
    updateSourceData: ok({ id: "s1" }),
    deleteSourceData: ok({ success: true }),
    linkSourceToEventData: ok({ id: "es1" }),
    generateCitationData: ok({ citation: "Rao. Book." }),
  };
});

vi.mock("@vamsa/lib/server/business/auth-better-api", () => ({
  betterAuthGetSessionWithUser: m.session,
}));

vi.mock("@vamsa/lib/server/business", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const { session: _s, ...fns } = m;
  return { ...actual, ...fns };
});

function signIn(role: Role) {
  m.session.mockResolvedValue({
    id: `u-${role}`,
    email: "x@example.com",
    name: role,
    role,
    personId: null,
    mustChangePassword: false,
    profileClaimStatus: "CLAIMED",
    oidcProvider: null,
  });
}

const req = (method: string, path: string, body?: unknown) =>
  apiV1.request(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

beforeEach(() => {
  vi.clearAllMocks();
  initializeRateLimitStore(new MemoryRateLimitStore());
  m.session.mockResolvedValue(null);
});

const reads: Array<[string, string]> = [
  ["GET", "/events?personId=p1"],
  ["GET", "/places?q=pune"],
  ["GET", "/places/pl1"],
  ["GET", "/places/pl1/hierarchy"],
  ["GET", "/places/pl1/children"],
  ["GET", "/sources"],
  ["GET", "/sources/s1"],
  ["GET", "/sources/s1/citation?format=APA"],
];

const writes: Array<[string, string, unknown]> = [
  ["POST", "/events", { personId: "p1", type: "BIRTH", date: "1990-01-02" }],
  ["PUT", "/events/e1", { place: "Pune" }],
  ["POST", "/events/e1/participants", { personId: "p2" }],
  ["POST", "/places", { name: "Pune", placeType: "CITY" }],
  ["PUT", "/places/pl1", { name: "Poona" }],
  ["POST", "/places/pl1/persons", { personId: "p1", type: "BIRTH" }],
  ["POST", "/sources", { title: "Family Bible" }],
  ["PUT", "/sources/s1", { author: "Rao" }],
  ["POST", "/sources/s1/events", { personId: "p1", eventType: "BIRTH" }],
];

const deletes = [
  "/events/e1",
  "/events/e1/participants/p2",
  "/places/pl1",
  "/places/links/link1",
  "/sources/s1",
];

describe("role matrix", () => {
  test.each(reads)("signed out %s %s -> 401", async (method, path) => {
    expect((await req(method, path)).status).toBe(401);
  });

  test.each(reads)("VIEWER %s %s -> 200", async (method, path) => {
    signIn("VIEWER");
    expect((await req(method, path)).status).toBe(200);
  });

  test.each(writes)("VIEWER %s %s -> 403", async (method, path, body) => {
    signIn("VIEWER");
    expect((await req(method, path, body)).status).toBe(403);
  });

  test.each(writes)("MEMBER %s %s -> 2xx", async (method, path, body) => {
    signIn("MEMBER");
    const res = await req(method, path, body);
    expect([200, 201]).toContain(res.status);
  });

  test.each(deletes)("MEMBER DELETE %s -> 403", async (path) => {
    signIn("MEMBER");
    expect((await req("DELETE", path)).status).toBe(403);
  });

  test.each(deletes)("ADMIN DELETE %s -> 200", async (path) => {
    signIn("ADMIN");
    expect((await req("DELETE", path)).status).toBe(200);
  });
});

describe("handlers pass the right arguments", () => {
  beforeEach(() => signIn("ADMIN"));

  test("events list requires personId", async () => {
    expect((await req("GET", "/events")).status).toBe(400);
    const res = await req("GET", "/events?personId=p1");
    expect(await res.json()).toEqual({
      items: [{ id: "e1", type: "BIRTH" }],
      total: 1,
    });
    expect(m.getPersonEventsData).toHaveBeenCalledWith("p1");
  });

  test("event update parses the body and uses the path id", async () => {
    await req("PUT", "/events/e1", { date: "2001-02-03", place: "Pune" });
    const [id, data] = m.updateEventData.mock.calls[0] as [
      string,
      { date: Date; place: string },
    ];
    expect(id).toBe("e1");
    expect(data.place).toBe("Pune");
    expect(data.date).toBeInstanceOf(Date);
    expect(data).not.toHaveProperty("id");
  });

  test("participant removal passes event and person ids", async () => {
    await req("DELETE", "/events/e1/participants/p2");
    expect(m.removeEventParticipantData).toHaveBeenCalledWith({
      eventId: "e1",
      personId: "p2",
    });
  });

  test("places list uses personId when given, else search", async () => {
    await req("GET", "/places?personId=p1");
    expect(m.getPersonPlacesData).toHaveBeenCalledWith("p1");
    await req("GET", "/places?q=pun");
    expect(m.searchPlacesData).toHaveBeenCalledWith("pun");
  });

  test("place link merges the path place id", async () => {
    await req("POST", "/places/pl1/persons", {
      personId: "p1",
      fromYear: 1990,
    });
    expect(m.linkPersonToPlaceData).toHaveBeenCalledWith({
      placeId: "pl1",
      personId: "p1",
      fromYear: 1990,
    });
  });

  test("source citation passes the format", async () => {
    await req("GET", "/sources/s1/citation?format=CHICAGO");
    expect(m.generateCitationData).toHaveBeenCalledWith("s1", "CHICAGO");
  });

  test("invalid body is a 400 and the business fn is not called", async () => {
    const res = await req("POST", "/places", { name: "X", placeType: "MOON" });
    expect(res.status).toBe(400);
    expect(m.createPlaceData).not.toHaveBeenCalled();
  });
});

describe("error mapping", () => {
  beforeEach(() => signIn("ADMIN"));

  test("business 'not found' becomes 404 with the message", async () => {
    m.getPlaceData.mockRejectedValueOnce(new Error("Place not found"));
    const res = await req("GET", "/places/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Place not found" });
  });

  test("duplicates become 409", async () => {
    m.addEventParticipantData.mockRejectedValueOnce(
      new Error("This person is already a participant in this event")
    );
    const res = await req("POST", "/events/e1/participants", {
      personId: "p2",
    });
    expect(res.status).toBe(409);
  });

  test("unexpected errors become 500 without leaking the message", async () => {
    m.listSourcesData.mockRejectedValueOnce(new Error("db exploded: secret"));
    const res = await req("GET", "/sources");
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });

  test("statusForError classifies messages", () => {
    expect(statusForError(new Error("Event not found"))).toBe(404);
    expect(statusForError(new Error("Cannot delete place with children"))).toBe(
      400
    );
    expect(statusForError(new Error("boom"))).toBe(500);
  });
});
