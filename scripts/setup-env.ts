#!/usr/bin/env bun
/**
 * Setup script to generate .env file with required variables
 *
 * Usage:
 *   bun scripts/setup-env.ts           # Interactive setup
 *   bun scripts/setup-env.ts --docker  # Setup for Docker deployment
 */

import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");
const envPath = join(projectRoot, ".env");
const envExamplePath = join(projectRoot, ".env.example");

// Generate a random base64 string
function generateSecret(bytes = 32): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString("base64");
}

// Generate a URL-safe random string (no special chars)
function generatePassword(bytes = 16): string {
  return generateSecret(bytes).replaceAll(/[+/=]/g, "");
}

interface VarConfig {
  description: string;
  defaultValue?: string;
  generate?: () => string;
  docker?: () => string;
  dockerOnly?: boolean;
}

// Required variables and their generators
const REQUIRED_VARS: Record<string, VarConfig> = {
  DATABASE_URL: {
    description: "PostgreSQL connection string",
    defaultValue: "postgresql://vamsa:password@localhost:5432/vamsa",
    docker: () =>
      "postgresql://${DB_USER:-vamsa}:${DB_PASSWORD}@db:5432/${DB_NAME:-vamsa}",
  },
  BETTER_AUTH_SECRET: {
    description: "Auth encryption key (32+ chars)",
    generate: () => generateSecret(32),
  },
  BETTER_AUTH_URL: {
    description: "App URL for auth",
    defaultValue: "http://localhost:3000",
  },
  DB_PASSWORD: {
    description: "PostgreSQL password",
    generate: () => generatePassword(16),
    dockerOnly: true,
  },
};

function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function isEmptyValue(value: string | undefined): boolean {
  return (
    !value ||
    value === "" ||
    value.includes("your-") ||
    value.includes("change-in-production")
  );
}

function resolveValue(
  config: VarConfig,
  isDocker: boolean
): { value: string; source: string } | null {
  if (config.generate) {
    return { value: config.generate(), source: "Generated" };
  }
  if (isDocker && config.docker) {
    return { value: config.docker(), source: "Set (Docker mode)" };
  }
  if (config.defaultValue) {
    return { value: config.defaultValue, source: "Set to default" };
  }
  return null;
}

function formatEnvLine(key: string, value: string): string {
  const needsQuotes =
    value.includes(" ") || value.includes("$") || value.includes("#");
  return needsQuotes ? `${key}="${value}"` : `${key}=${value}`;
}

function updateContent(
  baseContent: string,
  env: Record<string, string>
): string {
  let content = baseContent;

  for (const [key, value] of Object.entries(env)) {
    const pattern = new RegExp(`^${key}=.*$`, "m");
    const newLine = formatEnvLine(key, value);

    if (pattern.test(content)) {
      content = content.replace(pattern, newLine);
    } else {
      content += `\n${newLine}`;
    }
  }

  return content.trim() + "\n";
}

// --- Main script ---

const isDocker = Bun.argv.includes("--docker");
const isForce = Bun.argv.includes("--force");

console.log("🔧 Vamsa Environment Setup\n");

const envFile = Bun.file(envPath);
const envExampleFile = Bun.file(envExamplePath);

// Load existing .env or .env.example
let env: Record<string, string> = {};
let baseContent = "";

if ((await envFile.exists()) && !isForce) {
  console.log("📄 Found existing .env file, updating missing values...\n");
  baseContent = await envFile.text();
  env = parseEnvFile(baseContent);
} else if (await envExampleFile.exists()) {
  console.log("📄 Creating .env from .env.example...\n");
  baseContent = await envExampleFile.text();
  env = parseEnvFile(baseContent);
}

let updated = false;

for (const [key, config] of Object.entries(REQUIRED_VARS)) {
  if (config.dockerOnly && !isDocker) continue;

  if (isEmptyValue(env[key])) {
    const resolved = resolveValue(config, isDocker);
    if (resolved) {
      env[key] = resolved.value;
      console.log(`✅ ${resolved.source} ${key}`);
      updated = true;
    } else {
      console.log(`⚠️  ${key} needs to be set manually: ${config.description}`);
    }
  } else {
    console.log(`⏭️  ${key} already set`);
  }
}

if (updated) {
  const content = updateContent(baseContent, env);
  await Bun.write(envPath, content);
  console.log(`\n✅ Wrote ${envPath}`);
} else {
  console.log("\n✅ All required variables are set");
}

if (isDocker) {
  console.log(
    "\n📦 Docker mode: Run 'bun run docker:build' to build the image"
  );
} else {
  console.log("\n🚀 Run 'bun run dev' to start the development server");
}
