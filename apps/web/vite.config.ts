import path from "node:path";
import * as crypto from "node:crypto";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { config } from "dotenv";
import { vamsaDevApiPlugin } from "./server/dev";
import type { Plugin } from "vite";

/**
 * Vite plugin to stub out server-only modules for client builds.
 * This prevents "Failed to resolve module specifier" errors in the browser
 * when server code accidentally references server-only modules.
 *
 * Only stubs modules that are purely server-side and have no client purpose:
 * - i18next-fs-backend: Filesystem backend for i18n (server-only)
 * - pg/pg-pool/pgpass/pg-native: PostgreSQL drivers (server-only)
 * - drizzle-orm/node-postgres: Drizzle pg driver (imports pg which uses Buffer)
 * - react-dom/server: SSR renderer leaked via TanStack Start import chain
 *
 * Does NOT stub:
 * - drizzle-orm (base): Schema definitions may be needed for types
 * - archiver/arctic/bcryptjs/node-cron/sharp: May cause build issues if stubbed
 */
function serverOnlyStubPlugin(): Plugin {
  // Module stubs with their required exports
  // Each stub provides the minimum exports needed to satisfy import statements
  const moduleStubs: Record<string, string> = {
    // i18next-fs-backend exports a default Backend class
    "i18next-fs-backend": `
      class Backend { init() {} read() {} }
      export default Backend;
    `,
    // pg exports Pool class and types
    pg: `
      export class Pool {
        constructor() {}
        connect() { return Promise.resolve(); }
        query() { return Promise.resolve({ rows: [] }); }
        end() { return Promise.resolve(); }
        on() {}
        get totalCount() { return 0; }
        get idleCount() { return 0; }
        get waitingCount() { return 0; }
      }
      export class Client {
        constructor() {}
        connect() { return Promise.resolve(); }
        query() { return Promise.resolve({ rows: [] }); }
        end() { return Promise.resolve(); }
      }
      export default { Pool, Client };
    `,
    // pg-pool is just the Pool class
    "pg-pool": `
      export default class Pool {
        constructor() {}
        connect() { return Promise.resolve(); }
        query() { return Promise.resolve({ rows: [] }); }
        end() { return Promise.resolve(); }
        on() {}
      }
    `,
    // pgpass and pg-native are optional and rarely used directly
    pgpass: `export default {};`,
    "pg-native": `export default {};`,
    // drizzle-orm/node-postgres imports pg which uses Buffer (Node.js only)
    // Must also be in optimizeDeps.exclude to prevent esbuild pre-bundling
    "drizzle-orm/node-postgres": `
      export function drizzle() { return {}; }
      export default { drizzle };
    `,
    // Node.js built-in modules that leak to client via TanStack Router SSR code.
    // In dev mode, Vite wraps these in a proxy that throws "externalized for browser
    // compatibility". We stub them with browser-native equivalents or no-ops.
    "node:stream/web": `
      export const ReadableStream = globalThis.ReadableStream;
      export const WritableStream = globalThis.WritableStream;
      export const TransformStream = globalThis.TransformStream;
      export default { ReadableStream, WritableStream, TransformStream };
    `,
    "node:stream": `
      export class Readable { on() { return this; } pipe() { return this; } destroy() {} }
      export class Writable { on() { return this; } write() {} end() {} destroy() {} }
      export class Transform extends Readable { push() {} }
      export class PassThrough extends Transform {}
      export default { Readable, Writable, Transform, PassThrough };
    `,
    "node:async_hooks": `
      export class AsyncLocalStorage { getStore() { return undefined; } run(store, fn) { return fn(); } }
      export default { AsyncLocalStorage };
    `,
    // react-dom/server leaks to client via TanStack Start's incomplete tree-shaking
    // of server function files that import middleware with getCookie
    "react-dom/server": `
      const noop = () => { throw new Error("react-dom/server should not be called on the client"); };
      export default { renderToString: noop, renderToReadableStream: noop, renderToPipeableStream: noop };
      export const renderToString = noop;
      export const renderToReadableStream = noop;
      export const renderToPipeableStream = noop;
    `,
  };

  const serverOnlyModules = Object.keys(moduleStubs);

  return {
    name: "server-only-stub",
    enforce: "pre",
    resolveId(id, importer, options) {
      // Only apply to client builds (not SSR)
      if (options.ssr) return null;

      // Check if this is a server-only module
      if (serverOnlyModules.includes(id)) {
        // Return a virtual module that will be handled by load()
        return `\0server-stub:${id}`;
      }
      return null;
    },
    load(id) {
      // Handle virtual server-only stubs
      if (id.startsWith("\0server-stub:")) {
        const moduleName = id.replace("\0server-stub:", "");
        return moduleStubs[moduleName] || `export default {};`;
      }
      return null;
    },
  };
}

// Load .env from monorepo root for server-side code (Drizzle, Better Auth, etc.)
config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});

export default defineConfig({
  // Load .env from monorepo root
  envDir: path.resolve(__dirname, "../.."),
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@vamsa/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@vamsa/api": path.resolve(__dirname, "../../packages/api"),
      "@vamsa/lib": path.resolve(__dirname, "../../packages/lib/src"),
      "@vamsa/schemas": path.resolve(__dirname, "../../packages/schemas/src"),
      // Use react-native-svg-web for web builds
      "react-native-svg": "react-native-svg-web",
    },
  },
  optimizeDeps: {
    exclude: [
      "react-native",
      // Prevent esbuild from pre-bundling server-only pg modules.
      // Without this, esbuild inlines pg/postgres-bytea (which use Buffer)
      // into a single client-side file, bypassing our stub plugin.
      "drizzle-orm/node-postgres",
      "pg",
      "pg-pool",
    ],
  },
  ssr: {
    external: [
      // Server-only dependencies that shouldn't be bundled into SSR
      "archiver",
      "arctic",
      "bcryptjs",
      // Note: i18next is NOT external - it needs to be bundled for both SSR and client
      // to ensure the hydration matches. Only i18next-fs-backend is server-only.
      "i18next-fs-backend",
      "node-cron",
      // pg-native is an optional native addon that pg tries to import
      "pg-native",
      // sharp is a native image processing library that must not be bundled
      "sharp",
    ],
    // Note: Do NOT add drizzle-orm/pg to ssr.external or @vamsa/* to noExternal.
    // drizzle-orm/pg must be bundled into the SSR output so the production server
    // doesn't need to resolve them from node_modules at runtime (which fails in Docker).
  },
  build: {
    rollupOptions: {
      external: [
        // Note: Server-only modules (drizzle-orm, pg, i18next-fs-backend, etc.)
        // are NOT externalized for client builds. Instead, they are stubbed
        // by the serverOnlyStubPlugin() to prevent browser errors.
        // They ARE externalized for SSR in ssr.external above.
        // Exclude react-native from web builds (react-native-svg-web provides web implementation)
        "react-native",
        // sharp is a native image processing library that must not be bundled
        "sharp",
        // Note: node:stream, node:stream/web, node:async_hooks are NOT externalized here.
        // They are handled by serverOnlyStubPlugin() which provides browser-compatible stubs.
      ],
    },
  },
  plugins: [
    // Stub server-only TanStack Start virtual modules for client environment.
    // The TanStack Start plugin registers these only for server (env.config.consumer === 'server'),
    // but vite:import-analysis still statically resolves the import() in client code.
    {
      name: "tanstack-start-virtual-module-stub",
      enforce: "pre",
      resolveId(id, _importer, options) {
        if (!options.ssr && id === "tanstack-start-injected-head-scripts:v") {
          return `\0client-stub:${id}`;
        }
        return null;
      },
      load(id) {
        if (id === "\0client-stub:tanstack-start-injected-head-scripts:v") {
          return "export const injectedHeadScripts = '';";
        }
        return null;
      },
    },
    // Stub server-only modules for client builds to prevent browser errors
    serverOnlyStubPlugin(),
    // Add API routes in dev mode for dev/prod parity
    vamsaDevApiPlugin(),
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      serverFns: {
        // Generate deterministic function IDs based on filename + functionName
        // This prevents cache invalidation issues between dev server restarts
        generateFunctionId: ({
          filename,
          functionName,
        }: {
          filename: string;
          functionName: string;
        }) => {
          // Normalize the filename to be relative to src/
          const normalizedPath = filename.replace(/^.*\/src\//, "src/");
          const input = `${normalizedPath}--${functionName}`;
          return crypto
            .createHash("sha1")
            .update(input)
            .digest("hex")
            .slice(0, 16);
        },
      },
    }),
    viteReact(),
  ],
});
