import { readFileSync, statSync } from "node:fs";
import { decode } from "@toon-format/toon";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { configPath, saveConfig } from "./lib/config";
import { json, runCli, tempHome } from "./test-helpers";
import type { FetchMock } from "./test-helpers";

let home: string;

beforeEach(() => {
  home = tempHome();
});

function loggedIn(token = "sess-tok") {
  saveConfig(
    {
      current: "default",
      profiles: {
        default: { url: "https://vamsa.test", token, tokenType: "session" },
      },
    },
    { HOME: home }
  );
}

function fetchMock(
  handler: (url: URL, init: RequestInit) => Response | Promise<Response>
): FetchMock {
  return vi.fn(async (input: string, init?: RequestInit) =>
    handler(new URL(input), init ?? {})
  );
}

describe("usage errors (exit 2)", () => {
  it("rejects unknown flags with a structured error on stdout", async () => {
    const r = await runCli(["person", "list", "--bogus"], { home });
    expect(r.code).toBe(2);
    expect(r.stderr).toBe("");
    expect(decode(r.stdout)).toEqual({
      error: {
        code: "usage",
        message: 'Unknown flag "--bogus" for "vamsa person list"',
        hint: "vamsa person list --help",
      },
    });
  });

  it("rejects unknown commands and lists the valid ones", async () => {
    const r = await runCli(["person", "frob"], { home });
    expect(r.code).toBe(2);
    expect(r.stdout).toContain('Unknown command \\"frob\\"');
    expect(r.stdout).toContain("list, get, create, update, delete");
  });

  it("rejects missing positionals and extra arguments", async () => {
    expect((await runCli(["person", "get"], { home })).code).toBe(2);
    expect((await runCli(["person", "get", "a", "b"], { home })).code).toBe(2);
  });

  it("rejects a string flag with no value", async () => {
    const r = await runCli(["person", "list", "--limit"], { home });
    expect(r.code).toBe(2);
    expect(r.stdout).toContain("needs a value");
  });

  it("accepts --no-<boolean> and global flags anywhere", async () => {
    loggedIn();
    const fetch = fetchMock(() => json({ id: "p9" }, 201));
    const r = await runCli(
      [
        "--json",
        "person",
        "create",
        "--first-name",
        "A",
        "--last-name",
        "B",
        "--no-living",
      ],
      { home, fetch }
    );
    expect(r.code).toBe(0);
    const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
    expect(body).toEqual({ firstName: "A", lastName: "B", isLiving: false });
    expect(JSON.parse(r.stdout).created.id).toBe("p9");
  });
});

describe("help", () => {
  it("prints concise help and exits 0", async () => {
    const r = await runCli(["token", "create", "--help"], { home });
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/^usage: vamsa token create \[flags\]/);
    expect(r.stdout).toContain("--scope <read|write|admin>");
    expect(r.stdout.split("\n").length).toBeLessThan(12);
  });
});

describe("home view", () => {
  it("shows description, ~ path and a login hint when logged out", async () => {
    const r = await runCli([], { home });
    expect(r.code).toBe(0);
    const out = decode(r.stdout) as Record<string, unknown>;
    expect(out.bin).toBe("~/.local/bin/vamsa");
    expect(out.user).toBeNull();
    expect((out.help as Array<string>)[0]).toMatch(/^vamsa login/);
  });

  it("shows user and person count when logged in", async () => {
    loggedIn();
    const fetch = fetchMock((url) =>
      url.pathname === "/api/v1/auth/me"
        ? json({
            id: "u",
            email: "a@x",
            name: "A",
            role: "ADMIN",
            tokenScope: null,
          })
        : json({ items: [{}], nextCursor: "c", hasMore: true, total: 42 })
    );
    const out = decode((await runCli([], { home, fetch })).stdout) as {
      user: string;
      counts: { persons: number };
    };
    expect(out.user).toBe("a@x (ADMIN)");
    expect(out.counts.persons).toBe(42);
  });
});

describe("person list (mocked API)", () => {
  it("sends the bearer token and search, prints rows, total and help", async () => {
    loggedIn("sess-tok");
    const fetch = fetchMock(() =>
      json({
        items: [
          {
            id: "p1",
            firstName: "Asha",
            lastName: "Rao",
            dateOfBirth: "1990-01-01",
            isLiving: true,
            bio: "long",
          },
        ],
        nextCursor: null,
        hasMore: false,
        total: 1,
      })
    );
    const r = await runCli(["person", "list", "--q", "asha"], { home, fetch });

    expect(r.code).toBe(0);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://vamsa.test/api/v1/persons?search=asha&limit=20");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer sess-tok"
    );
    expect(decode(r.stdout)).toEqual({
      persons: [
        {
          id: "p1",
          name: "Asha Rao",
          dateOfBirth: "1990-01-01",
          isLiving: true,
        },
      ],
      total: 1,
      showing: 1,
      page: 1,
      hasMore: false,
      help: ["vamsa person get <id>", "vamsa relationship list --person <id>"],
    });
  });

  it("follows cursors for --page", async () => {
    loggedIn();
    const fetch = fetchMock((url) =>
      url.searchParams.get("cursor")
        ? json({
            items: [{ id: "p3", firstName: "C", lastName: "D" }],
            nextCursor: null,
            hasMore: false,
            total: 3,
          })
        : json({
            items: [{ id: "p1" }, { id: "p2" }],
            nextCursor: "cur",
            hasMore: true,
            total: 3,
          })
    );
    const r = await runCli(["person", "list", "--limit", "2", "--page", "2"], {
      home,
      fetch,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[1][0])).toContain("cursor=cur");
    expect(r.stdout).toContain("p3,C D");
  });

  it("prints an explicit message for zero results", async () => {
    loggedIn();
    const fetch = fetchMock(() =>
      json({ items: [], nextCursor: null, hasMore: false, total: 0 })
    );
    const out = decode(
      (await runCli(["person", "list", "--q", "zz"], { home, fetch })).stdout
    ) as Record<string, unknown>;
    expect(out.total).toBe(0);
    expect(out.message).toBe('No people match "zz".');
  });

  it("maps 401 to an unauthorized error with a login hint (exit 1)", async () => {
    loggedIn();
    const fetch = fetchMock(() => json({ error: "Unauthorized" }, 401));
    const r = await runCli(["person", "list"], { home, fetch });
    expect(r.code).toBe(1);
    const out = decode(r.stdout) as { error: Record<string, unknown> };
    expect(out.error.code).toBe("unauthorized");
    expect(String(out.error.hint)).toMatch(/^vamsa login/);
  });

  const validation400 = () =>
    json(
      {
        error: "Validation error",
        details: "Must be an http or https URL",
        issues: [
          {
            path: "metricsDashboardUrl",
            message: "Must be an http or https URL",
            code: "custom",
          },
          { path: "familyName", message: "Too small", code: "too_small" },
        ],
      },
      400
    );

  it("maps a 400 validation body to invalid_request with field issues (TOON)", async () => {
    loggedIn();
    const fetch = fetchMock(validation400);
    const r = await runCli(
      ["admin", "settings", "set", "metricsDashboardUrl=javascript:alert(1)"],
      { home, fetch }
    );
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("issues[2]{path,message,code}:");
    expect(r.stdout).toContain("help[1]:\n  - vamsa admin settings set --help");
    expect(decode(r.stdout)).toEqual({
      error: {
        code: "invalid_request",
        message: "Must be an http or https URL",
        status: 400,
        issues: [
          {
            path: "metricsDashboardUrl",
            message: "Must be an http or https URL",
            code: "custom",
          },
          { path: "familyName", message: "Too small", code: "too_small" },
        ],
      },
      help: ["vamsa admin settings set --help"],
    });
  });

  it("renders the same invalid_request error exactly with --json", async () => {
    loggedIn();
    const fetch = fetchMock(validation400);
    const r = await runCli(
      ["admin", "settings", "set", "metricsDashboardUrl=x", "--json"],
      { home, fetch }
    );
    expect(r.code).toBe(1);
    expect(JSON.parse(r.stdout)).toEqual({
      error: {
        code: "invalid_request",
        message: "Must be an http or https URL",
        status: 400,
        issues: [
          {
            path: "metricsDashboardUrl",
            message: "Must be an http or https URL",
            code: "custom",
          },
          { path: "familyName", message: "Too small", code: "too_small" },
        ],
      },
      help: ["vamsa admin settings set --help"],
    });
  });

  it("a bad enum flag is a usage error without ANSI codes", async () => {
    loggedIn();
    const r = await runCli(
      ["token", "create", "--name", "x", "--scope", "root"],
      {
        home,
      }
    );
    expect(r.code).toBe(2);
    const out = decode(r.stdout) as { error: Record<string, unknown> };
    expect(out.error.code).toBe("usage");
    expect(String(out.error.message)).not.toContain("\u001b");
  });

  it("a plain 400 without issues keeps the server message", async () => {
    loggedIn();
    const fetch = fetchMock(() =>
      json({ error: "Cannot demote yourself" }, 400)
    );
    const r = await runCli(["person", "list"], { home, fetch });
    expect(r.code).toBe(1);
    expect(decode(r.stdout)).toEqual({
      error: {
        code: "invalid_request",
        message: "Cannot demote yourself",
        status: 400,
      },
      help: ["vamsa person list --help"],
    });
  });

  it("requires a credential before calling the API", async () => {
    const fetch = fetchMock(() => json({}));
    const r = await runCli(["person", "list"], { home, fetch });
    expect(r.code).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(r.stdout).toContain("not_logged_in");
  });
});

describe("idempotent deletes", () => {
  it("deleting a missing person succeeds with a note", async () => {
    loggedIn();
    const fetch = fetchMock(() => json({ error: "Person not found" }, 404));
    const r = await runCli(["person", "delete", "gone"], { home, fetch });
    expect(r.code).toBe(0);
    expect(decode(r.stdout)).toMatchObject({
      deleted: { id: "gone", note: "not found; nothing to delete" },
    });
  });
});

describe("login", () => {
  it("never prompts without a TTY: missing password is a usage error", async () => {
    const r = await runCli(["login", "--email", "a@x"], { home });
    expect(r.code).toBe(2);
    expect(r.stdout).toContain("--password-stdin");
  });

  it("logs in with --password-stdin and stores the session token (0600)", async () => {
    const fetch = fetchMock(() =>
      json({
        user: { email: "a@x", role: "MEMBER", name: "A" },
        token: "sess-new",
      })
    );
    const r = await runCli(
      ["login", "--url", "vamsa.test", "--email", "a@x", "--password-stdin"],
      { home, fetch, stdin: "s3cret\n" }
    );
    expect(r.code).toBe(0);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://vamsa.test/api/v1/auth/login");
    expect((init?.headers as Record<string, string>)["X-Vamsa-Client"]).toBe(
      "cli"
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "a@x",
      password: "s3cret",
    });

    const path = configPath({ HOME: home });
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(path, "utf8")).profiles.default).toEqual({
      url: "https://vamsa.test",
      token: "sess-new",
      tokenType: "session",
      email: "a@x",
    });
  });

  it("--token stores a PAT after checking it with /auth/me", async () => {
    const fetch = fetchMock(() =>
      json({
        id: "u",
        email: "a@x",
        name: null,
        role: "VIEWER",
        tokenScope: "read",
      })
    );
    const r = await runCli(
      [
        "login",
        "--profile",
        "ci",
        "--url",
        "https://vamsa.test",
        "--token",
        "vms_abc",
      ],
      { home, fetch }
    );
    expect(r.code).toBe(0);
    const cfg = JSON.parse(readFileSync(configPath({ HOME: home }), "utf8"));
    expect(cfg.current).toBe("ci");
    expect(cfg.profiles.ci).toMatchObject({
      token: "vms_abc",
      tokenType: "pat",
    });
  });

  it("rejects --token values that are not vms_ tokens", async () => {
    const r = await runCli(["login", "--token", "abc"], { home });
    expect(r.code).toBe(2);
  });
});

describe("debug logging", () => {
  it("--verbose logs requests to stderr, never to stdout", async () => {
    loggedIn();
    const fetch = fetchMock(() =>
      json({ items: [], nextCursor: null, hasMore: false, total: 0 })
    );
    const r = await runCli(["person", "list", "--verbose"], { home, fetch });
    expect(r.stderr).toContain("-> GET https://vamsa.test/api/v1/persons");
    expect(r.stdout).not.toContain("[vamsa]");
  });
});

describe("review fixes", () => {
  it("--url to another server does not send the saved token", async () => {
    loggedIn("secret-session");
    const fetch = fetchMock(() => json({}));
    const r = await runCli(
      ["person", "list", "--url", "https://evil.example"],
      { home, fetch }
    );
    expect(r.code).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(decode(r.stdout)).toMatchObject({
      error: { code: "token_url_mismatch" },
    });
  });

  it("plain http to a remote host is a usage error", async () => {
    const r = await runCli(
      ["login", "--url", "http://vamsa.example", "--token", "vms_x"],
      {
        home,
      }
    );
    expect(r.code).toBe(2);
    expect(r.stdout).toContain("plain http");
  });

  it("--password-stdin with a terminal on stdin is a usage error", async () => {
    const fetch = fetchMock(() => json({}));
    const r = await runCli(
      [
        "login",
        "--url",
        "https://vamsa.test",
        "--email",
        "a@x",
        "--password-stdin",
      ],
      { home, fetch, stdinIsTTY: true }
    );
    expect(r.code).toBe(2);
    expect(r.stdout).toContain("stdin is a terminal");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("re-login over a session profile ends the old session first", async () => {
    loggedIn("old-session");
    const fetch = fetchMock((url) =>
      url.pathname.endsWith("/auth/logout")
        ? json({ success: true })
        : json({
            user: { email: "a@x", role: "MEMBER", name: "A" },
            token: "new-session",
          })
    );
    const r = await runCli(
      [
        "login",
        "--url",
        "https://vamsa.test",
        "--email",
        "a@x",
        "--password-stdin",
      ],
      { home, fetch, stdin: "pw\n" }
    );
    expect(r.code).toBe(0);
    const logout = fetch.mock.calls.find(([u]) =>
      String(u).endsWith("/auth/logout")
    );
    expect((logout?.[1]?.headers as Record<string, string>).Authorization).toBe(
      "Bearer old-session"
    );
  });

  it("profile remove ends a saved session (best effort)", async () => {
    loggedIn("old-session");
    const fetch = fetchMock(() => {
      throw new Error("offline");
    });
    const r = await runCli(["profile", "remove", "default"], { home, fetch });
    expect(r.code).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(r.stdout).toContain("server unreachable");
  });

  it("--page is capped at 100", async () => {
    loggedIn();
    const r = await runCli(["person", "list", "--page", "101"], { home });
    expect(r.code).toBe(2);
  });

  it("--json=true formats errors as JSON too", async () => {
    const r = await runCli(["person", "list", "--json=true", "--bogus"], {
      home,
    });
    expect(JSON.parse(r.stdout).error.code).toBe("usage");
  });
});
