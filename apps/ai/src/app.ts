/**
 * Vamsa AI Service — Hono application
 *
 * HTTP routes for AI requests from the main Vamsa app.
 * Separated from index.ts to allow testing without server side effects.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod/v4";
import { runChatAgent } from "./agents/chat-agent";
import { runStoryAgent } from "./agents/story-agent";
import { runSuggestAgent } from "./agents/suggest-agent";
import { checkLLMHealth, getLLMConfig } from "./providers/llm";
import { chatTools } from "./tools";
import type { SuggestRequest } from "./agents/suggest-agent";
import type { StoryRequest } from "./agents/story-agent";
import type { ChatRequest } from "./agents/chat-agent";

const app = new Hono();

// ============================================
// Middleware
// ============================================

// CORS — allow requests from the main Vamsa app
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

// Optional API key authentication
app.use("/v1/*", async (c, next) => {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    // No key configured — allow all requests (single-user local mode)
    return next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return next();
});

// ============================================
// Health Check
// ============================================

app.get("/healthz", async (c) => {
  const config = getLLMConfig();
  const llmHealth = await checkLLMHealth(config);

  return c.json({
    status: llmHealth.ok ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    llm: {
      provider: config.provider,
      model: config.model,
      reachable: llmHealth.ok,
      ...(llmHealth.error ? { error: llmHealth.error } : {}),
    },
  });
});

// ============================================
// Configuration
// ============================================

app.get("/v1/config", (c) => {
  const config = getLLMConfig();

  return c.json({
    provider: config.provider,
    model: config.model,
    features: ["chat", "story", "suggest"],
    tools: Object.keys(chatTools),
    toolMode: process.env.TOOL_MODE || "direct",
    streaming: true,
  });
});

// ============================================
// Chat Endpoint (Streaming)
// ============================================

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  context: z
    .object({
      currentPersonId: z.string().optional(),
      currentPersonName: z.string().optional(),
      currentView: z.string().optional(),
    })
    .optional(),
});

app.post("/v1/chat", async (c) => {
  const body = await c.req.json();
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.issues },
      400
    );
  }

  const request: ChatRequest = parsed.data;

  try {
    const result = runChatAgent(request);

    // Return AI SDK's text stream response (SSE format)
    return result.toTextStreamResponse();
  } catch (error) {
    return c.json(
      {
        error: "Chat failed",
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// ============================================
// Story Endpoint (Non-streaming)
// ============================================

export const storyRequestSchema = z.object({
  personId: z.string().min(1),
  personName: z.string().optional(),
  style: z.enum(["formal", "casual", "documentary"]).optional(),
  maxWords: z.number().int().min(50).max(1000).optional(),
});

app.post("/v1/story", async (c) => {
  const body = await c.req.json();
  const parsed = storyRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.issues },
      400
    );
  }

  const request: StoryRequest = parsed.data;

  try {
    const result = await runStoryAgent(request);
    return c.json(result);
  } catch (error) {
    return c.json(
      {
        error: "Story generation failed",
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// ============================================
// Suggest Endpoint (Non-streaming)
// ============================================

export const suggestRequestSchema = z.object({
  personId: z.string().min(1),
  personName: z.string().optional(),
});

app.post("/v1/suggest", async (c) => {
  const body = await c.req.json();
  const parsed = suggestRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.issues },
      400
    );
  }

  const request: SuggestRequest = parsed.data;

  try {
    const result = await runSuggestAgent(request);
    return c.json(result);
  } catch (error) {
    return c.json(
      {
        error: "Suggestion generation failed",
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

// ============================================
// 404 handler
// ============================================

app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
      message: `No endpoint at ${c.req.path}`,
      available: [
        "/healthz",
        "/v1/config",
        "/v1/chat",
        "/v1/story",
        "/v1/suggest",
      ],
    },
    404
  );
});

export default app;
