import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("keeps same-site paths with a query", () => {
    expect(safeRedirect("/device?user_code=ABCDEFGH")).toBe(
      "/device?user_code=ABCDEFGH"
    );
  });

  it.each([
    "https://evil.example/",
    "//evil.example/x",
    "/\\evil.example",
    "device",
    "/a\nb",
    undefined,
    42,
  ])("rejects %s", (value) => {
    expect(safeRedirect(value)).toBeUndefined();
  });
});
