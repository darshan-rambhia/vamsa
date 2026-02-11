import { createMiddleware } from "hono/factory";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.api;

/**
 * List of known AI scraper and bot User-Agent patterns
 * These bots are commonly used to scrape content for training or indexing
 */
const AI_BOT_PATTERNS = [
  // OpenAI GPT-based bots
  /GPTBot/i,
  /ChatGPT-User/i,
  /OAI-SearchBot/i,
  // Anthropic Claude bots
  /ClaudeBot/i,
  /Claude-Web/i,
  /Claude-Web-Crawler/i,
  // Other AI companies
  /Google-Extended/i,
  /Bytespider/i,
  /Amazonbot/i,
  /FacebookBot/i,
  /Meta-ExternalAgent/i,
  /PerplexityBot/i,
  /Applebot-Extended/i,
  /cohere-ai/i,
  /Diffbot/i,
  /YouBot/i,
  /CCBot/i,
  /anthropic-ai/i,
  // General search/crawl bots that might scrape AI training data
  /MJ12bot/i,
  /SemrushBot/i,
  /SemrushBot-SA/i,
  /Yandex/i,
  /AhrefsBot/i,
  /SiteAuditBot/i,
];

/**
 * Hono middleware for blocking known AI scrapers and bots
 *
 * This middleware detects and blocks requests from known AI training bots
 * and content scrapers. Since Vamsa is a private family genealogy app,
 * all meaningful content is behind authentication, and public access
 * should not be indexed or scraped.
 *
 * Features:
 * - Matches User-Agent header against known AI bot patterns
 * - Returns 403 Forbidden for matched bots
 * - Allows /health and /robots.txt endpoints (for monitoring and bots themselves)
 * - Configurable via BOT_GUARD_ENABLED environment variable
 * - Default: enabled in production, disabled in development
 * - Logs blocked requests for security monitoring
 *
 * @example
 * // In server/index.ts:
 * import { botGuardMiddleware } from "./middleware/bot-guard";
 *
 * app.use("*", botGuardMiddleware);
 */
export const botGuardMiddleware = createMiddleware(async (c, next) => {
  // Check if bot guard is enabled
  // Default: true in production, false in development
  const isProduction = process.env.NODE_ENV === "production";
  const botGuardEnabled =
    process.env.BOT_GUARD_ENABLED !== "false" &&
    (process.env.BOT_GUARD_ENABLED === "true" || isProduction);

  if (!botGuardEnabled) {
    await next();
    return;
  }

  // Allow monitoring and bot endpoints to bypass bot guard
  const path = c.req.path;
  if (path === "/health" || path === "/robots.txt") {
    await next();
    return;
  }

  // Get User-Agent header
  const userAgent = c.req.header("user-agent") || "";

  // Check if User-Agent matches any AI bot pattern
  const isBot = AI_BOT_PATTERNS.some((pattern) => pattern.test(userAgent));

  if (isBot) {
    // Extract bot name from User-Agent for logging (first 100 chars)
    const botIdentifier = userAgent.substring(0, 100);
    log.warn(
      {
        path,
        userAgent: botIdentifier,
        type: "bot_blocked",
      },
      "Bot traffic blocked"
    );

    return c.json(
      {
        error: "Forbidden",
        message: "Bot traffic not allowed",
      },
      403
    );
  }

  // Not a bot, allow request to proceed
  await next();
});
