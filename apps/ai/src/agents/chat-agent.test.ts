import { beforeEach, describe, expect, it, vi } from "vitest";
import { runChatAgent } from "./chat-agent";

const { mockStreamText } = vi.hoisted(() => ({
  mockStreamText: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: mockStreamText,
  stepCountIs: (n: number) => ({ type: "step-count", count: n }),
  tool: (def: any) => def,
}));

vi.mock("../providers/llm", () => ({
  createModel: () => ({ modelId: "test-model" }),
}));

describe("runChatAgent", () => {
  beforeEach(() => {
    mockStreamText.mockReset();
  });

  it("should call streamText with correct system prompt and user message", () => {
    const mockResult = { toTextStreamResponse: vi.fn() };
    mockStreamText.mockReturnValueOnce(mockResult);

    const result = runChatAgent({ message: "Who is Hari?" });

    expect(result).toBe(mockResult);

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.system).toContain("Vamsa AI");
    expect(callArgs.messages).toHaveLength(1);
    expect(callArgs.messages[0]).toEqual({
      role: "user",
      content: "Who is Hari?",
    });
    expect(callArgs.tools).toBeDefined();
  });

  it("should include conversation history in messages", () => {
    mockStreamText.mockReturnValueOnce({ toTextStreamResponse: vi.fn() });

    runChatAgent({
      message: "Tell me more",
      history: [
        { role: "user", content: "Who is Hari?" },
        { role: "assistant", content: "Hari Prasad is..." },
      ],
    });

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.messages).toHaveLength(3);
    expect(callArgs.messages[0].content).toBe("Who is Hari?");
    expect(callArgs.messages[1].content).toBe("Hari Prasad is...");
    expect(callArgs.messages[2].content).toBe("Tell me more");
  });

  it("should append user context to system prompt when provided", () => {
    mockStreamText.mockReturnValueOnce({ toTextStreamResponse: vi.fn() });

    runChatAgent({
      message: "Tell me about this person",
      context: {
        currentPersonName: "Lakshmi Devi",
        currentPersonId: "p-456",
        currentView: "overview",
      },
    });

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.system).toContain("Lakshmi Devi");
    expect(callArgs.system).toContain("p-456");
    expect(callArgs.system).toContain("overview");
  });

  it("should not alter system prompt when context is absent", () => {
    mockStreamText.mockReturnValueOnce({ toTextStreamResponse: vi.fn() });

    runChatAgent({ message: "Hello" });

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.system).not.toContain("## Current Context");
  });

  it("should pass chatTools and step count limit to streamText", () => {
    mockStreamText.mockReturnValueOnce({ toTextStreamResponse: vi.fn() });

    runChatAgent({ message: "Test" });

    const callArgs = mockStreamText.mock.calls[0][0];
    expect(callArgs.tools).toBeDefined();
    expect(callArgs.stopWhen).toEqual({ type: "step-count", count: 5 });
  });
});
