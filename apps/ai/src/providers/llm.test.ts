import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkLLMHealth, createModel, getLLMConfig } from "./llm";

describe("getLLMConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_MODEL;
    delete process.env.LLM_URL;
    delete process.env.LLM_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should default to ollama with qwen model when no env vars set", () => {
    const config = getLLMConfig();

    expect(config.provider).toBe("ollama");
    expect(config.model).toBe("qwen2.5:1.5b");
    expect(config.baseURL).toBe("http://localhost:11434/v1");
    expect(config.apiKey).toBeUndefined();
  });

  it("should configure ollama with custom URL and model", () => {
    process.env.LLM_PROVIDER = "ollama";
    process.env.LLM_URL = "http://remote-ollama:11434/v1";
    process.env.LLM_MODEL = "llama3:8b";

    const config = getLLMConfig();

    expect(config.provider).toBe("ollama");
    expect(config.baseURL).toBe("http://remote-ollama:11434/v1");
    expect(config.model).toBe("llama3:8b");
  });

  it("should configure openai with API key and default model", () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.LLM_API_KEY = "sk-test-key";

    const config = getLLMConfig();

    expect(config.provider).toBe("openai");
    expect(config.baseURL).toBe("https://api.openai.com/v1");
    expect(config.apiKey).toBe("sk-test-key");
    expect(config.model).toBe("gpt-4o-mini");
  });

  it("should configure openai with custom model", () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.LLM_MODEL = "gpt-4o";

    const config = getLLMConfig();

    expect(config.model).toBe("gpt-4o");
  });

  it("should configure openai-compatible provider", () => {
    process.env.LLM_PROVIDER = "openai-compatible";
    process.env.LLM_URL = "https://api.groq.com/openai/v1";
    process.env.LLM_API_KEY = "gsk-test-key";
    process.env.LLM_MODEL = "mixtral-8x7b";

    const config = getLLMConfig();

    expect(config.provider).toBe("openai-compatible");
    expect(config.baseURL).toBe("https://api.groq.com/openai/v1");
    expect(config.apiKey).toBe("gsk-test-key");
    expect(config.model).toBe("mixtral-8x7b");
  });

  it("should use empty string as default baseURL for openai-compatible", () => {
    process.env.LLM_PROVIDER = "openai-compatible";

    const config = getLLMConfig();

    expect(config.baseURL).toBe("");
  });

  it("should throw for unknown provider", () => {
    process.env.LLM_PROVIDER = "invalid-provider";

    expect(() => getLLMConfig()).toThrow(
      "Unknown LLM provider: invalid-provider"
    );
  });
});

describe("createModel", () => {
  it("should create a model for ollama config", () => {
    const model = createModel({
      provider: "ollama",
      baseURL: "http://localhost:11434/v1",
      model: "qwen2.5:1.5b",
    });

    expect(model).toBeDefined();
    expect(model.modelId).toBe("qwen2.5:1.5b");
  });

  it("should create a model for openai config", () => {
    const model = createModel({
      provider: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: "sk-test",
      model: "gpt-4o-mini",
    });

    expect(model).toBeDefined();
    expect(model.modelId).toBe("gpt-4o-mini");
  });

  it("should create a model for openai-compatible config", () => {
    const model = createModel({
      provider: "openai-compatible",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: "gsk-test",
      model: "mixtral-8x7b",
    });

    expect(model).toBeDefined();
    expect(model.modelId).toBe("mixtral-8x7b");
  });

  it("should throw for unknown provider", () => {
    expect(() =>
      createModel({
        provider: "bad" as any,
        baseURL: "",
        model: "x",
      })
    ).toThrow("Unknown LLM provider: bad");
  });

  it("should use getLLMConfig when no config provided", () => {
    // defaults to ollama
    const model = createModel();

    expect(model).toBeDefined();
    expect(model.modelId).toBe("qwen2.5:1.5b");
  });
});

describe("checkLLMHealth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return ok when ollama is reachable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ models: [] }), { status: 200 })
    );

    const result = await checkLLMHealth({
      provider: "ollama",
      baseURL: "http://localhost:11434/v1",
      model: "qwen2.5:1.5b",
    });

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/tags",
      expect.objectContaining({
        headers: {},
      })
    );
  });

  it("should strip /v1 and use /api/tags for ollama health check", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("{}", { status: 200 })
    );

    await checkLLMHealth({
      provider: "ollama",
      baseURL: "http://myhost:11434/v1",
      model: "test",
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://myhost:11434/api/tags",
      expect.anything()
    );
  });

  it("should use /models endpoint for openai provider", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("{}", { status: 200 })
    );

    await checkLLMHealth({
      provider: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: "sk-key",
      model: "gpt-4o-mini",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/models",
      expect.objectContaining({
        headers: { Authorization: "Bearer sk-key" },
      })
    );
  });

  it("should include auth header when API key is set", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("{}", { status: 200 })
    );

    await checkLLMHealth({
      provider: "openai-compatible",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: "gsk-key",
      model: "mixtral",
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/models",
      expect.objectContaining({
        headers: { Authorization: "Bearer gsk-key" },
      })
    );
  });

  it("should return error on HTTP failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("", { status: 500 })
    );

    const result = await checkLLMHealth({
      provider: "ollama",
      baseURL: "http://localhost:11434/v1",
      model: "test",
    });

    expect(result).toEqual({ ok: false, error: "HTTP 500" });
  });

  it("should return error on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Connection refused")
    );

    const result = await checkLLMHealth({
      provider: "ollama",
      baseURL: "http://localhost:11434/v1",
      model: "test",
    });

    expect(result).toEqual({ ok: false, error: "Connection refused" });
  });

  it("should handle non-Error thrown values", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce("timeout");

    const result = await checkLLMHealth({
      provider: "ollama",
      baseURL: "http://localhost:11434/v1",
      model: "test",
    });

    expect(result).toEqual({ ok: false, error: "timeout" });
  });
});
