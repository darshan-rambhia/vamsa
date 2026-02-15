import { beforeEach, describe, expect, it, vi } from "vitest";
import { runStoryAgent } from "./story-agent";

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: mockGenerateText,
  stepCountIs: (n: number) => ({ type: "step-count", count: n }),
  tool: (def: any) => def,
}));

vi.mock("../providers/llm", () => ({
  createModel: () => ({ modelId: "test-model" }),
}));

describe("runStoryAgent", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("should generate a narrative with person name in the prompt", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "Hari Prasad was born in 1945 in a small village.",
      steps: [
        { toolCalls: [{ name: "get_person_details" }] },
        { toolCalls: [{ name: "find_ancestors" }] },
      ],
    });

    const result = await runStoryAgent({
      personId: "p-123",
      personName: "Hari Prasad",
    });

    expect(result.narrative).toBe(
      "Hari Prasad was born in 1945 in a small village."
    );
    expect(result.personId).toBe("p-123");
    expect(result.toolCallCount).toBe(2);

    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.prompt).toContain("Hari Prasad");
    expect(callArgs.prompt).toContain("documentary");
    expect(callArgs.prompt).toContain("400 words");
  });

  it("should use person ID only when name is not provided", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "The subject of this narrative...",
      steps: [],
    });

    await runStoryAgent({ personId: "p-456" });

    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.prompt).toContain("person with ID p-456");
    expect(callArgs.prompt).not.toContain("personName");
  });

  it("should respect custom style and maxWords", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "A formal narrative.",
      steps: [],
    });

    await runStoryAgent({
      personId: "p-789",
      personName: "Lakshmi",
      style: "formal",
      maxWords: 200,
    });

    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.prompt).toContain("formal");
    expect(callArgs.prompt).toContain("200 words");
  });

  it("should default to documentary style and 400 words", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "Narrative text here.",
      steps: [],
    });

    await runStoryAgent({ personId: "p-1", personName: "Test" });

    const callArgs = mockGenerateText.mock.calls[0][0];
    expect(callArgs.prompt).toContain("documentary");
    expect(callArgs.prompt).toContain("400 words");
  });

  it("should sanitize the generated narrative", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "assistant: The biography.\n\n\n\nThe end.",
      steps: [],
    });

    const result = await runStoryAgent({
      personId: "p-1",
      personName: "Test",
    });

    expect(result.narrative).toBe("The biography.\n\nThe end.");
  });

  it("should count tool calls across multiple steps", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "Story.",
      steps: [
        {
          toolCalls: [
            { name: "get_person_details" },
            { name: "find_ancestors" },
          ],
        },
        { toolCalls: [{ name: "find_descendants" }] },
        { toolCalls: undefined },
      ],
    });

    const result = await runStoryAgent({ personId: "p-1" });

    expect(result.toolCallCount).toBe(3);
  });

  it("should handle zero tool calls", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "Generated without tools.",
      steps: [],
    });

    const result = await runStoryAgent({ personId: "p-1" });

    expect(result.toolCallCount).toBe(0);
  });
});
