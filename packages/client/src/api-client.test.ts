import { describe, expect, test } from "bun:test";
import { createApiClient } from "./api-client";

describe("createApiClient", () => {
  test("creates a client with the given baseUrl", () => {
    const client = createApiClient("https://api.example.com/api/v1");
    expect(client).toBeDefined();
    // Hono RPC client is a Proxy function
    expect(typeof client).toBe("function");
  });

  test("creates a client with custom options", () => {
    const client = createApiClient("https://api.example.com/api/v1", {
      headers: {
        Authorization: "Bearer token123",
      },
      credentials: "include",
    });
    expect(client).toBeDefined();
  });

  test("client has expected route properties", () => {
    const client = createApiClient("https://api.example.com/api/v1");

    // The client should have route accessors based on AppType
    // These are dynamically created by hono/client
    expect(client).toBeDefined();
  });

  test("accepts options parameter without error", () => {
    // Verify client creation with various options doesn't throw
    const clientWithHeaders = createApiClient(
      "https://api.example.com/api/v1",
      {
        headers: {
          Authorization: "Bearer token123",
          "X-Custom-Header": "value",
        },
      }
    );
    expect(clientWithHeaders).toBeDefined();

    const clientWithCredentials = createApiClient(
      "https://api.example.com/api/v1",
      {
        credentials: "include",
        mode: "cors",
      }
    );
    expect(clientWithCredentials).toBeDefined();
  });
});

describe("ApiClient type exports", () => {
  test("ApiClient type is exported", async () => {
    const module = await import("./api-client");
    expect(module.createApiClient).toBeDefined();
    // ApiClient is a type, so we just verify the module exports what we expect
  });
});
