import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import app from "./app";

// Mock agents before importing app
const { mockRunChatAgent, mockRunStoryAgent, mockRunSuggestAgent } = vi.hoisted(
  () => ({
    mockRunChatAgent: vi.fn(),
    mockRunStoryAgent: vi.fn(),
    mockRunSuggestAgent: vi.fn(),
  })
);

vi.mock("./agents/chat-agent", () => ({
  runChatAgent: mockRunChatAgent,
}));

vi.mock("./agents/story-agent", () => ({
  runStoryAgent: mockRunStoryAgent,
}));

vi.mock("./agents/suggest-agent", () => ({
  runSuggestAgent: mockRunSuggestAgent,
}));

// Mock LLM for health/config endpoints
const { mockCheckLLMHealth, mockGetLLMConfig } = vi.hoisted(() => ({
  mockCheckLLMHealth: vi.fn(),
  mockGetLLMConfig: vi.fn(),
}));

vi.mock("./providers/llm", () => ({
  checkLLMHealth: mockCheckLLMHealth,
  getLLMConfig: mockGetLLMConfig,
}));

// Mock tools export for config endpoint
vi.mock("./tools", () => ({
  chatTools: {
    search_people: {},
    get_person_details: {},
    find_ancestors: {},
    find_descendants: {},
    find_relationship_path: {},
    find_common_ancestor: {},
  },
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AI_API_KEY;
  delete process.env.TOOL_MODE;

  mockGetLLMConfig.mockReturnValue({
    provider: "ollama",
    model: "qwen2.5:1.5b",
    baseURL: "http://localhost:11434/v1",
  });
});

afterEach(() => {
  process.env = { ...originalEnv };
});

function jsonRequest(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// ============================================
// Health endpoint
// ============================================

describe("GET /healthz", () => {
  it("should return healthy when LLM is reachable", async () => {
    mockCheckLLMHealth.mockResolvedValueOnce({ ok: true });

    const res = await app.request("/healthz");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.llm.provider).toBe("ollama");
    expect(body.llm.model).toBe("qwen2.5:1.5b");
    expect(body.llm.reachable).toBe(true);
    expect(body.timestamp).toBeDefined();
  });

  it("should return degraded when LLM is unreachable", async () => {
    mockCheckLLMHealth.mockResolvedValueOnce({
      ok: false,
      error: "Connection refused",
    });

    const res = await app.request("/healthz");
    const body = await res.json();

    expect(body.status).toBe("degraded");
    expect(body.llm.reachable).toBe(false);
    expect(body.llm.error).toBe("Connection refused");
  });

  it("should not require authentication", async () => {
    process.env.AI_API_KEY = "secret-key";
    mockCheckLLMHealth.mockResolvedValueOnce({ ok: true });

    // Health check is outside /v1/* so no auth needed
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
  });
});

// ============================================
// Config endpoint
// ============================================

describe("GET /v1/config", () => {
  it("should return model configuration and features", async () => {
    const res = await app.request("/v1/config");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.provider).toBe("ollama");
    expect(body.model).toBe("qwen2.5:1.5b");
    expect(body.features).toEqual(["chat", "story", "suggest"]);
    expect(body.tools).toEqual([
      "search_people",
      "get_person_details",
      "find_ancestors",
      "find_descendants",
      "find_relationship_path",
      "find_common_ancestor",
    ]);
    expect(body.streaming).toBe(true);
    expect(body.toolMode).toBe("direct");
  });

  it("should use TOOL_MODE from environment", async () => {
    process.env.TOOL_MODE = "http";

    const res = await app.request("/v1/config");
    const body = await res.json();

    expect(body.toolMode).toBe("http");
  });
});

// ============================================
// Auth middleware
// ============================================

describe("API key authentication", () => {
  it("should allow requests when no API key is configured", async () => {
    delete process.env.AI_API_KEY;

    const res = await app.request("/v1/config");
    expect(res.status).toBe(200);
  });

  it("should reject requests without auth header when key is configured", async () => {
    process.env.AI_API_KEY = "secret-key";

    const res = await app.request("/v1/config");
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("should reject requests with wrong API key", async () => {
    process.env.AI_API_KEY = "secret-key";

    const res = await app.request("/v1/config", {
      headers: { Authorization: "Bearer wrong-key" },
    });

    expect(res.status).toBe(401);
  });

  it("should allow requests with correct API key", async () => {
    process.env.AI_API_KEY = "secret-key";

    const res = await app.request("/v1/config", {
      headers: { Authorization: "Bearer secret-key" },
    });

    expect(res.status).toBe(200);
  });

  it("should reject non-Bearer auth format", async () => {
    process.env.AI_API_KEY = "secret-key";

    const res = await app.request("/v1/config", {
      headers: { Authorization: "Basic secret-key" },
    });

    expect(res.status).toBe(401);
  });
});

// ============================================
// Chat endpoint
// ============================================

describe("POST /v1/chat", () => {
  it("should stream chat response for valid request", async () => {
    const mockStreamResponse = new Response("Hello from AI", {
      headers: { "Content-Type": "text/event-stream" },
    });
    mockRunChatAgent.mockReturnValueOnce({
      toTextStreamResponse: () => mockStreamResponse,
    });

    const res = await jsonRequest("/v1/chat", {
      message: "Who is Hari?",
    });

    expect(res.status).toBe(200);

    expect(mockRunChatAgent).toHaveBeenCalledWith({
      message: "Who is Hari?",
      history: [],
      context: undefined,
    });
  });

  it("should pass history and context to chat agent", async () => {
    mockRunChatAgent.mockReturnValueOnce({
      toTextStreamResponse: () => new Response("OK"),
    });

    await jsonRequest("/v1/chat", {
      message: "Tell me more",
      history: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello!" },
      ],
      context: {
        currentPersonId: "p-123",
        currentPersonName: "Hari",
        currentView: "overview",
      },
    });

    const callArgs = mockRunChatAgent.mock.calls[0][0];
    expect(callArgs.history).toHaveLength(2);
    expect(callArgs.context.currentPersonId).toBe("p-123");
  });

  it("should return 400 for missing message", async () => {
    const res = await jsonRequest("/v1/chat", {});
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid request");
  });

  it("should return 400 for empty message", async () => {
    const res = await jsonRequest("/v1/chat", { message: "" });

    expect(res.status).toBe(400);
  });

  it("should return 400 for message exceeding 2000 chars", async () => {
    const res = await jsonRequest("/v1/chat", {
      message: "x".repeat(2001),
    });

    expect(res.status).toBe(400);
  });

  it("should return 500 when chat agent throws", async () => {
    mockRunChatAgent.mockImplementationOnce(() => {
      throw new Error("Model unavailable");
    });

    const res = await jsonRequest("/v1/chat", {
      message: "Hello",
    });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Chat failed");
    expect(body.message).toBe("Model unavailable");
  });

  it("should handle non-Error thrown values in chat endpoint", async () => {
    mockRunChatAgent.mockImplementationOnce(() => {
      throw "string error";
    });

    const res = await jsonRequest("/v1/chat", { message: "Hi" });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toBe("string error");
  });
});

// ============================================
// Story endpoint
// ============================================

describe("POST /v1/story", () => {
  it("should return story result for valid request", async () => {
    mockRunStoryAgent.mockResolvedValueOnce({
      narrative: "Hari was born in 1945.",
      personId: "p-123",
      toolCallCount: 3,
    });

    const res = await jsonRequest("/v1/story", {
      personId: "p-123",
      personName: "Hari Prasad",
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.narrative).toBe("Hari was born in 1945.");
    expect(body.personId).toBe("p-123");
    expect(body.toolCallCount).toBe(3);
  });

  it("should accept optional style and maxWords", async () => {
    mockRunStoryAgent.mockResolvedValueOnce({
      narrative: "A formal piece.",
      personId: "p-1",
      toolCallCount: 0,
    });

    await jsonRequest("/v1/story", {
      personId: "p-1",
      style: "formal",
      maxWords: 200,
    });

    const callArgs = mockRunStoryAgent.mock.calls[0][0];
    expect(callArgs.style).toBe("formal");
    expect(callArgs.maxWords).toBe(200);
  });

  it("should return 400 for missing personId", async () => {
    const res = await jsonRequest("/v1/story", {});

    expect(res.status).toBe(400);
  });

  it("should return 400 for empty personId", async () => {
    const res = await jsonRequest("/v1/story", { personId: "" });

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid style", async () => {
    const res = await jsonRequest("/v1/story", {
      personId: "p-1",
      style: "poetic",
    });

    expect(res.status).toBe(400);
  });

  it("should return 400 for maxWords below minimum", async () => {
    const res = await jsonRequest("/v1/story", {
      personId: "p-1",
      maxWords: 10,
    });

    expect(res.status).toBe(400);
  });

  it("should return 400 for maxWords above maximum", async () => {
    const res = await jsonRequest("/v1/story", {
      personId: "p-1",
      maxWords: 5000,
    });

    expect(res.status).toBe(400);
  });

  it("should return 500 when story agent throws", async () => {
    mockRunStoryAgent.mockRejectedValueOnce(new Error("Generation failed"));

    const res = await jsonRequest("/v1/story", { personId: "p-1" });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Story generation failed");
    expect(body.message).toBe("Generation failed");
  });

  it("should handle non-Error thrown values in story endpoint", async () => {
    mockRunStoryAgent.mockRejectedValueOnce("model crashed");

    const res = await jsonRequest("/v1/story", { personId: "p-1" });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toBe("model crashed");
  });
});

// ============================================
// Suggest endpoint
// ============================================

describe("POST /v1/suggest", () => {
  it("should return suggestion results for valid request", async () => {
    mockRunSuggestAgent.mockResolvedValueOnce({
      personId: "p-123",
      suggestions: [
        {
          field: "birthPlace",
          suggestedValue: "Chennai",
          reasoning: "Family pattern",
          confidence: "high",
        },
      ],
      rawResponse: "Suggestion text",
      toolCallCount: 2,
    });

    const res = await jsonRequest("/v1/suggest", {
      personId: "p-123",
      personName: "Hari",
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.suggestions).toHaveLength(1);
    expect(body.suggestions[0].field).toBe("birthPlace");
  });

  it("should return 400 for missing personId", async () => {
    const res = await jsonRequest("/v1/suggest", {});

    expect(res.status).toBe(400);
  });

  it("should return 400 for empty personId", async () => {
    const res = await jsonRequest("/v1/suggest", { personId: "" });

    expect(res.status).toBe(400);
  });

  it("should return 500 when suggest agent throws", async () => {
    mockRunSuggestAgent.mockRejectedValueOnce(new Error("Suggestion failed"));

    const res = await jsonRequest("/v1/suggest", { personId: "p-1" });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Suggestion generation failed");
    expect(body.message).toBe("Suggestion failed");
  });

  it("should handle non-Error thrown values in suggest endpoint", async () => {
    mockRunSuggestAgent.mockRejectedValueOnce(404);

    const res = await jsonRequest("/v1/suggest", { personId: "p-1" });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toBe("404");
  });
});

// ============================================
// 404 handler
// ============================================

describe("404 handler", () => {
  it("should return 404 with available endpoints for unknown paths", async () => {
    const res = await app.request("/nonexistent");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Not Found");
    expect(body.message).toContain("/nonexistent");
    expect(body.available).toEqual([
      "/healthz",
      "/v1/config",
      "/v1/chat",
      "/v1/story",
      "/v1/suggest",
    ]);
  });
});

// ============================================
// Request validation schemas (exported from app)
// ============================================

describe("request schemas", () => {
  it("should validate chat request with valid history roles", async () => {
    mockRunChatAgent.mockReturnValueOnce({
      toTextStreamResponse: () => new Response("OK"),
    });

    const res = await jsonRequest("/v1/chat", {
      message: "Hello",
      history: [{ role: "user", content: "Hi" }],
    });

    expect(res.status).toBe(200);
  });

  it("should reject chat request with invalid history role", async () => {
    const res = await jsonRequest("/v1/chat", {
      message: "Hello",
      history: [{ role: "system", content: "Injected" }],
    });

    expect(res.status).toBe(400);
  });

  it("should accept story request with all valid styles", async () => {
    for (const style of ["formal", "casual", "documentary"]) {
      mockRunStoryAgent.mockResolvedValueOnce({
        narrative: "OK",
        personId: "p-1",
        toolCallCount: 0,
      });

      const res = await jsonRequest("/v1/story", {
        personId: "p-1",
        style,
      });
      expect(res.status).toBe(200);
    }
  });
});
