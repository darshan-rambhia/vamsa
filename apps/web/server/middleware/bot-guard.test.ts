import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { botGuardMiddleware } from "./bot-guard";

import type { Context, Next } from "hono";

// Mock the logger to avoid logging during tests
vi.mock("@vamsa/lib/logger", () => ({
  loggers: {
    api: {
      warn: vi.fn(),
    },
  },
}));

describe("botGuardMiddleware", () => {
  let mockContext: Context;
  let mockNext: ReturnType<typeof vi.fn>;
  let userAgent: string;
  const originalEnv = process.env;

  beforeEach(() => {
    // Enable bot guard for tests
    process.env.BOT_GUARD_ENABLED = "true";
    vi.clearAllMocks();

    mockNext = vi.fn(async () => {});

    userAgent = "";

    mockContext = {
      req: {
        header: ((name: string) => {
          if (name === "user-agent") {
            return userAgent;
          }
          return undefined;
        }) as any,
        path: "/",
      },
      json: vi.fn((data: unknown, status?: number) => ({
        status: status || 200,
        data,
      })),
      header: vi.fn(),
    } as unknown as Context;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("bot detection", () => {
    it("should block GPTBot", async () => {
      userAgent = "Mozilla/5.0 (compatible; GPTBot/1.0)";
      mockContext.req.path = "/api/people";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: "Forbidden",
          message: "Bot traffic not allowed",
        },
        403
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should block ChatGPT-User", async () => {
      userAgent = "ChatGPT-User/1.0";
      mockContext.req.path = "/people";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: "Forbidden",
          message: "Bot traffic not allowed",
        },
        403
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should block ClaudeBot", async () => {
      userAgent = "Mozilla/5.0 (compatible; ClaudeBot/1.0)";
      mockContext.req.path = "/";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: "Forbidden",
          message: "Bot traffic not allowed",
        },
        403
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should block Claude-Web", async () => {
      userAgent = "Claude-Web/1.0";
      mockContext.req.path = "/genealogy";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: "Forbidden",
          message: "Bot traffic not allowed",
        },
        403
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should block Google-Extended", async () => {
      userAgent = "Mozilla/5.0 (compatible; Google-Extended/1.0)";
      mockContext.req.path = "/api/data";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should block Amazonbot", async () => {
      userAgent = "Amazonbot/1.0";
      mockContext.req.path = "/";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should block PerplexityBot", async () => {
      userAgent = "PerplexityBot/1.0";
      mockContext.req.path = "/";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should allow normal browser User-Agents", async () => {
      userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
      mockContext.req.path = "/";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow Chrome browser", async () => {
      userAgent =
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
      mockContext.req.path = "/genealogy";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow Safari browser", async () => {
      userAgent =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15";
      mockContext.req.path = "/people";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow empty User-Agent", async () => {
      userAgent = "";
      mockContext.req.path = "/";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle case-insensitive bot matching", async () => {
      userAgent = "mozilla/5.0 (compatible; gptbot/1.0)";
      mockContext.req.path = "/";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("endpoint bypasses", () => {
    it("should allow /health endpoint regardless of User-Agent", async () => {
      userAgent = "Mozilla/5.0 (compatible; GPTBot/1.0)";
      mockContext.req.path = "/health";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow /robots.txt endpoint regardless of User-Agent", async () => {
      userAgent = "Mozilla/5.0 (compatible; ClaudeBot/1.0)";
      mockContext.req.path = "/robots.txt";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should block /api/robots.txt if it's not exact match", async () => {
      userAgent = "Mozilla/5.0 (compatible; GPTBot/1.0)";
      mockContext.req.path = "/api/robots.txt";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("BOT_GUARD_ENABLED environment variable", () => {
    it("should respect BOT_GUARD_ENABLED=true", async () => {
      process.env.BOT_GUARD_ENABLED = "true";
      userAgent = "Mozilla/5.0 (compatible; GPTBot/1.0)";
      mockContext.req.path = "/api/data";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();

      delete process.env.BOT_GUARD_ENABLED;
    });

    it("should respect BOT_GUARD_ENABLED=false", async () => {
      process.env.BOT_GUARD_ENABLED = "false";
      userAgent = "Mozilla/5.0 (compatible; GPTBot/1.0)";
      mockContext.req.path = "/api/data";

      await botGuardMiddleware(mockContext, mockNext as Next);

      expect(mockContext.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();

      delete process.env.BOT_GUARD_ENABLED;
    });
  });
});
