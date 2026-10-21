/**
 * Integration: events/places REST routes against the real database.
 * Regression: PUT /events/:id without `date` must not clear the stored date.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { api, loginAs, prepareApiDb } from "./api-helpers";

type Event = { id: string; date: string | null; place: string | null };

let member: string;
let personId: string;

beforeAll(async () => {
  await prepareApiDb();
  member = (await loginAs("MEMBER")).token;
  const created = await api(member, "POST", "/persons", {
    firstName: "Asha",
    lastName: "Rao",
    isLiving: true,
  });
  expect(created.status).toBe(201);
  personId = (created.json as { id: string }).id;
});

async function eventsOf(id: string): Promise<Array<Event>> {
  const res = await api(member, "GET", `/events?personId=${id}`);
  expect(res.status).toBe(200);
  return (res.json as { items: Array<Event> }).items;
}

describe("PUT /events/:id (unmocked)", () => {
  it("keeps the date when only other fields are sent", async () => {
    const created = await api(member, "POST", "/events", {
      personId,
      type: "BIRTH",
      date: "1990-04-12",
    });
    expect(created.status).toBe(201);
    const eventId = (created.json as Event).id;

    const updated = await api(member, "PUT", `/events/${eventId}`, {
      place: "Pune",
    });
    expect(updated.status).toBe(200);

    const event = (await eventsOf(personId)).find((e) => e.id === eventId);
    expect(event?.place).toBe("Pune");
    expect(event?.date).toMatch(/^1990-04-12/);
  });

  it("clears the date only when date: null is sent", async () => {
    const created = await api(member, "POST", "/events", {
      personId,
      type: "GRADUATION",
      date: "2012-06-01",
    });
    const eventId = (created.json as Event).id;
    await api(member, "PUT", `/events/${eventId}`, { date: null });
    const event = (await eventsOf(personId)).find((e) => e.id === eventId);
    expect(event?.date).toBeNull();
  });
});

describe("unlinking needs MEMBER, not ADMIN (unmocked)", () => {
  it("a MEMBER can remove a person-place link", async () => {
    const place = await api(member, "POST", "/places", {
      name: "Pune",
      placeType: "CITY",
    });
    expect(place.status).toBe(201);
    const placeId = (place.json as { id: string }).id;
    const link = await api(member, "POST", `/places/${placeId}/persons`, {
      personId,
      type: "LIVED",
    });
    expect(link.status).toBe(201);
    const linkId = (link.json as { id: string }).id;
    expect(
      (await api(member, "DELETE", `/places/links/${linkId}`)).status
    ).toBe(200);
    // Deleting the place itself is still ADMIN
    expect((await api(member, "DELETE", `/places/${placeId}`)).status).toBe(
      403
    );
  });
});
