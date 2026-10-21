import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { configPath, saveConfig } from "../lib/config";
import { json, runCli, tempHome } from "../test-helpers";
import type { FetchMock } from "../test-helpers";

let home: string;
const URL_ = "https://vamsa.test";
const NOW = Date.parse("2026-10-21T12:00:00Z");

beforeEach(() => {
  home = tempHome();
});

/** stdout with --json holds one pretty-printed object per printed block */
function docs(stdout: string): Array<Record<string, any>> {
  return stdout
    .trim()
    .split(/\n(?=\{)/)
    .map((s) => JSON.parse(s));
}

function readConfig() {
  return JSON.parse(readFileSync(configPath({ HOME: home }), "utf8"));
}

const deviceCode = {
  device_code: "dev-123",
  user_code: "ABCDEFGH",
  verification_uri: `${URL_}/device`,
  verification_uri_complete: `${URL_}/device?user_code=ABCDEFGH`,
  expires_in: 600,
  interval: 5,
};

interface ServerOpts {
  /** Responses for successive /device/token polls */
  polls: Array<Response | (() => Response)>;
  role?: string;
}

/** Fake server: device endpoints + /auth/me, /tokens, /auth/logout. */
function server(opts: ServerOpts): FetchMock {
  let poll = 0;
  return vi.fn(async (input: string, init?: RequestInit) => {
    const u = new URL(input);
    switch (u.pathname) {
      case "/api/auth/device/code":
        return json(deviceCode);
      case "/api/auth/device/token": {
        const next = opts.polls[Math.min(poll++, opts.polls.length - 1)];
        return typeof next === "function" ? next() : (next.clone() as Response);
      }
      case "/api/v1/auth/me":
        return json({
          id: "u1",
          email: "me@x",
          name: "Me",
          role: opts.role ?? "MEMBER",
          tokenScope: null,
        });
      case "/api/v1/tokens": {
        const body = JSON.parse(String(init?.body));
        return json(
          {
            id: "tok-1",
            name: body.name,
            scope: body.scope,
            expiresAt: "2027-01-19T12:00:00.000Z",
            token: "vms_minted",
          },
          201
        );
      }
      case "/api/v1/auth/logout":
        return json({ success: true });
    }
    return json({ error: "unexpected" }, 500);
  });
}

const pending = () =>
  json({ error: "authorization_pending", error_description: "pending" }, 400);
const granted = () =>
  json({ access_token: "sess-device", token_type: "Bearer", expires_in: 1 });

function calls(fetch: FetchMock, path: string) {
  return fetch.mock.calls.filter(([u]) => new URL(u).pathname === path);
}

describe("vamsa login (browser / device flow)", () => {
  it("non-TTY: prints the link first, polls, mints a PAT, ends the session", async () => {
    const fetch = server({ polls: [pending(), pending(), granted()] });
    const sleeps: Array<number> = [];
    const opened: Array<string> = [];
    const r = await runCli(["login", "--url", URL_, "--json"], {
      home,
      fetch,
      sleeps,
      opened,
      now: NOW,
    });
    expect(r.code).toBe(0);
    const [block, done] = docs(r.stdout);
    expect(block.login).toEqual({
      status: "waiting",
      verificationUri: `${URL_}/device`,
      verificationUriComplete: `${URL_}/device?user_code=ABCDEFGH`,
      userCode: "ABCD-EFGH",
      expiresIn: 600,
      profile: "default",
    });
    expect(done.loggedIn).toMatchObject({
      tokenType: "pat",
      tokenScope: "write",
      tokenName: "test-host",
      email: "me@x",
    });

    // No TTY: no browser, no spinner, polled at the server's interval
    expect(opened).toEqual([]);
    expect(r.stderr).toBe("");
    expect(sleeps).toEqual([5000, 5000, 5000]);

    // CLI identifies itself for the /device page
    const [, codeInit] = calls(fetch, "/api/auth/device/code")[0];
    expect((codeInit?.headers as Record<string, string>)["User-Agent"]).toMatch(
      /^vamsa-cli\/\S+ \(darwin; test-host\)$/
    );
    expect(JSON.parse(String(codeInit?.body))).toEqual({
      client_id: "vamsa-cli",
      scope: "write",
    });

    // PAT minted with the session, then the session is revoked
    const [, mintInit] = calls(fetch, "/api/v1/tokens")[0];
    expect((mintInit?.headers as Record<string, string>).Authorization).toBe(
      "Bearer sess-device"
    );
    expect(JSON.parse(String(mintInit?.body))).toEqual({
      name: "test-host",
      scope: "write",
      expiresInDays: 90,
    });
    const [, logoutInit] = calls(fetch, "/api/v1/auth/logout")[0];
    expect((logoutInit?.headers as Record<string, string>).Authorization).toBe(
      "Bearer sess-device"
    );

    // Only the PAT is stored; the pending record is gone
    expect(readConfig().profiles.default).toEqual({
      url: URL_,
      token: "vms_minted",
      tokenType: "pat",
      email: "me@x",
    });
  });

  it("TOON output starts with the approval block", async () => {
    const fetch = server({ polls: [granted()] });
    const r = await runCli(["login", "--url", URL_], { home, fetch, now: NOW });
    expect(r.code).toBe(0);
    const first = r.stdout.indexOf("verificationUriComplete");
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(r.stdout.indexOf("loggedIn"));
    expect(r.stdout).toContain("ABCD-EFGH");
  });

  it("TTY: opens the browser and shows a spinner; --no-browser skips it", async () => {
    const opened: Array<string> = [];
    let r = await runCli(["login", "--url", URL_], {
      home,
      fetch: server({ polls: [granted()] }),
      interactive: true,
      opened,
      now: NOW,
    });
    expect(r.code).toBe(0);
    expect(opened).toEqual([`${URL_}/device?user_code=ABCDEFGH`]);
    expect(r.stderr).toContain("[spinner] Waiting for approval");

    opened.length = 0;
    r = await runCli(["login", "--url", URL_, "--no-browser"], {
      home,
      fetch: server({ polls: [granted()] }),
      interactive: true,
      opened,
      now: NOW,
    });
    expect(r.code).toBe(0);
    expect(opened).toEqual([]);
  });

  it("slow_down adds 5s to the polling interval", async () => {
    const sleeps: Array<number> = [];
    const r = await runCli(["login", "--url", URL_], {
      home,
      fetch: server({
        polls: [json({ error: "slow_down" }, 400), pending(), granted()],
      }),
      sleeps,
      now: NOW,
    });
    expect(r.code).toBe(0);
    expect(sleeps).toEqual([5000, 10000, 10000]);
  });

  it("denied: exit 1 with access_denied, nothing stored", async () => {
    const r = await runCli(["login", "--url", URL_, "--json"], {
      home,
      fetch: server({ polls: [json({ error: "access_denied" }, 400)] }),
      now: NOW,
    });
    expect(r.code).toBe(1);
    const out = docs(r.stdout);
    expect(out[0].login.status).toBe("waiting");
    expect(out[1].error).toMatchObject({
      code: "access_denied",
      hint: "vamsa login  (to try again)",
    });
    expect(readConfig().profiles.default).toBeUndefined();
  });

  it("expired: exit 1 with expired_token", async () => {
    const r = await runCli(["login", "--url", URL_, "--json"], {
      home,
      fetch: server({ polls: [json({ error: "expired_token" }, 400)] }),
      now: NOW,
    });
    expect(r.code).toBe(1);
    expect(docs(r.stdout)[1].error.code).toBe("expired_token");
  });

  it("gives up locally once the code's lifetime has passed", async () => {
    const fetch = server({ polls: [pending()] });
    const r = await runCli(["login", "--url", URL_, "--json"], {
      home,
      fetch,
      now: NOW,
    });
    expect(r.code).toBe(1);
    expect(docs(r.stdout)[1].error.code).toBe("expired_token");
    // 600s / 5s polls, then stop
    expect(calls(fetch, "/api/auth/device/token").length).toBe(120);
  });

  it("caps the requested scope at the user's role", async () => {
    const fetch = server({ polls: [granted()], role: "VIEWER" });
    const r = await runCli(
      ["login", "--url", URL_, "--scope", "admin", "--name", "ci", "--json"],
      { home, fetch, now: NOW }
    );
    expect(r.code).toBe(0);
    const [, mintInit] = calls(fetch, "/api/v1/tokens")[0];
    expect(JSON.parse(String(mintInit?.body))).toMatchObject({
      name: "ci",
      scope: "read",
    });
    expect(docs(r.stdout)[1].loggedIn.note).toContain("lowered from admin");
  });

  it("revokes the session even if minting the PAT fails", async () => {
    const base = server({ polls: [granted()] });
    const fetch: FetchMock = vi.fn(async (input: string, init?: RequestInit) =>
      new URL(input).pathname === "/api/v1/tokens"
        ? json({ error: "Forbidden" }, 403)
        : base(input, init)
    );
    const r = await runCli(["login", "--url", URL_], { home, fetch, now: NOW });
    expect(r.code).toBe(1);
    expect(calls(fetch, "/api/v1/auth/logout").length).toBe(1);
  });

  it("a server without the device endpoints says so", async () => {
    const fetch: FetchMock = vi.fn(async () => json({}, 404));
    const r = await runCli(["login", "--url", URL_], { home, fetch });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("device_login_unsupported");
  });
});

describe("vamsa login --no-wait / --resume", () => {
  it("--no-wait prints the block, stores the pending login, exits 0", async () => {
    const fetch = server({ polls: [pending()] });
    const r = await runCli(
      ["login", "--url", URL_, "--no-wait", "--profile", "work", "--json"],
      { home, fetch, now: NOW }
    );
    expect(r.code).toBe(0);
    const [out] = docs(r.stdout);
    expect(out.login.status).toBe("pending");
    expect(out.help).toContain(
      "vamsa login --resume --profile work  (after approving, to finish)"
    );
    expect(calls(fetch, "/api/auth/device/token").length).toBe(0);
    expect(readConfig().profiles.work.pending).toMatchObject({
      url: URL_,
      deviceCode: "dev-123",
      userCode: "ABCDEFGH",
      scope: "write",
      name: "test-host",
      expiresAt: new Date(NOW + 600_000).toISOString(),
    });
  });

  it("--resume finishes it and stores the PAT", async () => {
    await runCli(["login", "--url", URL_, "--no-wait"], {
      home,
      fetch: server({ polls: [] }),
      now: NOW,
    });
    const fetch = server({ polls: [pending(), granted()] });
    const r = await runCli(["login", "--resume", "--json"], {
      home,
      fetch,
      now: NOW + 30_000,
    });
    expect(r.code).toBe(0);
    const [block, done] = docs(r.stdout);
    expect(block.login.expiresIn).toBe(570);
    expect(done.loggedIn.tokenType).toBe("pat");
    expect(readConfig().profiles.default.pending).toBeUndefined();
    expect(readConfig().profiles.default.token).toBe("vms_minted");
  });

  it("--resume --no-wait checks once and reports pending", async () => {
    await runCli(["login", "--url", URL_, "--no-wait"], {
      home,
      fetch: server({ polls: [] }),
      now: NOW,
    });
    const fetch = server({ polls: [pending()] });
    const r = await runCli(["login", "--resume", "--no-wait", "--json"], {
      home,
      fetch,
      now: NOW + 10_000,
    });
    expect(r.code).toBe(0);
    expect(docs(r.stdout)[0].login.status).toBe("pending");
    expect(calls(fetch, "/api/auth/device/token").length).toBe(1);
    expect(readConfig().profiles.default.pending).toBeDefined();
  });

  it("--resume after expiry: exit 1, pending cleared", async () => {
    await runCli(["login", "--url", URL_, "--no-wait"], {
      home,
      fetch: server({ polls: [] }),
      now: NOW,
    });
    const fetch = server({ polls: [] });
    const r = await runCli(["login", "--resume"], {
      home,
      fetch,
      now: NOW + 601_000,
    });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("expired_token");
    expect(fetch).not.toHaveBeenCalled();
    expect(readConfig().profiles.default).toBeUndefined();
  });

  it("--resume with nothing pending is an error with a hint", async () => {
    const r = await runCli(["login", "--resume"], { home });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("no_pending_login");
    expect(r.stdout).toContain("vamsa login --no-wait");
  });

  it("--no-wait keeps an existing credential until the new one lands", async () => {
    saveConfig(
      {
        current: "default",
        profiles: {
          default: { url: URL_, token: "vms_old", tokenType: "pat" },
        },
      },
      { HOME: home }
    );
    await runCli(["login", "--url", URL_, "--no-wait"], {
      home,
      fetch: server({ polls: [] }),
      now: NOW,
    });
    expect(readConfig().profiles.default).toMatchObject({
      token: "vms_old",
      pending: { deviceCode: "dev-123" },
    });
  });
});

describe("vamsa login --password (fallback)", () => {
  it("--password without --email on a non-TTY is a usage error", async () => {
    const r = await runCli(["login", "--password"], { home });
    expect(r.code).toBe(2);
    expect(r.stdout).toContain("--email");
  });
});
