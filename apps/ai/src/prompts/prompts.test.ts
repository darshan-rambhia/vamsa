import { describe, expect, it } from "vitest";
import { CHAT_SYSTEM_PROMPT } from "./chat-system";
import { STORY_SYSTEM_PROMPT } from "./story-system";
import { SUGGEST_SYSTEM_PROMPT } from "./suggest-system";

describe("system prompts", () => {
  it("should export a non-empty chat system prompt", () => {
    expect(CHAT_SYSTEM_PROMPT).toBeDefined();
    expect(CHAT_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(CHAT_SYSTEM_PROMPT).toContain("Vamsa");
  });

  it("chat prompt should reference all available tools", () => {
    expect(CHAT_SYSTEM_PROMPT).toContain("search_people");
    expect(CHAT_SYSTEM_PROMPT).toContain("get_person_details");
    expect(CHAT_SYSTEM_PROMPT).toContain("find_ancestors");
    expect(CHAT_SYSTEM_PROMPT).toContain("find_descendants");
    expect(CHAT_SYSTEM_PROMPT).toContain("find_relationship_path");
    expect(CHAT_SYSTEM_PROMPT).toContain("find_common_ancestor");
  });

  it("should export a non-empty story system prompt", () => {
    expect(STORY_SYSTEM_PROMPT).toBeDefined();
    expect(STORY_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(STORY_SYSTEM_PROMPT).toContain("narrative");
  });

  it("story prompt should define the generation process", () => {
    expect(STORY_SYSTEM_PROMPT).toContain("get_person_details");
    expect(STORY_SYSTEM_PROMPT).toContain("ancestors");
    expect(STORY_SYSTEM_PROMPT).toContain("descendants");
  });

  it("should export a non-empty suggest system prompt", () => {
    expect(SUGGEST_SYSTEM_PROMPT).toBeDefined();
    expect(SUGGEST_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(SUGGEST_SYSTEM_PROMPT).toContain("suggest");
  });

  it("suggest prompt should define confidence levels", () => {
    expect(SUGGEST_SYSTEM_PROMPT).toContain("low");
    expect(SUGGEST_SYSTEM_PROMPT).toContain("medium");
    expect(SUGGEST_SYSTEM_PROMPT).toContain("high");
  });

  it("suggest prompt should list expected output fields", () => {
    expect(SUGGEST_SYSTEM_PROMPT).toContain("field");
    expect(SUGGEST_SYSTEM_PROMPT).toContain("suggestedValue");
    expect(SUGGEST_SYSTEM_PROMPT).toContain("reasoning");
    expect(SUGGEST_SYSTEM_PROMPT).toContain("confidence");
  });
});
