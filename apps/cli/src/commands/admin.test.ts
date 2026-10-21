import { decode } from "@toon-format/toon";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveConfig } from "../lib/config";
import { json, runCli, tempHome } from "../test-helpers";
import { parseSettingPairs } from "./admin";
import type { FetchMock } from "../test-helpers";

let home: string;

beforeEach(() => {
  home = tempHome();
  saveConfig(
    {
      current: "default",
      profiles: {
        default: { url: "http://v.test", token: "t", tokenType: "session" },
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

describe("destructive commands need --yes off a TTY", () => {
  it.each([
    ["admin", "user", "delete", "u2"],
    ["admin", "invite", "delete", "i1"],
    ["admin", "invite", "revoke", "i1"],
    ["admin", "user", "update", "u2", "--no-active"],
  ])("%s %s %s refuses without --yes and sends nothing", async (...argv) => {
    const fetch = api(() => json({}));
    const r = await runCli(argv, { home, fetch });
    expect(r.code).toBe(2);
    expect(fetch).not.toHaveBeenCalled();
    const out = decode(r.stdout) as { error: Record<string, string> };
    expect(out.error.code).toBe("confirmation_required");
    expect(out.error.hint).toMatch(/--yes$/);
  });

  it("--yes proceeds; deleting a missing user succeeds with a note", async () => {
    const fetch = api(() => json({ error: "User not found" }, 404));
    const r = await runCli(["admin", "user", "delete", "u2", "--yes"], {
      home,
      fetch,
    });
    expect(r.code).toBe(0);
    expect(fetch.mock.calls[0][1]?.method).toBe("DELETE");
    expect(r.stdout).toContain("nothing to delete");
  });

  it("-y works too, and non-destructive updates need no confirmation", async () => {
    const fetch = api(() => json({ id: "u2" }));
    expect(
      (
        await runCli(["admin", "user", "update", "u2", "--no-active", "-y"], {
          home,
          fetch,
        })
      ).code
    ).toBe(0);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      isActive: false,
    });
    const r = await runCli(
      ["admin", "user", "update", "u2", "--role", "viewer"],
      {
        home,
        fetch,
      }
    );
    expect(r.code).toBe(0);
    expect(JSON.parse(String(fetch.mock.calls[1][1]?.body))).toEqual({
      role: "VIEWER",
    });
  });
});

describe("admin user/invite", () => {
  it("user list sends filters and prints pagination total", async () => {
    const fetch = api(() =>
      json({
        items: [
          {
            id: "u1",
            email: "a@x",
            role: "ADMIN",
            isActive: true,
            person: null,
          },
        ],
        pagination: { total: 7, page: 1, hasNext: true },
      })
    );
    const r = await runCli(
      [
        "admin",
        "user",
        "list",
        "--role",
        "admin",
        "--active",
        "true",
        "--limit",
        "1",
      ],
      { home, fetch }
    );
    expect(String(fetch.mock.calls[0][0])).toBe(
      "http://v.test/api/v1/admin/users?page=1&limit=1&role=ADMIN&active=true"
    );
    const out = decode(r.stdout) as { total: number; help: Array<string> };
    expect(out.total).toBe(7);
    expect(out.help).toContain("vamsa admin user list --page 2");
  });

  it("revoking a non-pending invite is a no-op success", async () => {
    const fetch = api(() =>
      json({ error: "Can only revoke pending invites" }, 400)
    );
    const r = await runCli(["admin", "invite", "revoke", "i1", "--yes"], {
      home,
      fetch,
    });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("not pending; nothing to do");
  });

  it("user link requires --person or --unlink", async () => {
    expect((await runCli(["admin", "user", "link", "u2"], { home })).code).toBe(
      2
    );
    const fetch = api(() => json({ id: "u2" }));
    await runCli(["admin", "user", "link", "u2", "--unlink"], { home, fetch });
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      personId: null,
    });
  });
});

describe("admin settings set", () => {
  it("parses typed key=value pairs", () => {
    expect(
      parseSettingPairs([
        "familyName=Kapoor = Iyer",
        "allowProfileClaiming=true",
        "metricsApiUrl=null",
      ])
    ).toEqual({
      familyName: "Kapoor = Iyer",
      allowProfileClaiming: true,
      metricsApiUrl: null,
    });
  });

  it("rejects unknown keys, bad booleans and missing '='", () => {
    expect(() => parseSettingPairs(["colour=red"])).toThrow(/Unknown setting/);
    expect(() => parseSettingPairs(["allowSelfRegistration=yes"])).toThrow(
      /true or false/
    );
    expect(() => parseSettingPairs(["familyName"])).toThrow(/key=value/);
  });

  it("sends only the given keys and accepts several pairs", async () => {
    const fetch = api((_u, init) =>
      json({ ...JSON.parse(String(init.body)), id: "fs" })
    );
    const r = await runCli(
      [
        "admin",
        "settings",
        "set",
        "familyName=Rao",
        "allowSelfRegistration=false",
      ],
      { home, fetch }
    );
    expect(r.code).toBe(0);
    expect(fetch.mock.calls[0][1]?.method).toBe("PUT");
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
      familyName: "Rao",
      allowSelfRegistration: false,
    });
    expect(decode(r.stdout)).toMatchObject({
      updated: { familyName: "Rao", allowSelfRegistration: false },
    });
  });

  it("set with no pairs is a usage error", async () => {
    expect((await runCli(["admin", "settings", "set"], { home })).code).toBe(2);
  });
});
