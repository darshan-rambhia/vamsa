#!/usr/bin/env bun
/**
 * Production Database Seed Script
 *
 * Creates minimal required data:
 * - Family settings
 * - Initial admin user from ADMIN_EMAIL/ADMIN_PASSWORD
 *
 * For development with test data, use seed-dev.ts instead.
 */

import { config } from "dotenv";
import path from "path";

// Load .env from monorepo root
config({ path: path.resolve(__dirname, "../../../../.env") });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "./password";
import { loggers } from "@vamsa/lib/logger";

const log = loggers.seed;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

async function main() {
  log.info({ script: "seed.ts" }, "Starting production database seed");

  const now = new Date();

  // Create family settings if not exists
  const existingSettings = await db
    .select()
    .from(schema.familySettings)
    .limit(1);

  if (existingSettings.length === 0) {
    await db.insert(schema.familySettings).values({
      id: crypto.randomUUID(),
      familyName: process.env.VITE_APP_NAME || "Our Family",
      allowSelfRegistration: true,
      requireApprovalForEdits: true,
      updatedAt: now,
    });
    log.info({ entity: "familySettings" }, "Default family settings created");
  }

  // Check if admin already exists
  const existingAdmin = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, "ADMIN"))
    .limit(1);

  if (existingAdmin.length > 0) {
    log.info({ adminExists: true }, "Admin user already exists, skipping");
    await pool.end();
    return;
  }

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    log.error(
      { missingEnv: "ADMIN_EMAIL" },
      "ADMIN_EMAIL environment variable is required"
    );
    await pool.end();
    process.exit(1);
  }

  const normalizedEmail = adminEmail.toLowerCase();
  const adminPassword =
    process.env.ADMIN_PASSWORD || crypto.randomUUID().slice(0, 16);
  const isGeneratedPassword = !process.env.ADMIN_PASSWORD;
  const passwordHash = await hashPassword(adminPassword);

  const [adminUser] = await db
    .insert(schema.users)
    .values({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
      isActive: true,
      emailVerified: true,
      updatedAt: now,
    })
    .returning();

  await db.insert(schema.accounts).values({
    id: crypto.randomUUID(),
    userId: adminUser.id,
    accountId: normalizedEmail,
    providerId: "credential",
    password: passwordHash,
    updatedAt: now,
  });

  log.info(
    {
      email: normalizedEmail,
      userId: adminUser.id,
      passwordGenerated: isGeneratedPassword,
    },
    "Admin user created"
  );

  if (isGeneratedPassword) {
    log.warn(
      { generatedPassword: adminPassword },
      "Save this auto-generated password - it won't be shown again"
    );
  }

  log.info({ success: true }, "Seed completed successfully");
  await pool.end();
}

main().catch((e) => {
  log.withErr(e).msg("Seed failed");
  process.exit(1);
});
