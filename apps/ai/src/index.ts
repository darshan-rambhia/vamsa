/**
 * Vamsa AI Service — Server entry point
 *
 * Starts the Bun HTTP server using the Hono app.
 * See app.ts for route definitions.
 */

import app from "./app";
import { getLLMConfig } from "./providers/llm";

const PORT = parseInt(process.env.AI_PORT || "3100", 10);
const HOST = process.env.AI_HOST || "0.0.0.0";

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  fetch: app.fetch,
  development: process.env.NODE_ENV !== "production",
  error(error: Error) {
    console.error("Server error:", error.message);
    return new Response("Internal Server Error", { status: 500 });
  },
});

const config = getLLMConfig();
console.log(`Vamsa AI service listening on http://${HOST}:${PORT}`);
console.log(`  LLM: ${config.provider} / ${config.model}`);
console.log(`  Tool mode: ${process.env.TOOL_MODE || "direct"}`);
console.log(`  Health: http://${HOST}:${PORT}/healthz`);

export default app;
export { server };
