import { describe, expect, it } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

describe("typed business errors", () => {
  it.each([
    [NotFoundError, "NotFoundError"],
    [ConflictError, "ConflictError"],
    [ValidationError, "ValidationError"],
  ] as const)("%s keeps its message and a stable name", (Cls, name) => {
    const err = new Cls("Place not found");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Place not found");
    // Routers match on name, which survives duplicate module instances
    expect(err.name).toBe(name);
  });
});
