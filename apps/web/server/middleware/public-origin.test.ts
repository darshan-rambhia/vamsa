// @vitest-environment node
/**
 * Unit tests for withPublicOrigin (TanStack Start origin check behind a proxy)
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withPublicOrigin } from "./public-origin";

describe("withPublicOrigin", () => {
  const original = process.env.APP_URL;

  beforeEach(() => {
    process.env.APP_URL = "https://vamsa.example.com";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = original;
  });

  it("rewrites the internal origin to APP_URL", () => {
    const req = new Request("http://vamsa.example.com/people?x=1");
    const out = withPublicOrigin(req);

    expect(new URL(out.url).origin).toBe("https://vamsa.example.com");
    expect(new URL(out.url).pathname).toBe("/people");
    expect(new URL(out.url).search).toBe("?x=1");
  });

  it("keeps method, headers and body for POST", async () => {
    const req = new Request("http://0.0.0.0:3000/_serverFn/abc", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://vamsa.example.com",
      },
      body: JSON.stringify({ data: { a: 1 } }),
    });
    const out = withPublicOrigin(req);

    expect(out.method).toBe("POST");
    expect(out.headers.get("origin")).toBe("https://vamsa.example.com");
    expect(await out.json()).toEqual({ data: { a: 1 } });
  });

  it("returns the same request when origins already match", () => {
    const req = new Request("https://vamsa.example.com/login");

    expect(withPublicOrigin(req)).toBe(req);
  });

  it("returns the request unchanged when APP_URL is unset", () => {
    delete process.env.APP_URL;
    const req = new Request("http://localhost:3000/login");

    expect(withPublicOrigin(req)).toBe(req);
  });
});
