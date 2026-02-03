import { describe, expect, test } from "bun:test";
import { authKeys, personKeys, relationshipKeys, userKeys } from "./keys";

describe("personKeys", () => {
  test("all returns base key", () => {
    expect(personKeys.all).toEqual(["persons"]);
  });

  test("lists returns list key", () => {
    expect(personKeys.lists()).toEqual(["persons", "list"]);
  });

  test("list with filters returns key with filters", () => {
    const filters = { search: "John", limit: 20 };
    expect(personKeys.list(filters)).toEqual(["persons", "list", filters]);
  });

  test("list without filters returns key with undefined", () => {
    expect(personKeys.list()).toEqual(["persons", "list", undefined]);
  });

  test("details returns details key", () => {
    expect(personKeys.details()).toEqual(["persons", "detail"]);
  });

  test("detail with id returns specific detail key", () => {
    expect(personKeys.detail("person-123")).toEqual([
      "persons",
      "detail",
      "person-123",
    ]);
  });
});

describe("relationshipKeys", () => {
  test("all returns base key", () => {
    expect(relationshipKeys.all).toEqual(["relationships"]);
  });

  test("lists returns list key", () => {
    expect(relationshipKeys.lists()).toEqual(["relationships", "list"]);
  });

  test("list with filters returns key with filters", () => {
    const filters = { personId: "p1", type: "PARENT" };
    expect(relationshipKeys.list(filters)).toEqual([
      "relationships",
      "list",
      filters,
    ]);
  });

  test("details returns details key", () => {
    expect(relationshipKeys.details()).toEqual(["relationships", "detail"]);
  });

  test("detail with id returns specific detail key", () => {
    expect(relationshipKeys.detail("rel-456")).toEqual([
      "relationships",
      "detail",
      "rel-456",
    ]);
  });
});

describe("userKeys", () => {
  test("all returns base key", () => {
    expect(userKeys.all).toEqual(["users"]);
  });

  test("me returns current user key", () => {
    expect(userKeys.me()).toEqual(["users", "me"]);
  });

  test("profile returns profile key", () => {
    expect(userKeys.profile()).toEqual(["users", "profile"]);
  });
});

describe("authKeys", () => {
  test("all returns base key", () => {
    expect(authKeys.all).toEqual(["auth"]);
  });

  test("session returns session key", () => {
    expect(authKeys.session()).toEqual(["auth", "session"]);
  });

  test("providers returns providers key", () => {
    expect(authKeys.providers()).toEqual(["auth", "providers"]);
  });
});

describe("query key immutability", () => {
  test("personKeys.all is readonly", () => {
    const key1 = personKeys.all;
    const key2 = personKeys.all;
    expect(key1).toBe(key2); // Same reference
  });

  test("generated keys are new arrays", () => {
    const key1 = personKeys.lists();
    const key2 = personKeys.lists();
    expect(key1).not.toBe(key2); // Different references
    expect(key1).toEqual(key2); // Same content
  });
});
