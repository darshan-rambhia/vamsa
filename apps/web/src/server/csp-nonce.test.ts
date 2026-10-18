// @vitest-environment node
/**
 * Tests for the CSP nonce reader
 *
 * Runs against the real TanStack request-header API: requestHandler() sets up
 * the same H3 request context that server functions and SSR render inside.
 */

import { requestHandler } from "@tanstack/react-start/server";
import { describe, expect, it } from "vitest";
import { getCspNonce } from "./csp-nonce";

async function runInRequest(
  headers: Record<string, string>,
  fn: () => string | undefined
): Promise<string> {
  const handler = requestHandler(async () => {
    return new Response(fn() ?? "<undefined>");
  });
  const response = await handler(
    new Request("http://localhost/", { headers }),
    {}
  );
  return response.text();
}

describe("getCspNonce", () => {
  it("returns the nonce Hono forwarded as x-csp-nonce", async () => {
    const value = await runInRequest({ "x-csp-nonce": "abc123XYZ" }, () =>
      getCspNonce()
    );

    expect(value).toBe("abc123XYZ");
  });

  it("returns undefined when the request has no nonce (dev, no CSP)", async () => {
    const value = await runInRequest({}, () => getCspNonce());

    expect(value).toBe("<undefined>");
  });

  it("returns undefined outside a request context", () => {
    expect(getCspNonce()).toBeUndefined();
  });
});
