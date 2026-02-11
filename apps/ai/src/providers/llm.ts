/**
 * Pluggable LLM provider abstraction
 *
 * Supports three tiers:
 * 1. Local (Ollama) — free, bundled small model
 * 2. Local power user — bigger Ollama model
 * 3. Cloud (OpenAI-compatible) — any OpenAI-compatible API (OpenAI, Groq, etc.)
 *
 * All providers use the Vercel AI SDK's unified interface,
 * so the rest of the codebase doesn't care which backend is active.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export type LLMProvider = "ollama" | "openai" | "openai-compatible";

export interface LLMConfig {
  provider: LLMProvider;
  baseURL: string;
  apiKey?: string;
  model: string;
}

/**
 * Read LLM configuration from environment variables
 */
export function getLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER || "ollama") as LLMProvider;
  const model = process.env.LLM_MODEL || "qwen2.5:1.5b";

  switch (provider) {
    case "ollama":
      return {
        provider,
        baseURL: process.env.LLM_URL || "http://localhost:11434/v1",
        model,
      };
    case "openai":
      return {
        provider,
        baseURL: process.env.LLM_URL || "https://api.openai.com/v1",
        apiKey: process.env.LLM_API_KEY,
        model: process.env.LLM_MODEL || "gpt-4o-mini",
      };
    case "openai-compatible":
      return {
        provider,
        baseURL: process.env.LLM_URL || "",
        apiKey: process.env.LLM_API_KEY,
        model,
      };
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

/**
 * Create a Vercel AI SDK language model from config
 *
 * Returns a model instance that works with generateText/streamText
 * regardless of backend.
 */
export function createModel(config?: LLMConfig) {
  const cfg = config ?? getLLMConfig();

  switch (cfg.provider) {
    case "ollama": {
      // Ollama exposes an OpenAI-compatible API at /v1
      const ollama = createOpenAICompatible({
        name: "ollama",
        baseURL: cfg.baseURL,
        // Ollama doesn't need an API key
      });
      return ollama(cfg.model);
    }
    case "openai": {
      const openai = createOpenAI({
        baseURL: cfg.baseURL,
        apiKey: cfg.apiKey,
      });
      return openai(cfg.model);
    }
    case "openai-compatible": {
      const provider = createOpenAICompatible({
        name: "custom",
        baseURL: cfg.baseURL,
        apiKey: cfg.apiKey,
      });
      return provider(cfg.model);
    }
    default:
      throw new Error(`Unknown LLM provider: ${cfg.provider}`);
  }
}

/**
 * Check if the LLM backend is reachable
 */
export async function checkLLMHealth(
  config?: LLMConfig
): Promise<{ ok: boolean; error?: string }> {
  const cfg = config ?? getLLMConfig();

  try {
    // For Ollama, check the /api/tags endpoint (model list)
    // For OpenAI-compatible, check /models
    const healthURL =
      cfg.provider === "ollama"
        ? cfg.baseURL.replace(/\/v1$/, "/api/tags")
        : `${cfg.baseURL}/models`;

    const response = await fetch(healthURL, {
      signal: AbortSignal.timeout(5000),
      headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
