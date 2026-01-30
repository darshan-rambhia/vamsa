/**
 * Development server plugin for Vamsa
 *
 * This Vite plugin adds API routes during development to achieve dev/prod parity.
 * It intercepts requests to /api/* and handles them with Hono.
 *
 * Usage: Import this plugin in vite.config.ts
 */

import type { Plugin, ViteDevServer } from "vite";

// Logger is loaded dynamically to avoid Node.js ESM issues with .ts files
// when Vite loads this config
let log: {
  info: (ctx: Record<string, unknown>, msg: string) => void;
  withErr: (err: unknown) => {
    ctx: (c: Record<string, unknown>) => { msg: (m: string) => void };
    msg: (m: string) => void;
  };
} | null = null;

async function getLogger() {
  if (!log) {
    const { loggers } = await import("@vamsa/lib/logger");
    log = loggers.api;
  }
  return log;
}

/**
 * Vite plugin that adds API routes during development
 *
 * API routes are lazy-loaded to avoid module resolution issues
 * at Vite config time.
 */
export function vamsaDevApiPlugin(): Plugin {
  let apiApp: { fetch: (req: Request) => Response | Promise<Response> } | null =
    null;
  let initPromise: Promise<void> | null = null;

  async function initializeApi(server: ViteDevServer) {
    if (apiApp) return;

    const log = await getLogger();

    // Use Vite's module loader to import API dependencies
    // This ensures proper resolution of workspace packages
    const { Hono } = await import("hono");
    const { logger: honoLogger } = await import("hono/logger");
    const { cors } = await import("hono/cors");

    const app = new Hono();

    // Request logging in dev
    app.use("*", honoLogger());

    // CORS - allow all in development
    app.use(
      "*",
      cors({
        origin: "*",
        credentials: true,
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      })
    );

    // Health check endpoint
    app.get("/health", (c) => {
      return c.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        mode: "development",
        uptime: process.uptime(),
      });
    });

    // Better Auth handler is mounted in the middleware above
    // (before body consumption to avoid JSON parsing errors)

    // Import and mount API routes using Vite's ssrLoadModule
    // This properly resolves workspace packages
    try {
      const apiModule = await server.ssrLoadModule("./server/api/index.ts");
      const apiV1 = apiModule.default;

      const apiRouter = new Hono();

      // API version endpoint
      apiRouter.get("/version", (c) =>
        c.json({ version: "1.0.0", runtime: "bun", mode: "development" })
      );

      // Mount v1 API under /api/v1
      apiRouter.route("/v1", apiV1);

      // Root API endpoint lists available versions
      apiRouter.get("/", (c) =>
        c.json({
          api: "Vamsa API (Development)",
          versions: {
            v1: "/api/v1",
          },
          docs: "/api/v1/docs",
        })
      );

      app.route("/api", apiRouter);

      log.info({}, "Development API routes initialized");
      log.info({}, "  API:     http://localhost:3000/api");
      log.info({}, "  Docs:    http://localhost:3000/api/v1/docs");
      log.info({}, "  OpenAPI: http://localhost:3000/api/v1/openapi.json");
    } catch (error) {
      log.withErr(error).msg("Failed to load API routes");
      // Add a fallback error route
      app.all("/api/*", (c) =>
        c.json(
          {
            error: "API routes failed to load",
            message: error instanceof Error ? error.message : String(error),
          },
          503
        )
      );
    }

    apiApp = app;
  }

  return {
    name: "vamsa-dev-api",
    apply: "serve", // Only apply in dev mode

    configureServer(server: ViteDevServer) {
      // Add middleware to handle API requests
      // This runs BEFORE Vite's default middleware
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        const log = await getLogger();

        // Only handle /api/* and /health requests
        if (!url.startsWith("/api") && !url.startsWith("/health")) {
          return next();
        }

        // Initialize API on first request (lazy loading)
        if (!initPromise) {
          initPromise = initializeApi(server);
        }
        await initPromise;

        // Handle Better Auth requests separately to avoid body consumption issues
        if (url.startsWith("/api/auth")) {
          try {
            const authModule = await server.ssrLoadModule(
              "@vamsa/lib/server/business"
            );
            const { auth } = authModule;

            // Create a native Request from the Node.js IncomingMessage
            // Use Bun's built-in Request handling which properly streams the body
            const protocol =
              (req.headers["x-forwarded-proto"] as string) || "http";
            const host = req.headers.host || "localhost:3000";
            const fullUrl = `${protocol}://${host}${url}`;

            // Read body for POST requests
            let bodyText: string | undefined;
            if (req.method !== "GET" && req.method !== "HEAD") {
              const chunks: Array<Buffer> = [];
              for await (const chunk of req) {
                chunks.push(chunk as Buffer);
              }
              if (chunks.length > 0) {
                bodyText = Buffer.concat(chunks).toString("utf-8");
              }
            }

            log.info(
              { url, method: req.method, bodyText },
              "Better Auth request"
            );

            // Create a minimal headers object
            const headers = new Headers();
            if (req.headers["content-type"]) {
              headers.set("content-type", req.headers["content-type"]);
            }
            if (req.headers["cookie"]) {
              headers.set("cookie", req.headers["cookie"]);
            }
            if (req.headers["origin"]) {
              headers.set("origin", req.headers["origin"]);
            }

            const request = new Request(fullUrl, {
              method: req.method,
              headers,
              body: bodyText,
            });

            // Call Better Auth handler
            const response = await auth.handler(request);

            // Get response body
            const responseBody = await response.text();
            log.info(
              {
                status: response.status,
                responseBody: responseBody.substring(0, 500),
              },
              "Better Auth response"
            );

            // Send response
            res.statusCode = response.status;
            response.headers.forEach((value: string, key: string) => {
              res.setHeader(key, value);
            });
            res.end(responseBody);
            return;
          } catch (error) {
            log.withErr(error).ctx({ url }).msg("Better Auth handler error");
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Internal Server Error",
                message: error instanceof Error ? error.message : String(error),
              })
            );
            return;
          }
        }

        if (!apiApp) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "API not initialized" }));
          return;
        }

        try {
          // Convert Node.js request to Web Request
          const protocol =
            (req.headers["x-forwarded-proto"] as string) || "http";
          const host = req.headers.host || "localhost:3000";
          const fullUrl = `${protocol}://${host}${url}`;

          // Read the body if present
          let body: BodyInit | undefined;
          if (req.method !== "GET" && req.method !== "HEAD") {
            const chunks: Array<Buffer> = [];
            for await (const chunk of req) {
              chunks.push(chunk as Buffer);
            }
            if (chunks.length > 0) {
              body = Buffer.concat(chunks);
            }
          }

          // Create Web Request
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === "string") {
              headers[key] = value;
            } else if (Array.isArray(value)) {
              headers[key] = value.join(", ");
            }
          }

          const request = new Request(fullUrl, {
            method: req.method,
            headers,
            body,
            // @ts-expect-error - duplex is required for streaming bodies
            duplex: body ? "half" : undefined,
          });

          // Call Hono's fetch handler
          const response = await apiApp.fetch(request);

          // Convert Web Response to Node.js response
          res.statusCode = response.status;

          // Set headers
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          // Send body
          if (response.body) {
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (error) {
          log.withErr(error).msg("API request error");
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Internal Server Error",
              message: error instanceof Error ? error.message : String(error),
            })
          );
        }
      });
    },
  };
}

export default vamsaDevApiPlugin;
