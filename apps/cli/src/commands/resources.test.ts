import { decode } from "@toon-format/toon";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveConfig } from "../lib/config";
import { json, runCli, tempHome } from "../test-helpers";
import type { FetchMock } from "../test-helpers";

let home: string;

beforeEach(() => {
  home = tempHome();
  saveConfig(
    {
      current: "default",
      profiles: {
        default: { url: "https://v.test", token: "t", tokenType: "session" },
      },
    },
    { HOME: home }
  );
});

function api(handler: (url: URL, init: RequestInit) => Response): FetchMock {
  return vi.fn(async (input: string, init?: RequestInit) =>
    handler(new URL(input), init ?? {})
  );
}

const body = (f: FetchMock, i = 0) =>
  JSON.parse(String(f.mock.calls[i][1]?.body)) as Record<string, unknown>;

describe("event", () => {
  it("list requires --person (usage, exit 2) and never calls the API", async () => {
    const fetch = api(() => json({}));
    const r = await runCli(["event", "list"], { home, fetch });
    expect(r.code).toBe(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("list shows events with total and participant counts", async () => {
    const fetch = api(() =>
      json({
        items: [
          {
            id: "e1",
            type: "BIRTH",
            date: "1990-01-01",
            place: "Pune",
            participants: [{ id: "x" }],
          },
        ],
        total: 1,
      })
    );
    const r = await runCli(
      ["event", "list", "--person", "p1", "--fields", "id,participants"],
      { home, fetch }
    );
    expect(String(fetch.mock.calls[0][0])).toBe(
      "https://v.test/api/v1/events?personId=p1"
    );
    expect(decode(r.stdout)).toMatchObject({
      events: [{ id: "e1", participants: 1 }],
      total: 1,
    });
  });

  it("create uppercases the type and rejects unknown types", async () => {
    const fetch = api(() => json({ id: "e9", type: "BIRTH" }, 201));
    const ok = await runCli(
      [
        "event",
        "create",
        "--person",
        "p1",
        "--type",
        "birth",
        "--date",
        "1990-01-02",
      ],
      { home, fetch }
    );
    expect(ok.code).toBe(0);
    expect(body(fetch)).toEqual({
      personId: "p1",
      type: "BIRTH",
      date: "1990-01-02",
    });
    const bad = await runCli(
      ["event", "create", "--person", "p1", "--type", "party"],
      { home, fetch }
    );
    expect(bad.code).toBe(2);
  });

  it("nested participant remove is idempotent", async () => {
    const fetch = api(() =>
      json({ error: "Participant not found in this event" }, 404)
    );
    const r = await runCli(
      ["event", "participant", "remove", "e1", "--person", "p2"],
      { home, fetch }
    );
    expect(r.code).toBe(0);
    expect(String(fetch.mock.calls[0][0])).toContain(
      "/events/e1/participants/p2"
    );
    expect(r.stdout).toContain("was not a participant");
  });
});

describe("place", () => {
  it("list needs --q or --person", async () => {
    expect((await runCli(["place", "list"], { home })).code).toBe(2);
  });

  it("--person flattens the nested place into columns", async () => {
    const fetch = api(() =>
      json({
        items: [
          {
            id: "l1",
            type: "BIRTH",
            fromYear: 1990,
            toYear: null,
            place: { id: "pl1", name: "Pune" },
          },
        ],
        total: 1,
      })
    );
    const r = await runCli(["place", "list", "--person", "p1"], {
      home,
      fetch,
    });
    expect(decode(r.stdout)).toMatchObject({
      places: [{ linkId: "l1", placeId: "pl1", name: "Pune", type: "BIRTH" }],
    });
  });

  it("create maps flags to API fields with numbers and lists", async () => {
    const fetch = api(() => json({ id: "pl2", name: "Pune" }, 201));
    await runCli(
      [
        "place",
        "create",
        "--name",
        "Pune",
        "--type",
        "city",
        "--lat",
        "18.5",
        "--lng",
        "73.8",
        "--aliases",
        "Poona, Punya",
      ],
      { home, fetch }
    );
    expect(body(fetch)).toEqual({
      name: "Pune",
      placeType: "CITY",
      latitude: 18.5,
      longitude: 73.8,
      alternativeNames: ["Poona", "Punya"],
    });
  });

  it("rejects non-numeric coordinates", async () => {
    const r = await runCli(
      ["place", "create", "--name", "X", "--type", "CITY", "--lat", "north"],
      { home }
    );
    expect(r.code).toBe(2);
  });

  it("update with no flags is a usage error", async () => {
    expect((await runCli(["place", "update", "pl1"], { home })).code).toBe(2);
  });

  it("empty children list prints a message and a create hint", async () => {
    const fetch = api(() => json({ items: [], total: 0 }));
    const out = decode(
      (await runCli(["place", "children", "pl1"], { home, fetch })).stdout
    ) as { message: string; help: Array<string> };
    expect(out.message).toBe("This place has no child places.");
    expect(out.help[0]).toContain("--parent pl1");
  });
});

describe("source", () => {
  it("cite sends person, event type and confidence", async () => {
    const fetch = api(() => json({ id: "es1" }, 201));
    const r = await runCli(
      [
        "source",
        "cite",
        "s1",
        "--person",
        "p1",
        "--event-type",
        "birth",
        "--confidence",
        "high",
      ],
      { home, fetch }
    );
    expect(r.code).toBe(0);
    expect(String(fetch.mock.calls[0][0])).toContain("/sources/s1/events");
    expect(body(fetch)).toEqual({
      personId: "p1",
      eventType: "BIRTH",
      confidence: "HIGH",
    });
  });

  it("citation defaults to MLA and prints the text", async () => {
    const fetch = api(() => json({ citation: "Rao, A. Family Bible." }));
    const r = await runCli(["source", "citation", "s1"], { home, fetch });
    expect(String(fetch.mock.calls[0][0])).toContain("format=MLA");
    expect(decode(r.stdout)).toMatchObject({
      citation: { format: "MLA", text: "Rao, A. Family Bible." },
    });
  });

  it("delete of a missing source succeeds with a note", async () => {
    const fetch = api(() => json({ error: "Source not found" }, 404));
    const r = await runCli(["source", "delete", "nope"], { home, fetch });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("nothing to delete");
  });
});

describe("review fixes", () => {
  it("a 404 that is not the resource's own not-found is an error, not a silent success", async () => {
    const fetch = api(() => new Response("404 Not Found", { status: 404 }));
    const r = await runCli(["event", "delete", "e1"], { home, fetch });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("not_found");
    expect(r.stdout).not.toContain("nothing to delete");
  });

  it("a 404 with a different resource's message is an error too", async () => {
    const fetch = api(() => json({ error: "Person not found" }, 404));
    const r = await runCli(["source", "delete", "s1"], { home, fetch });
    expect(r.code).toBe(1);
  });

  it.each(["0x10", "1e2", " 5", "Infinity", "18.", ".5"])(
    "rejects non-decimal number %j",
    async (value) => {
      const fetch = api(() => json({}));
      const r = await runCli(
        ["place", "create", "--name", "X", "--type", "CITY", "--lat", value],
        { home, fetch }
      );
      expect(r.code).toBe(2);
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it("accepts plain decimals and negatives", async () => {
    const fetch = api(() => json({ id: "p" }, 201));
    await runCli(
      [
        "place",
        "create",
        "--name",
        "X",
        "--type",
        "CITY",
        "--lat",
        "-18.52",
        "--lng",
        "73",
      ],
      { home, fetch }
    );
    expect(body(fetch)).toMatchObject({ latitude: -18.52, longitude: 73 });
  });

  it.each(["1e1", "0x5", "+3"])("--limit %j is rejected", async (value) => {
    const r = await runCli(["person", "list", "--limit", value], { home });
    expect(r.code).toBe(2);
  });
});
