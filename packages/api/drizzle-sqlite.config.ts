import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import path from "node:path";

// Load .env from monorepo root
config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});

export default defineConfig({
  schema: "./src/drizzle/schema-sqlite/index.ts",
  out: "./drizzle-sqlite",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "./vamsa.db",
  },
  verbose: true,
  strict: true,
});
