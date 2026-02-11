import { afterEach, describe, expect, it } from "vitest";
import { getVamsaAppURL } from "./shared";

describe("getVamsaAppURL", () => {
  const originalEnv = process.env.VAMSA_APP_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.VAMSA_APP_URL = originalEnv;
    } else {
      delete process.env.VAMSA_APP_URL;
    }
  });

  it("should return default localhost URL when env var is not set", () => {
    delete process.env.VAMSA_APP_URL;

    expect(getVamsaAppURL()).toBe("http://localhost:3000");
  });

  it("should return custom URL from environment variable", () => {
    process.env.VAMSA_APP_URL = "https://vamsa.example.com";

    expect(getVamsaAppURL()).toBe("https://vamsa.example.com");
  });
});
