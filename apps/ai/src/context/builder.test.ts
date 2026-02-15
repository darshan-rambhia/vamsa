import { describe, expect, it } from "vitest";
import { buildMessages, buildUserContext } from "./builder";

describe("buildUserContext", () => {
  it("should return empty string when context is undefined", () => {
    expect(buildUserContext(undefined)).toBe("");
  });

  it("should return empty string when context has no fields", () => {
    expect(buildUserContext({})).toBe("");
  });

  it("should include person name when provided", () => {
    const result = buildUserContext({
      currentPersonName: "Hari Prasad",
    });

    expect(result).toContain("Hari Prasad");
    expect(result).toContain("## Current Context");
  });

  it("should include person name and ID together", () => {
    const result = buildUserContext({
      currentPersonName: "Hari Prasad",
      currentPersonId: "person-123",
    });

    expect(result).toContain("Hari Prasad");
    expect(result).toContain("(ID: person-123)");
  });

  it("should not include ID when person name is absent", () => {
    const result = buildUserContext({
      currentPersonId: "person-123",
    });

    // ID alone without name shouldn't produce output about person
    expect(result).not.toContain("person-123");
  });

  it("should include current view", () => {
    const result = buildUserContext({
      currentView: "overview",
    });

    expect(result).toContain("overview view");
  });

  it("should combine person name and view into a single context", () => {
    const result = buildUserContext({
      currentPersonName: "Lakshmi Devi",
      currentPersonId: "p-456",
      currentView: "family tree",
    });

    expect(result).toContain("## Current Context");
    expect(result).toContain("Lakshmi Devi");
    expect(result).toContain("(ID: p-456)");
    expect(result).toContain("family tree view");
  });
});

describe("buildMessages", () => {
  it("should append user message to empty history", () => {
    const messages = buildMessages([], "Hello");

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({ role: "user", content: "Hello" });
  });

  it("should preserve history messages and append new user message", () => {
    const history = [
      { role: "user" as const, content: "Who is Hari?" },
      { role: "assistant" as const, content: "Hari Prasad is..." },
    ];

    const messages = buildMessages(history, "Tell me more");

    expect(messages).toHaveLength(3);
    expect(messages[0]).toEqual({ role: "user", content: "Who is Hari?" });
    expect(messages[1]).toEqual({
      role: "assistant",
      content: "Hari Prasad is...",
    });
    expect(messages[2]).toEqual({ role: "user", content: "Tell me more" });
  });

  it("should not mutate the original history array", () => {
    const history = [{ role: "user" as const, content: "Hi" }];
    const originalLength = history.length;

    buildMessages(history, "New message");

    expect(history).toHaveLength(originalLength);
  });
});
