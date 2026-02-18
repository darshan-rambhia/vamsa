/**
 * Vite preview plugin for Vamsa
 *
 * Mounts the full Hono middleware stack into `vite preview` so that
 * preview mode runs with SSR, auth, API routes, and all security middleware —
 * not just static file serving.
 *
 * Usage: Add to vite.config.ts plugins array. Only activates in preview mode.
 *
 * IMPORTANT: All server module imports use runtime-computed paths to prevent
 * esbuild (Vite's config bundler) from following the import chain at config
 * bundle time. These modules are only loaded at runtime during `vite preview`.
 */

import path from "node:path";

import type { Plugin } from "vite";

/**
 * Resolve a module path relative to this file's directory at runtime.
 * Using path.join() prevents esbuild from statically analyzing the import.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function runtimeImport(specifier: string): Promise<any> {
  return import(specifier);
}

export function vamsaPreviewPlugin(): Plugin {
  let honoFetch: ((req: Request) => Response | Promise<Response>) | null = null;
  let initPromise: Promise<void> | null = null;

  async function initialize() {
    const serverDir = path.dirname(new URL(import.meta.url).pathname);
    const webDir = path.dirname(serverDir);

    // Runtime-computed paths prevent esbuild from bundling these at config time
    const libServer = "@vamsa/lib/server";
    const appPath = path.join(serverDir, "app");
    const ssrHandlerPath = path.join(webDir, "dist/server/server.js");

    const { initializeServerI18n } = await runtimeImport(libServer);
    const { createHonoApp } = await runtimeImport(appPath);

    // Initialize i18n
    try {
      await initializeServerI18n();
    } catch {
      // Continue with defaults
    }

    // Rate limiting defaults to in-memory store (no explicit init needed)

    // Load TanStack Start handler from the build output
    type FetchHandler = (request: Request) => Promise<Response>;
    interface TanStackHandler {
      default?: { fetch?: FetchHandler };
      fetch?: FetchHandler;
    }

    const handler = (await runtimeImport(
      ssrHandlerPath
    )) as unknown as TanStackHandler;
    const tanstackFetch = handler.default?.fetch ?? handler.fetch;

    if (!tanstackFetch) {
      throw new Error(
        "Could not find fetch handler in TanStack Start build. Run `bun run build` first."
      );
    }

    // Create the Hono app
    const app = await createHonoApp({
      tanstackFetch,
      isProduction: false,
    });

    honoFetch = app.fetch.bind(app);
  }

  return {
    name: "vamsa-preview",

    configurePreviewServer(server) {
      // Return a function to run AFTER Vite's built-in middleware
      return () => {
        server.middlewares.use(async (req, res, next) => {
          // Lazy initialization on first request
          if (!initPromise) {
            initPromise = initialize().catch((err) => {
              console.error("[vamsa-preview] Failed to initialize:", err);
              initPromise = null; // Allow retry
              throw err;
            });
          }

          try {
            await initPromise;
          } catch {
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ error: "Preview server initializing..." })
            );
            return;
          }

          if (!honoFetch) {
            return next();
          }

          try {
            // Convert Node IncomingMessage to Web Request
            const protocol =
              (req.headers["x-forwarded-proto"] as string) || "http";
            const host = req.headers.host || "localhost:4173";
            const url = `${protocol}://${host}${req.url || "/"}`;

            // Read body for non-GET requests
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

            // Build headers
            const headers: Record<string, string> = {};
            for (const [key, value] of Object.entries(req.headers)) {
              if (typeof value === "string") {
                headers[key] = value;
              } else if (Array.isArray(value)) {
                headers[key] = value.join(", ");
              }
            }

            const webRequest = new Request(url, {
              method: req.method,
              headers,
              body,
              // @ts-expect-error - duplex is required for streaming bodies
              duplex: body ? "half" : undefined,
            });

            // Call Hono
            const response = await honoFetch(webRequest);

            // Convert Web Response to Node response
            res.statusCode = response.status;
            response.headers.forEach((value, key) => {
              res.setHeader(key, value);
            });

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
            console.error("[vamsa-preview] Request error:", error);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: "Internal Server Error",
                  message:
                    error instanceof Error ? error.message : String(error),
                })
              );
            }
          }
        });
      };
    },
  };
}
